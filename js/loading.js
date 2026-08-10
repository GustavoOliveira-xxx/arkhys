let overlay = null;
let contador = 0;

function garantirOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'loadingGlobal';
    overlay.className = 'loading-global-overlay';
    overlay.innerHTML = `
        <div class="loading-global-caixa">
            <div class="loading-logo-wrapper">
                <div class="loading-ring"></div>
                <div class="loading-ring-inner"></div>
                <img src="assets/arkhys-totem.png" alt="Arkhys" class="loading-global-logo">
                <div class="loading-particles">
                    <span style="--i:1"></span>
                    <span style="--i:2"></span>
                    <span style="--i:3"></span>
                    <span style="--i:4"></span>
                    <span style="--i:5"></span>
                </div>
            </div>
            <div class="loading-info">
                <span class="loading-global-texto">Iniciando Protocolo...</span>
                <div class="loading-bar-container">
                    <div class="loading-bar-fill"></div>
                </div>
            </div>
        </div>
    `;

    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay), { once: true });
    }

    return overlay;
}

export function mostrarCarregamento(mensagem = 'Iniciando Protocolo...') {
    contador++;
    const el = garantirOverlay();
    const texto = el.querySelector('.loading-global-texto');
    if (texto) texto.textContent = mensagem;
    el.classList.add('visivel');
    document.body.style.overflow = 'hidden';
}

export function esconderCarregamento() {
    contador = Math.max(0, contador - 1);
    if (contador === 0 && overlay) {
        overlay.classList.remove('visivel');
        setTimeout(() => {
            if (!overlay.classList.contains('visivel')) {
                document.body.style.overflow = '';
            }
        }, 500);
    }
}

mostrarCarregamento('Sincronizando Arkhys...');
document.addEventListener('DOMContentLoaded', () => {

    setTimeout(esconderCarregamento, 1200);
});
