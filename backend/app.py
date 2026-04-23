import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timedelta
import jwt # type: ignore

# Adiciona o diretório backend ao sys.path para importações relativas
sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests # type: ignore
from fastapi import FastAPI, Depends, Header, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import FileResponse, JSONResponse # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
from pydantic import BaseModel # type: ignore
from typing import List, Optional
from werkzeug.security import check_password_hash, generate_password_hash # type: ignore

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
ENV_FILE = BASE_DIR / ".env"



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

# Configuração OpenRouter
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# Configuração JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "chave-secreta-padrao-segura")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

from database import ( # type: ignore
    get_usuario_by_email, get_usuario_by_id, criar_usuario,
    criar_refeicao, criar_alimento_consumido, get_refeicoes_usuario,
    deletar_refeicao, salvar_meta_usuario, get_meta_usuario
)

app = FastAPI(title="API Gerenciador de Calorias", description="API para gerenciamento de refeições e cálculo de macros via IA.")

# --- Modelos Pydantic para o Swagger (/docs) ---
class CadastroRequest(BaseModel):
    nome: str
    email: str
    senha: str
    sexo: Optional[str] = None
    peso: Optional[float] = None
    idade: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    senha: str

class AlimentoItem(BaseModel):
    nome: str
    quantidade: str

class ProcessarRefeicaoRequest(BaseModel):
    usuario_id: int
    tipo: str = "Refeição"
    alimentos: List[AlimentoItem]

class AnalisarAlimentosRequest(BaseModel):
    alimentos: List[AlimentoItem]

class MetaRequest(BaseModel):
    objetivo: str  # "emagrecer", "ganhar_massa", "manter_peso"

class MetaManualRequest(BaseModel):
    calorias: float
    proteina: float
    carboidrato: float
    gordura: float
# -----------------------------------------------

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


def create_access_token(data: dict):
    """Gera um token JWT para o usuário"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(authorization: str = Header(None)):
    """Dependência para verificar o token JWT e retornar o ID do usuário"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autorização ausente")
    
    try:
        # Formato esperado: "Bearer <token>"
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
             raise HTTPException(status_code=401, detail="Formato de token inválido")
             
        token = parts[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido: sub ausente")
            
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        print(f"Erro na verificação do token: {str(e)}")
        raise HTTPException(status_code=401, detail="Não foi possível validar as credenciais")


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

@app.post("/api/cadastro", tags=["Autenticação"])
async def cadastro_usuario(request: CadastroRequest):
    nome = (request.nome or "").strip()
    email = normalize_email(request.email)
    senha = request.senha
    sexo = (request.sexo or "").strip() or None
    peso = request.peso
    idade = request.idade

    if not nome or not email or not senha:
        return build_error("Nome, email e senha sao obrigatorios.", 400)

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
        
        # Gera o token de acesso
        access_token = create_access_token(data={"sub": str(usuario["id"])})
        
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Usuario cadastrado com sucesso.",
                "access_token": access_token,
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


@app.post("/api/login", tags=["Autenticação"])
async def login_usuario(request: LoginRequest):
    email = normalize_email(request.email)
    senha = request.senha

    if not email or not senha:
        return build_error("Email e senha sao obrigatorios.", 400)

    try:
        usuario = get_usuario_by_email(email)
        
        if not usuario:
            return build_error("Email ou senha invalidos.", 401)

        if not check_password_hash(usuario["senha"], senha):
            return build_error("Email ou senha invalidos.", 401)

        # Gera o token de acesso
        access_token = create_access_token(data={"sub": str(usuario["id"])})

        return {
            "success": True,
            "message": "Login realizado com sucesso.",
            "access_token": access_token,
            "user": {
                "id": usuario["id"],
                "nome": usuario["nome"],
                "email": usuario["email"],
            },
        }
    except Exception as e:
        print(f"Erro ao fazer login: {str(e)}")
        return build_error("Nao foi possivel realizar o login.", 500)


def analisar_com_openrouter(alimentos: list) -> dict:
    """
    Usa OpenRouter API para analisar nutricionalmente os alimentos (modelo Gemini 2.5 Flash via OpenRouter)
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

Retorne EXATAMENTE neste formato JSON, calcule os valores corretamente e não use números zerados como padrão:
{{
    "calorias": 150.5,
    "proteina": 10.2,
    "carboidrato": 5.5,
    "gordura": 2.1,
    "alimentos": [
        {{"nome": "alimento X", "calorias": 150.5, "proteina": 10.2, "carboidrato": 5.5, "gordura": 2.1}}
    ]
}}"""
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:8000",
            "X-Title": "Gerenciador Calorias"
        }
        
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        
        return {}
            
    except Exception as e:
        print(f"Erro ao chamar OpenRouter: {str(e)}")
        return {}


def analisar_refeicao_com_ia(alimentos: list) -> dict:
    """
    Processa alimentos com IA e retorna análise nutricional
    """
    analise = analisar_com_openrouter(alimentos)
    if not analise or not isinstance(analise, dict) or "calorias" not in analise:
        return {"error": "Falha ao processar com IA ou formato inválido"}
    return analise


@app.post("/api/processar-refeicao", tags=["Refeições"])
async def processar_refeicao(request: ProcessarRefeicaoRequest, user_id: int = Depends(get_current_user)):
    """
    Recebe alimentos, processa com IA, salva banco de dados e retorna dados nutricionais
    """
    # Usamos o user_id vindo do token em vez do enviado no body para maior segurança
    usuario_id = user_id
    alimentos = [{"nome": item.nome, "quantidade": item.quantidade} for item in request.alimentos]
    tipo_refeicao = request.tipo
    
    if not usuario_id or not alimentos:
        return build_error("usuario_id e alimentos são obrigatórios", 400)
        
    analise = analisar_refeicao_com_ia(alimentos)
    
    if "error" in analise:
        return build_error(f"Erro ao processar com IA: {analise['error']}", 500)
    
    try:
        # Verifica se usuário existe
        usuario = get_usuario_by_id(usuario_id)
        if not usuario:
            return build_error("Usuário não encontrado", 404)
            
        # Cria registro de refeição
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

@app.get("/api/refeicoes/dia", tags=["Refeições"])
async def get_refeicoes_dia(user_id: int = Depends(get_current_user)):
    try:
        usuario_id = user_id
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
        print(f"Erro buscar refeicoes: {str(e)}")
        return build_error(f"Erro ao buscar refeicoes: {str(e)}", 500)

@app.delete("/api/refeicoes/{refeicao_id}", tags=["Refeições"])
async def deletar_refeicao_endpoint(refeicao_id: int, user_id: int = Depends(get_current_user)):
    if not refeicao_id:
        return build_error("refeicao_id é obrigatório", 400)
    try:
        deletar_refeicao(refeicao_id)
        return {"success": True, "message": "Refeição deletada"}
    except Exception as e:
        print(f"Erro deletar: {str(e)}")
        return build_error(f"Erro ao deletar refeicao: {str(e)}", 500)


@app.post("/api/analizar-alimentos", tags=["Refeições"])
async def analisar_alimentos(request: AnalisarAlimentosRequest):
    """
    Apenas retorna a análise nutricional sem salvar no banco
    (útil para preview antes de confirmar)
    """
    alimentos = [{"nome": item.nome, "quantidade": item.quantidade} for item in request.alimentos]
    
    if not alimentos:
        return build_error("Alimentos são obrigatórios", 400)
    
    analise = analisar_refeicao_com_ia(alimentos)
    
    if "error" in analise:
        return build_error(f"Erro ao processar: {analise['error']}", 500)
    
    return {
        "success": True,
        "analise": analise,
    }


def gerar_meta_com_openrouter(sexo: str, idade: int, peso: float, objetivo: str) -> dict:
    """
    Usa OpenRouter API para gerar metas nutricionais diárias
    baseadas no perfil do usuário e objetivo escolhido.
    """
    objetivos_texto = {
        "emagrecer": "perder peso / emagrecer com déficit calórico saudável",
        "ganhar_massa": "ganhar massa muscular com superávit calórico controlado",
        "manter_peso": "manter o peso atual com equilíbrio calórico"
    }
    objetivo_desc = objetivos_texto.get(objetivo, objetivo)

    try:
        prompt = f"""Você é um nutricionista esportivo especializado em planejamento alimentar.

Baseado no perfil abaixo, calcule as metas nutricionais DIÁRIAS ideais para o objetivo informado:

- Sexo: {sexo or 'não informado'}
- Idade: {idade or 'não informada'} anos
- Peso: {peso or 'não informado'} kg
- Objetivo: {objetivo_desc}

Considere:
- Taxa metabólica basal (TMB) usando fórmula de Harris-Benedict
- Fator de atividade moderada (1.55)
- Ajuste calórico baseado no objetivo (déficit para emagrecer, superávit para ganhar massa)
- Distribuição adequada de macronutrientes para o objetivo

Retorne EXATAMENTE neste formato JSON, com valores numéricos realistas:
{{
    "calorias": 2000,
    "proteina": 150.0,
    "carboidrato": 200.0,
    "gordura": 65.0
}}"""

        url = "https://openrouter.ai/api/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:8000",
            "X-Title": "Gerenciador Calorias"
        }

        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        response = requests.post(url, headers=headers, json=payload, timeout=20)

        if response.status_code == 200:
            data = response.json()
            response_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                if "calorias" in result:
                    return result

        return {}

    except Exception as e:
        print(f"Erro ao gerar meta com OpenRouter: {str(e)}")
        return {}


@app.post("/api/meta", tags=["Metas"])
async def criar_meta(request: MetaRequest, user_id: int = Depends(get_current_user)):
    """
    Gera metas nutricionais com IA baseado no perfil do usuário e objetivo escolhido.
    """
    objetivo = request.objetivo
    objetivos_validos = ["emagrecer", "ganhar_massa", "manter_peso"]

    if objetivo not in objetivos_validos:
        return build_error(f"Objetivo inválido. Use: {', '.join(objetivos_validos)}", 400)

    try:
        usuario = get_usuario_by_id(user_id)
        if not usuario:
            return build_error("Usuário não encontrado", 404)

        meta = gerar_meta_com_openrouter(
            sexo=usuario.get("sexo"),
            idade=usuario.get("idade"),
            peso=usuario.get("peso"),
            objetivo=objetivo
        )

        if not meta or "calorias" not in meta:
            return build_error("Falha ao gerar metas com IA", 500)

        meta_id = salvar_meta_usuario(
            usuario_id=user_id,
            objetivo=objetivo,
            calorias=meta.get("calorias", 0),
            proteina=meta.get("proteina", 0),
            carboidrato=meta.get("carboidrato", 0),
            gordura=meta.get("gordura", 0)
        )

        return {
            "success": True,
            "message": "Meta gerada com sucesso!",
            "meta": {
                "id": meta_id,
                "objetivo": objetivo,
                "calorias": meta.get("calorias", 0),
                "proteina": meta.get("proteina", 0),
                "carboidrato": meta.get("carboidrato", 0),
                "gordura": meta.get("gordura", 0)
            }
        }

    except Exception as e:
        print(f"Erro ao criar meta: {str(e)}")
        return build_error(f"Erro ao criar meta: {str(e)}", 500)


@app.get("/api/meta", tags=["Metas"])
async def buscar_meta(user_id: int = Depends(get_current_user)):
    """
    Retorna a meta ativa do usuário logado.
    """
    try:
        meta = get_meta_usuario(user_id)
        if not meta:
            return {"success": True, "meta": None}

        return {
            "success": True,
            "meta": meta
        }
    except Exception as e:
        print(f"Erro ao buscar meta: {str(e)}")
        return build_error(f"Erro ao buscar meta: {str(e)}", 500)


@app.post("/api/meta/manual", tags=["Metas"])
async def criar_meta_manual(request: MetaManualRequest, user_id: int = Depends(get_current_user)):
    """
    Salva metas nutricionais definidas manualmente pelo usuário (sem IA).
    """
    try:
        meta_id = salvar_meta_usuario(
            usuario_id=user_id,
            objetivo="personalizado",
            calorias=request.calorias,
            proteina=request.proteina,
            carboidrato=request.carboidrato,
            gordura=request.gordura
        )

        return {
            "success": True,
            "message": "Meta salva com sucesso!",
            "meta": {
                "id": meta_id,
                "objetivo": "personalizado",
                "calorias": request.calorias,
                "proteina": request.proteina,
                "carboidrato": request.carboidrato,
                "gordura": request.gordura
            }
        }
    except Exception as e:
        print(f"Erro ao salvar meta manual: {str(e)}")
        return build_error(f"Erro ao salvar meta manual: {str(e)}", 500)


app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")


if __name__ == "__main__":
    import uvicorn # type: ignore

    uvicorn.run(app, host="127.0.0.1", port=8000)