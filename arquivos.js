import { supabase } from './supabase-config.js';
import { iconePorTipo, ehImagem, urlsAssinadasEmLote, abrirVisualizadorArquivo } from './midia.js';
import { enviarERegistrarArquivo, removerArquivoPorCaminho, renomearArquivo } from './arquivos-service.js';
import { concederXp } from './xp-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const btnEnviar = document.getElementById('btnEnviar');
    const inputArquivo = document.getElementById('inputArquivo');
    const lista = document.getElementById('listaArquivos');
    const abasArquivos = document.getElementById('abasArquivos');
    const campoBusca = document.getElementById('buscaArquivos');
    const limparBusca = document.getElementById('limparBusca');

    let filtroAtivo = 'todos';
    let termoBusca = '';
    let arquivos = [];

    const CHAVE_FIXADOS = `arkhys:cofre:fixados:${user.id}`;

    function lerFixados() {
        try {
            return new Set(JSON.parse(localStorage.getItem(CHAVE_FIXADOS) || '[]'));
        } catch {
            return new Set();
        }
    }

    function salvarFixados(conjunto) {
        localStorage.setItem(CHAVE_FIXADOS, JSON.stringify([...conjunto]));
    }

    function alternarFixado(id) {
        const fixados = lerFixados();
        fixados.has(id) ? fixados.delete(id) : fixados.add(id);
        salvarFixados(fixados);
    }

    abasArquivos?.addEventListener('click', (e) => {
        const aba = e.target.closest('.aba-tarefa');
        if (!aba) return;
        filtroAtivo = aba.dataset.filtro;
        abasArquivos.querySelectorAll('.aba-tarefa').forEach(b => b.classList.toggle('ativa', b === aba));
        carregarArquivos();
    });

    campoBusca?.addEventListener('input', () => {
        termoBusca = campoBusca.value.trim().toLowerCase();
        if (limparBusca) limparBusca.hidden = termoBusca.length === 0;
        desenharLista();
    });

    limparBusca?.addEventListener('click', () => {
        campoBusca.value = '';
        termoBusca = '';
        limparBusca.hidden = true;
        desenharLista();
        campoBusca.focus();
    });

    btnEnviar.addEventListener('click', () => inputArquivo.click());

    inputArquivo.addEventListener('change', async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        btnEnviar.disabled = true;
        const { data, error } = await enviarERegistrarArquivo({
            usuarioId: user.id,
            arquivo,
            pasta: 'cofre',
            categoria: 'Geral'
        });
        btnEnviar.disabled = false;
        inputArquivo.value = '';

        if (error) {
            alert('Erro ao enviar: ' + error.message);
        } else {
            if (data?.registro?.id) await concederXp('upload_cofre', `arquivo:${data.registro.id}`, 5);
            carregarArquivos();
        }
    });

    async function carregarArquivos() {
        lista.innerHTML = '<div class="item-vazio">Carregando...</div>';

        let consulta = supabase
            .from('arquivos')
            .select('*, tarefas:referencia_tarefa_id ( titulo ), tipos_entrega:tipo_entrega_id ( nome )')
            .eq('usuario_id', user.id);

        if (filtroAtivo === 'entregas') consulta = consulta.eq('eh_entrega', true);
        if (filtroAtivo === 'anexos') consulta = consulta.or('eh_entrega.is.null,eh_entrega.eq.false');

        const { data, error } = await consulta.order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar arquivos:', error);
            lista.innerHTML = `<div class="item-vazio">Não foi possível carregar seus arquivos 😕</div>`;
            return;
        }

        arquivos = data || [];

        const caminhosImagem = arquivos.filter(a => ehImagem(a.nome_arquivo)).map(a => a.url_arquivo);
        arquivos.previas = await urlsAssinadasEmLote(caminhosImagem);

        desenharLista();
    }

    function descreverOrigem(arq) {
        const nomeTarefa = arq.tarefas?.titulo ? ': ' + arq.tarefas.titulo : '';
        if (arq.eh_entrega) {
            return `📤 Entrega${arq.tipos_entrega?.nome ? ' (' + arq.tipos_entrega.nome + ')' : ''}${nomeTarefa}`;
        }
        return arq.referencia_tarefa_id ? `📎 Anexo de tarefa${nomeTarefa}` : (arq.categoria || 'Geral');
    }

    function desenharLista() {
        const fixados = lerFixados();

        let itens = arquivos.filter(arq => {
            if (!termoBusca) return true;
            const alvo = `${arq.nome_arquivo} ${descreverOrigem(arq)}`.toLowerCase();
            return alvo.includes(termoBusca);
        });

        itens = [
            ...itens.filter(a => fixados.has(a.id)),
            ...itens.filter(a => !fixados.has(a.id))
        ];

        if (itens.length === 0) {
            const vazio = termoBusca
                ? `Nenhum anexo encontrado para “${campoBusca.value.trim()}” 🔍`
                : (filtroAtivo === 'entregas' ? 'Nenhuma entrega enviada ainda 📤' : 'Nenhum arquivo salvo ainda 📁');
            lista.innerHTML = `<div class="item-vazio">${vazio}</div>`;
            return;
        }

        const previas = arquivos.previas || {};

        lista.innerHTML = itens.map(arq => {
            const previa = previas[arq.url_arquivo];
            const icone = previa ? `<img src="${previa}" alt="">` : iconePorTipo(arq.nome_arquivo);
            const fixado = fixados.has(arq.id);

            return `
                <div class="item-tarefa ${fixado ? 'item-fixado' : ''}" data-id="${arq.id}" data-caminho="${arq.url_arquivo}" data-nome="${arq.nome_arquivo}">
                    <div class="item-icone ${previa ? 'com-imagem' : ''}">${icone}</div>
                    <div class="item-conteudo">
                        <h4>${fixado ? '<span class="marca-fixado" title="Fixado">📌</span> ' : ''}${arq.nome_arquivo}</h4>
                        <p>${descreverOrigem(arq)} • ${new Date(arq.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="item-acoes">
                        <button class="btn-acao fixar ${fixado ? 'ativo' : ''}" title="${fixado ? 'Desafixar' : 'Fixar'}">📌</button>
                        <button class="btn-acao renomear" title="Renomear">✏️</button>
                        <button class="btn-acao baixar" title="Baixar">⬇️</button>
                        <button class="btn-acao abrir" title="Abrir">👁</button>
                        <button class="btn-acao excluir" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function baixarArquivo(caminho, nome) {
        const { data, error } = await supabase.storage.from('arquivos').createSignedUrl(caminho, 60 * 10, { download: nome });
        if (error) {
            alert('Erro ao baixar arquivo: ' + error.message);
            return;
        }
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    lista.addEventListener('click', async (e) => {
        const item = e.target.closest('.item-tarefa');
        if (!item) return;
        const caminho = item.dataset.caminho;
        const id = item.dataset.id;
        const nome = item.dataset.nome;

        if (e.target.closest('.fixar')) {
            alternarFixado(id);
            desenharLista();
            return;
        }

        if (e.target.closest('.renomear')) {
            const novoNome = prompt('Novo nome do anexo (com a extensão):', nome);
            if (novoNome === null) return;
            const limpo = novoNome.trim();
            if (!limpo || limpo === nome) return;

            const { error } = await renomearArquivo(user.id, id, limpo);
            if (error) {
                alert('Erro ao renomear: ' + error.message);
                return;
            }
            const alvo = arquivos.find(a => String(a.id) === String(id));
            if (alvo) alvo.nome_arquivo = limpo;
            desenharLista();
            return;
        }

        if (!caminho) return;

        if (e.target.closest('.baixar')) {
            await baixarArquivo(caminho, nome);
            return;
        }

        if (e.target.closest('.abrir')) {
            const { data, error } = await supabase.storage.from('arquivos').createSignedUrl(caminho, 60 * 30);
            if (error) {
                alert('Erro ao abrir arquivo: ' + error.message);
                return;
            }
            abrirVisualizadorArquivo(data.signedUrl, nome);
            return;
        }

        if (e.target.closest('.excluir')) {
            if (!confirm('Excluir esse arquivo permanentemente? Se ele estiver anexado a uma tarefa, o anexo também será removido de lá.')) return;
            await removerArquivoPorCaminho(user.id, caminho);
            const fixados = lerFixados();
            fixados.delete(id);
            salvarFixados(fixados);
            carregarArquivos();
        }
    });

    carregarArquivos();
});
