import { supabase } from './supabase-config.js';
import { urlPublicaMidia, iconePorTipo, rotuloPorTipo } from './midia.js';
import { enviarERegistrarArquivo, removerArquivoPorCaminho, listarAnexosDaTarefa, mapaAnexosPorTarefa } from './arquivos-service.js';
import { abrirDetalhesTarefa, fecharDetalhes } from './detalhes-tarefa.js';
import { concederXpDiaPerfeito, concederXpConclusaoTarefa, NOME_DIFICULDADE } from './xp-service.js';
import { mostrarCarregamento, esconderCarregamento } from './loading.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos
    const lista = document.getElementById('listaTarefas');
    const abasTarefas = document.getElementById('abasTarefas');
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

    // Elementos — anexos (múltiplos)
    const inputAnexo = document.getElementById('anexo');
    const listaAnexosForm = document.getElementById('listaAnexosForm');

    let tarefas = [];
    let materias = [];
    let membros = [];
    let ferramentas = [];
    let anexosMap = {};        // { tarefaId: [anexos] } — carregado em lote junto com as tarefas
    let abaAtiva = 'pendentes'; // 'pendentes' | 'concluidas'

    // Estado do formulário de anexos (múltiplos, até salvar)
    let anexosExistentes = [];         // anexos já salvos no banco (ao editar)
    let anexosNovos = [];              // arquivos novos escolhidos/colados, ainda não enviados
    let anexosParaRemover = new Set(); // ids de anexosExistentes marcados pra remoção ao salvar

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
        anexosMap = await mapaAnexosPorTarefa(tarefas.map(t => t.id));
        renderizarLista();
        abrirEdicaoViaLink();
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

    // Ícone do item: usa a foto da matéria (se cadastrada) ou um emoji padrão
    function iconeDoItem(materia) {
        if (materia?.icone_url) {
            const url = urlPublicaMidia(materia.icone_url);
            return `<img src="${url}" alt="${materia.nome}">`;
        }
        return '📝';
    }

    // Pequeno indicativo do(s) anexo(s), junto da linha de detalhes
    function badgeAnexo(tarefa) {
        const anexos = anexosMap[tarefa.id] || [];
        if (anexos.length === 0) return '';
        if (anexos.length === 1) {
            const nome = anexos[0].nome_arquivo;
            return ` • ${iconePorTipo(nome)} ${rotuloPorTipo(nome)}`;
        }
        return ` • 📎 ${anexos.length} anexos`;
    }

    const EMOJI_DIFICULDADE = { facil: '🟢', medio: '🟡', dificil: '🔴' };
    function badgeDificuldade(tarefa) {
        const emoji = EMOJI_DIFICULDADE[tarefa.dificuldade];
        return emoji ? ` • ${emoji} ${NOME_DIFICULDADE[tarefa.dificuldade]}` : '';
    }

    // ==================================================
    // RENDERIZA A LISTA (aplicando os filtros selecionados)
    // ==================================================
    function renderizarLista() {
        let visiveis = [...tarefas];

        visiveis = abaAtiva === 'concluidas'
            ? visiveis.filter(t => t.concluida)
            : visiveis.filter(t => !t.concluida);

        if (filtroMateria.value) {
            visiveis = visiveis.filter(t => String(t.materia_id) === filtroMateria.value);
        }

        if (visiveis.length === 0) {
            lista.innerHTML = `<div class="item-vazio">Nenhuma tarefa encontrada 📋</div>`;
            return;
        }

        lista.innerHTML = visiveis.map(t => {
            const materia = materias.find(m => m.id === t.materia_id);
            const st = calcularStatus(t);
            const dataFormatada = new Date(t.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR');
            const modalidadeTexto = t.modalidade === 'grupo'
                ? `👥 Grupo (${(t.membros_ids || []).length})`
                : '👤 Individual';

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                    <div class="item-icone ${materia?.icone_url ? 'com-imagem' : ''}">${iconeDoItem(materia)}</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${materia ? materia.nome + ' • ' : ''}${dataFormatada} • ${modalidadeTexto}${badgeDificuldade(t)}${badgeAnexo(t)}</p>
                    </div>
                    <span class="status ${st.classe}">${st.texto}</span>
                    <div class="item-acoes">
                        <button class="btn-acao concluir" title="${t.concluida ? 'Reabrir' : 'Concluir'}">${t.concluida ? '↺' : '✓'}</button>
                        <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                        <button class="btn-acao excluir" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Abas (Pendentes / Concluídas)
    abasTarefas.addEventListener('click', (e) => {
        const aba = e.target.closest('.aba-tarefa');
        if (!aba) return;
        abasTarefas.querySelectorAll('.aba-tarefa').forEach(el => el.classList.remove('ativa'));
        aba.classList.add('ativa');
        abaAtiva = aba.dataset.status;
        renderizarLista();
    });

    // Filtros
    filtroMateria.addEventListener('change', renderizarLista);

    // ==================================================
    // MODAL — ABRIR (NOVA TAREFA)
    // ==================================================
    function resetarFormulario() {
        form.reset();
        document.getElementById('idTarefa').value = '';
        secaoGrupo.hidden = true;
        listaCamposMembros.innerHTML = '';
        renderizarFerramentas();
        anexosExistentes = [];
        anexosNovos = [];
        anexosParaRemover = new Set();
        renderizarAnexosForm();
    }

    // ==================================================
    // LISTA DE ANEXOS DO FORMULÁRIO (múltiplos) — mostra os já
    // salvos (com opção de remover) e os novos ainda não enviados.
    // ==================================================
    function renderizarAnexosForm() {
        const existentesVisiveis = anexosExistentes.filter(a => !anexosParaRemover.has(a.id));

        const blocosExistentes = existentesVisiveis.map(a => `
            <div class="item-anexo-form">
                <span>${iconePorTipo(a.nome_arquivo)} ${a.nome_arquivo}</span>
                <button type="button" class="btn-remover-anexo" data-acao="remover-existente" data-id="${a.id}" title="Remover"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>
            </div>
        `);

        const blocosNovos = anexosNovos.map((arquivo, indice) => `
            <div class="item-anexo-form item-anexo-novo">
                <span><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-anexo"></use></svg> ${arquivo.name} <em>(novo)</em></span>
                <button type="button" class="btn-remover-anexo" data-acao="remover-novo" data-indice="${indice}" title="Remover"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>
            </div>
        `);

        const blocos = [...blocosExistentes, ...blocosNovos].join('');
        listaAnexosForm.innerHTML = blocos || '<p class="metadado">Nenhum anexo ainda.</p>';
    }

    listaAnexosForm.addEventListener('click', (e) => {
        const botao = e.target.closest('.btn-remover-anexo');
        if (!botao) return;

        if (botao.dataset.acao === 'remover-existente') {
            anexosParaRemover.add(Number(botao.dataset.id));
        } else if (botao.dataset.acao === 'remover-novo') {
            anexosNovos.splice(Number(botao.dataset.indice), 1);
        }
        renderizarAnexosForm();
    });

    btnNovaTarefa.addEventListener('click', () => {
        resetarFormulario();
        tituloModal.textContent = 'Nova Tarefa';
        modal.hidden = false;
    });

    // MODAL — FECHAR
    fecharModal.addEventListener('click', () => modal.hidden = true);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
    });

    // Seleção de arquivo(s) pelo input — acumula na lista de novos anexos
    // (não substitui os já escolhidos, permite ir adicionando aos poucos)
    inputAnexo.addEventListener('change', () => {
        anexosNovos.push(...Array.from(inputAnexo.files));
        inputAnexo.value = '';
        renderizarAnexosForm();
    });

    // ==================================================
    // COLAR IMAGEM(NS) DA ÁREA DE TRANSFERÊNCIA (Ctrl+V)
    // Funciona em qualquer campo do formulário — captura o evento
    // de paste e adiciona cada imagem colada à lista de novos anexos.
    // Pode ser usado várias vezes em sequência para colar mais de uma.
    // ==================================================
    modal.addEventListener('paste', (e) => {
        const itens = e.clipboardData?.items;
        if (!itens) return;

        const itensImagem = Array.from(itens).filter(item => item.type.startsWith('image/'));
        if (itensImagem.length === 0) return;

        e.preventDefault();

        itensImagem.forEach((item, indice) => {
            const arquivo = item.getAsFile();
            if (!arquivo) return;
            const extensao = (item.type.split('/')[1] || 'png').toLowerCase();
            const arquivoRenomeado = new File([arquivo], `imagem-colada-${Date.now()}-${indice}.${extensao}`, { type: item.type });
            anexosNovos.push(arquivoRenomeado);
        });

        renderizarAnexosForm();
    });

    // ==================================================
    // PREENCHE O FORMULÁRIO PARA EDIÇÃO
    // ==================================================
    function iniciarEdicao(tarefa) {
        document.getElementById('idTarefa').value = tarefa.id;
        document.getElementById('titulo').value = tarefa.titulo;
        document.getElementById('descricao').value = tarefa.descricao || '';
        document.getElementById('materia').value = tarefa.materia_id || '';
        document.getElementById('data_entrega').value = tarefa.data_entrega;
        document.getElementById('dificuldade').value = tarefa.dificuldade || 'medio';

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

        // Anexos (múltiplos) — parte do mapa já carregado em lote
        inputAnexo.value = '';
        anexosExistentes = anexosMap[tarefa.id] || [];
        anexosNovos = [];
        anexosParaRemover = new Set();
        renderizarAnexosForm();

        tituloModal.textContent = 'Editar Tarefa';
        modal.hidden = false;
    }

    // ==================================================
    // CONCLUIR / REABRIR
    // ==================================================
    async function alternarConclusao(tarefa) {
        const novoEstado = !tarefa.concluida;
        const { error } = await supabase
            .from('tarefas')
            .update({ concluida: novoEstado })
            .eq('id', tarefa.id);

        if (error) {
            alert('Erro ao atualizar: ' + error.message);
            return;
        }

        // Concluiu agora: concede XP com trava anti-farm (tempo mínimo desde
        // a criação + limite de ritmo). Nunca concede XP ao criar/editar/anexar.
        if (novoEstado) {
            await concederXpConclusaoTarefa(tarefa);

            const hoje = new Date().toISOString().split('T')[0];
            const tarefasHoje = tarefas.filter(t => t.data_entrega === hoje);
            const tarefasHojeAtualizadas = tarefasHoje.map(t => t.id === tarefa.id ? { ...t, concluida: true } : t);
            await concederXpDiaPerfeito(hoje, tarefasHojeAtualizadas);
        }

        carregarTarefas();
    }

    // ==================================================
    // EXCLUIR (tarefa + anexo + registro no cofre)
    // ==================================================
    async function excluirTarefa(tarefa) {
        if (!confirm('Excluir essa tarefa permanentemente?')) return;

        const anexos = anexosMap[tarefa.id] || await listarAnexosDaTarefa(tarefa.id);
        for (const anexo of anexos) {
            await removerArquivoPorCaminho(user.id, anexo.url_arquivo);
        }

        const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id);
        if (error) alert('Erro ao excluir: ' + error.message);
        else carregarTarefas();
    }

    // ==================================================
    // ABRE O MODAL "SAIBA MAIS"
    // ==================================================
    function abrirDetalhes(tarefa) {
        abrirDetalhesTarefa(tarefa, {
            materias, membros, ferramentas,
            aoEditar: (t) => { fecharDetalhes(); iniciarEdicao(t); },
            aoConcluir: async (t) => { fecharDetalhes(); await alternarConclusao(t); },
            aoExcluir: async (t) => { fecharDetalhes(); await excluirTarefa(t); }
        });
    }

    // Se a URL trouxer ?editar=<id> (vindo de "Início" ou "Hoje"), abre a edição direto
    function abrirEdicaoViaLink() {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('editar');
        if (!idParam) return;

        const tarefa = tarefas.find(t => String(t.id) === idParam);
        if (tarefa) iniciarEdicao(tarefa);

        // Limpa o parâmetro da URL para não reabrir ao atualizar a página
        params.delete('editar');
        const novaUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, '', novaUrl);
    }

    // ==================================================
    // AÇÕES NA LISTA (concluir / saiba mais / excluir)
    // ==================================================
    lista.addEventListener('click', async (e) => {
        const item = e.target.closest('.item-tarefa');
        if (!item) return;

        const id = item.dataset.id;
        const tarefa = tarefas.find(t => String(t.id) === id);
        if (!tarefa) return;

        if (e.target.closest('.concluir')) {
            await alternarConclusao(tarefa);
            return;
        }

        if (e.target.closest('.excluir')) {
            await excluirTarefa(tarefa);
            return;
        }

        // Clique no botão "Saiba mais" ou em qualquer outra parte do cartão
        abrirDetalhes(tarefa);
    });

    // ==================================================
    // SALVAR (CRIAR OU EDITAR)
    // ==================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idAtual = document.getElementById('idTarefa').value;
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

        const dadosTarefa = {
            titulo: document.getElementById('titulo').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            materia_id: document.getElementById('materia').value || null,
            data_entrega: document.getElementById('data_entrega').value,
            dificuldade: document.getElementById('dificuldade').value,
            modalidade,
            membros_ids: membrosIds,
            ferramentas_ids: ferramentasIds,
            usuario_id: user.id
        };

        const botaoSalvar = form.querySelector('.acoes-form button[type="submit"]');
        botaoSalvar.disabled = true;
        mostrarCarregamento('Salvando tarefa...');

        let error;
        let tarefaId = idAtual ? Number(idAtual) : null;

        if (tarefaId) {
            ({ error } = await supabase.from('tarefas').update(dadosTarefa).eq('id', tarefaId));
        } else {
            dadosTarefa.concluida = false;
            const resposta = await supabase.from('tarefas').insert(dadosTarefa).select().single();
            error = resposta.error;
            if (!error) tarefaId = resposta.data.id;
        }

        if (error) {
            alert('Erro ao salvar: ' + error.message);
            botaoSalvar.disabled = false;
            esconderCarregamento();
            return;
        }

        // Trata os anexos separadamente, agora que já temos o ID da tarefa.
        // Anexar/remover arquivo NUNCA concede XP (só concluir a tarefa concede).
        for (const idRemover of anexosParaRemover) {
            const anexo = anexosExistentes.find(a => a.id === idRemover);
            if (anexo) await removerArquivoPorCaminho(user.id, anexo.url_arquivo);
        }

        for (const arquivo of anexosNovos) {
            const { error: erroAnexo } = await enviarERegistrarArquivo({
                usuarioId: user.id,
                arquivo,
                pasta: 'tarefas',
                categoria: 'Tarefa',
                referenciaTarefaId: tarefaId
            });
            if (erroAnexo) {
                alert(`A tarefa foi salva, mas houve um erro ao enviar "${arquivo.name}": ${erroAnexo.message}`);
            }
        }

        botaoSalvar.disabled = false;
        esconderCarregamento();
        modal.hidden = true;
        resetarFormulario();
        carregarTarefas();
    });

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================
    await carregarMaterias();
    await carregarMembros();
    await carregarFerramentas();
    await carregarTarefas();
});