/* ============================================================
   Agamenon — o totem do Arkhys.

   Usa o vetor real de assets/agamenon.svg (traçado da arte
   original) separado em camadas: massa escura, rubro do penacho
   e manto, ouro do elmo. As camadas ficam em profundidades
   diferentes e reagem ao ponteiro com paralaxe 3D.
   ============================================================ */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var ARQUIVO = 'assets/agamenon.svg';

    /* aura = copia desfocada das linhas acesas, atras de tudo */
    var CAMADAS = [
        { classe: 'totem-aura', grupos: ['ag-rubro', 'ag-ouro'] },
        { classe: 'totem-massa', grupos: ['ag-massa'] },
        { classe: 'totem-rubro', grupos: ['ag-rubro'] },
        { classe: 'totem-ouro', grupos: ['ag-ouro'] }
    ];

    var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pontoFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var modoLeve = document.documentElement.classList.contains('modo-leve');
    var vetor = null;

    window.addEventListener('arkhys:modo-leve', function () { modoLeve = true; });

    function limitar(v, min, max) {
        return v < min ? min : (v > max ? max : v);
    }

    function carregarVetor() {
        if (vetor) return vetor;

        vetor = fetch(ARQUIVO)
            .then(function (r) {
                if (!r.ok) throw new Error('agamenon.svg ' + r.status);
                return r.text();
            })
            .then(function (texto) {
                var doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
                if (doc.querySelector('parsererror')) throw new Error('svg invalido');
                return doc;
            });

        return vetor;
    }

    /* ------------------------------------------------------------ marcacao */
    function svgDaCamada(doc, grupos) {
        var caixa = doc.documentElement.getAttribute('viewBox') || '0 0 800 883';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', caixa);
        svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');

        grupos.forEach(function (id) {
            var grupo = doc.getElementById(id);
            if (!grupo) return;
            var copia = document.importNode(grupo, true);
            copia.removeAttribute('id');
            svg.appendChild(copia);
        });

        return svg;
    }

    function faiscas(total) {
        var html = '';
        for (var i = 0; i < total; i++) html += '<span style="--i:' + i + '"></span>';
        return html;
    }

    function cenarioHtml() {
        return '' +
            '<span class="totem-halo"></span>' +
            '<span class="totem-pedestal">' +
                '<span class="totem-anel totem-anel-3"></span>' +
                '<span class="totem-anel totem-anel-1"></span>' +
                '<span class="totem-anel totem-anel-2"></span>' +
                '<span class="totem-base"></span>' +
            '</span>';
    }

    function frenteHtml() {
        return '' +
            '<span class="totem-olho totem-olho-perto"></span>' +
            '<span class="totem-olho totem-olho-longe"></span>' +
            '<span class="totem-luz"></span>' +
            '<span class="totem-lustro"></span>' +
            '<span class="totem-faiscas">' + faiscas(8) + '</span>' +
            '<span class="totem-pulso"></span>';
    }

    function montarPalco(alvo, doc) {
        var palco = document.createElement('div');
        palco.className = 'totem-palco';
        palco.innerHTML = cenarioHtml();

        CAMADAS.forEach(function (camada) {
            var caixa = document.createElement('div');
            caixa.className = 'totem-camada ' + camada.classe;
            caixa.appendChild(svgDaCamada(doc, camada.grupos));
            palco.appendChild(caixa);
        });

        palco.insertAdjacentHTML('beforeend', frenteHtml());

        alvo.textContent = '';
        alvo.appendChild(palco);
    }

    /* reserva: sem fetch (file://) mostra o vetor inteiro, sem camadas */
    function montarSimples(alvo) {
        alvo.innerHTML =
            '<div class="totem-palco">' + cenarioHtml() +
            '<div class="totem-camada totem-ouro">' +
            '<img src="' + ARQUIVO + '" alt="" aria-hidden="true">' +
            '</div>' + frenteHtml() + '</div>';
    }

    /* --------------------------------------------------------- interacao 3D */
    function ligarInteracao(alvo) {
        if (semMovimento) return;

        var mira = { rx: 0, ry: 0, dx: 0, dy: 0 };
        var atual = { rx: 0, ry: 0, dx: 0, dy: 0 };
        var chaves = ['rx', 'ry', 'dx', 'dy'];
        var area = null;
        var quadro = null;
        var fase = Math.random() * 6.283;
        var ultimoPonteiro = -1e9;
        var visivel = true;

        function medir() {
            area = alvo.getBoundingClientRect();
        }

        function aplicar() {
            var e = alvo.style;
            e.setProperty('--rx', atual.rx.toFixed(2) + 'deg');
            e.setProperty('--ry', atual.ry.toFixed(2) + 'deg');
            e.setProperty('--desloc-x', atual.dx.toFixed(2) + 'px');
            e.setProperty('--desloc-y', atual.dy.toFixed(2) + 'px');
        }

        function passo(agora) {
            if (!visivel || document.hidden) { quadro = null; return; }

            var parado = agora - ultimoPonteiro > 2400;
            if (parado && modoLeve) {
                mira.ry = 0; mira.rx = 0; mira.dx = 0; mira.dy = 0;
            } else if (parado) {
                /* deriva lenta: o totem continua vivo sem o mouse */
                fase += 0.0055;
                mira.ry = Math.sin(fase) * 6;
                mira.rx = Math.sin(fase * 0.73 + 1.1) * 2.8;
                mira.dx = Math.sin(fase * 0.88) * 5;
                mira.dy = Math.cos(fase * 0.61) * 3.4;
            }

            var resto = 0;
            for (var i = 0; i < chaves.length; i++) {
                var k = chaves[i];
                var delta = mira[k] - atual[k];
                atual[k] += delta * 0.075;
                resto += Math.abs(delta);
            }

            aplicar();
            quadro = (parado || resto > 0.02) ? requestAnimationFrame(passo) : null;
        }

        function acordar() {
            if (!quadro && visivel && !document.hidden) quadro = requestAnimationFrame(passo);
        }

        var arrastando = false;

        function mirarPelo(evento, aproximar) {
            if (!area || !area.width) medir();
            if (!area.width) return;

            var cx = area.left + area.width / 2;
            var cy = area.top + area.height / 2;
            var nx = limitar((evento.clientX - cx) / (area.width * 0.62), -1, 1);
            var ny = limitar((evento.clientY - cy) / (area.height * 0.62), -1, 1);

            mira.ry = nx * 26;
            mira.rx = -ny * 15;
            mira.dx = nx * 20;
            mira.dy = ny * 13;
            ultimoPonteiro = performance.now();

            if (aproximar) {
                alvo.classList.add('em-foco');
                alvo.style.setProperty('--foco', '1');
                alvo.style.setProperty('--luz-x', (((evento.clientX - area.left) / area.width) * 100).toFixed(1) + '%');
                alvo.style.setProperty('--luz-y', (((evento.clientY - area.top) / area.height) * 100).toFixed(1) + '%');
            }

            acordar();
        }

        alvo.addEventListener('pointerdown', function (evento) {
            if (evento.pointerType !== 'touch') return;
            arrastando = true;
            if (alvo.setPointerCapture) {
                try { alvo.setPointerCapture(evento.pointerId); } catch (erro) { arrastando = true; }
            }
            medir();
            mirarPelo(evento, true);
        });

        alvo.addEventListener('pointermove', function (evento) {
            if (evento.pointerType !== 'touch' || !arrastando) return;
            mirarPelo(evento, true);
        });

        function soltarToque() {
            if (!arrastando) return;
            arrastando = false;
            ultimoPonteiro = -1e9;
            alvo.classList.remove('em-foco');
            alvo.style.setProperty('--foco', '0');
            acordar();
        }

        alvo.addEventListener('pointerup', soltarToque);
        alvo.addEventListener('pointercancel', soltarToque);

        if (pontoFino) {
            window.addEventListener('pointermove', function (evento) {
                if (evento.pointerType === 'touch') return;
                if (!area || !area.width) medir();
                if (!area.width) return;

                var cx = area.left + area.width / 2;
                var cy = area.top + area.height / 2;
                var nx = limitar((evento.clientX - cx) / (window.innerWidth * 0.5), -1, 1);
                var ny = limitar((evento.clientY - cy) / (window.innerHeight * 0.55), -1, 1);

                mira.ry = nx * 20;
                mira.rx = -ny * 11;
                mira.dx = nx * 16;
                mira.dy = ny * 10;
                ultimoPonteiro = performance.now();

                var perto = evento.clientX > area.left - 48 && evento.clientX < area.right + 48 &&
                            evento.clientY > area.top - 48 && evento.clientY < area.bottom + 48;

                alvo.classList.toggle('em-foco', perto);
                alvo.style.setProperty('--foco', perto ? '1' : '0');

                if (perto) {
                    alvo.style.setProperty('--luz-x', (((evento.clientX - area.left) / area.width) * 100).toFixed(1) + '%');
                    alvo.style.setProperty('--luz-y', (((evento.clientY - area.top) / area.height) * 100).toFixed(1) + '%');
                }

                acordar();
            }, { passive: true });
        }

        alvo.addEventListener('pointerdown', function () {
            var pulso = alvo.querySelector('.totem-pulso');
            if (!pulso) return;
            pulso.classList.remove('disparar');
            void pulso.offsetWidth;
            pulso.classList.add('disparar');
        });

        window.addEventListener('resize', medir, { passive: true });
        window.addEventListener('scroll', medir, { passive: true });
        document.addEventListener('visibilitychange', acordar);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entradas) {
                visivel = entradas[0].isIntersecting;
                if (visivel) { medir(); acordar(); }
            }, { threshold: 0.05 }).observe(alvo);
        }

        medir();
        acordar();
    }

    /* ---------------------------------------------------------------- montar */
    function montar() {
        var alvos = document.querySelectorAll('[data-totem]');
        if (!alvos.length) return;

        Array.prototype.forEach.call(alvos, function (alvo) {
            if (alvo.dataset.agamenon) return;
            alvo.dataset.agamenon = 'carregando';
            alvo.classList.add('totem');

            function pronto() {
                alvo.dataset.agamenon = 'pronto';
                requestAnimationFrame(function () { alvo.classList.add('montado'); });
                ligarInteracao(alvo);
            }

            carregarVetor()
                .then(function (doc) { montarPalco(alvo, doc); pronto(); })
                .catch(function () { montarSimples(alvo); pronto(); });
        });
    }

    window.ArkhysAgamenon = { montar: montar };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', montar);
    } else {
        montar();
    }
})();
