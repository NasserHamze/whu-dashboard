# Workflow n8n — disparar coleta WHU

## Objetivo

A cada X minutos/horas, chamar o servidor deste repositório em **`POST /api/collect`** para processar chats finalizados e atualizar Supabase.

## Importar

1. No n8n: **Workflows → Import from File**.
2. Escolha `workflow-whu-collect-minimal.json`.
3. Ajuste:
   - Variáveis de ambiente `WHU_DASHBOARD_URL` e `COLLECTOR_SECRET` (ver `../03_N8N_ENV.md`).
   - Se o nó **Schedule** não existir na sua versão, troque por **Cron** ou **Interval** equivalente.

## Montagem manual (se o import falhar)

1. Nó **Schedule Trigger** — a cada 1 hora (ou o intervalo desejado).
2. Nó **HTTP Request**:
   - Method: POST
   - URL: `{{ $env.WHU_DASHBOARD_URL }}/api/collect`
   - Body: JSON
   - JSON: ver exemplo em `../07_FIXTURES/post-collect-body.json`
3. (Opcional) Nó **HTTP Request** GET `{{ $env.WHU_DASHBOARD_URL }}/api/collect/status` em outro branch para monitoramento.

## Teste

Dispare o workflow manualmente uma vez e verifique no servidor `GET /api/collect/status` e no Supabase tabelas `whu_atendimentos_logs` / `whu_metricas_diarias`.
