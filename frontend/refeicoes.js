const welcomeTitle = document.getElementById('welcome-title');
const newMealButton = document.getElementById('new-meal-button');
const actionFeedback = document.getElementById('action-feedback');
const mealsContainer = document.getElementById('meals-container');
const loadingMessage = document.getElementById('loading-message');

const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
let mealToDeleteId = null;

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

if (!localStorage.getItem('accessToken')) {
    window.location.href = 'login.html';
}

if (usuarioNome) {
    welcomeTitle.textContent = `Olá, ${usuarioNome}! 👋`;
} else {
    welcomeTitle.textContent = `Olá! 👋`;
}

newMealButton.addEventListener('click', function () {
    window.location.href = 'alimentos.html';
});

// Atualiza o dashboard com os totais
function atualizarDashboard(refeicoes) {
    let totalCalorias = 0;
    let totalProteina = 0;
    let totalCarbo = 0;
    let totalGordura = 0;

    refeicoes.forEach(refeicao => {
        totalCalorias += refeicao.calorias || 0;
        totalProteina += refeicao.proteina || 0;
        totalCarbo += refeicao.carboidrato || 0;
        totalGordura += refeicao.gordura || 0;
    });

    document.getElementById('total-calorias').textContent = totalCalorias.toFixed(0);
    document.getElementById('total-refeicoes').textContent = refeicoes.length;
    document.getElementById('total-proteina').textContent = totalProteina.toFixed(1);
    document.getElementById('total-carbo').textContent = totalCarbo.toFixed(1);
    document.getElementById('total-gordura').textContent = totalGordura.toFixed(1);
}

// Carrega as refeicoes do dia
async function carregarRefeicoesDodia() {
    if (!usuarioId) {
        loadingMessage.textContent = 'Erro: Usuario nao identificado. Por favor, faca login novamente.';
        return;
    }

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/refeicoes/dia?usuario_id=${usuarioId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (!data.success) {
            mealsContainer.innerHTML = '<p class="empty-state">Nenhuma refeicao registrada hoje.</p>';
            atualizarDashboard([]);
            return;
        }

        const refeicoes = data.refeicoes || [];

        if (refeicoes.length === 0) {
            mealsContainer.innerHTML = '<p class="empty-state">Nenhuma refeicao registrada hoje.</p>';
            atualizarDashboard([]);
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
                    <div style="display: flex; align-items: center;">
                        <div class="meal-calories">⚡ ${calorias} kcal</div>
                        <button class="delete-meal-btn" data-id="${refeicao.id}" title="Deletar refeição">🗑️</button>
                    </div>
                </div>
                <div class="meal-macros">
                    <span class="macro">🥩 ${proteina}g Proteina</span>
                    <span class="macro">🥕 ${carboidrato}g Carbo</span>
                    <span class="macro">🫒 ${gordura}g Gordura</span>
                </div>
            `;

            mealsContainer.appendChild(card);
        });

        // Atualiza o dashboard com os totais
        atualizarDashboard(refeicoes);

    } catch (error) {
        console.error('Erro ao carregar refeicoes:', error);
        mealsContainer.innerHTML = '<p class="empty-state">Erro ao carregar refeicoes.</p>';
    }
}

// Funcao para refresh manual das refeicoes
async function refreshRefeicoes() {
    await carregarRefeicoesDodia();
}

// Carrega refeicoes ao iniciar a pagina
carregarRefeicoesDodia();

// Verifica a cada 2 segundos se há novas refeições (útil após cadastro)
const checkInterval = setInterval(() => {
    // Aproveita se o localStorage tem ultimaRefeicao
    const ultimaRefeicao = localStorage.getItem('ultimaRefeicao');
    if (ultimaRefeicao) {
        localStorage.removeItem('ultimaRefeicao');
        refreshRefeicoes();
        clearInterval(checkInterval);
    }
}, 2000);

// Lógica de Deletar Refeição
mealsContainer.addEventListener('click', function (e) {
    const btn = e.target.closest('.delete-meal-btn');
    if (btn) {
        mealToDeleteId = btn.getAttribute('data-id');
        deleteModal.classList.remove('hidden');
    }
});

cancelDeleteBtn.addEventListener('click', function () {
    deleteModal.classList.add('hidden');
    mealToDeleteId = null;
});

confirmDeleteBtn.addEventListener('click', async function () {
    if (!mealToDeleteId) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deletando...';

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/refeicoes/${mealToDeleteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            deleteModal.classList.add('hidden');
            mealToDeleteId = null;
            await carregarRefeicoesDodia(); // Recarrega a tela
        } else {
            alert('Erro ao deletar: ' + (data.message || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error('Erro ao deletar refeicao:', error);
        alert('Erro de comunicação ao deletar a refeição.');
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Sim';
    }
});
