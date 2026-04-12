-- WHU Dashboard — tabelas esperadas pelo coletor e pelo frontend.
-- Rode no SQL Editor do Supabase (ou migrações).

CREATE TABLE IF NOT EXISTS whu_atendimentos_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id TEXT NOT NULL,
  wa_id TEXT,
  canal TEXT,
  funcionaria_nome TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT whu_logs_unique_event UNIQUE (attendance_id, funcionaria_nome, tipo_evento)
);

CREATE INDEX IF NOT EXISTS idx_logs_data ON whu_atendimentos_logs(data);
CREATE INDEX IF NOT EXISTS idx_logs_func ON whu_atendimentos_logs(funcionaria_nome);

CREATE TABLE IF NOT EXISTS whu_metricas_diarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  funcionaria_nome TEXT NOT NULL,
  funcionaria_id TEXT DEFAULT '',
  canal TEXT NOT NULL DEFAULT '',
  lead_novo INTEGER DEFAULT 0,
  recebido INTEGER DEFAULT 0,
  transferiu INTEGER DEFAULT 0,
  atendidos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT whu_metricas_unique UNIQUE (data, funcionaria_nome, canal)
);

CREATE INDEX IF NOT EXISTS idx_metricas_data ON whu_metricas_diarias(data);

-- RLS: front (anon) só lê métricas agregadas — ver também CODE_EXECUTA_AQUI/02_SUPABASE_SCHEMA.sql
ALTER TABLE whu_metricas_diarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whu_metricas_select_anon" ON whu_metricas_diarias;
CREATE POLICY "whu_metricas_select_anon"
  ON whu_metricas_diarias
  FOR SELECT
  TO anon
  USING (true);
