/**
 * Lumi Chat - Senior Implementation
 * Persistence, Multi-session, TTS, and Risky Analysis
 */

const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://api.producao.com';
const API_URL = `${API_BASE}/chat`;
const AVATAR_URL = "../../../Arquivos/Avatar_bot_realista.png";

let conversations = [];
let currentConversationId = null;
let isTriaging = false;
let userLocation = null;

// Diagnóstico UX: Obter localização para personalização real das UPAs
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log("Geolocalização habilitada:", userLocation);
    }, (err) => {
        console.log("Geolocalização não permitida ou falhou.");
        if (window.ProfileMemoryNotice) {
            window.ProfileMemoryNotice("Localização não permitida. A busca por hospitais será genérica.", "info");
        }
    });
}

// Elementos da UI
const chatTextarea = document.getElementById('chat-textarea');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const chatHistoryList = document.getElementById('chat-history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const mainAvatar = document.getElementById('main-avatar');
const botStatusText = document.getElementById('bot-status-text');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

/**
 * INICIALIZAÇÃO
 */
async function init() {
    showSkeleton(true);
    conversations = await window.storageService.loadAll();
    currentConversationId = localStorage.getItem('lumi_current_id');

    // Inicializar perfil
    const { getProfile } = window.useUserProfile();
    const profile = getProfile();

    if (conversations.length === 0) {
        createNewConversation();
    } else {
        if (!currentConversationId || !conversations.find(c => c.id === currentConversationId)) {
            currentConversationId = conversations[0].id;
        }
        loadConversation(currentConversationId);
    }
    showSkeleton(false);

    // Suporte a Mobile Menu
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

/**
 * GERENCIAMENTO DE CONVERSAS
 */
function createNewConversation() {
    const id = Date.now().toString();
    const newChat = {
        id: id,
        title: "Nova conversa",
        createdAt: new Date().toISOString(),
        maxRisk: "BAIXO",
        messages: []
    };

    conversations.unshift(newChat);
    currentConversationId = id;
    saveToStorage();
    renderHistory();

    if (window.useAudio) window.useAudio().stop();
    loadConversation(id);

    appendBotMessage("Olá! Eu sou Lumi. Como posso ajudar você com sua saúde hoje?", true);
}

function loadConversation(id) {
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;

    currentConversationId = id;
    localStorage.setItem('lumi_current_id', id);
    if (window.useAudio) window.useAudio().stop();

    messagesContainer.innerHTML = '';
    chat.messages.forEach(msg => renderMessage(msg));

    if (chat.messages.filter(m => m.role === 'user').length === 0) {
        showInitialSuggestions();
    }

    renderHistory();
    scrollToBottom();
}

function deleteConversation(id, e) {
    e.stopPropagation();
    window.ModalService.confirm({
        title: 'Excluir Conversa',
        message: 'Excluir esta conversa?'
    }).then(confirmed => {
        if (!confirmed) return;
        conversations = conversations.filter(c => c.id !== id);
        currentConversationId = (currentConversationId === id) ? (conversations[0]?.id || null) : currentConversationId;
        saveToStorage();
        if (currentConversationId) loadConversation(currentConversationId); else createNewConversation();
    });
}

function saveToStorage() { window.storageService.saveAll(conversations); }

function showSkeleton(show) {
    if (show) {
        messagesContainer.innerHTML = '<div class="skeleton-msg"></div>';
        messagesContainer.classList.add('loading');
    } else {
        messagesContainer.classList.remove('loading');
    }
}

/**
 * UI RENDERING
 */
function renderHistory() {
    chatHistoryList.innerHTML = '';
    conversations.forEach(chat => {
        const li = document.createElement('li');
        li.className = `history-item ${chat.id === currentConversationId ? 'active' : ''}`;
        li.onclick = () => loadConversation(chat.id);
        const date = new Date(chat.createdAt).toLocaleDateString();
        li.innerHTML = `
            <div class="title">${chat.title}</div>
            <div class="meta">
                <span>${date}</span>
                <span class="badget-risk-${chat.maxRisk.toLowerCase()}">${chat.maxRisk}</span>
            </div>
            <button class="delete-chat" onclick="deleteConversation('${chat.id}', event)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        chatHistoryList.appendChild(li);
    });
}

function renderMessage(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${msg.role}-message`);

    let displayContent = msg.content;
    let sources = [];
    let dynamicResources = [];

    // Helper to safely extract JSON blocks from the END of the message
    const extractJsonBlock = (text, blockName) => {
        const marker = blockName + ':';
        const idx = text.lastIndexOf(marker);
        if (idx === -1) return { jsonStr: '', cleanText: text };
        
        let jsonStr = text.substring(idx + marker.length).trim();
        const cleanText = text.substring(0, idx).trim();
        
        // Remove markdown tags if the LLM wrapped it AND clean string output ensuring correct [] encapsulation
        jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
        if (jsonStr.startsWith('[')) {
            const endIdx = jsonStr.lastIndexOf(']');
            if (endIdx !== -1) {
                jsonStr = jsonStr.substring(0, endIdx + 1);
            }
        }
        return { jsonStr, cleanText };
    };

    // Extract RESOURCES FIRST (since it's at the very end usually)
    const resExtracted = extractJsonBlock(displayContent, 'RESOURCES');
    if (resExtracted.jsonStr) {
        displayContent = resExtracted.cleanText;
        try { dynamicResources = JSON.parse(resExtracted.jsonStr); } 
        catch (e) { console.error('Error parsing resources:', resExtracted.jsonStr); }
    }

    // Extract SOURCES NEXT
    const srcExtracted = extractJsonBlock(displayContent, 'SOURCES');
    if (srcExtracted.jsonStr) {
        displayContent = srcExtracted.cleanText;
        try { sources = JSON.parse(srcExtracted.jsonStr); } 
        catch (e) { console.error('Error parsing sources:', srcExtracted.jsonStr); }
    }


    if (msg.role === 'bot') {
        const riskHtml = msg.riskLevel && msg.riskLevel !== "BAIXO" ? `
            <div class="urgency-indicator urgency-${msg.riskLevel.toLowerCase()}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.45L20.15 19H3.85L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                ${msg.riskLevel}
            </div>` : '';

        const finalResources = dynamicResources.length > 0 ? dynamicResources : (msg.resources || []);
        
        const isRisky = ['MODERADO', 'ALTO', 'URGENTE'].includes((msg.riskLevel || '').toUpperCase());
        
        // RECURSOS ÚTEIS: Renderiza SOMENTE se hover risco acima da média
        const resourcesHtml = (finalResources.length > 0 && isRisky) ? `
            <div class="resources-container">
                <span class="resources-label">RECURSOS ÚTEIS:</span>
                <div class="resource-cards">
                    ${finalResources.map(res => `
                        <a href="${res.url}" target="_blank" class="resource-card">
                            <span class="res-type ${res.type}">${res.type === 'video' ? '🎬 VÍDEO' : '🔗 ARTIGO'}</span>
                            <span class="res-title"><strong>${res.title}</strong></span>
                            <span class="res-source">${res.source}</span>
                        </a>
                    `).join('')}
                </div>
            </div>` : '';

        // Botão UPA: 100% largura e apenas em casos de ALTO risco ou URGENTE
        let upaUrl = "https://www.google.com/maps/search/UPA+Hospital+proximo";
        if (userLocation) {
            upaUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=UPA+Hospital+mais+proximo&travelmode=driving`;
        }

        const upaBtnHtml = (isRisky && (msg.riskLevel === 'ALTO' || msg.riskLevel === 'URGENTE')) ? `
            <div class="upa-container" style="width: 100%; margin-top: 15px;">
                <a href="${upaUrl}" target="_blank" class="upa-btn" style="display: flex; width: 100%; justify-content: center; align-items: center; gap: 10px; background: #ef4444; border-radius: 12px; padding: 14px; text-decoration: none; color: white; font-weight: 700;">
                    <span style="font-size: 1.2rem;">📍</span> Encontrar UPA Próxima
                </a>
            </div>` : '';

        msgDiv.innerHTML = `
            <img src="${AVATAR_URL}" class="mini-avatar" alt="Lumi">
            <div class="msg-content-wrapper">
                ${riskHtml}
                <div class="msg-content">${formatMarkdown(displayContent)}</div>
                ${resourcesHtml}
                ${upaBtnHtml}
                <div class="sources-slot"></div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <span class="timestamp">${formatTime(msg.timestamp)}</span>
                    <div class="audio-button-slot"></div>
                </div>
                ${msg.riskLevel && msg.riskLevel !== "BAIXO" ? '<span class="disclaimer-badge">Análise informativa, não substitui médico.</span>' : ''}
            </div>
        `;

        if (sources.length > 0) {
            const slot = msgDiv.querySelector('.sources-slot');
            const badges = window.SourceBadge(sources);
            if (badges) slot.appendChild(badges);
        }

        const audioSlot = msgDiv.querySelector('.audio-button-slot');
        const audioBtn = window.AudioButton({ text: displayContent, messageId: msg.timestamp });
        if (audioBtn) audioSlot.appendChild(audioBtn);
    } else {
        msgDiv.innerHTML = `
            <div class="msg-content-wrapper user-wrapper">
                <div class="msg-content">${msg.content}</div>
                <span class="timestamp" style="text-align: right;">${formatTime(msg.timestamp)}</span>
            </div>
        `;
    }

    messagesContainer.appendChild(msgDiv);
    if (msg.role === 'bot' && msg.suggestions) showSuggestionChips(msg.suggestions);
}

function showSuggestionChips(suggestions) {
    const old = document.querySelector('.suggestion-chips');
    if (old) old.remove();
    const container = document.createElement('div');
    container.className = 'suggestion-chips';
    suggestions.forEach(msg => {
        const chip = document.createElement('button');
        chip.className = `suggestion-chip ${msg.startsWith('Estou com ') ? 'triage-chip' : ''}`;
        chip.textContent = msg;
        chip.onclick = () => { chatTextarea.value = msg; handleSend(); container.remove(); };
        container.appendChild(chip);
    });
    messagesContainer.appendChild(container);
    scrollToBottom();
}

function showInitialSuggestions() {
    showSuggestionChips(["Estou com gripe / resfriado", "Estou com febre", "Estou com dor de cabeça", "Estou com dor de estômago"]);
}

/**
 * CORE SEND LOGIC
 */
async function handleSend() {
    const text = chatTextarea.value.trim();
    if (!text) return;
    chatTextarea.value = '';
    autoResizeTextarea();

    const currentChat = conversations.find(c => c.id === currentConversationId);
    if (currentChat && currentChat.messages.filter(m => m.role === 'user').length === 0) {
        currentChat.title = text.length > 25 ? text.substring(0, 25) + "..." : text;
    }

    appendUserMessage(text);

    const symptomKeywords = ['dor', 'febre', 'mancha', 'tosse', 'falta de ar', 'vomito', 'enjoo', 'tontura', 'gripe', 'resfriado', 'mal-estar', 'fraqueza', 'cansaco', 'diarreia'];
    if (symptomKeywords.some(kw => text.toLowerCase().includes(kw)) && !isTriaging) {
        startTriage(text);
        return;
    }

    window.useUserProfile().detectAndSaveInfo(text);
    showTypingIndicator();

    try {
        const history = currentChat.messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                history: history 
            })
        });
        const data = await response.json();
        hideTypingIndicator();
        if (response.ok && data.response) {
            appendBotMessage(data.response);
        } else {
            const errorMsg = data.error || "Erro desconhecido na conexão.";
            appendBotMessage(`Ops, houve um erro na conexão: ${errorMsg}`);
        }
    } catch (error) {
        hideTypingIndicator();
        appendBotMessage("Não foi possível conectar ao servidor.");
    }
}

function appendUserMessage(content) {
    const msg = { role: 'user', content, timestamp: new Date().toISOString() };
    const chat = conversations.find(c => c.id === currentConversationId);
    chat.messages.push(msg);
    saveToStorage();
    renderMessage(msg);
}

function appendBotMessage(content, options = {}) {
    const msg = {
        role: 'bot',
        content,
        timestamp: new Date().toISOString(),
        riskLevel: options.riskLevel || "BAIXO",
        resources: options.resources || [],
        suggestions: options.suggestions || ["Como prevenir isso?", "Quais os sintomas?"]
    };

    const chat = conversations.find(c => c.id === currentConversationId);
    chat.messages.push(msg);
    saveToStorage();

    // Contextual alert based on profile
    const profile = window.useUserProfile().getProfile();
    if (profile.conditions.length > 0 && (content.toLowerCase().includes("importante") || content.toLowerCase().includes("atencão"))) {
        msg.content += `\n\n> **Nota da Lumi:** Como você registrou possuir **${profile.conditions.join(" e ")}**, certifique-se de seguir estas orientações com cuidado.`;
    }

    renderMessage(msg);
    if (!options.isSilent) scrollToBottom();
}

// Helpers
function formatTime(iso) { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function formatMarkdown(text) { return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>'); }
function autoResizeTextarea() { chatTextarea.style.height = 'auto'; chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 150) + 'px'; }
function scrollToBottom() { messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' }); }
function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'message bot-message';
    div.innerHTML = `<img src="${AVATAR_URL}" class="mini-avatar"><div class="msg-content-wrapper"><div class="msg-content"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
    messagesContainer.appendChild(div);
    mainAvatar.classList.add('typing');
    scrollToBottom();
}
function hideTypingIndicator() { const el = document.getElementById('typing-indicator'); if (el) el.remove(); mainAvatar.classList.remove('typing'); }

function startTriage(symptom) {
    isTriaging = true;
    chatTextarea.disabled = true;
    sendBtn.disabled = true;
    appendBotMessage("Entendi que você está relatando um sintoma. Para te orientar melhor, preciso fazer algumas perguntas rápidas de triagem.", { isSilent: true });
    const triageEl = window.TriageFlow({
        mainSymptom: symptom,
        onComplete: (res) => finalizeTriage(res),
        onCancel: () => { isTriaging = false; chatTextarea.disabled = false; sendBtn.disabled = false; }
    });
    messagesContainer.appendChild(triageEl);
    scrollToBottom();
}

async function finalizeTriage(results) {
    isTriaging = false;
    chatTextarea.disabled = false;
    sendBtn.disabled = false;
    
    // Diagnóstico Geral: Obter risco real do serviço
    const risk = window.TriageService.calculateFinalRisk(results);
    const currentChat = conversations.find(c => c.id === currentConversationId);
    
    let summary = `📍 RESUMO DA TRIAGEM:\n`;
    summary += `- Queixa: **${results.initial}**\n`;
    summary += `- Intensidade: **${results.intensity}/10**\n`;
    if (results.associated?.length > 0) summary += `- Sintomas associados: ${results.associated.join(', ')}\n`;
    
    showTypingIndicator();
    
    const history = currentChat ? currentChat.messages.map(m => ({
        role: m.role,
        content: m.content
    })) : [];

    // Prompt estratégico para IA gerar conduta prática com os novos campos
    const prompt = `Realizei uma triagem. Sintomas: ${results.initial}, Intensidade: ${results.intensity}, Associados: ${results.associated || 'nenhum'}.
Perfil de Risco do Sistema: **Risco ${risk}**.

Lumi, por favor, me dê orientações médicas práticas: 
1. Conduta Prática imediata. 
2. Cuidados em Casa apropriados. 
3. Sinais de Alerta para ir à emergência.
No final, inclua os blocos RESOURCES e SOURCES obrigatórios.`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: prompt,
                history: history
            })
        });
        const data = await response.json();
        hideTypingIndicator();
        
        if (response.ok && data.response) {
            appendBotMessage(data.response, { riskLevel: risk });
        } else {
            appendBotMessage(`Identifiquei um **Risco ${risk}**.\n\n${summary}\nProcure atendimento médico.`, { riskLevel: risk });
        }
    } catch (e) {
        hideTypingIndicator();
        appendBotMessage(`Identifiquei um **Risco ${risk}**.\n\n${summary}\nFalha de conexão. Por favor, busque ajuda profissional.`, { riskLevel: risk });
    }
}

// Inicializar
chatTextarea.addEventListener('input', autoResizeTextarea);
chatTextarea.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
sendBtn.addEventListener('click', handleSend);
newChatBtn.addEventListener('click', createNewConversation);
init();