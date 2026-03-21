const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const loginApiBaseUrl = ''; // Caminho relativo para facilitar a hospedagem

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

        if (result.user && result.user.nome) {
            localStorage.setItem('usuarioNome', result.user.nome);
            localStorage.setItem('usuarioId', result.user.id);
            if (result.access_token) {
                localStorage.setItem('accessToken', result.access_token);
            }
        }

        loginMessage.style.color = '#2f6044';
        loginMessage.textContent = result.message;

        window.setTimeout(function () {
            window.location.href = 'refeicoes.html';
        }, 600);
    } catch (error) {
        loginMessage.style.color = '#e74c3c';
        loginMessage.textContent = error.message || 'Erro ao conectar com a API.';
    } finally {
        submitButton.disabled = false;
    }
});
