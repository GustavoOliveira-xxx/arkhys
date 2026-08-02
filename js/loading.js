// ==================================================
// OVERLAY GLOBAL DE CARREGAMENTO
// Usa a logo do Arkhys (versão quadrada) como indicador visual.
// Duas formas de uso:
//   1) Automática — aparece assim que a página começa a carregar
//      e some sozinho pouco depois de o DOM estar pronto, cobrindo
//      o "flash" inicial enquanto os módulos/dados carregam.
//   2) Manual — chame mostrarCarregamento()/esconderCarregamento()
//      em qualquer operação assíncrona (salvar, enviar anexo, etc.)
//      pra dar feedback visual durante a espera.
// Suporta chamadas aninhadas: só esconde de fato quando o número
// de "esconder" bate com o de "mostrar".
// ==================================================

let overlay = null;
let contador = 0;

function garantirOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'loadingGlobal';
    overlay.className = 'loading-global-overlay';
    overlay.innerHTML = `
        <div class="loading-global-caixa">
            <img src="assets/logo-arkhys-b.png" alt="Arkhys" class="loading-global-logo">
            <span class="loading-global-texto">Carregando...</span>
        </div>
    `;

    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay), { once: true });
    }

    return overlay;
}

export function mostrarCarregamento(mensagem = 'Carregando...') {
    contador++;
    const el = garantirOverlay();
    const texto = el.querySelector('.loading-global-texto');
    if (texto) texto.textContent = mensagem;
    el.classList.add('visivel');
}

export function esconderCarregamento() {
    contador = Math.max(0, contador - 1);
    if (contador === 0 && overlay) {
        overlay.classList.remove('visivel');
    }
}

// Cobre o carregamento inicial de qualquer página automaticamente.
mostrarCarregamento('Carregando Arkhys...');
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno atraso pra evitar um "pisca" caso o carregamento real
    // termine instantaneamente — mantém a transição suave.
    setTimeout(esconderCarregamento, 250);
});
