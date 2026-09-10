function paraBytesLatin1(texto) {
    const bytes = new Uint8Array(texto.length);
    for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i) & 0xff;
    return bytes;
}

const TROCAS_WINANSI = { '\u2014': '-', '\u2013': '-', '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"', '\u2026': '...', '\u2022': '-' };

// O PDF é gravado em WinAnsi (um byte por caractere), então o texto precisa caber em Latin-1.
function paraWinAnsi(texto = '') {
    return String(texto)
        .split('')
        .map(letra => TROCAS_WINANSI[letra] ?? (letra.charCodeAt(0) > 255 ? '' : letra))
        .join('');
}

function escaparPdf(texto = '') {
    return paraWinAnsi(texto).replace(/([\\()])/g, '\\$1');
}

export function montarPdf(titulo, paragrafos = []) {
    const comandos = [`BT /F1 19 Tf 56 772 Td (${escaparPdf(titulo)}) Tj ET`];
    comandos.push('0.55 w 56 758 m 539 758 l S');

    let altura = 730;
    paragrafos.forEach(paragrafo => {
        const vazio = !paragrafo;
        if (!vazio) comandos.push(`BT /F1 11 Tf 56 ${altura} Td (${escaparPdf(paragrafo)}) Tj ET`);
        altura -= vazio ? 10 : 19;
    });
    comandos.push('BT /F1 8 Tf 56 60 Td (Documento de demonstração gerado pelo Arkhys) Tj ET');

    const fluxo = comandos.join('\n');
    const objetos = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    ];

    let corpo = '%PDF-1.4\n';
    const posicoes = [];

    objetos.forEach((objeto, indice) => {
        posicoes.push(corpo.length);
        corpo += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const inicioXref = corpo.length;
    corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    posicoes.forEach(posicao => { corpo += `${String(posicao).padStart(10, '0')} 00000 n \n`; });
    corpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

    return new Blob([paraBytesLatin1(corpo)], { type: 'application/pdf' });
}

export function montarTexto(conteudo, tipo = 'text/plain') {
    return new Blob([conteudo], { type: `${tipo};charset=utf-8` });
}

function montarSvg(interno, largura = 512, altura = 512) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}">${interno}</svg>`;
}

function svgParaDataUrl(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function montarSvgBlob(svg) {
    return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

export function iconeMateria(letra, corInicial, corFinal) {
    const svg = montarSvg(`
        <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="${corInicial}"/>
                <stop offset="1" stop-color="${corFinal}"/>
            </linearGradient>
        </defs>
        <rect width="512" height="512" rx="132" fill="url(#g)"/>
        <text x="256" y="256" font-family="Georgia, 'Times New Roman', serif" font-size="268" font-weight="700"
              fill="#ffffff" fill-opacity="0.94" text-anchor="middle" dominant-baseline="central">${letra}</text>
    `);
    return svgParaDataUrl(svg);
}

export function avatarMonograma(letra) {
    const svg = montarSvg(`
        <defs>
            <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#3c2f66"/>
                <stop offset="1" stop-color="#0e0b18"/>
            </linearGradient>
        </defs>
        <rect width="512" height="512" fill="url(#a)"/>
        <circle cx="256" cy="256" r="196" fill="none" stroke="#c9a227" stroke-width="6" stroke-opacity="0.7"/>
        <text x="256" y="264" font-family="Georgia, 'Times New Roman', serif" font-size="212" font-weight="700"
              fill="#e9dfc4" text-anchor="middle" dominant-baseline="central">${letra}</text>
    `);
    return svgParaDataUrl(svg);
}

export function diagramaEntidadeRelacionamento() {
    const caixa = (x, y, titulo, linhas) => `
        <rect x="${x}" y="${y}" width="230" height="${44 + linhas.length * 24}" rx="14" fill="#151024" stroke="#c9a227" stroke-width="2"/>
        <text x="${x + 16}" y="${y + 29}" font-family="Georgia, serif" font-size="19" fill="#e9dfc4">${titulo}</text>
        <line x1="${x}" y1="${y + 42}" x2="${x + 230}" y2="${y + 42}" stroke="#c9a227" stroke-opacity="0.5" stroke-width="1.5"/>
        ${linhas.map((linha, i) => `<text x="${x + 16}" y="${y + 68 + i * 24}" font-family="monospace" font-size="15" fill="#b9b0cf">${linha}</text>`).join('')}
    `;

    return montarSvg(`
        <rect width="820" height="520" fill="#0b0812"/>
        <text x="410" y="48" font-family="Georgia, serif" font-size="26" fill="#e9dfc4" text-anchor="middle">Modelo relacional — matrícula</text>
        ${caixa(60, 96, 'aluno', ['id PK', 'nome', 'matricula UK'])}
        ${caixa(530, 96, 'curso', ['id PK', 'nome', 'carga_horaria'])}
        ${caixa(295, 330, 'matricula', ['id PK', 'aluno_id FK', 'curso_id FK', 'semestre'])}
        <path d="M175 212 L175 330 L295 372" fill="none" stroke="#c9a227" stroke-width="2"/>
        <path d="M645 212 L645 330 L525 372" fill="none" stroke="#c9a227" stroke-width="2"/>
        <text x="196" y="300" font-family="monospace" font-size="14" fill="#8f86a8">1..N</text>
        <text x="576" y="300" font-family="monospace" font-size="14" fill="#8f86a8">1..N</text>
    `, 820, 520);
}
