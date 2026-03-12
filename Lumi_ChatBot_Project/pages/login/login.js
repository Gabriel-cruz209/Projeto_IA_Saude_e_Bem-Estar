document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede a página de recarregar
    
    // REDIRECIONA para a página do chat!
    window.location.href = '../chat/chat.html'; 
});