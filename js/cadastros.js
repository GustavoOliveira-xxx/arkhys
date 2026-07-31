import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const modalGerenciador = document.getElementById('modalGerenciador');
    const viewListagem = document.getElementById('viewListagem');
    const viewFormulario = document.getElementById('viewFormulario');
    const listaItens = document.getElementById('listaItens');
    const camposDinamicos = document.getElementById('camposDinamicos');
    const formUnificado = document.getElementById('formUnificado');
    const tituloLista = document.getElementById('tituloLista');
    const tituloForm = document.getElementById('tituloForm');
    
    const btnNovoCadastro = document.getElementById('btnNovoCadastro');
    const btnVoltarLista = document.getElementById('btnVoltarLista');
    const botoesFechar = document.querySelectorAll('.fechar-modal');
    const botoesCard = document.querySelectorAll('.botao-card');
    const abasNavegacao = document.querySelectorAll('.aba-item');

    let abaAtual = 'materias';

    const configAbas = {
        'materias': { titulo: 'Matérias', tabela: 'materias', msgVazio: 'Nenhuma matéria cadastrada.', campos: [{ label: 'NOME DA MATÉRIA', type: 'text', key: 'nome', required: true }] },
        'orgaos': { titulo: 'Órgãos', tabela: 'orgaos', msgVazio: 'Nenhum órgão cadastrado.', campos: [{ label: 'NOME DO ÓRGÃO', type: 'text', key: 'nome', required: true }, { label: 'DESCRIÇÃO', type: 'textarea', key: 'descricao' }] },
        'ferramentas': { titulo: 'Ferramentas', tabela: 'ferramentas', msgVazio: 'Nenhuma ferramenta cadastrada.', campos: [{ label: 'NOME DA FERRAMENTA', type: 'text', key: 'nome', required: true }, { label: 'TIPO', type: 'text', key: 'tipo', placeholder: 'Ex: Livro, Aplicativo' }] },
        'membros': { titulo: 'Membros', tabela: 'membros', msgVazio: 'Nenhum membro cadastrado.', campos: [{ label: 'NOME COMPLETO', type: 'text', key: 'nome', required: true }, { label: 'FUNÇÃO / CARGO', type: 'text', key: 'funcao' }] }
    };

    function mudarAba(idAba) {
        abaAtual = idAba;
        abasNavegacao.forEach(aba => aba.classList.toggle('ativa', aba.dataset.aba === idAba));
        tituloLista.textContent = configAbas[idAba].titulo;
        exibirView('listagem');
        carregarItens();
    }

    function exibirView(view) {
        viewListagem.hidden = view !== 'listagem';
        viewFormulario.hidden = view !== 'formulario';
        if (view === 'formulario') {
            tituloForm.textContent = `Novo Cadastro em ${configAbas[abaAtual].titulo}`;
            gerarCamposForm();
        }
    }

    async function carregarItens() {
        const config = configAbas[abaAtual];
        listaItens.innerHTML = '<div class="lista-vazia">Carregando...</div>';
        const { data, error } = await supabase.from(config.tabela).select('*').eq('usuario_id', user.id).order('created_at', { ascending: false });
        if (error) { listaItens.innerHTML = `<div class="lista-vazia">Erro: ${error.message}</div>`; return; }
        if (!data || data.length === 0) { listaItens.innerHTML = `<div class="lista-vazia">${config.msgVazio}</div>`; return; }
        listaItens.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-cadastro';
            let detalhe = item.descricao || item.tipo || item.funcao || '';
            div.innerHTML = `<div class="item-info"><span class="item-nome">${item.nome}</span>${detalhe ? `<span class="item-detalhe">${detalhe}</span>` : ''}</div><button class="btn-deletar" data-id="${item.id}">✕</button>`;
            div.querySelector('.btn-deletar').onclick = () => deletarItem(item.id);
            listaItens.appendChild(div);
        });
    }

    async function deletarItem(id) {
        if (confirm('Deseja realmente excluir este item?')) {
            const { error } = await supabase.from(configAbas[abaAtual].tabela).delete().eq('id', id);
            if (error) alert('Erro ao excluir: ' + error.message); else carregarItens();
        }
    }

    function gerarCamposForm() {
        const config = configAbas[abaAtual];
        camposDinamicos.innerHTML = '';
        config.campos.forEach(campo => {
            const grupo = document.createElement('div'); grupo.className = 'grupo-campo';
            const label = document.createElement('label'); label.textContent = campo.label;
            const input = campo.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
            input.className = 'campo-entrada'; input.dataset.key = campo.key;
            if (campo.required) input.required = true;
            grupo.append(label, input); camposDinamicos.appendChild(grupo);
        });
    }

    botoesCard.forEach(btn => btn.onclick = () => { modalGerenciador.hidden = false; mudarAba(btn.dataset.aba); });
    abasNavegacao.forEach(aba => aba.onclick = () => mudarAba(aba.dataset.aba));
    botoesFechar.forEach(btn => btn.onclick = () => modalGerenciador.hidden = true);
    btnNovoCadastro.onclick = () => exibirView('formulario');
    btnVoltarLista.onclick = () => exibirView('listagem');

    formUnificado.onsubmit = async (e) => {
        e.preventDefault();
        const payload = { usuario_id: user.id };
        formUnificado.querySelectorAll('[data-key]').forEach(i => payload[i.dataset.key] = i.value.trim());
        const { error } = await supabase.from(configAbas[abaAtual].tabela).insert(payload);
        if (error) alert('Erro ao salvar: ' + error.message);
        else { formUnificado.reset(); exibirView('listagem'); carregarItens(); }
    };
});

botoesFechar.forEach(btn => {
    btn.onclick = () => {
        modalGerenciador.hidden = true;
        modalGerenciador.style.display = 'none';
    };
});

botoesCard.forEach(btn => {
    btn.onclick = () => {
        modalGerenciador.hidden = false;
        modalGerenciador.style.display = 'flex';
        mudarAba(btn.dataset.aba);
    };
});

