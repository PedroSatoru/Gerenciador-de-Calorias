import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime

# Adiciona o diretório backend ao sys.path para importações relativas
sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from werkzeug.security import check_password_hash, generate_password_hash

# Importa funções do banco de dados SQLite
from database import (
    init_db, get_usuario_by_email, get_usuario_by_id, criar_usuario,
    criar_refeicao, criar_alimento_consumido, get_refeicoes_usuario,
    get_alimentos_refeicao, deletar_refeicao
)


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
ENV_FILE = BASE_DIR / ".env"

# Configuração Google Gemini
GEMINI_API_KEY = "AIzaSyAquHVzFB7DTGw-NcGcO2_VqxYEZPu-qKA"


def load_env_file(file_path: Path):
    if not file_path.exists():
        return

    for raw_line in file_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file(ENV_FILE)

# Inicializa banco de dados SQLite
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_error(message, status_code):
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "message": message},
    )


def normalize_email(value):
    return (value or "").strip().lower()


@app.get("/")
async def home():
    return FileResponse(FRONTEND_DIR / "login.html")


@app.get("/login.html")
async def login_page():
    return FileResponse(FRONTEND_DIR / "login.html")


@app.get("/cadastro.html")
async def cadastro_page():
    return FileResponse(FRONTEND_DIR / "cadastro.html")


@app.get("/refeicoes.html")
async def refeicoes_page():
    return FileResponse(FRONTEND_DIR / "refeicoes.html")


@app.get("/alimentos.html")
async def alimentos_page():
    return FileResponse(FRONTEND_DIR / "alimentos.html")


@app.post("/api/cadastro")
async def cadastro_usuario(data: dict):

    nome = (data.get("nome") or "").strip()
    email = normalize_email(data.get("email"))
    senha = data.get("senha") or ""
    sexo = (data.get("sexo") or "").strip() or None
    peso = data.get("peso")
    idade = data.get("idade")

    if not nome or not email or not senha:
        return build_error("Nome, email e senha sao obrigatorios.", 400)

    try:
        if peso not in (None, ""):
            peso = float(peso)
        else:
            peso = None

        if idade not in (None, ""):
            idade = int(idade)
        else:
            idade = None
    except (TypeError, ValueError):
        return build_error("Peso ou idade em formato invalido.", 400)

    try:
        existing_user = get_usuario_by_email(email)
        if existing_user:
            return build_error("Ja existe um usuario com este email.", 409)

        usuario_id = criar_usuario(
            nome=nome,
            email=email,
            senha_hash=generate_password_hash(senha),
            sexo=sexo,
            peso=peso,
            idade=idade
        )
        
        usuario = get_usuario_by_id(usuario_id)
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Usuario cadastrado com sucesso.",
                "user": {
                    "id": usuario["id"],
                    "nome": usuario["nome"],
                    "email": usuario["email"],
                },
            },
        )
    except Exception as e:
        print(f"Erro ao cadastrar usuário: {str(e)}")
        return build_error("Nao foi possivel cadastrar o usuario.", 500)


@app.post("/api/login")
async def login_usuario(data: dict):
    email = normalize_email(data.get("email"))
    senha = data.get("senha") or ""

    if not email or not senha:
        return build_error("Email e senha sao obrigatorios.", 400)

    try:
        usuario = get_usuario_by_email(email)
        
        if not usuario:
            return build_error("Email ou senha invalidos.", 401)

        if not check_password_hash(usuario["senha"], senha):
            return build_error("Email ou senha invalidos.", 401)

        return {
            "success": True,
            "message": "Login realizado com sucesso.",
            "user": {
                "id": usuario["id"],
                "nome": usuario["nome"],
                "email": usuario["email"],
            },
        }
    except Exception as e:
        print(f"Erro ao fazer login: {str(e)}")
        return build_error("Nao foi possivel realizar o login.", 500)


def analisar_com_gemini(alimentos: list) -> dict:
    """
    Usa Google Gemini REST API para analisar nutricionalmente os alimentos
    Retorna: {calorias, proteina, carboidrato, gordura, alimentos: [{name, macros}]}
    """
    try:
        alimentos_texto = "\n".join([f"- {a['nome']}: {a['quantidade']}" for a in alimentos])
        
        prompt = f"""Você é um nutricionista especializado em cálculo de macronutrientes.

Analise os seguintes alimentos e retorne APENAS um JSON com a análise nutricional total:

{alimentos_texto}

Considere:
- Valores nutricionais por 100g do alimento
- A quantidade informada pelo usuário
- Valores aproximados realistas

Retorne EXATAMENTE neste formato JSON, sem explicações:
{{
    "calorias": 0.0,
    "proteina": 0.0,
    "carboidrato": 0.0,
    "gordura": 0.0,
    "alimentos": [
        {{"nome": "alimento", "calorias": 0.0, "proteina": 0.0, "carboidrato": 0.0, "gordura": 0.0}}
    ]
}}"""
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        
        return None
            
    except Exception as e:
        print(f"Erro ao chamar Gemini: {str(e)}")
        return None


def analisar_refeicao_com_ia(alimentos: list) -> dict:
    """
    Processa alimentos com Gemini e retorna análise nutricional
    """
    analise = analisar_com_gemini(alimentos)
    return analise if analise else {"error": "Falha ao processar com Gemini"}


@app.post("/api/processar-refeicao")
async def processar_refeicao(data: dict):
    """
    Recebe alimentos, processa com IA, salva base de dados e retorna dados nutricionais
    """
    usuario_id = data.get("usuario_id")
    alimentos = data.get("alimentos", [])
    tipo_refeicao = data.get("tipo", "Refeição")
    
    if not usuario_id or not alimentos:
        return build_error("usuario_id e alimentos são obrigatórios", 400)
    
    # Processa com IA
    analise = analisar_refeicao_com_ia(alimentos)
    
    if "error" in analise:
        return build_error(f"Erro ao processar com IA: {analise['error']}", 500)
    
    try:
        # Verifica se usuário existe
        usuario = get_usuario_by_id(usuario_id)
        if not usuario:
            return build_error("Usuário não encontrado", 404)
        
        # Cria registro de refeição com SQLite
        refeicao_id = criar_refeicao(
            usuario_id=usuario_id,
            tipo=tipo_refeicao,
            data_refeicao=datetime.now().date().isoformat(),
            horario=datetime.now().time().isoformat(),
            calorias=analise.get("calorias", 0),
            proteina=analise.get("proteina", 0),
            carboidrato=analise.get("carboidrato", 0),
            gordura=analise.get("gordura", 0)
        )
        
        # Salva alimentos consumidos
        for alimento in alimentos:
            criar_alimento_consumido(
                refeicao_id=refeicao_id,
                nome_alimento=alimento["nome"],
                quantidade=alimento["quantidade"]
            )
        
        return {
            "success": True,
            "message": "Refeição salva com sucesso!",
            "refeicao_id": refeicao_id,
            "analise": analise,
        }
        
    except Exception as e:
        print(f"Erro ao salvar refeição: {str(e)}")
        return build_error(f"Erro ao salvar refeição: {str(e)}", 500)


@app.post("/api/analizar-alimentos")
async def analisar_alimentos(data: dict):
    """
    Apenas retorna a análise nutricional sem salvar no banco
    (útil para preview antes de confirmar)
    """
    alimentos = data.get("alimentos", [])
    
    if not alimentos:
        return build_error("Alimentos são obrigatórios", 400)
    
    analise = analisar_refeicao_com_ia(alimentos)
    
    if "error" in analise:
        return build_error(f"Erro ao processar: {analise['error']}", 500)
    
    return {
        "success": True,
        "analise": analise,
    }


@app.get("/api/refeicoes/dia")
async def get_refeicoes_dia(usuario_id: int):
    """
    Retorna as refeicoes do dia do usuario
    """
    if not usuario_id:
        return build_error("usuario_id é obrigatorio", 400)
    
    try:
        usuario = get_usuario_by_id(usuario_id)
        if not usuario:
            return build_error("Usuario nao encontrado", 404)
        
        data_hoje = datetime.now().date().isoformat()
        refeicoes = get_refeicoes_usuario(usuario_id, data_hoje)
        
        return {
            "success": True,
            "refeicoes": refeicoes,
            "data": data_hoje,
        }
    except Exception as e:
        print(f"Erro ao buscar refeicoes: {str(e)}")
        return build_error(f"Erro ao buscar refeicoes: {str(e)}", 500)


app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)