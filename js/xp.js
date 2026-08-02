import { supabase } from './supabase-config.js';
import { buscarNiveis, calcularProgresso, concederXpDoDia } from './xp-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    await concederXpDoDia(hoje);

    const [{ data: perfil }, niveis] = await Promise.all([
        supabase.from('perfil').select('xp_total, nivel_atual').eq('usuario_id', user.id).maybeSingle(),
        buscarNiveis()
    ]);

    const xpTotal = perfil?.xp_total || 0;
    const nivelAtual = perfil?.nivel_atual || 1;

    // ==================================================
    // CARD DO NÍVEL ATUAL
    // ==================================================
    if (niveis.length) {
        const progresso = calcularProgresso(xpTotal, niveis);
        document.getElementById('seloNivelAtual').textContent = nivelAtual;
        document.getElementById('tituloNivelAtual').textContent = progresso.atual?.nome_titulo || '—';
        document.getElementById('barraXpGrande').style.width = `${progresso.porcentagem}%`;

        const textoProgresso = progresso.proximo
            ? `${xpTotal} XP — faltam ${progresso.faltam} XP para o Nível ${progresso.proximo.nivel} (${progresso.proximo.nome_titulo})`
            : `${xpTotal} XP — nível máximo alcançado! 🏆`;
        document.getElementById('progressoNivelTexto').textContent = textoProgresso;
    }

    // ==================================================
    // TRILHA DOS 15 NÍVEIS
    // ==================================================
    const trilha = document.getElementById('trilhaNiveis');
    if (!niveis.length) {
        trilha.innerHTML = '<p class="metadado">Não foi possível carregar os níveis.</p>';
        return;
    }

    trilha.innerHTML = niveis.map(n => {
        const conquistado = n.nivel <= nivelAtual;
        const atual = n.nivel === nivelAtual;
        return `
            <div class="degrau-nivel ${conquistado ? 'conquistado' : 'bloqueado'} ${atual ? 'atual' : ''}">
                <div class="degrau-nivel-numero">${conquistado ? n.nivel : '🔒'}</div>
                <div class="degrau-nivel-info">
                    <strong>${n.nome_titulo}</strong>
                    <span class="metadado">Nível ${n.nivel} • a partir de ${n.xp_minimo} XP</span>
                </div>
                ${atual ? '<span class="status prazo-hoje">Você está aqui</span>' : ''}
            </div>
        `;
    }).join('');
});