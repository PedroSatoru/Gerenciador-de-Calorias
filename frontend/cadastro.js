const cadastroForm = document.getElementById('cadastro-form');
const cadastroMessage = document.getElementById('cadastro-message');
const cadastroApiBaseUrl = 'http://127.0.0.1:8000';

cadastroForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const submitButton = cadastroForm.querySelector('button[type="submit"]');
    const payload = {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim(),
        senha: document.getElementById('senha').value,
        sexo: document.getElementById('sexo').value,
        idade: document.getElementById('idade').value,
        peso: document.getElementById('peso').value
    };

    cadastroMessage.style.color = '#385444';
    cadastroMessage.textContent = 'Cadastrando...';
    submitButton.disabled = true;

    try {
        const response = await fetch(`${cadastroApiBaseUrl}/api/cadastro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Nao foi possivel cadastrar o usuario.');
        }

        cadastroMessage.style.color = '#2f6044';
        cadastroMessage.textContent = result.message;
        cadastroForm.reset();

        window.setTimeout(function () {
            window.location.href = 'login.html';
        }, 1200);
    } catch (error) {
        cadastroMessage.style.color = '#b23b3b';
        cadastroMessage.textContent = error.message || 'Erro ao conectar com a API.';
    } finally {
        submitButton.disabled = false;
    }
});