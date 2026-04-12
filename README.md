# WHU Dashboard

Dashboard de leads (novos + recebidos por transferência) a partir de atendimentos finalizados na API WHU, com métricas no **Supabase**. Stack: **Express + Vite + React**, disparo da coleta via **n8n** (`POST /api/collect`), UI opcional no **Lovable**.

## Pacote “executar até acabar” (igual ao Quality)

**Um arquivo só para Claude Code:** `CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md` (SQL, env, n8n, curls, ordem completa).

Alternativa: `CODE_EXECUTA_AQUI/README.md` + pasta `CODE_EXECUTA_AQUI/` (vários arquivos).

## Pré-requisitos

- Node 20+
- Tabelas no Supabase — execute `supabase/schema.sql` no SQL Editor.

## Configuração

1. Copie `.env.example` para `.env` na raiz do projeto.
2. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHU_CHANNELS_JSON` e `COLLECTOR_SECRET`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (recomendado: políticas RLS só leitura em `whu_metricas_diarias`).

## Comandos

```bash
npm install
npm run dev
```

Abre o app em `http://localhost:3000` (ou próxima porta livre).

- **Produção:** `npm run build` → `npm start`
- **Testes (regras de mensagem):** `npm test`

## API de coleta (n8n)

- `POST /api/collect` — body JSON: `{ "secret": "<COLLECTOR_SECRET>", "date": "2026-04-08" }` (data opcional; default = hoje em America/Sao_Paulo)
- `GET /api/collect/status`
- `POST /api/collect/reset` — body: `{ "secret": "..." }` se a flag travar

## Lovable

Você pode recriar só o front no Lovable apontando para o mesmo Supabase; mantenha este servidor para o coletor ou mova a lógica para uma Edge Function e continue chamando pelo n8n.
