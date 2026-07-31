import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos gerais
    const botoesCard = document.querySelectorAll('.botao-card');
    const botoesFechar = document.querySelectorAll('.fechar-modal');
    const modais = document.querySelectorAll('[id^="modal"]');

    // Abre modais
    botoesCard.forEach(botao => {
        botao.addEventListener('click', () => {
            const idModal = botao.dataset.modal;
            document.getElementById(idModal).hidden = false;
        });
    });

    // Fecha modais
    botoesFechar.forEach(btn => {
        btn.addEventListener('click', () => {
            modais.forEach(m => m.hidden = true);
        });
    });

    // ==================================================
    // MATÉRIAS
    // ==================================================
    const formMaterias = document.getElementById('formMaterias');
    formMaterias.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = formMaterias.querySelector('input').value.trim();

        const { error } = await supabase.from('materias').insert({
            nome,
            usuario_id: user.id
        });

        if (error) alert('Erro: ' + error.message);
        else {
            alert('Matéria cadastrada!');
            formMaterias.reset();
            document.getElementById('modalMaterias').hidden = true;
        }
    });

    // ==================================================
    // ÓRGÃOS
    // ==================================================
    const formOrgaos = document.getElementById('formOrgaos');
    formOrgaos.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = formOrgaos.querySelectorAll('input')[0].value.trim();
        const descricao = formOrgaos.querySelector('textarea').value.trim();

        const { error } = await supabase.from('orgaos').insert({
            nome,
            descricao,
            usuario_id: user.id
        });

        if (error) alert('Erro: ' + error.message);
        else {
            alert('Órgão cadastrado!');
            formOrgaos.reset();
            document.getElementById('modalOrgaos').hidden = true;
        }
    });

    // ==================================================
    // FERRAMENTAS
    // ==================================================
    const formFerramentas = document.getElementById('formFerramentas');
    formFerramentas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = formFerramentas.querySelectorAll('input')[0].value.trim();
        const tipo = formFerramentas.querySelectorAll('input')[1].value.trim();

        const { error } = await supabase.from('ferramentas').insert({
            nome,
            tipo,
            usuario_id: user.id
        });

        if (error) alert('Erro: ' + error.message);
        else {
            alert('Ferramenta cadastrada!');
            formFerramentas.reset();
            document.getElementById('modalFerramentas').hidden = true;
        }
    });

    // ==================================================
    // MEMBROS
    // ==================================================
    const formMembros = document.getElementById('formMembros');
    formMembros.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = formMembros.querySelectorAll('input')[0].value.trim();
        const funcao = formMembros.querySelectorAll('input')[1].value.trim();

        const { error } = await supabase.from('membros').insert({
            nome,
            funcao,
            usuario_id: user.id
        });

        if (error) alert('Erro: ' + error.message);
        else {
            alert('Membro cadastrado!');
            formMembros.reset();
            document.getElementById('modalMembros').hidden = true;
        }
    });
});