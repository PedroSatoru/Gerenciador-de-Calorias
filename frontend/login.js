// login.js
// Por enquanto, só previne o submit e mostra mensagem de placeholder

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    document.getElementById('login-message').textContent = 'Funcionalidade de login será implementada em breve!';
});
