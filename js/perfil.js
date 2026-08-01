import { supabase } from './supabase-config.js';
import { sairDaConta } from './auth.js';
import { urlPublicaMidia, enviarMidiaPublica, removerMidiaPublica } from './midia.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const avatarPerfil = document.getElementById('avatarPerfil');
    const avatarIniciais = document.getElementById('avatarIniciais');
    const btnAlterarFoto = document.getElementById('btnAlterarFoto');
    const btnRemoverFoto = document.getElementById('btnRemoverFoto');
    const inputFotoPerfil = document.getElementById('inputFotoPerfil');

    // Dados do usuário
    const nome = user.user_metadata?.nome_completo || 'Usuário';
    document.getElementById('nomePerfil').textContent = nome;
    document.getElementById('emailPerfil').textContent = user.email;
    document.getElementById('editarNome').value = nome;
    avatarIniciais.textContent = nome.trim().charAt(0).toUpperCase() || '?';

    // Dados de nível, XP e foto (colunas corretas da tabela: xp_total / nivel_atual / foto_url)
    let { data: perfil } = await supabase
        .from('perfil')
        .select('nivel_atual, xp_total, foto_url, nome_completo')
        .eq('usuario_id', user.id)
        .maybeSingle();

    // Segurança extra: se por algum motivo o perfil ainda não existir, cria um agora
    if (!perfil) {
        const { data: novoPerfil } = await supabase
            .from('perfil')
            .insert({ usuario_id: user.id, nome_completo: nome, xp_total: 0, nivel_atual: 1 })
            .select()
            .single();
        perfil = novoPerfil;
    }

    function renderizarAvatar() {
        if (perfil?.foto_url) {
            avatarPerfil.innerHTML = `<img src="${urlPublicaMidia(perfil.foto_url)}" alt="Foto de perfil">`;
            btnRemoverFoto.hidden = false;
        } else {
            avatarPerfil.innerHTML = `<span id="avatarIniciais">${nome.trim().charAt(0).toUpperCase() || '?'}</span>`;
            btnRemoverFoto.hidden = true;
        }
    }

    if (perfil) {
        document.getElementById('nivelPerfil').textContent = `Nível ${perfil.nivel_atual}`;
        document.getElementById('xpPerfil').textContent = `${perfil.xp_total} XP acumulado`;
        renderizarAvatar();
    }

    // ==================================================
    // FOTO DE PERFIL
    // ==================================================
    btnAlterarFoto.addEventListener('click', () => inputFotoPerfil.click());

    inputFotoPerfil.addEventListener('change', async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        btnAlterarFoto.disabled = true;
        btnAlterarFoto.textContent = 'Enviando...';

        const caminhoAntigo = perfil?.foto_url || null;
        const novoCaminho = `${user.id}/avatar/${Date.now()}_${arquivo.name}`;

        const { error: erroUpload } = await enviarMidiaPublica(novoCaminho, arquivo);
        if (erroUpload) {
            alert('Erro ao enviar a foto: ' + erroUpload.message);
            btnAlterarFoto.disabled = false;
            btnAlterarFoto.textContent = '📷 Alterar foto';
            return;
        }

        const { data: linhaAtualizada, error: erroUpdate } = await supabase
            .from('perfil')
            .update({ foto_url: novoCaminho })
            .eq('usuario_id', user.id)
            .select()
            .maybeSingle();

        if (!linhaAtualizada && !erroUpdate) {
            // Não havia linha de perfil ainda — cria agora
            await supabase.from('perfil').insert({
                usuario_id: user.id, nome_completo: nome, foto_url: novoCaminho, xp_total: 0, nivel_atual: 1
            });
        }

        if (caminhoAntigo) await removerMidiaPublica(caminhoAntigo);

        perfil = { ...perfil, foto_url: novoCaminho };
        renderizarAvatar();
        inputFotoPerfil.value = '';
        btnAlterarFoto.disabled = false;
        btnAlterarFoto.textContent = '📷 Alterar foto';
    });

    // ==================================================
    // REMOVER FOTO DE PERFIL
    // ==================================================
    btnRemoverFoto.addEventListener('click', async () => {
        if (!perfil?.foto_url) return;
        if (!confirm('Remover sua foto de perfil? Você poderá anexar outra depois.')) return;

        btnRemoverFoto.disabled = true;
        btnRemoverFoto.textContent = 'Removendo...';

        const caminhoAntigo = perfil.foto_url;

        const { error: erroUpdate } = await supabase
            .from('perfil')
            .update({ foto_url: null })
            .eq('usuario_id', user.id);

        if (erroUpdate) {
            alert('Erro ao remover a foto: ' + erroUpdate.message);
            btnRemoverFoto.disabled = false;
            btnRemoverFoto.textContent = '🗑️ Remover foto';
            return;
        }

        await removerMidiaPublica(caminhoAntigo);

        perfil = { ...perfil, foto_url: null };
        renderizarAvatar();
        btnRemoverFoto.disabled = false;
        btnRemoverFoto.textContent = '🗑️ Remover foto';
    });

    // Salvar alterações (nome)
    document.getElementById('formPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoNome = document.getElementById('editarNome').value.trim();

        await supabase.auth.updateUser({
            data: { nome_completo: novoNome }
        });
        await supabase.from('perfil').update({ nome_completo: novoNome }).eq('usuario_id', user.id);

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
• Nível atual: ${perfil?.nivel_atual || 1}
• Total de XP: ${perfil?.xp_total || 0}
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