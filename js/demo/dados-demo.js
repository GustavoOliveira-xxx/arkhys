import { iconeMateria, avatarMonograma, montarPdf, montarTexto, montarSvgBlob, diagramaEntidadeRelacionamento } from './conteudo-demo.js';

export const CONTA_DEMO = {
    id: '11111111-2222-4333-8444-555566667777',
    email: 'demo@arkhys.app',
    senha: 'arkhys',
    nome: 'Ana Ribeiro'
};

function paraISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function emDias(dias) {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + dias);
    return paraISO(data);
}

function carimbo(diasAtras, hora = 9) {
    const data = new Date();
    data.setDate(data.getDate() - diasAtras);
    data.setHours(hora, 30, 0, 0);
    return data.toISOString();
}

function ultimasAulas(diasSemana, quantidade) {
    const datas = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    for (let volta = 0; volta < 60 && datas.length < quantidade; volta++) {
        if (diasSemana.includes(cursor.getDay())) datas.push(paraISO(cursor));
        cursor.setDate(cursor.getDate() - 1);
    }
    return datas;
}

const NIVEIS_XP = [
    { nivel: 1, xp_minimo: 0, nome_titulo: 'Iniciante' },
    { nivel: 2, xp_minimo: 120, nome_titulo: 'Aprendiz' },
    { nivel: 3, xp_minimo: 300, nome_titulo: 'Escriba' },
    { nivel: 4, xp_minimo: 560, nome_titulo: 'Cartógrafo' },
    { nivel: 5, xp_minimo: 900, nome_titulo: 'Estrategista' },
    { nivel: 6, xp_minimo: 1350, nome_titulo: 'Guardião' },
    { nivel: 7, xp_minimo: 1950, nome_titulo: 'Sábio' },
    { nivel: 8, xp_minimo: 2700, nome_titulo: 'Mestre de Arkhys' },
    { nivel: 9, xp_minimo: 3700, nome_titulo: 'Arauto' },
    { nivel: 10, xp_minimo: 5000, nome_titulo: 'Lenda' }
];

function nivelPorXp(xpTotal) {
    const alcancado = [...NIVEIS_XP].reverse().find(n => xpTotal >= n.xp_minimo);
    return alcancado ? alcancado.nivel : 1;
}

export function montarSementes(usuarioId = CONTA_DEMO.id) {
    const midia = {
        [`${usuarioId}/perfil/avatar.svg`]: avatarMonograma('A'),
        [`${usuarioId}/materias/calculo.svg`]: iconeMateria('∫', '#5b4bd6', '#2a1f66'),
        [`${usuarioId}/materias/banco.svg`]: iconeMateria('◇', '#0f8f7a', '#0a4d47'),
        [`${usuarioId}/materias/engenharia.svg`]: iconeMateria('⚙', '#c9752b', '#6b3410'),
        [`${usuarioId}/materias/ingles.svg`]: iconeMateria('A', '#b03a5b', '#5c1730'),
        [`${usuarioId}/materias/estrutura.svg`]: iconeMateria('⌘', '#3f7fd6', '#153a70')
    };

    const materias = [
        { id: 1, usuario_id: usuarioId, nome: 'Cálculo II', icone_url: `${usuarioId}/materias/calculo.svg`, created_at: carimbo(120) },
        { id: 2, usuario_id: usuarioId, nome: 'Banco de Dados', icone_url: `${usuarioId}/materias/banco.svg`, created_at: carimbo(119) },
        { id: 3, usuario_id: usuarioId, nome: 'Engenharia de Software', icone_url: `${usuarioId}/materias/engenharia.svg`, created_at: carimbo(118) },
        { id: 4, usuario_id: usuarioId, nome: 'Inglês Técnico', icone_url: `${usuarioId}/materias/ingles.svg`, created_at: carimbo(117) },
        { id: 5, usuario_id: usuarioId, nome: 'Estrutura de Dados', icone_url: `${usuarioId}/materias/estrutura.svg`, created_at: carimbo(116) }
    ];

    const membros = [
        { id: 1, usuario_id: usuarioId, nome: 'Bruno Tavares', funcao: 'Modelagem de dados', created_at: carimbo(90) },
        { id: 2, usuario_id: usuarioId, nome: 'Carla Menezes', funcao: 'Redação e ABNT', created_at: carimbo(90) },
        { id: 3, usuario_id: usuarioId, nome: 'Diego Ramos', funcao: 'Apresentação', created_at: carimbo(89) },
        { id: 4, usuario_id: usuarioId, nome: 'Fernanda Luz', funcao: 'Pesquisa', created_at: carimbo(88) }
    ];

    const ferramentas = [
        { id: 1, usuario_id: usuarioId, nome: 'Notion', tipo: 'Aplicativo', created_at: carimbo(80) },
        { id: 2, usuario_id: usuarioId, nome: 'PostgreSQL', tipo: 'Banco de dados', created_at: carimbo(79) },
        { id: 3, usuario_id: usuarioId, nome: 'Cálculo — James Stewart', tipo: 'Livro', created_at: carimbo(78) },
        { id: 4, usuario_id: usuarioId, nome: 'Figma', tipo: 'Aplicativo', created_at: carimbo(77) },
        { id: 5, usuario_id: usuarioId, nome: 'Anki', tipo: 'Aplicativo', created_at: carimbo(76) }
    ];

    const tiposEntrega = [
        { id: 1, usuario_id: usuarioId, nome: 'Artigo ABNT', formatos_aceitos: '.docx, .pdf', descricao: 'Margens 3-2-2-3, fonte 12, espaçamento 1,5.', created_at: carimbo(70) },
        { id: 2, usuario_id: usuarioId, nome: 'Slides', formatos_aceitos: '.pptx, .pdf', descricao: 'Até 12 lâminas, 10 minutos de apresentação.', created_at: carimbo(69) },
        { id: 3, usuario_id: usuarioId, nome: 'Relatório técnico', formatos_aceitos: '.pdf', descricao: 'Com gráficos, tabela de medições e conclusão.', created_at: carimbo(68) },
        { id: 4, usuario_id: usuarioId, nome: 'Vídeo', formatos_aceitos: '.mp4', descricao: 'Máximo de 5 minutos.', created_at: carimbo(67) }
    ];

    const orgaos = [
        { id: 1, usuario_id: usuarioId, nome: 'Coordenação do curso', descricao: 'Prazos de matrícula, trancamento e aproveitamento de disciplinas.', created_at: carimbo(60) },
        { id: 2, usuario_id: usuarioId, nome: 'Biblioteca central', descricao: 'Renovação de empréstimos e acesso ao portal de periódicos.', created_at: carimbo(59) },
        { id: 3, usuario_id: usuarioId, nome: 'Núcleo de estágios', descricao: 'Convênios, folha de frequência e relatório semestral.', created_at: carimbo(58) }
    ];

    const passo = (indice, texto, feita) => ({ id: `p-demo-${indice}`, texto, feita });

    const tarefas = [
        {
            id: 1, usuario_id: usuarioId, titulo: 'Lista 4 — Integrais definidas', materia_id: 1,
            descricao: 'Exercícios 12 ao 28 do capítulo 5. Entregar resolução manuscrita digitalizada.',
            data_entrega: emDias(-2), dificuldade: 'medio', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [3], tipos_entrega_ids: [],
            subtarefas: [passo(1, 'Revisar teorema fundamental', true), passo(2, 'Resolver exercícios 12–20', true), passo(3, 'Resolver exercícios 21–28', false)],
            concluida: false, status_quadro: 'fazendo', created_at: carimbo(9)
        },
        {
            id: 2, usuario_id: usuarioId, titulo: 'Relatório de laboratório — Circuitos RC', materia_id: 3,
            descricao: 'Montar o relatório com as medições da bancada 4 e comparar com a curva teórica.',
            data_entrega: emDias(0), dificuldade: 'dificil', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [1], tipos_entrega_ids: [3],
            subtarefas: [passo(4, 'Tabular medições', true), passo(5, 'Gerar gráfico da curva', true), passo(6, 'Escrever conclusão', false)],
            concluida: false, status_quadro: 'fazendo', created_at: carimbo(7)
        },
        {
            id: 3, usuario_id: usuarioId, titulo: 'Fichamento: Clean Architecture, cap. 3', materia_id: 3,
            descricao: 'Uma página sobre o princípio de inversão de dependência com exemplo próprio.',
            data_entrega: emDias(0), dificuldade: 'facil', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [1], tipos_entrega_ids: [],
            subtarefas: [], concluida: false, status_quadro: 'a_fazer', created_at: carimbo(4)
        },
        {
            id: 4, usuario_id: usuarioId, titulo: 'Seminário de normalização (1FN a 3FN)', materia_id: 2,
            descricao: 'Apresentação em grupo com estudo de caso de um sistema de matrícula.',
            data_entrega: emDias(3), dificuldade: 'dificil', modalidade: 'grupo',
            membros_ids: [1, 2, 3], ferramentas_ids: [2, 4], tipos_entrega_ids: [2],
            subtarefas: [passo(7, 'Modelar o DER', true), passo(8, 'Escrever roteiro', false), passo(9, 'Ensaiar a apresentação', false)],
            concluida: false, status_quadro: 'fazendo', created_at: carimbo(11)
        },
        {
            id: 5, usuario_id: usuarioId, titulo: 'Prova de Inglês Técnico — unidade 2', materia_id: 4,
            descricao: 'Leitura de abstracts, false friends e voz passiva.',
            data_entrega: emDias(5), dificuldade: 'medio', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [5], tipos_entrega_ids: [],
            subtarefas: [], concluida: false, status_quadro: 'a_fazer', created_at: carimbo(6)
        },
        {
            id: 6, usuario_id: usuarioId, titulo: 'Artigo do projeto integrador (ABNT)', materia_id: 3,
            descricao: 'Artigo de 8 páginas sobre a API de matrícula desenvolvida no semestre.',
            data_entrega: emDias(7), dificuldade: 'dificil', modalidade: 'grupo',
            membros_ids: [2, 4], ferramentas_ids: [1, 2], tipos_entrega_ids: [1],
            subtarefas: [passo(10, 'Levantar referências', true), passo(11, 'Escrever metodologia', false), passo(12, 'Revisar formatação ABNT', false)],
            concluida: false, status_quadro: 'a_fazer', created_at: carimbo(14)
        },
        {
            id: 7, usuario_id: usuarioId, titulo: 'Implementar árvore AVL em C', materia_id: 5,
            descricao: 'Inserção, remoção e rotações. Incluir testes com 10 mil chaves.',
            data_entrega: emDias(9), dificuldade: 'dificil', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [], tipos_entrega_ids: [],
            subtarefas: [passo(13, 'Rotação simples', false), passo(14, 'Rotação dupla', false), passo(15, 'Bateria de testes', false)],
            concluida: false, status_quadro: 'a_fazer', created_at: carimbo(3)
        },
        {
            id: 8, usuario_id: usuarioId, titulo: 'Revisar anotações da semana', materia_id: null,
            descricao: 'Passar o diário de bordo a limpo e transformar dúvidas em cartões de revisão.',
            data_entrega: emDias(1), dificuldade: 'facil', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [5], tipos_entrega_ids: [],
            subtarefas: [], concluida: false, status_quadro: 'a_fazer', created_at: carimbo(2)
        },
        {
            id: 9, usuario_id: usuarioId, titulo: 'Leitura dirigida — Ética e tecnologia', materia_id: 3,
            descricao: 'Capítulos 1 e 2, com resumo de meia página.',
            data_entrega: emDias(14), dificuldade: 'facil', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [3], tipos_entrega_ids: [],
            subtarefas: [], concluida: false, status_quadro: 'a_fazer', created_at: carimbo(1)
        },
        {
            id: 10, usuario_id: usuarioId, titulo: 'Exercícios de SQL — junções e agregações', materia_id: 2,
            descricao: 'Lista com 15 consultas usando JOIN, GROUP BY e HAVING.',
            data_entrega: emDias(-4), dificuldade: 'medio', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [2], tipos_entrega_ids: [],
            subtarefas: [passo(16, 'Consultas 1–8', true), passo(17, 'Consultas 9–15', true)],
            concluida: true, status_quadro: 'concluido', created_at: carimbo(12)
        },
        {
            id: 11, usuario_id: usuarioId, titulo: 'Resumo de complexidade assintótica', materia_id: 5,
            descricao: 'Tabela comparando O(n), O(log n) e O(n log n) com exemplos.',
            data_entrega: emDias(-6), dificuldade: 'facil', modalidade: 'individual',
            membros_ids: [], ferramentas_ids: [], tipos_entrega_ids: [],
            subtarefas: [], concluida: true, status_quadro: 'concluido', created_at: carimbo(15)
        },
        {
            id: 12, usuario_id: usuarioId, titulo: 'Apresentação de metodologias ágeis', materia_id: 3,
            descricao: 'Comparação entre Scrum e Kanban aplicada ao projeto do semestre.',
            data_entrega: emDias(-9), dificuldade: 'medio', modalidade: 'grupo',
            membros_ids: [1, 3], ferramentas_ids: [4], tipos_entrega_ids: [2],
            subtarefas: [passo(18, 'Montar slides', true), passo(19, 'Ensaiar', true)],
            concluida: true, status_quadro: 'concluido', created_at: carimbo(22)
        }
    ];

    const rotinas = [
        { id: 1, usuario_id: usuarioId, titulo: 'Cálculo II', materia_id: 1, dias_semana: [1, 3], horario: '07:30', local: 'Sala B-12', ativa: true, created_at: carimbo(110) },
        { id: 2, usuario_id: usuarioId, titulo: 'Banco de Dados', materia_id: 2, dias_semana: [2, 4], horario: '10:10', local: 'Laboratório 3', ativa: true, created_at: carimbo(110) },
        { id: 3, usuario_id: usuarioId, titulo: 'Engenharia de Software', materia_id: 3, dias_semana: [1, 5], horario: '19:00', local: 'Sala A-04', ativa: true, created_at: carimbo(109) },
        { id: 4, usuario_id: usuarioId, titulo: 'Inglês Técnico', materia_id: 4, dias_semana: [3], horario: '14:00', local: 'Sala C-01', ativa: true, created_at: carimbo(108) },
        { id: 5, usuario_id: usuarioId, titulo: 'Grupo de estudos', materia_id: 5, dias_semana: [0, 6], horario: '09:00', local: 'Biblioteca central', ativa: true, created_at: carimbo(107) }
    ];

    const aulasCalculo = ultimasAulas([1, 3], 2);
    const aulasBanco = ultimasAulas([2, 4], 2);
    const aulasEngenharia = ultimasAulas([1, 5], 2);
    const aulasIngles = ultimasAulas([3], 1);
    const aulasGrupo = ultimasAulas([0, 6], 1);

    const registros = [
        {
            id: 1, usuario_id: usuarioId, rotina_id: 1, data_aula: aulasCalculo[0],
            conteudo: 'Integrais definidas e o teorema fundamental do cálculo',
            aprendizado: 'A integral definida é o limite da soma de Riemann; o teorema fundamental liga derivada e integral, então basta achar uma primitiva e avaliar nos extremos.',
            duvidas: 'Quando a substituição trigonométrica compensa mais do que integração por partes?'
        },
        {
            id: 2, usuario_id: usuarioId, rotina_id: 1, data_aula: aulasCalculo[1],
            conteudo: 'Integração por partes',
            aprendizado: 'A escolha de u segue a ordem LIATE (logarítmica, inversa, algébrica, trigonométrica, exponencial) e evita repetir o mesmo grau de dificuldade.',
            duvidas: null
        },
        {
            id: 3, usuario_id: usuarioId, rotina_id: 2, data_aula: aulasBanco[0],
            conteudo: 'Formas normais: 1FN, 2FN e 3FN',
            aprendizado: 'Normalizar é remover dependências parciais e transitivas: cada atributo não-chave deve depender da chave inteira e de nada além dela.',
            duvidas: 'Vale desnormalizar por desempenho em tabela de leitura pesada?'
        },
        {
            id: 4, usuario_id: usuarioId, rotina_id: 2, data_aula: aulasBanco[1],
            conteudo: 'Índices e planos de execução',
            aprendizado: 'O índice B-tree acelera busca por igualdade e faixa, mas encarece escrita; o EXPLAIN mostra se o planejador realmente usa o índice.',
            duvidas: null
        },
        {
            id: 5, usuario_id: usuarioId, rotina_id: 3, data_aula: aulasEngenharia[0],
            conteudo: 'Arquitetura em camadas e inversão de dependência',
            aprendizado: 'A regra é que a dependência aponta sempre para dentro: o domínio não conhece banco nem framework, quem conhece é a borda.',
            duvidas: 'Onde fica a validação de regra de negócio quando existe validação também no formulário?'
        },
        {
            id: 6, usuario_id: usuarioId, rotina_id: 4, data_aula: aulasIngles[0],
            conteudo: 'Leitura de abstracts e voz passiva',
            aprendizado: 'Em abstract técnico a voz passiva domina para focar no processo: "the data were collected" em vez de "we collected the data".',
            duvidas: null
        },
        {
            id: 7, usuario_id: usuarioId, rotina_id: 5, data_aula: aulasGrupo[0],
            conteudo: 'Balanceamento de árvores AVL',
            aprendizado: 'O fator de balanceamento fica entre -1 e 1; quando estoura, a rotação simples resolve o caso alinhado e a dupla o caso em zigue-zague.',
            duvidas: 'Como fica o custo amortizado da remoção em sequência?'
        }
    ].map((registro, indice) => ({ ...registro, created_at: carimbo(indice + 1, 20) }));

    const tituloDaRotina = id => rotinas.find(r => r.id === id)?.titulo || 'Aula';

    const revisoes = [
        { registro: 1, tipo: 'aprendizado', etapa: 2, prevista: emDias(-1), dominada: false, acertos: 2, tropecos: 0 },
        { registro: 1, tipo: 'duvida', etapa: 1, prevista: emDias(0), dominada: false, acertos: 1, tropecos: 1 },
        { registro: 2, tipo: 'aprendizado', etapa: 0, prevista: emDias(0), dominada: false, acertos: 0, tropecos: 0 },
        { registro: 3, tipo: 'aprendizado', etapa: 3, prevista: emDias(6), dominada: false, acertos: 3, tropecos: 0 },
        { registro: 3, tipo: 'duvida', etapa: 1, prevista: emDias(-3), dominada: false, acertos: 0, tropecos: 1 },
        { registro: 4, tipo: 'aprendizado', etapa: 1, prevista: emDias(2), dominada: false, acertos: 1, tropecos: 0 },
        { registro: 5, tipo: 'aprendizado', etapa: 4, prevista: emDias(0), dominada: false, acertos: 4, tropecos: 1 },
        { registro: 5, tipo: 'duvida', etapa: 2, prevista: emDias(4), dominada: false, acertos: 1, tropecos: 0 },
        { registro: 6, tipo: 'aprendizado', etapa: 4, prevista: emDias(-12), dominada: true, acertos: 5, tropecos: 0 },
        { registro: 7, tipo: 'aprendizado', etapa: 2, prevista: emDias(3), dominada: false, acertos: 2, tropecos: 1 },
        { registro: 7, tipo: 'duvida', etapa: 0, prevista: emDias(1), dominada: false, acertos: 0, tropecos: 2 }
    ].map((modelo, indice) => {
        const registro = registros.find(r => r.id === modelo.registro);
        const titulo = tituloDaRotina(registro.rotina_id);
        const ehDuvida = modelo.tipo === 'duvida';

        return {
            id: indice + 1,
            usuario_id: usuarioId,
            registro_id: registro.id,
            rotina_id: registro.rotina_id,
            tipo: modelo.tipo,
            titulo,
            frente: ehDuvida
                ? 'Você já consegue responder esta dúvida?'
                : `O que você aprendeu sobre: ${registro.conteudo}`,
            verso: ehDuvida ? registro.duvidas : registro.aprendizado,
            etapa: modelo.etapa,
            data_origem: registro.data_aula,
            data_prevista: modelo.prevista,
            dominada: modelo.dominada,
            concluida: modelo.dominada,
            acertos: modelo.acertos,
            tropecos: modelo.tropecos,
            concluida_em: modelo.acertos + modelo.tropecos > 0 ? carimbo(indice + 2, 21) : null,
            created_at: carimbo(indice + 3, 21)
        };
    });

    const binarios = [
        {
            caminho: `${usuarioId}/cofre/formulario-integrais.pdf`,
            blob: montarPdf('Formulário de integrais', [
                'Tabela de apoio para a Lista 4 de Cálculo II.',
                '',
                'Integral de x^n dx = x^(n+1)/(n+1) + C, para n diferente de -1',
                'Integral de 1/x dx = ln|x| + C',
                'Integral de e^x dx = e^x + C',
                'Integral de sen(x) dx = -cos(x) + C',
                'Integral de cos(x) dx = sen(x) + C',
                'Integral de sec^2(x) dx = tg(x) + C',
                '',
                'Integração por partes: integral de u dv = u.v - integral de v du',
                'Ordem sugerida para escolher u: LIATE',
                '',
                'Teorema fundamental do cálculo:',
                'se F é primitiva de f, então a integral de a até b de f(x) dx = F(b) - F(a).'
            ])
        },
        {
            caminho: `${usuarioId}/tarefas/der-matricula.svg`,
            blob: montarSvgBlob(diagramaEntidadeRelacionamento())
        },
        {
            caminho: `${usuarioId}/cofre/notas-parciais.csv`,
            blob: montarTexto(
                'materia,avaliacao,nota,peso\n' +
                'Cálculo II,P1,8.5,0.4\n' +
                'Cálculo II,Lista 3,9.0,0.1\n' +
                'Banco de Dados,P1,9.4,0.4\n' +
                'Banco de Dados,Seminário,8.0,0.2\n' +
                'Engenharia de Software,P1,7.8,0.4\n' +
                'Inglês Técnico,P1,9.6,0.5\n' +
                'Estrutura de Dados,Trabalho AVL,8.2,0.3\n',
                'text/csv'
            )
        },
        {
            caminho: `${usuarioId}/diario/medicoes-bancada-4.txt`,
            blob: montarTexto(
                'Medições — bancada 4 (circuito RC)\n' +
                '===================================\n\n' +
                'R = 10 kΩ   |   C = 100 µF   |   τ esperado = 1,0 s\n\n' +
                't (s)   V (V)\n' +
                '0,0     0,00\n' +
                '0,5     3,93\n' +
                '1,0     6,32\n' +
                '1,5     7,77\n' +
                '2,0     8,65\n' +
                '3,0     9,50\n' +
                '5,0     9,93\n\n' +
                'Observação: a curva medida ficou 4% abaixo da teórica,\ncompatível com a tolerância do capacitor.\n'
            )
        },
        {
            caminho: `${usuarioId}/entregas/slides-normalizacao.pdf`,
            blob: montarPdf('Normalização — roteiro dos slides', [
                'Seminário de Banco de Dados — grupo de 4 integrantes.',
                '',
                '1. Por que normalizar: anomalias de inserção, atualização e exclusão',
                '2. Primeira forma normal: atributos atômicos',
                '3. Segunda forma normal: dependência parcial da chave composta',
                '4. Terceira forma normal: dependência transitiva',
                '5. Estudo de caso: sistema de matrícula (aluno, curso, matrícula)',
                '6. Quando desnormalizar e o que isso custa',
                '',
                'Tempo alvo: 10 minutos + 5 de perguntas.'
            ])
        },
        {
            caminho: `${usuarioId}/entregas/relatorio-circuitos-rc.pdf`,
            blob: montarPdf('Relatório — circuitos RC', [
                'Disciplina: Engenharia de Software / Laboratório integrado',
                'Bancada 4 — constante de tempo do circuito RC',
                '',
                '1. Objetivo',
                'Comparar a curva de carga medida com o modelo teórico V(t) = Vf.(1 - e^(-t/RC)).',
                '',
                '2. Materiais',
                'Resistor de 10 kOhm, capacitor de 100 uF, fonte de 10 V, osciloscópio.',
                '',
                '3. Resultados',
                'A constante de tempo medida foi de 0,96 s contra 1,00 s teórico (erro de 4%).',
                '',
                '4. Conclusão',
                'O desvio está dentro da tolerância do capacitor eletrolítico utilizado.'
            ])
        }
    ];

    const arquivos = [
        { id: 1, usuario_id: usuarioId, nome_arquivo: 'Formulário de integrais.pdf', categoria: 'Geral', url_arquivo: binarios[0].caminho, referencia_tarefa_id: 1, referencia_registro_id: null, tipo_entrega_id: null, eh_entrega: false, created_at: carimbo(8) },
        { id: 2, usuario_id: usuarioId, nome_arquivo: 'DER do sistema de matrícula.svg', categoria: 'Geral', url_arquivo: binarios[1].caminho, referencia_tarefa_id: 4, referencia_registro_id: null, tipo_entrega_id: null, eh_entrega: false, created_at: carimbo(6) },
        { id: 3, usuario_id: usuarioId, nome_arquivo: 'Notas parciais.csv', categoria: 'Geral', url_arquivo: binarios[2].caminho, referencia_tarefa_id: null, referencia_registro_id: null, tipo_entrega_id: null, eh_entrega: false, created_at: carimbo(5) },
        { id: 4, usuario_id: usuarioId, nome_arquivo: 'Medições da bancada 4.txt', categoria: 'Geral', url_arquivo: binarios[3].caminho, referencia_tarefa_id: null, referencia_registro_id: 5, tipo_entrega_id: null, eh_entrega: false, created_at: carimbo(3) },
        { id: 5, usuario_id: usuarioId, nome_arquivo: 'Slides — normalização.pdf', categoria: 'Entrega', url_arquivo: binarios[4].caminho, referencia_tarefa_id: 4, referencia_registro_id: null, tipo_entrega_id: 2, eh_entrega: true, created_at: carimbo(2) },
        { id: 6, usuario_id: usuarioId, nome_arquivo: 'Relatório de circuitos RC.pdf', categoria: 'Entrega', url_arquivo: binarios[5].caminho, referencia_tarefa_id: 2, referencia_registro_id: null, tipo_entrega_id: 3, eh_entrega: true, created_at: carimbo(1) }
    ];

    const xpTotal = 1580;

    const eventosXp = [
        { id: 1, usuario_id: usuarioId, motivo: 'tarefa_concluida', referencia: 'tarefa:10', quantidade: 30, created_at: carimbo(4) },
        { id: 2, usuario_id: usuarioId, motivo: 'tarefa_no_prazo', referencia: 'tarefa:10', quantidade: 10, created_at: carimbo(4) },
        { id: 3, usuario_id: usuarioId, motivo: 'tarefa_concluida', referencia: 'tarefa:11', quantidade: 15, created_at: carimbo(6) },
        { id: 4, usuario_id: usuarioId, motivo: 'tarefa_concluida', referencia: 'tarefa:12', quantidade: 30, created_at: carimbo(9) },
        { id: 5, usuario_id: usuarioId, motivo: 'revisao_dominada', referencia: 'revisao:9', quantidade: 25, created_at: carimbo(12) }
    ];

    return {
        midia,
        binarios,
        tabelas: {
            niveis_xp: NIVEIS_XP.map((nivel, indice) => ({ id: indice + 1, ...nivel })),
            perfil: [{
                id: 1,
                usuario_id: usuarioId,
                nome_completo: CONTA_DEMO.nome,
                xp_total: xpTotal,
                nivel_atual: nivelPorXp(xpTotal),
                foto_url: `${usuarioId}/perfil/avatar.svg`,
                created_at: carimbo(120)
            }],
            materias,
            membros,
            ferramentas,
            tipos_entrega: tiposEntrega,
            orgaos,
            tarefas,
            rotinas,
            registros_rotina: registros,
            revisoes,
            arquivos,
            eventos_xp: eventosXp
        },
        sequencias: {
            niveis_xp: NIVEIS_XP.length,
            perfil: 1,
            materias: materias.length,
            membros: membros.length,
            ferramentas: ferramentas.length,
            tipos_entrega: tiposEntrega.length,
            orgaos: orgaos.length,
            tarefas: tarefas.length,
            rotinas: rotinas.length,
            registros_rotina: registros.length,
            revisoes: revisoes.length,
            arquivos: arquivos.length,
            eventos_xp: eventosXp.length
        }
    };
}
