let overlayCelebracao = null;

export function celebrarConclusao({ titulo = '', texto = 'Tarefa concluída', duracao = 1900 } = {}) {
    return new Promise(resolve => {
        overlayCelebracao?.remove();

        const overlay = document.createElement('div');
        overlayCelebracao = overlay;
        overlay.className = 'celebracao-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.innerHTML = `
            <div class="celebracao-cartao">
                <div class="celebracao-brasao">
                    <span class="celebracao-anel"></span>
                    <span class="celebracao-anel celebracao-anel-2"></span>
                    <img src="assets/arkhys-simbolo.svg" alt="Arkhys" class="celebracao-logo">
                    <span class="celebracao-selo">
                        <svg class="icon-svg"><use href="assets/icones/arkhys-icons.svg#icon-concluido"></use></svg>
                    </span>
                </div>
                <p class="celebracao-texto"></p>
                ${titulo ? '<p class="celebracao-subtexto"></p>' : ''}
                <div class="celebracao-faixas">
                    ${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}
                </div>
            </div>
        `;

        overlay.querySelector('.celebracao-texto').textContent = texto;
        if (titulo) overlay.querySelector('.celebracao-subtexto').textContent = titulo;

        document.body.appendChild(overlay);

        const encerrar = () => {
            overlay.classList.add('saindo');
            setTimeout(() => {
                overlay.remove();
                if (overlayCelebracao === overlay) overlayCelebracao = null;
                resolve();
            }, 320);
        };

        const t = setTimeout(encerrar, duracao);
        overlay.addEventListener('click', () => { clearTimeout(t); encerrar(); });
    });
}
