import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Sempre normalizado no dia 1 — evita o bug clássico de setMonth() em
    // dias 29/30/31 (ex.: 31/08 -> setMonth(8) vira 01/10, pulando setembro
    // e fazendo o mês seguinte aparecer misturado na grade).
    const agora = new Date();
    let dataAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const diasEl = document.getElementById('diasCalendario');
    const nomeMesEl = document.getElementById('nomeMes');
    const btnAnterior = document.getElementById('mesAnterior');
    const btnProximo = document.getElementById('proximoMes');

    // Carrega todas as tarefas do usuário
    const { data: tarefas } = await supabase
        .from('tarefas')
        .select('data_entrega, titulo, concluida')
        .eq('usuario_id', user.id);

    function renderizarCalendario() {
        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();

        nomeMesEl.textContent = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();

        const h = new Date();
        const hoje = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;

        let html = '';

        // Espaços vazios antes do dia 1 (só preenchimento, sem números de outro mês)
        for (let i = 0; i < primeiroDia; i++) {
            html += '<div class="dia-vazio" aria-hidden="true"></div>';
        }

        // Dias do mês atual
        for (let dia = 1; dia <= ultimoDia; dia++) {
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const tarefasDia = tarefas?.filter(t => t.data_entrega === dataStr) || [];
            const ehHoje = dataStr === hoje;

            html += `
                <div class="dia-calendario ${ehHoje ? 'dia-hoje' : ''} ${tarefasDia.length > 0 ? 'tem-tarefa' : ''}"
                     title="${tarefasDia.map(t => t.titulo).join(' • ')}">
                    <span class="numero-dia">${dia}</span>
                    ${tarefasDia.map(t => `<div class="ponto-tarefa ${t.concluida ? 'concluida' : ''}"></div>`).join('')}
                </div>
            `;
        }

        // Espaços vazios até fechar a última semana (grade sempre alinhada)
        const totalCelulas = primeiroDia + ultimoDia;
        const restantes = (7 - (totalCelulas % 7)) % 7;
        for (let i = 0; i < restantes; i++) {
            html += '<div class="dia-vazio" aria-hidden="true"></div>';
        }

        diasEl.innerHTML = html;
    }

    function irParaMes(delta) {
        dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + delta, 1);
        renderizarCalendario();
    }

    btnAnterior.addEventListener('click', () => irParaMes(-1));
    btnProximo.addEventListener('click', () => irParaMes(1));

    renderizarCalendario();
});
