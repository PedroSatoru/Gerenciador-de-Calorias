import sqlite3
import json
from datetime import datetime
from contextlib import contextmanager

DB_PATH = "gerenciador_calorias.db"

@contextmanager
def get_db():
    """Context manager para conexão com banco de dados"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Inicializa o banco de dados com as tabelas"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tabela de usuários
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                sexo TEXT,
                peso REAL,
                idade INTEGER,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela de refeições
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS refeicoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                tipo TEXT,
                data_refeicao DATE,
                horario TIME,
                observacao TEXT,
                calorias REAL DEFAULT 0,
                proteina REAL DEFAULT 0,
                carboidrato REAL DEFAULT 0,
                gordura REAL DEFAULT 0,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        ''')
        
        # Tabela de alimentos consumidos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alimentos_consumidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refeicao_id INTEGER NOT NULL,
                nome_alimento TEXT,
                quantidade TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (refeicao_id) REFERENCES refeicoes(id)
            )
        ''')
        
        # Criar índices para melhor performance
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_refeicoes_usuario_id 
            ON refeicoes(usuario_id)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_refeicoes_data 
            ON refeicoes(data_refeicao)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_alimentos_refeicao_id 
            ON alimentos_consumidos(refeicao_id)
        ''')
        
        conn.commit()
        print("✅ Banco de dados inicializado com sucesso!")


def dict_from_row(row):
    """Converte sqlite3.Row para dicionário"""
    if row is None:
        return None
    return dict(row)


def get_usuario_by_email(email: str):
    """Busca usuário por email"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM usuarios WHERE email = ?', (email,))
        return dict_from_row(cursor.fetchone())


def get_usuario_by_id(usuario_id: int):
    """Busca usuário por ID"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_id,))
        return dict_from_row(cursor.fetchone())


def criar_usuario(nome: str, email: str, senha_hash: str, sexo: str = None, peso: float = None, idade: int = None):
    """Cria novo usuário"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO usuarios (nome, email, senha, sexo, peso, idade)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (nome, email, senha_hash, sexo, peso, idade))
        conn.commit()
        return cursor.lastrowid


def criar_refeicao(usuario_id: int, tipo: str, data_refeicao: str, horario: str,
                   calorias: float = 0, proteina: float = 0, carboidrato: float = 0, gordura: float = 0):
    """Cria nova refeição"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO refeicoes (usuario_id, tipo, data_refeicao, horario, calorias, proteina, carboidrato, gordura)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (usuario_id, tipo, data_refeicao, horario, calorias, proteina, carboidrato, gordura))
        conn.commit()
        return cursor.lastrowid


def criar_alimento_consumido(refeicao_id: int, nome_alimento: str, quantidade: str):
    """Cria registro de alimento consumido"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO alimentos_consumidos (refeicao_id, nome_alimento, quantidade)
            VALUES (?, ?, ?)
        ''', (refeicao_id, nome_alimento, quantidade))
        conn.commit()
        return cursor.lastrowid


def get_refeicoes_usuario(usuario_id: int, data: str = None):
    """Busca refeições de um usuário, opcionalmente filtradas por data"""
    with get_db() as conn:
        cursor = conn.cursor()
        if data:
            cursor.execute('''
                SELECT * FROM refeicoes 
                WHERE usuario_id = ? AND data_refeicao = ?
                ORDER BY horario DESC
            ''', (usuario_id, data))
        else:
            cursor.execute('''
                SELECT * FROM refeicoes 
                WHERE usuario_id = ?
                ORDER BY data_refeicao DESC, horario DESC
            ''', (usuario_id,))
        
        return [dict_from_row(row) for row in cursor.fetchall()]


def get_alimentos_refeicao(refeicao_id: int):
    """Busca alimentos de uma refeição"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM alimentos_consumidos 
            WHERE refeicao_id = ?
            ORDER BY id
        ''', (refeicao_id,))
        
        return [dict_from_row(row) for row in cursor.fetchall()]


def deletar_refeicao(refeicao_id: int):
    """Deleta uma refeição e seus alimentos"""
    with get_db() as conn:
        cursor = conn.cursor()
        # First delete alimentos
        cursor.execute('DELETE FROM alimentos_consumidos WHERE refeicao_id = ?', (refeicao_id,))
        # Then delete refeição
        cursor.execute('DELETE FROM refeicoes WHERE id = ?', (refeicao_id,))
        conn.commit()
