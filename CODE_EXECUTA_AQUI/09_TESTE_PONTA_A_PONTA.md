# Teste ponta a ponta

Substitua `BASE` e `SECRET` pelos valores reais.

## 1) Saúde

```bash
curl -sS BASE/api/health
```

Esperado: JSON com `"ok": true`.

## 2) Disparar coleta (exemplo)

```bash
curl -sS -X POST BASE/api/collect \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"SECRET\",\"date\":\"2026-04-08\"}"
```

Esperado: `{"status":"started",...}` imediato; a coleta roda em background.

## 3) Status

```bash
curl -sS BASE/api/collect/status
```

Ver `collectorRunning`, `lastResult`, `lastRun`.

## 4) Supabase

No Table Editor:

- `whu_atendimentos_logs` — eventos por atendimento
- `whu_metricas_diarias` — agregado por dia × funcionária × canal

## 5) Frontend

Abrir `BASE/` no browser com `VITE_SUPABASE_*` configurados no build (rebuild após mudar env).

## 6) n8n

Após importar o workflow, executar **manualmente** uma vez e repetir passos 3–4.
