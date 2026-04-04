/**
 * Lumi Conversation Storage Service
 * Dual-layer persistence: localStorage + REST API
 */

class ConversationStorageService {
    constructor() {
        const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
            ? 'http://127.0.0.1:5000' 
            : 'https://api.producao.com';
        this.API_URL = `${API_BASE}/api/conversations`;
        this.STORAGE_KEY = 'lumi_conversations_v1';
        this.STORAGE_STRATEGY = 'nextjs'; // Estratégia de API/Backend
        this.schemaVersion = "1.0";
        this.saveTimeout = null;
    }

    /**
     * Carrega todas as conversas
     * Prioriza o backend, usa localStorage como fallback/cache
     */
    async loadAll() {
        try {
            // Tenta carregar do Servidor
            const response = await fetch(this.API_URL);
            if (response.ok) {
                const data = await response.json();
                this._syncToLocal(data); // Atualiza cache local
                return data.conversations || [];
            }
        } catch (error) {
            console.warn("Falha ao carregar do servidor, tentando localStorage...", error);
        }

        // Fallback: carregar do localStorage
        const localData = localStorage.getItem(this.STORAGE_KEY);
        if (localData) {
            const parsed = JSON.parse(localData);
            return parsed.conversations || [];
        }

        return [];
    }

    /**
     * Salva o estado completo (com debounce de 800ms)
     */
    async saveAll(conversations) {
        const dataToSave = {
            version: this.schemaVersion,
            lastUpdated: new Date().toISOString(),
            conversations: conversations
        };

        // Camada 1: LocalStorage (Imediato)
        this._syncToLocal(dataToSave);

        // Camada 2: Servidor (Debounced)
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        
        this.saveTimeout = setTimeout(async () => {
            await this._saveToServer(dataToSave);
        }, 800);
    }

    /**
     * Métodos Internos
     */

    _syncToLocal(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    async _saveToServer(data, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) return;
                throw new Error("Erro na resposta do servidor");
            } catch (error) {
                console.error(`Tentativa ${i + 1} de salvamento falhou:`, error);
                if (i === retries - 1) {
                    this._showToast("Falha ao sincronizar com o servidor.");
                }
            }
        }
    }

    /**
     * Exportação e Importação
     */

    exportToFile(conversations) {
        const data = {
            version: this.schemaVersion,
            lastUpdated: new Date().toISOString(),
            conversations: conversations
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumi_conversations_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    if (this.validateSchema(json)) {
                        await this.saveAll(json.conversations);
                        resolve(json.conversations);
                    } else {
                        reject("Esquema de arquivo inválido");
                    }
                } catch (err) {
                    reject("Arquivo JSON corrompido");
                }
            };
            reader.readAsText(file);
        });
    }

    validateSchema(data) {
        return data && data.version && Array.isArray(data.conversations);
    }

    _showToast(msg) {
        // Implementação simples de feedback sutil
        console.log(`[Lumi Storage]: ${msg}`);
    }
}

// Exportar instância única
const storageService = new ConversationStorageService();
window.storageService = storageService; // Disponível globalmente
