import { supabase } from './supabase-config.js';
import { urlPublicaMidia, iconePorTipo, rotuloPorTipo } from './midia.js';
import { enviarERegistrarArquivo, removerArquivoPorCaminho, listarAnexosDaTarefa, mapaAnexosPorTarefa } from './arquivos-service.js';
import { abrirDetalhesTarefa, fecharDetalhes } from './detalhes-tarefa.js';
import { celebrarConclusao } from './celebracao.js';
import { concederXpDiaPerfeito, concederXpConclusaoTarefa, NOME_DIFICULDADE } from './xp-service.js';
import { mostrarCarregamento, esconderCarregamento } from './loading.js';
import { validarConclusao } from './passos.js';

document.addEventListener('DOMContentLoaded', async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const lista = document.getElementById('listaTarefas');
    const abasTarefas = document.getElementById('abasTarefas');
    const filtroMateria = document.getElementById('filtroMateria');
    const btnNovaTarefa = document.getElementById('btnNovaTarefa');
    const modal = document.getElementById('modalTarefa');
    const fecharModal = document.getElementById('fecharModal');
    const form = document.getElementById('formTarefa');
    const tituloModal = modal.querySelector('h3');
    const selectMateria = document.getElementById('materia');

    const selectModalidade = document.getElementById('modalidade');
    const secaoGrupo = document.getElementById('secaoGrupo');
    const qtdeMembros = document.getElementById('qtdeMembros');
    const btnGerarMembros = document.getElementById('btnGerarMembros');
    const listaCamposMembros = document.getElementById('listaCamposMembros');

    const listaFerramentas = document.getElementById('listaFerramentas');

    const listaTiposEntrega = document.getElementById('listaTiposEntrega');

    const inputAnexo = document.getElementById('anexo');
    const listaAnexosForm = document.getElementById('listaAnexosForm');

    const alternadorVisao = document.getElementById('alternadorVisao');
    const quadro = document.getElementById('quadroTarefas');
    const inputNovoPasso = document.getElementById('novoPasso');
    const btnAdicionarPasso = document.getElementById('btnAdicionarPasso');
    const listaPassosForm = document.getElementById('listaPassosForm');

    let tarefas = [];
    let materias = [];
    let membros = [];
    let ferramentas = [];
    let tiposEntrega = [];
    let anexosMap = {};
    let abaAtiva = 'pendentes';
    let visaoAtiva = localStorage.getItem('arkhys_visao_tarefas') === 'quadro' ? 'quadro' : 'lista';
    let passos = [];

    const COLUNAS_QUADRO = [
        { id: 'a_fazer', nome: 'Para Fazer' },
        { id: 'fazendo', nome: 'Fazendo' },
        { id: 'concluido', nome: 'Concluído' }
    ];

    let anexosExistentes = [];
    let anexosNovos = [];
    let anexosParaRemover = new Set();

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

    async function carregarTiposEntrega() {
        const { data, error } = await supabase
            .from('tipos_entrega')
            .select('*')
            .eq('usuario_id', user.id)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao carregar tipos de entrega:', error);
            return;
        }

        tiposEntrega = data || [];
        renderizarTiposEntrega();
    }

    function renderizarTiposEntrega(selecionados = []) {
        if (!listaTiposEntrega) return;

        if (tiposEntrega.length === 0) {
            listaTiposEntrega.innerHTML = `<p class="texto-vazio-pequeno">Nenhum tipo de entrega cadastrado ainda. Cadastre em "Cadastros".</p>`;
            return;
        }

        listaTiposEntrega.innerHTML = tiposEntrega.map(t => `
            <label class="item-ferramenta-checkbox">
                <input type="checkbox" value="${t.id}" ${selecionados.includes(t.id) ? 'checked' : ''}>
                <span>${t.nome}${t.formatos_aceitos ? ` <span class="metadado">(${t.formatos_aceitos})</span>` : ''}</span>
            </label>
        `).join('');
    }

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

    selectModalidade.addEventListener('change', () => {
        const ehGrupo = selectModalidade.value === 'grupo';
        secaoGrupo.hidden = !ehGrupo;
        if (!ehGrupo) {
            listaCamposMembros.innerHTML = '';
            qtdeMembros.value = '';
        }
    });

    btnGerarMembros.addEventListener('click', () => {
        const qtde = parseInt(qtdeMembros.value, 10);
        if (!qtde || qtde < 1) {
            alert('Informe uma quantidade válida de membros.');
            return;
        }
        gerarCamposMembros(qtde);
    });

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
        renderizarVisao();
        abrirEdicaoViaLink();
    }

    function calcularStatus(tarefa) {
        if (tarefa.concluida) return { classe: 'normal', texto: 'Concluída' };

        const hoje = new Date().toISOString().split('T')[0];
        if (tarefa.data_entrega < hoje) return { classe: 'atrasado', texto: 'Atrasada' };
        if (tarefa.data_entrega === hoje) return { classe: 'prazo-hoje', texto: 'Hoje' };
        return { classe: 'proximo', texto: 'Em breve' };
    }

    function iconeDoItem(materia) {
        if (materia?.icone_url) {
            const url = urlPublicaMidia(materia.icone_url);
            return `<img src="${url}" alt="${materia.nome}">`;
        }
        return '📝';
    }

    const nomeUsuario = user.user_metadata?.nome_completo?.trim() || 'Você';

    function rotuloGrupoData(dataISO) {
        if (!dataISO || dataISO === 'sem-data') return 'Sem data definida';

        const data = new Date(dataISO + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diffDias = Math.round((data - hoje) / 86400000);

        const curta = data.toLocaleDateString('pt-BR');
        if (diffDias === 0) return `Hoje · ${curta}`;
        if (diffDias === 1) return `Amanhã · ${curta}`;
        if (diffDias === -1) return `Ontem · ${curta}`;

        const extenso = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        return extenso.charAt(0).toUpperCase() + extenso.slice(1);
    }

    function badgeAnexo(tarefa) {
        const anexos = anexosMap[tarefa.id] || [];
        if (anexos.length === 0) return '';
        if (anexos.length === 1) {
            const nome = anexos[0].nome_arquivo;
            return ` • ${iconePorTipo(nome)} ${rotuloPorTipo(nome)}`;
        }
        return ` • 📎 ${anexos.length} anexos`;
    }

    function passosDaTarefa(tarefa) {
        const lista = Array.isArray(tarefa.subtarefas) ? tarefa.subtarefas : [];
        return lista.filter(p => p && p.texto);
    }

    function progressoPassos(tarefa) {
        const lista = passosDaTarefa(tarefa);
        const feitos = lista.filter(p => p.feita).length;
        return { total: lista.length, feitos, porcentagem: lista.length ? Math.round((feitos / lista.length) * 100) : 0 };
    }

    function barraProgressoPassos(tarefa) {
        const { total, feitos, porcentagem } = progressoPassos(tarefa);
        if (!total) return '';
        return `
            <div class="progresso-passos">
                <div class="progresso-passos-trilha"><span style="width: ${porcentagem}%"></span></div>
                <span class="progresso-passos-texto">${feitos}/${total} passos</span>
            </div>
        `;
    }

    const EMOJI_DIFICULDADE = { facil: '🟢', medio: '🟡', dificil: '🔴' };
    function badgeDificuldade(tarefa) {
        const emoji = EMOJI_DIFICULDADE[tarefa.dificuldade];
        return emoji ? ` • ${emoji} ${NOME_DIFICULDADE[tarefa.dificuldade]}` : '';
    }

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

        const cartaoTarefa = (t) => {
            const materia = materias.find(m => m.id === t.materia_id);
            const st = calcularStatus(t);
            const dataFormatada = new Date(t.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR');
            const modalidadeTexto = t.modalidade === 'grupo'
                ? `👥 Grupo (${(t.membros_ids || []).length})`
                : `👤 ${nomeUsuario} (Individual)`;

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                    <div class="item-icone ${materia?.icone_url ? 'com-imagem' : ''}">${iconeDoItem(materia)}</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${materia ? materia.nome + ' • ' : ''}${dataFormatada} • ${modalidadeTexto}${badgeDificuldade(t)}${badgeAnexo(t)}</p>
                        ${barraProgressoPassos(t)}
                    </div>
                    <span class="status ${st.classe}">${st.texto}</span>
                    <div class="item-acoes">
                        <button class="btn-acao concluir" title="${t.concluida ? 'Reabrir' : 'Concluir'}">${t.concluida ? '↺' : '✓'}</button>
                        <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                        <button class="btn-acao excluir" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        };

        const grupos = new Map();
        visiveis
            .slice()
            .sort((a, b) => String(a.data_entrega).localeCompare(String(b.data_entrega)))
            .forEach(t => {
                const chave = t.data_entrega || 'sem-data';
                if (!grupos.has(chave)) grupos.set(chave, []);
                grupos.get(chave).push(t);
            });

        lista.innerHTML = Array.from(grupos.entries()).map(([data, itens], indice) => `
            <section class="grupo-data" style="--atraso: ${indice * 60}ms">
                <header class="grupo-data-cabecalho">
                    <h3>${rotuloGrupoData(data)}</h3>
                    <span class="grupo-data-contador">${itens.length}</span>
                </header>
                <div class="grupo-data-itens">${itens.map(cartaoTarefa).join('')}</div>
            </section>
        `).join('');
    }

    function colunaDaTarefa(tarefa) {
        if (tarefa.concluida) return 'concluido';
        return tarefa.status_quadro === 'fazendo' ? 'fazendo' : 'a_fazer';
    }

    function tarefasVisiveisNoQuadro() {
        if (!filtroMateria.value) return [...tarefas];
        return tarefas.filter(t => String(t.materia_id) === filtroMateria.value);
    }

    function renderizarQuadro() {
        const visiveis = tarefasVisiveisNoQuadro();

        quadro.innerHTML = COLUNAS_QUADRO.map((coluna, indice) => {
            const itens = visiveis.filter(t => colunaDaTarefa(t) === coluna.id);

            const cartoes = itens.map(t => {
                const materia = materias.find(m => m.id === t.materia_id);
                const st = calcularStatus(t);
                const dataFormatada = new Date(t.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR');
                const anterior = COLUNAS_QUADRO[indice - 1];
                const proxima = COLUNAS_QUADRO[indice + 1];

                return `
                    <article class="cartao-quadro" draggable="true" data-id="${t.id}">
                        <header class="cartao-quadro-topo">
                            <span class="cartao-quadro-materia">${materia ? materia.nome : 'Sem matéria'}</span>
                            <span class="status ${st.classe}">${st.texto}</span>
                        </header>
                        <h4>${t.titulo}</h4>
                        ${barraProgressoPassos(t)}
                        <footer class="cartao-quadro-rodape">
                            <span class="metadado">${dataFormatada}</span>
                            <div class="cartao-quadro-mover">
                                ${anterior ? `<button type="button" class="btn-mover" data-acao="mover" data-destino="${anterior.id}" title="Mover para ${anterior.nome}">&larr;</button>` : ''}
                                ${proxima ? `<button type="button" class="btn-mover" data-acao="mover" data-destino="${proxima.id}" title="Mover para ${proxima.nome}">&rarr;</button>` : ''}
                            </div>
                        </footer>
                    </article>
                `;
            }).join('');

            return `
                <section class="coluna-quadro" data-coluna="${coluna.id}" style="--indice-coluna: ${indice}">
                    <header class="coluna-quadro-topo">
                        <h3>${coluna.nome}</h3>
                        <span class="coluna-quadro-contador">${itens.length}</span>
                    </header>
                    <div class="coluna-quadro-corpo" data-coluna="${coluna.id}">
                        ${cartoes || '<p class="texto-vazio-pequeno">Arraste uma tarefa para cá.</p>'}
                    </div>
                </section>
            `;
        }).join('');

        ativarArrastarSoltar();
    }

    let idCartaoRecemMovido = null;

    function pulsoDeSoltura(corpo, evento) {
        const retangulo = corpo.getBoundingClientRect();
        const pulso = document.createElement('span');
        pulso.className = 'pulso-soltura';
        pulso.style.left = `${evento.clientX - retangulo.left}px`;
        pulso.style.top = `${evento.clientY - retangulo.top}px`;
        corpo.appendChild(pulso);
        setTimeout(() => pulso.remove(), 620);
    }

    function ativarArrastarSoltar() {
        quadro.querySelectorAll('.cartao-quadro').forEach(cartao => {
            if (cartao.dataset.id === idCartaoRecemMovido) {
                cartao.classList.add('cartao-aterrissando');
                cartao.addEventListener('animationend', () => cartao.classList.remove('cartao-aterrissando'), { once: true });
            }

            cartao.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', cartao.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
                cartao.classList.add('arrastando');
                quadro.classList.add('quadro-arrastando');
            });
            cartao.addEventListener('dragend', () => {
                cartao.classList.remove('arrastando');
                quadro.classList.remove('quadro-arrastando');
                quadro.querySelectorAll('.coluna-alvo').forEach(el => el.classList.remove('coluna-alvo'));
            });
        });

        quadro.querySelectorAll('.coluna-quadro-corpo').forEach(corpo => {
            let contadorEntradas = 0;

            corpo.addEventListener('dragenter', (e) => {
                e.preventDefault();
                contadorEntradas += 1;
                corpo.classList.add('coluna-alvo');
            });
            corpo.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                corpo.classList.add('coluna-alvo');
            });
            corpo.addEventListener('dragleave', () => {
                contadorEntradas = Math.max(0, contadorEntradas - 1);
                if (contadorEntradas === 0) corpo.classList.remove('coluna-alvo');
            });
            corpo.addEventListener('drop', async (e) => {
                e.preventDefault();
                contadorEntradas = 0;
                corpo.classList.remove('coluna-alvo');
                corpo.classList.add('coluna-recebeu');
                pulsoDeSoltura(corpo, e);
                setTimeout(() => corpo.classList.remove('coluna-recebeu'), 520);
                quadro.classList.remove('quadro-arrastando');

                const tarefa = tarefas.find(t => String(t.id) === e.dataTransfer.getData('text/plain'));
                if (!tarefa) return;
                idCartaoRecemMovido = String(tarefa.id);
                await moverParaColuna(tarefa, corpo.dataset.coluna);
                setTimeout(() => { idCartaoRecemMovido = null; }, 1200);
            });
        });
    }

    async function moverParaColuna(tarefa, coluna) {
        if (colunaDaTarefa(tarefa) === coluna) return;

        if (coluna === 'concluido') {
            if (!validarConclusao(tarefa)) return;
            await alternarConclusao(tarefa);
            return;
        }

        const { error } = await supabase
            .from('tarefas')
            .update({ status_quadro: coluna, concluida: false })
            .eq('id', tarefa.id)
            .eq('usuario_id', user.id);

        if (error) {
            alert('Erro ao mover a tarefa: ' + error.message);
            return;
        }

        carregarTarefas();
    }

    quadro.addEventListener('click', async (e) => {
        const cartao = e.target.closest('.cartao-quadro');
        if (!cartao) return;

        const tarefa = tarefas.find(t => String(t.id) === cartao.dataset.id);
        if (!tarefa) return;

        const botaoMover = e.target.closest('[data-acao="mover"]');
        if (botaoMover) {
            await moverParaColuna(tarefa, botaoMover.dataset.destino);
            return;
        }

        abrirDetalhes(tarefa);
    });

    function atualizarSelo() {
        if (!window.arkhysSelo) return;
        const feitas = tarefas.filter(t => t.concluida).length;
        window.arkhysSelo.definir(feitas, tarefas.length);
    }

    function renderizarVisao() {
        atualizarSelo();

        const ehQuadro = visaoAtiva === 'quadro';
        lista.hidden = ehQuadro;
        quadro.hidden = !ehQuadro;
        abasTarefas.hidden = ehQuadro;

        if (ehQuadro) renderizarQuadro();
        else renderizarLista();
    }

    alternadorVisao.addEventListener('click', (e) => {
        const opcao = e.target.closest('.opcao-visao');
        if (!opcao) return;

        visaoAtiva = opcao.dataset.visao;
        localStorage.setItem('arkhys_visao_tarefas', visaoAtiva);
        alternadorVisao.querySelectorAll('.opcao-visao').forEach(el => el.classList.toggle('ativa', el.dataset.visao === visaoAtiva));
        renderizarVisao();
    });

    abasTarefas.addEventListener('click', (e) => {
        const aba = e.target.closest('.aba-tarefa');
        if (!aba) return;
        abasTarefas.querySelectorAll('.aba-tarefa').forEach(el => el.classList.remove('ativa'));
        aba.classList.add('ativa');
        abaAtiva = aba.dataset.status;
        renderizarVisao();
    });

    filtroMateria.addEventListener('change', renderizarVisao);

    function resetarFormulario() {
        form.reset();
        document.getElementById('idTarefa').value = '';
        secaoGrupo.hidden = true;
        listaCamposMembros.innerHTML = '';
        renderizarFerramentas();
        renderizarTiposEntrega();
        anexosExistentes = [];
        anexosNovos = [];
        anexosParaRemover = new Set();
        renderizarAnexosForm();
        passos = [];
        renderizarPassosForm();
    }

    function renderizarPassosForm() {
        if (!listaPassosForm) return;

        if (passos.length === 0) {
            listaPassosForm.innerHTML = '<p class="metadado">Nenhum passo cadastrado. Tarefas divididas em etapas são bem mais fáceis de começar.</p>';
            return;
        }

        listaPassosForm.innerHTML = passos.map((passo, indice) => `
            <div class="item-passo-form">
                <span class="item-passo-ordem">${indice + 1}</span>
                <span class="item-passo-texto ${passo.feita ? 'passo-feito' : ''}">${passo.texto}</span>
                <div class="item-passo-acoes">
                    <button type="button" class="btn-acao" data-acao="subir-passo" data-indice="${indice}" title="Subir" ${indice === 0 ? 'disabled' : ''}>&uarr;</button>
                    <button type="button" class="btn-acao" data-acao="descer-passo" data-indice="${indice}" title="Descer" ${indice === passos.length - 1 ? 'disabled' : ''}>&darr;</button>
                    <button type="button" class="btn-remover-anexo" data-acao="remover-passo" data-indice="${indice}" title="Remover"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-fechar"></use></svg></button>
                </div>
            </div>
        `).join('');
    }

    function adicionarPasso() {
        const texto = inputNovoPasso.value.trim();
        if (!texto) return;

        passos.push({ id: `p${Date.now()}${passos.length}`, texto, feita: false });
        inputNovoPasso.value = '';
        inputNovoPasso.focus();
        renderizarPassosForm();
    }

    btnAdicionarPasso.addEventListener('click', adicionarPasso);

    inputNovoPasso.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        adicionarPasso();
    });

    listaPassosForm.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao]');
        if (!botao) return;

        const indice = Number(botao.dataset.indice);
        const acao = botao.dataset.acao;

        if (acao === 'remover-passo') passos.splice(indice, 1);
        if (acao === 'subir-passo' && indice > 0) passos.splice(indice - 1, 0, passos.splice(indice, 1)[0]);
        if (acao === 'descer-passo' && indice < passos.length - 1) passos.splice(indice + 1, 0, passos.splice(indice, 1)[0]);

        renderizarPassosForm();
    });

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

    fecharModal.addEventListener('click', () => modal.hidden = true);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
    });

    inputAnexo.addEventListener('change', () => {
        anexosNovos.push(...Array.from(inputAnexo.files));
        inputAnexo.value = '';
        renderizarAnexosForm();
    });

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

    function iniciarEdicao(tarefa) {
        document.getElementById('idTarefa').value = tarefa.id;
        document.getElementById('titulo').value = tarefa.titulo;
        document.getElementById('descricao').value = tarefa.descricao || '';
        document.getElementById('materia').value = tarefa.materia_id || '';
        document.getElementById('data_entrega').value = tarefa.data_entrega;
        document.getElementById('dificuldade').value = tarefa.dificuldade || 'medio';

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

        renderizarFerramentas(tarefa.ferramentas_ids || []);

        renderizarTiposEntrega(tarefa.tipos_entrega_ids || []);

        passos = passosDaTarefa(tarefa).map(passo => ({ id: passo.id || `p${Math.random().toString(36).slice(2)}`, texto: passo.texto, feita: !!passo.feita }));
        inputNovoPasso.value = '';
        renderizarPassosForm();

        inputAnexo.value = '';
        anexosExistentes = anexosMap[tarefa.id] || [];
        anexosNovos = [];
        anexosParaRemover = new Set();
        renderizarAnexosForm();

        tituloModal.textContent = 'Editar Tarefa';
        modal.hidden = false;
    }

    async function alternarConclusao(tarefa) {
        const novoEstado = !tarefa.concluida;
        if (novoEstado && !validarConclusao(tarefa)) return;
        const { error } = await supabase
            .from('tarefas')
            .update({ concluida: novoEstado, status_quadro: novoEstado ? 'concluido' : 'fazendo' })
            .eq('id', tarefa.id);

        if (error) {
            alert('Erro ao atualizar: ' + error.message);
            return;
        }

        if (novoEstado) {
            celebrarConclusao({ titulo: tarefa.titulo });

            await concederXpConclusaoTarefa(tarefa);

            const hoje = new Date().toISOString().split('T')[0];
            const tarefasHoje = tarefas.filter(t => t.data_entrega === hoje);
            const tarefasHojeAtualizadas = tarefasHoje.map(t => t.id === tarefa.id ? { ...t, concluida: true } : t);
            await concederXpDiaPerfeito(hoje, tarefasHojeAtualizadas);
        }

        carregarTarefas();
    }

    async function excluirTarefa(tarefa) {
        if (!confirm('Excluir essa tarefa permanentemente?')) return;

        const anexos = anexosMap[tarefa.id] || await listarAnexosDaTarefa(tarefa.id);
        for (const anexo of anexos) {
            await removerArquivoPorCaminho(user.id, anexo.url_arquivo);
        }

        const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
            return;
        }
        await carregarTarefas();
        celebrarConclusao({ texto: 'Atividade excluída', titulo: tarefa.titulo, duracao: 1400 });
    }

    async function alternarPasso(tarefa, idPasso) {
        const atualizados = passosDaTarefa(tarefa).map(passo => passo.id === idPasso ? { ...passo, feita: !passo.feita } : passo);

        const { error } = await supabase
            .from('tarefas')
            .update({ subtarefas: atualizados })
            .eq('id', tarefa.id)
            .eq('usuario_id', user.id);

        if (error) {
            alert('Erro ao atualizar o passo: ' + error.message);
            return null;
        }

        tarefa.subtarefas = atualizados;
        const indice = tarefas.findIndex(t => t.id === tarefa.id);
        if (indice >= 0) tarefas[indice] = { ...tarefas[indice], subtarefas: atualizados };
        renderizarVisao();
        return atualizados;
    }

    function abrirDetalhes(tarefa) {
        abrirDetalhesTarefa(tarefa, {
            materias, membros, ferramentas,
            aoAlternarPasso: (t, idPasso) => alternarPasso(t, idPasso),
            aoEditar: (t) => { fecharDetalhes(); iniciarEdicao(t); },
            aoConcluir: async (t) => { fecharDetalhes(); await alternarConclusao(t); },
            aoExcluir: async (t) => { fecharDetalhes(); await excluirTarefa(t); }
        });
    }

    function abrirEdicaoViaLink() {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('editar');
        if (!idParam) return;

        const tarefa = tarefas.find(t => String(t.id) === idParam);
        if (tarefa) iniciarEdicao(tarefa);

        params.delete('editar');
        const novaUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, '', novaUrl);
    }

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

        abrirDetalhes(tarefa);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idAtual = document.getElementById('idTarefa').value;
        const modalidade = selectModalidade.value;

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

        const ferramentasIds = Array.from(listaFerramentas.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => Number(cb.value));

        const tiposEntregaIds = listaTiposEntrega
            ? Array.from(listaTiposEntrega.querySelectorAll('input[type="checkbox"]:checked')).map(cb => Number(cb.value))
            : [];

        const dadosTarefa = {
            titulo: document.getElementById('titulo').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            materia_id: document.getElementById('materia').value || null,
            data_entrega: document.getElementById('data_entrega').value,
            dificuldade: document.getElementById('dificuldade').value,
            modalidade,
            membros_ids: membrosIds,
            ferramentas_ids: ferramentasIds,
            tipos_entrega_ids: tiposEntregaIds,
            subtarefas: passos,
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
            dadosTarefa.status_quadro = 'a_fazer';
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
        const tituloSalvo = dadosTarefa.titulo;
        const eraEdicao = !!idAtual;
        resetarFormulario();
        await carregarTarefas();
        celebrarConclusao({
            texto: eraEdicao ? 'Atividade atualizada' : 'Atividade cadastrada',
            titulo: tituloSalvo
        });
    });

    await carregarMaterias();
    await carregarMembros();
    await carregarFerramentas();
    await carregarTiposEntrega();
    alternadorVisao.querySelectorAll('.opcao-visao').forEach(el => el.classList.toggle('ativa', el.dataset.visao === visaoAtiva));
    await carregarTarefas();
});
