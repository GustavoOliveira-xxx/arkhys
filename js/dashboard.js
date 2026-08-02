import { supabase } from './supabase-config.js';
import { urlPublicaMidia, iconePorTipo, rotuloPorTipo, nomeExibicao } from './midia.js';
import { abrirDetalhesTarefa, fecharDetalhes } from './detalhes-tarefa.js';
import { carregarNiveis, progressoNivel, verificarAcessoDiario, ganharXpPorConclusaoDeTarefa } from './xp-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pegar dados do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Saudação personalizada
    const nomeUsuario = user.user_metadata?.nome_completo?.split(' ')[0] || 'Usuário';
    document.getElementById('saudacaoUsuario').textContent = `Bem-vindo(a), ${nomeUsuario}`;

    // Bônus de XP por acesso diário (só concede uma vez por dia)
    await verificarAcessoDiario(user.id);

    const listaHoje = document.getElementById('listaHoje');
    const listaProximas = document.getElementById('listaProximas');

    let materias = [];

    async function carregarDashboard() {
        const hoje = new Date().toISOString().split('T')[0];

        // Tarefas pendentes
        const { data: tarefas, error } = await supabase
            .from('tarefas')
            .select('*')
            .eq('usuario_id', user.id)
            .is('concluida', false)
            .order('data_entrega', { ascending: true });

        if (error) {
            console.error('Erro ao carregar tarefas:', error);
            return;
        }

        // Matérias — usadas para mostrar o ícone/foto cadastrado em cada item
        const { data: dadosMaterias } = await supabase
            .from('materias')
            .select('*')
            .eq('usuario_id', user.id);
        materias = dadosMaterias || [];

        // Separar contadores
        const pendentes = tarefas.length;
        const paraHoje = tarefas.filter(t => t.data_entrega === hoje).length;
        const proximas = tarefas.filter(t => t.data_entrega > hoje).slice(0, 3);

        // Atualizar os cards
        document.getElementById('qtdPendentes').textContent = pendentes;
        document.getElementById('qtdHoje').textContent = `${paraHoje} para hoje`;
        document.getElementById('qtdEntregas').textContent = proximas.length;

        // Dados de XP, Nível e foto de perfil (colunas corretas: xp_total / nivel_atual / foto_url)
        const { data: perfil } = await supabase
            .from('perfil')
            .select('xp_total, nivel_atual, foto_url')
            .eq('usuario_id', user.id)
            .maybeSingle();

        if (perfil) {
            const niveis = await carregarNiveis();
            const { porcentagem, atual } = progressoNivel(perfil.xp_total, niveis);
            document.getElementById('xpTotal').textContent = perfil.xp_total;
            document.getElementById('nivelAtual').textContent = `Nível ${atual.nivel} — ${atual.nome_titulo}`;
            document.getElementById('barraXp').style.width = `${porcentagem}%`;
        }

        const avatarPequeno = document.getElementById('avatarPequeno');
        if (avatarPequeno) {
            if (perfil?.foto_url) {
                avatarPequeno.innerHTML = `<img src="${urlPublicaMidia(perfil.foto_url)}" alt="Foto de perfil">`;
            } else {
                avatarPequeno.innerHTML = `<span>${nomeUsuario.charAt(0).toUpperCase() || '?'}</span>`;
            }
        }

        // Ícone do item: foto da matéria (se cadastrada) ou emoji padrão
        function iconeDoItem(materiaId, emojiPadrao) {
            const materia = materias?.find(m => m.id === materiaId);
            if (materia?.icone_url) {
                return { html: `<img src="${urlPublicaMidia(materia.icone_url)}" alt="${materia.nome}">`, comImagem: true };
            }
            return { html: emojiPadrao, comImagem: false };
        }

        function badgeAnexo(tarefa) {
            if (!tarefa.anexo_path) return '';
            const nome = tarefa.anexo_nome || nomeExibicao(tarefa.anexo_path);
            return ` • ${iconePorTipo(nome, tarefa.anexo_tipo)} ${rotuloPorTipo(nome, tarefa.anexo_tipo)}`;
        }

        function abrirDetalhes(tarefa) {
            abrirDetalhesTarefa(tarefa, {
                materias: materias || [],
                linkEditar: `tarefas.html?editar=${tarefa.id}`,
                aoConcluir: async (t) => {
                    fecharDetalhes();
                    await concluirTarefa(t);
                }
            });
        }

        // Marca a tarefa como concluída, concede XP (conforme dificuldade
        // + bônus de pontualidade) e recarrega a lista.
        async function concluirTarefa(tarefa) {
            const { error: erroUpdate } = await supabase
                .from('tarefas')
                .update({ concluida: true })
                .eq('id', tarefa.id)
                .eq('usuario_id', user.id);

            if (erroUpdate) {
                alert('❌ Erro ao concluir tarefa: ' + erroUpdate.message);
                return;
            }

            await ganharXpPorConclusaoDeTarefa(user.id, tarefa);
            carregarDashboard();
        }

        // Preencher lista "O que fazer hoje" (mantém a lógica que existia
        // na antiga página "Hoje": marcar como concluída direto por aqui)
        const tarefasHoje = tarefas.filter(t => t.data_entrega === hoje);

        if (tarefasHoje.length === 0) {
            listaHoje.innerHTML = `<div class="item-vazio">Nenhum compromisso para hoje 🎉</div>`;
        } else {
            listaHoje.innerHTML = tarefasHoje.map(t => {
                const icone = iconeDoItem(t.materia_id, '📝');
                return `
                <div class="item-tarefa" data-id="${t.id}">
                    <div class="item-icone ${icone.comImagem ? 'com-imagem' : ''}">${icone.html}</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${t.descricao || 'Sem observações'}${badgeAnexo(t)}</p>
                    </div>
                    <span class="status prazo-hoje">Hoje</span>
                    <div class="item-acoes">
                        <button class="btn-acao concluir" data-id="${t.id}" title="Marcar como concluída">✓</button>
                        <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                    </div>
                </div>
            `;
            }).join('');
        }

        // Preencher "Próximas atividades"
        if (proximas.length === 0) {
            listaProximas.innerHTML = `<div class="item-vazio">Nenhuma atividade futura cadastrada</div>`;
        } else {
            listaProximas.innerHTML = proximas.map(t => {
                const data = new Date(t.data_entrega);
                const dias = Math.ceil((data - new Date()) / (1000 * 60 * 60 * 24));
                const icone = iconeDoItem(t.materia_id, '📅');
                return `
                    <div class="item-tarefa" data-id="${t.id}">
                        <div class="item-icone ${icone.comImagem ? 'com-imagem' : ''}">${icone.html}</div>
                        <div class="item-conteudo">
                            <h4>${t.titulo}</h4>
                            <p>${dias === 1 ? 'Amanhã' : `Em ${dias} dias`}${badgeAnexo(t)}</p>
                        </div>
                        <span class="status proximo">Próximo</span>
                        <div class="item-acoes">
                            <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Ações da lista "Hoje" — concluir direto ou abrir "Saiba mais"
        listaHoje.onclick = async (e) => {
            const item = e.target.closest('.item-tarefa');
            if (!item) return;
            const tarefa = tarefasHoje.find(t => String(t.id) === item.dataset.id);
            if (!tarefa) return;

            if (e.target.closest('.concluir')) {
                await concluirTarefa(tarefa);
                return;
            }
            abrirDetalhes(tarefa);
        };

        // "Saiba mais" nas próximas atividades
        listaProximas.onclick = (e) => {
            const item = e.target.closest('.item-tarefa');
            if (!item) return;
            const tarefa = proximas.find(t => String(t.id) === item.dataset.id);
            if (tarefa) abrirDetalhes(tarefa);
        };
    }

    await carregarDashboard();
});