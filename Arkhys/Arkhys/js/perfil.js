import { supabase } from './supabase-config.js';
import { sairDaConta } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Dados do usuário
    const nome = user.user_metadata?.nome_completo || 'Usuário';
    document.getElementById('nomePerfil').textContent = nome;
    document.getElementById('emailPerfil').textContent = user.email;
    document.getElementById('editarNome').value = nome;

    // Dados de nível e XP
    const { data: perfil } = await supabase
        .from('perfil')
        .select('nivel, xp')
        .eq('usuario_id', user.id)
        .single();

    if (perfil) {
        document.getElementById('nivelPerfil').textContent = `Nível ${perfil.nivel}`;
        document.getElementById('xpPerfil').textContent = `${perfil.xp} XP acumulado`;
    }

    // Salvar alterações
    document.getElementById('formPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoNome = document.getElementById('editarNome').value.trim();

        await supabase.auth.updateUser({
            data: { nome_completo: novoNome }
        });

        document.getElementById('nomePerfil').textContent = novoNome;
        alert('Dados atualizados com sucesso!');
    });

    // Gerar relatório
    document.getElementById('btnRelatorio').addEventListener('click', async () => {
        const { data: tarefas } = await supabase.from('tarefas').select('*').eq('usuario_id', user.id);
        const concluidas = tarefas.filter(t => t.concluida).length;
        const pendentes = tarefas.filter(t => !t.concluida).length;

        const relatorio = `
RELATÓRIO GERAL — ARKHYS
Usuário: ${nome}
E-mail: ${user.email}

RESUMO:
• Total de tarefas: ${tarefas.length}
• Concluídas: ${concluidas}
• Pendentes: ${pendentes}
• Nível atual: ${perfil?.nivel || 1}
• Total de XP: ${perfil?.xp || 0}
        `.trim();

        const blob = new Blob([relatorio], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `relatorio-arkhys-${nome.replace(/\s/g,'-')}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // Logout
    document.getElementById('btnSair').addEventListener('click', sairDaConta);
});