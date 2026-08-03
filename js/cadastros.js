import { supabase } from './supabase-config.js';
import { urlPublicaMidia, enviarMidiaPublica, removerMidiaPublica, nomeArquivoSeguro } from './midia.js';
import { concederXp } from './xp-service.js';

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
    let itemEditando = null;

    // "displayLabel" define o rótulo curto usado na listagem (padrão "Rótulo: valor"),
    // separado do "label" (mais longo, em caixa alta) usado no formulário.
    const configAbas = {
        'materias': {
            titulo: 'Matérias', tabela: 'materias', msgVazio: 'Nenhuma matéria cadastrada.',
            campos: [
                { label: 'NOME DA MATÉRIA', displayLabel: 'Nome', type: 'text', key: 'nome', required: true },
                { label: 'ÍCONE DA MATÉRIA (OPCIONAL)', type: 'image', key: 'icone_url' }
            ]
        },
        'orgaos': {
            titulo: 'Órgãos', tabela: 'orgaos', msgVazio: 'Nenhum órgão cadastrado.',
            campos: [
                { label: 'NOME DO ÓRGÃO', displayLabel: 'Nome', type: 'text', key: 'nome', required: true },
                { label: 'DESCRIÇÃO', displayLabel: 'Descrição', type: 'textarea', key: 'descricao' }
            ]
        },
        'ferramentas': {
            titulo: 'Ferramentas', tabela: 'ferramentas', msgVazio: 'Nenhuma ferramenta cadastrada.',
            campos: [
                { label: 'NOME DA FERRAMENTA', displayLabel: 'Nome', type: 'text', key: 'nome', required: true },
                { label: 'TIPO', displayLabel: 'Tipo', type: 'text', key: 'tipo', placeholder: 'Ex: Livro, Aplicativo' }
            ]
        },
        'tipos_entrega': {
            titulo: 'Tipos de Entrega', tabela: 'tipos_entrega', msgVazio: 'Nenhum tipo de entrega cadastrado.',
            campos: [
                { label: 'NOME DO TIPO DE ENTREGA', displayLabel: 'Nome', type: 'text', key: 'nome', required: true, placeholder: 'Ex: ABNT, Slides, Vídeo' },
                { label: 'FORMATOS ACEITOS', displayLabel: 'Formatos', type: 'text', key: 'formatos_aceitos', placeholder: 'Ex: .docx  ou  .pdf, .pptx' },
                { label: 'DESCRIÇÃO', displayLabel: 'Descrição', type: 'textarea', key: 'descricao' }
            ]
        },
        'membros': {
            titulo: 'Membros', tabela: 'membros', msgVazio: 'Nenhum membro cadastrado.',
            campos: [
                { label: 'NOME COMPLETO', displayLabel: 'Nome', type: 'text', key: 'nome', required: true },
                { label: 'FUNÇÃO / CARGO', displayLabel: 'Função', type: 'text', key: 'funcao' }
            ]
        }
    };

    function mudarAba(idAba) {
        abaAtual = idAba;
        itemEditando = null;
        abasNavegacao.forEach(aba => aba.classList.toggle('ativa', aba.dataset.aba === idAba));
        tituloLista.textContent = configAbas[idAba].titulo;
        exibirView('listagem');
        carregarItens();
    }

    function exibirView(view) {
        viewListagem.hidden = view !== 'listagem';
        viewFormulario.hidden = view !== 'formulario';
        if (view === 'formulario') {
            tituloForm.textContent = itemEditando
                ? `Editar Cadastro`
                : `Novo Cadastro em ${configAbas[abaAtual].titulo}`;
            gerarCamposForm(itemEditando);
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

            // Padrão único para os campos de texto: "Rótulo: valor", um por linha
            const linhasHtml = config.campos
                .filter(c => c.type !== 'image')
                .map(c => item[c.key]
                    ? `<div class="item-linha"><span class="item-rotulo">${c.displayLabel}:</span><span class="item-valor">${item[c.key]}</span></div>`
                    : '')
                .join('');

            const campoImagem = config.campos.find(c => c.type === 'image');
            const iconeHtml = campoImagem && item[campoImagem.key]
                ? `<div class="item-cadastro-icone"><img src="${urlPublicaMidia(item[campoImagem.key])}" alt=""></div>`
                : '';

            div.innerHTML = `
                ${iconeHtml}
                <div class="item-info">${linhasHtml}</div>
                <div class="item-acoes-cadastro">
                    <button type="button" class="btn-editar-cadastro" title="Editar"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-editar"></use></svg></button>
                    <button type="button" class="btn-deletar" title="Excluir"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-excluir"></use></svg></button>
                </div>
            `;
            div.querySelector('.btn-editar-cadastro').onclick = () => {
                itemEditando = item;
                exibirView('formulario');
            };
            div.querySelector('.btn-deletar').onclick = () => deletarItem(item);
            listaItens.appendChild(div);
        });
    }

    async function deletarItem(item) {
        if (!confirm('Deseja realmente excluir este item?')) return;

        const { error } = await supabase.from(configAbas[abaAtual].tabela).delete().eq('id', item.id);
        if (error) { alert('Erro ao excluir: ' + error.message); return; }

        // Se o item tinha um ícone próprio, remove também do storage
        const campoImagem = configAbas[abaAtual].campos.find(c => c.type === 'image');
        if (campoImagem && item[campoImagem.key]) {
            await removerMidiaPublica(item[campoImagem.key]);
        }

        carregarItens();
    }

    function gerarCamposForm(item = null) {
        const config = configAbas[abaAtual];
        camposDinamicos.innerHTML = '';

        config.campos.forEach(campo => {
            const grupo = document.createElement('div');
            grupo.className = 'grupo-campo';
            const label = document.createElement('label');
            label.textContent = campo.label;
            grupo.appendChild(label);

            if (campo.type === 'image') {
                const preview = document.createElement('div');
                preview.className = 'preview-icone-materia';
                const urlAtual = item?.[campo.key] ? urlPublicaMidia(item[campo.key]) : null;
                preview.innerHTML = urlAtual
                    ? `<img src="${urlAtual}" alt="Ícone atual">`
                    : `<span class="preview-icone-vazio"><svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-${abaAtual}"></use></svg></span>`;

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.className = 'campo-entrada';
                input.dataset.key = campo.key;
                input.dataset.tipo = 'image';
                input.addEventListener('change', () => {
                    const arquivo = input.files[0];
                    if (arquivo) preview.innerHTML = `<img src="${URL.createObjectURL(arquivo)}" alt="Prévia">`;
                });

                grupo.append(preview, input);
            } else {
                const input = campo.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
                if (campo.type !== 'textarea') input.type = 'text';
                input.className = 'campo-entrada';
                input.dataset.key = campo.key;
                if (campo.placeholder) input.placeholder = campo.placeholder;
                if (campo.required) input.required = true;
                if (item && item[campo.key]) input.value = item[campo.key];
                grupo.appendChild(input);
            }

            camposDinamicos.appendChild(grupo);
        });
    }

    botoesCard.forEach(btn => btn.onclick = () => { modalGerenciador.hidden = false; mudarAba(btn.dataset.aba); });
    abasNavegacao.forEach(aba => aba.onclick = () => mudarAba(aba.dataset.aba));
    botoesFechar.forEach(btn => btn.onclick = () => { modalGerenciador.hidden = true; });

    btnNovoCadastro.onclick = () => { itemEditando = null; exibirView('formulario'); };
    btnVoltarLista.onclick = () => { itemEditando = null; exibirView('listagem'); };

    formUnificado.onsubmit = async (e) => {
        e.preventDefault();
        const botaoSalvar = formUnificado.querySelector('button[type="submit"]');
        botaoSalvar.disabled = true;

        const payload = { usuario_id: user.id };
        formUnificado.querySelectorAll('[data-key]:not([data-tipo="image"])').forEach(i => {
            payload[i.dataset.key] = i.value.trim();
        });

        const campoImagem = formUnificado.querySelector('[data-tipo="image"]');
        if (campoImagem) {
            const arquivo = campoImagem.files[0];
            if (arquivo) {
                const caminhoAntigo = itemEditando?.[campoImagem.dataset.key] || null;
                const novoCaminho = `${user.id}/materias/${Date.now()}_${nomeArquivoSeguro(arquivo.name)}`;
                const { error: erroUpload } = await enviarMidiaPublica(novoCaminho, arquivo);
                if (erroUpload) {
                    alert('Erro ao enviar ícone: ' + erroUpload.message);
                    botaoSalvar.disabled = false;
                    return;
                }
                if (caminhoAntigo) await removerMidiaPublica(caminhoAntigo);
                payload[campoImagem.dataset.key] = novoCaminho;
            } else if (itemEditando) {
                payload[campoImagem.dataset.key] = itemEditando[campoImagem.dataset.key] || null;
            }
        }

        let error;
        if (itemEditando) {
            ({ error } = await supabase.from(configAbas[abaAtual].tabela).update(payload).eq('id', itemEditando.id));
        } else {
            const resposta = await supabase.from(configAbas[abaAtual].tabela).insert(payload).select().single();
            error = resposta.error;
            if (!error) {
                await concederXp('cadastro_item', `${configAbas[abaAtual].tabela}:${resposta.data.id}`, 8);
            }
        }

        botaoSalvar.disabled = false;

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            itemEditando = null;
            formUnificado.reset();
            exibirView('listagem');
            carregarItens();
        }
    };
});