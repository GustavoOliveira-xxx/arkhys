import { supabase } from './supabase-config.js';
import { carregarNiveis, progressoNivel, verificarAcessoDiario } from './xp-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Garante que o bônus de acesso diário também seja avaliado aqui
    // (caso o usuário entre direto nesta página).
    await verificarAcessoDiario(user.id);

    const niveis = await carregarNiveis();

    let { data: perfil } = await supabase
        .from('perfil')
        .select('xp_total, nivel_atual')
        .eq('usuario_id', user.id)
        .maybeSingle();

    if (!perfil) {
        const { data: novoPerfil } = await supabase
            .from('perfil')
            .insert({ usuario_id: user.id, xp_total: 0, nivel_atual: 1 })
            .select()
            .single();
        perfil = novoPerfil;
    }

    const xpTotal = perfil?.xp_total || 0;
    const { porcentagem, faltam, atual, proximo } = progressoNivel(xpTotal, niveis);

    document.getElementById('nomeNivelAtual').textContent = atual.nome_titulo;
    document.getElementById('numeroNivelAtual').textContent = atual.nivel;
    document.getElementById('barraXpGrande').style.width = `${porcentagem}%`;
    document.getElementById('xpAtualTexto').textContent = `${xpTotal} XP`;
    document.getElementById('xpFaltamTexto').textContent = proximo
        ? `Faltam ${faltam} XP para ${proximo.nome_titulo}`
        : 'Nível máximo alcançado 🏆';

    // Desenha a grade com os 15 níveis
    const gradeNiveis = document.getElementById('gradeNiveis');
    gradeNiveis.innerHTML = niveis.map(n => {
        const desbloqueado = xpTotal >= n.xp_minimo;
        const ehAtual = n.nivel === atual.nivel;
        const classe = ehAtual ? 'atual' : (desbloqueado ? 'desbloqueado' : 'bloqueado');
        return `
            <div class="cartao-nivel ${classe}">
                <div class="cartao-nivel-numero">${n.nivel}</div>
                <div class="cartao-nivel-nome">${n.nome_titulo}</div>
                <div class="cartao-nivel-xp">${n.xp_minimo} XP</div>
                ${ehAtual ? '<span class="cartao-nivel-tag">Você está aqui</span>' : ''}
                ${!desbloqueado ? '<span class="cartao-nivel-cadeado">🔒</span>' : ''}
            </div>
        `;
    }).join('');
});
