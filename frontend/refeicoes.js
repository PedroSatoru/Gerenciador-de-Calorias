const welcomeTitle = document.getElementById('welcome-title');
const newMealButton = document.getElementById('new-meal-button');
const actionFeedback = document.getElementById('action-feedback');
const mealsContainer = document.getElementById('meals-container');
const loadingMessage = document.getElementById('loading-message');
const logoutButton = document.getElementById('logout-button');
const goalButton = document.getElementById('goal-button');

const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
let mealToDeleteId = null;

// Elementos do modal de logout
const logoutModal = document.getElementById('logout-modal');
const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

// Elementos do modal de meta
const goalModal = document.getElementById('goal-modal');
const cancelGoalBtn = document.getElementById('cancel-goal-btn');
const goalOptionBtns = document.querySelectorAll('.goal-option-btn');
const goalFeedback = document.getElementById('goal-feedback');
const changeGoalBtn = document.getElementById('change-goal-btn');

// Elementos do dashboard de meta
const goalSection = document.getElementById('goal-section');
const goalTitle = document.getElementById('goal-title');

const usuarioNome = localStorage.getItem('usuarioNome');
const usuarioId = localStorage.getItem('usuarioId');
const horaAtual = new Date().getHours();

// Meta ativa (carregada do servidor)
let metaAtiva = null;

// Registra eventos ANTES de qualquer redirecionamento
logoutButton.addEventListener('click', function () {
    logoutModal.classList.remove('hidden');
});

cancelLogoutBtn.addEventListener('click', function () {
    logoutModal.classList.add('hidden');
});

confirmLogoutBtn.addEventListener('click', function () {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('usuarioNome');
    localStorage.removeItem('usuarioId');
    window.location.href = 'login.html';
});

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

// === LÓGICA DE METAS ===

const objetivosLabel = {
    'emagrecer': '🔥 Emagrecer',
    'ganhar_massa': '💪 Ganhar Massa',
    'manter_peso': '⚖️ Manter Peso',
    'personalizado': '✏️ Personalizado'
};

// Elementos do formulário personalizado
const customGoalBtn = document.getElementById('custom-goal-btn');
const customGoalForm = document.getElementById('custom-goal-form');
const saveCustomGoalBtn = document.getElementById('save-custom-goal-btn');

function exibirMeta(meta) {
    if (!meta) {
        goalSection.classList.add('hidden');
        return;
    }

    metaAtiva = meta;
    goalSection.classList.remove('hidden');

    const label = objetivosLabel[meta.objetivo] || meta.objetivo;
    goalTitle.textContent = `🎯 Sua Meta Diária — ${label}`;

    document.getElementById('meta-calorias').textContent = Math.round(meta.calorias);
    document.getElementById('meta-proteina').textContent = parseFloat(meta.proteina).toFixed(1);
    document.getElementById('meta-carbo').textContent = parseFloat(meta.carboidrato).toFixed(1);
    document.getElementById('meta-gordura').textContent = parseFloat(meta.gordura).toFixed(1);
}

function atualizarSaldo(totalCalorias, totalProteina, totalCarbo, totalGordura) {
    if (!metaAtiva) {
        document.getElementById('saldo-calorias').textContent = '';
        document.getElementById('saldo-proteina').textContent = '';
        document.getElementById('saldo-carbo').textContent = '';
        document.getElementById('saldo-gordura').textContent = '';
        return;
    }

    function formatarSaldo(el, consumido, meta, unidade) {
        const diff = consumido - meta;
        el.className = 'dashboard-saldo';

        if (diff > 0) {
            el.textContent = `+${diff.toFixed(0)}${unidade} acima`;
            el.classList.add('saldo-negativo');
        } else if (diff < 0) {
            el.textContent = `${Math.abs(diff).toFixed(0)}${unidade} restante`;
            el.classList.add('saldo-positivo');
        } else {
            el.textContent = `Na meta!`;
            el.classList.add('saldo-neutro');
        }
    }

    formatarSaldo(document.getElementById('saldo-calorias'), totalCalorias, metaAtiva.calorias, ' kcal');
    formatarSaldo(document.getElementById('saldo-proteina'), totalProteina, metaAtiva.proteina, 'g');
    formatarSaldo(document.getElementById('saldo-carbo'), totalCarbo, metaAtiva.carboidrato, 'g');
    formatarSaldo(document.getElementById('saldo-gordura'), totalGordura, metaAtiva.gordura, 'g');
}

async function carregarMeta() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/meta', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.meta) {
            exibirMeta(data.meta);
        }
    } catch (error) {
        console.error('Erro ao carregar meta:', error);
    }
}

// Abrir modal de meta
goalButton.addEventListener('click', function () {
    goalFeedback.textContent = '';
    customGoalForm.classList.add('hidden');
    goalModal.classList.remove('hidden');
});

changeGoalBtn.addEventListener('click', function () {
    goalFeedback.textContent = '';
    customGoalForm.classList.add('hidden');
    goalModal.classList.remove('hidden');
});

cancelGoalBtn.addEventListener('click', function () {
    goalModal.classList.add('hidden');
    goalFeedback.textContent = '';
    customGoalForm.classList.add('hidden');
});

// Toggle formulário personalizado
customGoalBtn.addEventListener('click', function () {
    customGoalForm.classList.toggle('hidden');
});

// Salvar meta personalizada
saveCustomGoalBtn.addEventListener('click', async function () {
    const calorias = parseFloat(document.getElementById('custom-calorias').value);
    const proteina = parseFloat(document.getElementById('custom-proteina').value);
    const carboidrato = parseFloat(document.getElementById('custom-carbo').value);
    const gordura = parseFloat(document.getElementById('custom-gordura').value);

    if (isNaN(calorias) || isNaN(proteina) || isNaN(carboidrato) || isNaN(gordura)) {
        goalFeedback.textContent = '❌ Preencha todos os campos com valores válidos.';
        goalFeedback.style.color = '#ef4444';
        return;
    }

    if (calorias <= 0 && proteina <= 0 && carboidrato <= 0 && gordura <= 0) {
        goalFeedback.textContent = '❌ Os valores devem ser maiores que zero.';
        goalFeedback.style.color = '#ef4444';
        return;
    }

    saveCustomGoalBtn.disabled = true;
    saveCustomGoalBtn.textContent = 'Salvando...';
    goalFeedback.textContent = '';

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/meta/manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ calorias, proteina, carboidrato, gordura })
        });

        const data = await response.json();

        if (data.success && data.meta) {
            goalFeedback.textContent = '✅ Meta personalizada salva!';
            goalFeedback.style.color = '#16a34a';

            exibirMeta(data.meta);

            const totalCalorias = parseFloat(document.getElementById('total-calorias').textContent) || 0;
            const totalProteina = parseFloat(document.getElementById('total-proteina').textContent) || 0;
            const totalCarbo = parseFloat(document.getElementById('total-carbo').textContent) || 0;
            const totalGordura = parseFloat(document.getElementById('total-gordura').textContent) || 0;
            atualizarSaldo(totalCalorias, totalProteina, totalCarbo, totalGordura);

            setTimeout(function () {
                goalModal.classList.add('hidden');
                goalFeedback.textContent = '';
                customGoalForm.classList.add('hidden');
            }, 1200);
        } else {
            goalFeedback.textContent = '❌ ' + (data.message || 'Erro ao salvar meta.');
            goalFeedback.style.color = '#ef4444';
        }
    } catch (error) {
        console.error('Erro ao salvar meta personalizada:', error);
        goalFeedback.textContent = '❌ Erro de comunicação.';
        goalFeedback.style.color = '#ef4444';
    } finally {
        saveCustomGoalBtn.disabled = false;
        saveCustomGoalBtn.textContent = 'Salvar Meta Personalizada';
    }
});

// Selecionar objetivo (apenas botões com data-objetivo, ignora o Personalizado)
goalOptionBtns.forEach(function (btn) {
    btn.addEventListener('click', async function () {
        const objetivo = btn.getAttribute('data-objetivo');

        // Ignora o botão Personalizado (não tem data-objetivo)
        if (!objetivo) return;

        // Desabilitar todos os botões
        goalOptionBtns.forEach(function (b) { b.disabled = true; });
        goalFeedback.textContent = '⏳ Calculando suas metas com IA...';
        goalFeedback.style.color = 'var(--cta)';

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/meta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ objetivo: objetivo })
            });

            const data = await response.json();

            if (data.success && data.meta) {
                goalFeedback.textContent = '✅ Meta definida com sucesso!';
                goalFeedback.style.color = '#16a34a';

                exibirMeta(data.meta);

                // Atualiza saldo com os dados atuais do dashboard
                const totalCalorias = parseFloat(document.getElementById('total-calorias').textContent) || 0;
                const totalProteina = parseFloat(document.getElementById('total-proteina').textContent) || 0;
                const totalCarbo = parseFloat(document.getElementById('total-carbo').textContent) || 0;
                const totalGordura = parseFloat(document.getElementById('total-gordura').textContent) || 0;
                atualizarSaldo(totalCalorias, totalProteina, totalCarbo, totalGordura);

                setTimeout(function () {
                    goalModal.classList.add('hidden');
                    goalFeedback.textContent = '';
                }, 1200);
            } else {
                goalFeedback.textContent = '❌ ' + (data.message || 'Erro ao gerar meta.');
                goalFeedback.style.color = '#ef4444';
            }
        } catch (error) {
            console.error('Erro ao definir meta:', error);
            goalFeedback.textContent = '❌ Erro de comunicação.';
            goalFeedback.style.color = '#ef4444';
        } finally {
            goalOptionBtns.forEach(function (b) { b.disabled = false; });
        }
    });
});

// === DASHBOARD DE REFEIÇÕES ===

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

    // Atualiza saldo se houver meta
    atualizarSaldo(totalCalorias, totalProteina, totalCarbo, totalGordura);
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

// Carrega meta e refeicoes ao iniciar a pagina
carregarMeta();
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
