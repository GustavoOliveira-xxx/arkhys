import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    let dataAtual = new Date();
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
        
        nomeMesEl.textContent = new Date(ano, mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();
        const hoje = new Date().toISOString().split('T')[0];

        let html = '';
        // Dias vazios antes do mês começar
        for (let i = 0; i < primeiroDia; i++) html += '<div class="dia-vazio"></div>';

        // Dias do mês
        for (let dia = 1; dia <= ultimoDia; dia++) {
            const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
            const tarefasDia = tarefas?.filter(t => t.data_entrega === dataStr) || [];
            const ehHoje = dataStr === hoje;

            html += `
                <div class="dia-calendario ${ehHoje ? 'dia-hoje' : ''} ${tarefasDia.length > 0 ? 'tem-tarefa' : ''}">
                    <span class="numero-dia">${dia}</span>
                    ${tarefasDia.map(t => `<div class="ponto-tarefa ${t.concluida ? 'concluida' : ''}"></div>`).join('')}
                </div>
            `;
        }

        diasEl.innerHTML = html;
    }

    btnAnterior.addEventListener('click', () => {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        renderizarCalendario();
    });

    btnProximo.addEventListener('click', () => {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        renderizarCalendario();
    });

    renderizarCalendario();
});