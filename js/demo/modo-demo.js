const CHAVE_MODO = 'arkhys_demo_ativo';
const CHAVE_BANCO = 'arkhys_demo_banco';
const CHAVE_MIDIA = 'arkhys_demo_midia';

function lerLocal(chave) {
    try {
        return localStorage.getItem(chave);
    } catch {
        return null;
    }
}

function gravarLocal(chave, valor) {
    try {
        localStorage.setItem(chave, valor);
    } catch {
        /* navegação privada: o modo demo segue apenas em memória */
    }
}

function apagarLocal(chave) {
    try {
        localStorage.removeItem(chave);
    } catch {
        /* silencioso */
    }
}

function hospedagemDeVitrine() {
    const host = window.location.hostname || '';
    return host.endsWith('github.io') || host.endsWith('githubpreview.dev') || host.endsWith('pages.dev');
}

function resolverModo() {
    const parametros = new URLSearchParams(window.location.search);
    const pedido = parametros.get('demo');

    if (parametros.get('real') === '1' || pedido === '0' || pedido === 'off') {
        apagarLocal(CHAVE_MODO);
        return false;
    }

    if (pedido === 'reset') {
        apagarLocal(CHAVE_BANCO);
        apagarLocal(CHAVE_MIDIA);
        gravarLocal(CHAVE_MODO, '1');
        return true;
    }

    if (pedido !== null) {
        gravarLocal(CHAVE_MODO, '1');
        return true;
    }

    if (lerLocal(CHAVE_MODO) === '1') return true;

    return hospedagemDeVitrine();
}

export const MODO_DEMO = resolverModo();

export function ligarModoDemo() {
    gravarLocal(CHAVE_MODO, '1');
}

export { CHAVE_BANCO, CHAVE_MIDIA };
