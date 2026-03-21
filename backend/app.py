import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from supabase import Client, create_client
from werkzeug.security import check_password_hash, generate_password_hash


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

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Defina SUPABASE_URL e SUPABASE_KEY no arquivo .env.")


app = FastAPI()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


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
        existing_user = (
            supabase.table("usuarios")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if existing_user.data:
            return build_error("Ja existe um usuario com este email.", 409)

        created_user = (
            supabase.table("usuarios")
            .insert(
                {
                    "nome": nome,
                    "email": email,
                    "senha": generate_password_hash(senha),
                    "sexo": sexo,
                    "peso": peso,
                    "idade": idade,
                }
            )
            .execute()
        )

        usuario = created_user.data[0]
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
    except Exception:
        return build_error("Nao foi possivel cadastrar o usuario.", 500)


@app.post("/api/login")
async def login_usuario(data: dict):
    email = normalize_email(data.get("email"))
    senha = data.get("senha") or ""

    if not email or not senha:
        return build_error("Email e senha sao obrigatorios.", 400)

    try:
        response = (
            supabase.table("usuarios")
            .select("id, nome, email, senha")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not response.data:
            return build_error("Email ou senha invalidos.", 401)

        usuario = response.data[0]
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
    except Exception:
        return build_error("Nao foi possivel realizar o login.", 500)

@app.delete("/api/refeicoes/{refeicao_id}")
async def deletar_refeicao_endpoint(refeicao_id: int):
    """
    Deleta uma refeicao informada pelo ID
    """
    if not refeicao_id:
        return build_error("refeicao_id é obrigatório", 400)
    
    try:
        # A função deletar_refeicao já faz a exclusão dos alimentos primeiro
        deletar_refeicao(refeicao_id)
        
        return {
            "success": True,
            "message": "Refeição deletada com sucesso!"
        }
    except Exception as e:
        print(f"Erro ao deletar refeicao {refeicao_id}: {str(e)}")
        return build_error(f"Erro ao deletar refeicao: {str(e)}", 500)


app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)