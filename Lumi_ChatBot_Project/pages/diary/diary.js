/**
 * pages/diary/diary.js
 * Lógica principal da página do Diário de Saúde — Versão Refatorada.
 * Usa DiaryService (fachada), DiaryStorageService e DiaryAnalysisService.
 */

document.addEventListener('DOMContentLoaded', async () => {
    await initDiaryPage();
});

async function initDiaryPage() {
    // Carrega registros do backend (com fallback local)
    await window.DiaryService.loadEntriesAsync();

    // Insights removidos pelo usuário
    // renderInsights();
    renderHeatmap();
    renderTrendChart();
    renderEntries();
    // Botão de Análise Profunda IA também removido
    // setupAIInsightsButton();

    // Listener para novo registro via modal
    const openBtn = document.getElementById('open-entry-btn');
    if (openBtn) {
        openBtn.onclick = () => {
            const modalRoot = document.getElementById('diary-modal-root');
            const modal = window.DiaryEntryForm({
                onSave: async (data) => {
                    modalRoot.innerHTML = '';
                    await initDiaryPage(); // Recarregar dashboard completo
                },
                onCancel: () => {
                    modalRoot.innerHTML = '';
                }
            });
            modalRoot.appendChild(modal);
        };
    }

    // Listener para o botão de sair (Logout)
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('Deseja realmente sair do seu diário?')) {
                // Redireciona para a home principal do projeto
                window.location.href = '../Home/home.html'; 
            }
        };
    }
}

// ─── INSIGHTS ───────────────────────────────────────────────────────────────

function renderInsights() {
    const list = document.getElementById('insights-list');
    if (!list) return;
    list.innerHTML = '';

    const rawInsights = window.DiaryService.generateInsights();

    const SEVERITY_ICON = {
        low: '✅',
        medium: '💡',
        high: '⚠️'
    };

    rawInsights.forEach(insight => {
        // Suporte ao formato legado (string) e novo (objeto)
        const text = typeof insight === 'string' ? insight : insight.text;
        const severity = typeof insight === 'object' ? insight.severity : 'medium';
        const icon = SEVERITY_ICON[severity] || '💡';

        const div = document.createElement('div');
        div.className = `insight-item insight-${severity}`;
        div.innerHTML = `
            <span class="insight-icon">${icon}</span>
            <span>${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span>
        `;
        list.appendChild(div);
    });

    // Botão de análise IA (se houver entries suficientes)
    const entries = window.DiaryService.getEntries();
    if (entries.length >= 3 && !document.getElementById('ai-insights-btn')) {
        const btn = document.createElement('button');
        btn.id = 'ai-insights-btn';
        btn.className = 'ai-insights-btn';
        btn.innerHTML = '🤖 Análise Profunda com IA';
        btn.onclick = loadAIInsights;
        list.parentElement.appendChild(btn);
    }
}

async function loadAIInsights() {
    const btn = document.getElementById('ai-insights-btn');
    if (btn) { btn.textContent = '⏳ Analisando...'; btn.disabled = true; }

    try {
        const aiInsights = await window.DiaryService.generateAIInsights();
        if (!aiInsights) throw new Error('Sem resposta');

        const list = document.getElementById('insights-list');
        if (!list) return;

        // Adiciona uma divider
        const divider = document.createElement('div');
        divider.className = 'insights-divider';
        divider.textContent = '— Insights da IA Lumi —';
        list.appendChild(divider);

        aiInsights.forEach(text => {
            const div = document.createElement('div');
            div.className = 'insight-item insight-ai';
            div.innerHTML = `<span>${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span>`;
            list.appendChild(div);
        });

        if (btn) btn.style.display = 'none';
    } catch (err) {
        if (btn) { btn.textContent = '🤖 Tentar novamente'; btn.disabled = false; }
        console.warn('Análise IA falhou:', err);
    }
}

function setupAIInsightsButton() {
    // Gerenciado pelo renderInsights; noop aqui
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────────

function renderHeatmap() {
    const container = document.getElementById('health-heatmap');
    if (!container) return;
    container.innerHTML = '';

    const rawEntries = window.DiaryService.getEntries();
    const entries = window.DiaryAnalysisService._getCleanSortedEntries(rawEntries);
    const entryMap = {};
    entries.forEach(e => entryMap[e.date] = e);

    const now = new Date();

    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = entryMap[dateStr];

        const riskMap = { 'BAIXO': 'low', 'MODERADO': 'moderate', 'ALTO': 'high', 'URGENTE': 'urgent' };
        const riskClass = entry ? (riskMap[entry.riskLevel] || '') : '';

        const dayBox = document.createElement('div');
        dayBox.className = `day-box ${riskClass}`;
        dayBox.textContent = d.getDate();
        dayBox.title = entry
            ? `${dateStr} — Risco ${entry.riskLevel} — ${(entry.symptoms || []).length} sintoma(s)`
            : `${dateStr} — Sem registro`;

        container.appendChild(dayBox);
    }
}

// ─── GRÁFICO DE TENDÊNCIA ─────────────────────────────────────────────────────

function renderTrendChart() {
    const wrapper = document.getElementById('trend-chart-container');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const chartData = window.DiaryService.getLast15DaysData(15);
    const maxIntensity = 10;

    // Calcula médias por período para a linha de tendência
    const validPoints = chartData.filter(d => d.intensity !== null);
    const avgIntensity = validPoints.length > 0
        ? (validPoints.reduce((acc, curr) => acc + (parseFloat(curr.intensity) || 0), 0) / validPoints.length).toFixed(1)
        : 0;

    // Cria o SVG do gráfico
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 200');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.width = '100%';
    svg.style.height = '180px';

    const padL = 30, padR = 10, padT = 10, padB = 30;
    const chartW = 600 - padL - padR;
    const chartH = 200 - padT - padB;
    const step = chartW / (chartData.length - 1);

    // Linhas de grade
    [0, 2.5, 5, 7.5, 10].forEach(val => {
        const y = padT + chartH - (val / maxIntensity) * chartH;
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', padL);
        line.setAttribute('y1', y);
        line.setAttribute('x2', padL + chartW);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', 'rgba(255,255,255,0.05)');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);

        const label = document.createElementNS(svgNS, 'text');
        label.setAttribute('x', padL - 5);
        label.setAttribute('y', y + 4);
        label.setAttribute('fill', '#64748b');
        label.setAttribute('font-size', '9');
        label.setAttribute('text-anchor', 'end');
        label.textContent = val;
        svg.appendChild(label);
    });

    // Linha de média
    const avgY = padT + chartH - (avgIntensity / maxIntensity) * chartH;
    const avgLine = document.createElementNS(svgNS, 'line');
    avgLine.setAttribute('x1', padL);
    avgLine.setAttribute('y1', avgY);
    avgLine.setAttribute('x2', padL + chartW);
    avgLine.setAttribute('y2', avgY);
    avgLine.setAttribute('stroke', 'rgba(59, 130, 246, 0.4)');
    avgLine.setAttribute('stroke-width', '1');
    avgLine.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(avgLine);

    // Área e linha de intensidade
    const points = chartData.map((d, i) => {
        const x = padL + i * step;
        const y = d.intensity !== null
            ? padT + chartH - (d.intensity / maxIntensity) * chartH
            : null;
        return { x, y, data: d };
    });

    // Área preenchida (apenas pontos com dados)
    let areaPath = `M ${padL} ${padT + chartH}`;
    let linePath = null;
    let prevPoint = null;

    points.forEach(pt => {
        if (pt.y !== null) {
            if (linePath === null) {
                linePath = `M ${pt.x} ${pt.y}`;
                areaPath += ` L ${pt.x} ${pt.y}`;
            } else {
                linePath += ` L ${pt.x} ${pt.y}`;
                areaPath += ` L ${pt.x} ${pt.y}`;
            }
            prevPoint = pt;
        }
    });

    if (prevPoint) areaPath += ` L ${prevPoint.x} ${padT + chartH} Z`;

    if (areaPath.length > 20) {
        const area = document.createElementNS(svgNS, 'path');
        area.setAttribute('d', areaPath);
        area.setAttribute('fill', 'url(#areaGradient)');
        area.setAttribute('stroke', 'none');
        svg.appendChild(area);
    }

    // Definição do gradiente
    const defs = document.createElementNS(svgNS, 'defs');
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'areaGradient');
    grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'rgba(124, 58, 237, 0.4)');
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'rgba(124, 58, 237, 0.0)');
    grad.appendChild(stop1); grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);

    if (linePath) {
        const line = document.createElementNS(svgNS, 'path');
        line.setAttribute('d', linePath);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', 'url(#lineGradient)');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);

        const lineGrad = document.createElementNS(svgNS, 'linearGradient');
        lineGrad.setAttribute('id', 'lineGradient');
        lineGrad.setAttribute('x1', '0'); lineGrad.setAttribute('y1', '0');
        lineGrad.setAttribute('x2', '1'); lineGrad.setAttribute('y2', '0');
        const ls1 = document.createElementNS(svgNS, 'stop');
        ls1.setAttribute('offset', '0%'); ls1.setAttribute('stop-color', '#7c3aed');
        const ls2 = document.createElementNS(svgNS, 'stop');
        ls2.setAttribute('offset', '100%'); ls2.setAttribute('stop-color', '#3b82f6');
        lineGrad.appendChild(ls1); lineGrad.appendChild(ls2);
        defs.appendChild(lineGrad);
    }

    // Pontos interativos
    const RISK_COLOR = { 'BAIXO': '#10b981', 'MODERADO': '#f59e0b', 'ALTO': '#ef4444', 'URGENTE': '#9f1239' };

    points.forEach((pt, i) => {
        // Label do eixo X (a cada 3 dias)
        if (i % 3 === 0) {
            const label = document.createElementNS(svgNS, 'text');
            label.setAttribute('x', pt.x);
            label.setAttribute('y', padT + chartH + 18);
            label.setAttribute('fill', '#64748b');
            label.setAttribute('font-size', '8');
            label.setAttribute('text-anchor', 'middle');
            label.textContent = pt.data.label;
            svg.appendChild(label);
        }

        if (pt.y !== null) {
            const riskColor = RISK_COLOR[pt.data.riskLevel] || '#7c3aed';
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', pt.x);
            circle.setAttribute('cy', pt.y);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', riskColor);
            circle.setAttribute('stroke', '#0a0a0f');
            circle.setAttribute('stroke-width', '2');

            // Tooltip via title
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = `${pt.data.label}: Intensidade ${pt.data.intensity} — ${(pt.data.symptoms || []).join(', ') || 'Sem sintomas'}`;
            circle.appendChild(title);

            svg.appendChild(circle);
        }
    });

    wrapper.appendChild(svg);

    // Legenda de média
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.innerHTML = `
        <span class="legend-avg">Média: <strong>${avgIntensity}/10</strong></span>
        <span class="legend-info">${validPoints.length} registros</span>
    `;
    wrapper.appendChild(legend);
}

// ─── FEED DE REGISTROS ────────────────────────────────────────────────────────

function renderEntries() {
    const feed = document.getElementById('entries-feed');
    if (!feed) return;
    feed.innerHTML = '';

    const rawEntries = window.DiaryService.getEntries();
    const entries = window.DiaryAnalysisService._getCleanSortedEntries(rawEntries);

    if (entries.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📔</span>
                <p>Nenhum registro encontrado ainda.</p>
                <p class="empty-sub">Comece hoje registrando como você está se sentindo!</p>
            </div>
        `;
        return;
    }

    const MOOD_MAP = {
        'bem': '😊 Bem',
        'regular': '😐 Regular',
        'mal': '😟 Mal',
        'ansioso': '😰 Ansioso'
    };

    const RISK_BADGE = {
        'BAIXO': '<span class="risk-badge risk-low">Baixo risco</span>',
        'MODERADO': '<span class="risk-badge risk-moderate">Risco Moderado</span>',
        'ALTO': '<span class="risk-badge risk-high">Alto Risco</span>',
        'URGENTE': '<span class="risk-badge risk-urgent">Urgente</span>'
    };

    entries.forEach(e => {
        const card = document.createElement('div');
        card.className = `entry-card entry-risk-${(e.riskLevel || 'BAIXO').toLowerCase()}`;
        card.dataset.entryId = e.id;

        const date = new Date(e.timestamp).toLocaleDateString('pt-BR', {
            weekday: 'short', day: '2-digit', month: 'short'
        });
        const time = new Date(e.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const sourceBadge = e.source === 'chat' ? '<span class="source-badge">💬 via Chat</span>' : '';

        card.innerHTML = `
            <div class="entry-header">
                <div>
                    <span class="entry-date">${date}</span>
                    <span class="entry-time">${time}</span>
                    ${sourceBadge}
                </div>
                <div class="entry-header-right">
                    <span class="entry-mood">${MOOD_MAP[e.mood] || e.mood || '—'}</span>
                    ${RISK_BADGE[e.riskLevel || 'BAIXO'] || ''}
                    <button class="entry-delete-btn" data-id="${e.id}" title="Excluir registro">🗑</button>
                </div>
            </div>
            <div class="entry-symptoms">
                ${(e.symptoms || []).map(s => `<span class="symptom-tag">${s}</span>`).join('')}
                ${(e.symptoms || []).length === 0 ? '<span style="color: var(--text-muted); font-size: 0.85rem;">Sem sintomas registrados</span>' : ''}
            </div>
            <div class="entry-stats">
                <span>Intensidade: <strong>${e.intensity || 0}/10</strong></span>
                ${e.intensity >= 7 ? '<span class="intensity-alert">⚠️ Intensidade alta</span>' : ''}
            </div>
            ${e.notes ? `<div class="entry-notes">"${e.notes}"</div>` : ''}
        `;

        // Botão excluir
        card.querySelector('.entry-delete-btn').onclick = async (ev) => {
            ev.stopPropagation();
            if (window.ModalService) {
                const confirmed = await window.ModalService.confirm({
                    title: 'Excluir Registro',
                    message: 'Deseja excluir este registro do diário?'
                });
                if (!confirmed) return;
            }
            await window.DiaryService.deleteEntry(e.id);
            await initDiaryPage();
        };

        feed.appendChild(card);
    });
}
