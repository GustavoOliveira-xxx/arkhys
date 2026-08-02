// ==================================================
// UTILITÁRIOS DE MÍDIA — compartilhado entre páginas
// Centraliza a lógica de ícones por tipo de arquivo e
// geração de URLs (públicas e assinadas), para manter
// o mesmo padrão visual em toda a aplicação.
// ==================================================
import { supabase } from './supabase-config.js';

// Extensões tratadas como imagem
const EXTENSOES_IMAGEM = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

export function extensaoDoArquivo(nomeArquivo = '') {
    return nomeArquivo.split('.').pop().toLowerCase();
}

// O Supabase Storage rejeita chaves com acentos, espaços e vários
// caracteres especiais ("Invalid key"). Esta função normaliza o nome
// original do arquivo para algo seguro como chave, mantendo a extensão
// e um nome ainda reconhecível (o nome "de verdade" fica salvo à parte,
// em anexo_nome/nome_arquivo, então a exibição pro usuário não muda).
export function nomeArquivoSeguro(nomeOriginal = 'arquivo') {
    const partes = nomeOriginal.split('.');
    const extensao = partes.length > 1 ? partes.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const base = partes.join('.')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')  // qualquer coisa que não seja letra/número vira "-"
        .replace(/^-+|-+$/g, '')      // sem "-" sobrando nas pontas
        .slice(0, 60) || 'arquivo';

    return extensao ? `${base}.${extensao}` : base;
}

export function ehImagem(nomeArquivo = '', tipoMime = '') {
    if (tipoMime) return tipoMime.startsWith('image/');
    return EXTENSOES_IMAGEM.includes(extensaoDoArquivo(nomeArquivo));
}

// Emoji representativo do tipo de arquivo, usado como ícone quando
// não é possível (ou não faz sentido) mostrar uma miniatura da imagem
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

// Rótulo curto do tipo de mídia (para textos como "Foto anexada")
export function rotuloPorTipo(nomeArquivo = '', tipoMime = '') {
    if (ehImagem(nomeArquivo, tipoMime)) return 'Foto';
    const ext = extensaoDoArquivo(nomeArquivo);
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Documento';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Planilha';
    if (['ppt', 'pptx'].includes(ext)) return 'Apresentação';
    return 'Arquivo';
}

// Retorna a nome de exibição de um caminho de storage, removendo o
// prefixo "timestamp_" usado para evitar colisão de nomes
export function nomeExibicao(caminhoOuNome = '') {
    return caminhoOuNome.split('/').pop().replace(/^[0-9]+_/, '');
}

// --- Bucket público (avatar de perfil e ícone de matéria) ---
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

// --- Bucket privado (anexos/documentos do cofre) ---
// Gera URLs assinadas (temporárias) em lote — muito mais eficiente do
// que uma chamada por item ao renderizar uma lista de tarefas/arquivos.
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