import { supabase } from './supabase-config.js';
import { urlPublicaMidia, iconePorTipo, rotuloPorTipo } from './midia.js';
import { abrirDetalhesTarefa, fecharDetalhes } from './detalhes-tarefa.js';
import { mapaAnexosPorTarefa } from './arquivos-service.js';
import { celebrarConclusao } from './celebracao.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const listaHoje = document.getElementById('listaHoje');
    const tempoTotalEl = document.getElementById('tempoTotal');

    let tarefasDoDia = [];
    let materias = [];
    let anexosMap = {};

    async function carregarMaterias() {
        const { data } = await supabase.from('materias').select('*').eq('usuario_id', user.id);
        materias = data || [];
    }

    // ==================================================
    // CARREGA OS COMPROMISSOS DE HOJE
    // ==================================================
    async function carregarHoje() {
        const hoje = new Date().toISOString().split('T')[0];

        // A tabela `tarefas` não tem coluna `hora_entrega`, então a ordenação
        // usa `titulo` — ordenar por uma coluna inexistente quebrava a página inteira.
        const { data: tarefas, error } = await supabase
            .from('tarefas')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('data_entrega', hoje)
            .order('titulo', { ascending: true });

        if (error) {
            console.error('Erro ao carregar compromissos de hoje:', error);
            listaHoje.innerHTML = `<div class="item-vazio">Não foi possível carregar seus compromissos 😕</div>`;
            return;
        }

        tarefasDoDia = tarefas || [];
        anexosMap = await mapaAnexosPorTarefa(tarefasDoDia.map(t => t.id));
        renderizarLista(tarefasDoDia);
        renderizarTempoTotal(tarefasDoDia);
    }

    function iconeDoItem(materiaId) {
        const materia = materias.find(m => m.id === materiaId);
        if (materia?.icone_url) {
            return { html: `<img src="${urlPublicaMidia(materia.icone_url)}" alt="${materia.nome}">`, comImagem: true };
        }
        return { html: '📝', comImagem: false };
    }

    function badgeAnexo(tarefa) {
        const anexos = anexosMap[tarefa.id] || [];
        if (anexos.length === 0) return '';
        if (anexos.length === 1) {
            const nome = anexos[0].nome_arquivo;
            return ` • ${iconePorTipo(nome)} ${rotuloPorTipo(nome)}`;
        }
        return ` • 📎 ${anexos.length} anexos`;
    }

    // ==================================================
    // RENDERIZA A LISTA DE COMPROMISSOS
    // ==================================================
    function renderizarLista(tarefas) {
        if (tarefas.length === 0) {
            listaHoje.innerHTML = `<div class="item-vazio">Nenhum compromisso para hoje 🎉</div>`;
            return;
        }

        listaHoje.innerHTML = tarefas.map(t => {
            const { classe, texto } = definirStatus(t);
            const icone = iconeDoItem(t.materia_id);

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                    <div class="item-icone ${icone.comImagem ? 'com-imagem' : ''}">${t.concluida ? '✅' : icone.html}</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${t.descricao || 'Sem observações'}${badgeAnexo(t)}</p>
                    </div>
                    <span class="status ${classe}">${texto}</span>
                    <div class="item-acoes">
                        <button
                            class="btn-acao concluir"
                            data-id="${t.id}"
                            data-estado="${t.concluida}"
                            title="${t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}"
                        >${t.concluida ? '↺' : '✓'}</button>
                        <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Define a etiqueta de status de cada compromisso (concluída ou "hoje")
    function definirStatus(tarefa) {
        if (tarefa.concluida) {
            return { classe: 'normal', texto: 'Concluída' };
        }
        return { classe: 'prazo-hoje', texto: 'Hoje' };
    }

    // ==================================================
    // CALCULA O TEMPO TOTAL PENDENTE PARA HOJE
    // (a coluna `duracao` não existe na tabela; mantido apenas se um dia for adicionada)
    // ==================================================
    function renderizarTempoTotal(tarefas) {
        if (!tempoTotalEl) return;

        const pendentes = tarefas.filter(t => !t.concluida);
        const minutosTotais = pendentes.reduce((soma, t) => soma + (Number(t.duracao) || 0), 0);

        if (minutosTotais === 0) {
            tempoTotalEl.textContent = '';
            return;
        }

        const horas = Math.floor(minutosTotais / 60);
        const minutos = minutosTotais % 60;
        const textoTempo = [
            horas > 0 ? `${horas}h` : '',
            minutos > 0 ? `${minutos}min` : ''
        ].filter(Boolean).join(' ');

        tempoTotalEl.textContent = `⏱ ${textoTempo} de tarefas pendentes hoje`;
    }

    function abrirDetalhes(tarefa) {
        abrirDetalhesTarefa(tarefa, {
            materias,
            linkEditar: `tarefas.html?editar=${tarefa.id}`,
            aoConcluir: async (t) => {
                fecharDetalhes();
                await alternarConclusao(t.id, t.concluida);
            }
        });
    }

    async function alternarConclusao(id, estadoAtual) {
        const novoEstado = !estadoAtual;
        const { error } = await supabase
            .from('tarefas')
            .update({ concluida: novoEstado })
            .eq('id', id)
            .eq('usuario_id', user.id);

        if (error) {
            alert('❌ Erro ao atualizar tarefa: ' + error.message);
            return;
        }

        if (novoEstado) {
            const tarefa = tarefasDoDia.find(t => String(t.id) === String(id));
            celebrarConclusao({ titulo: tarefa?.titulo || '' });
        }

        carregarHoje();
    }

    // ==================================================
    // AÇÕES DA LISTA — concluir / desmarcar / saiba mais
    // ==================================================
    listaHoje.addEventListener('click', async (e) => {
        const item = e.target.closest('.item-tarefa');
        if (!item) return;

        const botaoConcluir = e.target.closest('.concluir');
        if (botaoConcluir) {
            botaoConcluir.disabled = true;
            await alternarConclusao(botaoConcluir.dataset.id, botaoConcluir.dataset.estado === 'true');
            return;
        }

        const tarefa = tarefasDoDia.find(t => String(t.id) === item.dataset.id);
        if (tarefa) abrirDetalhes(tarefa);
    });

    await carregarMaterias();
    await carregarHoje();
});