/**
 * components/SourceBadge.js
 * Componente para exibir citações de fontes médicas confiáveis.
 */

function SourceBadge(sources) {
    if (!sources || sources.length === 0) return null;

    const container = document.createElement('div');
    container.className = 'sources-container-badge';
    
    const title = document.createElement('span');
    title.className = 'sources-title';
    title.innerHTML = '📚 Baseado em fontes confiáveis:';
    container.appendChild(title);

    const list = document.createElement('div');
    list.className = 'sources-list';

    sources.forEach(src => {
        const badge = document.createElement('a');
        badge.href = src.url;
        badge.target = '_blank';
        badge.className = `source-badge-item ${src.type}`;
        
        const icon = src.type === 'national' ? '🇧🇷' : '🌐';
        
        badge.innerHTML = `
            <span class="src-icon">${icon}</span>
            <span class="src-name">${src.name}</span>
            <span class="tooltip">${src.type === 'national' ? 'Fonte Oficial Nacional' : 'Fonte Internacional de Referência'}</span>
        `;
        
        list.appendChild(badge);
    });

    container.appendChild(list);
    return container;
}

window.SourceBadge = SourceBadge;
