import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos
    const lista = document.getElementById('listaTarefas');
    const filtroStatus = document.getElementById('filtroStatus');
    const filtroMateria = document.getElementById('filtroMateria');
    const btnNovaTarefa = document.getElementById('btnNovaTarefa');
    const modal = document.getElementById('modalTarefa');
    const fecharModal = document.getElementById('fecharModal');
    const form = document.getElementById('formTarefa');
    const tituloModal = modal.querySelector('h3');
    const selectMateria = document.getElementById('materia');

    let tarefas = [];
    let materias = [];

    // ==================================================
    // CARREGAR MATÉRIAS (para os selects de filtro e modal)
    // ==================================================
    async function carregarMaterias() {
        const { data, error } = await supabase
            .from('materias')
            .select('*')
            .eq('usuario_id', user.id)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao carregar matérias:', error);
            return;
        }

        materias = data || [];
        const opcoes = materias.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

        filtroMateria.innerHTML = `<option value="">Todas as matérias</option>${opcoes}`;
        selectMateria.innerHTML = `<option value="">Selecione...</option>${opcoes}`;
    }

    // ==================================================
    // CARREGAR TAREFAS
    // ==================================================
    async function carregarTarefas() {
        const { data, error } = await supabase
            .from('tarefas')
            .select('*')
            .eq('usuario_id', user.id)
            .order('data_entrega', { ascending: true });

        if (error) {
            console.error('Erro ao carregar tarefas:', error);
            lista.innerHTML = `<div class="item-vazio">Erro ao carregar tarefas 😕</div>`;
            return;
        }

        tarefas = data || [];
        renderizarLista();
    }

    // ==================================================
    // DEFINE A ETIQUETA DE STATUS (usa as classes já existentes no CSS)
    // ==================================================
    function calcularStatus(tarefa) {
        if (tarefa.concluida) return { classe: 'normal', texto: 'Concluída' };

        const hoje = new Date().toISOString().split('T')[0];
        if (tarefa.data_entrega < hoje) return { classe: 'atrasado', texto: 'Atrasada' };
        if (tarefa.data_entrega === hoje) return { classe: 'prazo-hoje', texto: 'Hoje' };
        return { classe: 'proximo', texto: 'Em breve' };
    }

    // ==================================================
    // RENDERIZA A LISTA (aplicando os filtros selecionados)
    // ==================================================
    function renderizarLista() {
        let visiveis = [...tarefas];

        if (filtroStatus.value === 'pendentes') visiveis = visiveis.filter(t => !t.concluida);
        if (filtroStatus.value === 'concluidas') visiveis = visiveis.filter(t => t.concluida);

        if (filtroMateria.value) {
            visiveis = visiveis.filter(t => String(t.materia_id) === filtroMateria.value);
        }

        if (visiveis.length === 0) {
            lista.innerHTML = `<div class="item-vazio">Nenhuma tarefa encontrada 📋</div>`;
            return;
        }

        lista.innerHTML = visiveis.map(t => {
            const materiaNome = materias.find(m => m.id === t.materia_id)?.nome;
            const st = calcularStatus(t);
            const dataFormatada = new Date(t.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR');
            const horario = t.hora_entrega ? ` às ${t.hora_entrega.slice(0, 5)}` : '';

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                    <div class="item-icone">📝</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${materiaNome ? materiaNome + ' • ' : ''}${dataFormatada}${horario}</p>
                    </div>
                    <span class="status ${st.classe}">${st.texto}</span>
                    <div class="item-acoes">
                        <button class="btn-acao concluir" title="${t.concluida ? 'Reabrir' : 'Concluir'}">${t.concluida ? '↺' : '✓'}</button>
                        <button class="btn-acao editar" title="Editar">✏️</button>
                        <button class="btn-acao excluir" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Filtros
    filtroStatus.addEventListener('change', renderizarLista);
    filtroMateria.addEventListener('change', renderizarLista);

    // ==================================================
    // MODAL — ABRIR (NOVA TAREFA)
    // ==================================================
    btnNovaTarefa.addEventListener('click', () => {
        form.reset();
        document.getElementById('idTarefa').value = '';
        tituloModal.textContent = 'Nova Tarefa';
        modal.hidden = false;
    });

    // MODAL — FECHAR
    fecharModal.addEventListener('click', () => modal.hidden = true);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
    });

    // ==================================================
    // AÇÕES NA LISTA (concluir / editar / excluir)
    // ==================================================
    lista.addEventListener('click', async (e) => {
        const item = e.target.closest('.item-tarefa');
        if (!item) return;

        const id = item.dataset.id;
        const tarefa = tarefas.find(t => String(t.id) === id);
        if (!tarefa) return;

        // Marcar como concluída / reabrir
        if (e.target.classList.contains('concluir')) {
            const { error } = await supabase
                .from('tarefas')
                .update({ concluida: !tarefa.concluida })
                .eq('id', id);

            if (error) alert('Erro ao atualizar: ' + error.message);
            else carregarTarefas();
        }

        // Editar
        if (e.target.classList.contains('editar')) {
            document.getElementById('idTarefa').value = tarefa.id;
            document.getElementById('titulo').value = tarefa.titulo;
            document.getElementById('descricao').value = tarefa.descricao || '';
            document.getElementById('materia').value = tarefa.materia_id || '';
            document.getElementById('data_entrega').value = tarefa.data_entrega;
            document.getElementById('hora_entrega').value = tarefa.hora_entrega || '';
            document.getElementById('duracao').value = tarefa.duracao || '';
            tituloModal.textContent = 'Editar Tarefa';
            modal.hidden = false;
        }

        // Excluir
        if (e.target.classList.contains('excluir')) {
            if (!confirm('Excluir essa tarefa permanentemente?')) return;

            const { error } = await supabase.from('tarefas').delete().eq('id', id);
            if (error) alert('Erro ao excluir: ' + error.message);
            else carregarTarefas();
        }
    });

    // ==================================================
    // SALVAR (CRIAR OU EDITAR)
    // ==================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('idTarefa').value;
        const dadosTarefa = {
            titulo: document.getElementById('titulo').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            materia_id: document.getElementById('materia').value || null,
            data_entrega: document.getElementById('data_entrega').value,
            hora_entrega: document.getElementById('hora_entrega').value || null,
            duracao: document.getElementById('duracao').value || null,
            usuario_id: user.id
        };

        let error;
        if (id) {
            ({ error } = await supabase.from('tarefas').update(dadosTarefa).eq('id', id));
        } else {
            dadosTarefa.concluida = false;
            ({ error } = await supabase.from('tarefas').insert(dadosTarefa));
        }

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            modal.hidden = true;
            form.reset();
            carregarTarefas();
        }
    });

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================
    await carregarMaterias();
    await carregarTarefas();
});