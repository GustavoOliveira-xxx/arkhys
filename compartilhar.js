import { listarAnexosDaTarefa } from './arquivos-service.js';
import { urlsAssinadasEmLote } from './midia.js';

const VALIDADE_ANEXOS = 60 * 60 * 24 * 7;
const LIMITE_LINK = 7800;

const NOME_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

let overlayAtual = null;

function escapar(texto = '') {
    return String(texto).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatarData(iso) {
    if (!iso) return 'sem prazo definido';
    return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatarDataCurta(iso) {
    if (!iso) return 'sem prazo';
    return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function bytesParaBase64Url(bytes) {
    let binario = '';
    const pedaco = 0x8000;
    for (let i = 0; i < bytes.length; i += pedaco) {
        binario += String.fromCharCode.apply(null, bytes.subarray(i, i + pedaco));
    }
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function comprimir(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    const fluxo = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

async function derivarChave(pin, sal) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: sal, iterations: 150000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
}

async function empacotar(dados, pin) {
    const bruto = new TextEncoder().encode(JSON.stringify(dados));
    const comprimido = await comprimir(bruto);
    const usarCompressao = !!comprimido && comprimido.length < bruto.length;
    const corpo = usarCompressao ? comprimido : bruto;
    const marcador = usarCompressao ? 'c' : 'p';

    if (!pin) {
        return `#d=${marcador}.${bytesParaBase64Url(corpo)}`;
    }

    const sal = crypto.getRandomValues(new Uint8Array(16));
    const vetor = crypto.getRandomValues(new Uint8Array(12));
    const chave = await derivarChave(pin, sal);
    const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: vetor }, chave, corpo));

    const pacote = new Uint8Array(sal.length + vetor.length + cifrado.length);
    pacote.set(sal, 0);
    pacote.set(vetor, sal.length);
    pacote.set(cifrado, sal.length + vetor.length);

    return `#k=${marcador}.${bytesParaBase64Url(pacote)}`;
}

function urlBase() {
    return window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'compartilhado.html';
}

function passosDaTarefa(tarefa) {
    const lista = Array.isArray(tarefa?.subtarefas) ? tarefa.subtarefas : [];
    return lista.filter(passo => passo && passo.texto);
}

function montarResumo(dados) {
    const linhas = [];
    linhas.push(`*${dados.t}*`);
    if (dados.m) linhas.push(`Matéria: ${dados.m}`);
    linhas.push(`Prazo: ${formatarDataCurta(dados.p)}`);
    if (dados.f) linhas.push(`Dificuldade: ${dados.f}`);
    if (dados.o) linhas.push(`Responsável: ${dados.o}`);

    if (dados.d) {
        linhas.push('');
        linhas.push(dados.d);
    }

    if (dados.i) {
        linhas.push('');
        linhas.push(`Instruções: ${dados.i}`);
    }

    if (dados.s?.length) {
        linhas.push('');
        linhas.push('Checklist:');
        dados.s.forEach(passo => linhas.push(`${passo.f ? '[x]' : '[ ]'} ${passo.t}`));
    }

    if (dados.a?.length) {
        linhas.push('');
        linhas.push(`Arquivos anexados: ${dados.a.length}`);
    }

    linhas.push('');
    linhas.push('Enviado pelo Arkhys');

    return linhas.join('\n');
}

async function copiar(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch {
        const area = document.createElement('textarea');
        area.value = texto;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        area.remove();
        return ok;
    }
}

export function fecharCompartilhamento() {
    overlayAtual?.remove();
    overlayAtual = null;
}

export async function abrirCompartilhamento(tarefa, opcoes = {}) {
    const { materia = null, autor = '' } = opcoes;

    fecharCompartilhamento();

    const passos = passosDaTarefa(tarefa);
    const anexos = await listarAnexosDaTarefa(tarefa.id).catch(() => []);

    const passosEscolhidos = new Set(passos.map(p => p.id));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalCompartilhar';
    overlay.innerHTML = `
        <div class="form-modal modal-compartilhar view-modal">
            <div class="cabecalho-modal">
                <h3><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-compartilhar"></use></svg> Compartilhar atividade</h3>
                <button type="button" class="btn-acao" data-acao="fechar" title="Fechar"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>
            </div>

            <div class="compartilhar-abas" role="tablist">
                <button type="button" class="compartilhar-aba ativa" data-painel="link">Link</button>
                <button type="button" class="compartilhar-aba" data-painel="resumo">Resumo copiável</button>
            </div>

            <div class="compartilhar-painel" data-painel="link">
                <div class="opcoes-compartilhar">
                    <label class="opcao-compartilhar">
                        <input type="checkbox" data-opcao="descricao" checked>
                        <span><strong>Descrição da atividade</strong><p>Inclui o texto completo que você escreveu.</p></span>
                    </label>
                    <label class="opcao-compartilhar">
                        <input type="checkbox" data-opcao="passos" ${passos.length ? 'checked' : 'disabled'}>
                        <span><strong>Checklist de passos</strong><p>${passos.length ? 'Escolha abaixo o que a pessoa precisa fazer.' : 'Esta atividade não tem passos cadastrados.'}</p></span>
                    </label>
                    <label class="opcao-compartilhar">
                        <input type="checkbox" data-opcao="anexos" ${anexos.length ? '' : 'disabled'}>
                        <span><strong>Arquivos anexados</strong><p>${anexos.length ? `${anexos.length} arquivo(s). O link de download vale 7 dias.` : 'Esta atividade não tem anexos.'}</p></span>
                    </label>
                    <label class="opcao-compartilhar">
                        <input type="checkbox" data-opcao="pin">
                        <span><strong>Proteger com PIN</strong><p>Só quem tiver o código consegue abrir a página.</p></span>
                    </label>
                </div>

                <div class="grupo-campo" data-bloco="passos" ${passos.length ? '' : 'hidden'}>
                    <label>O QUE ESTA PESSOA PRECISA FAZER</label>
                    <div class="lista-passos-share">
                        ${passos.map(passo => `<button type="button" class="chip-passo-share ativo" data-passo="${escapar(String(passo.id))}">${escapar(passo.texto)}</button>`).join('')}
                    </div>
                </div>

                <div class="grupo-campo" data-bloco="pin" hidden>
                    <label for="pinCompartilhar">PIN DE ACESSO</label>
                    <input type="text" id="pinCompartilhar" class="campo-entrada" inputmode="numeric" maxlength="12" placeholder="Ex: 4821" autocomplete="off">
                </div>

                <div class="grupo-campo">
                    <label for="recadoCompartilhar">RECADO PARA QUEM RECEBER <span class="metadado">(opcional)</span></label>
                    <textarea id="recadoCompartilhar" class="campo-entrada" rows="2" placeholder="Esta é a parte que você precisa fazer."></textarea>
                </div>

                <div class="grupo-campo">
                    <label for="linkCompartilhar">LINK GERADO</label>
                    <div class="campo-link">
                        <input type="text" id="linkCompartilhar" class="campo-entrada" readonly>
                        <button type="button" class="botao botao-primario" data-acao="copiar-link">Copiar</button>
                    </div>
                    <p class="metadado" data-slot="tamanho"></p>
                </div>

                <div class="aviso-compartilhar">
                    <svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-aviso"></use></svg>
                    <span>O conteúdo viaja dentro do próprio link e abre uma página só de leitura. Para alterar qualquer coisa, a pessoa precisa entrar no seu espaço do Arkhys.</span>
                </div>

                <div class="botoes-canal">
                    <button type="button" class="canal-botao" data-canal="whatsapp">WhatsApp</button>
                    <button type="button" class="canal-botao" data-canal="email">E-mail</button>
                    <button type="button" class="canal-botao" data-canal="nativo">Mais opções</button>
                </div>
            </div>

            <div class="compartilhar-painel" data-painel="resumo" hidden>
                <p class="metadado">Texto pronto para colar no WhatsApp, Discord ou e-mail. Não depende de nenhuma integração.</p>
                <pre class="resumo-copiavel" data-slot="resumo"></pre>
                <div class="botoes-canal">
                    <button type="button" class="canal-botao" data-acao="copiar-resumo">Copiar resumo</button>
                    <button type="button" class="canal-botao" data-canal="whatsapp-resumo">Enviar no WhatsApp</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlayAtual = overlay;

    const campoLink = overlay.querySelector('#linkCompartilhar');
    const campoPin = overlay.querySelector('#pinCompartilhar');
    const campoRecado = overlay.querySelector('#recadoCompartilhar');
    const slotResumo = overlay.querySelector('[data-slot="resumo"]');
    const slotTamanho = overlay.querySelector('[data-slot="tamanho"]');
    const blocoPassos = overlay.querySelector('[data-bloco="passos"]');
    const blocoPin = overlay.querySelector('[data-bloco="pin"]');

    function opcao(nome) {
        return overlay.querySelector(`[data-opcao="${nome}"]`)?.checked;
    }

    let urlsAnexos = {};
    let linkAtual = '';
    let resumoAtual = '';

    async function garantirUrlsAnexos() {
        if (!anexos.length || Object.keys(urlsAnexos).length) return;
        urlsAnexos = await urlsAssinadasEmLote(anexos.map(a => a.url_arquivo), VALIDADE_ANEXOS);
    }

    async function montarDados() {
        const dados = {
            v: 1,
            t: tarefa.titulo,
            p: tarefa.data_entrega,
            m: materia?.nome || '',
            f: NOME_DIFICULDADE[tarefa.dificuldade] || '',
            o: autor || '',
            g: new Date().toISOString().slice(0, 10)
        };

        if (opcao('descricao') && tarefa.descricao) dados.d = tarefa.descricao;

        const recado = campoRecado.value.trim();
        if (recado) dados.i = recado;

        if (opcao('passos')) {
            const escolhidos = passos.filter(passo => passosEscolhidos.has(passo.id));
            if (escolhidos.length) dados.s = escolhidos.map(passo => ({ t: passo.texto, f: !!passo.feita }));
        }

        if (opcao('anexos')) {
            await garantirUrlsAnexos();
            const lista = anexos
                .map(anexo => ({ n: anexo.nome_arquivo, u: urlsAnexos[anexo.url_arquivo] }))
                .filter(item => item.u);
            if (lista.length) dados.a = lista;
        }

        return dados;
    }

    async function atualizar() {
        const dados = await montarDados();
        resumoAtual = montarResumo(dados);
        slotResumo.textContent = resumoAtual;

        const pin = opcao('pin') ? campoPin.value.trim() : '';

        if (opcao('pin') && pin.length < 3) {
            campoLink.value = '';
            linkAtual = '';
            slotTamanho.textContent = 'Escolha um PIN com pelo menos 3 caracteres para gerar o link.';
            return;
        }

        const fragmento = await empacotar(dados, pin);
        linkAtual = urlBase() + fragmento;
        campoLink.value = linkAtual;

        if (linkAtual.length > LIMITE_LINK) {
            slotTamanho.textContent = `Link muito longo (${linkAtual.length} caracteres). Desmarque os anexos para encurtar.`;
        } else {
            slotTamanho.textContent = `${linkAtual.length} caracteres${opcao('pin') ? ' • protegido por PIN' : ' • acesso direto'}.`;
        }
    }

    overlay.addEventListener('click', async (evento) => {
        if (evento.target === overlay || evento.target.closest('[data-acao="fechar"]')) {
            fecharCompartilhamento();
            return;
        }

        const aba = evento.target.closest('.compartilhar-aba');
        if (aba) {
            overlay.querySelectorAll('.compartilhar-aba').forEach(el => el.classList.toggle('ativa', el === aba));
            overlay.querySelectorAll('.compartilhar-painel').forEach(el => {
                el.hidden = el.dataset.painel !== aba.dataset.painel;
            });
            return;
        }

        const chip = evento.target.closest('.chip-passo-share');
        if (chip) {
            const id = chip.dataset.passo;
            const alvo = passos.find(passo => String(passo.id) === id);
            if (alvo) {
                if (passosEscolhidos.has(alvo.id)) passosEscolhidos.delete(alvo.id);
                else passosEscolhidos.add(alvo.id);
                chip.classList.toggle('ativo');
                atualizar();
            }
            return;
        }

        if (evento.target.closest('[data-acao="copiar-link"]')) {
            if (!linkAtual) return;
            const ok = await copiar(linkAtual);
            window.arkhysAvisar?.(ok ? 'Link copiado.' : 'Não foi possível copiar o link.', ok ? 'sucesso' : 'erro');
            return;
        }

        if (evento.target.closest('[data-acao="copiar-resumo"]')) {
            const ok = await copiar(resumoAtual);
            window.arkhysAvisar?.(ok ? 'Resumo copiado.' : 'Não foi possível copiar o resumo.', ok ? 'sucesso' : 'erro');
            return;
        }

        const canal = evento.target.closest('[data-canal]')?.dataset.canal;
        if (!canal) return;

        const textoCompleto = linkAtual ? `${resumoAtual}\n\n${linkAtual}` : resumoAtual;

        if (canal === 'whatsapp' || canal === 'whatsapp-resumo') {
            window.open(`https://wa.me/?text=${encodeURIComponent(textoCompleto)}`, '_blank', 'noopener');
            return;
        }

        if (canal === 'email') {
            window.location.href = `mailto:?subject=${encodeURIComponent(tarefa.titulo)}&body=${encodeURIComponent(textoCompleto)}`;
            return;
        }

        if (canal === 'nativo') {
            if (navigator.share) {
                try {
                    await navigator.share({ title: tarefa.titulo, text: resumoAtual, url: linkAtual || undefined });
                } catch (erro) {
                    if (erro.name !== 'AbortError') console.error('Erro ao compartilhar:', erro);
                }
                return;
            }
            const ok = await copiar(textoCompleto);
            window.arkhysAvisar?.(ok ? 'Conteúdo copiado.' : 'Não foi possível copiar.', ok ? 'sucesso' : 'erro');
        }
    });

    overlay.addEventListener('change', (evento) => {
        const nome = evento.target.dataset?.opcao;
        if (nome === 'passos') blocoPassos.hidden = !evento.target.checked;
        if (nome === 'pin') {
            blocoPin.hidden = !evento.target.checked;
            if (evento.target.checked) campoPin.focus();
        }
        atualizar();
    });

    let temporizador = null;
    overlay.addEventListener('input', (evento) => {
        if (evento.target !== campoPin && evento.target !== campoRecado) return;
        clearTimeout(temporizador);
        temporizador = setTimeout(atualizar, 260);
    });

    document.addEventListener('keydown', function aoEsc(evento) {
        if (evento.key === 'Escape') {
            fecharCompartilhamento();
            document.removeEventListener('keydown', aoEsc);
        }
    });

    await atualizar();
}
