const VERSAO = 'arkhys-v1';
const CACHE_CASCA = `${VERSAO}-casca`;
const CACHE_ATIVOS = `${VERSAO}-ativos`;

const CASCA = [
    './',
    './index.html',
    './tarefas.html',
    './rotinas.html',
    './revisoes.html',
    './calendario.html',
    './xp.html',
    './arquivos.html',
    './cadastros.html',
    './perfil.html',
    './hoje.html',
    './login.html',
    './cadastro.html',
    './compartilhado.html',
    './manifest.json',
    './css/style-global.css',
    './css/icones.css',
    './js/ui.js',
    './js/loading.js',
    './assets/logo-arkhys.png',
    './assets/arkhys-totem.png',
    './assets/arkhys-brasao.png',
    './assets/arkhys-icone.png',
    './assets/icone-192.png',
    './assets/icone-512.png',
    './assets/icones/arkhys-icons.svg'
];

const HOSTS_FORA = ['supabase.co', 'supabase.in'];

self.addEventListener('install', evento => {
    evento.waitUntil(
        caches.open(CACHE_CASCA)
            .then(cache => cache.addAll(CASCA.map(url => new Request(url, { cache: 'reload' }))))
            .catch(() => null)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', evento => {
    evento.waitUntil(
        caches.keys()
            .then(chaves => Promise.all(
                chaves.filter(chave => !chave.startsWith(VERSAO)).map(chave => caches.delete(chave))
            ))
            .then(() => self.clients.claim())
    );
});

function ehDinamico(url) {
    return HOSTS_FORA.some(host => url.hostname.endsWith(host));
}

function ehFonte(url) {
    return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

async function redePrimeiro(requisicao) {
    try {
        const resposta = await fetch(requisicao);
        if (resposta && resposta.ok) {
            const cache = await caches.open(CACHE_CASCA);
            cache.put(requisicao, resposta.clone());
        }
        return resposta;
    } catch (erro) {
        const guardado = await caches.match(requisicao) || await caches.match('./index.html');
        if (guardado) return guardado;
        throw erro;
    }
}

async function cacheComRevalidacao(requisicao, nomeCache) {
    const cache = await caches.open(nomeCache);
    const guardado = await cache.match(requisicao);

    const rede = fetch(requisicao).then(resposta => {
        if (resposta && (resposta.ok || resposta.type === 'opaque')) cache.put(requisicao, resposta.clone());
        return resposta;
    }).catch(() => null);

    return guardado || rede || fetch(requisicao);
}

self.addEventListener('fetch', evento => {
    const requisicao = evento.request;
    if (requisicao.method !== 'GET') return;

    const url = new URL(requisicao.url);
    if (ehDinamico(url)) return;

    if (requisicao.mode === 'navigate') {
        evento.respondWith(redePrimeiro(requisicao));
        return;
    }

    if (ehFonte(url)) {
        evento.respondWith(cacheComRevalidacao(requisicao, CACHE_ATIVOS));
        return;
    }

    if (url.origin !== self.location.origin) return;

    evento.respondWith(cacheComRevalidacao(requisicao, CACHE_ATIVOS));
});

self.addEventListener('message', evento => {
    if (evento.data === 'atualizar-agora') self.skipWaiting();
});
