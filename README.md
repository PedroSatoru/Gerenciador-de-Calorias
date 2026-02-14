# Gerenciador de Calorias
Site desenvolvido para controle de refeições, macro nutrientes e calorias

## Time:
- PO: Hugo Nomura
- SM: Pedro Satoru 
- DEVs: Vitor Vianna e Pedro Correia


## Casos de Uso:
### **UC01 - Autenticação e Gestão de Perfil**

| **Caso de Uso** | Autenticação e Gestão de Perfil |
| :--- | :--- |
| **Atores** | Usuários |
| **Descrição** | O usuário realiza o cadastro de uma conta ou login para garantir que seu histórico de refeições e dados de saúde sejam privados.  |
| **Pré-condições** | O usuário deve acessar a plataforma via navegador web.  |
| **Permissões** | - **Usuário Autenticado**: pode gerenciar suas próprias refeições e visualizar histórico.<br>- **Visitante**: possui acesso apenas às telas de cadastro e login. |
| **Fluxo Principal** | 1. O usuário acessa o site.<br>2. Seleciona a opção de “Cadastro” ou “Login”.<br>3. Insere e-mail e senha.<br>4. O sistema valida as credenciais.<br>5. O sistema redireciona o usuário para o seu Dashboard pessoal. |
| **Fluxos Alternativos** | A. E-mail já cadastrado: O sistema solicita login ou recuperação de senha.<br>B. Credenciais inválidas: O sistema exibe erro e permite nova tentativa. |
| **Pós-condições** | O usuário está autenticado e pronto para registrar sua alimentação. |

---

### **UC02 - Cadastro de Refeição via Texto**

| **Caso de Uso** | Cadastro de Refeição via Texto |
| :--- | :--- |
| **Atores** | Usuário |
| **Descrição** | O usuário informa os alimentos consumidos e a quantidade para que o sistema processe e armazene as informações nutricionais via IA.  |
| **Pré-condições** | O usuário deve estar autenticado no sistema.  |
| **Permissões** | - **Usuário Autenticado**: pode realizar entradas de dados no sistema.  |
| **Fluxo Principal** | 1. O usuário acessa a funcionalidade de cadastro de refeição.<br>2. Digita a refeição (ex: “frango: 200g, batata doce: 100g”).<br>3. O sistema envia os dados para o agente de IA.<br>4. A IA realiza a análise automática de calorias e macronutrientes (carboidratos, proteínas e gorduras). <br>5. O sistema exibe o resultado para validação do usuário.<br>6. O sistema salva os dados no histórico.  |
| **Fluxos Alternativos** | A. Formato de texto inválido: O sistema solicita correção no padrão de entrada.<br>B. Falha na IA: O sistema permite entrada manual ou pede nova tentativa. |
| **Pós-condições** | A refeição é salva com sucesso vinculada ao perfil do usuário. |

---

### **UC03 - Visualização de Histórico e Totais Diários**

| **Caso de Uso** | Visualização de Histórico e Totais Diários |
| :--- | :--- |
| **Atores** | Usuários|
| **Descrição** | O sistema apresenta o acompanhamento da evolução alimentar através de listas de macronutrientes e histórico temporal. |
| **Pré-condições** | O usuário deve estar autenticado e ter refeições cadastradas.  |
| **Permissões** | - **Usuário Autenticado**: acesso apenas ao seu próprio histórico alimentar e controle nutricional.  |
| **Fluxo Principal** | 1. O usuário acessa o Dashboard principal.<br>2. O sistema consulta o banco de dados nutricional. <br>3. O sistema calcula a soma total de calorias e macros consumidos no dia. <br>4. O sistema exibe o progresso em relação aos objetivos de saúde. <br>5. O sistema lista cronologicamente as refeições realizadas.  |
| **Fluxos Alternativos** | A. Sem dados no período: O sistema exibe uma mensagem de incentivo ao cadastro. |
| **Pós-condições** | O usuário visualiza o impacto da alimentação em seus objetivos.  |

---

### **UC04 - Remoção de Refeições Lançadas**

| **Caso de Uso** | Remoção de Refeições Lançadas |
| :--- | :--- |
| **Atores** | Usuário |
| **Descrição** | Permite ao usuário remover refeições do seu histórico diário para manter o controle preciso.  |
| **Pré-condições** | O usuário deve estar autenticado e visualizar a lista de refeições. |
| **Permissões** | - **Usuário Autenticado**: pode excluir apenas registros do seu próprio perfil.  |
| **Fluxo Principal** | 1. O usuário acessa a lista de refeições do dia.<br>2. Seleciona o item que deseja remover.<br>3. Confirma a exclusão do registro.<br>4. O sistema remove o item do banco de dados.<br>5. O sistema atualiza o cálculo automático de calorias totais.  |
| **Fluxos Alternativos** | A. Desistência: O usuário cancela a ação e o registro permanece salvo. |
| **Pós-condições** | O registro é removido e os totais diários são corrigidos.  |

## Jira:

### Link do Jira: [Board](https://gerenciador-de-calorias.atlassian.net/jira/core/projects/GDC/board?filter=&groupBy=status)
<img width="1005" height="890" alt="image" src="https://github.com/user-attachments/assets/ca694a65-8f4c-4ad6-8778-98a0d5e84951" />
