import { supabase } from './supabase-config.js';

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

    // Faz upload
    inputArquivo.addEventListener('change', async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        const caminho = `${user.id}/${Date.now()}_${arquivo.name}`;

        const { error } = await supabase.storage
            .from('arquivos')
            .upload(caminho, arquivo);

        if (error) alert('Erro ao enviar: ' + error.message);
        else carregarArquivos();
    });

    // Carrega lista
    async function carregarArquivos() {
        const { data, error } = await supabase.storage
            .from('arquivos')
            .list(user.id, { sortBy: { column: 'created_at', order: 'desc' } });

        if (error || data.length === 0) {
            lista.innerHTML = `<div class="item-vazio">Nenhum arquivo salvo ainda 📁</div>`;
            return;
        }

        lista.innerHTML = data.map(arq => {
            const caminho = `${user.id}/${arq.name}`;
            const extensao = arq.name.split('.').pop().toLowerCase();
            const icone = extensao === 'pdf' ? '📕' : ['jpg','png','jpeg'].includes(extensao) ? '🖼️' : '📄';

            return `
                <div class="item-tarefa">
                    <div class="item-icone">${icone}</div>
                    <div class="item-conteudo">
                        <h4>${arq.name.replace(/^[0-9]+_/, '')}</h4>
                        <p>Adicionado em ${new Date(arq.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="item-acoes">
                        <button class="btn-acao abrir" data-caminho="${caminho}" title="Abrir">👁</button>
                        <button class="btn-acao excluir" data-caminho="${caminho}" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Ações
    lista.addEventListener('click', async (e) => {
        const caminho = e.target.dataset.caminho;
        if (!caminho) return;

        if (e.target.classList.contains('abrir')) {
            const { data } = await supabase.storage.from('arquivos').createSignedUrl(caminho, 60 * 30);
            window.open(data.signedUrl, '_blank');
        }

        if (e.target.classList.contains('excluir') && confirm('Excluir esse arquivo permanentemente?')) {
            await supabase.storage.from('arquivos').remove([caminho]);
            carregarArquivos();
        }
    });

    carregarArquivos();
});