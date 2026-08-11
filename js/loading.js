/* Tela de carregamento do Arkhys — selo (logo-b), arco de progresso e saida em iris. */

const SELO_WEBP = 'assets/logo-arkhys-b-selo.webp';
const SELO_PNG = 'assets/logo-arkhys-b-selo.png';
const MARCA = 'ARKHYS';
const RAIO_ARCO = 92;

const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let overlay = null;
let contador = 0;
let quadro = null;
let saida = null;

/* progresso: 'alvo' sobe sozinho ate 0,92 enquanto carrega; 'atual' persegue o alvo */
let atual = 0;
let alvo = 0;
let inicio = 0;
let concluindo = false;

function letras() {
    return MARCA.split('')
        .map((c, i) => `<span style="--i:${i}">${c}</span>`)
        .join('');
}

function brasas() {
    let html = '';
    for (let i = 0; i < 10; i++) html += `<span style="--i:${i}"></span>`;
    return html;
}

function garantirOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'loadingGlobal';
    overlay.className = 'carga';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.style.setProperty('--circunferencia', (2 * Math.PI * RAIO_ARCO).toFixed(2));
    overlay.innerHTML = `
        <div class="carga-fundo" aria-hidden="true">
            <span class="carga-nebula"></span>
            <span class="carga-varredura"></span>
            <span class="carga-grade"></span>
            <span class="carga-vinheta"></span>
        </div>

        <div class="carga-nucleo">
            <div class="carga-palco">
                <span class="carga-aureola" aria-hidden="true"></span>
                <span class="carga-onda" aria-hidden="true"></span>
                <span class="carga-onda carga-onda-2" aria-hidden="true"></span>
                <span class="carga-orbita carga-orbita-1" aria-hidden="true"></span>
                <span class="carga-orbita carga-orbita-2" aria-hidden="true"></span>

                <svg class="carga-arco" viewBox="0 0 200 200" aria-hidden="true">
                    <circle class="carga-arco-trilho" cx="100" cy="100" r="${RAIO_ARCO}"></circle>
                    <circle class="carga-arco-linha" cx="100" cy="100" r="${RAIO_ARCO}"></circle>
                </svg>

                <picture class="carga-selo">
                    <source srcset="${SELO_WEBP}" type="image/webp">
                    <img src="${SELO_PNG}" alt="Arkhys" width="512" height="512" decoding="async" fetchpriority="high">
                </picture>

                <span class="carga-lustro" aria-hidden="true"></span>
                <span class="carga-brasas" aria-hidden="true">${brasas()}</span>
            </div>

            <div class="carga-texto">
                <p class="carga-marca" aria-hidden="true">${letras()}</p>
                <div class="carga-barra" aria-hidden="true"><span class="carga-barra-preenche"></span></div>
                <p class="carga-estado">
                    <span class="carga-mensagem">Sincronizando Arkhys</span>
                    <span class="carga-percentual">0%</span>
                </p>
            </div>
        </div>
    `;

    const img = overlay.querySelector('.carga-selo img');
    if (img) {
        const revelar = () => overlay.classList.add('selo-pronto');
        if (img.complete) revelar();
        else {
            img.addEventListener('load', revelar, { once: true });
            img.addEventListener('error', revelar, { once: true });
        }
    }

    if (document.body) document.body.appendChild(overlay);
    else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay), { once: true });

    return overlay;
}

function travarRolagem(travar) {
    if (document.body) document.body.style.overflow = travar ? 'hidden' : '';
}

function pintar(valor) {
    if (!overlay) return;
    overlay.style.setProperty('--progresso', valor.toFixed(4));
    const rotulo = overlay.querySelector('.carga-percentual');
    if (rotulo) rotulo.textContent = Math.round(valor * 100) + '%';
}

function passo(agora) {
    if (!overlay) { quadro = null; return; }

    if (!concluindo) {
        /* curva de espera: rapido no comeco, assintotico em 92% */
        const t = (agora - inicio) / 1000;
        alvo = 0.92 * (1 - Math.exp(-t / 1.35));
    }

    atual += (alvo - atual) * (concluindo ? 0.22 : 0.09);
    pintar(atual);

    if (concluindo && alvo - atual < 0.004) {
        atual = alvo;
        pintar(atual);
        quadro = null;
        return;
    }

    quadro = requestAnimationFrame(passo);
}

function tocar() {
    if (semMovimento) { pintar(concluindo ? 1 : 0.5); return; }
    if (quadro) return;
    inicio = performance.now() - atual * 1000;
    quadro = requestAnimationFrame(passo);
}

export function mostrarCarregamento(mensagem = 'Sincronizando Arkhys') {
    contador++;

    const el = garantirOverlay();
    clearTimeout(saida);
    el.classList.remove('saindo');
    el.setAttribute('aria-busy', 'true');

    const texto = el.querySelector('.carga-mensagem');
    if (texto) texto.textContent = mensagem;

    if (!el.classList.contains('visivel')) {
        atual = 0;
        alvo = 0;
        pintar(0);
    }

    concluindo = false;
    el.classList.add('visivel');
    travarRolagem(true);
    tocar();
}

export function esconderCarregamento() {
    contador = Math.max(0, contador - 1);
    if (contador > 0 || !overlay || !overlay.classList.contains('visivel')) return;

    concluindo = true;
    alvo = 1;
    tocar();
    overlay.setAttribute('aria-busy', 'false');

    clearTimeout(saida);
    saida = setTimeout(() => {
        if (contador > 0 || !overlay) return;
        overlay.classList.add('saindo');
        overlay.classList.remove('visivel');
        saida = setTimeout(() => {
            if (!overlay || overlay.classList.contains('visivel')) return;
            overlay.classList.remove('saindo');
            travarRolagem(false);
            if (quadro) { cancelAnimationFrame(quadro); quadro = null; }
        }, semMovimento ? 0 : 700);
    }, semMovimento ? 0 : 260);
}

export function liberarCarregamento() {
    contador = 0;
    if (!overlay) return;
    esconderCarregamento();
}

/* --------------------------------------------------- abertura da pagina */
mostrarCarregamento('Sincronizando Arkhys');

let aberturaEncerrada = false;

function encerrarAberturaInicial(atraso = 520) {
    if (aberturaEncerrada) return;
    aberturaEncerrada = true;
    setTimeout(esconderCarregamento, atraso);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => encerrarAberturaInicial(), { once: true });
} else {
    encerrarAberturaInicial();
}

window.addEventListener('load', () => encerrarAberturaInicial(120), { once: true });
setTimeout(() => { if (!aberturaEncerrada) { aberturaEncerrada = true; esconderCarregamento(); } }, 8000);
