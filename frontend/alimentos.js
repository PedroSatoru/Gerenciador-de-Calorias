let alimentoCounter = 1;

// Elemento do botão para adicionar alimentos
const btnAdicionar = document.getElementById('btn-adicionar');
const alimentosLista = document.getElementById('alimentos-lista');
const alimentosForm = document.getElementById('alimentos-form');
const mensagemDiv = document.getElementById('alimentos-message');

/**
 * Adiciona um novo campo de alimento
 */
function adicionarAlimento() {
    const novoId = alimentoCounter++;

    const novoAlimento = document.createElement('div');
    novoAlimento.className = 'alimento-item';
    novoAlimento.id = `alimento-${novoId}`;

    novoAlimento.innerHTML = `
        <div class="item-number">${alimentoCounter}</div>
        <div class="input-group">
            <label for="alimento-nome-${novoId}">Nome do Alimento</label>
            <input 
                type="text" 
                id="alimento-nome-${novoId}" 
                name="alimento-nome" 
                class="alimento-nome" 
                placeholder="Ex: Arroz integral" 
                required
            >
        </div>
        <div class="input-group">
            <label for="alimento-quantidade-${novoId}">Quantidade</label>
            <input 
                type="text" 
                id="alimento-quantidade-${novoId}" 
                name="alimento-quantidade" 
                class="alimento-quantidade" 
                placeholder="Ex: 150g, 1 copo" 
                required
            >
        </div>
        <button type="button" class="btn-remover" aria-label="Remover alimento">×</button>
    `;

    // Adiciona listener para o botão remover
    const btnRemover = novoAlimento.querySelector('.btn-remover');
    btnRemover.addEventListener('click', (e) => {
        e.preventDefault();
        removerAlimento(novoId);
    });

    alimentosLista.appendChild(novoAlimento);

    // Foca no primeiro input do novo alimento
    document.getElementById(`alimento-nome-${novoId}`).focus();

    // Atualiza os números dos itens
    atualizarNumeros();
}

/**
 * Remove um alimento da lista
 */
function removerAlimento(id) {
    const alimento = document.getElementById(`alimento-${id}`);

    // Verifica se há apenas um alimento
    const totalAlimentos = document.querySelectorAll('.alimento-item').length;
    if (totalAlimentos <= 1) {
        exibirMensagem('Você precisa de pelo menos um alimento!', 'error');
        return;
    }

    alimento.remove();
    atualizarNumeros();
}

/**
 * Atualiza os números de ordem dos alimentos
 */
function atualizarNumeros() {
    const alimentos = document.querySelectorAll('.alimento-item');
    alimentos.forEach((alimento, index) => {
        const itemNumber = alimento.querySelector('.item-number');
        itemNumber.textContent = index + 1;
    });
}

/**
 * Exibe mensagem de feedback
 */
function exibirMensagem(texto, tipo) {
    mensagemDiv.textContent = texto;
    mensagemDiv.className = `alimentos-message ${tipo}`;

    if (tipo === 'success') {
        setTimeout(() => {
            mensagemDiv.classList.remove('success');
        }, 3000);
    }
}

/**
 * Coleta os dados dos alimentos do formulário
 */
function coletarDados() {
    const alimentos = [];
    const nomes = document.querySelectorAll('.alimento-nome');
    const quantidades = document.querySelectorAll('.alimento-quantidade');

    for (let i = 0; i < nomes.length; i++) {
        alimentos.push({
            nome: nomes[i].value.trim(),
            quantidade: quantidades[i].value.trim()
        });
    }

    return alimentos;
}

/**
 * Valida os dados dos alimentos
 */
function validarDados(alimentos) {
    // Verifica se há alimentos vazios
    for (let alimento of alimentos) {
        if (!alimento.nome || !alimento.quantidade) {
            return { valido: false, erro: 'Preencha todos os campos!' };
        }
    }

    // Verifica se há alimentos duplicados
    const nomes = alimentos.map(a => a.nome.toLowerCase());
    const nomesDuplicados = nomes.filter((nome, index) => nomes.indexOf(nome) !== index);

    if (nomesDuplicados.length > 0) {
        return {
            valido: false,
            erro: `Alimento duplicado: ${nomesDuplicados[0]}`
        };
    }

    return { valido: true };
}

/**
 * Envia os dados para o servidor e processa a resposta
 */
async function enviarDados(alimentos) {
    try {
        exibirMensagem('Processando alimentos com IA...', 'info');

        // Recupera usuario_id do localStorage
        const usuarioId = localStorage.getItem('usuarioId');
        if (!usuarioId) {
            exibirMensagem('Erro: Usuário não autenticado. Faça login novamente.', 'error');
            return;
        }

        // Envia para o backend processar
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/processar-refeicao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                usuario_id: parseInt(usuarioId),
                alimentos: alimentos,
                tipo: 'Refeição'
            })
        });

        const result = await response.json();

        if (!result.success) {
            exibirMensagem(`Erro: ${result.message || 'Falha ao processar'}`, 'error');
            return;
        }

        // Exibe sucesso e informações nutricionais
        const analise = result.analise;
        const resumo = `
            Refeição salva com sucesso!
            Calorias: ${analise.calorias} kcal | 
            Proteína: ${analise.proteina}g | 
            Carbs: ${analise.carboidrato}g | 
            Gordura: ${analise.gordura}g
        `;
        exibirMensagem(resumo, 'success');

        // Armazena a análise da última refeição
        localStorage.setItem('ultimaRefeicao', JSON.stringify(result));

        // Limpa o formulário após 3 segundos
        setTimeout(() => {
            alimentosForm.reset();
            alimentoCounter = 1;
            alimentosLista.innerHTML = `
                <div class="alimento-item" id="alimento-0">
                    <div class="item-number">1</div>
                    <div class="input-group">
                        <label for="alimento-nome-0">Nome do Alimento</label>
                        <input 
                            type="text" 
                            id="alimento-nome-0" 
                            name="alimento-nome" 
                            class="alimento-nome" 
                            placeholder="Ex: Arroz integral" 
                            required
                        >
                    </div>
                    <div class="input-group">
                        <label for="alimento-quantidade-0">Quantidade</label>
                        <input 
                            type="text" 
                            id="alimento-quantidade-0" 
                            name="alimento-quantidade" 
                            class="alimento-quantidade" 
                            placeholder="Ex: 150g, 1 copo" 
                            required
                        >
                    </div>
                    <button type="button" class="btn-remover" aria-label="Remover alimento">×</button>
                </div>
            `;
            configurarListeners();

            // Redireciona para tela de refeições
            setTimeout(() => {
                window.location.href = 'refeicoes.html';
            }, 2000);
        }, 3000);

    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        exibirMensagem('Erro ao salvar refeição. Verifique a conexão.', 'error');
    }
}

/**
 * Configura os listeners dos botões
 */
function configurarListeners() {
    // Botão adicionar
    btnAdicionar.addEventListener('click', (e) => {
        e.preventDefault();
        adicionarAlimento();
    });

    // Botão remover de cada alimento
    document.querySelectorAll('.btn-remover').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const itemId = e.target.closest('.alimento-item').id.split('-')[1];
            removerAlimento(itemId);
        });
    });

    // Formulário submit
    alimentosForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const alimentos = coletarDados();
        const validacao = validarDados(alimentos);

        if (!validacao.valido) {
            exibirMensagem(validacao.erro, 'error');
            return;
        }

        enviarDados(alimentos);
    });

    // Permite pressionar Enter para adicionar novo alimento
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            adicionarAlimento();
        }
    });
}

// Inicializa quando o DOM está carregado
document.addEventListener('DOMContentLoaded', () => {
    // Proteção de rota simplificada no frontend
    if (!localStorage.getItem('accessToken')) {
        window.location.href = 'login.html';
        return;
    }

    configurarListeners();

    // Foca no primeiro campo
    document.getElementById('alimento-nome-0').focus();
});
