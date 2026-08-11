(function () {
    'use strict';

    var LOGO = 'assets/logo-arkhys.png';
    var TOTEM = 'assets/arkhys-totem.png';

    var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var telaPequena = window.matchMedia('(max-width: 768px)').matches;
    var poucaMemoria = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    var tarefasQuadro = [];
    var lacoAtivo = false;

    function inscrever(tarefa) {
        tarefasQuadro.push(tarefa);
        if (!lacoAtivo) {
            lacoAtivo = true;
            requestAnimationFrame(rodar);
        }
    }

    function rodar(agora) {
        if (document.hidden) {
            lacoAtivo = false;
            return;
        }

        for (var i = 0; i < tarefasQuadro.length; i++) tarefasQuadro[i](agora);
        requestAnimationFrame(rodar);
    }

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && !lacoAtivo && tarefasQuadro.length) {
            lacoAtivo = true;
            requestAnimationFrame(rodar);
        }
    });

    function suavizar(estado) {
        estado.x += (estado.alvoX - estado.x) * estado.forca;
        estado.y += (estado.alvoY - estado.y) * estado.forca;
        return Math.abs(estado.alvoX - estado.x) > 0.0005 || Math.abs(estado.alvoY - estado.y) > 0.0005;
    }

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

    function montarTotens() {
        document.querySelectorAll('[data-totem]').forEach(function (alvo) {
            if (alvo.querySelector('.totem-palco')) return;
            alvo.classList.add('totem');
            alvo.innerHTML = '' +
                '<div class="totem-palco">' +
                    '<span class="totem-halo" aria-hidden="true"></span>' +
                    '<span class="totem-anel totem-anel-1" aria-hidden="true"></span>' +
                    '<span class="totem-anel totem-anel-2" aria-hidden="true"></span>' +
                    '<span class="totem-anel totem-anel-3" aria-hidden="true"></span>' +
                    '<img class="totem-aura" src="' + TOTEM + '" alt="" aria-hidden="true">' +
                    '<img class="totem-corpo" src="' + TOTEM + '" alt="Elmo do Arkhys">' +
                    '<span class="totem-lustro" aria-hidden="true"></span>' +
                    '<span class="totem-faisca" aria-hidden="true"></span>' +
                    '<span class="totem-base" aria-hidden="true"></span>' +
                    '<img class="totem-reflexo" src="' + TOTEM + '" alt="" aria-hidden="true">' +
                '</div>';
        });
    }

    function montarPilhas() {
        document.querySelectorAll('[data-pilha]').forEach(function (alvo) {
            if (alvo.querySelector('.pilha-palco')) return;
            alvo.classList.add('pilha-3d');
            alvo.setAttribute('aria-hidden', 'true');
            alvo.innerHTML = '' +
                '<div class="pilha-palco">' +
                    '<span class="pilha-brilho"></span>' +
                    '<span class="pilha-ficha pilha-ficha-3"></span>' +
                    '<span class="pilha-ficha pilha-ficha-2"></span>' +
                    '<span class="pilha-ficha pilha-ficha-1">' +
                        '<span class="pilha-linha"></span>' +
                        '<span class="pilha-linha"></span>' +
                        '<span class="pilha-linha"></span>' +
                    '</span>' +
                    '<span class="pilha-selo">' +
                        '<svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-concluido"></use></svg>' +
                    '</span>' +
                    '<span class="pilha-sombra"></span>' +
                '</div>';
        });
    }

    function montarCofres() {
        document.querySelectorAll('[data-cofre]').forEach(function (alvo) {
            if (alvo.querySelector('.cofre-palco')) return;
            alvo.classList.add('cofre-3d');
            alvo.setAttribute('aria-hidden', 'true');
            alvo.innerHTML = '' +
                '<div class="cofre-palco">' +
                    '<div class="cofre-cubo">' +
                        '<span class="cofre-face cofre-frente">' +
                            '<span class="cofre-disco">' +
                                '<span class="cofre-raio"></span>' +
                                '<span class="cofre-raio"></span>' +
                                '<span class="cofre-raio"></span>' +
                                '<span class="cofre-miolo"></span>' +
                            '</span>' +
                            '<span class="cofre-rebite cofre-rebite-1"></span>' +
                            '<span class="cofre-rebite cofre-rebite-2"></span>' +
                            '<span class="cofre-rebite cofre-rebite-3"></span>' +
                            '<span class="cofre-rebite cofre-rebite-4"></span>' +
                        '</span>' +
                        '<span class="cofre-face cofre-tras"></span>' +
                        '<span class="cofre-face cofre-esquerda"></span>' +
                        '<span class="cofre-face cofre-direita"></span>' +
                        '<span class="cofre-face cofre-topo"></span>' +
                        '<span class="cofre-face cofre-base"></span>' +
                    '</div>' +
                    '<span class="cofre-halo"></span>' +
                    '<span class="cofre-sombra"></span>' +
                '</div>';
        });
    }

    function ligarPeca(alvo, forcaY, forcaX, giroOcioso) {
        if (semMovimento || alvo.dataset.peca === 'ligada') return;
        alvo.dataset.peca = 'ligada';

        var palco = alvo.firstElementChild;
        if (!palco) return;

        var estado = { x: 0, y: 0, alvoX: 0, alvoY: 0, forca: 0.12 };
        var tocando = false;
        var ocioso = 0;
        var precisaPintar = true;

        var ultimoOcioso = 0;

        function pintar(agora) {
            var movendo = suavizar(estado);
            var animaOcioso = !tocando && giroOcioso && !modoLeve;

            if (animaOcioso) {
                if (agora - ultimoOcioso < 40) {
                    if (!movendo && !precisaPintar) return;
                } else {
                    ultimoOcioso = agora;
                    ocioso = Math.sin(agora / 2600) * giroOcioso;
                }
            } else if (!movendo && !precisaPintar) {
                return;
            }

            alvo.style.setProperty('--ry', (estado.x * forcaY + ocioso).toFixed(2) + 'deg');
            alvo.style.setProperty('--rx', (-estado.y * forcaX).toFixed(2) + 'deg');
            precisaPintar = movendo;
        }

        inscrever(pintar);

        function mover(evento) {
            var area = alvo.getBoundingClientRect();
            estado.alvoX = (evento.clientX - area.left) / area.width - 0.5;
            estado.alvoY = (evento.clientY - area.top) / area.height - 0.5;
            precisaPintar = true;
            alvo.classList.add('em-foco');
        }

        function soltar() {
            tocando = false;
            estado.alvoX = 0;
            estado.alvoY = 0;
            precisaPintar = true;
            alvo.classList.remove('em-foco');
        }

        alvo.addEventListener('pointerdown', function (evento) {
            tocando = true;
            if (alvo.setPointerCapture) {
                try { alvo.setPointerCapture(evento.pointerId); } catch (e) { tocando = true; }
            }
            mover(evento);
        });

        alvo.addEventListener('pointermove', function (evento) {
            if (evento.pointerType === 'touch' && !tocando) return;
            mover(evento);
        });

        alvo.addEventListener('pointerup', soltar);
        alvo.addEventListener('pointercancel', soltar);
        alvo.addEventListener('pointerleave', function (evento) {
            if (evento.pointerType !== 'touch') soltar();
        });
    }

    function ligarPecas() {
        document.querySelectorAll('.marca').forEach(function (el) { ligarPeca(el, 20, 13, 0); });
        document.querySelectorAll('.totem').forEach(function (el) { ligarPeca(el, 28, 17, 5); });
        document.querySelectorAll('.pilha-3d').forEach(function (el) { ligarPeca(el, 26, 18, 7); });
        document.querySelectorAll('.cofre-3d').forEach(function (el) { ligarPeca(el, 34, 20, 12); });
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
        if (semMovimento || fundo.querySelector('.bg-brasas')) return;

        var tela = document.createElement('canvas');
        tela.className = 'bg-brasas';
        tela.setAttribute('aria-hidden', 'true');
        fundo.appendChild(tela);

        var ctx = tela.getContext('2d', { alpha: true, desynchronized: true });
        var brasas = [];
        var largura = 0;
        var altura = 0;
        var escala = 1;
        var ponteiro = { x: -999, y: -999, ativo: false };
        var ultimoQuadro = 0;
        var intervalo = poucaMemoria || telaPequena ? 33 : 16;

        function densidade() {
            var area = window.innerWidth * window.innerHeight;
            var base = Math.round(area / 26000);
            var teto = poucaMemoria ? 22 : (telaPequena ? 26 : 54);
            return Math.max(12, Math.min(teto, base));
        }

        function medir() {
            escala = Math.min((window.devicePixelRatio || 1) * 0.75, telaPequena ? 1 : 1.4);
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
                r: 0.7 + Math.random() * 1.9,
                vy: 0.18 + Math.random() * 0.5,
                vx: (Math.random() - 0.5) * 0.22,
                fase: Math.random() * Math.PI * 2,
                giro: 0.006 + Math.random() * 0.014,
                ouro: Math.random() > 0.62
            };
        }

        function pintar(agora) {
            if (modoLeve) return;
            if (agora - ultimoQuadro < intervalo) return;
            ultimoQuadro = agora;

            ctx.clearRect(0, 0, largura, altura);

            for (var i = 0; i < brasas.length; i++) {
                var b = brasas[i];
                b.fase += b.giro;
                b.y -= b.vy;
                b.x += b.vx + Math.sin(b.fase) * 0.3;

                if (ponteiro.ativo) {
                    var dx = b.x - ponteiro.x;
                    var dy = b.y - ponteiro.y;
                    var dist2 = dx * dx + dy * dy;
                    if (dist2 < 22000 && dist2 > 1) {
                        var dist = Math.sqrt(dist2);
                        var forca = (1 - dist2 / 22000) * 1.6;
                        b.x += (dx / dist) * forca;
                        b.y += (dy / dist) * forca;
                    }
                }

                if (b.y < -20 || b.x < -40 || b.x > largura + 40) brasas[i] = nova(false);

                var alfa = (0.2 + Math.abs(Math.sin(b.fase)) * 0.42) * Math.min(1, b.y / altura + 0.3);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, 6.283185);
                ctx.fillStyle = b.ouro
                    ? 'rgba(240, 196, 99, ' + alfa.toFixed(3) + ')'
                    : 'rgba(226, 52, 66, ' + alfa.toFixed(3) + ')';
                ctx.fill();
            }
        }

        function reiniciar() {
            medir();
            var alvo = densidade();
            brasas = [];
            for (var i = 0; i < alvo; i++) brasas.push(nova(true));
        }

        var redimensionar = null;
        window.addEventListener('resize', function () {
            clearTimeout(redimensionar);
            redimensionar = setTimeout(reiniciar, 220);
        }, { passive: true });

        window.addEventListener('pointermove', function (e) {
            ponteiro.x = e.clientX;
            ponteiro.y = e.clientY;
            ponteiro.ativo = true;
        }, { passive: true });

        window.addEventListener('pointerup', function () { ponteiro.ativo = false; }, { passive: true });
        window.addEventListener('pointerleave', function () { ponteiro.ativo = false; }, { passive: true });

        reiniciar();
        inscrever(pintar);
    }

    function ligarParalaxeFundo() {
        if (semMovimento) return;

        var estado = { x: 0.5, y: 0.5, alvoX: 0.5, alvoY: 0.5, forca: 0.06 };
        var raiz = document.documentElement;
        var precisa = false;

        inscrever(function () {
            if (!precisa) return;
            precisa = suavizar(estado);
            raiz.style.setProperty('--mx', estado.x.toFixed(4));
            raiz.style.setProperty('--my', estado.y.toFixed(4));
        });

        window.addEventListener('pointermove', function (evento) {
            estado.alvoX = evento.clientX / window.innerWidth;
            estado.alvoY = evento.clientY / window.innerHeight;
            precisa = true;
        }, { passive: true });

        if (telaPequena) {
            window.addEventListener('scroll', function () {
                var total = document.documentElement.scrollHeight - window.innerHeight;
                estado.alvoY = total > 0 ? Math.min(1, window.scrollY / total) : 0.5;
                estado.alvoX = 0.5 + Math.sin(window.scrollY / 900) * 0.3;
                precisa = true;
            }, { passive: true });
        }
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
            item.addEventListener('pointerenter', function (evento) {
                if (evento.pointerType !== 'touch') posicionar(item);
            });
        });
        trilho.addEventListener('pointerleave', function () { posicionar(ativo()); });
        window.addEventListener('resize', function () { posicionar(ativo()); }, { passive: true });
        window.addEventListener('load', function () { posicionar(ativo()); });
    }

    function ligarRolagem() {
        var barra = document.createElement('div');
        barra.className = 'barra-progresso-rolagem';
        barra.setAttribute('aria-hidden', 'true');
        barra.innerHTML = '<span></span>';
        document.body.appendChild(barra);

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
        if (semMovimento) return;

        var seletor = '.card-resumo, .cartao-revisao, .cartao-quadro, .forma-xp, .item-diario, .selo-revisao';

        document.querySelectorAll(seletor).forEach(function (cartao) {
            if (cartao.dataset.profundidade === 'ligada') return;
            cartao.dataset.profundidade = 'ligada';

            var pendente = false;

            function aplicar(evento) {
                if (pendente) return;
                pendente = true;
                requestAnimationFrame(function () {
                    pendente = false;
                    var area = cartao.getBoundingClientRect();
                    var x = (evento.clientX - area.left) / area.width;
                    var y = (evento.clientY - area.top) / area.height;
                    cartao.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
                    cartao.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
                    cartao.style.setProperty('--px', (x * 100).toFixed(1) + '%');
                    cartao.style.setProperty('--py', (y * 100).toFixed(1) + '%');
                });
            }

            function repousar() {
                cartao.style.setProperty('--ry', '0deg');
                cartao.style.setProperty('--rx', '0deg');
            }

            cartao.addEventListener('pointermove', function (evento) {
                if (evento.pointerType === 'touch') return;
                aplicar(evento);
            }, { passive: true });

            cartao.addEventListener('pointerdown', function (evento) {
                if (evento.pointerType !== 'touch') return;
                aplicar(evento);
                cartao.classList.add('tocado');
            }, { passive: true });

            cartao.addEventListener('pointerup', function () {
                repousar();
                cartao.classList.remove('tocado');
            }, { passive: true });

            cartao.addEventListener('pointercancel', function () {
                repousar();
                cartao.classList.remove('tocado');
            }, { passive: true });

            cartao.addEventListener('pointerleave', repousar, { passive: true });
        });
    }

    function ligarOndas() {
        if (semMovimento) return;

        document.addEventListener('pointerdown', function (evento) {
            var alvo = evento.target.closest && evento.target.closest('.botao, .btn-acao, .btn-saiba-mais, .aba-tarefa, .nav-item, .chip-dia, .canal-botao, .aba-item');
            if (!alvo) return;

            var area = alvo.getBoundingClientRect();
            var onda = document.createElement('span');
            onda.className = 'onda-toque';
            onda.style.left = (evento.clientX - area.left) + 'px';
            onda.style.top = (evento.clientY - area.top) + 'px';

            if (getComputedStyle(alvo).position === 'static') alvo.style.position = 'relative';
            alvo.appendChild(onda);
            setTimeout(function () { onda.remove(); }, 620);
        }, { passive: true });
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
        }, { rootMargin: '0px 0px -4% 0px', threshold: 0.03 });

        alvos.forEach(function (alvo, indice) {
            alvo.classList.add('revelar');
            alvo.style.setProperty('--atraso-revelar', Math.min(indice * 60, 260) + 'ms');
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
                montarTotens();
                montarPilhas();
                montarCofres();
                ligarPecas();
                ligarProfundidade();
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

    function ligarInstalacao() {
        if ('serviceWorker' in navigator && location.protocol !== 'file:') {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('sw.js').catch(function () { });
            });
        }

        var pedido = null;
        var botao = null;

        function criarBotao() {
            if (botao) return botao;
            botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'botao-instalar';
            botao.innerHTML = '<svg class="icon-svg icon-svg-btn"><use href="assets/icones/arkhys-icons.svg#icon-download"></use></svg><span>Instalar o Arkhys</span>';
            botao.addEventListener('click', async function () {
                if (!pedido) return;
                botao.disabled = true;
                pedido.prompt();
                var escolha = await pedido.userChoice.catch(function () { return { outcome: 'dismissed' }; });
                pedido = null;
                botao.remove();
                botao = null;
                if (escolha.outcome === 'accepted') avisar('Arkhys instalado no seu aparelho.');
            });
            document.body.appendChild(botao);
            requestAnimationFrame(function () { botao.classList.add('visivel'); });
            return botao;
        }

        window.addEventListener('beforeinstallprompt', function (evento) {
            evento.preventDefault();
            pedido = evento;
            if (localStorage.getItem('arkhys_instalacao_dispensada') === '1') return;
            criarBotao();
        });

        window.addEventListener('appinstalled', function () {
            localStorage.setItem('arkhys_instalacao_dispensada', '1');
            if (botao) { botao.remove(); botao = null; }
        });
    }

    var modoLeve = false;

    function aplicarModoLeve() {
        if (modoLeve) return;
        modoLeve = true;
        document.documentElement.classList.add('modo-leve');
    }

    function vigiarDesempenho() {
        if (semMovimento) return;

        function amostrar(quantos, aoTerminar) {
            var quadros = [];
            var anterior = performance.now();

            function passo(agora) {
                quadros.push(agora - anterior);
                anterior = agora;
                if (quadros.length < quantos) requestAnimationFrame(passo);
                else {
                    quadros.sort(function (a, b) { return a - b; });
                    aoTerminar(1000 / quadros[Math.floor(quadros.length / 2)]);
                }
            }

            requestAnimationFrame(passo);
        }

        var checagens = [1200, 4000, 8000];
        var limites = [50, 48, 46];

        checagens.forEach(function (atraso, indice) {
            setTimeout(function () {
                if (modoLeve) return;
                amostrar(46, function (fps) {
                    if (fps >= limites[indice] || modoLeve) return;
                    amostrar(46, function (confirmacao) {
                        if (confirmacao < limites[indice]) aplicarModoLeve();
                    });
                });
            }, atraso);
        });
    }

    function ajustarViewport() {
        function medir() {
            document.documentElement.style.setProperty('--altura-tela', window.innerHeight * 0.01 + 'px');
        }
        medir();
        window.addEventListener('resize', medir, { passive: true });
        window.addEventListener('orientationchange', medir);
    }

    function iniciar() {
        if (semMovimento) document.documentElement.classList.add('sem-movimento');
        if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
            document.documentElement.classList.add('modo-app');
        }

        ajustarViewport();
        montarFundo();
        montarMarcas();
        montarTotens();
        montarPilhas();
        montarCofres();
        ligarPecas();
        ligarParalaxeFundo();
        ligarIndicadorNav();
        ligarRolagem();
        ligarProfundidade();
        ligarOndas();
        ligarRevelacao();
        observarNovos();
        ligarInstalacao();
        vigiarDesempenho();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
