import { supabase } from './supabase-config.js';

export const XP_POR_DIFICULDADE = { facil: 15, medio: 30, dificil: 50 };
export const NOME_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

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

export async function buscarNiveis() {
    const { data, error } = await supabase.from('niveis_xp').select('*').order('nivel', { ascending: true });
    if (error) {
        console.error('Erro ao buscar níveis:', error.message);
        return [];
    }
    return data || [];
}

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

export async function concederXpDoDia(hojeISO) {
    await concederXp('login_diario', `dia:${hojeISO}`, 5);
}

export async function concederXpDiaPerfeito(hojeISO, tarefasDeHoje) {
    if (tarefasDeHoje.length === 0) return;
    if (tarefasDeHoje.every(t => t.concluida)) {
        await concederXp('dia_perfeito', `dia:${hojeISO}`, 20);
    }
}

const TEMPO_MINIMO_CONCLUSAO_MS = 2 * 60 * 1000;
const LIMITE_CONCLUSOES_NO_RITMO = 4;
const JANELA_RITMO_MS = 5 * 60 * 1000;
const CHAVE_RITMO_LOCAL = 'arkhys_ritmo_conclusoes';

function dentroDoLimiteDeRitmo() {
    const agora = Date.now();
    let historico = [];
    try {
        historico = JSON.parse(localStorage.getItem(CHAVE_RITMO_LOCAL)) || [];
    } catch {
        historico = [];
    }
    historico = historico.filter(t => agora - t < JANELA_RITMO_MS);

    if (historico.length >= LIMITE_CONCLUSOES_NO_RITMO) {
        localStorage.setItem(CHAVE_RITMO_LOCAL, JSON.stringify(historico));
        return false;
    }

    historico.push(agora);
    localStorage.setItem(CHAVE_RITMO_LOCAL, JSON.stringify(historico));
    return true;
}

export async function concederXpConclusaoTarefa(tarefa) {
    if (tarefa.created_at) {
        const criadaEm = new Date(tarefa.created_at).getTime();
        if (!Number.isNaN(criadaEm) && Date.now() - criadaEm < TEMPO_MINIMO_CONCLUSAO_MS) {
            console.info('XP de conclusão não concedido: tarefa concluída rápido demais após a criação (trava anti-farm).');
            return false;
        }
    }

    if (!dentroDoLimiteDeRitmo()) {
        console.info('XP de conclusão não concedido: limite de ritmo de conclusões atingido (trava anti-farm).');
        return false;
    }

    const xpBase = XP_POR_DIFICULDADE[tarefa.dificuldade] || XP_POR_DIFICULDADE.medio;
    await concederXp('tarefa_concluida', `tarefa:${tarefa.id}`, xpBase);

    const hoje = new Date().toISOString().split('T')[0];
    if (tarefa.data_entrega >= hoje) {
        await concederXp('tarefa_no_prazo', `tarefa:${tarefa.id}`, 10);
    }

    return true;
}
