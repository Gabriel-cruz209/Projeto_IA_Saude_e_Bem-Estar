// services/ModalService.js
(function() {
    class ModalService {
        static init() {
            if (document.getElementById('lumi-modal-overlay-custom')) return;
            
            const style = document.createElement('style');
            style.innerHTML = `
                .lumi-modal-overlay-custom {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }
                .lumi-modal-overlay-custom.active {
                    opacity: 1;
                    visibility: visible;
                }
                .lumi-modal-custom {
                    background: var(--bg-surface, #161625);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-md, 16px);
                    padding: 1.5rem;
                    width: 90%;
                    max-width: 420px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    transform: scale(0.95) translateY(10px);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    color: var(--text-primary, #f8fafc);
                    font-family: inherit;
                }
                .lumi-modal-overlay-custom.active .lumi-modal-custom {
                    transform: scale(1) translateY(0);
                }
                .lumi-modal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 1rem;
                }
                .lumi-modal-icon {
                    font-size: 1.5rem;
                    background: var(--accent-gradient, linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .lumi-modal-icon.warning {
                    -webkit-text-fill-color: #ef4444;
                    background: none;
                }
                .lumi-modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                }
                .lumi-modal-message {
                    font-size: 0.95rem;
                    color: var(--text-secondary, #94a3b8);
                    line-height: 1.5;
                    margin-bottom: 1.5rem;
                }
                .lumi-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .lumi-modal-btn {
                    padding: 0.75rem 1.25rem;
                    border-radius: var(--radius-sm, 12px);
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s ease;
                }
                .lumi-modal-btn-cancel {
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary, #f8fafc);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .lumi-modal-btn-cancel:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .lumi-modal-btn-confirm {
                    background: #ef4444;
                    color: white;
                }
                .lumi-modal-btn-confirm:hover {
                    background: #dc2626;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
                }
                .lumi-modal-btn-close {
                    background: var(--accent-primary, #7c3aed);
                    color: white;
                }
                .lumi-modal-btn-close:hover {
                    filter: brightness(1.1);
                    box-shadow: 0 0 15px rgba(124, 58, 237, 0.3);
                }
            `;
            document.head.appendChild(style);
    
            const overlay = document.createElement('div');
            overlay.id = 'lumi-modal-overlay-custom';
            overlay.className = 'lumi-modal-overlay-custom';
            overlay.innerHTML = `
                <div class="lumi-modal-custom" id="lumi-modal-content-custom" onclick="event.stopPropagation()">
                    <!-- Content injected dynamically -->
                </div>
            `;
            document.body.appendChild(overlay);
    
            ModalService.overlay = overlay;
            ModalService.content = document.getElementById('lumi-modal-content-custom');
        }
    
        static show({ type, title, message }) {
            this.init();
            
            return new Promise((resolve) => {
                const isConfirm = type === 'confirm';
                
                let iconHtml = '';
                if (isConfirm) {
                    iconHtml = `<div class="lumi-modal-icon warning">⚠️</div>`;
                } else {
                    iconHtml = `<div class="lumi-modal-icon">ℹ️</div>`;
                }
    
                const buttonsHtml = isConfirm 
                    ? `
                        <button class="lumi-modal-btn lumi-modal-btn-cancel" id="lumi-btn-cancel-custom">Cancelar</button>
                        <button class="lumi-modal-btn lumi-modal-btn-confirm" id="lumi-btn-confirm-custom">Confirmar</button>
                      `
                    : `
                        <button class="lumi-modal-btn lumi-modal-btn-close" id="lumi-btn-close-custom">Fechar</button>
                      `;
    
                this.content.innerHTML = `
                    <div class="lumi-modal-header">
                        ${iconHtml}
                        <h3 class="lumi-modal-title">${title || (isConfirm ? 'Confirmação' : 'Aviso')}</h3>
                    </div>
                    <div class="lumi-modal-message">${message}</div>
                    <div class="lumi-modal-actions">
                        ${buttonsHtml}
                    </div>
                `;
    
                const closeMode = (result) => {
                    this.overlay.classList.remove('active');
                    
                    document.removeEventListener('keydown', handleEscape);
                    this.overlay.removeEventListener('click', handleBackdrop);
                    
                    setTimeout(() => {
                        resolve(result);
                    }, 300); // tempo da animação
                };
    
                const handleEscape = (e) => {
                    if (e.key === 'Escape') closeMode(false);
                };
    
                const handleBackdrop = () => {
                    closeMode(false);
                };
    
                if (isConfirm) {
                    document.getElementById('lumi-btn-cancel-custom').onclick = () => closeMode(false);
                    document.getElementById('lumi-btn-confirm-custom').onclick = () => closeMode(true);
                } else {
                    document.getElementById('lumi-btn-close-custom').onclick = () => closeMode(true);
                }
    
                document.addEventListener('keydown', handleEscape);
                this.overlay.addEventListener('click', handleBackdrop);
    
                // Usando RAF para garantir que a transição ocorra
                requestAnimationFrame(() => {
                    this.overlay.classList.add('active');
                });
            });
        }
    
        static confirm({ title = 'Tem certeza?', message }) {
            return this.show({ type: 'confirm', title, message });
        }
    
        static alert({ title = 'Aviso', message }) {
            return this.show({ type: 'alert', title, message });
        }
    }
    
    window.ModalService = ModalService;
})();
