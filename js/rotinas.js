import { supabase } from './supabase-config.js';
import { enviarERegistrarArquivo, removerArquivoPorCaminho, mapaAnexosPorRegistro } from './arquivos-service.js';
import { urlsAssinadasEmLote, abrirVisualizadorArquivo, iconeSvgPorTipo } from './midia.js';
import { concederXp } from './xp-service.js';
import { celebrarConclusao } from './celebracao.js';

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SIGLAS_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const listaRotinasHoje = document.getElementById('listaRotinasHoje');
    const gradeSemana = document.getElementById('gradeSemana');
    const listaDiario = document.getElementById('listaDiario');
    const rotuloDiaHoje = document.getElementById('rotuloDiaHoje');
    const resumoDiaHoje = document.getElementById('resumoDiaHoje');
    const filtroRotinaDiario = document.getElementById('filtroRotinaDiario');

    const modalRotina = document.getElementById('modalRotina');
    const formRotina = document.getElementById('formRotina');
    const tituloModalRotina = document.getElementById('tituloModalRotina');
    const idRotina = document.getElementById('idRotina');
    const tituloRotina = document.getElementById('tituloRotina');
    const materiaRotina = document.getElementById('materiaRotina');
    const seletorDias = document.getElementById('seletorDias');
    const horarioRotina = document.getElementById('horarioRotina');
    const localRotina = document.getElementById('localRotina');
    const ativaRotina = document.getElementById('ativaRotina');
    const btnNovaRotina = document.getElementById('btnNovaRotina');
    const btnExcluirRotina = document.getElementById('btnExcluirRotina');

    const modalRegistro = document.getElementById('modalRegistro');
    const formRegistro = document.getElementById('formRegistro');
    const idRegistro = document.getElementById('idRegistro');
    const idRotinaRegistro = document.getElementById('idRotinaRegistro');
    const nomeRotinaRegistro = document.getElementById('nomeRotinaRegistro');
    const dataRotinaRegistro = document.getElementById('dataRotinaRegistro');
    const dataRegistro = document.getElementById('dataRegistro');
    const conteudoRegistro = document.getElementById('conteudoRegistro');
    const aprendizadoRegistro = document.getElementById('aprendizadoRegistro');
    const duvidasRegistro = document.getElementById('duvidasRegistro');
    const fotosRegistro = document.getElementById('fotosRegistro');
    const listaFotosRegistro = document.getElementById('listaFotosRegistro');
    const btnExcluirRegistro = document.getElementById('btnExcluirRegistro');

    let materias = [];
    let rotinas = [];
    let registros = [];
    let anexosPorRegistro = {};
    let urlsAnexos = {};
    let diasSelecionados = [];
    let anexosExistentes = [];
    let anexosNovos = [];
    let anexosRemovidos = [];

    const hoje = new Date();
    const hojeISO = dataISO(hoje);
    const diaAtual = hoje.getDay();

    rotuloDiaHoje.textContent = NOMES_DIAS[diaAtual].toLowerCase();

    function dataISO(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    function formatarData(iso) {
        return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
    }

    function diaDaSemanaISO(iso) {
        return new Date(iso + 'T00:00:00').getDay();
    }

    function nomeMateria(materiaId) {
        const materia = materias.find(m => m.id === materiaId);
        return materia ? materia.nome : '';
    }

    function escapar(texto = '') {
        return String(texto).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    async function carregarMaterias() {
        const { data } = await supabase.from('materias').select('*').eq('usuario_id', user.id).order('nome');
        materias = data || [];

        const opcoes = materias.map(m => `<option value="${m.id}">${escapar(m.nome)}</option>`).join('');
        materiaRotina.innerHTML = `<option value="">Selecione...</option>${opcoes}`;
    }

    async function carregarRotinas() {
        const { data, error } = await supabase
            .from('rotinas')
            .select('*')
            .eq('usuario_id', user.id)
            .order('horario', { ascending: true, nullsFirst: false });

        if (error) {
            listaRotinasHoje.innerHTML = `<div class="item-vazio">Não foi possível carregar suas rotinas.</div>`;
            return;
        }

        rotinas = data || [];
        filtroRotinaDiario.innerHTML = `<option value="">Todas as aulas</option>` +
            rotinas.map(r => `<option value="${r.id}">${escapar(r.titulo)}</option>`).join('');
    }

    async function carregarRegistros() {
        const limite = new Date();
        limite.setDate(limite.getDate() - 60);

        const { data } = await supabase
            .from('registros_rotina')
            .select('*')
            .eq('usuario_id', user.id)
            .gte('data_aula', dataISO(limite))
            .order('data_aula', { ascending: false });

        registros = data || [];
        anexosPorRegistro = await mapaAnexosPorRegistro(registros.map(r => r.id));

        const caminhos = Object.values(anexosPorRegistro).flat().map(a => a.url_arquivo);
        urlsAnexos = caminhos.length ? await urlsAssinadasEmLote(caminhos) : {};
    }

    function registroDoDia(rotinaId, iso) {
        return registros.find(r => r.rotina_id === rotinaId && r.data_aula === iso) || null;
    }

    function rotinasDoDia(dia) {
        return rotinas.filter(r => r.ativa && (r.dias_semana || []).includes(dia));
    }

    function renderizarHoje() {
        const doDia = rotinasDoDia(diaAtual);

        if (doDia.length === 0) {
            resumoDiaHoje.textContent = '';
            listaRotinasHoje.innerHTML = `<div class="item-vazio">Nenhuma aula fixa hoje. Aproveite para revisar registros antigos.</div>`;
            return;
        }

        const registrados = doDia.filter(r => registroDoDia(r.id, hojeISO)).length;
        resumoDiaHoje.textContent = `${registrados} de ${doDia.length} já registradas`;

        listaRotinasHoje.innerHTML = doDia.map(rotina => {
            const registro = registroDoDia(rotina.id, hojeISO);
            const materia = nomeMateria(rotina.materia_id);
            const detalhes = [materia, rotina.local].filter(Boolean).join(' • ');

            return `
                <div class="item-rotina" data-id="${rotina.id}">
                    <span class="horario-rotina">${rotina.horario ? rotina.horario.slice(0, 5) : '--:--'}</span>
                    <div class="info-rotina">
                        <strong>${escapar(rotina.titulo)}</strong>
                        <p>${escapar(detalhes) || 'Sem detalhes adicionais'}</p>
                    </div>
                    <span class="status ${registro ? 'normal' : 'prazo-hoje'}">${registro ? 'Registrada' : 'Sem registro'}</span>
                    <div class="acoes-rotina">
                        <button type="button" class="btn-saiba-mais" data-acao="registrar">${registro ? 'Ver registro' : 'Registrar aprendizado'}</button>
                        <button type="button" class="btn-acao" data-acao="editar" title="Editar rotina"><svg class="icon-svg icon-svg-sm"><use href="assets/icones/arkhys-icons.svg#icon-editar"></use></svg></button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderizarSemana() {
        gradeSemana.innerHTML = SIGLAS_DIAS.map((sigla, dia) => {
            const doDia = rotinasDoDia(dia);
            const iso = dataISO(dataDoDiaNaSemana(dia));

            const aulas = doDia.map(rotina => {
                const registro = registroDoDia(rotina.id, iso);
                return `
                    <button type="button" class="mini-aula ${registro ? 'registrada' : ''}" data-id="${rotina.id}" data-data="${iso}">
                        <strong>${escapar(rotina.titulo)}</strong>
                        <em>${rotina.horario ? rotina.horario.slice(0, 5) : 'sem horário'}</em>
                    </button>
                `;
            }).join('');

            return `
                <div class="dia-semana ${dia === diaAtual ? 'dia-atual' : ''}">
                    <h3>${sigla}</h3>
                    ${aulas || '<p class="dia-vazio">livre</p>'}
                </div>
            `;
        }).join('');
    }

    function dataDoDiaNaSemana(dia) {
        const referencia = new Date(hoje);
        referencia.setDate(referencia.getDate() - diaAtual + dia);
        return referencia;
    }

    function renderizarDiario() {
        let visiveis = [...registros];
        if (filtroRotinaDiario.value) {
            visiveis = visiveis.filter(r => String(r.rotina_id) === filtroRotinaDiario.value);
        }

        if (visiveis.length === 0) {
            listaDiario.innerHTML = `<div class="item-vazio">Seu diário está vazio. Registre o que aprendeu em uma aula e ele aparece aqui.</div>`;
            return;
        }

        listaDiario.innerHTML = visiveis.map(registro => {
            const rotina = rotinas.find(r => r.id === registro.rotina_id);
            const anexos = anexosPorRegistro[registro.id] || [];

            const blocos = [
                { rotulo: 'Conteúdo da aula', valor: registro.conteudo },
                { rotulo: 'O que eu aprendi', valor: registro.aprendizado },
                { rotulo: 'Dúvidas para revisar', valor: registro.duvidas }
            ].filter(b => b.valor).map(b => `
                <div class="diario-bloco">
                    <span>${b.rotulo}</span>
                    <p>${escapar(b.valor)}</p>
                </div>
            `).join('');

            const listaAnexos = anexos.map(anexo => `
                <button type="button" class="diario-anexo" data-anexo="${anexo.url_arquivo}" data-nome="${escapar(anexo.nome_arquivo)}">
                    ${iconeSvgPorTipo(anexo.nome_arquivo)} ${escapar(anexo.nome_arquivo)}
                </button>
            `).join('');

            return `
                <article class="item-diario" data-id="${registro.id}">
                    <div class="diario-topo">
                        <div>
                            <strong>${escapar(rotina ? rotina.titulo : 'Aula removida')}</strong>
                            <p class="metadado">${formatarData(registro.data_aula)} • ${NOMES_DIAS[diaDaSemanaISO(registro.data_aula)]}</p>
                        </div>
                        <button type="button" class="btn-saiba-mais" data-acao="abrir-registro">Abrir</button>
                    </div>
                    ${blocos || '<p class="metadado">Registro sem anotações escritas.</p>'}
                    ${listaAnexos ? `<div class="diario-anexos">${listaAnexos}</div>` : ''}
                </article>
            `;
        }).join('');
    }

    function renderizarTudo() {
        renderizarHoje();
        renderizarSemana();
        renderizarDiario();
    }

    function renderizarSeletorDias() {
        seletorDias.innerHTML = SIGLAS_DIAS.map((sigla, dia) => `
            <button type="button" class="chip-dia ${diasSelecionados.includes(dia) ? 'ativo' : ''}" data-dia="${dia}">${sigla}</button>
        `).join('');
    }

    seletorDias.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip-dia');
        if (!chip) return;

        const dia = Number(chip.dataset.dia);
        diasSelecionados = diasSelecionados.includes(dia)
            ? diasSelecionados.filter(d => d !== dia)
            : [...diasSelecionados, dia].sort((a, b) => a - b);

        renderizarSeletorDias();
    });

    function abrirModalRotina(rotina = null) {
        formRotina.reset();
        idRotina.value = rotina ? rotina.id : '';
        tituloModalRotina.textContent = rotina ? 'Editar rotina' : 'Nova rotina';
        tituloRotina.value = rotina ? rotina.titulo : '';
        materiaRotina.value = rotina && rotina.materia_id ? rotina.materia_id : '';
        horarioRotina.value = rotina && rotina.horario ? rotina.horario.slice(0, 5) : '';
        localRotina.value = rotina ? rotina.local || '' : '';
        ativaRotina.checked = rotina ? rotina.ativa : true;
        diasSelecionados = rotina ? [...(rotina.dias_semana || [])] : [];
        btnExcluirRotina.hidden = !rotina;

        renderizarSeletorDias();
        modalRotina.hidden = false;
    }

    function fecharModalRotina() {
        modalRotina.hidden = true;
    }

    btnNovaRotina.addEventListener('click', () => abrirModalRotina());

    modalRotina.addEventListener('click', (e) => {
        if (e.target === modalRotina || e.target.closest('[data-acao="fechar-rotina"]')) fecharModalRotina();
    });

    formRotina.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (diasSelecionados.length === 0) {
            alert('Escolha pelo menos um dia da semana para essa rotina.');
            return;
        }

        const dados = {
            usuario_id: user.id,
            titulo: tituloRotina.value.trim(),
            materia_id: materiaRotina.value ? Number(materiaRotina.value) : null,
            dias_semana: diasSelecionados,
            horario: horarioRotina.value || null,
            local: localRotina.value.trim() || null,
            ativa: ativaRotina.checked
        };

        const consulta = idRotina.value
            ? supabase.from('rotinas').update(dados).eq('id', idRotina.value).eq('usuario_id', user.id)
            : supabase.from('rotinas').insert(dados);

        const { error } = await consulta;
        if (error) {
            alert('Erro ao salvar a rotina: ' + error.message);
            return;
        }

        const eraEdicao = !!idRotina.value;
        fecharModalRotina();
        await carregarRotinas();
        renderizarTudo();
        celebrarConclusao({
            texto: eraEdicao ? 'Rotina atualizada' : 'Rotina criada',
            titulo: dados.titulo,
            duracao: 1400
        });
    });

    btnExcluirRotina.addEventListener('click', async () => {
        if (!idRotina.value) return;
        if (!confirm('Excluir esta rotina? Os registros já salvos também serão removidos.')) return;

        const { error } = await supabase.from('rotinas').delete().eq('id', idRotina.value).eq('usuario_id', user.id);
        if (error) {
            alert('Erro ao excluir a rotina: ' + error.message);
            return;
        }

        fecharModalRotina();
        await carregarRotinas();
        await carregarRegistros();
        renderizarTudo();
    });

    function renderizarAnexosRegistro() {
        const existentes = anexosExistentes
            .filter(a => !anexosRemovidos.includes(a.url_arquivo))
            .map(a => `
                <div class="item-anexo-form">
                    <span>${escapar(a.nome_arquivo)}</span>
                    <button type="button" class="btn-remover-anexo" data-acao="remover-existente" data-caminho="${a.url_arquivo}">Remover</button>
                </div>
            `).join('');

        const novos = anexosNovos.map((arquivo, indice) => `
            <div class="item-anexo-form item-anexo-novo">
                <span>${escapar(arquivo.name)} <em>novo</em></span>
                <button type="button" class="btn-remover-anexo" data-acao="remover-novo" data-indice="${indice}">Remover</button>
            </div>
        `).join('');

        listaFotosRegistro.innerHTML = existentes + novos;
    }

    listaFotosRegistro.addEventListener('click', (e) => {
        const botao = e.target.closest('button');
        if (!botao) return;

        if (botao.dataset.acao === 'remover-existente') {
            anexosRemovidos.push(botao.dataset.caminho);
        } else if (botao.dataset.acao === 'remover-novo') {
            anexosNovos.splice(Number(botao.dataset.indice), 1);
        }

        renderizarAnexosRegistro();
    });

    fotosRegistro.addEventListener('change', () => {
        anexosNovos.push(...Array.from(fotosRegistro.files));
        fotosRegistro.value = '';
        renderizarAnexosRegistro();
    });

    modalRegistro.addEventListener('paste', (e) => {
        const arquivos = Array.from(e.clipboardData?.files || []);
        if (arquivos.length === 0) return;

        e.preventDefault();
        anexosNovos.push(...arquivos);
        renderizarAnexosRegistro();
    });

    async function abrirModalRegistro(rotina, iso) {
        const registro = registroDoDia(rotina.id, iso);

        formRegistro.reset();
        idRegistro.value = registro ? registro.id : '';
        idRotinaRegistro.value = rotina.id;
        nomeRotinaRegistro.textContent = rotina.titulo;
        dataRotinaRegistro.textContent = `${NOMES_DIAS[diaDaSemanaISO(iso)]} • ${formatarData(iso)}`;
        dataRegistro.value = iso;
        conteudoRegistro.value = registro ? registro.conteudo || '' : '';
        aprendizadoRegistro.value = registro ? registro.aprendizado || '' : '';
        duvidasRegistro.value = registro ? registro.duvidas || '' : '';
        btnExcluirRegistro.hidden = !registro;

        anexosExistentes = registro ? anexosPorRegistro[registro.id] || [] : [];
        anexosNovos = [];
        anexosRemovidos = [];
        renderizarAnexosRegistro();

        modalRegistro.hidden = false;
    }

    function fecharModalRegistro() {
        modalRegistro.hidden = true;
    }

    modalRegistro.addEventListener('click', (e) => {
        if (e.target === modalRegistro || e.target.closest('[data-acao="fechar-registro"]')) fecharModalRegistro();
    });

    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const botao = formRegistro.querySelector('button[type="submit"]');
        botao.disabled = true;
        botao.textContent = 'Salvando...';

        const dados = {
            usuario_id: user.id,
            rotina_id: Number(idRotinaRegistro.value),
            data_aula: dataRegistro.value,
            conteudo: conteudoRegistro.value.trim() || null,
            aprendizado: aprendizadoRegistro.value.trim() || null,
            duvidas: duvidasRegistro.value.trim() || null
        };

        const { data: salvo, error } = await supabase
            .from('registros_rotina')
            .upsert(dados, { onConflict: 'rotina_id,data_aula' })
            .select()
            .single();

        if (error) {
            botao.disabled = false;
            botao.textContent = 'Salvar registro';
            alert('Erro ao salvar o registro: ' + error.message);
            return;
        }

        for (const caminho of anexosRemovidos) {
            await removerArquivoPorCaminho(user.id, caminho);
        }

        for (const arquivo of anexosNovos) {
            await enviarERegistrarArquivo({
                usuarioId: user.id,
                arquivo,
                pasta: 'rotinas',
                categoria: 'Diário de bordo',
                referenciaRegistroId: salvo.id
            });
        }

        const eraNovo = !idRegistro.value;
        if (eraNovo) {
            await concederXp('aula_registrada', `registro:${salvo.id}`, 10);
        }

        botao.disabled = false;
        botao.textContent = 'Salvar registro';
        fecharModalRegistro();

        await carregarRegistros();
        renderizarTudo();

        if (eraNovo) {
            celebrarConclusao({ titulo: nomeRotinaRegistro.textContent, texto: 'Aprendizado registrado' });
        }
    });

    btnExcluirRegistro.addEventListener('click', async () => {
        if (!idRegistro.value) return;
        if (!confirm('Excluir este registro do diário?')) return;

        for (const anexo of anexosExistentes) {
            await removerArquivoPorCaminho(user.id, anexo.url_arquivo);
        }

        const { error } = await supabase
            .from('registros_rotina')
            .delete()
            .eq('id', idRegistro.value)
            .eq('usuario_id', user.id);

        if (error) {
            alert('Erro ao excluir o registro: ' + error.message);
            return;
        }

        fecharModalRegistro();
        await carregarRegistros();
        renderizarTudo();
    });

    listaRotinasHoje.addEventListener('click', (e) => {
        const item = e.target.closest('.item-rotina');
        if (!item) return;

        const rotina = rotinas.find(r => String(r.id) === item.dataset.id);
        if (!rotina) return;

        if (e.target.closest('[data-acao="editar"]')) {
            abrirModalRotina(rotina);
            return;
        }

        abrirModalRegistro(rotina, hojeISO);
    });

    gradeSemana.addEventListener('click', (e) => {
        const mini = e.target.closest('.mini-aula');
        if (!mini) return;

        const rotina = rotinas.find(r => String(r.id) === mini.dataset.id);
        if (rotina) abrirModalRegistro(rotina, mini.dataset.data);
    });

    listaDiario.addEventListener('click', (e) => {
        const anexo = e.target.closest('[data-anexo]');
        if (anexo) {
            const url = urlsAnexos[anexo.dataset.anexo];
            if (url) abrirVisualizadorArquivo(url, anexo.dataset.nome);
            return;
        }

        const item = e.target.closest('.item-diario');
        if (!item) return;

        const registro = registros.find(r => String(r.id) === item.dataset.id);
        if (!registro) return;

        const rotina = rotinas.find(r => r.id === registro.rotina_id);
        if (rotina) abrirModalRegistro(rotina, registro.data_aula);
    });

    filtroRotinaDiario.addEventListener('change', renderizarDiario);

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        fecharModalRotina();
        fecharModalRegistro();
    });

    await carregarMaterias();
    await carregarRotinas();
    await carregarRegistros();
    renderizarTudo();
});
