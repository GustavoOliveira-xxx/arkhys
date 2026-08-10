import { supabase } from './supabase-config.js';

const EXTENSOES_IMAGEM = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

export function extensaoDoArquivo(nomeArquivo = '') {
    return nomeArquivo.split('.').pop().toLowerCase();
}

export function nomeArquivoSeguro(nomeOriginal = 'arquivo') {
    const partes = nomeOriginal.split('.');
    const extensao = partes.length > 1 ? partes.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const base = partes.join('.')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'arquivo';

    return extensao ? `${base}.${extensao}` : base;
}

export function ehImagem(nomeArquivo = '', tipoMime = '') {
    if (tipoMime) return tipoMime.startsWith('image/');
    return EXTENSOES_IMAGEM.includes(extensaoDoArquivo(nomeArquivo));
}

export function iconePorTipo(nomeArquivo = '', tipoMime = '') {
    if (ehImagem(nomeArquivo, tipoMime)) return '🖼️';
    const ext = extensaoDoArquivo(nomeArquivo);
    if (ext === 'pdf') return '📕';
    if (['doc', 'docx'].includes(ext)) return '📄';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📽️';
    if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
    return '📎';
}

export function rotuloPorTipo(nomeArquivo = '', tipoMime = '') {
    if (ehImagem(nomeArquivo, tipoMime)) return 'Foto';
    const ext = extensaoDoArquivo(nomeArquivo);
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Documento';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Planilha';
    if (['ppt', 'pptx'].includes(ext)) return 'Apresentação';
    return 'Arquivo';
}

export function iconeSvgPorTipo(nomeArquivo = '', tipoMime = '') {
    if (ehImagem(nomeArquivo, tipoMime)) return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-imagem"></use></svg>';
    const ext = extensaoDoArquivo(nomeArquivo);
    if (ext === 'pdf') return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-pdf"></use></svg>';
    if (['doc', 'docx'].includes(ext)) return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-documento"></use></svg>';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-planilha"></use></svg>';
    if (['ppt', 'pptx'].includes(ext)) return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-apresentacao"></use></svg>';
    if (['zip', 'rar', '7z'].includes(ext)) return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-zip"></use></svg>';
    return '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-anexo"></use></svg>';
}

export function nomeExibicao(caminhoOuNome = '') {
    return caminhoOuNome.split('/').pop().replace(/^[0-9]+_/, '');
}

export function urlPublicaMidia(caminho) {
    if (!caminho) return null;
    const { data } = supabase.storage.from('midia-publica').getPublicUrl(caminho);
    return data?.publicUrl || null;
}

export async function enviarMidiaPublica(caminho, arquivo) {
    return supabase.storage.from('midia-publica').upload(caminho, arquivo, { upsert: true });
}

export async function removerMidiaPublica(caminho) {
    if (!caminho) return;
    await supabase.storage.from('midia-publica').remove([caminho]);
}

export async function urlsAssinadasEmLote(caminhos = [], duracaoSegundos = 60 * 30) {
    const unicos = [...new Set(caminhos.filter(Boolean))];
    const mapa = {};
    if (unicos.length === 0) return mapa;

    const { data, error } = await supabase.storage.from('arquivos').createSignedUrls(unicos, duracaoSegundos);
    if (error || !data) return mapa;

    data.forEach(item => {
        if (item.signedUrl) mapa[item.path] = item.signedUrl;
    });
    return mapa;
}

function fecharVisualizador() {
    document.getElementById('lightboxAnexo')?.remove();
}

function montarOverlayVisualizador(conteudoInterno, classeExtra = '') {
    fecharVisualizador();
    const lightbox = document.createElement('div');
    lightbox.id = 'lightboxAnexo';
    lightbox.className = `lightbox-overlay ${classeExtra}`.trim();
    lightbox.innerHTML = `${conteudoInterno}<button type="button" class="btn-acao lightbox-fechar" title="Fechar"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>`;

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.closest('.lightbox-fechar')) lightbox.remove();
    });
    document.addEventListener('keydown', function aoEsc(e) {
        if (e.key === 'Escape') { lightbox.remove(); document.removeEventListener('keydown', aoEsc); }
    });

    document.body.appendChild(lightbox);
    return lightbox;
}

export function abrirLightboxImagem(url, nome = '') {
    montarOverlayVisualizador(`<img src="${url}" alt="${nome}">`);
}

export function abrirVisualizadorPdf(url, nome = '') {
    montarOverlayVisualizador(`
        <div class="lightbox-pdf-caixa">
            <iframe src="${url}#toolbar=1" title="${nome}"></iframe>
            <div class="detalhe-anexo-legenda">
                <span><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-pdf"></use></svg> ${nome}</span>
                <div>
                    <a href="${url}" target="_blank" rel="noopener">Abrir em nova aba</a>
                    <a href="${url}" download="${nome}"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-download"></use></svg> Baixar</a>
                </div>
            </div>
        </div>
    `, 'lightbox-pdf');
}

export function abrirVisualizadorArquivo(url, nome = '', tipoMime = '') {
    if (!url) return;
    if (ehImagem(nome, tipoMime)) return abrirLightboxImagem(url, nome);
    if (extensaoDoArquivo(nome) === 'pdf') return abrirVisualizadorPdf(url, nome);
    window.open(url, '_blank');
}
