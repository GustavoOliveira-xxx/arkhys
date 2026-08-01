// ==================================================
// MODAL "SAIBA MAIS" — generalizado, usado em Início,
// Hoje e Tarefas. Cria o overlay dinamicamente (não
// existe um elemento fixo no HTML de cada página).
// ==================================================
import { supabase } from './supabase-config.js';
import { urlPublicaMidia, ehImagem, iconePorTipo, rotuloPorTipo, nomeExibicao } from './midia.js';

let overlayAtual = null;

// Fecha e remove o modal de detalhes, se estiver aberto
export function fecharDetalhes() {
    if (overlayAtual) {
        overlayAtual.remove();
        overlayAtual = null;
    }
}

function formatarData(dataISO) {
    if (!dataISO) return '—';
    return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR');
}

function calcularStatus(tarefa) {
    if (tarefa.concluida) return { classe: 'normal', texto: 'Concluída' };
    const hoje = new Date().toISOString().split('T')[0];
    if (tarefa.data_entrega < hoje) return { classe: 'atrasado', texto: 'Atrasada' };
    if (tarefa.data_entrega === hoje) return { classe: 'prazo-hoje', texto: 'Hoje' };
    return { classe: 'proximo', texto: 'Em breve' };
}

// Monta o bloco de anexo: miniatura real (se for imagem) ou um
// "cartão" com ícone + nome + link para abrir (demais tipos de arquivo)
async function montarBlocoAnexo(tarefa) {
    if (!tarefa.anexo_path) return '';

    const nomeArquivo = tarefa.anexo_nome || nomeExibicao(tarefa.anexo_path);
    const { data } = await supabase.storage.from('arquivos').createSignedUrl(tarefa.anexo_path, 60 * 30);
    const url = data?.signedUrl;

    if (!url) return '';

    if (ehImagem(nomeArquivo, tarefa.anexo_tipo)) {
        return `<a class="detalhe-anexo-preview" href="${url}" target="_blank" rel="noopener">
            <img src="${url}" alt="${nomeArquivo}">
        </a>`;
    }

    return `<a class="detalhe-anexo-arquivo" href="${url}" target="_blank" rel="noopener">
        <span class="detalhe-anexo-icone">${iconePorTipo(nomeArquivo, tarefa.anexo_tipo)}</span>
        <span>${rotuloPorTipo(nomeArquivo, tarefa.anexo_tipo)} — ${nomeArquivo}</span>
    </a>`;
}

// Monta a linha de membros (só quando a tarefa é em grupo)
function montarLinhaMembros(tarefa, membros = []) {
    if (tarefa.modalidade !== 'grupo' || !(tarefa.membros_ids || []).length) return '';

    const nomes = tarefa.membros_ids
        .map(id => membros.find(m => m.id === id)?.nome)
        .filter(Boolean)
        .join(', ');

    return `<div class="detalhe-linha">
        <span class="detalhe-rotulo">Membros</span>
        <span class="detalhe-valor">${nomes || '—'}</span>
    </div>`;
}

// Monta a linha de ferramentas (só quando há alguma marcada)
function montarLinhaFerramentas(tarefa, ferramentas = []) {
    if (!(tarefa.ferramentas_ids || []).length) return '';

    const nomes = tarefa.ferramentas_ids
        .map(id => ferramentas.find(f => f.id === id)?.nome)
        .filter(Boolean)
        .join(', ');

    return `<div class="detalhe-linha">
        <span class="detalhe-rotulo">Ferramentas</span>
        <span class="detalhe-valor">${nomes || '—'}</span>
    </div>`;
}

/**
 * Abre o modal "Saiba mais" de uma tarefa.
 *
 * @param {object} tarefa - registro da tabela `tarefas`
 * @param {object} opcoes
 * @param {Array} [opcoes.materias] - lista de matérias do usuário
 * @param {Array} [opcoes.membros] - lista de membros do usuário
 * @param {Array} [opcoes.ferramentas] - lista de ferramentas do usuário
 * @param {Function} [opcoes.aoEditar] - chamada ao clicar em "Editar" (recebe a tarefa)
 * @param {string} [opcoes.linkEditar] - alternativa a aoEditar: navega para essa URL
 * @param {Function} [opcoes.aoConcluir] - chamada ao clicar em "Concluir/Reabrir"
 * @param {Function} [opcoes.aoExcluir] - chamada ao clicar em "Excluir"
 */
export async function abrirDetalhesTarefa(tarefa, opcoes = {}) {
    const { materias = [], membros = [], ferramentas = [], aoEditar, linkEditar, aoConcluir, aoExcluir } = opcoes;

    fecharDetalhes();

    const materia = materias.find(m => m.id === tarefa.materia_id);
    const st = calcularStatus(tarefa);
    const modalidadeTexto = tarefa.modalidade === 'grupo'
        ? `👥 Em grupo (${(tarefa.membros_ids || []).length} membro(s))`
        : '👤 Individual';

    const iconeMateria = materia?.icone_url
        ? `<img src="${urlPublicaMidia(materia.icone_url)}" alt="${materia.nome}">`
        : '📝';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalDetalhesTarefa';
    overlay.innerHTML = `
        <div class="form-modal modal-detalhes view-modal">
            <div class="cabecalho-modal">
                <h3>Saiba mais</h3>
                <button type="button" class="btn-acao" data-acao="fechar">✕</button>
            </div>

            <div class="detalhe-cabecalho">
                <div class="detalhe-materia-icone">${iconeMateria}</div>
                <div>
                    <div class="detalhe-materia-nome">${materia ? materia.nome : 'Sem matéria'}</div>
                    <span class="status ${st.classe}">${st.texto}</span>
                </div>
            </div>

            <h2>${tarefa.titulo}</h2>
            ${tarefa.descricao ? `<p class="detalhe-descricao">${tarefa.descricao}</p>` : ''}

            <div class="detalhe-secao">
                <div class="detalhe-linha">
                    <span class="detalhe-rotulo">Entrega</span>
                    <span class="detalhe-valor">${formatarData(tarefa.data_entrega)}</span>
                </div>
                <div class="detalhe-linha">
                    <span class="detalhe-rotulo">Modalidade</span>
                    <span class="detalhe-valor">${modalidadeTexto}</span>
                </div>
                ${montarLinhaMembros(tarefa, membros)}
                ${montarLinhaFerramentas(tarefa, ferramentas)}
            </div>

            <div class="detalhe-secao" data-secao="anexo" ${tarefa.anexo_path ? '' : 'hidden'}>
                <span class="detalhe-rotulo">Anexo</span>
                <div data-slot="anexo">Carregando anexo...</div>
            </div>

            <div class="acoes-form">
                ${(aoEditar || linkEditar) ? `<button type="button" class="botao botao-primario w-full" data-acao="editar">✏️ Editar</button>` : ''}
                ${aoConcluir ? `<button type="button" class="botao botao-secundario w-full" data-acao="concluir">${tarefa.concluida ? '↺ Reabrir' : '✓ Concluir'}</button>` : ''}
                ${aoExcluir ? `<button type="button" class="botao botao-perigo w-full" data-acao="excluir">🗑️ Excluir</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlayAtual = overlay;

    // Fechar: no X, clicando fora do cartão, ou tecla Esc
    overlay.querySelector('[data-acao="fechar"]').addEventListener('click', fecharDetalhes);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharDetalhes(); });
    document.addEventListener('keydown', function aoEsc(e) {
        if (e.key === 'Escape') { fecharDetalhes(); document.removeEventListener('keydown', aoEsc); }
    });

    // Ações
    const botaoEditar = overlay.querySelector('[data-acao="editar"]');
    if (botaoEditar) {
        botaoEditar.addEventListener('click', () => {
            if (aoEditar) aoEditar(tarefa);
            else if (linkEditar) window.location.href = linkEditar;
        });
    }

    const botaoConcluir = overlay.querySelector('[data-acao="concluir"]');
    if (botaoConcluir && aoConcluir) {
        botaoConcluir.addEventListener('click', () => aoConcluir(tarefa));
    }

    const botaoExcluir = overlay.querySelector('[data-acao="excluir"]');
    if (botaoExcluir && aoExcluir) {
        botaoExcluir.addEventListener('click', () => aoExcluir(tarefa));
    }

    // Carrega o anexo de forma assíncrona (precisa de URL assinada)
    if (tarefa.anexo_path) {
        const slot = overlay.querySelector('[data-slot="anexo"]');
        const html = await montarBlocoAnexo(tarefa);
        if (slot) slot.outerHTML = html || '';
    }
}
