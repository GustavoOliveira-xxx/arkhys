import { supabase } from './supabase-config.js';

// ==================================================
// FUNÇÕES GERAIS E PROTEÇÃO DE ROTAS
// ==================================================

// Verifica se o usuário já está logado — se sim, manda direto para o painel
async function verificarSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}

// Roda automaticamente nas páginas de login/cadastro
if (document.body.classList.contains('tela-acesso')) {
    verificarSessao();
}

// ==================================================
// CADASTRO DE NOVO USUÁRIO
// ==================================================
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;

        // Validações simples
        if (senha !== confirmaSenha) {
            alert('⚠️ As senhas não coincidem!');
            return;
        }
        if (senha.length < 6) {
            alert('⚠️ A senha precisa ter pelo menos 6 caracteres!');
            return;
        }

        // Cadastra no Supabase
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    nome_completo: nome
                }
            }
        });

        if (error) {
            alert('❌ Erro ao cadastrar: ' + error.message);
        } else {
            alert('✅ Conta criada com sucesso! Você já pode entrar.');
            window.location.href = 'login.html';
        }
    });
}

// ==================================================
// LOGIN DE USUÁRIO
// ==================================================
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            alert('❌ Erro ao entrar: ' + error.message);
        } else {
            window.location.href = 'index.html';
        }
    });
}

// ==================================================
// FUNÇÃO DE LOGOUT (usaremos no perfil depois)
// ==================================================
export async function sairDaConta() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// ==================================================
// PROTEÇÃO DAS PÁGINAS INTERNAS
// (colocamos no final para rodar em todas as páginas que não são de acesso)
// ==================================================
if (!document.body.classList.contains('tela-acesso')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('🔒 Você precisa estar logado para acessar essa página!');
            window.location.href = 'login.html';
        }
    });
}