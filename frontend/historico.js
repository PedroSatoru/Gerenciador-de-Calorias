const historicoContainer = document.getElementById('historico-container');
const filterForm = document.getElementById('filter-form');
const dataInicioInput = document.getElementById('data-inicio');
const dataFimInput = document.getElementById('data-fim');
const periodTitle = document.getElementById('period-title');
const clearFilterBtn = document.getElementById('clear-filter-button');
const actionFeedback = document.getElementById('action-feedback');

const usuarioId = localStorage.getItem('usuarioId');

if (!localStorage.getItem('accessToken')) {
    window.location.href = 'login.html';
}

function formatDateToBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function renderHistorico(refeicoes, dataInicioStr, dataFimStr) {
    historicoContainer.innerHTML = '';

    if (dataInicioStr && dataFimStr) {
        periodTitle.textContent = `Período: ${formatDateToBR(dataInicioStr)} a ${formatDateToBR(dataFimStr)}`;
    } else {
        periodTitle.textContent = `Semana Atual`;
    }

    if (!refeicoes || refeicoes.length === 0) {
        historicoContainer.innerHTML = `
            <div class="empty-history">
                <p>Nenhuma refeição registrada neste período.</p>
            </div>
        `;
        return;
    }

    // Agrupar refeições por data
    const grouped = {};
    refeicoes.forEach(ref => {
        const data = ref.data_refeicao;
        if (!grouped[data]) {
            grouped[data] = [];
        }
        grouped[data].push(ref);
    });

    // Criar seções por dia
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(dataStr => {
        const dayRefeicoes = grouped[dataStr];

        let totalCal = 0, totalProt = 0, totalCarbo = 0, totalGord = 0;
        dayRefeicoes.forEach(r => {
            totalCal += r.calorias || 0;
            totalProt += r.proteina || 0;
            totalCarbo += r.carboidrato || 0;
            totalGord += r.gordura || 0;
        });

        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';

        const dataFormatada = formatDateToBR(dataStr);

        dayGroup.innerHTML = `
            <div class="day-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 1rem;">
                <h3 class="day-title" style="font-size: 1.6rem; color: var(--text-main); margin: 0;">${dataFormatada}</h3>
            </div>
            <div class="dashboard" style="margin-bottom: 1.5rem;">
                <div class="dashboard-card" style="border: 1px solid rgba(15, 118, 110, 0.25);">
                    <div class="dashboard-label">Calorias</div>
                    <div class="dashboard-value" style="font-size: 1.5rem;">${totalCal.toFixed(0)}</div>
                    <div class="dashboard-unit">kcal</div>
                </div>
                <div class="dashboard-card" style="border: 1px solid rgba(15, 118, 110, 0.25);">
                    <div class="dashboard-label">Proteína</div>
                    <div class="dashboard-value" style="font-size: 1.5rem;">${totalProt.toFixed(1)}</div>
                    <div class="dashboard-unit">g</div>
                </div>
                <div class="dashboard-card" style="border: 1px solid rgba(15, 118, 110, 0.25);">
                    <div class="dashboard-label">Carboidrato</div>
                    <div class="dashboard-value" style="font-size: 1.5rem;">${totalCarbo.toFixed(1)}</div>
                    <div class="dashboard-unit">g</div>
                </div>
                <div class="dashboard-card" style="border: 1px solid rgba(15, 118, 110, 0.25);">
                    <div class="dashboard-label">Gordura</div>
                    <div class="dashboard-value" style="font-size: 1.5rem;">${totalGord.toFixed(1)}</div>
                    <div class="dashboard-unit">g</div>
                </div>
            </div>
            <div class="day-meals meals-container"></div>
        `;

        const dayMealsContainer = dayGroup.querySelector('.day-meals');

        dayRefeicoes.forEach(refeicao => {
            const card = document.createElement('div');
            card.className = 'meal-card';

            const horario = refeicao.horario ? refeicao.horario.substring(0, 5) : 'N/A';
            const tipo = refeicao.tipo || 'Refeição';
            const calorias = (refeicao.calorias || 0).toFixed(1);
            const proteina = (refeicao.proteina || 0).toFixed(1);
            const carboidrato = (refeicao.carboidrato || 0).toFixed(1);
            const gordura = (refeicao.gordura || 0).toFixed(1);

            card.innerHTML = `
                <div class="meal-header">
                    <div class="meal-info">
                        <p class="meal-type">${tipo}</p>
                        <p class="meal-time">Horário: ${horario}</p>
                    </div>
                    <div class="meal-calories">⚡ ${calorias} kcal</div>
                </div>
                <div class="meal-macros">
                    <span class="macro">🥩 ${proteina}g Proteína</span>
                    <span class="macro">🥕 ${carboidrato}g Carbo</span>
                    <span class="macro">🫒 ${gordura}g Gordura</span>
                </div>
            `;
            dayMealsContainer.appendChild(card);
        });

        historicoContainer.appendChild(dayGroup);
    });
}

async function fetchHistorico(dataInicio = null, dataFim = null) {
    historicoContainer.innerHTML = '<p class="loading-message">Carregando histórico...</p>';
    actionFeedback.textContent = '';

    try {
        const token = localStorage.getItem('accessToken');
        let url = `/api/refeicoes/historico`;

        if (dataInicio && dataFim) {
            url += `?data_inicio=${dataInicio}&data_fim=${dataFim}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            renderHistorico(data.refeicoes, data.data_inicio, data.data_fim);

            // Preencher os inputs com as datas recebidas se estiverem vazios
            if (!dataInicioInput.value && data.data_inicio) {
                dataInicioInput.value = data.data_inicio;
            }
            if (!dataFimInput.value && data.data_fim) {
                dataFimInput.value = data.data_fim;
            }

        } else {
            actionFeedback.textContent = 'Erro ao carregar histórico: ' + data.message;
            historicoContainer.innerHTML = '<p class="empty-state">Falha ao carregar os dados.</p>';
        }

    } catch (error) {
        console.error('Erro na busca de histórico:', error);
        actionFeedback.textContent = 'Erro de comunicação ao buscar histórico.';
        historicoContainer.innerHTML = '<p class="empty-state">Erro de comunicação.</p>';
    }
}

filterForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const dInicio = dataInicioInput.value;
    const dFim = dataFimInput.value;

    if (dInicio && dFim) {
        if (dInicio > dFim) {
            actionFeedback.textContent = 'A data inicial não pode ser maior que a final.';
            return;
        }
        fetchHistorico(dInicio, dFim);
    } else {
        actionFeedback.textContent = 'Preencha ambas as datas para filtrar.';
    }
});

clearFilterBtn.addEventListener('click', function() {
    dataInicioInput.value = '';
    dataFimInput.value = '';
    fetchHistorico();
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchHistorico();
});