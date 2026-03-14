CREATE TABLE IF NOT EXISTS refeicoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo VARCHAR(50),
    data_refeicao DATE,
    horario TIME,
    observacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_refeicoes_usuario_id ON refeicoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refeicoes_data ON refeicoes(data_refeicao);