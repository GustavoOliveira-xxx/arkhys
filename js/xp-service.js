// ==================================================
// SERVIÇO DE XP — ponto único de concessão de XP.
// Usa a função `conceder_xp` do banco (idempotente: cada
// combinação usuario+motivo+referência só soma uma vez,
// então não dá pra "farmar" XP repetindo a mesma ação).
// ==================================================
import { supabase } from './supabase-config.js';

// XP por dificuldade de tarefa — quanto mais difícil, mais XP ao concluir
export const XP_POR_DIFICULDADE = { facil: 15, medio: 30, dificil: 50 };
export const NOME_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/**
 * Concede XP ao usuário logado por um motivo específico.
 * @param {string} motivo - categoria do evento (ex: 'tarefa_concluida')
 * @param {string} referencia - identificador único do alvo (ex: 'tarefa:42'), garante que não duplica
 * @param {number} quantidade - quanto de XP conceder se for a primeira vez
 * @returns {Promise<number|null>} o xp_total atualizado, ou null se falhou
 */
export async function concederXp(motivo, referencia, quantidade) {
    const { data, error } = await supabase.rpc('conceder_xp', {
        p_motivo: motivo,
        p_referencia: String(referencia),
        p_quantidade: quantidade
    });
    if (error) {
        console.error(`Erro ao conceder XP (${motivo}):`, error.message);
        return null;
    }
    return data;
}

// Busca os 15 níveis (nome + xp mínimo), usado na página de XP e para
// calcular o progresso do usuário até o próximo nível
export async function buscarNiveis() {
    const { data, error } = await supabase.from('niveis_xp').select('*').order('nivel', { ascending: true });
    if (error) {
        console.error('Erro ao buscar níveis:', error.message);
        return [];
    }
    return data || [];
}

// Calcula o progresso do usuário dentro do nível atual, dado o XP total e a lista de níveis
export function calcularProgresso(xpTotal, niveis) {
    const atual = [...niveis].reverse().find(n => xpTotal >= n.xp_minimo) || niveis[0];
    const indiceAtual = niveis.findIndex(n => n.nivel === atual?.nivel);
    const proximo = niveis[indiceAtual + 1] || null;

    if (!proximo) {
        return { atual, proximo: null, porcentagem: 100, faltam: 0 };
    }

    const faixa = proximo.xp_minimo - atual.xp_minimo;
    const progressoNaFaixa = xpTotal - atual.xp_minimo;
    const porcentagem = Math.max(0, Math.min(100, Math.round((progressoNaFaixa / faixa) * 100)));

    return { atual, proximo, porcentagem, faltam: proximo.xp_minimo - xpTotal };
}

/**
 * Concede o "login diário" (uma vez por dia, só por abrir o app) e verifica
 * se completar hoje as tarefas do dia rende o bônus de "Dia perfeito".
 * Chamado a partir da página Início.
 */
export async function concederXpDoDia(hojeISO) {
    await concederXp('login_diario', `dia:${hojeISO}`, 5);
}

export async function concederXpDiaPerfeito(hojeISO, tarefasDeHoje) {
    if (tarefasDeHoje.length === 0) return;
    if (tarefasDeHoje.every(t => t.concluida)) {
        await concederXp('dia_perfeito', `dia:${hojeISO}`, 20);
    }
}
