import { CHAVE_BANCO, CHAVE_MIDIA } from './modo-demo.js';
import { montarSementes, CONTA_DEMO } from './dados-demo.js';

const VERSAO_BANCO = 1;
const NOME_IDB = 'arkhys-demo-cofre';
const LOJA_IDB = 'arquivos';
const LADO_MAXIMO_IMAGEM = 640;
const LIMITE_MIDIA_PUBLICA = 900 * 1024;

let banco = null;
let midia = {};
let bancoDeArquivos = null;
let prontoBinarios = Promise.resolve();
const arquivosEmMemoria = new Map();
const urlsGeradas = new Map();

function hojeISO() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

function lerJson(chave) {
    try {
        const bruto = localStorage.getItem(chave);
        return bruto ? JSON.parse(bruto) : null;
    } catch {
        return null;
    }
}

function gravarJson(chave, valor) {
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
        /* sem espaço ou navegação privada: o estado segue apenas em memória */
    }
}

function bancoNovo(sementes) {
    return {
        versao: VERSAO_BANCO,
        semeado_em: hojeISO(),
        alterado: false,
        tabelas: sementes.tabelas,
        sequencias: sementes.sequencias,
        contas: [{
            id: CONTA_DEMO.id,
            email: CONTA_DEMO.email,
            senha: CONTA_DEMO.senha,
            metadados: { nome_completo: CONTA_DEMO.nome },
            criado_em: new Date().toISOString()
        }],
        sessao: null
    };
}

export function salvar({ alterado = true } = {}) {
    if (!banco) return;
    if (alterado) banco.alterado = true;
    gravarJson(CHAVE_BANCO, banco);
}

function salvarMidia() {
    gravarJson(CHAVE_MIDIA, midia);
}

export function aguardarArquivos() {
    return prontoBinarios;
}

function reiniciarDemo({ manterSessao = false } = {}) {
    const sessaoAnterior = manterSessao ? banco?.sessao || null : null;
    const sementes = montarSementes(CONTA_DEMO.id);

    banco = bancoNovo(sementes);
    banco.sessao = sessaoAnterior;
    midia = sementes.midia;
    arquivosEmMemoria.clear();
    urlsGeradas.forEach(url => URL.revokeObjectURL(url));
    urlsGeradas.clear();
    gravarJson(CHAVE_BANCO, banco);
    salvarMidia();

    prontoBinarios = semearBinarios(sementes.binarios, true);
    return prontoBinarios;
}

export function iniciarArmazem() {
    if (banco) return;

    banco = lerJson(CHAVE_BANCO);
    midia = lerJson(CHAVE_MIDIA) || {};

    const desatualizado = banco && banco.versao !== VERSAO_BANCO;
    const seguindoIntocado = banco && !banco.alterado && banco.semeado_em !== hojeISO();

    if (!banco || desatualizado || seguindoIntocado) {
        reiniciarDemo({ manterSessao: !!banco?.sessao && !desatualizado });
        return;
    }

    const sementes = montarSementes(CONTA_DEMO.id);

    if (!Object.keys(midia).length) {
        midia = sementes.midia;
        salvarMidia();
    }

    prontoBinarios = semearBinarios(sementes.binarios, false);
}

function abrirIdb() {
    if (bancoDeArquivos) return bancoDeArquivos;

    bancoDeArquivos = new Promise(resolver => {
        try {
            const pedido = indexedDB.open(NOME_IDB, 1);
            pedido.onupgradeneeded = () => {
                const base = pedido.result;
                if (!base.objectStoreNames.contains(LOJA_IDB)) base.createObjectStore(LOJA_IDB);
            };
            pedido.onsuccess = () => resolver(pedido.result);
            pedido.onerror = () => resolver(null);
        } catch {
            resolver(null);
        }
    });

    return bancoDeArquivos;
}

function transacionar(modo, executar) {
    return abrirIdb().then(base => {
        if (!base) return null;
        return new Promise(resolver => {
            try {
                const transacao = base.transaction(LOJA_IDB, modo);
                const pedido = executar(transacao.objectStore(LOJA_IDB));
                pedido.onsuccess = () => resolver(pedido.result ?? true);
                pedido.onerror = () => resolver(null);
            } catch {
                resolver(null);
            }
        });
    });
}

export async function guardarArquivo(caminho, conteudo) {
    arquivosEmMemoria.set(caminho, conteudo);
    const url = urlsGeradas.get(caminho);
    if (url) {
        URL.revokeObjectURL(url);
        urlsGeradas.delete(caminho);
    }
    await transacionar('readwrite', loja => loja.put(conteudo, caminho));
}

async function lerArquivo(caminho) {
    if (arquivosEmMemoria.has(caminho)) return arquivosEmMemoria.get(caminho);
    const guardado = await transacionar('readonly', loja => loja.get(caminho));
    if (guardado) arquivosEmMemoria.set(caminho, guardado);
    return guardado || null;
}

export async function apagarArquivo(caminho) {
    arquivosEmMemoria.delete(caminho);
    const url = urlsGeradas.get(caminho);
    if (url) {
        URL.revokeObjectURL(url);
        urlsGeradas.delete(caminho);
    }
    await transacionar('readwrite', loja => loja.delete(caminho));
}

export async function urlDoArquivo(caminho) {
    if (urlsGeradas.has(caminho)) return urlsGeradas.get(caminho);
    const conteudo = await lerArquivo(caminho);
    if (!conteudo) return null;
    const url = URL.createObjectURL(conteudo);
    urlsGeradas.set(caminho, url);
    return url;
}

async function semearBinarios(binarios, forcar) {
    for (const item of binarios) {
        if (!forcar && await lerArquivo(item.caminho)) continue;
        await guardarArquivo(item.caminho, item.blob);
    }
}

export function urlPublica(caminho) {
    return midia[caminho] || null;
}

export function removerMidia(caminho) {
    if (!caminho || !(caminho in midia)) return;
    delete midia[caminho];
    salvarMidia();
}

function lerComoDataUrl(arquivo) {
    return new Promise(resolver => {
        const leitor = new FileReader();
        leitor.onload = () => resolver(String(leitor.result));
        leitor.onerror = () => resolver(null);
        leitor.readAsDataURL(arquivo);
    });
}

function reduzirImagem(dataUrl, tipo) {
    return new Promise(resolver => {
        const imagem = new Image();
        imagem.onload = () => {
            const maiorLado = Math.max(imagem.width, imagem.height);
            const escala = maiorLado > LADO_MAXIMO_IMAGEM ? LADO_MAXIMO_IMAGEM / maiorLado : 1;

            if (escala === 1 && dataUrl.length < LIMITE_MIDIA_PUBLICA) {
                resolver(dataUrl);
                return;
            }

            const tela = document.createElement('canvas');
            tela.width = Math.round(imagem.width * escala);
            tela.height = Math.round(imagem.height * escala);
            const pincel = tela.getContext('2d');
            pincel.drawImage(imagem, 0, 0, tela.width, tela.height);

            const formato = tipo === 'image/png' ? 'image/png' : 'image/jpeg';
            resolver(tela.toDataURL(formato, 0.82));
        };
        imagem.onerror = () => resolver(dataUrl);
        imagem.src = dataUrl;
    });
}

export async function guardarMidiaPublica(caminho, arquivo) {
    const dataUrl = await lerComoDataUrl(arquivo);
    if (!dataUrl) return { message: 'Não foi possível ler o arquivo.' };

    let final = dataUrl;
    if ((arquivo.type || '').startsWith('image/') && arquivo.type !== 'image/svg+xml') {
        final = await reduzirImagem(dataUrl, arquivo.type);
    }

    if (final.length > LIMITE_MIDIA_PUBLICA) {
        return { message: 'Na demonstração, imagens de perfil e de matéria precisam ter menos de 1 MB.' };
    }

    midia[caminho] = final;
    salvarMidia();
    return null;
}

export function tabela(nome) {
    if (!banco.tabelas[nome]) banco.tabelas[nome] = [];
    return banco.tabelas[nome];
}

export function proximoId(nome) {
    banco.sequencias[nome] = (banco.sequencias[nome] || 0) + 1;
    return banco.sequencias[nome];
}

export function contas() {
    return banco.contas;
}

export function adicionarConta(conta) {
    banco.contas.push(conta);
    salvar();
}

export function sessao() {
    return banco?.sessao || null;
}

export function definirSessao(valor) {
    banco.sessao = valor;
    salvar({ alterado: false });
}
