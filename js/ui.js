(function () {
    'use strict';

    var CAMINHO_EMBLEMA = 'assets/arkhys-simbolo.svg';
    var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pontoFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function marcaHtml(variacao) {
        return '' +
            '<span class="marca ' + variacao + '">' +
                '<span class="marca-palco">' +
                    '<span class="marca-emblema"><img src="' + CAMINHO_EMBLEMA + '" alt="" aria-hidden="true"></span>' +
                    '<span class="marca-texto">' +
                        '<span class="marca-nome" data-texto="ARKHYS">ARKHYS</span>' +
                        '<span class="marca-lema">Organize <em>·</em> Evolua <em>·</em> Conquiste</span>' +
                    '</span>' +
                '</span>' +
            '</span>';
    }

    function montarMarcas() {
        var alvos = document.querySelectorAll('.nav-logo, .logo-mobile-flutuante, .logo-acesso, .publico-marca, [data-marca]');

        alvos.forEach(function (alvo) {
            if (alvo.querySelector('.marca')) return;

            var variacao = alvo.dataset.marca || '';
            if (!variacao) {
                if (alvo.classList.contains('logo-mobile-flutuante')) variacao = 'marca-compacta';
                else if (alvo.classList.contains('logo-acesso')) variacao = 'marca-grande marca-empilhada';
                else if (alvo.classList.contains('publico-marca')) variacao = 'marca-compacta';
            }

            alvo.innerHTML = marcaHtml(variacao);
            if (!alvo.getAttribute('aria-label')) alvo.setAttribute('aria-label', 'Arkhys');
        });
    }

    function ligarInclinacaoMarca() {
        if (!pontoFino || movimentoReduzido) return;

        document.querySelectorAll('.marca').forEach(function (marca) {
            var palco = marca.querySelector('.marca-palco');
            if (!palco) return;

            marca.addEventListener('pointermove', function (evento) {
                var area = marca.getBoundingClientRect();
                var x = (evento.clientX - area.left) / area.width - 0.5;
                var y = (evento.clientY - area.top) / area.height - 0.5;
                palco.style.setProperty('--ry', (x * 22).toFixed(2));
                palco.style.setProperty('--rx', (-y * 16).toFixed(2));
                palco.style.transition = 'transform 90ms linear';
            });

            marca.addEventListener('pointerleave', function () {
                palco.style.transition = '';
                palco.style.setProperty('--ry', '0');
                palco.style.setProperty('--rx', '0');
            });
        });
    }

    function montarFundo() {
        var fundo = document.querySelector('.bg-dinamico');
        if (!fundo) return;

        if (!fundo.querySelector('.bg-orbe')) {
            fundo.insertAdjacentHTML('beforeend', '<span class="bg-orbe bg-orbe-1"></span><span class="bg-orbe bg-orbe-2"></span>');
        }

        if (!document.querySelector('.bg-vinheta')) {
            var vinheta = document.createElement('div');
            vinheta.className = 'bg-vinheta';
            vinheta.setAttribute('aria-hidden', 'true');
            fundo.insertAdjacentElement('afterend', vinheta);
        }
    }

    function ligarParalaxeFundo() {
        if (!pontoFino || movimentoReduzido) return;

        var alvoX = 0.5;
        var alvoY = 0.5;
        var atualX = 0.5;
        var atualY = 0.5;
        var rodando = false;

        function passo() {
            atualX += (alvoX - atualX) * 0.06;
            atualY += (alvoY - atualY) * 0.06;
            document.documentElement.style.setProperty('--mx', atualX.toFixed(4));
            document.documentElement.style.setProperty('--my', atualY.toFixed(4));

            if (Math.abs(alvoX - atualX) > 0.001 || Math.abs(alvoY - atualY) > 0.001) {
                requestAnimationFrame(passo);
            } else {
                rodando = false;
            }
        }

        window.addEventListener('pointermove', function (evento) {
            alvoX = evento.clientX / window.innerWidth;
            alvoY = evento.clientY / window.innerHeight;
            if (!rodando) {
                rodando = true;
                requestAnimationFrame(passo);
            }
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

        function ativo() {
            return trilho.querySelector('.nav-item.ativo');
        }

        posicionar(ativo());

        trilho.querySelectorAll('.nav-item').forEach(function (item) {
            item.addEventListener('pointerenter', function () { posicionar(item); });
        });

        trilho.addEventListener('pointerleave', function () { posicionar(ativo()); });
        window.addEventListener('resize', function () { posicionar(ativo()); });
        window.addEventListener('load', function () { posicionar(ativo()); });
    }

    function ligarRolagem() {
        var ultimo = -1;

        function atualizar() {
            var rolado = window.scrollY > 24 ? 1 : 0;
            if (rolado !== ultimo) {
                ultimo = rolado;
                document.body.classList.toggle('rolado', rolado === 1);
            }
        }

        atualizar();
        window.addEventListener('scroll', atualizar, { passive: true });
    }

    function ligarProfundidade(raiz) {
        if (!pontoFino || movimentoReduzido) return;

        var alvo = raiz || document;
        alvo.querySelectorAll('.card-resumo, .cartao-revisao').forEach(function (cartao) {
            if (cartao.dataset.profundidade === 'ligada') return;
            cartao.dataset.profundidade = 'ligada';

            cartao.addEventListener('pointermove', function (evento) {
                var area = cartao.getBoundingClientRect();
                var x = (evento.clientX - area.left) / area.width;
                var y = (evento.clientY - area.top) / area.height;
                cartao.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2));
                cartao.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2));
                cartao.style.setProperty('--px', (x * 100).toFixed(1) + '%');
                cartao.style.setProperty('--py', (y * 100).toFixed(1) + '%');
            });

            cartao.addEventListener('pointerleave', function () {
                cartao.style.setProperty('--ry', '0');
                cartao.style.setProperty('--rx', '0');
            });
        });
    }

    function ligarRevelacao() {
        var alvos = document.querySelectorAll('.conteudo-principal > section, .conteudo-principal > .grid-cards, .conteudo-principal > .grade-cards, .conteudo-principal > .lista-itens, .conteudo-principal > .grade-calendario, .revelar');
        if (!alvos.length) return;

        if (movimentoReduzido || !('IntersectionObserver' in window)) {
            alvos.forEach(function (alvo) { alvo.classList.add('revelar', 'visivel'); });
            return;
        }

        var observador = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (!entrada.isIntersecting) return;
                entrada.target.classList.add('visivel');
                observador.unobserve(entrada.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

        alvos.forEach(function (alvo, indice) {
            alvo.classList.add('revelar');
            alvo.style.setProperty('--atraso-revelar', Math.min(indice * 70, 340) + 'ms');
            observador.observe(alvo);
        });
    }

    function observarConteudoNovo() {
        if (!('MutationObserver' in window)) return;

        var observador = new MutationObserver(function () {
            ligarProfundidade(document);
        });

        observador.observe(document.body, { childList: true, subtree: true });
    }

    var avisoAtual = null;
    var avisoTempo = null;

    function avisar(texto, tipo) {
        if (!avisoAtual) {
            avisoAtual = document.createElement('div');
            avisoAtual.className = 'aviso-flutuante';
            avisoAtual.setAttribute('role', 'status');
            document.body.appendChild(avisoAtual);
        }

        avisoAtual.className = 'aviso-flutuante ' + (tipo || 'sucesso');
        avisoAtual.textContent = texto;
        requestAnimationFrame(function () { avisoAtual.classList.add('visivel'); });

        clearTimeout(avisoTempo);
        avisoTempo = setTimeout(function () { avisoAtual.classList.remove('visivel'); }, 2600);
    }

    window.arkhysAvisar = avisar;

    function iniciar() {
        montarFundo();
        montarMarcas();
        ligarInclinacaoMarca();
        ligarParalaxeFundo();
        ligarIndicadorNav();
        ligarRolagem();
        ligarProfundidade(document);
        ligarRevelacao();
        observarConteudoNovo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
