const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const loginApiBaseUrl = 'http://127.0.0.1:8000';

loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    loginMessage.style.color = '#555';
    loginMessage.textContent = 'Entrando...';
    submitButton.disabled = true;

    try {
        const response = await fetch(`${loginApiBaseUrl}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Nao foi possivel realizar o login.');
        }

        loginMessage.style.color = '#2f6044';
        loginMessage.textContent = result.message;
    } catch (error) {
        loginMessage.style.color = '#e74c3c';
        loginMessage.textContent = error.message || 'Erro ao conectar com a API.';
    } finally {
        submitButton.disabled = false;
    }
});
