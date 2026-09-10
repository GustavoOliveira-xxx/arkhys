import { supabase, aoCarregar } from './supabase-config.js';
import { MODO_DEMO, ligarModoDemo } from './demo/modo-demo.js';

async function verificarSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}

if (document.body.classList.contains('tela-acesso')) {
    verificarSessao();
}

const btnDemo = document.getElementById('btnDemo');
if (btnDemo) {
    btnDemo.addEventListener('click', async () => {
        btnDemo.disabled = true;
        btnDemo.textContent = 'Preparando demonstração...';

        ligarModoDemo();
        const { entrarComoConvidado } = await import('./demo/cliente-demo.js');
        await entrarComoConvidado();

        window.location.href = 'index.html';
    });
}

const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;

        if (senha !== confirmaSenha) {
            alert('⚠️ As senhas não coincidem!');
            return;
        }
        if (senha.length < 6) {
            alert('⚠️ A senha precisa ter pelo menos 6 caracteres!');
            return;
        }

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

export async function sairDaConta() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

if (!document.body.classList.contains('tela-acesso')) {
    aoCarregar(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            if (!MODO_DEMO) alert('🔒 Você precisa estar logado para acessar essa página!');
            window.location.href = 'login.html';
        }
    });
}
