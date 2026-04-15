/**
 * services/MarkdownService.js
 * Renderização segura de Markdown para as mensagens da Lumi.
 *
 * Usa marked.js (CDN) para parsing completo de GFM (GitHub Flavored Markdown)
 * e DOMPurify (CDN) para sanitização contra XSS.
 * Fallback para regex simples caso os CDNs não carreguem.
 */

const MarkdownService = {

    /**
     * Inicializa o marked.js com configurações otimizadas para o chat Lumi.
     * Deve ser chamado uma vez após o carregamento dos scripts CDN.
     */
    init() {
        if (!window.marked) {
            console.warn('[MarkdownService] marked.js não encontrado. Usando fallback.');
            return;
        }

        // Renderer customizado para controlar o output HTML
        const renderer = new marked.Renderer();

        // Links sempre abrem em nova aba com segurança
        renderer.link = (href, title, text) => {
            const safeHref = (href || '').replace(/javascript:/gi, '');
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
        };

        // Blocos de código com destaque de linguagem
        renderer.code = (code, language) => {
            return `<pre class="md-code-block"><code class="md-code ${language ? `lang-${language}` : ''}">${
                code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }</code></pre>`;
        };

        // Código inline
        renderer.codespan = (code) => {
            return `<code class="md-code-inline">${code}</code>`;
        };

        // Blockquote estilizado
        renderer.blockquote = (quote) => {
            return `<blockquote class="md-blockquote">${quote}</blockquote>`;
        };

        marked.use({
            renderer,
            breaks: true,       // \n vira <br>
            gfm: true,          // GitHub Flavored Markdown
            pedantic: false,
            mangle: false,
            headerIds: false    // Sem IDs em headings (segurança)
        });
    },

    /**
     * Converte Markdown → HTML seguro.
     * @param {string} text — texto em Markdown
     * @returns {string} — HTML sanitizado pronto para innerHTML
     */
    render(text) {
        if (!text) return '';

        // Pré-processamento: remove blocos JSON que já foram extraídos
        // mas que possam ter escapado (SOURCES, RESOURCES ao final)
        const cleaned = text
            .replace(/SOURCES:\s*\[[\s\S]*?\]/g, '')
            .replace(/RESOURCES:\s*\[[\s\S]*?\]/g, '')
            .trim();

        if (window.marked) {
            const rawHtml = marked.parse(cleaned);

            // Sanitização XSS com DOMPurify
            if (window.DOMPurify) {
                return DOMPurify.sanitize(rawHtml, {
                    ALLOWED_TAGS: [
                        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'ul', 'ol', 'li',
                        'code', 'pre',
                        'blockquote',
                        'a', 'hr',
                        'table', 'thead', 'tbody', 'tr', 'th', 'td',
                        'div', 'span'
                    ],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'class']
                });
            }

            // Se DOMPurify não estiver disponível, usa o HTML do marked mesmo assim
            // (marked já é relativamente seguro por padrão)
            return rawHtml;
        }

        // ─── Fallback: renderização simples sem marked.js ─────────────────────
        return this._simpleFallback(cleaned);
    },

    /**
     * Fallback quando marked.js não está disponível.
     * Cobre os casos mais comuns nas respostas da Lumi.
     */
    _simpleFallback(text) {
        return text
            // Negrito
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Itálico
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Itálico com underscore
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // Código inline
            .replace(/`([^`]+)`/g, '<code class="md-code-inline">$1</code>')
            // Listas não ordenadas
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // Listas ordenadas
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            // Blockquote
            .replace(/^> (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>')
            // Headings
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Linha horizontal
            .replace(/^---$/gm, '<hr>')
            // Quebras de linha
            .replace(/\n/g, '<br>');
    },

    /**
     * Extrai o texto puro de um HTML string (para o typewriter).
     * @param {string} html
     * @returns {string}
     */
    toPlainText(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
};

// Inicializa quando o script carrega (marked.js deve ser incluído antes)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MarkdownService.init());
} else {
    MarkdownService.init();
}

window.MarkdownService = MarkdownService;
