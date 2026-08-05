document.addEventListener('mousemove', (e) => {
    const bg = document.querySelector('.bg-dinamico');

    if (!bg) return;

    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    bg.style.background = `
        radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(158, 27, 27, 0.15) 0%, transparent 50%),
        linear-gradient(rgba(192, 192, 192, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(192, 192, 192, 0.02) 1px, transparent 1px)
    `;

    bg.style.backgroundSize = `100% 100%, 40px 40px, 40px 40px`;
});

console.log("ARKHYS HUD System: Online");

const style = document.createElement('style');
style.textContent = `
    body::after {
        content: "";
        position: fixed;
        top: -100%;
        left: 0;
        width: 100%;
        height: 10px;
        background: rgba(158, 27, 27, 0.05);
        box-shadow: 0 0 20px rgba(158, 27, 27, 0.2);
        z-index: 9999;
        pointer-events: none;
        animation: scanline 8s linear infinite;
    }
    @keyframes scanline {
        0% { top: -10%; }
        100% { top: 110%; }
    }
`;
document.head.appendChild(style);
