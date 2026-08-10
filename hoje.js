import { supabase } from './supabase-config.js';
import { urlPublicaMidia, iconePorTipo, rotuloPorTipo } from './midia.js';
import { abrirDetalhesTarefa, fecharDetalhes } from './detalhes-tarefa.js';
import { mapaAnexosPorTarefa } from './arquivos-service.js';
import { celebrarConclusao } from './celebracao.js';
import { validarConclusao } from './passos.js';

document.addEventListener('DOMContentLoaded', async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const listaHoje = document.getElementById('listaHoje');
    const tempoTotalEl = document.getElementById('tempoTotal');
    const secaoRotinaHoje = document.getElementById('secaoRotinaHoje');
    const listaRotinaHoje = document.getElementById('listaRotinaHoje');

    const NOMES_DIAS_HOJE = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    let tarefasDoDia = [];
    let materias = [];
    let anexosMap = {};

    async function carregarMaterias() {
        const { data } = await supabase.from('materias').select('*').eq('usuario_id', user.id);
        materias = data || [];
    }

    async function carregarHoje() {
        const hoje = new Date().toISOString().split('T')[0];

        const { data: tarefas, error } = await supabase
            .from('tarefas')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('data_entrega', hoje)
            .order('titulo', { ascending: true });

        if (error) {
            console.error('Erro ao carregar compromissos de hoje:', error);
            listaHoje.innerHTML = `<div class="item-vazio">Não foi possível carregar seus compromissos 😕</div>`;
            return;
        }

        tarefasDoDia = tarefas || [];
        anexosMap = await mapaAnexosPorTarefa(tarefasDoDia.map(t => t.id));
        renderizarLista(tarefasDoDia);
        renderizarTempoTotal(tarefasDoDia);
    }

    function iconeDoItem(materiaId) {
        const materia = materias.find(m => m.id === materiaId);
        if (materia?.icone_url) {
            return { html: `<img src="${urlPublicaMidia(materia.icone_url)}" alt="${materia.nome}">`, comImagem: true };
        }
        return { html: '📝', comImagem: false };
    }

    function badgeAnexo(tarefa) {
        const anexos = anexosMap[tarefa.id] || [];
        if (anexos.length === 0) return '';
        if (anexos.length === 1) {
            const nome = anexos[0].nome_arquivo;
            return ` • ${iconePorTipo(nome)} ${rotuloPorTipo(nome)}`;
        }
        return ` • 📎 ${anexos.length} anexos`;
    }

    function passosDaTarefa(tarefa) {
        const lista = Array.isArray(tarefa.subtarefas) ? tarefa.subtarefas : [];
        return lista.filter(passo => passo && passo.texto);
    }

    function barraProgressoPassos(tarefa) {
        const lista = passosDaTarefa(tarefa);
        if (lista.length === 0) return '';

        const feitos = lista.filter(passo => passo.feita).length;
        const porcentagem = Math.round((feitos / lista.length) * 100);

        return `
            <div class="progresso-passos">
                <div class="progresso-passos-trilha"><span style="width: ${porcentagem}%"></span></div>
                <span class="progresso-passos-texto">${feitos}/${lista.length} passos</span>
            </div>
        `;
    }

    async function alternarPasso(tarefa, passoId) {
        const atualizados = passosDaTarefa(tarefa).map(passo => (
            String(passo.id) === String(passoId) ? { ...passo, feita: !passo.feita } : passo
        ));

        const { error } = await supabase
            .from('tarefas')
            .update({ subtarefas: atualizados })
            .eq('id', tarefa.id)
            .eq('usuario_id', user.id);

        if (error) {
            alert('Erro ao atualizar o passo: ' + error.message);
            return null;
        }

        tarefa.subtarefas = atualizados;
        const local = tarefasDoDia.find(t => String(t.id) === String(tarefa.id));
        if (local) local.subtarefas = atualizados;

        renderizarLista(tarefasDoDia);
        return atualizados;
    }

    async function carregarRotinaDeHoje() {
        if (!secaoRotinaHoje) return;

        const agora = new Date();
        const diaSemana = agora.getDay();
        const iso = agora.toISOString().split('T')[0];

        const { data: rotinas, error } = await supabase
            .from('rotinas')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('ativa', true)
            .contains('dias_semana', [diaSemana])
            .order('horario', { ascending: true, nullsFirst: false });

        if (error || !rotinas || rotinas.length === 0) {
            secaoRotinaHoje.hidden = true;
            return;
        }

        const { data: registrosHoje } = await supabase
            .from('registros_rotina')
            .select('rotina_id')
            .eq('usuario_id', user.id)
            .eq('data_aula', iso);

        const registrados = new Set((registrosHoje || []).map(r => r.rotina_id));

        listaRotinaHoje.innerHTML = rotinas.map(rotina => {
            const materia = materias.find(m => m.id === rotina.materia_id);
            const detalhes = [materia?.nome, rotina.local].filter(Boolean).join(' • ');
            const feito = registrados.has(rotina.id);

            return `
                <a class="item-rotina" href="rotinas.html">
                    <span class="horario-rotina">${rotina.horario ? rotina.horario.slice(0, 5) : '--:--'}</span>
                    <div class="info-rotina">
                        <strong>${rotina.titulo}</strong>
                        <p>${detalhes || `Aula de ${NOMES_DIAS_HOJE[diaSemana].toLowerCase()}`}</p>
                    </div>
                    <span class="status ${feito ? 'normal' : 'prazo-hoje'}">${feito ? 'Registrada' : 'Registrar aprendizado'}</span>
                </a>
            `;
        }).join('');

        secaoRotinaHoje.hidden = false;
    }

    function renderizarLista(tarefas) {
        if (tarefas.length === 0) {
            listaHoje.innerHTML = `<div class="item-vazio">Nenhum compromisso para hoje 🎉</div>`;
            return;
        }

        listaHoje.innerHTML = tarefas.map(t => {
            const { classe, texto } = definirStatus(t);
            const icone = iconeDoItem(t.materia_id);

            return `
                <div class="item-tarefa ${t.concluida ? 'concluida' : ''}" data-id="${t.id}">
                    <div class="item-icone ${icone.comImagem ? 'com-imagem' : ''}">${t.concluida ? '✅' : icone.html}</div>
                    <div class="item-conteudo">
                        <h4>${t.titulo}</h4>
                        <p>${t.descricao || 'Sem observações'}${badgeAnexo(t)}</p>
                        ${barraProgressoPassos(t)}
                    </div>
                    <span class="status ${classe}">${texto}</span>
                    <div class="item-acoes">
                        <button
                            class="btn-acao concluir"
                            data-id="${t.id}"
                            data-estado="${t.concluida}"
                            title="${t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}"
                        >${t.concluida ? '↺' : '✓'}</button>
                        <button type="button" class="btn-saiba-mais" data-acao="saibamais">Saiba mais</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function definirStatus(tarefa) {
        if (tarefa.concluida) {
            return { classe: 'normal', texto: 'Concluída' };
        }
        return { classe: 'prazo-hoje', texto: 'Hoje' };
    }

    function renderizarTempoTotal(tarefas) {
        if (!tempoTotalEl) return;

        const pendentes = tarefas.filter(t => !t.concluida);
        const minutosTotais = pendentes.reduce((soma, t) => soma + (Number(t.duracao) || 0), 0);

        if (minutosTotais === 0) {
            tempoTotalEl.textContent = '';
            return;
        }

        const horas = Math.floor(minutosTotais / 60);
        const minutos = minutosTotais % 60;
        const textoTempo = [
            horas > 0 ? `${horas}h` : '',
            minutos > 0 ? `${minutos}min` : ''
        ].filter(Boolean).join(' ');

        tempoTotalEl.textContent = `⏱ ${textoTempo} de tarefas pendentes hoje`;
    }

    function abrirDetalhes(tarefa) {
        abrirDetalhesTarefa(tarefa, {
            materias,
            linkEditar: `tarefas.html?editar=${tarefa.id}`,
            aoAlternarPasso: alternarPasso,
            aoConcluir: async (t) => {
                fecharDetalhes();
                await alternarConclusao(t.id, t.concluida);
            }
        });
    }

    async function alternarConclusao(id, estadoAtual) {
        const novoEstado = !estadoAtual;
        const tarefaAlvo = tarefasDoDia.find(t => String(t.id) === String(id));
        if (novoEstado && tarefaAlvo && !validarConclusao(tarefaAlvo)) return;
        const { error } = await supabase
            .from('tarefas')
            .update({ concluida: novoEstado })
            .eq('id', id)
            .eq('usuario_id', user.id);

        if (error) {
            alert('❌ Erro ao atualizar tarefa: ' + error.message);
            return;
        }

        if (novoEstado) {
            const tarefa = tarefasDoDia.find(t => String(t.id) === String(id));
            celebrarConclusao({ titulo: tarefa?.titulo || '' });
        }

        carregarHoje();
    }

    listaHoje.addEventListener('click', async (e) => {
        const item = e.target.closest('.item-tarefa');
        if (!item) return;

        const botaoConcluir = e.target.closest('.concluir');
        if (botaoConcluir) {
            botaoConcluir.disabled = true;
            await alternarConclusao(botaoConcluir.dataset.id, botaoConcluir.dataset.estado === 'true');
            return;
        }

        const tarefa = tarefasDoDia.find(t => String(t.id) === item.dataset.id);
        if (tarefa) abrirDetalhes(tarefa);
    });

    await carregarMaterias();
    await carregarHoje();
    await carregarRotinaDeHoje();
});
