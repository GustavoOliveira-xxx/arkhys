import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const listaHoje = document.getElementById('listaHoje');
    const tempoTotalEl = document.getElementById('tempoTotal');

    // ==================================================
    // CARREGA OS COMPROMISSOS DE HOJE
    // ==================================================
    async function carregarHoje() {
        const hoje = new Date().toISOString().split('T')[0];

        const { data: tarefas, error } = await supabase
            .from('tarefas')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('data_entrega', hoje)
            .order('hora_entrega', { ascending: true });

        if (error) {
            console.error('Erro ao carregar compromissos de hoje:', error);
            listaHoje.innerHTML = `<div class="item-vazio">Não foi possível carregar seus compromissos 😕</div>`;
            return;
        }

        renderizarLista(tarefas || []);
        renderizarTempoTotal(tarefas || []);
    }

    // ==================================================
    // RENDERIZA A LISTA DE COMPROMISSOS
    // ==================================================
    function renderizarLista(tarefas) {
        if (tarefas.length === 0) {
            listaHoje.innerHTML = `<div class="item-vazio">Nenhum compromisso para hoje 🎉</div>`;
            return;
        }

        const agora = new Date();

        listaHoje.innerHTML = tarefas.map(t => {
            const { classe, texto } = definirStatus(t, agora);
            const horario = t.hora_entrega ? `${t.hora_entrega.slice(0, 5)} — ` : '';

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}">
                    <div class="item-icone">${t.concluida ? '✅' : '📝'}</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${horario}${t.descricao || 'Sem observações'}</p>
                    </div>
                    <span class="status ${classe}">${texto}</span>
                    <div class="item-acoes">
                        <button
                            class="btn-acao concluir"
                            data-id="${t.id}"
                            data-estado="${t.concluida}"
                            title="${t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}"
                        >${t.concluida ? '↺' : '✓'}</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Define a etiqueta de status de cada compromisso (concluída, atrasada, com horário ou "hoje")
    function definirStatus(tarefa, agora) {
        if (tarefa.concluida) {
            return { classe: 'normal', texto: 'Concluída' };
        }

        if (tarefa.hora_entrega) {
            const [horas, minutos] = tarefa.hora_entrega.split(':');
            const horarioTarefa = new Date(agora);
            horarioTarefa.setHours(Number(horas), Number(minutos), 0, 0);

            if (horarioTarefa < agora) {
                return { classe: 'atrasado', texto: 'Atrasado' };
            }
            return { classe: 'prazo-hoje', texto: tarefa.hora_entrega.slice(0, 5) };
        }

        return { classe: 'prazo-hoje', texto: 'Hoje' };
    }

    // ==================================================
    // CALCULA O TEMPO TOTAL PENDENTE PARA HOJE
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

    // ==================================================
    // MARCA / DESMARCA UMA TAREFA COMO CONCLUÍDA
    // ==================================================
    listaHoje.addEventListener('click', async (e) => {
        const botao = e.target.closest('.concluir');
        if (!botao) return;

        const id = botao.dataset.id;
        const estadoAtual = botao.dataset.estado === 'true';

        botao.disabled = true;

        const { error } = await supabase
            .from('tarefas')
            .update({ concluida: !estadoAtual })
            .eq('id', id)
            .eq('usuario_id', user.id);

        if (error) {
            alert('❌ Erro ao atualizar tarefa: ' + error.message);
            botao.disabled = false;
            return;
        }

        carregarHoje();
    });

    carregarHoje();
});