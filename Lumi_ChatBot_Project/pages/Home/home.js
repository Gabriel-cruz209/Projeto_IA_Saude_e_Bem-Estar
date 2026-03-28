/**
 * Lumi Home - Modern Interactions
 * Handlers for scroll animations and intersection observers
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Efeito de Entrada (Fade-in ao scrollar)
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Para itens de grid, podemos adicionar um delay cascata em CSS
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observar cartões de funcionalidades, desenvolvedores, vídeo e texto
    const animatedElements = document.querySelectorAll('.feature-card, .dev-card, .chat-mockup, .section-title, .video-wrapper, .intro-text-block');
    animatedElements.forEach(el => {
        observer.observe(el);
        // Prepara elementos para a animação se não estiverem no CSS base
        if (!el.classList.contains('feature-card')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    });

    // Função auxiliar para animar elementos customizados
    window.addEventListener('scroll', () => {
        animatedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight - 100) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    });

    // 2. Navbar glassmorphism effect on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 10, 15, 0.9)';
            navbar.style.padding = '0.75rem 5%';
            navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        } else {
            navbar.style.background = 'rgba(10, 10, 15, 0.7)';
            navbar.style.padding = '1.25rem 5%';
            navbar.style.boxShadow = 'none';
        }
    });

    // 3. Simulação de Digitação Simples no Mockup
    const typingMockup = document.querySelector('.mock-bot.typing');
    if (typingMockup) {
        let dots = "";
        setInterval(() => {
            dots = dots.length >= 3 ? "" : dots + ".";
            typingMockup.textContent = `Lumi está digitando${dots}`;
        }, 500);
    }
});
