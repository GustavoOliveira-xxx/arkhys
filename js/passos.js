export function passosDaTarefa(tarefa) {
    const lista = Array.isArray(tarefa?.subtarefas) ? tarefa.subtarefas : [];
    return lista.filter(passo => passo && passo.texto);
}

export function progressoPassos(tarefa) {
    const lista = passosDaTarefa(tarefa);
    const feitos = lista.filter(passo => passo.feita).length;
    return {
        total: lista.length,
        feitos,
        restantes: lista.length - feitos,
        porcentagem: lista.length ? Math.round((feitos / lista.length) * 100) : 0
    };
}

export function podeConcluirTarefa(tarefa) {
    return progressoPassos(tarefa).restantes === 0;
}

export function avisoPassosPendentes(tarefa) {
    const { restantes, total } = progressoPassos(tarefa);
    return `Ainda faltam ${restantes} de ${total} passos. Marque todos os passos em "Saiba mais" para poder concluir esta atividade.`;
}

export function nomeResponsavel(usuario) {
    const nome = usuario?.user_metadata?.nome_completo;
    if (nome && nome.trim()) return nome.trim();
    if (usuario?.email) return usuario.email.split('@')[0];
    return 'Responsável';
}
