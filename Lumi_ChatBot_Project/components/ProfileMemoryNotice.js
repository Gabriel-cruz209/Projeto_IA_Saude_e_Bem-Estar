/**
 * components/ProfileMemoryNotice.js
 * Toast de notificação para a memória da Lumi.
 */

function ProfileMemoryNotice(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notice = document.createElement('div');
    notice.className = `profile-memory-notice notice-${type}`;
    
    notice.innerHTML = `
        <div class="notice-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
        </div>
        <div class="notice-content">
            <span class="notice-title">Memória Lumi</span>
            <p class="notice-msg">${message}</p>
        </div>
    `;

    container.appendChild(notice);

    // Fade in
    setTimeout(() => notice.classList.add('visible'), 10);

    // Auto remove
    setTimeout(() => {
        notice.classList.remove('visible');
        setTimeout(() => notice.remove(), 300);
    }, 4500);
}

window.ProfileMemoryNotice = ProfileMemoryNotice;
