const welcomeTitle = document.getElementById('welcome-title');
const newMealButton = document.getElementById('new-meal-button');
const actionFeedback = document.getElementById('action-feedback');
const mealsContainer = document.getElementById('meals-container');
const loadingMessage = document.getElementById('loading-message');

const usuarioNome = localStorage.getItem('usuarioNome');
const usuarioId = localStorage.getItem('usuarioId');
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

// Carrega as refeicoes do dia
async function carregarRefeicoesDodia() {
    if (!usuarioId) {
        loadingMessage.textContent = 'Erro: Usuario nao identificado. Por favor, faca login novamente.';
        return;
    }

    try {
        const response = await fetch(`/api/refeicoes/dia?usuario_id=${usuarioId}`);
        const data = await response.json();

        if (!data.success) {
            mealsContainer.innerHTML = '<p class="empty-state">Nenhuma refeicao registrada hoje.</p>';
            return;
        }

        const refeicoes = data.refeicoes || [];

        if (refeicoes.length === 0) {
            mealsContainer.innerHTML = '<p class="empty-state">Nenhuma refeicao registrada hoje.</p>';
            return;
        }

        mealsContainer.innerHTML = '';

        refeicoes.forEach(refeicao => {
            const card = document.createElement('div');
            card.className = 'meal-card';
            
            const horario = refeicao.horario ? refeicao.horario.substring(0, 5) : 'N/A';
            const tipo = refeicao.tipo || 'Refeicao';
            const calorias = (refeicao.calorias || 0).toFixed(1);
            const proteina = (refeicao.proteina || 0).toFixed(1);
            const carboidrato = (refeicao.carboidrato || 0).toFixed(1);
            const gordura = (refeicao.gordura || 0).toFixed(1);
            
            card.innerHTML = `
                <div class="meal-header">
                    <div class="meal-info">
                        <p class="meal-type">${tipo}</p>
                        <p class="meal-time">Horario: ${horario}</p>
                    </div>
                    <div class="meal-calories">⚡ ${calorias} kcal</div>
                </div>
                <div class="meal-macros">
                    <span class="macro">🥩 ${proteina}g Proteina</span>
                    <span class="macro">🥕 ${carboidrato}g Carbo</span>
                    <span class="macro">🫒 ${gordura}g Gordura</span>
                </div>
            `;
            
            mealsContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao carregar refeicoes:', error);
        mealsContainer.innerHTML = '<p class="empty-state">Erro ao carregar refeicoes.</p>';
    }
}

// Carrega refeicoes ao iniciar a pagina
carregarRefeicoesDodia();
