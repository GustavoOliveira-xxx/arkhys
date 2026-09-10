import { ConsultaDemo } from './consulta-demo.js';
import { CONTA_DEMO } from './dados-demo.js';
import {
    iniciarArmazem, aguardarArquivos, tabela, proximoId, salvar, contas, adicionarConta,
    sessao, definirSessao, guardarArquivo, apagarArquivo, urlDoArquivo,
    guardarMidiaPublica, urlPublica, removerMidia
} from './armazem-demo.js';

const BUCKET_PUBLICO = 'midia-publica';

function gerarUuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, letra => {
        const numero = Math.random() * 16 | 0;
        const valor = letra === 'x' ? numero : (numero & 0x3 | 0x8);
        return valor.toString(16);
    });
}

function contaPorId(id) {
    return contas().find(conta => conta.id === id) || null;
}

function usuarioDaConta(conta) {
    if (!conta) return null;
    return {
        id: conta.id,
        email: conta.email,
        user_metadata: { ...conta.metadados },
        app_metadata: { provider: 'demo' },
        created_at: conta.criado_em
    };
}

function usuarioAtual() {
    const atual = sessao();
    return atual ? usuarioDaConta(contaPorId(atual.usuario_id)) : null;
}

function sessaoAtual() {
    const usuario = usuarioAtual();
    if (!usuario) return null;
    return { access_token: 'demo', token_type: 'bearer', user: usuario };
}

function nivelPorXp(xpTotal) {
    const niveis = [...tabela('niveis_xp')].sort((a, b) => a.xp_minimo - b.xp_minimo);
    const alcancado = [...niveis].reverse().find(nivel => xpTotal >= nivel.xp_minimo);
    return alcancado ? alcancado.nivel : 1;
}

function criarPerfilInicial(conta) {
    const linha = {
        id: proximoId('perfil'),
        usuario_id: conta.id,
        nome_completo: conta.metadados?.nome_completo || 'Estudante',
        xp_total: 0,
        nivel_atual: 1,
        foto_url: null,
        created_at: new Date().toISOString()
    };
    tabela('perfil').push(linha);
    salvar();
}

export async function entrarComoConvidado() {
    iniciarArmazem();
    await aguardarArquivos();
    definirSessao({ usuario_id: CONTA_DEMO.id });
}

function autenticacao() {
    return {
        async getUser() {
            return { data: { user: usuarioAtual() }, error: null };
        },

        async getSession() {
            return { data: { session: sessaoAtual() }, error: null };
        },

        async signInWithPassword({ email, password }) {
            const procurado = String(email || '').trim().toLowerCase();
            const conta = contas().find(item => item.email.toLowerCase() === procurado);

            if (!conta || conta.senha !== password) {
                return {
                    data: { user: null, session: null },
                    error: { message: 'Modo demonstração: use o botão "Explorar demonstração" ou crie uma conta local em "Crie uma agora".' }
                };
            }

            definirSessao({ usuario_id: conta.id });
            return { data: { user: usuarioDaConta(conta), session: sessaoAtual() }, error: null };
        },

        async signUp({ email, password, options = {} }) {
            const procurado = String(email || '').trim().toLowerCase();

            if (contas().some(item => item.email.toLowerCase() === procurado)) {
                return { data: { user: null, session: null }, error: { message: 'Já existe uma conta local com esse e-mail nesta demonstração.' } };
            }

            const conta = {
                id: gerarUuid(),
                email: String(email || '').trim(),
                senha: password,
                metadados: { ...(options.data || {}) },
                criado_em: new Date().toISOString()
            };

            adicionarConta(conta);
            criarPerfilInicial(conta);

            return { data: { user: usuarioDaConta(conta), session: null }, error: null };
        },

        async signOut() {
            definirSessao(null);
            return { error: null };
        },

        async updateUser({ data = {} } = {}) {
            const atual = sessao();
            const conta = atual ? contaPorId(atual.usuario_id) : null;
            if (!conta) return { data: { user: null }, error: { message: 'Nenhuma sessão ativa.' } };

            conta.metadados = { ...conta.metadados, ...data };
            salvar();
            return { data: { user: usuarioDaConta(conta) }, error: null };
        }
    };
}

function balde(nome) {
    const ehPublico = nome === BUCKET_PUBLICO;

    return {
        async upload(caminho, arquivo) {
            await aguardarArquivos();

            if (ehPublico) {
                const erro = await guardarMidiaPublica(caminho, arquivo);
                return { data: erro ? null : { path: caminho }, error: erro };
            }

            await guardarArquivo(caminho, arquivo);
            return { data: { path: caminho }, error: null };
        },

        async remove(caminhos = []) {
            await aguardarArquivos();

            for (const caminho of caminhos) {
                if (ehPublico) removerMidia(caminho);
                else await apagarArquivo(caminho);
            }
            return { data: caminhos.map(caminho => ({ name: caminho })), error: null };
        },

        async createSignedUrl(caminho) {
            await aguardarArquivos();

            const url = ehPublico ? urlPublica(caminho) : await urlDoArquivo(caminho);
            if (!url) return { data: null, error: { message: 'Arquivo não encontrado nesta demonstração.' } };
            return { data: { signedUrl: url, path: caminho }, error: null };
        },

        async createSignedUrls(caminhos = []) {
            await aguardarArquivos();

            const itens = [];
            for (const caminho of caminhos) {
                const url = ehPublico ? urlPublica(caminho) : await urlDoArquivo(caminho);
                itens.push({ path: caminho, signedUrl: url || null, error: url ? null : 'Arquivo não encontrado.' });
            }
            return { data: itens, error: null };
        },

        getPublicUrl(caminho) {
            return { data: { publicUrl: (ehPublico ? urlPublica(caminho) : null) || '' } };
        }
    };
}

async function concederXp({ p_motivo, p_referencia, p_quantidade }) {
    const usuario = usuarioAtual();
    if (!usuario) return { data: null, error: { message: 'Nenhuma sessão ativa.' } };

    const eventos = tabela('eventos_xp');
    const repetido = eventos.some(evento =>
        evento.usuario_id === usuario.id &&
        evento.motivo === p_motivo &&
        String(evento.referencia) === String(p_referencia)
    );

    const perfil = tabela('perfil').find(item => item.usuario_id === usuario.id);

    if (repetido || !perfil) {
        return { data: { concedido: false, xp_total: perfil?.xp_total ?? 0, nivel_atual: perfil?.nivel_atual ?? 1 }, error: null };
    }

    eventos.push({
        id: proximoId('eventos_xp'),
        usuario_id: usuario.id,
        motivo: p_motivo,
        referencia: String(p_referencia),
        quantidade: p_quantidade,
        created_at: new Date().toISOString()
    });

    perfil.xp_total = (perfil.xp_total || 0) + Number(p_quantidade || 0);
    perfil.nivel_atual = nivelPorXp(perfil.xp_total);

    salvar({ alterado: p_motivo !== 'login_diario' });

    return { data: { concedido: true, xp_total: perfil.xp_total, nivel_atual: perfil.nivel_atual }, error: null };
}

export function criarClienteDemo() {
    iniciarArmazem();

    return {
        from(nomeTabela) {
            return new ConsultaDemo(nomeTabela);
        },

        auth: autenticacao(),

        storage: {
            from(nome) {
                return balde(nome);
            }
        },

        async rpc(nome, parametros = {}) {
            if (nome === 'conceder_xp') return concederXp(parametros);
            return { data: null, error: { message: `Função "${nome}" não existe no modo demonstração.` } };
        }
    };
}
