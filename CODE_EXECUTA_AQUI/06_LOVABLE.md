# Lovable — UI oficial de produção

> **A interface oficial em produção do WHU Dashboard é o Lovable.**
> O React no diretório `client/` do repo serve apenas como referência/sync.

## App em produção

- **URL:** https://whu-leads-flow.lovable.app
- **Projeto Lovable:** WHU Dental Insights
- **Editor:** https://lovable.dev/projects/e850d00f-c3a9-4033-a1f8-73dc64952158

## Conexão Supabase

- Conectado via **integração nativa Lovable** (não usa variáveis manuais).
- Organização: `clinicadafamilia.serra@gmail.com`
- Apenas **anon key** no browser + **RLS** no Supabase (`02_SUPABASE_SCHEMA.sql`).
- **Nunca** service role no Lovable nem em variáveis públicas.

## Funcionalidades implementadas

- **Header:** título "WHU Dashboard", subtítulo "Métricas de Atendimento", indicador de última atualização
- **Filtros de período:** Hoje, Ontem, 7 dias (default), Este mês, Personalizado (date range picker)
- **Cards resumo:** Total Leads, Recebidos, Atendidos, Taxa Geral
- **Tabela ordenável:** Funcionária, Leads Novos, Recebidos, Transferidos, Atendidos, Taxa %
- **Linha TOTAL** no rodapé da tabela
- **Ranking Top 10** por atendidos com barras horizontais
- **Estados:** loading skeleton, vazio, erro com retry
- **Badge do coletor:** fetch opcional GET `http://157.245.213.123:3000/api/collect/status` (falha silenciosa)
- Exclui registros com `funcionaria_nome = 'Sem Atendente'`

## Queries (tabela whu_metricas_diarias)

1. **Resumo por funcionária (período):**
   - Filtros: `data` entre `inicio` e `fim`
   - Agrupar por `funcionaria_nome`: somar `lead_novo`, `recebido`, `transferiu`, `atendidos`
   - Excluir `Sem Atendente`

2. **Última atualização:**
   - `order by updated_at desc nulls last limit 1`

## O que NÃO fazer no Lovable

- Chamar a API WHU diretamente (tokens ficam no servidor).
- Disparar `POST /api/collect` (quem dispara é **n8n**).
- Colocar service role ou COLLECTOR_SECRET.
