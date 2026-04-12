# Lovable — mesmo esquema do pacote Quality

## Princípios

- **Anon key** no browser + **RLS** no Supabase (`02_SUPABASE_SCHEMA.sql` já cria policy de `SELECT` em `whu_metricas_diarias` para `anon`).
- **Nunca** service role no Lovable nem em variáveis públicas.

## Variáveis de ambiente (Vite / Lovable)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Queries mínimas

1. **Resumo por funcionária (período)** — agregar no client ou via view no Postgres:
   - Fonte: `whu_metricas_diarias`
   - Filtros: `data` entre `inicio` e `fim`
   - Agrupar por `funcionaria_nome`: somar `lead_novo`, `recebido`, `atendidos`

2. **Última atualização** — `order by updated_at desc nulls last, created_at desc limit 1` em `whu_metricas_diarias`

## O que não fazer no Lovable

- Chamar a API WHU diretamente (tokens ficam no servidor).
- Disparar coleta sem autenticação forte: quem dispara coleta é **n8n → POST /api/collect** com secret.

## Se quiser só o dashboard do repo

O `whu-dashboard` já inclui UI em React; Lovable é opcional para iterar visual rápido replicando as mesmas queries.
