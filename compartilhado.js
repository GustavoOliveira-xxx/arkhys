const cartao = document.getElementById('cartaoPublico');

function escapar(texto = '') {
    return String(texto).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function base64UrlParaBytes(texto) {
    const normalizado = texto.replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = normalizado + '='.repeat((4 - (normalizado.length % 4)) % 4);
    const binario = atob(preenchido);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return bytes;
}

async function descomprimir(bytes) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('Este navegador não consegue abrir o link. Tente em um navegador mais atual.');
    }
    const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

async function lerCorpo(marcador, bytes) {
    const finais = marcador === 'c' ? await descomprimir(bytes) : bytes;
    return JSON.parse(new TextDecoder().decode(finais));
}

async function derivarChave(pin, sal) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: sal, iterations: 150000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
}

function formatarData(iso) {
    if (!iso) return 'Sem prazo definido';
    const data = new Date(`${iso}T00:00:00`);
    const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function situacaoDoPrazo(iso) {
    if (!iso) return { classe: 'normal', texto: 'Sem prazo' };
    const hoje = new Date().toISOString().split('T')[0];
    if (iso < hoje) return { classe: 'atrasado', texto: 'Prazo vencido' };
    if (iso === hoje) return { classe: 'prazo-hoje', texto: 'Entrega hoje' };
    return { classe: 'proximo', texto: 'Em andamento' };
}

function iconeArquivo(nome = '') {
    const extensao = nome.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extensao)) return 'icon-imagem';
    if (extensao === 'pdf') return 'icon-pdf';
    if (['doc', 'docx'].includes(extensao)) return 'icon-documento';
    if (['xls', 'xlsx', 'csv'].includes(extensao)) return 'icon-planilha';
    if (['ppt', 'pptx'].includes(extensao)) return 'icon-apresentacao';
    return 'icon-anexo';
}

function mostrarErro(mensagem) {
    cartao.innerHTML = `
        <div class="bloqueio-pin">
            <div class="bloqueio-icone"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-erro"></use></svg></div>
            <h1 class="publico-titulo">Não deu para abrir</h1>
            <p class="publico-texto">${escapar(mensagem)}</p>
            <a href="index.html" class="botao botao-secundario">Ir para o Arkhys</a>
        </div>
    `;
}

function renderizar(dados) {
    const situacao = situacaoDoPrazo(dados.p);

    const etiquetas = [
        dados.m ? `<span class="publico-tag"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-materias"></use></svg> ${escapar(dados.m)}</span>` : '',
        `<span class="publico-tag"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-calendario"></use></svg> ${escapar(formatarData(dados.p))}</span>`,
        dados.f ? `<span class="publico-tag"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-dificuldade-medio"></use></svg> ${escapar(dados.f)}</span>` : '',
        dados.o ? `<span class="publico-tag"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-individual"></use></svg> ${escapar(dados.o)}</span>` : ''
    ].filter(Boolean).join('');

    const recado = dados.i ? `
        <div class="publico-secao">
            <h2>Recado de quem enviou</h2>
            <p class="publico-texto">${escapar(dados.i)}</p>
        </div>` : '';

    const descricao = dados.d ? `
        <div class="publico-secao">
            <h2>Descrição</h2>
            <p class="publico-texto">${escapar(dados.d)}</p>
        </div>` : '';

    const passos = dados.s?.length ? `
        <div class="publico-secao">
            <h2>O que precisa ser feito</h2>
            <div class="publico-checklist">
                ${dados.s.map((passo, indice) => `
                    <div class="publico-passo ${passo.f ? 'feito' : ''}">
                        <span class="publico-passo-marca">${indice + 1}</span>
                        <span>${escapar(passo.t)}</span>
                    </div>
                `).join('')}
            </div>
        </div>` : '';

    const anexos = dados.a?.length ? `
        <div class="publico-secao">
            <h2>Arquivos</h2>
            <div class="publico-checklist">
                ${dados.a.map(arquivo => `
                    <a class="publico-passo" href="${escapar(arquivo.u)}" target="_blank" rel="noopener">
                        <span class="publico-passo-marca"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#${iconeArquivo(arquivo.n)}"></use></svg></span>
                        <span>${escapar(arquivo.n)}</span>
                    </a>
                `).join('')}
            </div>
            <p class="metadado" style="margin-top: 0.6rem;">Os links de download expiram sete dias depois do compartilhamento.</p>
        </div>` : '';

    cartao.innerHTML = `
        <span class="publico-etiqueta"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-compartilhar"></use></svg> Atividade compartilhada</span>
        <h1 class="publico-titulo">${escapar(dados.t)}</h1>
        <span class="status ${situacao.classe}">${situacao.texto}</span>
        <div class="publico-linha-meta" style="margin-top: 1rem;">${etiquetas}</div>
        ${recado}
        ${descricao}
        ${passos}
        ${anexos}
        <div class="publico-rodape">
            <span>Para editar ou entregar, entre no espaço do Arkhys.</span>
            <a href="index.html" class="botao botao-primario">Abrir o Arkhys</a>
        </div>
    `;
}

function pedirPin(aoEnviar) {
    cartao.innerHTML = `
        <div class="bloqueio-pin">
            <div class="bloqueio-icone"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-bloqueio"></use></svg></div>
            <h1 class="publico-titulo">Atividade protegida</h1>
            <p class="publico-texto">Digite o PIN que a pessoa enviou junto com o link.</p>
            <input type="text" id="campoPin" class="campo-entrada" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="••••">
            <button type="button" class="botao botao-primario" id="botaoAbrir">Abrir atividade</button>
            <p class="aviso-publico" id="avisoPin"></p>
        </div>
    `;

    const campo = cartao.querySelector('#campoPin');
    const botao = cartao.querySelector('#botaoAbrir');
    const aviso = cartao.querySelector('#avisoPin');

    async function tentar() {
        const pin = campo.value.trim();
        if (!pin) return;

        botao.disabled = true;
        aviso.textContent = '';

        const ok = await aoEnviar(pin);
        if (!ok) {
            botao.disabled = false;
            aviso.textContent = 'PIN incorreto. Confira com quem enviou o link.';
            campo.select();
        }
    }

    botao.addEventListener('click', tentar);
    campo.addEventListener('keydown', evento => { if (evento.key === 'Enter') tentar(); });
    campo.focus();
}

async function iniciar() {
    const fragmento = window.location.hash.slice(1);
    const parametros = new URLSearchParams(fragmento);
    const aberto = parametros.get('d');
    const protegido = parametros.get('k');

    if (!aberto && !protegido) {
        mostrarErro('Este endereço não tem nenhuma atividade. Peça um novo link para quem compartilhou.');
        return;
    }

    try {
        if (aberto) {
            const [marcador, corpo] = aberto.split('.');
            renderizar(await lerCorpo(marcador, base64UrlParaBytes(corpo)));
            return;
        }

        const [marcador, corpo] = protegido.split('.');
        const pacote = base64UrlParaBytes(corpo);
        const sal = pacote.slice(0, 16);
        const vetor = pacote.slice(16, 28);
        const cifrado = pacote.slice(28);

        pedirPin(async (pin) => {
            try {
                const chave = await derivarChave(pin, sal);
                const bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: vetor }, chave, cifrado));
                renderizar(await lerCorpo(marcador, bytes));
                return true;
            } catch {
                return false;
            }
        });
    } catch (erro) {
        mostrarErro(erro.message || 'O link parece estar incompleto ou corrompido.');
    }
}

iniciar();
