// Selecionar elementos principais
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const suggestionBtns = document.querySelectorAll('.suggestion-btn');
const suggestionsContainer = document.querySelector('.suggestions-container');

// URL da nossa API (deve estar rodando via python api.py)
const API_URL = 'http://127.0.0.1:5000/chat';

let isFirstMessage = true;

function appendMessage(text, sender) {
    // Se for a primeira mensagem, limpar as sugestões e preparar a área de chat vertical
    if (isFirstMessage) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.alignItems = 'stretch';
        suggestionsContainer.style.height = '350px';
        suggestionsContainer.style.overflowY = 'auto';
        suggestionsContainer.style.paddingRight = '10px';
        isFirstMessage = false;
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${sender}-message`);
    msgDiv.textContent = text;
    
    suggestionsContainer.appendChild(msgDiv);
    suggestionsContainer.scrollTop = suggestionsContainer.scrollHeight;
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'bot-message', 'typing-indicator');
    msgDiv.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    msgDiv.id = 'typing-indicator';
    suggestionsContainer.appendChild(msgDiv);
    suggestionsContainer.scrollTop = suggestionsContainer.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

async function handleSend() {
    const text = userInput.value.trim();
    if (text === '') return;

    // Mostra mensagem do usuário
    appendMessage(text, 'user');
    userInput.value = '';
    sendBtn.disabled = true;

    // Mostra que o bot está digitando
    showTypingIndicator();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        
        hideTypingIndicator();
        
        if (response.ok && data.response) {
            appendMessage(data.response, 'bot');
        } else {
            appendMessage('Desculpe, ocorreu um erro ao se comunicar com a IA.', 'bot');
            console.error(data.error);
        }
    } catch (error) {
        hideTypingIndicator();
        appendMessage('Erro de conexão. A API está rodando localmente? Certifique-se de executar "python api.py".', 'bot');
        console.error('Erro no fetch:', error);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

sendBtn.addEventListener('click', handleSend);

userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSend();
});

suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        userInput.value = btn.textContent.trim();
        handleSend(); // Auto envia na sugestão
    });
});