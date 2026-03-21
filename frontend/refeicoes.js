const welcomeTitle = document.getElementById('welcome-title');
const newMealButton = document.getElementById('new-meal-button');
const actionFeedback = document.getElementById('action-feedback');

const usuarioNome = localStorage.getItem('usuarioNome');
const horaAtual = new Date().getHours();

function saudacaoPorHorario(hora) {
    if (hora < 12) {
        return 'Bom dia';
    }

    if (hora < 18) {
        return 'Boa tarde';
    }

    return 'Boa noite';
}

const saudacao = saudacaoPorHorario(horaAtual);

if (usuarioNome) {
    welcomeTitle.textContent = `${saudacao}, ${usuarioNome}. Bem vindo!`;
} else {
    welcomeTitle.textContent = `${saudacao}. Bem vindo!`;
}

newMealButton.addEventListener('click', function () {
    window.location.href = 'alimentos.html';
});
