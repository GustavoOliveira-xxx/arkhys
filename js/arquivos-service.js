import { supabase } from './supabase-config.js';
import { nomeArquivoSeguro } from './midia.js';

export async function enviarERegistrarArquivo({ usuarioId, arquivo, pasta = '', categoria = 'Geral', referenciaTarefaId = null, referenciaRegistroId = null, tipoEntregaId = null, ehEntrega = false }) {
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
            referencia_registro_id: referenciaRegistroId,
            tipo_entrega_id: tipoEntregaId,
            eh_entrega: ehEntrega,
            usuario_id: usuarioId
        })
        .select()
        .single();

    if (erroRegistro) {

        await supabase.storage.from('arquivos').remove([caminho]);
        return { error: erroRegistro };
    }

    return { data: { caminho, registro } };
}

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

export async function vincularArquivoATarefa(caminho, tarefaId) {
    if (!caminho || !tarefaId) return;
    await supabase.from('arquivos').update({ referencia_tarefa_id: tarefaId }).eq('url_arquivo', caminho);
}

export async function listarAnexosDaTarefa(tarefaId) {
    if (!tarefaId) return [];
    const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .eq('referencia_tarefa_id', tarefaId)

        .or('eh_entrega.is.null,eh_entrega.eq.false')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao listar anexos da tarefa:', error.message);
        return [];
    }
    return data || [];
}

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

export async function renomearArquivo(usuarioId, arquivoId, novoNome) {
    const nome = (novoNome || '').trim();
    if (!nome) return { error: { message: 'Informe um nome válido.' } };

    const { data: registro, error } = await supabase
        .from('arquivos')
        .update({ nome_arquivo: nome })
        .eq('id', arquivoId)
        .eq('usuario_id', usuarioId)
        .select()
        .single();

    if (error) return { error };

    if (registro?.referencia_tarefa_id) {
        await supabase
            .from('tarefas')
            .update({ anexo_nome: nome })
            .eq('id', registro.referencia_tarefa_id)
            .eq('usuario_id', usuarioId)
            .eq('anexo_path', registro.url_arquivo);
    }

    return { data: registro };
}

export async function listarAnexosDoRegistro(registroId) {
    if (!registroId) return [];
    const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .eq('referencia_registro_id', registroId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao listar anexos do registro:', error.message);
        return [];
    }
    return data || [];
}

export async function mapaAnexosPorRegistro(registroIds = []) {
    const unicos = [...new Set(registroIds.filter(Boolean))];
    const mapa = {};
    if (unicos.length === 0) return mapa;

    const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .in('referencia_registro_id', unicos)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar anexos de registros:', error.message);
        return mapa;
    }

    (data || []).forEach(anexo => {
        const chave = anexo.referencia_registro_id;
        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(anexo);
    });
    return mapa;
}
