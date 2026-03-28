/**
 * pages/diary/diary.js
 * Lógica principal da página do Diário de Saúde.
 */

document.addEventListener('DOMContentLoaded', () => {
    initDiaryPage();
});

function initDiaryPage() {
    renderInsights();
    renderHeatmap();
    renderEntries();

    // Listener para novo registro
    const openBtn = document.getElementById('open-entry-btn');
    openBtn.onclick = () => {
        const modalRoot = document.getElementById('diary-modal-root');
        const modal = window.DiaryEntryForm({
            onSave: (data) => {
                modalRoot.innerHTML = '';
                initDiaryPage(); // Recarregar estatísticas
            },
            onCancel: () => {
                modalRoot.innerHTML = '';
            }
        });
        modalRoot.appendChild(modal);
    };
}

function renderInsights() {
    const list = document.getElementById('insights-list');
    list.innerHTML = '';
    const insights = window.DiaryService.generateInsights();

    insights.forEach(text => {
        const div = document.createElement('div');
        div.className = 'insight-item';
        div.innerHTML = `<span>${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span>`;
        list.appendChild(div);
    });
}

function renderHeatmap() {
    const container = document.getElementById('health-heatmap');
    container.innerHTML = '';
    
    const entries = window.DiaryService.getEntries();
    const entryMap = {};
    entries.forEach(e => entryMap[e.date] = e);

    const now = new Date();
    // Renderizar os últimos 28 dias
    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = entryMap[dateStr];

        const dayBox = document.createElement('div');
        dayBox.className = `day-box ${entry ? entry.riskLevel.toLowerCase() : ''}`;
        dayBox.textContent = d.getDate();
        dayBox.title = entry ? `Risco ${entry.riskLevel} - ${entry.symptoms.length} sintomas` : 'Sem registro';
        
        container.appendChild(dayBox);
    }
}

function renderEntries() {
    const feed = document.getElementById('entries-feed');
    feed.innerHTML = '';
    const entries = window.DiaryService.getEntries();

    if (entries.length === 0) {
        feed.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%;">Nenhum registro encontrado ainda. Comece hoje!</p>';
        return;
    }

    entries.forEach(e => {
        const card = document.createElement('div');
        card.className = 'entry-card';

        const moodMap = {
            'bem': '😊 Bem',
            'regular': '😐 Regular',
            'mal': '😟 Mal',
            'ansioso': '😰 Ansioso'
        };

        const date = new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        card.innerHTML = `
            <div class="entry-header">
                <span class="entry-date">${date}</span>
                <span class="entry-mood">${moodMap[e.mood] || e.mood}</span>
            </div>
            <div class="entry-symptoms">
                ${e.symptoms.map(s => `<span class="symptom-tag">${s}</span>`).join('')}
            </div>
            <div class="entry-stats">
               <span style="font-size: 0.75rem; color: var(--text-muted);">Intensidade: <strong>${e.intensity}/10</strong></span>
            </div>
            ${e.notes ? `<div class="entry-notes">${e.notes}</div>` : ''}
        `;
        feed.appendChild(card);
    });
}
