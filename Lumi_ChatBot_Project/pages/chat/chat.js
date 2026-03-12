const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function handleSend() {
    const text = userInput.value.trim();
    if (text !== '') {
        addMessage(text, 'user');
        userInput.value = '';
        
        setTimeout(() => {
            addMessage(`Recebi sua mensagem: "${text}". Logo a IA de verdade assume!`, 'bot');
        }, 1000);
    }
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSend();
});