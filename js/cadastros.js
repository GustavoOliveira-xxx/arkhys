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

    // Mapeamento de modais para tabelas e containers
    const configModais = {
        'modalMaterias': { tabela: 'materias', container: 'listaMaterias' },
        'modalOrgaos': { tabela: 'orgaos', container: 'listaOrgaos' },
        'modalFerramentas': { tabela: 'ferramentas', container: 'listaFerramentas' },
        'modalMembros': { tabela: 'membros', container: 'listaMembros' }
    };

    // Função para carregar listas
    async function carregarLista(idModal) {
        const config = configModais[idModal];
        if (!config) return;

        const container = document.getElementById(config.container);
        container.innerHTML = '<div class="lista-vazia">Carregando...</div>';

        const { data, error } = await supabase
            .from(config.tabela)
            .select('*')
            .eq('usuario_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = `<div class="lista-vazia">Erro ao carregar: ${error.message}</div>`;
            return;
        }

        if (!data || data.length === 0) {
            const mensagensVazio = {
                'materias': 'Nenhuma matéria cadastrada.',
                'orgaos': 'Nenhum órgão cadastrado.',
                'ferramentas': 'Nenhuma ferramenta cadastrada.',
                'membros': 'Nenhum membro cadastrado.'
            };
            container.innerHTML = `<div class="lista-vazia">${mensagensVazio[config.tabela]}</div>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-cadastro';
            
            let detalhes = '';
            if (config.tabela === 'orgaos' && item.descricao) detalhes = item.descricao;
            else if (config.tabela === 'ferramentas' && item.tipo) detalhes = item.tipo;
            else if (config.tabela === 'membros' && item.funcao) detalhes = item.funcao;

            div.innerHTML = `
                <div class="item-info">
                    <span class="item-nome">${item.nome}</span>
                    ${detalhes ? `<span class="item-detalhe">${detalhes}</span>` : ''}
                </div>
                <button class="btn-deletar" title="Excluir" data-id="${item.id}" data-tabela="${config.tabela}" data-modal="${idModal}">
                    ✕
                </button>
            `;
            container.appendChild(div);
        });

        // Adiciona evento de deletar
        container.querySelectorAll('.btn-deletar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const tabela = e.target.dataset.tabela;
                const modal = e.target.dataset.modal;

                if (confirm('Tem certeza que deseja excluir este item?')) {
                    const { error } = await supabase.from(tabela).delete().eq('id', id);
                    if (error) alert('Erro ao excluir: ' + error.message);
                    else carregarLista(modal);
                }
            });
        });
    }

    // Abre modais e carrega lista
    botoesCard.forEach(botao => {
        botao.addEventListener('click', () => {
            const idModal = botao.dataset.modal;
            document.getElementById(idModal).hidden = false;
            carregarLista(idModal);
        });
    });

    // Fecha modais
    botoesFechar.forEach(btn => {
        btn.addEventListener('click', () => {
            modais.forEach(m => m.hidden = true);
        });
    });

    // ==================================================
    // SALVAMENTO (MATÉRIAS, ÓRGÃOS, FERRAMENTAS, MEMBROS)
    // ==================================================
    const setupForm = (formId, table, modalId) => {
        const form = document.getElementById(formId);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = form.querySelectorAll('input, textarea');
            const data = { usuario_id: user.id };
            
            if (table === 'materias') data.nome = inputs[0].value.trim();
            else if (table === 'orgaos') {
                data.nome = inputs[0].value.trim();
                data.descricao = inputs[1].value.trim();
            } else if (table === 'ferramentas') {
                data.nome = inputs[0].value.trim();
                data.tipo = inputs[1].value.trim();
            } else if (table === 'membros') {
                data.nome = inputs[0].value.trim();
                data.funcao = inputs[1].value.trim();
            }

            const { error } = await supabase.from(table).insert(data);
            if (error) alert('Erro: ' + error.message);
            else {
                form.reset();
                carregarLista(modalId);
            }
        });
    };

    setupForm('formMaterias', 'materias', 'modalMaterias');
    setupForm('formOrgaos', 'orgaos', 'modalOrgaos');
    setupForm('formFerramentas', 'ferramentas', 'modalFerramentas');
    setupForm('formMembros', 'membros', 'modalMembros');
});
