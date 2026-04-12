# Log de integração — SISTEMA COMPLETO

**Data:** 2026-04-12
**Executor:** Claude Code (Opus)

## Ambiente PRODUCAO

- **BASE URL (coletor):** http://157.245.213.123:3000
- **Health:** http://157.245.213.123:3000/api/health
- **Collect:** POST http://157.245.213.123:3000/api/collect (body: `{"secret":"<secret configurado>"}`)
- **Backfill (byStartDate explícito):** POST http://157.245.213.123:3000/api/collect/backfill — body JSON: `secret`, `startDate`, `endDate` (`YYYY-MM-DD`). Chama `collectIncremental` direto (útil para reprocessar meses sem depender só do lookback do `/api/collect`).
- **Servidor:** DigitalOcean Droplet (1 vCPU, 1GB RAM, NYC3, Ubuntu 24.04)
- **Node:** v20.20.2 + PM2 6.0.14
- **GitHub:** github.com/NasserHamze/whu-dashboard
- **Supabase:** https://ypvtjtnugzblangsmnmm.supabase.co (SQL aplicado, RLS OK)
- **n8n:** workflow "WHU Dashboard - Collect Hourly" publicado e ativo (https://nasserhamze.app.n8n.cloud/workflow/olr7JIennvtXnQ2U)
- **Lovable (UI produção):** https://whu-leads-flow.lovable.app (projeto "WHU Dental Insights", Supabase conectado via integração nativa)
- **Lovable editor:** https://lovable.dev/projects/e850d00f-c3a9-4033-a1f8-73dc64952158

## Testes em producao

- [x] GET /api/health → {"ok":true,"service":"whu-dashboard"}
- [x] POST /api/collect → {"status":"started","message":"Coleta iniciada para 2026-04-12..."}
- [x] PM2 rodando e configurado pra startup automatico
- [x] n8n workflow publicado, execucao manual OK (status:started, coleta 2026-04-12)
- [x] Lovable publicado, carregando dados reais do Supabase (filtros, tabela, ranking, cards)
- [ ] HTTPS (sem dominio ainda — funciona via IP HTTP por enquanto)

## Como testar

```
# Backend/coletor
curl http://157.245.213.123:3000/api/health
curl -X POST http://157.245.213.123:3000/api/collect -H "Content-Type: application/json" -d '{"secret":"<secret configurado>"}'
curl -X POST http://157.245.213.123:3000/api/collect/backfill -H "Content-Type: application/json" -d '{"secret":"<secret configurado>","startDate":"2026-03-01","endDate":"2026-03-31"}'
curl http://157.245.213.123:3000/api/collect/status

# Frontend (Lovable)
# Abrir https://whu-leads-flow.lovable.app no navegador
# Verificar: cards com totais, tabela com funcionárias, ranking Top 10, filtros de período
```

## Coleta WHU — janela (lookback)

- Variável **`WHU_COLLECT_LOOKBACK_DAYS`** no `.env` do servidor (ver `.env.example`). Default **120** dias.
- No **`POST /api/collect`**, o dia alvo (`date` ou hoje SP) é o **fim** da janela; o **início** é esse dia menos `WHU_COLLECT_LOOKBACK_DAYS`. A API `chats/list-lite` usa **`byStartDate`** nesse intervalo. Chats cujo início fica **fora** da janela não aparecem na lista (por isso lookback curto perdia dados).
- Logs PM2 passam a mostrar por **canal** quantos chats a `list-lite` retornou no intervalo, mais linha `collectDay(...): lookback=Nd`.
- **Dedup intra-batch** antes do `upsert` em `whu_atendimentos_logs` evita erro PostgreSQL quando a mesma chave de conflito repetia no mesmo batch.

## Lovable (pendência de produto)

- Ajustar **Taxa %** (alinhar ao React: participação no total, ou remover coluna) e confirmar **paginação** em `whu_metricas_diarias` (máx. 1000 linhas por request no Supabase). Feito no editor Lovable, não neste repo.

## Pendencias

1. ~~**n8n:** relogar, abrir workflow, trocar URL, publicar~~ — CONCLUIDO 2026-04-12
2. ~~**Lovable:** criar dashboard, conectar Supabase, publicar~~ — CONCLUIDO 2026-04-12
3. **Dominio + HTTPS:** apontar subdominio (ex: whu.clinicaparafamilia.com.br) pro IP 157.245.213.123, instalar Nginx + certbot
4. **Seguranca:** rotacionar COLLECTOR_SECRET

## SSH pra manutenção

```
ssh -i ~/.ssh/id_do_deploy root@157.245.213.123
cd /opt/whu-dashboard
pm2 logs whu-dashboard
pm2 restart whu-dashboard
```
