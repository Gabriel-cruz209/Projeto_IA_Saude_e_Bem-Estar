/**
 * services/TypewriterService.js
 * Efeito typewriter (digitação progressiva) para as mensagens da Lumi.
 *
 * Estratégia: digita o texto puro progressivamente com cursor piscante,
 * depois faz transição suave para o HTML completo com Markdown renderizado.
 *
 * Usa requestAnimationFrame (sem setInterval) para animação fluida
 * que não bloqueia o scroll nem a UI.
 */

const TypewriterService = {

    // ─── Configuração ─────────────────────────────────────────────────────────
    CHARS_PER_FRAME: 4,   // Caracteres revelados por frame (60fps → ~240 chars/s)
    FRAME_SKIP: 1,        // Frames para pular entre updates (1 = cada frame)
    MIN_DELAY_MS: 10,     // Atraso mínimo entre updates em ms

    // ─── Estado interno ───────────────────────────────────────────────────────
    _activeAnimations: new Map(),  // Map<element, cancelFn>

    /**
     * Inicia animação de typewriter em um elemento DOM.
     *
     * @param {HTMLElement} element    — o .msg-content onde animar
     * @param {string}      fullHtml   — HTML final com Markdown renderizado
     * @param {Function}    onComplete — callback chamado ao terminar
     */
    animate(element, fullHtml, onComplete) {
        if (!element) return;

        // Cancela animação anterior no mesmo elemento (sem travar UI)
        this._cancelIfActive(element, true);

        // Extrai texto puro para typing progressivo
        const plainText = window.MarkdownService
            ? window.MarkdownService.toPlainText(fullHtml)
            : this._extractText(fullHtml);

        if (!plainText.trim()) {
            // Conteúdo vazio: apenas aplica o HTML final
            element.innerHTML = fullHtml;
            if (onComplete) onComplete();
            return;
        }

        // Estado inicial: placeholder vazio + cursor
        element.classList.add('tw-animating');
        element.innerHTML = '<span class="tw-text"></span><span class="tw-cursor" aria-hidden="true"></span>';

        const textNode = element.querySelector('.tw-text');
        const cursor   = element.querySelector('.tw-cursor');

        let charIndex   = 0;
        let cancelled   = false;
        let rafId       = null;
        let lastTime    = 0;
        const total     = plainText.length;

        const tick = (now) => {
            if (cancelled) return;

            // Controle de velocidade usando timestamps
            if (now - lastTime >= this.MIN_DELAY_MS) {
                lastTime = now;

                const end = Math.min(charIndex + this.CHARS_PER_FRAME, total);
                textNode.textContent = plainText.substring(0, end);
                charIndex = end;

                // Mantém cursor visível após o texto
                // (cursor é posicionado por CSS: inline-block no flow)

                if (charIndex >= total) {
                    // ── Animação concluída: transição para HTML completo ──
                    this._finalize(element, fullHtml, onComplete);
                    this._activeAnimations.delete(element);
                    return;
                }
            }

            rafId = requestAnimationFrame(tick);
        };

        // Função de cancelamento: finaliza instantaneamente
        const cancel = (applyFull = false) => {
            cancelled = true;
            if (rafId) cancelAnimationFrame(rafId);
            if (applyFull) this._finalize(element, fullHtml, null);
            this._activeAnimations.delete(element);
        };

        this._activeAnimations.set(element, cancel);
        rafId = requestAnimationFrame(tick);
    },

    /**
     * Cancela animação ativa no elemento (se houver) e aplica HTML final.
     * @param {HTMLElement} element
     * @param {boolean} applyFull — se true, aplica o HTML renderizado imediatamente
     */
    _cancelIfActive(element, applyFull = false) {
        if (this._activeAnimations.has(element)) {
            this._activeAnimations.get(element)(applyFull);
        }
    },

    /**
     * Finaliza a animação: remove cursor, aplica HTML completo com fade.
     */
    _finalize(element, fullHtml, onComplete) {
        element.classList.remove('tw-animating');
        element.classList.add('tw-completing');

        // Transição: fade in do HTML completo
        element.style.opacity = '0.7';
        element.innerHTML = fullHtml;

        // requestAnimationFrame garante que o browser pintou o HTML antes do fade
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.25s ease';
            element.style.opacity = '1';

            // Limpa o estado após a transição
            setTimeout(() => {
                element.style.transition = '';
                element.style.opacity = '';
                element.classList.remove('tw-completing');
            }, 280);

            if (onComplete) onComplete();
        });
    },

    /**
     * Cancela TODAS as animações ativas imediatamente (ex: ao mudar de conversa).
     */
    cancelAll() {
        this._activeAnimations.forEach((cancel) => cancel(true));
    },

    /**
     * Fallback para extrair texto puro de HTML sem MarkdownService.
     */
    _extractText(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
};

window.TypewriterService = TypewriterService;
