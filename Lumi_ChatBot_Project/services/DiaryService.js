/**
 * services/DiaryService.js
 * Gerencia o armazenamento e a análise de dados do diário de saúde.
 */

const DIARY_STORAGE_KEY = 'lumi_health_diary';

const DiaryService = {
  getEntries() {
    const data = localStorage.getItem(DIARY_STORAGE_KEY);
    return data ? JSON.parse(data).entries : [];
  },

  saveEntry(entry) {
    const entries = this.getEntries();
    // Adicionar UUID simples se necessário
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      ...entry
    };

    // Sobrescrever se já houver registro para a mesma data (registro único por dia)
    const existingIdx = entries.findIndex(e => e.date === newEntry.date);
    if (existingIdx !== -1) {
      entries[existingIdx] = newEntry;
    } else {
      entries.unshift(newEntry);
    }

    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify({ entries }));
    return newEntry;
  },

  deleteEntry(id) {
    const entries = this.getEntries().filter(e => e.id !== id);
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify({ entries }));
  },

  getStats() {
    const entries = this.getEntries();
    if (entries.length === 0) return null;

    const last7Days = entries.slice(0, 7);
    const symptomFreq = {};
    const moods = {};

    entries.forEach(e => {
      e.symptoms.forEach(s => {
        symptomFreq[s] = (symptomFreq[s] || 0) + 1;
      });
      moods[e.mood] = (moods[e.mood] || 0) + 1;
    });

    return {
      totalEntries: entries.length,
      symptomFreq,
      moods,
      lastRisk: entries[0]?.riskLevel || 'BAIXO'
    };
  },

  generateInsights() {
    const entries = this.getEntries();
    if (entries.length < 3) return ["Continue registrando seus sintomas para que a Lumi possa identificar padrões em sua saúde."];

    const insights = [];
    const stats = this.getStats();
    
    // Insight de frequência
    const topSymptom = Object.entries(stats.symptomFreq).sort((a, b) => b[1] - a[1])[0];
    if (topSymptom && topSymptom[1] >= 3) {
      insights.push(`Você relatou **${topSymptom[0]}** cerca de ${topSymptom[1]} vezes recentemente.`);
    }

    // Insight de Humor vs Sintoma
    const moodCorrelation = {}; // Ex: fadiga + ansioso
    entries.forEach(e => {
        if (e.mood && e.symptoms.length > 0) {
            e.symptoms.forEach(s => {
                const key = `${s} + ${e.mood}`;
                moodCorrelation[key] = (moodCorrelation[key] || 0) + 1;
            });
        }
    });

    const topCorr = Object.entries(moodCorrelation).sort((a,b) => b[1] - a[1])[0];
    if (topCorr && topCorr[1] >= 2) {
        insights.push(`Notamos que **${topCorr[0].split(' + ')[0]}** e **${topCorr[0].split(' + ')[1]}** costumam aparecer juntos em sua rotina.`);
    }

    // Alerta de Risco
    const highRisks = entries.filter(e => e.riskLevel === 'ALTO' || e.riskLevel === 'URGENTE').length;
    if (highRisks >= 2) {
        insights.push("⚠️ Detectamos múltiplos registros de risco elevado. Recomendamos agendar uma consulta médica preventiva.");
    }

    return insights;
  }
};

window.DiaryService = DiaryService;
