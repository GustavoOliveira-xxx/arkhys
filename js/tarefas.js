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

    // Elementos — modalidade / membros
    const selectModalidade = document.getElementById('modalidade');
    const secaoGrupo = document.getElementById('secaoGrupo');
    const qtdeMembros = document.getElementById('qtdeMembros');
    const btnGerarMembros = document.getElementById('btnGerarMembros');
    const listaCamposMembros = document.getElementById('listaCamposMembros');

    // Elementos — ferramentas
    const listaFerramentas = document.getElementById('listaFerramentas');

    // Elementos — anexo
    const inputAnexo = document.getElementById('anexo');
    const anexoAtual = document.getElementById('anexoAtual');

    let tarefas = [];
    let materias = [];
    let membros = [];
    let ferramentas = [];

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
    // CARREGAR MEMBROS (cadastrados em "Cadastros")
    // ==================================================
    async function carregarMembros() {
        const { data, error } = await supabase
            .from('membros')
            .select('*')
            .eq('usuario_id', user.id)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao carregar membros:', error);
            return;
        }

        membros = data || [];
    }

    // ==================================================
    // CARREGAR FERRAMENTAS (cadastradas em "Cadastros")
    // ==================================================
    async function carregarFerramentas() {
        const { data, error } = await supabase
            .from('ferramentas')
            .select('*')
            .eq('usuario_id', user.id)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao carregar ferramentas:', error);
            return;
        }

        ferramentas = data || [];
        renderizarFerramentas();
    }

    // Desenha a lista de checkboxes de ferramentas (marcando as já selecionadas)
    function renderizarFerramentas(selecionadas = []) {
        if (ferramentas.length === 0) {
            listaFerramentas.innerHTML = `<p class="texto-vazio-pequeno">Nenhuma ferramenta cadastrada ainda. Cadastre em "Cadastros".</p>`;
            return;
        }

        listaFerramentas.innerHTML = ferramentas.map(f => `
            <label class="item-ferramenta-checkbox">
                <input type="checkbox" value="${f.id}" ${selecionadas.includes(f.id) ? 'checked' : ''}>
                <span>${f.nome}${f.tipo ? ` <span class="metadado">(${f.tipo})</span>` : ''}</span>
            </label>
        `).join('');
    }

    // Gera N campos de seleção de membro (um select por membro, populado com os cadastrados)
    function gerarCamposMembros(qtde, valoresSelecionados = []) {
        if (membros.length === 0) {
            listaCamposMembros.innerHTML = `<p class="texto-vazio-pequeno">Nenhum membro cadastrado ainda. Cadastre em "Cadastros".</p>`;
            return;
        }

        listaCamposMembros.innerHTML = '';
        const opcoesMembros = membros.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

        for (let i = 0; i < qtde; i++) {
            const select = document.createElement('select');
            select.className = 'campo-entrada campo-membro';
            select.dataset.indice = String(i);
            select.innerHTML = `<option value="">Membro ${i + 1} — selecione...</option>${opcoesMembros}`;
            if (valoresSelecionados[i]) select.value = String(valoresSelecionados[i]);
            listaCamposMembros.appendChild(select);
        }
    }

    // Modalidade — mostra/esconde a seção de grupo
    selectModalidade.addEventListener('change', () => {
        const ehGrupo = selectModalidade.value === 'grupo';
        secaoGrupo.hidden = !ehGrupo;
        if (!ehGrupo) {
            listaCamposMembros.innerHTML = '';
            qtdeMembros.value = '';
        }
    });

    // Botão "Gerar campos" — cria os selects de membro conforme a quantidade digitada
    btnGerarMembros.addEventListener('click', () => {
        const qtde = parseInt(qtdeMembros.value, 10);
        if (!qtde || qtde < 1) {
            alert('Informe uma quantidade válida de membros.');
            return;
        }
        gerarCamposMembros(qtde);
    });

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
            const modalidadeTexto = t.modalidade === 'grupo'
                ? `👥 Grupo (${(t.membros_ids || []).length})`
                : '👤 Individual';

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                    <div class="item-icone">📝</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${materiaNome ? materiaNome + ' • ' : ''}${dataFormatada} • ${modalidadeTexto}</p>
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
        secaoGrupo.hidden = true;
        listaCamposMembros.innerHTML = '';
        renderizarFerramentas();
        anexoAtual.textContent = '';
        anexoAtual.dataset.caminho = '';
        tituloModal.textContent = 'Nova Tarefa';
        modal.hidden = false;
    });

    // MODAL — FECHAR
    fecharModal.addEventListener('click', () => modal.hidden = true);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
    });

    // Abrir o anexo atual (link exibido durante a edição)
    anexoAtual.addEventListener('click', async (e) => {
        if (e.target.id !== 'linkAbrirAnexo') return;
        e.preventDefault();
        const caminho = anexoAtual.dataset.caminho;
        if (!caminho) return;

        const { data, error } = await supabase.storage.from('arquivos').createSignedUrl(caminho, 60 * 30);
        if (error) {
            alert('Erro ao abrir anexo: ' + error.message);
            return;
        }
        window.open(data.signedUrl, '_blank');
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

            // Modalidade + membros
            const modalidade = tarefa.modalidade || 'individual';
            selectModalidade.value = modalidade;
            const ehGrupo = modalidade === 'grupo';
            secaoGrupo.hidden = !ehGrupo;
            const membrosSalvos = tarefa.membros_ids || [];
            if (ehGrupo) {
                qtdeMembros.value = membrosSalvos.length || 1;
                gerarCamposMembros(membrosSalvos.length || 1, membrosSalvos);
            } else {
                listaCamposMembros.innerHTML = '';
                qtdeMembros.value = '';
            }

            // Ferramentas
            renderizarFerramentas(tarefa.ferramentas_ids || []);

            // Anexo
            if (tarefa.anexo_path) {
                const nomeArquivo = tarefa.anexo_path.split('/').pop().replace(/^[0-9]+_/, '');
                anexoAtual.innerHTML = `📎 Anexo atual: ${nomeArquivo} — <a href="#" id="linkAbrirAnexo">abrir</a>`;
                anexoAtual.dataset.caminho = tarefa.anexo_path;
            } else {
                anexoAtual.innerHTML = '';
                anexoAtual.dataset.caminho = '';
            }

            tituloModal.textContent = 'Editar Tarefa';
            modal.hidden = false;
        }

        // Excluir
        if (e.target.classList.contains('excluir')) {
            if (!confirm('Excluir essa tarefa permanentemente?')) return;

            if (tarefa.anexo_path) {
                await supabase.storage.from('arquivos').remove([tarefa.anexo_path]);
            }

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
        const modalidade = selectModalidade.value;

        // Coleta os membros selecionados (só quando for em grupo)
        let membrosIds = [];
        if (modalidade === 'grupo') {
            membrosIds = Array.from(listaCamposMembros.querySelectorAll('.campo-membro'))
                .map(select => select.value)
                .filter(Boolean)
                .map(Number);

            if (membrosIds.length === 0) {
                alert('Selecione ao menos um membro (clique em "Gerar campos" e escolha os nomes).');
                return;
            }
        }

        // Coleta as ferramentas marcadas
        const ferramentasIds = Array.from(listaFerramentas.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => Number(cb.value));

        // Anexo — mantém o já existente, ou envia um novo se foi escolhido
        let anexoPath = anexoAtual.dataset.caminho || null;
        const arquivoSelecionado = inputAnexo.files[0];

        if (arquivoSelecionado) {
            const caminho = `${user.id}/tarefas/${Date.now()}_${arquivoSelecionado.name}`;
            const { error: erroUpload } = await supabase.storage
                .from('arquivos')
                .upload(caminho, arquivoSelecionado);

            if (erroUpload) {
                alert('Erro ao enviar o anexo: ' + erroUpload.message);
                return;
            }
            anexoPath = caminho;
        }

        const dadosTarefa = {
            titulo: document.getElementById('titulo').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            materia_id: document.getElementById('materia').value || null,
            data_entrega: document.getElementById('data_entrega').value,
            modalidade,
            membros_ids: membrosIds,
            ferramentas_ids: ferramentasIds,
            anexo_path: anexoPath,
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
            secaoGrupo.hidden = true;
            listaCamposMembros.innerHTML = '';
            anexoAtual.textContent = '';
            anexoAtual.dataset.caminho = '';
            carregarTarefas();
        }
    });

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================
    await carregarMaterias();
    await carregarMembros();
    await carregarFerramentas();
    await carregarTarefas();
});
