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
);

CREATE INDEX IF NOT EXISTS idx_refeicoes_usuario_id ON refeicoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refeicoes_data ON refeicoes(data_refeicao);
