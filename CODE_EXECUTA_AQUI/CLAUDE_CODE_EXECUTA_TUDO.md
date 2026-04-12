# WHU Dashboard — ANEXO TÉCNICO para o Claude Code

**Fluxo “meio a meio” (igual clinica-ai):** na **fase 1**, o Cursor só entrega checklist (`00_PORTAO_CHECKLIST_CURSOR.md`). Depois que o humano confirmar chaves, na **fase 2** colar no Claude Code o **`01_PROMPT_MESTRE_CLAUDE_CODE.md`** — este arquivo é o **anexo** com SQL, `.env`, workflow, curls e ordem detalhada.

**Atalho (legado):** ainda é possível colar **este arquivo inteiro** no Code e mandar executar; o conteúdo técnico abaixo continua válido.

**Repositório:** pasta raiz do projeto = `whu-dashboard/` (onde está `package.json`).

**Stack:** Supabase + servidor Node (coletor) + n8n (só dispara `POST /api/collect`) + Lovable opcional.

---

## Missão

1. Aplicar SQL no Supabase (abaixo).
2. Configurar `.env` na raiz `whu-dashboard/` (nunca commitar secrets reais).
3. Rodar `npm install`, `npm run check`, `npm test`, `npm run build`.
4. Garantir deploy ou instruções claras: URL HTTPS pública com `GET /api/health` e `POST /api/collect`.
5. Documentar variáveis do n8n e colar/importar o workflow JSON (abaixo).
6. Testar com curl (abaixo).
7. Preencher o bloco **LOG FINAL** no fim deste arquivo.

---

## MODO BYPASS

- Não parar por decisões triviais de implementação.
- **Só** pedir humano se: não há acesso ao Supabase; não há URL pública HTTPS para o servidor; ou operação **DROP** destrutiva em produção sem confirmação.
- Ao terminar: **um resumo** — o que foi feito, onde ficam os secrets, como validar.

---

## Ordem obrigatória de execução

| # | Ação |
|---|------|
| 1 | SQL Editor Supabase → rodar o script **SQL completo** da seção abaixo |
| 2 | Criar/copiar `.env` na raiz `whu-dashboard/` conforme **template .env** abaixo |
| 3 | Terminal na raiz: `npm install` → `npm run check` → `npm test` → `npm run build` |
| 4 | Deploy do servidor (Render/Fly/Railway/VPS) ou `npm start` local com `NODE_ENV=production` para teste |
| 5 | n8n: variáveis `WHU_DASHBOARD_URL` + `COLLECTOR_SECRET`; importar workflow JSON abaixo |
| 6 | curl: health + collect + status (seção testes) |
| 7 | Opcional Lovable: mesmas `VITE_SUPABASE_*` + só leitura (anon + RLS já no SQL) |

---

## O que o humano precisa ter (checklist)

Marque mentalmente o que já existe antes de falhar:

- [ ] Supabase: URL, **service role** (só servidor), **anon** (só front)
- [ ] Tokens WHU por canal → string JSON `WHU_CHANNELS_JSON` no **servidor apenas**
- [ ] `COLLECTOR_SECRET` forte (mesmo valor no n8n no body do POST)
- [ ] Hospedagem com **HTTPS** para o n8n Cloud alcançar `POST /api/collect`

---

## SQL completo — colar no Supabase SQL Editor

```sql
-- WHU Dashboard — schema + RLS para leitura segura no front (anon)

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

ALTER TABLE whu_metricas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whu_metricas_select_anon" ON whu_metricas_diarias;
CREATE POLICY "whu_metricas_select_anon"
  ON whu_metricas_diarias
  FOR SELECT
  TO anon
  USING (true);
```

Se já existirem tabelas com dados, fazer backup antes e resolver conflitos de constraint manualmente.

---

## Template `.env` (raiz `whu-dashboard/`)

Copiar de `.env.example` se existir; conteúdo esperado:

```env
PORT=3000
NODE_ENV=development

COLLECTOR_SECRET=change-me-in-production

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

WHU_BASE_URL=https://api.wescctech.com.br/core/v2/api
WHU_CHANNELS_JSON={"NOME_CANAL_EXEMPLO":"token_access_aqui"}

VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=
```

**Regras:** service role só no servidor; anon no front; `WHU_CHANNELS_JSON` só no servidor, nunca no n8n nem no Git.

---

## Variáveis no n8n Cloud

| Nome | Valor |
|------|--------|
| `WHU_DASHBOARD_URL` | Base URL **sem** barra final, ex. `https://app.onrender.com` |
| `COLLECTOR_SECRET` | Igual ao `COLLECTOR_SECRET` do servidor |

**Não** colocar `SUPABASE_SERVICE_ROLE_KEY` nem tokens WHU no n8n.

---

## Workflow n8n — JSON para importar

Salvar como `workflow-whu-collect.json` e importar no n8n, **ou** criar manualmente: Schedule (1h) → HTTP POST.

```json
{
  "name": "WHU Dashboard — POST /api/collect",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 1 }]
        }
      },
      "id": "schedule",
      "name": "Every Hour",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [240, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.WHU_DASHBOARD_URL }}/api/collect",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ secret: $env.COLLECTOR_SECRET }) }}",
        "options": {}
      },
      "id": "http-collect",
      "name": "Collect WHU",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [480, 300]
    }
  ],
  "connections": {
    "Every Hour": {
      "main": [[{ "node": "Collect WHU", "type": "main", "index": 0 }]]
    }
  },
  "meta": {
    "nota": "Se scheduleTrigger não existir, usar Cron. Se $env no jsonBody falhar, usar body fixo só em dev ou Credentials."
  }
}
```

Body opcional com data fixa:

```json
{ "secret": "<COLLECTOR_SECRET>", "date": "2026-04-08" }
```

Sem `date`, o servidor usa o dia corrente (America/Sao_Paulo).

---

## Comandos do projeto (raiz `whu-dashboard/`)

```bash
npm install
npm run check
npm run test
npm run build
npm start
```

- **Dev:** `npm run dev` (API + Vite juntos).
- **Produção:** `npm run build` gera `dist/server.js` + `dist/public`; `npm start` sobe o servidor.

---

## Endpoints da API

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/api/health` | Sanidade |
| POST | `/api/collect` | Body JSON `{ "secret", "date?" }` — roda coleta em background |
| GET | `/api/collect/status` | Última execução / se está rodando |
| POST | `/api/collect/reset` | Body `{ "secret" }` — destrava flag |

---

## Testes com curl (substituir BASE e SECRET)

```bash
curl -sS BASE/api/health

curl -sS -X POST BASE/api/collect \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"SECRET\"}"

curl -sS BASE/api/collect/status
```

Validar no Supabase: tabelas `whu_atendimentos_logs` e `whu_metricas_diarias`.

---

## Lovable (opcional)

- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- Ler só `whu_metricas_diarias` (RLS já permite `SELECT` para `anon`)
- Não expor service role

---

## Código-fonte importante

- Coletor: `server/whu-collector.ts`
- Servidor: `server/index.ts`

---

## LOG FINAL (preencher ao terminar)

```
Data:
Deploy URL (BASE):
Supabase URL (sem keys):
n8n workflow importado (sim/não):
Testes curl OK (sim/não):
Pendências:
```

---

## Frase única para colar no Claude Code (fluxo novo)

```
Chaves ok. Execute o prompt em CODE_EXECUTA_AQUI/01_PROMPT_MESTRE_CLAUDE_CODE.md e use este arquivo (CLAUDE_CODE_EXECUTA_TUDO.md) como anexo técnico na ordem das seções; MODO BYPASS; preencha LOG FINAL; um RELATÓRIO FINAL no formato do prompt mestre.
```

## Frase única (atalho legado — arquivo único)

```
Abra whu-dashboard/CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md e execute TODAS as seções na ordem; use MODO BYPASS; preencha LOG FINAL; um resumo ao humano no fim.
```
