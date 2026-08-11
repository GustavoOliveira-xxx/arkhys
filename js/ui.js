(function () {
    'use strict';

    var LOGO = 'assets/logo-arkhys.png';

    var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pontoFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* Marca o documento como 'leve' em aparelhos modestos: o CSS usa isso para
       cortar desfoques e camadas caras sem mudar o desenho da interface. */
    function medirDesempenho() {
        var raiz = document.documentElement;
        if (raiz.dataset.desempenho) return;

        var nucleos = navigator.hardwareConcurrency || 8;
        var memoria = navigator.deviceMemory || 8;
        var menorLado = Math.min(window.innerWidth || 1024, window.innerHeight || 768);

        /* o custo alto e nas telas de toque; desktop modesto aguenta o visual cheio */
        var leve = semMovimento || memoria <= 2 ||
            (!pontoFino && (menorLado < 760 || nucleos <= 4));
        raiz.dataset.desempenho = leve ? 'leve' : 'pleno';
    }

    medirDesempenho();
    var modoLeve = document.documentElement.dataset.desempenho === 'leve';

    function marcaHtml(variacao) {
        return '' +
            '<span class="marca ' + variacao + '">' +
                '<span class="marca-palco">' +
                    '<span class="marca-halo" aria-hidden="true"></span>' +
                    '<img class="marca-sombra" src="' + LOGO + '" alt="" aria-hidden="true">' +
                    '<img class="marca-arte" src="' + LOGO + '" alt="Arkhys">' +
                    '<span class="marca-lustro" aria-hidden="true"></span>' +
                '</span>' +
            '</span>';
    }

    function montarMarcas() {
        document.querySelectorAll('.nav-logo, .logo-mobile-flutuante, .logo-acesso, .publico-marca, [data-marca]').forEach(function (alvo) {
            if (alvo.querySelector('.marca')) return;

            var variacao = alvo.dataset.marca || '';
            if (!variacao) {
                if (alvo.classList.contains('logo-mobile-flutuante')) variacao = 'marca-compacta';
                else if (alvo.classList.contains('logo-acesso')) variacao = 'marca-grande';
                else if (alvo.classList.contains('publico-marca')) variacao = 'marca-media';
            }

            alvo.innerHTML = marcaHtml(variacao);
            if (!alvo.getAttribute('aria-label')) alvo.setAttribute('aria-label', 'Arkhys');
        });
    }

    /* o totem do Agamenon mora em js/agamenon.js (vetor em camadas + paralaxe 3D) */
    function montarTotens() {
        if (window.ArkhysAgamenon) window.ArkhysAgamenon.montar();
    }

    /* --------------------------------------------------------------- selo 3D
       Égide de progresso da aba de tarefas: placas empilhadas em profundidade,
       aro de conclusão e chevron da marca. Só gradientes e transforms — nada
       de imagem ou filtro caro, para rodar liso em qualquer aparelho. */
    var CHEVRON = '<svg class="selo3d-chevron" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
        '<path d="M24 7 41 41h-9.5L24 25.6 16.5 41H7z"/></svg>';

    function seloHtml() {
        return '' +
            '<div class="selo3d-palco">' +
                '<span class="selo3d-aura"></span>' +
                '<span class="selo3d-anel selo3d-anel-2"></span>' +
                '<span class="selo3d-anel selo3d-anel-1"></span>' +
                '<span class="selo3d-placa selo3d-placa-tras"></span>' +
                '<span class="selo3d-placa selo3d-placa-meio"></span>' +
                '<span class="selo3d-arco"></span>' +
                '<span class="selo3d-nucleo">' + CHEVRON + '</span>' +
                '<span class="selo3d-lustro"></span>' +
            '</div>' +
            '<p class="selo3d-dados">' +
                '<strong class="selo3d-valor">0%</strong>' +
                '<span class="selo3d-rotulo">0 de 0 concluídas</span>' +
            '</p>';
    }

    var selos = [];

    function montarSelos() {
        document.querySelectorAll('[data-selo3d]').forEach(function (alvo) {
            if (alvo.dataset.montado) return;
            alvo.dataset.montado = '1';
            alvo.classList.add('selo3d');
            alvo.innerHTML = seloHtml();
            selos.push(alvo);

            requestAnimationFrame(function () { alvo.classList.add('montado'); });
            ligarRelevo(alvo, alvo.firstElementChild, 16, 10, 13);
        });
    }

    function definirProgressoSelo(feitas, total) {
        var razao = total > 0 ? feitas / total : 0;
        var texto = total > 0
            ? feitas + ' de ' + total + ' concluídas'
            : 'Nenhuma tarefa ainda';

        selos.forEach(function (selo) {
            var antes = parseFloat(selo.style.getPropertyValue('--progresso')) || 0;
            selo.style.setProperty('--progresso', razao.toFixed(4));

            var valor = selo.querySelector('.selo3d-valor');
            var rotulo = selo.querySelector('.selo3d-rotulo');
            if (valor) valor.textContent = Math.round(razao * 100) + '%';
            if (rotulo) rotulo.textContent = texto;

            if (razao > antes + 0.0001 && !semMovimento) {
                selo.classList.remove('avancou');
                void selo.offsetWidth;
                selo.classList.add('avancou');
            }
        });
    }

    window.arkhysSelo = { definir: definirProgressoSelo };

    /* Inclinação 3D com mola, compartilhada pelos elementos em relevo.
       Só reage a ponteiro fino; no toque fica estático (sem rAF ocioso). */
    function ligarRelevo(alvo, palco, forcaY, forcaX, deslocamento) {
        if (!palco || semMovimento || !pontoFino) return;
        if (alvo.dataset.relevo) return;
        alvo.dataset.relevo = '1';

        var mira = { rx: 0, ry: 0, dx: 0, dy: 0 };
        var atual = { rx: 0, ry: 0, dx: 0, dy: 0 };
        var chaves = ['rx', 'ry', 'dx', 'dy'];
        var quadro = null;
        var area = null;

        function medir() { area = alvo.getBoundingClientRect(); }

        function passo() {
            var resto = 0;
            for (var i = 0; i < chaves.length; i++) {
                var k = chaves[i];
                var delta = mira[k] - atual[k];
                atual[k] += delta * 0.12;
                resto += Math.abs(delta);
            }

            alvo.style.setProperty('--rx', atual.rx.toFixed(2) + 'deg');
            alvo.style.setProperty('--ry', atual.ry.toFixed(2) + 'deg');
            alvo.style.setProperty('--desloc-x', atual.dx.toFixed(2) + 'px');
            alvo.style.setProperty('--desloc-y', atual.dy.toFixed(2) + 'px');

            quadro = resto > 0.02 ? requestAnimationFrame(passo) : null;
        }

        function acordar() {
            if (!quadro && !document.hidden) quadro = requestAnimationFrame(passo);
        }

        alvo.addEventListener('pointermove', function (evento) {
            if (evento.pointerType === 'touch') return;
            if (!area || !area.width) medir();
            if (!area.width) return;

            var nx = (evento.clientX - area.left) / area.width - 0.5;
            var ny = (evento.clientY - area.top) / area.height - 0.5;

            mira.ry = nx * forcaY;
            mira.rx = -ny * forcaX;
            mira.dx = nx * deslocamento;
            mira.dy = ny * deslocamento * 0.6;

            alvo.style.setProperty('--luz-x', ((nx + 0.5) * 100).toFixed(1) + '%');
            alvo.style.setProperty('--luz-y', ((ny + 0.5) * 100).toFixed(1) + '%');
            alvo.classList.add('em-foco');
            acordar();
        }, { passive: true });

        alvo.addEventListener('pointerleave', function () {
            mira.rx = 0; mira.ry = 0; mira.dx = 0; mira.dy = 0;
            alvo.classList.remove('em-foco');
            acordar();
        });

        window.addEventListener('resize', medir, { passive: true });
        window.addEventListener('scroll', medir, { passive: true });
        medir();
    }

    function ligarInclinacao(seletor, forcaY, forcaX) {
        if (!pontoFino || semMovimento) return;

        document.querySelectorAll(seletor).forEach(function (alvo) {
            if (alvo.dataset.inclinacao === 'ligada') return;
            alvo.dataset.inclinacao = 'ligada';

            var palco = alvo.firstElementChild;
            if (!palco) return;

            alvo.addEventListener('pointermove', function (evento) {
                var area = alvo.getBoundingClientRect();
                var x = (evento.clientX - area.left) / area.width - 0.5;
                var y = (evento.clientY - area.top) / area.height - 0.5;
                alvo.style.setProperty('--ry', (x * forcaY).toFixed(2) + 'deg');
                alvo.style.setProperty('--rx', (-y * forcaX).toFixed(2) + 'deg');
                alvo.style.setProperty('--luz-x', ((x + 0.5) * 100).toFixed(1) + '%');
                alvo.style.setProperty('--luz-y', ((y + 0.5) * 100).toFixed(1) + '%');
                alvo.classList.add('em-foco');
            });

            alvo.addEventListener('pointerleave', function () {
                alvo.style.setProperty('--ry', '0deg');
                alvo.style.setProperty('--rx', '0deg');
                alvo.classList.remove('em-foco');
            });
        });
    }

    function montarFundo() {
        var fundo = document.querySelector('.bg-dinamico');
        if (!fundo) return;

        if (!fundo.querySelector('.bg-camada')) {
            fundo.insertAdjacentHTML('beforeend',
                '<span class="bg-camada bg-orbe bg-orbe-1"></span>' +
                '<span class="bg-camada bg-orbe bg-orbe-2"></span>' +
                '<span class="bg-camada bg-orbe bg-orbe-3"></span>' +
                '<span class="bg-camada bg-grade"></span>' +
                '<span class="bg-camada bg-raios"></span>');
        }

        if (!document.querySelector('.bg-vinheta')) {
            var vinheta = document.createElement('div');
            vinheta.className = 'bg-vinheta';
            vinheta.setAttribute('aria-hidden', 'true');
            fundo.insertAdjacentElement('afterend', vinheta);
        }

        ligarBrasas(fundo);
    }

    function ligarBrasas(fundo) {
        if (semMovimento || modoLeve) return;
        if (fundo.querySelector('.bg-brasas')) return;

        var tela = document.createElement('canvas');
        tela.className = 'bg-brasas';
        tela.setAttribute('aria-hidden', 'true');
        fundo.appendChild(tela);

        var ctx = tela.getContext('2d');
        var densidade = window.innerWidth < 760 ? 26 : 54;
        var brasas = [];
        var largura = 0;
        var altura = 0;
        var ponteiro = { x: -999, y: -999 };
        var ativo = true;
        var quadro = null;

        function medir() {
            var escala = Math.min(window.devicePixelRatio || 1, 2);
            largura = window.innerWidth;
            altura = window.innerHeight;
            tela.width = Math.floor(largura * escala);
            tela.height = Math.floor(altura * escala);
            tela.style.width = largura + 'px';
            tela.style.height = altura + 'px';
            ctx.setTransform(escala, 0, 0, escala, 0, 0);
        }

        function nova(inicial) {
            return {
                x: Math.random() * largura,
                y: inicial ? Math.random() * altura : altura + Math.random() * 60,
                r: 0.6 + Math.random() * 1.9,
                vy: 0.16 + Math.random() * 0.5,
                vx: (Math.random() - 0.5) * 0.22,
                fase: Math.random() * Math.PI * 2,
                giro: 0.006 + Math.random() * 0.014,
                ouro: Math.random() > 0.62
            };
        }

        function desenhar() {
            if (!ativo) { quadro = null; return; }

            ctx.clearRect(0, 0, largura, altura);

            for (var i = 0; i < brasas.length; i++) {
                var b = brasas[i];
                b.fase += b.giro;
                b.y -= b.vy;
                b.x += b.vx + Math.sin(b.fase) * 0.32;

                var dx = b.x - ponteiro.x;
                var dy = b.y - ponteiro.y;
                var dist2 = dx * dx + dy * dy;
                if (dist2 < 24000) {
                    var forca = (1 - dist2 / 24000) * 1.5;
                    b.x += (dx / (Math.sqrt(dist2) || 1)) * forca;
                    b.y += (dy / (Math.sqrt(dist2) || 1)) * forca;
                }

                if (b.y < -20 || b.x < -40 || b.x > largura + 40) brasas[i] = nova(false);

                var alfa = (0.22 + Math.abs(Math.sin(b.fase)) * 0.45) * Math.min(1, b.y / altura + 0.25);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = b.ouro
                    ? 'rgba(232, 180, 74, ' + alfa.toFixed(3) + ')'
                    : 'rgba(219, 42, 56, ' + alfa.toFixed(3) + ')';
                ctx.shadowBlur = 12;
                ctx.shadowColor = b.ouro ? 'rgba(232, 180, 74, 0.6)' : 'rgba(193, 18, 31, 0.65)';
                ctx.fill();
            }

            ctx.shadowBlur = 0;
            quadro = requestAnimationFrame(desenhar);
        }

        function iniciar() {
            medir();
            brasas = [];
            for (var i = 0; i < densidade; i++) brasas.push(nova(true));
            if (!quadro) quadro = requestAnimationFrame(desenhar);
        }

        window.addEventListener('resize', medir, { passive: true });
        window.addEventListener('pointermove', function (e) {
            ponteiro.x = e.clientX;
            ponteiro.y = e.clientY;
        }, { passive: true });
        window.addEventListener('pointerleave', function () {
            ponteiro.x = -999;
            ponteiro.y = -999;
        });

        document.addEventListener('visibilitychange', function () {
            ativo = !document.hidden;
            if (ativo && !quadro) quadro = requestAnimationFrame(desenhar);
        });

        iniciar();
    }

    function ligarParalaxe() {
        if (!pontoFino || semMovimento) return;

        var alvoX = 0.5, alvoY = 0.5, atualX = 0.5, atualY = 0.5, rodando = false;

        function passo() {
            atualX += (alvoX - atualX) * 0.055;
            atualY += (alvoY - atualY) * 0.055;
            var raiz = document.documentElement;
            raiz.style.setProperty('--mx', atualX.toFixed(4));
            raiz.style.setProperty('--my', atualY.toFixed(4));

            if (Math.abs(alvoX - atualX) > 0.0008 || Math.abs(alvoY - atualY) > 0.0008) {
                requestAnimationFrame(passo);
            } else {
                rodando = false;
            }
        }

        window.addEventListener('pointermove', function (evento) {
            alvoX = evento.clientX / window.innerWidth;
            alvoY = evento.clientY / window.innerHeight;
            if (!rodando) { rodando = true; requestAnimationFrame(passo); }
        }, { passive: true });
    }

    function ligarIndicadorNav() {
        var trilho = document.querySelector('.nav-links');
        if (!trilho) return;

        function posicionar(alvo) {
            if (!alvo || window.innerWidth <= 768) {
                trilho.style.setProperty('--indicador-opacidade', '0');
                return;
            }
            trilho.style.setProperty('--indicador-x', alvo.offsetLeft + 'px');
            trilho.style.setProperty('--indicador-largura', alvo.offsetWidth + 'px');
            trilho.style.setProperty('--indicador-opacidade', '1');
        }

        function ativo() { return trilho.querySelector('.nav-item.ativo'); }

        posicionar(ativo());
        trilho.querySelectorAll('.nav-item').forEach(function (item) {
            item.addEventListener('pointerenter', function () { posicionar(item); });
        });
        trilho.addEventListener('pointerleave', function () { posicionar(ativo()); });
        window.addEventListener('resize', function () { posicionar(ativo()); });
        window.addEventListener('load', function () { posicionar(ativo()); });
    }

    function ligarRolagem() {
        var barra = document.querySelector('.barra-progresso-rolagem');
        if (!barra) {
            barra = document.createElement('div');
            barra.className = 'barra-progresso-rolagem';
            barra.setAttribute('aria-hidden', 'true');
            barra.innerHTML = '<span></span>';
            document.body.appendChild(barra);
        }

        var preenchimento = barra.firstElementChild;
        var ultimo = -1;
        var pendente = false;

        function atualizar() {
            pendente = false;
            var topo = window.scrollY;
            var total = document.documentElement.scrollHeight - window.innerHeight;
            preenchimento.style.transform = 'scaleX(' + (total > 0 ? Math.min(1, topo / total) : 0).toFixed(4) + ')';

            var rolado = topo > 24 ? 1 : 0;
            if (rolado !== ultimo) {
                ultimo = rolado;
                document.body.classList.toggle('rolado', rolado === 1);
            }
        }

        atualizar();
        window.addEventListener('scroll', function () {
            if (pendente) return;
            pendente = true;
            requestAnimationFrame(atualizar);
        }, { passive: true });
    }

    function ligarProfundidade() {
        if (!pontoFino || semMovimento || modoLeve) return;

        document.querySelectorAll('.card-resumo, .cartao-revisao, .cartao-quadro, .forma-xp, .item-diario').forEach(function (cartao) {
            if (cartao.dataset.profundidade === 'ligada') return;
            cartao.dataset.profundidade = 'ligada';

            cartao.addEventListener('pointermove', function (evento) {
                var area = cartao.getBoundingClientRect();
                var x = (evento.clientX - area.left) / area.width;
                var y = (evento.clientY - area.top) / area.height;
                cartao.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
                cartao.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
                cartao.style.setProperty('--px', (x * 100).toFixed(1) + '%');
                cartao.style.setProperty('--py', (y * 100).toFixed(1) + '%');
            });

            cartao.addEventListener('pointerleave', function () {
                cartao.style.setProperty('--ry', '0deg');
                cartao.style.setProperty('--rx', '0deg');
            });
        });
    }

    function ligarOndas() {
        document.addEventListener('pointerdown', function (evento) {
            var alvo = evento.target.closest('.botao, .btn-acao, .btn-saiba-mais, .aba-tarefa, .nav-item, .chip-dia, .canal-botao');
            if (!alvo || semMovimento) return;

            var area = alvo.getBoundingClientRect();
            var onda = document.createElement('span');
            onda.className = 'onda-toque';
            onda.style.left = (evento.clientX - area.left) + 'px';
            onda.style.top = (evento.clientY - area.top) + 'px';

            if (getComputedStyle(alvo).position === 'static') alvo.style.position = 'relative';
            alvo.appendChild(onda);
            setTimeout(function () { onda.remove(); }, 620);
        });
    }

    function ligarRevelacao() {
        var alvos = document.querySelectorAll('.conteudo-principal > section, .conteudo-principal > .grid-cards, .conteudo-principal > .grade-cards, .conteudo-principal > .lista-itens, .conteudo-principal > .grade-calendario, .conteudo-principal > .abas-tarefas, .revelar');
        if (!alvos.length) return;

        if (semMovimento || !('IntersectionObserver' in window)) {
            alvos.forEach(function (a) { a.classList.add('revelar', 'visivel'); });
            return;
        }

        var observador = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (!entrada.isIntersecting) return;
                entrada.target.classList.add('visivel');
                observador.unobserve(entrada.target);
            });
        }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

        alvos.forEach(function (alvo, indice) {
            alvo.classList.add('revelar');
            alvo.style.setProperty('--atraso-revelar', Math.min(indice * 70, 320) + 'ms');
            observador.observe(alvo);
        });
    }

    function observarNovos() {
        if (!('MutationObserver' in window)) return;
        var agendado = false;

        new MutationObserver(function () {
            if (agendado) return;
            agendado = true;
            requestAnimationFrame(function () {
                agendado = false;
                ligarProfundidade();
                montarTotens();
                montarSelos();
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    var aviso = null;
    var avisoTempo = null;

    function avisar(texto, tipo) {
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.className = 'aviso-flutuante';
            aviso.setAttribute('role', 'status');
            document.body.appendChild(aviso);
        }

        aviso.className = 'aviso-flutuante ' + (tipo || 'sucesso');
        aviso.textContent = texto;
        requestAnimationFrame(function () { aviso.classList.add('visivel'); });

        clearTimeout(avisoTempo);
        avisoTempo = setTimeout(function () { aviso.classList.remove('visivel'); }, 2800);
    }

    window.arkhysAvisar = avisar;

    function iniciar() {
        montarFundo();
        montarMarcas();
        montarTotens();
        montarSelos();
        ligarInclinacao('.marca', 18, 12);
        ligarParalaxe();
        ligarIndicadorNav();
        ligarRolagem();
        ligarProfundidade();
        ligarOndas();
        ligarRevelacao();
        observarNovos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
