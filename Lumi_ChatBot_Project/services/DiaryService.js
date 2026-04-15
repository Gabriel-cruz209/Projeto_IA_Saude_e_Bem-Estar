/**
 * services/DiaryService.js
 * Fachada unificada do Diário de Saúde Lumi.
 * Delega persistência ao DiaryStorageService e análise ao DiaryAnalysisService.
 *
 * Mantém a API pública original (getEntries, saveEntry, deleteEntry, getStats,
 * generateInsights) para não quebrar nenhuma funcionalidade existente.
 */

const DiaryService = {

    // ─── API PÚBLICA (compatível com versão anterior) ─────────────────────────

    /** Retorna todos os registros (síncrono, do cache local). */
    getEntries() {
        return window.diaryStorageService.loadSync();
    },

    /** Carrega registros do backend de forma assíncrona. */
    async loadEntriesAsync() {
        return window.diaryStorageService.loadAll();
    },

    /**
     * Salva um novo registro (ou atualiza o do dia atual).
     * Compatível com o esquema antigo; retorna a entrada salva.
     */
    async saveEntry(entry) {
        return window.diaryStorageService.saveEntry(entry);
    },

    /** Remove um registro pelo ID. */
    async deleteEntry(id) {
        return window.diaryStorageService.deleteEntry(id);
    },

    // ─── ANÁLISE E ESTATÍSTICAS ───────────────────────────────────────────────

    /** Retorna estatísticas agregadas dos registros. */
    getStats() {
        const entries = this.getEntries();
        if (entries.length === 0) return null;
        return window.DiaryAnalysisService.computeStats(entries);
    },

    /**
     * Gera insights legíveis para exibição no painel.
     * @returns {string[]} — lista de textos (mantém compatibilidade com string[])
     */
    generateInsights() {
        const entries = this.getEntries();
        const insights = window.DiaryAnalysisService.generateInsights(entries);
        // Retorna array de objetos enriquecidos; diary.js os processa
        return insights;
    },

    /**
     * Gera insights usando a IA do backend.
     * @returns {Promise<string[]|null>}
     */
    async generateAIInsights() {
        return window.diaryStorageService.requestAIAnalysis();
    },

    /** Dados dos últimos N dias formatados para o gráfico. */
    getLast15DaysData(days = 15) {
        const entries = this.getEntries();
        return window.DiaryAnalysisService.getLast15DaysData(entries, days);
    },

    /** Resumo do histórico para o chat. */
    getHistorySummary(days = 7) {
        const entries = this.getEntries();
        return window.DiaryAnalysisService.generateHistorySummary(entries, days);
    },

    // ─── PARSING DE LINGUAGEM NATURAL ─────────────────────────────────────────

    /**
     * Detecta se uma mensagem do chat contém um registro de sintomas natural.
     * @param {string} text
     * @returns {{ symptoms: string[], intensity: number }|null}
     */
    parseNaturalEntry(text) {
        return window.DiaryAnalysisService.parseNaturalEntry(text);
    },

    /** Verifica se texto é uma consulta ao histórico. */
    isHistoryQuery(text) {
        return window.DiaryAnalysisService.isHistoryQuery(text);
    },

    /** Verifica se texto é um registro natural de diário. */
    isDiaryEntry(text) {
        return window.DiaryAnalysisService.isDiaryEntry(text);
    }
};

window.DiaryService = DiaryService;
