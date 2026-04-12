-- WHU Dashboard: coluna started_at + views para análise de leads
-- Executar no SQL Editor do Supabase

-- 1) Adicionar coluna started_at (timestamp UTC do início do chat)
ALTER TABLE whu_atendimentos_logs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Índice para queries por hora
CREATE INDEX IF NOT EXISTS idx_logs_started_at ON whu_atendimentos_logs(started_at);

-- 2) View: Heatmap semana × hora (agregado por período)
-- Converte started_at UTC → America/Sao_Paulo
CREATE OR REPLACE VIEW vw_leads_heatmap AS
SELECT
  EXTRACT(DOW FROM started_at AT TIME ZONE 'America/Sao_Paulo')::int AS weekday,  -- 0=dom, 1=seg...6=sab
  EXTRACT(HOUR FROM started_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
  data,
  COUNT(*) AS count
FROM whu_atendimentos_logs
WHERE started_at IS NOT NULL
  AND tipo_evento = 'lead_novo'
GROUP BY weekday, hour, data;

-- RLS para anon
ALTER VIEW vw_leads_heatmap SET (security_invoker = true);

-- 3) View: Totais por dia da semana
CREATE OR REPLACE VIEW vw_leads_weekday AS
SELECT
  EXTRACT(DOW FROM started_at AT TIME ZONE 'America/Sao_Paulo')::int AS weekday,
  data,
  COUNT(*) AS count
FROM whu_atendimentos_logs
WHERE started_at IS NOT NULL
  AND tipo_evento = 'lead_novo'
GROUP BY weekday, data;

ALTER VIEW vw_leads_weekday SET (security_invoker = true);

-- 4) View: Leads por hora de um dia específico
CREATE OR REPLACE VIEW vw_leads_hourly AS
SELECT
  data,
  EXTRACT(HOUR FROM started_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
  COUNT(*) AS count
FROM whu_atendimentos_logs
WHERE started_at IS NOT NULL
  AND tipo_evento = 'lead_novo'
GROUP BY data, hour;

ALTER VIEW vw_leads_hourly SET (security_invoker = true);

-- 5) View: Leads por DDD (extrai DDD do wa_id)
-- wa_id formato: 55DDXXXXXXXXX (ex: 5519987654321 → DDD 19)
CREATE OR REPLACE VIEW vw_leads_by_ddd AS
SELECT
  data,
  CASE
    WHEN wa_id IS NOT NULL AND LENGTH(wa_id) >= 4 AND wa_id ~ '^\d+$'
    THEN SUBSTRING(wa_id FROM 3 FOR 2)
    ELSE 'N/A'
  END AS ddd,
  COUNT(*) AS count
FROM whu_atendimentos_logs
WHERE tipo_evento = 'lead_novo'
GROUP BY data, ddd;

ALTER VIEW vw_leads_by_ddd SET (security_invoker = true);

-- 6) Tabela estática DDD → UF
CREATE TABLE IF NOT EXISTS ddd_uf (
  ddd TEXT PRIMARY KEY,
  uf TEXT NOT NULL,
  regiao TEXT NOT NULL
);

-- Inserir mapeamento DDD→UF (principais)
INSERT INTO ddd_uf (ddd, uf, regiao) VALUES
  ('11','SP','Sudeste'),('12','SP','Sudeste'),('13','SP','Sudeste'),('14','SP','Sudeste'),
  ('15','SP','Sudeste'),('16','SP','Sudeste'),('17','SP','Sudeste'),('18','SP','Sudeste'),('19','SP','Sudeste'),
  ('21','RJ','Sudeste'),('22','RJ','Sudeste'),('24','RJ','Sudeste'),
  ('27','ES','Sudeste'),('28','ES','Sudeste'),
  ('31','MG','Sudeste'),('32','MG','Sudeste'),('33','MG','Sudeste'),('34','MG','Sudeste'),
  ('35','MG','Sudeste'),('37','MG','Sudeste'),('38','MG','Sudeste'),
  ('41','PR','Sul'),('42','PR','Sul'),('43','PR','Sul'),('44','PR','Sul'),('45','PR','Sul'),('46','PR','Sul'),
  ('47','SC','Sul'),('48','SC','Sul'),('49','SC','Sul'),
  ('51','RS','Sul'),('53','RS','Sul'),('54','RS','Sul'),('55','RS','Sul'),
  ('61','DF','Centro-Oeste'),('62','GO','Centro-Oeste'),('63','TO','Norte'),('64','GO','Centro-Oeste'),
  ('65','MT','Centro-Oeste'),('66','MT','Centro-Oeste'),('67','MS','Centro-Oeste'),('68','AC','Norte'),('69','RO','Norte'),
  ('71','BA','Nordeste'),('73','BA','Nordeste'),('74','BA','Nordeste'),('75','BA','Nordeste'),('77','BA','Nordeste'),
  ('79','SE','Nordeste'),
  ('81','PE','Nordeste'),('82','AL','Nordeste'),('83','PB','Nordeste'),('84','RN','Nordeste'),
  ('85','CE','Nordeste'),('86','PI','Nordeste'),('87','PE','Nordeste'),('88','CE','Nordeste'),('89','PI','Nordeste'),
  ('91','PA','Norte'),('92','AM','Norte'),('93','PA','Norte'),('94','PA','Norte'),('95','RR','Norte'),
  ('96','AP','Norte'),('97','AM','Norte'),('98','MA','Nordeste'),('99','MA','Nordeste')
ON CONFLICT (ddd) DO NOTHING;

-- RLS para tabela ddd_uf (leitura pública)
ALTER TABLE ddd_uf ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ddd_uf_select_anon" ON ddd_uf;
CREATE POLICY "ddd_uf_select_anon" ON ddd_uf FOR SELECT TO anon USING (true);

-- 7) RLS nas views: garantir que anon pode ler whu_atendimentos_logs
-- (Se ainda não tiver policy de SELECT para anon)
ALTER TABLE whu_atendimentos_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whu_logs_select_anon" ON whu_atendimentos_logs;
CREATE POLICY "whu_logs_select_anon" ON whu_atendimentos_logs FOR SELECT TO anon USING (true);
