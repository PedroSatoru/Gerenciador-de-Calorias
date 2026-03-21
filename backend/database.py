import os
from typing import List, Dict, Any, Optional
from supabase import create_client, Client # type: ignore

# Puxa credenciais de forma segura (antes injetadas pelo app.py)
url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# Cliente global do Supabase
supabase: Client = create_client(url, key)


def get_usuario_by_email(email: str):
    """Busca usuário por email via API Supabase"""
    response = supabase.table('usuarios').select("*").eq("email", email).execute()
    if response.data:
        return response.data[0]
    return None


def get_usuario_by_id(usuario_id: int):
    """Busca usuário por ID via API Supabase"""
    response = supabase.table('usuarios').select("*").eq("id", usuario_id).execute()
    if response.data:
        return response.data[0]
    return None


def criar_usuario(nome: str, email: str, senha_hash: str, sexo: Optional[str] = None, peso: Optional[float] = None, idade: Optional[int] = None):
    """Cria novo usuário no Supabase e retorna seu ID"""
    data = {
        "nome": nome,
        "email": email,
        "senha": senha_hash,
        "sexo": sexo,
        "peso": peso,
        "idade": idade
    }
    response = supabase.table('usuarios').insert(data).execute()
    if response.data:
        return response.data[0]["id"]
    return None


def criar_refeicao(usuario_id: int, tipo: str, data_refeicao: str, horario: str,
                   calorias: float = 0, proteina: float = 0, carboidrato: float = 0, gordura: float = 0):
    """Cria nova refeição associada ao usuário no Supabase e retorna o ID"""
    data = {
        "usuario_id": usuario_id,
        "tipo": tipo,
        "data_refeicao": data_refeicao,
        "horario": horario,
        "calorias": calorias,
        "proteina": proteina,
        "carboidrato": carboidrato,
        "gordura": gordura
    }
    response = supabase.table('refeicoes').insert(data).execute()
    if response.data:
        return response.data[0]["id"]
    return None


def criar_alimento_consumido(refeicao_id: int, nome_alimento: str, quantidade: str):
    """Cria registro de alimento consumido associado a uma refeição"""
    data = {
        "refeicao_id": refeicao_id,
        "nome_alimento": nome_alimento,
        "quantidade": quantidade
    }
    response = supabase.table('alimentos_consumidos').insert(data).execute()
    if response.data:
        return response.data[0]["id"]
    return None


def get_refeicoes_usuario(usuario_id: int, data: Optional[str] = None):
    """Busca refeições de um usuário, opcionalmente filtradas por data, e as retorna ordenadas"""
    query = supabase.table('refeicoes').select("*").eq("usuario_id", usuario_id)
    if data:
        query = query.eq("data_refeicao", data)
    
    response = query.order("horario", desc=True).execute()
    return response.data


def get_alimentos_refeicao(refeicao_id: int):
    """Busca os itens/alimentos inseridos dentro de certa refeição"""
    response = supabase.table('alimentos_consumidos').select("*").eq("refeicao_id", refeicao_id).order("id").execute()
    return response.data


def deletar_refeicao(refeicao_id: int):
    """Deleta uma refeição e seus vínculos"""
    # Em Postgres configurado com ON DELETE CASCADE, deletar a refeição já excluiria os itens. 
    # Mando deleta os items separadamente por precaução para evitar falhas no caso do banco não ter cascade
    supabase.table('alimentos_consumidos').delete().eq("refeicao_id", refeicao_id).execute()
    supabase.table('refeicoes').delete().eq("id", refeicao_id).execute()
