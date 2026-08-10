import { supabase } from './supabase-config.js';
import { celebrarConclusao } from './celebracao.js';
import {
    INTERVALOS,
    ROTULO_TIPO,
    listarRevisoes,
    agruparRevisoes,
    registrarResultado,
    adiarRevisao,
    reiniciarCiclo,
    excluirRevisao,
    enviarRevisaoParaTarefas,
    formatarData,
    rotuloPrazo,
    intervaloDaEtapa,
    hojeISO
} from './revisoes-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const grade = document.getElementById('gradeRevisoes');
    const vazio = document.getElementById('vazioRevisoes');
    const abas = document.getElementById('abasRevisoes');
    const filtroTipo = document.getElementById('filtroTipoRevisao');
    const filtroAula = document.getElementById('filtroAulaRevisao');
    const resumoFila = document.getElementById('resumoFila');

    const totalAtrasadas = document.getElementById('totalAtrasadas');
    const totalHoje = document.getElementById('totalHoje');
    const totalProximas = document.getElementById('totalProximas');
    const totalDominadas = document.getElementById('totalDominadas');

    let revisoes = [];
    let rotinas = [];
    let filaAtiva = 'pendentes';
    const reveladas = new Set();

    function escapar(texto = '') {
        return String(texto).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    async function carregarRotinas() {
        const { data } = await supabase
            .from('rotinas')
            .select('id, titulo')
            .eq('usuario_id', user.id)
            .order('titulo');

        rotinas = data || [];
        filtroAula.innerHTML = '<option value="">Todas as aulas</option>' +
            rotinas.map(r => `<option value="${r.id}">${escapar(r.titulo)}</option>`).join('');
    }

    async function carregar() {
        revisoes = await listarRevisoes(user.id);
        renderizar();
    }

    function aplicarFiltros(lista) {
        let visiveis = [...lista];
        if (filtroTipo.value) visiveis = visiveis.filter(r => r.tipo === filtroTipo.value);
        if (filtroAula.value) visiveis = visiveis.filter(r => String(r.rotina_id) === filtroAula.value);
        return visiveis;
    }

    function filaSelecionada(grupos) {
        if (filaAtiva === 'proximas') return grupos.proximas;
        if (filaAtiva === 'dominadas') return grupos.dominadas;
        return [...grupos.atrasadas, ...grupos.hoje];
    }

    function trilhaHtml(revisao) {
        return `<div class="trilha-etapas" title="Etapa ${Math.min((revisao.etapa || 0) + 1, INTERVALOS.length)} de ${INTERVALOS.length}">` +
            INTERVALOS.map((_, indice) => {
                const cumprida = revisao.dominada || indice < (revisao.etapa || 0);
                const atual = !revisao.dominada && indice === (revisao.etapa || 0);
                return `<span class="etapa-ponto ${cumprida ? 'cumprida' : ''} ${atual ? 'atual' : ''}"></span>`;
            }).join('') +
            '</div>';
    }

    function cartaoHtml(revisao) {
        const atrasada = !revisao.dominada && revisao.data_prevista < hojeISO();
        const revelada = reveladas.has(revisao.id);
        const rotina = rotinas.find(r => r.id === revisao.rotina_id);
        const etapaAtual = Math.min((revisao.etapa || 0) + 1, INTERVALOS.length);

        const classeStatus = revisao.dominada ? 'dourado' : (atrasada ? 'atrasado' : 'prazo-hoje');
        const textoStatus = revisao.dominada ? 'Dominada' : rotuloPrazo(revisao.data_prevista);

        const acoes = revisao.dominada
            ? `<button type="button" class="botao botao-secundario" data-acao="reiniciar">Refazer ciclo</button>
               <button type="button" class="botao botao-perigo" data-acao="excluir">Remover</button>`
            : `<button type="button" class="botao botao-primario" data-acao="acertei"><svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-concluido"></use></svg> Eu lembrava</button>
               <button type="button" class="botao botao-secundario" data-acao="errei"><svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-reabrir"></use></svg> Preciso rever</button>`;

        const extras = revisao.dominada
            ? ''
            : `<div class="revisao-acoes">
                    <button type="button" class="btn-saiba-mais" data-acao="adiar">Adiar 1 dia</button>
                    <button type="button" class="btn-saiba-mais" data-acao="tarefa">Virar tarefa</button>
               </div>`;

        return `
            <article class="cartao-revisao ${atrasada ? 'cartao-revisao-atrasada' : ''} ${revisao.dominada ? 'cartao-revisao-dominada' : ''}" data-id="${revisao.id}">
                <div class="revisao-topo">
                    <div>
                        <p class="revisao-aula">${escapar(rotina ? rotina.titulo : revisao.titulo)} • ${ROTULO_TIPO[revisao.tipo]}</p>
                        <h3 class="revisao-titulo">${escapar(revisao.frente)}</h3>
                    </div>
                    <span class="status ${classeStatus}">${textoStatus}</span>
                </div>

                <div class="revisao-resposta ${revelada ? '' : 'oculta'}" data-acao="revelar">
                    <p>${escapar(revisao.verso)}</p>
                    <div class="revisao-cortina">
                        <span>Tente lembrar primeiro</span>
                        <small>Toque para revelar a resposta</small>
                    </div>
                </div>

                ${trilhaHtml(revisao)}

                <div class="trilha-rodape">
                    <span class="metadado">Etapa ${etapaAtual}/${INTERVALOS.length} • ${intervaloDaEtapa(revisao.etapa || 0)} dias</span>
                    <span class="metadado">Aula de ${formatarData(revisao.data_origem)}</span>
                </div>

                <div class="revisao-acoes">${acoes}</div>
                ${extras}
            </article>
        `;
    }

    function renderizar() {
        const grupos = agruparRevisoes(revisoes);

        totalAtrasadas.textContent = grupos.atrasadas.length;
        totalHoje.textContent = grupos.hoje.length;
        totalProximas.textContent = grupos.proximas.length;
        totalDominadas.textContent = grupos.dominadas.length;

        const lista = aplicarFiltros(filaSelecionada(grupos));

        resumoFila.textContent = lista.length
            ? `${lista.length} ${lista.length === 1 ? 'cartão' : 'cartões'} nesta fila`
            : '';

        if (!revisoes.length) {
            grade.innerHTML = '';
            vazio.hidden = false;
            vazio.textContent = 'Nada por aqui ainda. Registre um aprendizado ou uma dúvida no diário de bordo e o Arkhys monta o ciclo de revisão sozinho.';
            return;
        }

        if (!lista.length) {
            grade.innerHTML = '';
            vazio.hidden = false;
            vazio.textContent = filaAtiva === 'pendentes'
                ? 'Nenhuma revisão para hoje. Volte amanhã que o ciclo continua.'
                : 'Nenhum cartão nesta fila com os filtros escolhidos.';
            return;
        }

        vazio.hidden = true;
        grade.innerHTML = lista.map(cartaoHtml).join('');
    }

    grade.addEventListener('click', async (evento) => {
        const cartao = evento.target.closest('.cartao-revisao');
        if (!cartao) return;

        const revisao = revisoes.find(r => String(r.id) === cartao.dataset.id);
        if (!revisao) return;

        const alvo = evento.target.closest('[data-acao]');
        if (!alvo) return;

        const acao = alvo.dataset.acao;

        if (acao === 'revelar') {
            reveladas.add(revisao.id);
            alvo.classList.remove('oculta');
            return;
        }

        if (acao === 'acertei' || acao === 'errei') {
            if (!reveladas.has(revisao.id)) {
                window.arkhysAvisar?.('Revele a resposta antes de responder.', 'erro');
                return;
            }

            alvo.disabled = true;
            const { data, error } = await registrarResultado(revisao, acao === 'acertei');
            alvo.disabled = false;

            if (error) {
                window.arkhysAvisar?.('Não foi possível salvar: ' + error.message, 'erro');
                return;
            }

            reveladas.delete(revisao.id);
            Object.assign(revisao, data);

            if (data.dominada) {
                celebrarConclusao({ texto: 'Conteúdo dominado', titulo: revisao.titulo });
            } else {
                window.arkhysAvisar?.(`Próxima revisão em ${intervaloDaEtapa(data.etapa)} dias.`);
            }

            renderizar();
            return;
        }

        if (acao === 'adiar') {
            const { data, error } = await adiarRevisao(revisao, 1);
            if (error) {
                window.arkhysAvisar?.('Não foi possível adiar: ' + error.message, 'erro');
                return;
            }
            Object.assign(revisao, data);
            window.arkhysAvisar?.('Revisão adiada para ' + formatarData(data.data_prevista) + '.');
            renderizar();
            return;
        }

        if (acao === 'reiniciar') {
            const { data, error } = await reiniciarCiclo(revisao);
            if (error) {
                window.arkhysAvisar?.('Não foi possível reiniciar: ' + error.message, 'erro');
                return;
            }
            Object.assign(revisao, data);
            window.arkhysAvisar?.('Ciclo reiniciado. Primeira revisão amanhã.');
            renderizar();
            return;
        }

        if (acao === 'tarefa') {
            const { error } = await enviarRevisaoParaTarefas(revisao, user.id);
            if (error) {
                window.arkhysAvisar?.('Não foi possível criar a tarefa: ' + error.message, 'erro');
                return;
            }
            window.arkhysAvisar?.('Tarefa de revisão criada para ' + formatarData(revisao.data_prevista) + '.');
            return;
        }

        if (acao === 'excluir') {
            if (!confirm('Remover este cartão de revisão?')) return;
            const { error } = await excluirRevisao(revisao);
            if (error) {
                window.arkhysAvisar?.('Não foi possível remover: ' + error.message, 'erro');
                return;
            }
            revisoes = revisoes.filter(r => r.id !== revisao.id);
            renderizar();
        }
    });

    abas.addEventListener('click', (evento) => {
        const aba = evento.target.closest('.aba-tarefa');
        if (!aba) return;

        abas.querySelectorAll('.aba-tarefa').forEach(el => el.classList.remove('ativa'));
        aba.classList.add('ativa');
        filaAtiva = aba.dataset.fila;
        renderizar();
    });

    filtroTipo.addEventListener('change', renderizar);
    filtroAula.addEventListener('change', renderizar);

    await carregarRotinas();
    await carregar();
});
