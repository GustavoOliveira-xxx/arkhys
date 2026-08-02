import { supabase } from './supabase-config.js';
import { iconePorTipo, ehImagem, urlsAssinadasEmLote } from './midia.js';
import { enviarERegistrarArquivo, removerArquivoPorCaminho } from './arquivos-service.js';
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

    // Abre seletor de arquivos
    btnEnviar.addEventListener('click', () => inputArquivo.click());

    // Faz upload — envia para o storage e registra na tabela `arquivos`,
    // que é a mesma tabela usada pelos anexos das tarefas.
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

    // Carrega lista a partir da tabela `arquivos` (inclui os anexos lançados
    // automaticamente pelas tarefas cadastradas)
    async function carregarArquivos() {
        lista.innerHTML = '<div class="item-vazio">Carregando...</div>';

        const { data, error } = await supabase
            .from('arquivos')
            .select('*, tarefas:referencia_tarefa_id ( titulo )')
            .eq('usuario_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar arquivos:', error);
            lista.innerHTML = `<div class="item-vazio">Não foi possível carregar seus arquivos 😕</div>`;
            return;
        }

        if (!data || data.length === 0) {
            lista.innerHTML = `<div class="item-vazio">Nenhum arquivo salvo ainda 📁</div>`;
            return;
        }

        // Prévia (miniatura) das imagens, buscada em lote — o bucket é privado
        const caminhosImagem = data.filter(a => ehImagem(a.nome_arquivo)).map(a => a.url_arquivo);
        const urlsPrevia = await urlsAssinadasEmLote(caminhosImagem);

        lista.innerHTML = data.map(arq => {
            const previa = urlsPrevia[arq.url_arquivo];
            const icone = previa ? `<img src="${previa}" alt="">` : iconePorTipo(arq.nome_arquivo);
            const origem = arq.referencia_tarefa_id
                ? `📎 Anexo de tarefa${arq.tarefas?.titulo ? ': ' + arq.tarefas.titulo : ''}`
                : (arq.categoria || 'Geral');

            return `
                <div class="item-tarefa" data-id="${arq.id}" data-caminho="${arq.url_arquivo}">
                    <div class="item-icone ${previa ? 'com-imagem' : ''}">${icone}</div>
                    <div class="item-conteudo">
                        <h4>${arq.nome_arquivo}</h4>
                        <p>${origem} • ${new Date(arq.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="item-acoes">
                        <button class="btn-acao abrir" title="Abrir">👁</button>
                        <button class="btn-acao excluir" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Ações
    lista.addEventListener('click', async (e) => {
        const item = e.target.closest('.item-tarefa');
        if (!item) return;
        const caminho = item.dataset.caminho;
        if (!caminho) return;

        if (e.target.closest('.abrir')) {
            const { data, error } = await supabase.storage.from('arquivos').createSignedUrl(caminho, 60 * 30);
            if (error) {
                alert('Erro ao abrir arquivo: ' + error.message);
                return;
            }
            window.open(data.signedUrl, '_blank');
        }

        if (e.target.closest('.excluir')) {
            if (!confirm('Excluir esse arquivo permanentemente? Se ele estiver anexado a uma tarefa, o anexo também será removido de lá.')) return;
            await removerArquivoPorCaminho(user.id, caminho);
            carregarArquivos();
        }
    });

    carregarArquivos();
});