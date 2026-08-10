import { supabase } from './supabase-config.js';
import { urlPublicaMidia, ehImagem, iconeSvgPorTipo, rotuloPorTipo, extensaoDoArquivo, urlsAssinadasEmLote, abrirVisualizadorArquivo } from './midia.js';
import { celebrarConclusao } from './celebracao.js';
import { listarAnexosDaTarefa, listarEntregasDaTarefa, listarTiposEntrega, enviarERegistrarArquivo, removerArquivoPorCaminho } from './arquivos-service.js';
import { podeConcluir, motivoBloqueioConclusao } from './passos.js';
import { abrirCompartilhamento } from './compartilhar.js';

let overlayAtual = null;

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

function passosDaTarefa(tarefa) {
    const lista = Array.isArray(tarefa.subtarefas) ? tarefa.subtarefas : [];
    return lista.filter(passo => passo && passo.texto);
}

function montarChecklist(tarefa, interativo) {
    const passos = passosDaTarefa(tarefa);
    if (!passos.length) return '';

    const feitos = passos.filter(passo => passo.feita).length;
    const porcentagem = Math.round((feitos / passos.length) * 100);

    const itens = passos.map(passo => `
        <li class="passo-detalhe ${passo.feita ? 'passo-detalhe-feito' : ''}">
            <button type="button" class="passo-marcador" data-acao="alternar-passo" data-passo="${passo.id}" ${interativo ? '' : 'disabled'} aria-pressed="${passo.feita}">
                <svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-${passo.feita ? 'concluido' : 'concluir'}"></use></svg>
            </button>
            <span>${passo.texto}</span>
        </li>
    `).join('');

    return `
        <div class="detalhe-secao" data-secao="passos">
            <div class="detalhe-passos-topo">
                <span class="detalhe-rotulo">Passos</span>
                <span class="metadado">${feitos} de ${passos.length} concluídos</span>
            </div>
            <div class="progresso-passos-trilha progresso-passos-trilha-grande"><span style="width: ${porcentagem}%"></span></div>
            <ul class="lista-passos-detalhe">${itens}</ul>
        </div>
    `;
}

const ICONE_DIFICULDADE = { facil: 'dificuldade-facil', medio: 'dificuldade-medio', dificil: 'dificuldade-dificil' };
const NOME_DIFICULDADE_LOCAL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

async function montarGaleriaAnexos(anexos) {
    if (!anexos.length) return '';

    const urls = await urlsAssinadasEmLote(anexos.map(a => a.url_arquivo));

    return anexos.map(anexo => {
        const nomeArquivo = anexo.nome_arquivo;
        const url = urls[anexo.url_arquivo];
        if (!url) return '';

        if (ehImagem(nomeArquivo)) {
            return `<div class="detalhe-anexo-card" data-acao="ver-anexo" data-url="${url}" data-nome="${nomeArquivo}">
                <img src="${url}" alt="${nomeArquivo}" loading="lazy">
                <div class="detalhe-anexo-card-legenda"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-imagem"></use></svg> ${nomeArquivo}</div>
            </div>`;
        }

        if (extensaoDoArquivo(nomeArquivo) === 'pdf') {
            return `<div class="detalhe-anexo-card detalhe-anexo-pdf-card" data-acao="ver-anexo" data-url="${url}" data-nome="${nomeArquivo}">
                <div class="detalhe-anexo-card-icone"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-pdf"></use></svg></div>
                <div class="detalhe-anexo-card-legenda">${nomeArquivo}</div>
            </div>`;
        }

        return `<div class="detalhe-anexo-card" data-acao="ver-anexo" data-url="${url}" data-nome="${nomeArquivo}">
            <div class="detalhe-anexo-card-icone">${iconeSvgPorTipo(nomeArquivo)}</div>
            <div class="detalhe-anexo-card-legenda">${rotuloPorTipo(nomeArquivo)} — ${nomeArquivo}</div>
        </div>`;
    }).join('');
}

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

function nomesDosMembros(tarefa, membros = []) {
    return (tarefa.membros_ids || [])
        .map(id => membros.find(m => m.id === id)?.nome)
        .filter(Boolean);
}

function textoFazerNoNomeDe(tarefa, membros, nomeUsuario) {
    if (tarefa.modalidade === 'grupo') {
        const nomes = nomesDosMembros(tarefa, membros);
        return nomes.length ? nomes.join(', ') : 'Grupo (sem membros selecionados)';
    }
    return `${nomeUsuario} (Individual)`;
}

export async function abrirDetalhesTarefa(tarefa, opcoes = {}) {
    const { materias = [], membros = [], ferramentas = [], aoEditar, linkEditar, aoConcluir, aoExcluir, aoAlternarPasso } = opcoes;

    fecharDetalhes();

    const { data: { user: usuarioAtual } } = await supabase.auth.getUser();
    const nomeUsuario = usuarioAtual?.user_metadata?.nome_completo?.trim() || 'Você';

    const materia = materias.find(m => m.id === tarefa.materia_id);
    const st = calcularStatus(tarefa);
    const iconeModalidade = tarefa.modalidade === 'grupo' ? 'icon-membros' : 'icon-individual';
    const modalidadeTexto = `<svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#${iconeModalidade}"></use></svg> ${textoFazerNoNomeDe(tarefa, membros, nomeUsuario)}`;

    const iconeMateria = materia?.icone_url
        ? `<img src="${urlPublicaMidia(materia.icone_url)}" alt="${materia.nome}">`
        : '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-nota"></use></svg>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalDetalhesTarefa';
    overlay.innerHTML = `
        <div class="form-modal modal-detalhes view-modal">
            <div class="cabecalho-modal">
                <h3>Saiba mais</h3>
                <div class="cabecalho-modal-acoes">
                    <button type="button" class="btn-acao" data-acao="compartilhar" title="Compartilhar"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-compartilhar"></use></svg></button>
                    <button type="button" class="btn-acao" data-acao="imprimir" title="Imprimir / salvar em PDF"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-imprimir"></use></svg></button>
                    <button type="button" class="btn-acao" data-acao="fechar" title="Fechar"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>
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
                    <span class="detalhe-valor"><svg class="icon-svg icon-svg-sm icon-${ICONE_DIFICULDADE[tarefa.dificuldade] || 'dificuldade-medio'}"><use href="assets/icones/arkhys-icons.svg#icon-${ICONE_DIFICULDADE[tarefa.dificuldade] || 'dificuldade-medio'}"></use></svg> ${NOME_DIFICULDADE_LOCAL[tarefa.dificuldade] || 'Médio'}</span>
                </div>
                <div class="detalhe-linha">
                    <span class="detalhe-rotulo">Fazer no nome de</span>
                    <span class="detalhe-valor">${modalidadeTexto}</span>
                </div>
                ${montarLinhaMembros(tarefa, membros)}
                ${montarLinhaFerramentas(tarefa, ferramentas)}
            </div>

            ${montarChecklist(tarefa, !!aoAlternarPasso)}

            <div class="detalhe-secao" data-secao="entregas" hidden>
                <span class="detalhe-rotulo">Entregas</span>
                <div data-slot="entregas">Carregando entregas...</div>
            </div>

            <div class="detalhe-secao" data-secao="anexos">
                <span class="detalhe-rotulo">Anexos</span>
                <div data-slot="anexos">Carregando anexos...</div>
            </div>

            <div class="acoes-form">
                ${(aoEditar || linkEditar) ? `<button type="button" class="botao botao-primario w-full" data-acao="editar"><svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-editar"></use></svg> Editar</button>` : ''}
                ${aoConcluir ? `<button type="button" class="botao botao-secundario w-full" data-acao="concluir">${tarefa.concluida ? '<svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-reabrir"></use></svg> Reabrir' : '<svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-concluir"></use></svg> Concluir'}</button>` : ''}
                ${aoExcluir ? `<button type="button" class="botao botao-perigo w-full" data-acao="excluir"><svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-excluir"></use></svg> Excluir</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlayAtual = overlay;

    overlay.querySelector('[data-acao="fechar"]').addEventListener('click', fecharDetalhes);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharDetalhes(); });
    document.addEventListener('keydown', function aoEsc(e) {
        if (e.key === 'Escape') { fecharDetalhes(); document.removeEventListener('keydown', aoEsc); }
    });

    const botaoEditar = overlay.querySelector('[data-acao="editar"]');
    if (botaoEditar) {
        botaoEditar.addEventListener('click', () => {
            if (aoEditar) aoEditar(tarefa);
            else if (linkEditar) window.location.href = linkEditar;
        });
    }

    const botaoConcluir = overlay.querySelector('[data-acao="concluir"]');
    if (botaoConcluir && aoConcluir) {
        const atualizarBotaoConcluir = (tarefaAtual) => {
            if (tarefaAtual.concluida) return;
            const bloqueio = motivoBloqueioConclusao(tarefaAtual);
            botaoConcluir.disabled = !!bloqueio;
            botaoConcluir.classList.toggle('botao-bloqueado', !!bloqueio);
            botaoConcluir.title = bloqueio || '';
        };
        atualizarBotaoConcluir(tarefa);
        overlay.atualizarBotaoConcluir = atualizarBotaoConcluir;
        botaoConcluir.addEventListener('click', () => {
            if (!tarefa.concluida && !podeConcluir(tarefa)) {
                alert('⚠️ ' + motivoBloqueioConclusao(tarefa));
                return;
            }
            aoConcluir(tarefa);
        });
    }

    const botaoExcluir = overlay.querySelector('[data-acao="excluir"]');
    if (botaoExcluir && aoExcluir) {
        botaoExcluir.addEventListener('click', () => aoExcluir(tarefa));
    }

    function ligarBotoesPasso() {
        if (!aoAlternarPasso) return;
        overlay.querySelectorAll('[data-acao="alternar-passo"]').forEach(botao => {
            botao.addEventListener('click', async () => {
                botao.disabled = true;
                const atualizados = await aoAlternarPasso(tarefa, botao.dataset.passo);
                botao.disabled = false;
                if (!atualizados) return;

                tarefa.subtarefas = atualizados;
                overlay.atualizarBotaoConcluir?.(tarefa);

                const secao = overlay.querySelector('[data-secao="passos"]');
                if (!secao) return;

                const novaSecao = document.createElement('div');
                novaSecao.innerHTML = montarChecklist({ ...tarefa, subtarefas: atualizados }, true);
                secao.replaceWith(novaSecao.firstElementChild);
                ligarBotoesPasso();
            });
        });
    }

    ligarBotoesPasso();

    overlay.querySelector('[data-acao="compartilhar"]').addEventListener('click', () => {
        abrirCompartilhamento(tarefa, { materia, autor: textoFazerNoNomeDe(tarefa, membros, nomeUsuario) });
    });
    overlay.querySelector('[data-acao="imprimir"]').addEventListener('click', () => imprimirTarefa(tarefa, materia, membros, ferramentas, nomeUsuario));

    await renderizarEntregas(overlay, tarefa);

    const secaoAnexos = overlay.querySelector('[data-secao="anexos"]');
    const slotAnexos = overlay.querySelector('[data-slot="anexos"]');
    const anexosTarefa = await listarAnexosDaTarefa(tarefa.id);

    if (anexosTarefa.length === 0) {
        if (secaoAnexos) secaoAnexos.hidden = true;
    } else {
        const grade = await montarGaleriaAnexos(anexosTarefa);
        if (slotAnexos) slotAnexos.outerHTML = `<div class="grade-anexos">${grade}</div>`;

        overlay.querySelectorAll('[data-acao="ver-anexo"]').forEach(cartao => {
            cartao.addEventListener('click', () => {
                abrirVisualizadorArquivo(cartao.dataset.url, cartao.dataset.nome);
            });
        });
    }
}

async function renderizarEntregas(overlay, tarefa) {
    const secao = overlay.querySelector('[data-secao="entregas"]');
    const slot = overlay.querySelector('[data-slot="entregas"]');
    if (!secao || !slot) return;

    const ids = tarefa.tipos_entrega_ids || [];
    if (!ids.length) { secao.hidden = true; return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { secao.hidden = true; return; }

    secao.hidden = false;

    async function desenhar() {
        const [tipos, mapa] = await Promise.all([
            listarTiposEntrega(user.id, ids),
            listarEntregasDaTarefa(tarefa.id)
        ]);

        slot.innerHTML = `<div class="lista-entregas">${tipos.map(tipo => {
            const arquivos = mapa[tipo.id] || [];
            const enviados = arquivos.map(a => `
                <div class="item-entrega-arquivo">
                    <button type="button" class="btn-entrega-abrir" data-acao="abrir-entrega" data-caminho="${a.url_arquivo}" data-nome="${a.nome_arquivo}">
                        ${iconeSvgPorTipo(a.nome_arquivo)} <span>${a.nome_arquivo}</span>
                    </button>
                    <button type="button" class="btn-remover-anexo" data-acao="excluir-entrega" data-caminho="${a.url_arquivo}" title="Remover entrega"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>
                </div>`).join('');

            return `
                <div class="entrega-slot ${arquivos.length ? 'entrega-slot-ok' : ''}">
                    <div class="entrega-slot-topo">
                        <span class="entrega-slot-nome"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-entrega"></use></svg> ${tipo.nome}</span>
                        ${tipo.formatos_aceitos ? `<span class="metadado">${tipo.formatos_aceitos}</span>` : ''}
                    </div>
                    ${tipo.descricao ? `<p class="metadado">${tipo.descricao}</p>` : ''}
                    <div class="entrega-slot-arquivos">${enviados || '<span class="texto-vazio-pequeno">Nenhum arquivo enviado ainda.</span>'}</div>
                    <label class="botao botao-secundario entrega-slot-botao">
                        Enviar arquivo
                        <input type="file" hidden data-acao="upload-entrega" data-tipo="${tipo.id}" ${tipo.formatos_aceitos ? `accept="${tipo.formatos_aceitos.replace(/\s+/g, '')}"` : ''}>
                    </label>
                </div>`;
        }).join('')}</div>`;

        slot.querySelectorAll('[data-acao="upload-entrega"]').forEach(input => {
            input.addEventListener('change', async () => {
                const arquivo = input.files[0];
                if (!arquivo) return;
                input.disabled = true;
                const { error } = await enviarERegistrarArquivo({
                    usuarioId: user.id,
                    arquivo,
                    pasta: 'entregas',
                    categoria: 'Entrega',
                    referenciaTarefaId: tarefa.id,
                    tipoEntregaId: Number(input.dataset.tipo),
                    ehEntrega: true
                });
                input.disabled = false;
                if (error) { alert('Erro ao enviar entrega: ' + error.message); return; }
                celebrarConclusao({ texto: 'Entrega enviada', titulo: arquivo.name });
                desenhar();
            });
        });

        slot.querySelectorAll('[data-acao="abrir-entrega"]').forEach(botao => {
            botao.addEventListener('click', async () => {
                const { data, error } = await supabase.storage.from('arquivos').createSignedUrl(botao.dataset.caminho, 60 * 30);
                if (error) { alert('Erro ao abrir arquivo: ' + error.message); return; }
                abrirVisualizadorArquivo(data.signedUrl, botao.dataset.nome);
            });
        });

        slot.querySelectorAll('[data-acao="excluir-entrega"]').forEach(botao => {
            botao.addEventListener('click', async () => {
                if (!confirm('Remover esse arquivo de entrega?')) return;
                await removerArquivoPorCaminho(user.id, botao.dataset.caminho);
                desenhar();
            });
        });
    }

    await desenhar();
}

function nomeArquivoImpressao(tarefa, materia) {
    const nomeMateria = (materia?.nome || 'Sem matéria').trim();
    let dataCurta = 'sem-data';
    if (tarefa.data_entrega) {
        const d = new Date(tarefa.data_entrega + 'T00:00:00');
        dataCurta = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`;
    }

    return `${nomeMateria} ${dataCurta} Arkhys`;
}

async function imprimirTarefa(tarefa, materia, membros, ferramentas, nomeUsuario = 'Você') {
    const st = calcularStatus(tarefa);
    const nomesMembros = tarefa.modalidade === 'grupo' ? nomesDosMembros(tarefa, membros) : [];
    const fazerNoNomeDe = tarefa.modalidade === 'grupo'
        ? (nomesMembros.length ? nomesMembros : ['Grupo (sem membros selecionados)'])
        : [`${nomeUsuario} (Individual)`];
    const nomesFerramentas = (tarefa.ferramentas_ids || []).map(id => ferramentas.find(f => f.id === id)?.nome).filter(Boolean);

    const janela = window.open('', '_blank', 'width=800,height=900');
    if (!janela) {
        alert('Seu navegador bloqueou a janela de impressão. Permita pop-ups para este site.');
        return;
    }
    janela.document.write('<p style="font-family: sans-serif; padding: 40px;">Preparando impressão...</p>');

    const anexosTarefa = await listarAnexosDaTarefa(tarefa.id);
    let anexoHtml = '';
    if (anexosTarefa.length > 0) {
        const urls = await urlsAssinadasEmLote(anexosTarefa.map(a => a.url_arquivo));
        anexoHtml = anexosTarefa.map(anexo => {
            const nomeArquivo = anexo.nome_arquivo;
            const url = urls[anexo.url_arquivo];
            if (!url) return '';

            if (ehImagem(nomeArquivo)) {
                return `
                    <div class="anexo-impressao">
                        <div class="rotulo">Anexo — ${nomeArquivo}</div>
                        <img src="${url}" alt="${nomeArquivo}">
                    </div>`;
            }
            if (extensaoDoArquivo(nomeArquivo) === 'pdf') {
                return `
                    <div class="anexo-impressao anexo-impressao-pdf">
                        <div class="rotulo">Anexo (PDF) — ${nomeArquivo}</div>
                        <embed src="${url}" type="application/pdf">
                    </div>`;
            }
            return `<div class="linha"><span class="rotulo">Anexo</span><span>${nomeArquivo}</span></div>`;
        }).join('');
    }

    janela.document.open();
    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${nomeArquivoImpressao(tarefa, materia)}</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: 'Georgia', serif; color: #1a1a1a; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
                .cabecalho { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #c1121f; padding-bottom: 16px; margin-bottom: 24px; }
                .cabecalho h1 { font-size: 1.1rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #c1121f; margin: 0; }
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
            <div class="linha"><span class="rotulo">Fazer no nome de</span>${fazerNoNomeDe.length > 1 ? `<ul>${fazerNoNomeDe.map(n => `<li>${n}</li>`).join('')}</ul>` : `<span>${fazerNoNomeDe[0]}</span>`}</div>
            ${nomesFerramentas.length ? `<div class="linha"><span class="rotulo">Ferramentas</span><ul>${nomesFerramentas.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
            ${passosDaTarefa(tarefa).length ? `<div class="linha"><span class="rotulo">Passos</span><ul>${passosDaTarefa(tarefa).map(passo => `<li>${passo.feita ? '[x]' : '[ ]'} ${passo.texto}</li>`).join('')}</ul></div>` : ''}
            ${anexoHtml}
            <footer>Gerado por Arkhys — Organize · Evolua · Conquiste</footer>
        </body>
        </html>
    `);
    janela.document.close();
    janela.onload = () => janela.print();
}
