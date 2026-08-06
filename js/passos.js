// Utilitários compartilhados de passos (checklist) das atividades.

export function passosDaTarefa(tarefa) {
    const lista = Array.isArray(tarefa?.subtarefas) ? tarefa.subtarefas : [];
    return lista.filter(passo => passo && passo.texto);
}

export function progressoPassos(tarefa) {
    const lista = passosDaTarefa(tarefa);
    const feitos = lista.filter(p => p.feita).length;
    return { total: lista.length, feitos, porcentagem: lista.length ? Math.round((feitos / lista.length) * 100) : 0 };
}

// Só é possível concluir se TODOS os passos cadastrados estiverem marcados.
export function podeConcluir(tarefa) {
    const { total, feitos } = progressoPassos(tarefa);
    return total === 0 || feitos === total;
}

export function motivoBloqueioConclusao(tarefa) {
    const { total, feitos } = progressoPassos(tarefa);
    if (total === 0 || feitos === total) return null;
    return `Conclua todos os passos antes de finalizar a atividade (${feitos} de ${total} marcados).`;
}

// Bloqueia a conclusão e avisa o usuário. Retorna true quando pode seguir.
export function validarConclusao(tarefa) {
    if (tarefa?.concluida) return true;
    const motivo = motivoBloqueioConclusao(tarefa);
    if (!motivo) return true;
    alert('⚠️ ' + motivo);
    return false;
}
