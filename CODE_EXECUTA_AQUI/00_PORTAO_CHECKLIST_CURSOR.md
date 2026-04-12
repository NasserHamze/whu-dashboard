# Fase 1 — Portão (só Cursor): planejamento + checklist

**Objetivo:** o assistente no **Cursor** entrega **apenas** isto na primeira resposta, antes de qualquer “executa tudo no Code”.

O humano preenche credenciais nos painéis / `.env` e confirma. **Só então** seguir para `01_PROMPT_MESTRE_CLAUDE_CODE.md`.

---

## Resumo do produto (para o Cursor colar na resposta)

O **WHU Dashboard** coleta dados da API WHU (canais configurados no servidor), grava em **Supabase** (`whu_atendimentos_logs`, `whu_metricas_diarias`) e expõe API Node (`GET /api/health`, `POST /api/collect`, status). O **n8n** apenas dispara `POST /api/collect` em horário, com `COLLECTOR_SECRET` — **sem** tokens WHU no n8n.

---

## CHECKLIST DE CHAVES E ACESSOS

| Variável / acesso | Onde obter | Onde colocar | Obrig. |
|-------------------|------------|--------------|--------|
| `SUPABASE_URL` | Painel Supabase → Settings → API | `.env` raiz do repo; deploy do servidor; secrets Lovable se usar | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Mesmo painel (service_role) | **Só** servidor / `.env` local — **nunca** front, n8n nem Git | Sim |
| `VITE_SUPABASE_URL` | Igual à URL do projeto | `.env` e build front / Lovable | Sim* |
| `VITE_SUPABASE_ANON_KEY` | Painel → anon public | `.env` e Lovable — leitura com RLS | Sim* |
| `WHU_BASE_URL` | Documentação WHU / padrão no `.env.example` | `.env` servidor | Se diferente do default |
| `WHU_CHANNELS_JSON` | Tokens por canal (WHU) | **Só** `.env` do servidor / env do deploy | Sim |
| `COLLECTOR_SECRET` | Gerar string longa aleatória | `.env` servidor **e** variável no n8n (body do POST) | Sim |
| URL pública **HTTPS** do app | Render / Fly / Railway / VPS | `WHU_DASHBOARD_URL` no n8n (sem barra final) | Sim (n8n Cloud) |
| Conta **n8n** | n8n Cloud (ou self-hosted HTTPS) | Workflows + env do n8n | Sim para agendamento |

\*Obrigatório se houver UI lendo Supabase (repo ou Lovable).

**Opcional:** projeto Lovable só para UI; domínio próprio; alertas no n8n após falha de coleta.

---

## O que pedir ao humano (texto padrão)

- Preferir **não colar valores secretos** no chat.
- Responder algo como: **“Chaves obrigatórias preenchidas conforme checklist”** e, se quiser, listar **só os nomes** das variáveis já configuradas.
- Se faltar item obrigatório, listar **o que falta** antes de ir para a fase 2.

---

## Próximo passo (fase 2)

Após confirmação: abrir **`01_PROMPT_MESTRE_CLAUDE_CODE.md`**, colar no **Claude Code** e executar até DoD ou `## BLOQUEIO`.

O detalhe técnico (SQL completo, JSON do workflow, curls) continua em **`CLAUDE_CODE_EXECUTA_TUDO.md`** e nos arquivos numerados `02_` … `09_`.
