/**
 * services/DiaryStorageService.js
 * Persistência dual (localStorage + REST) para o Diário de Saúde.
 * Segue o mesmo padrão do ConversationStorageService.
 */

class DiaryStorageService {
    constructor() {
        const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
            ? 'http://127.0.0.1:5000'
            : 'https://api.producao.com';

        this.API_ENTRIES_URL = `${API_BASE}/api/diary/entries`;
        this.API_ANALYZE_URL = `${API_BASE}/api/diary/analyze`;
        this.STORAGE_KEY = 'lumi_health_diary_v2';
        this.saveTimeout = null;
    }

    // ─── LEITURA ────────────────────────────────────────────────────────────────

    /**
     * Carrega todos os registros.
     * Prioriza backend; usa localStorage como cache/fallback.
     */
    async loadAll() {
        try {
            const response = await fetch(this.API_ENTRIES_URL);
            if (response.ok) {
                const data = await response.json();
                this._syncToLocal(data.entries || []);
                return data.entries || [];
            }
        } catch (err) {
            console.warn('[DiaryStorage] Backend indisponível, usando localStorage:', err.message);
        }

        return this._loadFromLocal();
    }

    /** Retorna entradas somente do cache local (síncrono). */
    loadSync() {
        return this._loadFromLocal();
    }

    // ─── ESCRITA ─────────────────────────────────────────────────────────────────

    /**
     * Salva ou atualiza um registro.
     * Regra: apenas 1 registro por data (substitui se já existir no mesmo dia).
     */
    async saveEntry(entry) {
        const entries = this._loadFromLocal();

        const newEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            ...entry
        };

        const idx = entries.findIndex(e => e.date === newEntry.date);
        if (idx !== -1) {
            entries[idx] = newEntry;  // Sobrescreve o do mesmo dia
        } else {
            entries.unshift(newEntry);
        }

        // Camada 1: localStorage imediato
        this._syncToLocal(entries);

        // Camada 2: backend com debounce
        this._scheduleSave(entries);

        return newEntry;
    }

    async deleteEntry(id) {
        const entries = this._loadFromLocal().filter(e => e.id !== id);
        this._syncToLocal(entries);
        this._scheduleSave(entries);
    }

    // ─── ANÁLISE IA ──────────────────────────────────────────────────────────────

    /**
     * Solicita análise de padrões ao backend (OpenAI).
     * Retorna array de strings com insights gerados.
     */
    async requestAIAnalysis(userId = 'anonymous') {
        const entries = this._loadFromLocal();
        if (entries.length < 3) return null;

        try {
            const response = await fetch(this.API_ANALYZE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries, userId })
            });
            if (!response.ok) throw new Error('Falha na análise');
            const data = await response.json();
            return data.insights || [];
        } catch (err) {
            console.warn('[DiaryStorage] Análise IA falhou:', err.message);
            return null;
        }
    }

    // ─── HELPERS INTERNOS ────────────────────────────────────────────────────────

    _loadFromLocal() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            // Compatibilidade com esquema antigo (lumi_health_diary)
            if (Array.isArray(parsed)) return parsed;
            return parsed.entries || [];
        } catch {
            return [];
        }
    }

    _syncToLocal(entries) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ entries }));
    }

    _scheduleSave(entries) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this._persistToServer(entries), 800);
    }

    async _persistToServer(entries, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(this.API_ENTRIES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entries })
                });
                if (res.ok) return;
                throw new Error('Resposta inválida do servidor');
            } catch (err) {
                console.error(`[DiaryStorage] Tentativa ${i + 1} de salvar falhou:`, err.message);
            }
        }
    }

    // ─── MIGRAÇÃO ────────────────────────────────────────────────────────────────

    /**
     * Migra dados do esquema antigo (lumi_health_diary) para o novo.
     * Chame uma vez na inicialização.
     */
    migrateFromLegacy() {
        const legacy = localStorage.getItem('lumi_health_diary');
        if (!legacy) return;
        try {
            const old = JSON.parse(legacy);
            const oldEntries = old.entries || [];
            if (oldEntries.length > 0 && this._loadFromLocal().length === 0) {
                this._syncToLocal(oldEntries);
                console.info('[DiaryStorage] Migração de dados legados concluída.');
            }
        } catch { /* ignora */ }
    }
}

// Singleton global
const diaryStorageService = new DiaryStorageService();
diaryStorageService.migrateFromLegacy();
window.diaryStorageService = diaryStorageService;
