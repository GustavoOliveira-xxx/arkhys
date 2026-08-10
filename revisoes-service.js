import { supabase } from './supabase-config.js';
import { concederXp } from './xp-service.js';

export const INTERVALOS = [1, 3, 7, 14, 30];

export const ROTULO_TIPO = {
    aprendizado: 'Aprendizado',
    duvida: 'Dúvida'
};

export function dataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function hojeISO() {
    return dataISO(new Date());
}

export function somarDias(iso, dias) {
    const data = new Date(`${iso}T00:00:00`);
    data.setDate(data.getDate() + dias);
    return dataISO(data);
}

export function diferencaEmDias(iso, referencia = hojeISO()) {
    const alvo = new Date(`${iso}T00:00:00`).getTime();
    const base = new Date(`${referencia}T00:00:00`).getTime();
    return Math.round((alvo - base) / 86400000);
}

export function formatarData(iso) {
    if (!iso) return '—';
    return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

export function rotuloPrazo(iso) {
    const dias = diferencaEmDias(iso);
    if (dias === 0) return 'Revisar hoje';
    if (dias === 1) return 'Amanhã';
    if (dias === -1) return 'Atrasada 1 dia';
    if (dias < 0) return `Atrasada ${Math.abs(dias)} dias`;
    return `Em ${dias} dias`;
}

export function intervaloDaEtapa(etapa) {
    return INTERVALOS[Math.min(etapa, INTERVALOS.length - 1)];
}

function limparTexto(valor) {
    return (valor || '').trim();
}

function montarCartoes(registro, tituloAula) {
    const cartoes = [];
    const aprendizado = limparTexto(registro.aprendizado);
    const duvidas = limparTexto(registro.duvidas);
    const conteudo = limparTexto(registro.conteudo);

    if (aprendizado) {
        cartoes.push({
            tipo: 'aprendizado',
            titulo: tituloAula,
            frente: conteudo
                ? `O que você aprendeu sobre: ${conteudo}`
                : 'O que você aprendeu nesta aula?',
            verso: aprendizado,
            etapaInicial: 0
        });
    }

    if (duvidas) {
        cartoes.push({
            tipo: 'duvida',
            titulo: tituloAula,
            frente: 'Você já consegue responder esta dúvida?',
            verso: duvidas,
            etapaInicial: 1
        });
    }

    return cartoes;
}

export async function sincronizarRevisoesDoRegistro(usuarioId, registro, tituloAula = 'Aula') {
    if (!usuarioId || !registro?.id) return { criadas: 0 };

    const cartoes = montarCartoes(registro, tituloAula);
    const tiposComTexto = cartoes.map(c => c.tipo);

    const { data: existentes } = await supabase
        .from('revisoes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('registro_id', registro.id);

    const mapa = {};
    (existentes || []).forEach(item => { mapa[item.tipo] = item; });

    const orfas = (existentes || []).filter(item => !tiposComTexto.includes(item.tipo));
    if (orfas.length) {
        await supabase.from('revisoes').delete().in('id', orfas.map(o => o.id));
    }

    let criadas = 0;

    for (const cartao of cartoes) {
        const anterior = mapa[cartao.tipo];

        if (anterior) {
            await supabase
                .from('revisoes')
                .update({ titulo: cartao.titulo, frente: cartao.frente, verso: cartao.verso })
                .eq('id', anterior.id)
                .eq('usuario_id', usuarioId);
            continue;
        }

        const { error } = await supabase.from('revisoes').insert({
            usuario_id: usuarioId,
            registro_id: registro.id,
            rotina_id: registro.rotina_id,
            tipo: cartao.tipo,
            titulo: cartao.titulo,
            frente: cartao.frente,
            verso: cartao.verso,
            etapa: cartao.etapaInicial,
            data_origem: registro.data_aula,
            data_prevista: somarDias(registro.data_aula, intervaloDaEtapa(cartao.etapaInicial))
        });

        if (!error) criadas += 1;
    }

    return { criadas };
}

export async function listarRevisoes(usuarioId) {
    const { data, error } = await supabase
        .from('revisoes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('data_prevista', { ascending: true });

    if (error) {
        console.error('Erro ao listar revisões:', error.message);
        return [];
    }

    return data || [];
}

export async function contarRevisoesDeHoje(usuarioId) {
    const { count, error } = await supabase
        .from('revisoes')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('dominada', false)
        .lte('data_prevista', hojeISO());

    if (error) return 0;
    return count || 0;
}

export function agruparRevisoes(revisoes) {
    const hoje = hojeISO();
    const grupos = { atrasadas: [], hoje: [], proximas: [], dominadas: [] };

    revisoes.forEach(revisao => {
        if (revisao.dominada) {
            grupos.dominadas.push(revisao);
            return;
        }
        if (revisao.data_prevista < hoje) grupos.atrasadas.push(revisao);
        else if (revisao.data_prevista === hoje) grupos.hoje.push(revisao);
        else grupos.proximas.push(revisao);
    });

    return grupos;
}

export async function registrarResultado(revisao, acertou) {
    const hoje = hojeISO();
    const dados = {
        concluida_em: new Date().toISOString(),
        acertos: (revisao.acertos || 0) + (acertou ? 1 : 0),
        tropecos: (revisao.tropecos || 0) + (acertou ? 0 : 1)
    };

    if (acertou) {
        const proximaEtapa = (revisao.etapa || 0) + 1;

        if (proximaEtapa >= INTERVALOS.length) {
            dados.etapa = INTERVALOS.length - 1;
            dados.dominada = true;
            dados.concluida = true;
            dados.data_prevista = revisao.data_prevista;
        } else {
            dados.etapa = proximaEtapa;
            dados.dominada = false;
            dados.concluida = false;
            dados.data_prevista = somarDias(hoje, intervaloDaEtapa(proximaEtapa));
        }
    } else {
        dados.etapa = 0;
        dados.dominada = false;
        dados.concluida = false;
        dados.data_prevista = somarDias(hoje, INTERVALOS[0]);
    }

    const { data, error } = await supabase
        .from('revisoes')
        .update(dados)
        .eq('id', revisao.id)
        .eq('usuario_id', revisao.usuario_id)
        .select()
        .single();

    if (error) return { error };

    await concederXp('revisao_feita', `revisao:${revisao.id}:${revisao.etapa || 0}`, 8);
    if (dados.dominada) {
        await concederXp('revisao_dominada', `revisao:${revisao.id}`, 25);
    }

    return { data };
}

export async function adiarRevisao(revisao, dias = 1) {
    const base = revisao.data_prevista < hojeISO() ? hojeISO() : revisao.data_prevista;

    const { data, error } = await supabase
        .from('revisoes')
        .update({ data_prevista: somarDias(base, dias) })
        .eq('id', revisao.id)
        .eq('usuario_id', revisao.usuario_id)
        .select()
        .single();

    return { data, error };
}

export async function reiniciarCiclo(revisao) {
    const { data, error } = await supabase
        .from('revisoes')
        .update({
            etapa: 0,
            dominada: false,
            concluida: false,
            data_prevista: somarDias(hojeISO(), INTERVALOS[0])
        })
        .eq('id', revisao.id)
        .eq('usuario_id', revisao.usuario_id)
        .select()
        .single();

    return { data, error };
}

export async function excluirRevisao(revisao) {
    return supabase.from('revisoes').delete().eq('id', revisao.id).eq('usuario_id', revisao.usuario_id);
}

export async function enviarRevisaoParaTarefas(revisao, usuarioId) {
    const prefixo = revisao.tipo === 'duvida' ? 'Revisar dúvida' : 'Revisar aprendizado';

    const { data, error } = await supabase.from('tarefas').insert({
        usuario_id: usuarioId,
        titulo: `${prefixo}: ${revisao.titulo}`,
        descricao: revisao.verso,
        data_entrega: revisao.data_prevista,
        dificuldade: 'facil',
        modalidade: 'individual',
        concluida: false,
        status_quadro: 'a_fazer',
        subtarefas: []
    }).select().single();

    return { data, error };
}
