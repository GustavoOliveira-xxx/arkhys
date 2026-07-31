import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pegar dados do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Saudação personalizada
    const nomeUsuario = user.user_metadata?.nome_completo?.split(' ')[0] || 'Usuário';
    document.getElementById('saudacaoUsuario').textContent = `Bem-vindo(a), ${nomeUsuario}`;

    // 2. Buscar dados do banco
    const hoje = new Date().toISOString().split('T')[0];

    // Tarefas pendentes
    const { data: tarefas, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('usuario_id', user.id)
        .is('concluida', false)
        .order('data_entrega', { ascending: true });

    if (error) {
        console.error('Erro ao carregar tarefas:', error);
        return;
    }

    // Separar contadores
    const pendentes = tarefas.length;
    const paraHoje = tarefas.filter(t => t.data_entrega === hoje).length;
    const proximas = tarefas.filter(t => t.data_entrega > hoje).slice(0, 3);

    // Atualizar os cards
    document.getElementById('qtdPendentes').textContent = pendentes;
    document.getElementById('qtdHoje').textContent = `${paraHoje} para hoje`;
    document.getElementById('qtdEntregas').textContent = proximas.length;

    // Dados de XP e Nível
    const { data: perfil } = await supabase
        .from('perfil')
        .select('xp, nivel')
        .eq('usuario_id', user.id)
        .single();

    if (perfil) {
        document.getElementById('xpTotal').textContent = perfil.xp;
        document.getElementById('nivelAtual').textContent = `Nível ${perfil.nivel}`;
        const porcentagem = Math.min((perfil.xp % 1000) / 10, 100);
        document.getElementById('barraXp').style.width = `${porcentagem}%`;
    }

    // Preencher lista "O que fazer hoje"
    const listaHoje = document.getElementById('listaHoje');
    const tarefasHoje = tarefas.filter(t => t.data_entrega === hoje);

    if (tarefasHoje.length === 0) {
        listaHoje.innerHTML = `<div class="item-vazio">Nenhum compromisso para hoje 🎉</div>`;
    } else {
        listaHoje.innerHTML = tarefasHoje.map(t => `
            <div class="item-tarefa">
                <div class="item-icone">📝</div>
                <div class="item-conteudo">
                    <h4>${t.titulo}</h4>
                    <p>${t.descricao || 'Sem observações'}</p>
                </div>
                <span class="status prazo-hoje">Hoje</span>
            </div>
        `).join('');
    }

    // Preencher "Próximas atividades"
    const listaProximas = document.getElementById('listaProximas');
    if (proximas.length === 0) {
        listaProximas.innerHTML = `<div class="item-vazio">Nenhuma atividade futura cadastrada</div>`;
    } else {
        listaProximas.innerHTML = proximas.map(t => {
            const data = new Date(t.data_entrega);
            const dias = Math.ceil((data - new Date()) / (1000 * 60 * 60 * 24));
            return `
                <div class="item-tarefa">
                    <div class="item-icone">📅</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${dias === 1 ? 'Amanhã' : `Em ${dias} dias`}</p>
                    </div>
                    <span class="status proximo">Próximo</span>
                </div>
            `;
        }).join('');
    }
});