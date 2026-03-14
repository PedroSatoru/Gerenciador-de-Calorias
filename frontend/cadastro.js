document.getElementById('cadastro-form').addEventListener('submit', function (event) {
    event.preventDefault();

    document.getElementById('cadastro-message').textContent = 'Cadastro pronto para integrar com a API em Python.';
});