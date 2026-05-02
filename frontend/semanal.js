// Redireciona se não estiver logado
if (!localStorage.getItem('accessToken')) {
    window.location.href = 'login.html';
}

const emptyState = document.getElementById('empty-state');
const metricsContainer = document.getElementById('metrics-container');

// Instâncias dos gráficos para podermos destruí-los ao recarregar
let caloriesChart = null;
let goalsChart = null;
let macrosChart = null;

async function carregarDadosSemanais() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/refeicoes/grafico-semanal', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.dados_dias) {
            
            if (data.resumo.dias_com_registro === 0) {
                // Se não há dados, mostra o empty state e esconde os gráficos
                emptyState.classList.remove('hidden');
                metricsContainer.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                metricsContainer.classList.remove('hidden');
                
                atualizarResumos(data.resumo);
                renderizarGraficos(data);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados semanais:', error);
    }
}

function atualizarResumos(resumo) {
    document.getElementById('media-calorias').textContent = resumo.media_calorias;
    document.getElementById('dias-meta').textContent = resumo.dias_meta_atingida;
    document.getElementById('dias-registro').textContent = resumo.dias_com_registro;
}

function formatarDataBR(dataIso) {
    const partes = dataIso.split('-');
    return `${partes[2]}/${partes[1]}`;
}

function renderizarGraficos(data) {
    const dados = data.dados_dias;
    const labels = dados.map(d => formatarDataBR(d.data));

    // ==========================================
    // 1. Gráfico de Barras (Calorias vs Meta)
    // ==========================================
    const ctxCalorias = document.getElementById('caloriesChart').getContext('2d');
    const caloriasValores = dados.map(d => d.calorias);
    
    let datasetsCalorias = [{
        label: 'Calorias Consumidas',
        data: caloriasValores,
        backgroundColor: 'rgba(99, 102, 241, 0.8)', // Indigo
        borderRadius: 4
    }];

    if (data.resumo.meta_atual > 0) {
        datasetsCalorias.push({
            label: 'Meta Diária',
            data: dados.map(() => data.resumo.meta_atual),
            type: 'line',
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            borderDash: [5, 5]
        });
    }

    if (caloriesChart) caloriesChart.destroy();
    caloriesChart = new Chart(ctxCalorias, {
        type: 'bar',
        data: { labels, datasets: datasetsCalorias },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // ==========================================
    // 2. Gráfico de Pizza (Doughnut - Alcance de Metas)
    // ==========================================
    const ctxGoals = document.getElementById('goalsChart').getContext('2d');
    
    // Contamos os dias com registro que atingiram e que não atingiram a meta
    let diasAtingidos = 0;
    let diasNaoAtingidos = 0;
    
    dados.forEach(d => {
        if (d.calorias > 0) {
            if (d.atingiu_meta) diasAtingidos++;
            else diasNaoAtingidos++;
        }
    });

    if (goalsChart) goalsChart.destroy();
    goalsChart = new Chart(ctxGoals, {
        type: 'doughnut',
        data: {
            labels: ['Meta Atingida', 'Fora da Meta'],
            datasets: [{
                data: [diasAtingidos, diasNaoAtingidos],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)', // Verde
                    'rgba(244, 63, 94, 0.8)'   // Vermelho
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '65%' // Deixa o buraco no meio
        }
    });

    // ==========================================
    // 3. Gráfico de Linhas (Evolução de Macros)
    // ==========================================
    const ctxMacros = document.getElementById('macrosChart').getContext('2d');
    const proteinaValores = dados.map(d => d.proteina);
    const carboValores = dados.map(d => d.carboidrato);
    const gorduraValores = dados.map(d => d.gordura);

    if (macrosChart) macrosChart.destroy();
    macrosChart = new Chart(ctxMacros, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Proteína (g)',
                    data: proteinaValores,
                    borderColor: 'rgba(244, 63, 94, 1)',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3 // Curva suave
                },
                {
                    label: 'Carboidrato (g)',
                    data: carboValores,
                    borderColor: 'rgba(234, 179, 8, 1)',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Gordura (g)',
                    data: gorduraValores,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Inicializa a página
carregarDadosSemanais();
