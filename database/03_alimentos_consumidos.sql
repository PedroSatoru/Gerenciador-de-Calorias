CREATE TABLE IF NOT EXISTS alimentos_consumidos (
    id SERIAL PRIMARY KEY,
    refeicao_id INTEGER REFERENCES refeicoes(id),
    nome_alimento VARCHAR(200),
    quantidade VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_alimentos_refeicao_id ON alimentos_consumidos(refeicao_id);
