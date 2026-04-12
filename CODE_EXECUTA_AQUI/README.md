# WHU Dashboard — Pacote Cursor + Claude Code (“meio a meio”)

Mesmo **ciclo** do projeto clinica-ai: **portão de chaves no Cursor** → **confirmação humana** → **prompt mestre no Claude Code** → **relatório de volta** → **retoques no Cursor** se precisar.

---

## Stack deste pacote

**Supabase** + **Node** (coletor, `POST /api/collect`) + **n8n** (só dispara HTTP + segredo) + **Lovable** (UI oficial de produção).

**UI oficial em produção:** https://whu-leads-flow.lovable.app (projeto "WHU Dental Insights" no Lovable, conectado ao Supabase via integração nativa).

O React em `client/` do repo é **referência/sync** — a UI que o cliente acessa é o **Lovable**.

Tokens WHU ficam **só no servidor** (`WHU_CHANNELS_JSON`). O n8n usa apenas `WHU_DASHBOARD_URL` e `COLLECTOR_SECRET`.

---

## Ciclo recomendado (7 passos)

1. **Cursor:** abrir `00_PORTAO_CHECKLIST_CURSOR.md` e, em tarefa grande, responder primeiro só com **resumo + checklist de chaves** (sem mandar executar o Code ainda).
2. **Humano:** preencher `.env`, Supabase, n8n, deploy; **não** colar secrets no chat; responder que as chaves obrigatórias estão ok (ou listar o que falta).
3. **Cursor:** entregar **contrato mínimo** (endpoints/tabelas) apontando para esta pasta + **bloco de UI** no repo se couber.
4. **Humano:** colar no **Claude Code** o conteúdo de **`01_PROMPT_MESTRE_CLAUDE_CODE.md`** (bloco markdown do prompt mestre).
5. **Claude Code:** executar **cabo a rabo** até o **DoD** ou até declarar **BLOQUEIO** (seção `## BLOQUEIO` no relatório), usando **`CLAUDE_CODE_EXECUTA_TUDO.md`** como anexo (SQL, env, workflow, curls).
6. **Humano:** colar no Cursor o **RELATÓRIO FINAL** do Code.
7. **Cursor:** revisão; se faltar algo, devolver **pacote para colar no Code** com itens do DoD.

Regra no editor: `.cursor/rules/whu-divisao-cursor-code.mdc` (sempre ligada neste repo).

---

## Arquivos (mapa)

| Arquivo | Função |
|---------|--------|
| **`00_PORTAO_CHECKLIST_CURSOR.md`** | **Fase 1 — só Cursor:** checklist antes de qualquer execução no Code |
| **`01_PROMPT_MESTRE_CLAUDE_CODE.md`** | **Fase 2 — colar no Claude Code** (PAPEL, DoD, relatório) |
| **`00_COLA_ISSO_NO_CLAUDE_CODE.md`** | Atalhos de texto (fase 1 + fase 2) |
| **`CLAUDE_CODE_EXECUTA_TUDO.md`** | **Anexo técnico único:** SQL, `.env`, JSON n8n, comandos, curls, LOG FINAL |
| `01_O_QUE_FALTA_PEDIR_AO_HUMANO.md` | Detalhe humano (expande o portão) |
| `02_SUPABASE_SCHEMA.sql` | Schema + RLS (duplicado no anexo) |
| `03_N8N_ENV.md` | O que configurar no n8n |
| `04_N8N_WORKFLOW/` | JSON do workflow |
| `06_LOVABLE.md` | Variáveis e leitura Supabase |
| `07_FIXTURES/` | Exemplos de request |
| `08_DEPLOY_E_RODAR.md` | Build, env, health |
| `09_TESTE_PONTA_A_PONTA.md` | Checklist e testes |
| `INTEGRATION_LOG.md` | Log + formato de relatório do Code |
| **`HANDOFF_MANUS_REFERENCIA.md`** | Como usar o export **`WHU-DASHBOARD-SISTEMA-COMPLETO.md`** (Manus) para montar `.env` **sem** colar segredos no repo |

---

## Ordem técnica (para quem executa)

1. Checklist / chaves (`00_PORTAO` + `01_O_QUE_FALTA`).
2. SQL → `02_SUPABASE_SCHEMA.sql` (ou seção no anexo).
3. `.env` na raiz `whu-dashboard/` + `npm install` / check / test / build.
4. Deploy HTTPS → `08_DEPLOY_E_RODAR.md`.
5. n8n → `03_N8N_ENV.md` + `04_N8N_WORKFLOW/`.
6. Testes → `09` + `07_FIXTURES/`.
7. `INTEGRATION_LOG.md` + relatório final no formato do prompt mestre.

---

## Origem

Alinhado ao fluxo **Cursor + Claude Code** do clinica-ai (`divisao-trabalho-code`) e ao pacote técnico WHU já existente.
