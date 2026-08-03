// ==================================================
// SERVIÇO DO COFRE DE ARQUIVOS
// Centraliza o registro/remoção de arquivos tanto no Storage
// quanto na tabela `arquivos`, para que qualquer arquivo enviado
// em qualquer parte do sistema (tarefas, cofre, etc.) fique
// sempre visível e gerenciável a partir do Cofre.
// ==================================================
import { supabase } from './supabase-config.js';
import { nomeArquivoSeguro } from './midia.js';

// Envia um arquivo para o bucket privado "arquivos" e registra a
// referência na tabela `arquivos`, para aparecer no Cofre.
export async function enviarERegistrarArquivo({ usuarioId, arquivo, pasta = '', categoria = 'Geral', referenciaTarefaId = null, tipoEntregaId = null, ehEntrega = false }) {
    const caminho = `${usuarioId}/${pasta ? pasta + '/' : ''}${Date.now()}_${nomeArquivoSeguro(arquivo.name)}`;

    const { error: erroUpload } = await supabase.storage.from('arquivos').upload(caminho, arquivo);
    if (erroUpload) return { error: erroUpload };

    const { data: registro, error: erroRegistro } = await supabase
        .from('arquivos')
        .insert({
            nome_arquivo: arquivo.name,
            categoria,
            url_arquivo: caminho,
            referencia_tarefa_id: referenciaTarefaId,
            tipo_entrega_id: tipoEntregaId,
            eh_entrega: ehEntrega,
            usuario_id: usuarioId
        })
        .select()
        .single();

    if (erroRegistro) {
        // Se não conseguiu registrar no Cofre, desfaz o upload para não deixar órfão
        await supabase.storage.from('arquivos').remove([caminho]);
        return { error: erroRegistro };
    }

    return { data: { caminho, registro } };
}

// Remove um arquivo do storage e da tabela `arquivos` a partir do caminho salvo.
// Se o arquivo estiver vinculado a uma tarefa, o vínculo é limpo na tarefa também.
export async function removerArquivoPorCaminho(usuarioId, caminho) {
    if (!caminho) return;

    const { data: registro } = await supabase
        .from('arquivos')
        .select('id, referencia_tarefa_id')
        .eq('usuario_id', usuarioId)
        .eq('url_arquivo', caminho)
        .maybeSingle();

    await supabase.storage.from('arquivos').remove([caminho]);

    if (registro) {
        await supabase.from('arquivos').delete().eq('id', registro.id);
        if (registro.referencia_tarefa_id) {
            await supabase
                .from('tarefas')
                .update({ anexo_path: null, anexo_nome: null, anexo_tipo: null })
                .eq('id', registro.referencia_tarefa_id)
                .eq('usuario_id', usuarioId);
        }
    }
}

// Atualiza o vínculo referencia_tarefa_id de um registro de arquivo já existente
// (usado quando uma tarefa nova é criada e só recebe o ID depois do upload do anexo).
export async function vincularArquivoATarefa(caminho, tarefaId) {
    if (!caminho || !tarefaId) return;
    await supabase.from('arquivos').update({ referencia_tarefa_id: tarefaId }).eq('url_arquivo', caminho);
}

// ==================================================
// MÚLTIPLOS ANEXOS POR TAREFA
// A tabela `arquivos` já vincula vários registros à mesma tarefa via
// referencia_tarefa_id (relação 1-para-muitos), então não precisa de
// nenhuma mudança de schema — só de funções que busquem todos os
// anexos de uma tarefa (ou de várias, em lote).
// ==================================================

// Lista todos os anexos de UMA tarefa (usado no modal "Saiba mais",
// na impressão e na edição do formulário).
export async function listarAnexosDaTarefa(tarefaId) {
    if (!tarefaId) return [];
    const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .eq('referencia_tarefa_id', tarefaId)
        // só os anexos/enunciados — as entregas têm listagem própria
        .or('eh_entrega.is.null,eh_entrega.eq.false')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao listar anexos da tarefa:', error.message);
        return [];
    }
    return data || [];
}

// Lista as ENTREGAS de uma tarefa (arquivos com eh_entrega = true),
// devolvendo um mapa { tipo_entrega_id: [arquivos] } para montar
// um "espaço" de upload por tipo de entrega no modal "Saiba mais".
export async function listarEntregasDaTarefa(tarefaId) {
    if (!tarefaId) return {};
    const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .eq('referencia_tarefa_id', tarefaId)
        .eq('eh_entrega', true)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao listar entregas da tarefa:', error.message);
        return {};
    }

    const mapa = {};
    (data || []).forEach(arq => {
        const chave = arq.tipo_entrega_id ?? 'sem_tipo';
        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(arq);
    });
    return mapa;
}

// Busca os TIPOS DE ENTREGA de um usuário (cadastro), opcionalmente
// filtrando por uma lista de ids (tarefa.tipos_entrega_ids).
export async function listarTiposEntrega(usuarioId, ids = null) {
    let consulta = supabase.from('tipos_entrega').select('*').eq('usuario_id', usuarioId);
    if (Array.isArray(ids)) {
        if (ids.length === 0) return [];
        consulta = consulta.in('id', ids);
    }
    const { data, error } = await consulta.order('nome', { ascending: true });
    if (error) {
        console.error('Erro ao listar tipos de entrega:', error.message);
        return [];
    }
    return data || [];
}

// Busca os anexos de VÁRIAS tarefas de uma vez (uma consulta só),
// devolvendo um mapa { tarefaId: [anexos] } — usado pra montar os
// badges de anexo na lista de tarefas sem fazer uma chamada por item.
export async function mapaAnexosPorTarefa(tarefaIds = []) {
    const unicos = [...new Set(tarefaIds.filter(Boolean))];
    const mapa = {};
    if (unicos.length === 0) return mapa;

    const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .in('referencia_tarefa_id', unicos)
        .or('eh_entrega.is.null,eh_entrega.eq.false')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar anexos em lote:', error.message);
        return mapa;
    }

    (data || []).forEach(anexo => {
        const chave = anexo.referencia_tarefa_id;
        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(anexo);
    });
    return mapa;
}