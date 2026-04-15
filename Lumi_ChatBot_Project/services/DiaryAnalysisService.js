/**
 * services/DiaryAnalysisService.js
 * Motor de análise de padrões do Diário de Saúde (lado cliente).
 * Detecta frequência, recorrência, combinações e padrões por dia da semana.
 */

const DiaryAnalysisService = {

    // ─── ANÁLISE PRINCIPAL ───────────────────────────────────────────────────────

    /**
     * Gera lista de insights a partir dos registros.
     * @param {Array} entries - registros do diário
     * @returns {Array<{type, text, severity}>}
     */
    generateInsights(entries) {
        if (!entries || entries.length < 3) {
            return [{
                type: 'info',
                severity: 'low',
                text: 'Continue registrando seus sintomas para que a Lumi possa identificar padrões na sua saúde. Você precisa de pelo menos 3 registros.'
            }];
        }

        const insights = [];
        const stats = this.computeStats(entries);

        // 1. Sintoma mais frequente
        const topSymptom = stats.topSymptomEntry;
        if (topSymptom && topSymptom.count >= 3) {
            insights.push({
                type: 'frequency',
                severity: topSymptom.count >= 5 ? 'high' : 'medium',
                text: `Você relatou **${topSymptom.symptom}** em ${topSymptom.count} dos seus últimos registros. Isso pode merecer atenção médica.`
            });
        }

        // 2. Padrão por dia da semana
        const weekdayPattern = this._detectWeekdayPattern(entries);
        if (weekdayPattern) {
            insights.push({
                type: 'pattern',
                severity: 'medium',
                text: `Percebi que você tende a relatar **${weekdayPattern.symptom}** especialmente às **${weekdayPattern.day}**. Pode estar relacionado à rotina semanal.`
            });
        }

        // 3. Combinação recorrente de sintomas
        const pair = this._detectSymptomPair(entries);
        if (pair) {
            insights.push({
                type: 'correlation',
                severity: 'medium',
                text: `**${pair[0]}** e **${pair[1]}** aparecem juntos com frequência nos seus registros. Mencione isso ao seu médico.`
            });
        }

        // 4. Alerta de múltiplos registros de alto risco
        const highRiskDays = entries.filter(e =>
            e.riskLevel === 'ALTO' || e.riskLevel === 'URGENTE'
        ).length;
        if (highRiskDays >= 2) {
            insights.push({
                type: 'alert',
                severity: 'high',
                text: `⚠️ Você teve **${highRiskDays} dias com risco elevado** recentemente. Recomendamos agendar uma consulta médica preventiva.`
            });
        }

        // 5. Tendência de melhora ou piora (últimos 7 vs anteriores)
        const trend = this._detectIntensityTrend(entries);
        if (trend === 'piora') {
            insights.push({
                type: 'trend',
                severity: 'high',
                text: 'A intensidade dos seus sintomas está **aumentando** nos últimos dias. Fique atento e procure auxílio médico se necessário.'
            });
        } else if (trend === 'melhora') {
            insights.push({
                type: 'trend',
                severity: 'low',
                text: '✅ Ótima notícia! A intensidade dos seus sintomas está **diminuindo**. Continue os cuidados!'
            });
        }

        // 6. Consistência de registros (engajamento)
        const last7Filled = this._countDaysWithEntries(entries, 7);
        if (last7Filled >= 5) {
            insights.push({
                type: 'engagement',
                severity: 'low',
                text: `🌟 Parabéns! Você registrou sua saúde **${last7Filled} dos últimos 7 dias**. Esse acompanhamento é fundamental!`
            });
        }

        return insights.length > 0 ? insights : [{
            type: 'info',
            severity: 'low',
            text: 'Continue registrando. Sua saúde está em acompanhamento pela Lumi!'
        }];
    },

    /**
     * Computa estatísticas gerais dos registros.
     */
    computeStats(entries) {
        const symptomFreq = {};
        const moodFreq = {};
        const intensities = entries.map(e => e.intensity || 0).filter(v => v > 0);

        entries.forEach(e => {
            (e.symptoms || []).forEach(s => {
                symptomFreq[s] = (symptomFreq[s] || 0) + 1;
            });
            if (e.mood) moodFreq[e.mood] = (moodFreq[e.mood] || 0) + 1;
        });

        const sortedSymptoms = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]);
        const topSymptomEntry = sortedSymptoms.length > 0
            ? { symptom: sortedSymptoms[0][0], count: sortedSymptoms[0][1] }
            : null;

        const avgIntensity = intensities.length > 0
            ? (intensities.reduce((a, b) => a + b, 0) / intensities.length).toFixed(1)
            : 0;

        return {
            totalEntries: entries.length,
            symptomFreq,
            moodFreq,
            topSymptomEntry,
            avgIntensity: parseFloat(avgIntensity),
            lastRisk: entries[0]?.riskLevel || 'BAIXO'
        };
    },

    /**
     * Retorna os dados dos últimos N dias para renderização de gráfico.
     * @param {Array} entries
     * @param {number} days
     * @returns {Array<{date, label, intensity, symptoms, riskLevel}>}
     */
    getLast15DaysData(entries, days = 15) {
        const result = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const entry = entries.find(e => e.date === dateStr);

            result.push({
                date: dateStr,
                label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                intensity: entry ? (entry.intensity || null) : null,
                symptoms: entry ? (entry.symptoms || []) : [],
                riskLevel: entry ? (entry.riskLevel || 'BAIXO') : null,
                hasEntry: !!entry
            });
        }
        return result;
    },

    /**
     * Gera um resumo textual do histórico para enviar ao chat da Lumi.
     * Usado quando o usuário perguntar sobre seu histórico.
     */
    generateHistorySummary(entries, days = 7) {
        const recentEntries = entries.slice(0, days);
        if (recentEntries.length === 0) return null;

        const stats = this.computeStats(recentEntries);
        const topSymptoms = Object.entries(stats.symptomFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([s, c]) => `${s} (${c}x)`)
            .join(', ');

        return {
            days: recentEntries.length,
            avgIntensity: stats.avgIntensity,
            topSymptoms: topSymptoms || 'Sem sintomas relevantes',
            moods: stats.moodFreq,
            lastRisk: stats.lastRisk,
            highRiskDays: recentEntries.filter(e => ['ALTO', 'URGENTE'].includes(e.riskLevel)).length
        };
    },

    // ─── DETECÇÃO DE PADRÕES ─────────────────────────────────────────────────────

    _detectWeekdayPattern(entries) {
        const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const daySymptomMap = {};  // { 'segunda-feira': { 'dor de cabeça': 3 } }

        entries.forEach(e => {
            const dayName = DAY_NAMES[new Date(e.date + 'T12:00:00').getDay()];
            if (!daySymptomMap[dayName]) daySymptomMap[dayName] = {};
            (e.symptoms || []).forEach(s => {
                daySymptomMap[dayName][s] = (daySymptomMap[dayName][s] || 0) + 1;
            });
        });

        // Procura combinação dia+sintoma que aparece 2+ vezes
        for (const [day, symptoms] of Object.entries(daySymptomMap)) {
            for (const [symptom, count] of Object.entries(symptoms)) {
                if (count >= 2) return { day, symptom, count };
            }
        }
        return null;
    },

    _detectSymptomPair(entries) {
        const pairFreq = {};
        entries.forEach(e => {
            const syms = e.symptoms || [];
            for (let i = 0; i < syms.length; i++) {
                for (let j = i + 1; j < syms.length; j++) {
                    const key = [syms[i], syms[j]].sort().join('||');
                    pairFreq[key] = (pairFreq[key] || 0) + 1;
                }
            }
        });

        const top = Object.entries(pairFreq).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 2) return top[0].split('||');
        return null;
    },

    _detectIntensityTrend(entries) {
        if (entries.length < 6) return null;

        const recent = entries.slice(0, 3).map(e => e.intensity || 0);
        const older = entries.slice(3, 6).map(e => e.intensity || 0);

        const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
        const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;

        if (avgRecent > avgOlder + 1.5) return 'piora';
        if (avgOlder > avgRecent + 1.5) return 'melhora';
        return 'estável';
    },

    _countDaysWithEntries(entries, days) {
        const now = new Date();
        let count = 0;
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            if (entries.some(e => e.date === dateStr)) count++;
        }
        return count;
    },

    // ─── PARSING DE MENSAGEM NATURAL ─────────────────────────────────────────────

    /**
     * Tenta extrair sintomas e intensidade de texto livre do chat.
     * Ex: "Hoje estou com dor de cabeça e cansaço, dói bastante"
     * @param {string} text
     * @returns {{ symptoms: string[], intensity: number|null } | null}
     */
    parseNaturalEntry(text) {
        const SYMPTOM_KEYWORDS = {
            'dor de cabeça': ['dor de cabeça', 'cefaleia', 'cabeça doendo'],
            'cansaço': ['cansaço', 'cansado', 'fadiga', 'sem energia', 'fraqueza'],
            'febre': ['febre', 'febril', 'temperatura alta'],
            'tosse': ['tosse', 'tossindo'],
            'enjoo': ['enjoo', 'enjoada', 'enjoado', 'náusea'],
            'dor no corpo': ['dor no corpo', 'corpo doendo', 'mialgia'],
            'falta de ar': ['falta de ar', 'dificuldade respirar', 'respiração difícil'],
            'coriza': ['coriza', 'nariz escorrendo', 'nariz entupido'],
            'dor de garganta': ['dor de garganta', 'garganta', 'garganta inflamada']
        };

        const lower = text.toLowerCase();
        const found = [];

        for (const [canonical, aliases] of Object.entries(SYMPTOM_KEYWORDS)) {
            if (aliases.some(alias => lower.includes(alias))) {
                found.push(canonical);
            }
        }

        if (found.length === 0) return null;

        // Detecta intensidade por palavras-chave
        let intensity = 5; // default moderado
        if (/muito forte|insuportável|horrível|dói muito|extremamente/.test(lower)) intensity = 9;
        else if (/forte|bastante|intenso/.test(lower)) intensity = 7;
        else if (/pouco|leve|fraco|suave/.test(lower)) intensity = 3;

        return { symptoms: found, intensity };
    },

    /**
     * Detecta se uma mensagem é uma consulta ao histórico do diário.
     * Ex: "como foram meus últimos 7 dias?", "meu histórico de sintomas"
     */
    isHistoryQuery(text) {
        const lower = text.toLowerCase();
        const patterns = [
            /meus? (últimos?|últimas?) \d+ dias/,
            /histórico de (saúde|sintomas)/,
            /como (fui|estive|estava|estou) (essa semana|nessa semana|ultimamente)/,
            /relatório de saúde/,
            /meu diário/,
            /padrão(ões)? de sintom/
        ];
        return patterns.some(p => p.test(lower));
    },

    /**
     * Detecta se uma mensagem é um registro natural de sintomas.
     * Ex: "hoje estou com dor de cabeça", "tenho sentido cansaço nos últimos dias"
     */
    isDiaryEntry(text) {
        const lower = text.toLowerCase();
        const entryTriggers = [
            /hoje (estou|tô|sinto|senti|tenho)/,
            /estou (com|sentindo) (dor|febre|tosse|enjoo|cansaço)/,
            /tenho (sentido|tido) (dor|febre|tosse)/,
            /acordei (com|sentindo)/,
            /desde (hoje|ontem|essa semana) (tô|estou|sinto)/
        ];
        const parsed = this.parseNaturalEntry(text);
        return entryTriggers.some(p => p.test(lower)) && parsed !== null;
    }
};

window.DiaryAnalysisService = DiaryAnalysisService;
