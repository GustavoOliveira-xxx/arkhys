import { supabase } from './supabase-config.js';
import { urlPublicaMidia, iconePorTipo, rotuloPorTipo, nomeExibicao } from './midia.js';
import { abrirDetalhesTarefa, fecharDetalhes } from './detalhes-tarefa.js';
import { concederXpDoDia, concederXpDiaPerfeito, buscarNiveis, calcularProgresso, concederXp, XP_POR_DIFICULDADE } from './xp-service.js';

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

    // 2. Buscar dados do banco
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
    const { data: materias } = await supabase
        .from('materias')
        .select('*')
        .eq('usuario_id', user.id);

    // Separar contadores
    const pendentes = tarefas.length;
    const paraHoje = tarefas.filter(t => t.data_entrega === hoje).length;
    const proximas = tarefas.filter(t => t.data_entrega > hoje).slice(0, 3);

    // Atualizar os cards
    document.getElementById('qtdPendentes').textContent = pendentes;
    document.getElementById('qtdHoje').textContent = `${paraHoje} para hoje`;
    document.getElementById('qtdEntregas').textContent = proximas.length;

    // Dados de XP, Nível e foto de perfil (colunas corretas: xp_total / nivel_atual / foto_url)
    let { data: perfil } = await supabase
        .from('perfil')
        .select('xp_total, nivel_atual, foto_url')
        .eq('usuario_id', user.id)
        .maybeSingle();

    // XP só por abrir o app hoje (uma vez por dia — a função no banco garante isso)
    await concederXpDoDia(hoje);
    ({ data: perfil } = await supabase
        .from('perfil')
        .select('xp_total, nivel_atual, foto_url')
        .eq('usuario_id', user.id)
        .maybeSingle());

    if (perfil) {
        const niveis = await buscarNiveis();
        const nivelInfo = niveis.find(n => n.nivel === perfil.nivel_atual);
        document.getElementById('xpTotal').textContent = perfil.xp_total;
        document.getElementById('nivelAtual').textContent = nivelInfo
            ? `Nível ${perfil.nivel_atual} — ${nivelInfo.nome_titulo}`
            : `Nível ${perfil.nivel_atual}`;

        if (niveis.length) {
            const progresso = calcularProgresso(perfil.xp_total, niveis);
            document.getElementById('barraXp').style.width = `${progresso.porcentagem}%`;
        }
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
            aoConcluir: async (t) => { fecharDetalhes(); await alternarConclusao(t); }
        });
    }

    async function alternarConclusao(tarefa) {
        const novoEstado = !tarefa.concluida;
        const { error } = await supabase.from('tarefas').update({ concluida: novoEstado }).eq('id', tarefa.id);
        if (error) { alert('Erro ao atualizar: ' + error.message); return; }

        if (novoEstado) {
            const xpBase = XP_POR_DIFICULDADE[tarefa.dificuldade] || XP_POR_DIFICULDADE.medio;
            await concederXp('tarefa_concluida', `tarefa:${tarefa.id}`, xpBase);
            if (tarefa.data_entrega >= hoje) await concederXp('tarefa_no_prazo', `tarefa:${tarefa.id}`, 10);

            const tarefasHojeAtualizadas = tarefas.filter(t => t.data_entrega === hoje).map(t => t.id === tarefa.id ? { ...t, concluida: true } : t);
            await concederXpDiaPerfeito(hoje, tarefasHojeAtualizadas);
        }

        window.location.reload();
    }

    // Preencher lista "O que fazer hoje"
    const listaHoje = document.getElementById('listaHoje');
    const tarefasHoje = tarefas.filter(t => t.data_entrega === hoje);

    if (tarefasHoje.length === 0) {
        listaHoje.innerHTML = `<div class="item-vazio">Nenhum compromisso para hoje 🎉</div>`;
    } else {
        listaHoje.innerHTML = tarefasHoje.map(t => {
            const icone = iconeDoItem(t.materia_id, '📝');
            return `
            <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                <div class="item-icone ${icone.comImagem ? 'com-imagem' : ''}">${t.concluida ? '✅' : icone.html}</div>
                <div class="item-conteudo">
                    <h4>${t.titulo}</h4>
                    <p>${t.descricao || 'Sem observações'}${badgeAnexo(t)}</p>
                </div>
                <span class="status ${t.concluida ? 'normal' : 'prazo-hoje'}">${t.concluida ? 'Concluída' : 'Hoje'}</span>
                <div class="item-acoes">
                    <button
                        class="btn-acao concluir"
                        data-id="${t.id}"
                        title="${t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}"
                    >${t.concluida ? '↺' : '✓'}</button>
                    <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                </div>
            </div>
        `;
        }).join('');
    }

    // Preencher "Próximas atividades"
    const listaProximas = document.getElementById('listaProximas');
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

    // "Concluir" rápido + "Saiba mais" — mesmo comportamento generalizado usado em Tarefas
    [listaHoje, listaProximas].forEach(lista => {
        lista.addEventListener('click', async (e) => {
            const item = e.target.closest('.item-tarefa');
            if (!item) return;
            const tarefa = tarefas.find(t => String(t.id) === item.dataset.id);
            if (!tarefa) return;

            if (e.target.closest('.concluir')) {
                await alternarConclusao(tarefa);
                return;
            }

            abrirDetalhes(tarefa);
        });
    });
});