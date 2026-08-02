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
export async function enviarERegistrarArquivo({ usuarioId, arquivo, pasta = '', categoria = 'Geral', referenciaTarefaId = null }) {
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