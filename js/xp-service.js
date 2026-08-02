// ==================================================
// SERVIÇO DE XP E NÍVEIS — ARKHYS
// Usa as tabelas já existentes no banco:
//   - `niveis_xp` (nivel, nome_titulo, xp_minimo) — os 15 níveis
//   - `eventos_xp` (usuario_id, motivo, referencia, quantidade) —
//      ledger de XP, também usado para evitar conceder o mesmo XP
//      duas vezes (ex: concluir/reabrir/concluir a mesma tarefa)
//   - `perfil` (xp_total, nivel_atual) — saldo atual do usuário
//   - `tarefas.xp_ganho` — quanto de XP aquela tarefa já rendeu
// ==================================================
import { supabase } from './supabase-config.js';

// --------------------------------------------------
// XP CONCEDIDO POR AÇÃO
// O usuário ganha XP usando o sistema de várias formas, não só
// concluindo tarefas — isso incentiva o uso completo do Arkhys.
// --------------------------------------------------
export const XP_DIFICULDADE = { facil: 15, medio: 30, dificil: 60 };
export const XP_ACOES = {
    TAREFA_CRIADA: 5,
    TAREFA_PONTUAL: 10,     // bônus por concluir no prazo (não atrasada)
    ANEXO_ENVIADO: 5,
    NOVO_CADASTRO: 5,       // matéria / membro / ferramenta / órgão
    ACESSO_DIARIO: 10       // primeiro acesso do dia (streak)
};

const RUBRICAS = {
    facil: 'Tarefa fácil concluída',
    medio: 'Tarefa média concluída',
    dificil: 'Tarefa difícil concluída'
};

// --------------------------------------------------
// CARREGA OS 15 NÍVEIS (com cache em memória por sessão de página)
// --------------------------------------------------
let _niveisCache = null;

export async function carregarNiveis() {
    if (_niveisCache) return _niveisCache;
    const { data, error } = await supabase
        .from('niveis_xp')
        .select('nivel, nome_titulo, xp_minimo')
        .order('nivel', { ascending: true });

    _niveisCache = (!error && data && data.length) ? data : [{ nivel: 1, nome_titulo: 'Iniciante', xp_minimo: 0 }];
    return _niveisCache;
}

// Dado um total de XP, retorna o objeto do nível atual (precisa dos níveis já carregados)
export function calcularNivel(xpTotal, niveis) {
    let atual = niveis[0];
    for (const n of niveis) {
        if (xpTotal >= n.xp_minimo) atual = n;
        else break;
    }
    return atual;
}

export function proximoNivel(nivelAtual, niveis) {
    return niveis.find(n => n.nivel === nivelAtual + 1) || null;
}

// Progresso (0–100) dentro do nível atual, rumo ao próximo
export function progressoNivel(xpTotal, niveis) {
    const atual = calcularNivel(xpTotal, niveis);
    const proximo = proximoNivel(atual.nivel, niveis);
    if (!proximo) return { porcentagem: 100, faltam: 0, atual, proximo: null };

    const faixa = proximo.xp_minimo - atual.xp_minimo;
    const progresso = xpTotal - atual.xp_minimo;
    const porcentagem = Math.max(0, Math.min(100, Math.round((progresso / faixa) * 100)));
    return { porcentagem, faltam: proximo.xp_minimo - xpTotal, atual, proximo };
}

// --------------------------------------------------
// CONCEDE XP AO USUÁRIO
// `referencia` identifica a ação de forma única (ex: "tarefa-12-conclusao",
// "acesso-2026-08-02") — se já existir um evento com essa referência para
// o usuário, o XP não é concedido de novo (evita farm por toggle/reload).
// --------------------------------------------------
export async function ganharXp(usuarioId, quantidade, motivo = '', referencia = null) {
    if (!usuarioId || !quantidade) return null;

    const { data: perfilAntes } = await supabase
        .from('perfil')
        .select('xp_total, nivel_atual')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

    const xpAntes = perfilAntes?.xp_total || 0;
    const nivelAnterior = perfilAntes?.nivel_atual || 1;

    // Chama a função do banco (SECURITY DEFINER + auth.uid()) — atômica e
    // já protegida contra XP duplicado via UNIQUE (usuario_id, motivo, referencia)
    const { data: novoXp, error } = await supabase.rpc('conceder_xp', {
        p_motivo: motivo,
        p_referencia: referencia,
        p_quantidade: quantidade
    });

    if (error) {
        console.error('Erro ao conceder XP:', error);
        return null;
    }

    // Se o XP não mudou, essa ação já tinha sido recompensada antes (referência duplicada)
    if (novoXp === xpAntes) return null;

    const niveis = await carregarNiveis();
    const novoNivelObj = calcularNivel(novoXp, niveis);
    const subiuDeNivel = novoNivelObj.nivel > nivelAnterior;

    mostrarToastXp(quantidade, motivo, subiuDeNivel ? novoNivelObj : null);

    return { xpTotal: novoXp, nivel: novoNivelObj.nivel, subiuDeNivel, nomeNivel: novoNivelObj.nome_titulo };
}

// XP de conclusão de tarefa, conforme a dificuldade + bônus de pontualidade.
// Também grava `tarefas.xp_ganho` para exibir depois em "Saiba mais".
export async function ganharXpPorConclusaoDeTarefa(usuarioId, tarefa) {
    const chave = ['facil', 'medio', 'dificil'].includes(tarefa.dificuldade) ? tarefa.dificuldade : 'medio';
    const hoje = new Date().toISOString().split('T')[0];
    const pontual = tarefa.data_entrega >= hoje;

    let total = XP_DIFICULDADE[chave];
    let motivo = RUBRICAS[chave];
    if (pontual) {
        total += XP_ACOES.TAREFA_PONTUAL;
        motivo += ' (no prazo)';
    }

    const resultado = await ganharXp(usuarioId, total, motivo, `tarefa-${tarefa.id}-conclusao`);
    if (resultado) {
        await supabase.from('tarefas').update({ xp_ganho: total }).eq('id', tarefa.id);
    }
    return resultado;
}

// Bônus de acesso diário — concede XP só uma vez por dia (checagem via eventos_xp)
export async function verificarAcessoDiario(usuarioId) {
    const hoje = new Date().toISOString().split('T')[0];
    return ganharXp(usuarioId, XP_ACOES.ACESSO_DIARIO, 'Acesso diário', `acesso-${hoje}`);
}

// --------------------------------------------------
// TOAST VISUAL DE XP
// Criado dinamicamente (mesmo padrão do modal "Saiba mais"), some
// sozinho após alguns segundos. Funciona em qualquer página que
// importe este módulo.
// --------------------------------------------------
let filaToast = Promise.resolve();

export function mostrarToastXp(quantidade, motivo, levelUp = null) {
    filaToast = filaToast.then(() => new Promise((resolve) => {
        const toast = document.createElement('div');
        toast.className = 'toast-xp';
        toast.innerHTML = `
            <div class="toast-xp-linha">
                <span class="toast-xp-icone">⚡</span>
                <span class="toast-xp-texto">+${quantidade} XP${motivo ? ` · ${motivo}` : ''}</span>
            </div>
            ${levelUp ? `<div class="toast-xp-levelup">🏆 Novo nível: ${levelUp.nome_titulo}</div>` : ''}
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visivel'));

        const duracao = levelUp ? 4200 : 2600;
        setTimeout(() => {
            toast.classList.remove('visivel');
            setTimeout(() => { toast.remove(); resolve(); }, 350);
        }, duracao);
    }));
}
