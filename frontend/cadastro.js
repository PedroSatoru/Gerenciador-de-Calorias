const cadastroForm = document.getElementById('cadastro-form');
const cadastroMessage = document.getElementById('cadastro-message');
<<<<<<< HEAD
const cadastroApiBaseUrl = ''; // Caminho relativo
=======
const cadastroApiBaseUrl = 'http://127.0.0.1:8080';
>>>>>>> origin/feature/vitor

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

        if (result.user && result.user.nome) {
            localStorage.setItem('usuarioNome', result.user.nome);
            localStorage.setItem('usuarioId', result.user.id);
            if (result.access_token) {
                localStorage.setItem('accessToken', result.access_token);
            }
        }

        cadastroMessage.style.color = '#2f6044';
        cadastroMessage.textContent = result.message;
        cadastroForm.reset();

        window.setTimeout(function () {
            window.location.href = 'refeicoes.html'; // Vai direto para as refeições após cadastrar
        }, 1200);
    } catch (error) {
        cadastroMessage.style.color = '#b23b3b';
        cadastroMessage.textContent = error.message || 'Erro ao conectar com a API.';
    } finally {
        submitButton.disabled = false;
    }
});