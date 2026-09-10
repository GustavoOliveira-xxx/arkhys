import { tabela, proximoId, salvar } from './armazem-demo.js';

const ATRASO_SIMULADO = 14;

function esperar(ms) {
    return new Promise(resolver => setTimeout(resolver, ms));
}

function clonar(valor) {
    if (valor === null || valor === undefined) return valor;
    if (typeof valor !== 'object') return valor;
    return JSON.parse(JSON.stringify(valor));
}

function ehColunaNumerica(coluna) {
    return coluna === 'id' || coluna.endsWith('_id');
}

function normalizar(coluna, valor) {
    if (ehColunaNumerica(coluna) && typeof valor === 'string' && /^\d+$/.test(valor)) return Number(valor);
    return valor;
}

function normalizarLinha(valores) {
    const saida = {};
    Object.entries(valores).forEach(([coluna, valor]) => {
        if (valor === undefined) return;
        saida[coluna] = normalizar(coluna, valor);
    });
    return saida;
}

function vazio(valor) {
    return valor === null || valor === undefined;
}

function saoIguais(a, b) {
    if (a === b) return true;
    if (vazio(a) || vazio(b)) return vazio(a) && vazio(b);
    if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
    return String(a) === String(b);
}

function comparavel(valor) {
    if (vazio(valor)) return null;
    if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
    const numero = Number(valor);
    return Number.isNaN(numero) ? String(valor) : (String(valor).trim() === '' ? String(valor) : numero);
}

function interpretarLiteral(bruto = '') {
    const texto = bruto.trim();
    if (texto === 'null') return null;
    if (texto === 'true') return true;
    if (texto === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(texto)) return Number(texto);
    return texto.replace(/^"(.*)"$/, '$1');
}

function separarNoTopo(texto, separador) {
    const partes = [];
    let atual = '';
    let profundidade = 0;

    for (const letra of texto) {
        if (letra === '(') profundidade += 1;
        if (letra === ')') profundidade -= 1;
        if (letra === separador && profundidade === 0) {
            partes.push(atual);
            atual = '';
            continue;
        }
        atual += letra;
    }
    partes.push(atual);
    return partes.map(parte => parte.trim()).filter(Boolean);
}

function condicaoSimples(coluna, operador, valor) {
    const alvo = normalizar(coluna, valor);

    switch (operador) {
        case 'eq': return linha => saoIguais(linha[coluna], alvo);
        case 'neq': return linha => !saoIguais(linha[coluna], alvo);
        case 'is': return linha => (vazio(alvo) ? vazio(linha[coluna]) : linha[coluna] === alvo);
        case 'gt': return linha => !vazio(linha[coluna]) && comparavel(linha[coluna]) > comparavel(alvo);
        case 'gte': return linha => !vazio(linha[coluna]) && comparavel(linha[coluna]) >= comparavel(alvo);
        case 'lt': return linha => !vazio(linha[coluna]) && comparavel(linha[coluna]) < comparavel(alvo);
        case 'lte': return linha => !vazio(linha[coluna]) && comparavel(linha[coluna]) <= comparavel(alvo);
        case 'in': {
            const lista = Array.isArray(alvo) ? alvo : String(alvo).replace(/^\(|\)$/g, '').split(',').map(interpretarLiteral);
            return linha => lista.some(item => saoIguais(linha[coluna], normalizar(coluna, item)));
        }
        case 'cs': {
            const lista = Array.isArray(alvo) ? alvo : [alvo];
            return linha => Array.isArray(linha[coluna]) && lista.every(item => linha[coluna].some(atual => saoIguais(atual, item)));
        }
        default: return () => true;
    }
}

function condicaoDeTexto(texto) {
    const partes = texto.split('.');
    const coluna = partes.shift();
    const operador = partes.shift();
    return condicaoSimples(coluna, operador, interpretarLiteral(partes.join('.')));
}

function projetar(linha, colunas) {
    if (!colunas || colunas.trim() === '*') return clonar(linha);

    const saida = {};

    separarNoTopo(colunas, ',').forEach(parte => {
        if (parte === '*') {
            Object.assign(saida, clonar(linha));
            return;
        }

        const incorporado = parte.match(/^(\w+)\s*:\s*(\w+)\s*\(([\s\S]*)\)$/);
        if (incorporado) {
            const [, alvo, chaveEstrangeira, internas] = incorporado;
            const referencia = linha[chaveEstrangeira];
            const relacionada = vazio(referencia)
                ? null
                : tabela(alvo).find(item => saoIguais(item.id, referencia));
            saida[alvo] = relacionada ? projetar(relacionada, internas.trim() || '*') : null;
            return;
        }

        const apelidada = parte.match(/^(\w+)\s*:\s*(\w+)$/);
        if (apelidada) {
            saida[apelidada[1]] = clonar(linha[apelidada[2]]);
            return;
        }

        saida[parte] = clonar(linha[parte]);
    });

    return saida;
}

function ordenar(linhas, ordens) {
    if (!ordens.length) return linhas;

    return [...linhas].sort((a, b) => {
        for (const { coluna, ascendente, nulosPrimeiro } of ordens) {
            const valorA = a[coluna];
            const valorB = b[coluna];

            if (vazio(valorA) && vazio(valorB)) continue;
            if (vazio(valorA)) return nulosPrimeiro ? -1 : 1;
            if (vazio(valorB)) return nulosPrimeiro ? 1 : -1;

            const compA = comparavel(valorA);
            const compB = comparavel(valorB);
            if (compA === compB) continue;
            return (compA > compB ? 1 : -1) * (ascendente ? 1 : -1);
        }
        return 0;
    });
}

export class ConsultaDemo {
    constructor(nomeTabela) {
        this.nomeTabela = nomeTabela;
        this.acao = 'select';
        this.colunas = '*';
        this.filtros = [];
        this.ordens = [];
        this.limite = null;
        this.tipoUnico = null;
        this.contagem = null;
        this.somenteCabecalho = false;
        this.retornarRepresentacao = false;
        this.valores = null;
        this.opcoesUpsert = null;
    }

    select(colunas = '*', opcoes = {}) {
        if (this.acao !== 'select') this.retornarRepresentacao = true;
        this.colunas = colunas || '*';
        if (opcoes.count) this.contagem = opcoes.count;
        if (opcoes.head) this.somenteCabecalho = true;
        return this;
    }

    insert(valores) {
        this.acao = 'insert';
        this.valores = valores;
        return this;
    }

    update(valores) {
        this.acao = 'update';
        this.valores = valores;
        return this;
    }

    upsert(valores, opcoes = {}) {
        this.acao = 'upsert';
        this.valores = valores;
        this.opcoesUpsert = opcoes;
        return this;
    }

    delete() {
        this.acao = 'delete';
        return this;
    }

    eq(coluna, valor) { return this.adicionar(coluna, 'eq', valor); }
    neq(coluna, valor) { return this.adicionar(coluna, 'neq', valor); }
    gt(coluna, valor) { return this.adicionar(coluna, 'gt', valor); }
    gte(coluna, valor) { return this.adicionar(coluna, 'gte', valor); }
    lt(coluna, valor) { return this.adicionar(coluna, 'lt', valor); }
    lte(coluna, valor) { return this.adicionar(coluna, 'lte', valor); }
    is(coluna, valor) { return this.adicionar(coluna, 'is', valor); }
    in(coluna, lista) { return this.adicionar(coluna, 'in', lista); }
    contains(coluna, valor) { return this.adicionar(coluna, 'cs', valor); }

    or(expressao) {
        const condicoes = separarNoTopo(expressao, ',').map(condicaoDeTexto);
        this.filtros.push(linha => condicoes.some(condicao => condicao(linha)));
        return this;
    }

    adicionar(coluna, operador, valor) {
        this.filtros.push(condicaoSimples(coluna, operador, valor));
        return this;
    }

    order(coluna, { ascending = true, nullsFirst = false } = {}) {
        this.ordens.push({ coluna, ascendente: ascending, nulosPrimeiro: nullsFirst });
        return this;
    }

    limit(quantidade) {
        this.limite = quantidade;
        return this;
    }

    single() {
        this.tipoUnico = 'unica';
        return this;
    }

    maybeSingle() {
        this.tipoUnico = 'talvez';
        return this;
    }

    then(aoResolver, aoRejeitar) {
        return this.executar().then(aoResolver, aoRejeitar);
    }

    catch(aoRejeitar) {
        return this.executar().catch(aoRejeitar);
    }

    finally(aoFinalizar) {
        return this.executar().finally(aoFinalizar);
    }

    filtrar(linhas) {
        return linhas.filter(linha => this.filtros.every(filtro => filtro(linha)));
    }

    criarLinha(valores) {
        const linha = normalizarLinha(valores);
        if (linha.id === undefined || linha.id === null) linha.id = proximoId(this.nomeTabela);
        if (!linha.created_at) linha.created_at = new Date().toISOString();
        return linha;
    }

    responder(linhas, contagem = null) {
        if (this.tipoUnico === 'unica') {
            if (linhas.length !== 1) {
                return {
                    data: null,
                    count: contagem,
                    status: 406,
                    error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
                };
            }
            return { data: linhas[0], count: contagem, error: null, status: 200 };
        }

        if (this.tipoUnico === 'talvez') {
            if (linhas.length > 1) {
                return { data: null, count: contagem, status: 406, error: { code: 'PGRST116', message: 'Mais de uma linha retornada.' } };
            }
            return { data: linhas[0] ?? null, count: contagem, error: null, status: 200 };
        }

        return { data: linhas, count: contagem, error: null, status: 200 };
    }

    async executar() {
        await esperar(ATRASO_SIMULADO);

        try {
            if (this.acao === 'select') return this.selecionar();
            if (this.acao === 'insert') return this.inserir();
            if (this.acao === 'update') return this.atualizar();
            if (this.acao === 'upsert') return this.mesclar();
            if (this.acao === 'delete') return this.remover();
            return this.responder([]);
        } catch (erro) {
            console.error(`[demo] falha na consulta em "${this.nomeTabela}":`, erro);
            return { data: null, count: null, status: 400, error: { message: erro.message || 'Erro na consulta de demonstração.' } };
        }
    }

    selecionar() {
        const encontradas = this.filtrar(tabela(this.nomeTabela));
        const contagem = this.contagem ? encontradas.length : null;

        if (this.somenteCabecalho) return { data: null, count: contagem, error: null, status: 200 };

        let ordenadas = ordenar(encontradas, this.ordens);
        if (this.limite !== null) ordenadas = ordenadas.slice(0, this.limite);

        return this.responder(ordenadas.map(linha => projetar(linha, this.colunas)), contagem);
    }

    inserir() {
        const entrada = Array.isArray(this.valores) ? this.valores : [this.valores];
        const criadas = entrada.map(valor => this.criarLinha(valor));

        tabela(this.nomeTabela).push(...criadas);
        salvar();

        if (!this.retornarRepresentacao) return { data: null, count: null, error: null, status: 201 };
        return this.responder(criadas.map(linha => projetar(linha, this.colunas)), criadas.length);
    }

    atualizar() {
        const alvos = this.filtrar(tabela(this.nomeTabela));
        const mudancas = normalizarLinha(this.valores);

        alvos.forEach(linha => Object.assign(linha, mudancas));
        salvar();

        if (!this.retornarRepresentacao) return { data: null, count: null, error: null, status: 204 };
        return this.responder(alvos.map(linha => projetar(linha, this.colunas)), alvos.length);
    }

    mesclar() {
        const entrada = Array.isArray(this.valores) ? this.valores : [this.valores];
        const chaves = (this.opcoesUpsert?.onConflict || 'id').split(',').map(chave => chave.trim());
        const linhas = tabela(this.nomeTabela);
        const resultado = [];

        entrada.forEach(valor => {
            const mudancas = normalizarLinha(valor);
            const existente = linhas.find(linha => chaves.every(chave => saoIguais(linha[chave], mudancas[chave])));

            if (existente) {
                Object.assign(existente, mudancas);
                resultado.push(existente);
                return;
            }

            const nova = this.criarLinha(valor);
            linhas.push(nova);
            resultado.push(nova);
        });

        salvar();

        if (!this.retornarRepresentacao) return { data: null, count: null, error: null, status: 201 };
        return this.responder(resultado.map(linha => projetar(linha, this.colunas)), resultado.length);
    }

    remover() {
        const linhas = tabela(this.nomeTabela);
        const alvos = this.filtrar(linhas);
        const removidas = alvos.map(linha => clonar(linha));

        alvos.forEach(linha => {
            const indice = linhas.indexOf(linha);
            if (indice >= 0) linhas.splice(indice, 1);
        });
        salvar();

        if (!this.retornarRepresentacao) return { data: null, count: null, error: null, status: 204 };
        return this.responder(removidas.map(linha => projetar(linha, this.colunas)), removidas.length);
    }
}
