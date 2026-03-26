/**
 * Lumi Chat - Senior Implementation
 * Persistence, Multi-session, TTS, and Risky Analysis
 */

const API_URL = 'http://127.0.0.1:5000/chat';
const AVATAR_URL = "../../../Arquivos/Avatar_bot_realista.png";

let conversations = [];
let currentConversationId = null;

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
 * GERENCIAMENTO DE CONVERSAS (Sessions)
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
    loadConversation(id);
    
    // Mensagem inicial padrão
    appendBotMessage("Olá! Eu sou Lumi. Como posso ajudar você com sua saúde hoje?", true);
}

function loadConversation(id) {
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;
    
    currentConversationId = id;
    localStorage.setItem('lumi_current_id', id);
    
    messagesContainer.innerHTML = '';
    chat.messages.forEach(msg => {
        renderMessage(msg);
    });
    
    // Sugestões iniciais se não houver mensagens do usuário
    if (chat.messages.filter(m => m.role === 'user').length === 0) {
        showInitialSuggestions();
    }
    
    renderHistory();
    scrollToBottom();
}

function deleteConversation(id, e) {
    e.stopPropagation();
    if (!confirm("Excluir esta conversa permanentemente?")) return;
    
    conversations = conversations.filter(c => c.id !== id);
    if (currentConversationId === id) {
        currentConversationId = conversations.length > 0 ? conversations[0].id : null;
    }
    
    saveToStorage();
    if (currentConversationId) {
        loadConversation(currentConversationId);
    } else {
        createNewConversation();
    }
}

function saveToStorage() {
    window.storageService.saveAll(conversations);
}

function showSkeleton(show) {
    if (show) {
        messagesContainer.innerHTML = '<div class="skeleton-msg"></div><div class="skeleton-msg"></div>';
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></button>
            </button>
        `;
        chatHistoryList.appendChild(li);
    });
}

function renderMessage(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${msg.role}-message`);
    
    if (msg.role === 'bot') {
        const riskHtml = msg.riskLevel ? `
            <div class="urgency-indicator urgency-${msg.riskLevel.toLowerCase()}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.45L20.15 19H3.85L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                ${msg.riskLevel}
            </div>` : '';

        const resourcesHtml = msg.resources ? `
            <div class="resources-container">
                <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">RECURSOS ÚTEIS:</span>
                <div class="resource-cards">
                    ${msg.resources.map(res => `
                        <a href="${res.url}" target="_blank" class="resource-card">
                            <span class="res-type">${res.type === 'video' ? '🎬 VÍDEO' : '🔗 ARTIGO'}</span>
                            <span class="res-title">${res.title}</span>
                            <span class="res-source">${res.source}</span>
                        </a>
                    `).join('')}
                </div>
            </div>` : '';

        const upaBtn = (msg.riskLevel === 'ALTO' || msg.riskLevel === 'URGENTE') ? `
            <a href="https://www.google.com/maps/search/UPA+Hospital+proximo" target="_blank" class="upa-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Encontrar UPA Próxima
            </a>` : '';

        msgDiv.innerHTML = `
            <img src="${AVATAR_URL}" class="mini-avatar" alt="Lumi">
            <div class="msg-content-wrapper">
                ${riskHtml}
                <div class="msg-content">${formatMarkdown(msg.content)}</div>
                ${resourcesHtml}
                ${upaBtn}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <span class="timestamp">${formatTime(msg.timestamp)}</span>
                    <button class="audio-control" onclick="speakText('${msg.content.replace(/'/g, "\\'")}', this)" title="Ouvir resposta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                </div>
                ${msg.riskLevel ? '<span class="disclaimer-badge">Análise informativa, não substitui médico.</span>' : ''}
            </div>
        `;
    } else {
        msgDiv.innerHTML = `
            <div class="msg-content-wrapper">
                <div class="msg-content">${msg.content}</div>
                <span class="timestamp" style="text-align: right;">${formatTime(msg.timestamp)}</span>
            </div>
        `;
    }
    
    messagesContainer.appendChild(msgDiv);
    
    // Se houver sugestões na mensagem do bot
    if (msg.role === 'bot' && msg.suggestions) {
        showSuggestionChips(msg.suggestions);
    }
}

/**
 * ANALISE DE CONTEÚDO (Inteligência de Front-end)
 */

function analyzeHealthContent(text) {
    const lowerText = text.toLowerCase();
    let risk = "BAIXO";
    let resources = [];
    let suggestions = ["Como prevenir isso?", "Quais os sintomas?", "O que devo comer?"];

    // Lógica simplificada de detecção
    if (lowerText.includes("dor no peito") || lowerText.includes("falta de ar") || lowerText.includes("desmaio")) {
        risk = "URGENTE";
        resources = [
            { type: "video", title: "Primeiros socorros: Infarto", source: "Hospital Albert Einstein", url: "https://youtube.com" },
            { type: "site", title: "Quando ir à emergência", source: "Ministério da Saúde", url: "https://saude.gov.br" }
        ];
        suggestions = ["Onde tem uma UPA?", "Ligar para o SAMU", "Sintomas de infarto"];
    } else if (lowerText.includes("febre") || lowerText.includes("vômito") || lowerText.includes("pressão alta")) {
        risk = "ALTO";
        resources = [{ type: "site", title: "Como controlar a febre", source: "Drauzio Varella", url: "https://drauziovarella.uol.com.br" }];
    } else if (lowerText.includes("gripe") || lowerText.includes("tosse") || lowerText.includes("dor de cabeça")) {
        risk = "MODERADO";
    }

    return { risk, resources, suggestions };
}

/**
 * TEXT-TO-SPEECH (Web Speech API)
 */
let currentUtterance = null;

function speakText(text, btn) {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();    
        if (btn.classList.contains('playing')) {
            btn.classList.remove('playing');
            return;
        }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onstart = () => btn.classList.add('playing');
    utterance.onend = () => btn.classList.remove('playing');
    utterance.onerror = () => btn.classList.remove('playing');

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

/**
 * COMPONENTES DE SUGESTÃO
 */

function showInitialSuggestions() {
    const initial = ["Estou com dor de cabeça", "Tenho febre há 2 dias", "Dicas para sono melhor", "Alimentação saudável"];
    showSuggestionChips(initial);
}

function showSuggestionChips(list) {
    // Remove chips anteriores
    const oldChips = document.querySelector('.suggestion-chips');
    if (oldChips) oldChips.remove();

    const container = document.createElement('div');
    container.className = 'suggestion-chips';
    
    list.forEach(msg => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = msg;
        chip.onclick = () => {
            chatTextarea.value = msg;
            handleSend();
            container.remove();
        };
        container.appendChild(chip);
    });
    
    messagesContainer.appendChild(container);
    scrollToBottom();
}

/**
 * CORE SEND LOGIC
 */

async function handleSend() {
    const text = chatTextarea.value.trim();
    if (!text) return;

    chatTextarea.value = '';
    autoResizeTextarea();
    
    // Atualiza título da conversa se for a primeira mensagem do usuário
    const currentChat = conversations.find(c => c.id === currentConversationId);
    if (currentChat.messages.filter(m => m.role === 'user').length === 0) {
        currentChat.title = text.length > 25 ? text.substring(0, 25) + "..." : text;
    }

    appendUserMessage(text);
    showTypingIndicator();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        hideTypingIndicator();

        if (response.ok && data.response) {
            appendBotMessage(data.response);
        } else {
            appendBotMessage("Ops, houve um erro na conexão.");
        }
    } catch (error) {
        hideTypingIndicator();
        appendBotMessage("Não foi possível conectar ao servidor. Verifique o api.py.");
    }
}

function appendUserMessage(content) {
    const msg = { role: 'user', content, timestamp: new Date().toISOString() };
    const chat = conversations.find(c => c.id === currentConversationId);
    chat.messages.push(msg);
    saveToStorage();
    renderMessage(msg);
    renderHistory();
}

function appendBotMessage(content, isSilent = false) {
    const analysis = analyzeHealthContent(content);
    const msg = { 
        role: 'bot', 
        content, 
        timestamp: new Date().toISOString(),
        riskLevel: analysis.risk,
        resources: analysis.resources,
        suggestions: analysis.suggestions
    };
    
    const chat = conversations.find(c => c.id === currentConversationId);
    chat.messages.push(msg);
    
    // Atualiza risco máximo da sessão
    if (getRiskValue(analysis.risk) > getRiskValue(chat.maxRisk)) {
        chat.maxRisk = analysis.risk;
    }
    
    saveToStorage();
    renderMessage(msg);
    renderHistory();
    if (!isSilent) scrollToBottom();
}

// Helpers
function getRiskValue(risk) {
    const ranks = { "BAIXO": 0, "MODERADO": 1, "ALTO": 2, "URGENTE": 3 };
    return ranks[risk] || 0;
}

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function autoResizeTextarea() {
    chatTextarea.style.height = 'auto';
    chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 150) + 'px';
}

function scrollToBottom() {
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'message bot-message';
    div.innerHTML = `<img src="${AVATAR_URL}" class="mini-avatar"><div class="msg-content-wrapper"><div class="msg-content"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
    messagesContainer.appendChild(div);
    mainAvatar.classList.add('typing');
    scrollToBottom();
}

function hideTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
    mainAvatar.classList.remove('typing');
}

// Event Listeners
chatTextarea.addEventListener('input', autoResizeTextarea);
chatTextarea.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
sendBtn.addEventListener('click', handleSend);
newChatBtn.addEventListener('click', createNewConversation);

// Iniciar
init();