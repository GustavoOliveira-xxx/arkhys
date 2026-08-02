// ==================================================
// MODAL "SAIBA MAIS" — generalizado, usado em Início,
// Hoje e Tarefas. Cria o overlay dinamicamente (não
// existe um elemento fixo no HTML de cada página).
// ==================================================
import { supabase } from './supabase-config.js';
import { urlPublicaMidia, ehImagem, iconePorTipo, rotuloPorTipo, nomeExibicao, extensaoDoArquivo, abrirLightboxImagem } from './midia.js';

let overlayAtual = null;

// Fecha e remove o modal de detalhes, se estiver aberto
export function fecharDetalhes() {
    if (overlayAtual) {
        overlayAtual.remove();
        overlayAtual = null;
    }
    document.getElementById('lightboxAnexo')?.remove();
}

function formatarData(dataISO) {
    if (!dataISO) return '—';
    return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function calcularStatus(tarefa) {
    if (tarefa.concluida) return { classe: 'normal', texto: 'Concluída' };
    const hoje = new Date().toISOString().split('T')[0];
    if (tarefa.data_entrega < hoje) return { classe: 'atrasado', texto: 'Atrasada' };
    if (tarefa.data_entrega === hoje) return { classe: 'prazo-hoje', texto: 'Hoje' };
    return { classe: 'proximo', texto: 'Em breve' };
}

const EMOJI_DIFICULDADE = { facil: '🟢', medio: '🟡', dificil: '🔴' };
const NOME_DIFICULDADE_LOCAL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

// Monta o bloco de anexo: galeria de imagem com lightbox, visualizador de
// PDF embutido (não obriga baixar, mas sempre dá a opção), ou cartão com
// ícone + link para os demais tipos de arquivo.
async function montarBlocoAnexo(tarefa) {
    if (!tarefa.anexo_path) return '';

    const nomeArquivo = tarefa.anexo_nome || nomeExibicao(tarefa.anexo_path);
    const { data } = await supabase.storage.from('arquivos').createSignedUrl(tarefa.anexo_path, 60 * 30);
    const url = data?.signedUrl;

    if (!url) return '<p class="metadado">Não foi possível carregar o anexo.</p>';

    if (ehImagem(nomeArquivo, tarefa.anexo_tipo)) {
        return `<div class="detalhe-anexo-galeria">
            <img src="${url}" alt="${nomeArquivo}" data-acao="ampliar" data-url="${url}">
            <div class="detalhe-anexo-legenda">
                <span>🖼️ ${nomeArquivo}</span>
                <a href="${url}" download="${nomeArquivo}" title="Baixar">⬇️ Baixar</a>
            </div>
        </div>`;
    }

    if (extensaoDoArquivo(nomeArquivo) === 'pdf') {
        return `<div class="detalhe-anexo-pdf">
            <iframe src="${url}#toolbar=1" title="${nomeArquivo}" loading="lazy"></iframe>
            <div class="detalhe-anexo-legenda">
                <span>📕 ${nomeArquivo}</span>
                <div>
                    <a href="${url}" target="_blank" rel="noopener">Abrir em nova aba</a>
                    <a href="${url}" download="${nomeArquivo}" title="Baixar">⬇️ Baixar</a>
                </div>
            </div>
        </div>`;
    }

    return `<a class="detalhe-anexo-arquivo" href="${url}" download="${nomeArquivo}">
        <span class="detalhe-anexo-icone">${iconePorTipo(nomeArquivo, tarefa.anexo_tipo)}</span>
        <span>${rotuloPorTipo(nomeArquivo, tarefa.anexo_tipo)} — ${nomeArquivo}</span>
        <span class="detalhe-anexo-baixar">⬇️ Baixar</span>
    </a>`;
}

// Monta a linha de membros como LISTA (não mais texto separado por vírgula)
function montarLinhaMembros(tarefa, membros = []) {
    if (tarefa.modalidade !== 'grupo' || !(tarefa.membros_ids || []).length) return '';

    const itens = tarefa.membros_ids
        .map(id => membros.find(m => m.id === id)?.nome)
        .filter(Boolean)
        .map(nome => `<li>${nome}</li>`)
        .join('');

    return `<div class="detalhe-linha detalhe-linha-lista">
        <span class="detalhe-rotulo">Membros</span>
        <ul class="detalhe-lista">${itens || '<li>—</li>'}</ul>
    </div>`;
}

// Monta a linha de ferramentas como LISTA (não mais texto separado por vírgula)
function montarLinhaFerramentas(tarefa, ferramentas = []) {
    if (!(tarefa.ferramentas_ids || []).length) return '';

    const itens = tarefa.ferramentas_ids
        .map(id => ferramentas.find(f => f.id === id)?.nome)
        .filter(Boolean)
        .map(nome => `<li>${nome}</li>`)
        .join('');

    return `<div class="detalhe-linha detalhe-linha-lista">
        <span class="detalhe-rotulo">Ferramentas</span>
        <ul class="detalhe-lista">${itens || '<li>—</li>'}</ul>
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
                <div class="cabecalho-modal-acoes">
                    <button type="button" class="btn-acao" data-acao="compartilhar" title="Compartilhar">🔗</button>
                    <button type="button" class="btn-acao" data-acao="imprimir" title="Imprimir / salvar em PDF">🖨️</button>
                    <button type="button" class="btn-acao" data-acao="fechar" title="Fechar">✕</button>
                </div>
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
                    <span class="detalhe-rotulo">Dificuldade</span>
                    <span class="detalhe-valor">${EMOJI_DIFICULDADE[tarefa.dificuldade] || '🟡'} ${NOME_DIFICULDADE_LOCAL[tarefa.dificuldade] || 'Médio'}</span>
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

    overlay.querySelector('[data-acao="compartilhar"]').addEventListener('click', () => compartilharTarefa(tarefa, materia));
    overlay.querySelector('[data-acao="imprimir"]').addEventListener('click', () => imprimirTarefa(tarefa, materia, membros, ferramentas));

    // Carrega o anexo de forma assíncrona (precisa de URL assinada)
    if (tarefa.anexo_path) {
        const slot = overlay.querySelector('[data-slot="anexo"]');
        const html = await montarBlocoAnexo(tarefa);
        if (slot) slot.outerHTML = html || '';

        // Clique na imagem do anexo abre o lightbox (visualização ampliada)
        overlay.querySelector('[data-acao="ampliar"]')?.addEventListener('click', (e) => {
            abrirLightboxImagem(e.currentTarget.dataset.url, tarefa.anexo_nome || nomeExibicao(tarefa.anexo_path));
        });
    }
}

// ==================================================
// COMPARTILHAR — Web Share API no celular, com fallback
// de copiar um resumo em texto pra área de transferência
// ==================================================
async function compartilharTarefa(tarefa, materia) {
    const resumo = `📋 ${tarefa.titulo}\n` +
        `${materia ? `Matéria: ${materia.nome}\n` : ''}` +
        `Entrega: ${formatarData(tarefa.data_entrega)}\n` +
        `${tarefa.descricao ? `\n${tarefa.descricao}\n` : ''}` +
        `\nCompartilhado via Arkhys`;

    if (navigator.share) {
        try {
            await navigator.share({ title: tarefa.titulo, text: resumo });
        } catch (erro) {
            if (erro.name !== 'AbortError') console.error('Erro ao compartilhar:', erro);
        }
        return;
    }

    try {
        await navigator.clipboard.writeText(resumo);
        alert('📋 Resumo da atividade copiado! Cole onde quiser compartilhar.');
    } catch {
        alert(resumo);
    }
}

// ==================================================
// IMPRIMIR — abre uma janela com um resumo bonito e
// chama a impressão (o usuário pode escolher "Salvar como PDF")
// ==================================================
async function imprimirTarefa(tarefa, materia, membros, ferramentas) {
    const st = calcularStatus(tarefa);
    const nomesMembros = tarefa.modalidade === 'grupo'
        ? (tarefa.membros_ids || []).map(id => membros.find(m => m.id === id)?.nome).filter(Boolean)
        : [];
    const nomesFerramentas = (tarefa.ferramentas_ids || []).map(id => ferramentas.find(f => f.id === id)?.nome).filter(Boolean);

    // Abre a janela ANTES de qualquer await, senão o navegador trata
    // como popup não-solicitado e bloqueia.
    const janela = window.open('', '_blank', 'width=800,height=900');
    if (!janela) {
        alert('Seu navegador bloqueou a janela de impressão. Permita pop-ups para este site.');
        return;
    }
    janela.document.write('<p style="font-family: sans-serif; padding: 40px;">Preparando impressão...</p>');

    // Busca o anexo (se houver) pra embutir no impresso — foto aparece
    // como imagem, PDF aparece como preview embutido
    let anexoHtml = '';
    if (tarefa.anexo_path) {
        const nomeArquivo = tarefa.anexo_nome || nomeExibicao(tarefa.anexo_path);
        const { data } = await supabase.storage.from('arquivos').createSignedUrl(tarefa.anexo_path, 60 * 30);
        const url = data?.signedUrl;

        if (url && ehImagem(nomeArquivo, tarefa.anexo_tipo)) {
            anexoHtml = `
                <div class="anexo-impressao">
                    <div class="rotulo">Anexo</div>
                    <img src="${url}" alt="${nomeArquivo}">
                </div>`;
        } else if (url && extensaoDoArquivo(nomeArquivo) === 'pdf') {
            anexoHtml = `
                <div class="anexo-impressao anexo-impressao-pdf">
                    <div class="rotulo">Anexo (PDF) — ${nomeArquivo}</div>
                    <embed src="${url}" type="application/pdf">
                </div>`;
        } else if (nomeArquivo) {
            anexoHtml = `<div class="linha"><span class="rotulo">Anexo</span><span>${nomeArquivo}</span></div>`;
        }
    }

    janela.document.open();
    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${tarefa.titulo} — Arkhys</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: 'Georgia', serif; color: #1a1a1a; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
                .cabecalho { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #c1121f; padding-bottom: 16px; margin-bottom: 24px; }
                .cabecalho h1 { font-size: 1.1rem; letter-spacing: 2px; color: #c1121f; margin: 0; }
                h2 { font-size: 1.6rem; margin: 0 0 4px; }
                .status-impressao { display: inline-block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 3px 10px; border-radius: 20px; background: #eee; margin-bottom: 20px; }
                .linha { display: flex; gap: 8px; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
                .rotulo { font-weight: bold; width: 140px; flex-shrink: 0; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; color: #555; }
                .descricao { margin: 20px 0; padding: 16px; background: #f7f5f2; border-left: 3px solid #c1121f; }
                ul { margin: 4px 0 0; padding-left: 20px; }
                .anexo-impressao { margin: 24px 0; page-break-inside: avoid; }
                .anexo-impressao .rotulo { font-weight: bold; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 8px; }
                .anexo-impressao img { max-width: 100%; max-height: 600px; display: block; border: 1px solid #ddd; border-radius: 4px; }
                .anexo-impressao-pdf embed { width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px; }
                footer { margin-top: 40px; text-align: center; font-size: 0.75rem; color: #999; }
                @media print { body { margin: 0; } .anexo-impressao-pdf embed { height: 90vh; } }
            </style>
        </head>
        <body>
            <div class="cabecalho"><h1>ARKHYS — RESUMO DA ATIVIDADE</h1></div>
            <h2>${tarefa.titulo}</h2>
            <span class="status-impressao">${st.texto}</span>
            ${tarefa.descricao ? `<div class="descricao">${tarefa.descricao}</div>` : ''}
            <div class="linha"><span class="rotulo">Matéria</span><span>${materia ? materia.nome : 'Sem matéria'}</span></div>
            <div class="linha"><span class="rotulo">Entrega</span><span>${formatarData(tarefa.data_entrega)}</span></div>
            <div class="linha"><span class="rotulo">Dificuldade</span><span>${NOME_DIFICULDADE_LOCAL[tarefa.dificuldade] || 'Médio'}</span></div>
            <div class="linha"><span class="rotulo">Modalidade</span><span>${tarefa.modalidade === 'grupo' ? 'Em grupo' : 'Individual'}</span></div>
            ${nomesMembros.length ? `<div class="linha"><span class="rotulo">Membros</span><ul>${nomesMembros.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
            ${nomesFerramentas.length ? `<div class="linha"><span class="rotulo">Ferramentas</span><ul>${nomesFerramentas.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
            ${anexoHtml}
            <footer>Gerado por Arkhys — Organize · Evolua · Conquiste</footer>
        </body>
        </html>
    `);
    janela.document.close();
    janela.onload = () => janela.print();
}