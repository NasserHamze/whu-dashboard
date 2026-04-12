# Prompt mestre — colar no Claude Code (Fase 2)

**Pré-requisito:** humano confirmou que as chaves **obrigatórias** do arquivo `00_PORTAO_CHECKLIST_CURSOR.md` estão disponíveis (sem colar secrets no chat).

**Repositório:** raiz `whu-dashboard/` (onde está `package.json`).

**Leia também:** `CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md` para SQL embutido, template `.env`, JSON do n8n e curls — use esse arquivo como **anexo técnico** na ordem indicada abaixo.

---

```markdown
# PAPEL
Você é o executor técnico **cabo a rabo** deste projeto. Você implementa, configura e integra tudo no escopo até o **Definition of Done (DoD)** estar cumprido.

# REGRAS GERAIS
- Não commite `.env` nem secrets. Use `.env.example` só com placeholders.
- Supabase: aplicar o schema e RLS conforme `CODE_EXECUTA_AQUI/02_SUPABASE_SCHEMA.sql` (ou seção SQL equivalente em `CLAUDE_CODE_EXECUTA_TUDO.md`). Não expor service role no front nem no n8n.
- n8n: apenas `WHU_DASHBOARD_URL` + `COLLECTOR_SECRET` — **não** colocar `WHU_CHANNELS_JSON` nem `SUPABASE_SERVICE_ROLE_KEY` no n8n.
- Ordem: (1) Supabase SQL → (2) `.env` na raiz do repo + validar com `npm run check` / testes → (3) build → (4) deploy ou instruções claras com URL HTTPS pública → (5) n8n (variáveis + import workflow de `04_N8N_WORKFLOW/` ou JSON no anexo) → (6) testes curl e registro em `INTEGRATION_LOG.md`.
- Bloqueio externo (sem acesso Supabase, sem URL HTTPS pública para o coletor, DROP destrutivo em produção sem confirmação explícita): pare, declare **## BLOQUEIO**, diga exatamente o que o humano deve corrigir.

# CONTEXTO DO PROJETO
WHU Dashboard: servidor Node coleta métricas da API WHU (tokens só no servidor via `WHU_CHANNELS_JSON`), persiste em Supabase, expõe `/api/health`, `/api/collect`, `/api/collect/status`. n8n Cloud agenda `POST /api/collect` com segredo compartilhado. Front no repo (Vite/React) ou Lovable opcional: leitura Supabase com anon + RLS em `whu_metricas_diarias`.

# CREDENCIAIS
O humano já disponibilizou as chaves obrigatórias. Variáveis esperadas (só nomes, sem valores):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `WHU_CHANNELS_JSON`, `COLLECTOR_SECRET`, `WHU_BASE_URL` (se aplicável), URL pública do deploy, variáveis n8n `WHU_DASHBOARD_URL` e `COLLECTOR_SECRET`.
Confirmar leitura de `.env.example` e de `CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md` antes de rodar comandos.

# ESCOPO DE EXECUÇÃO
1. Aplicar SQL no Supabase (arquivo `02_SUPABASE_SCHEMA.sql` ou seção SQL do anexo `CLAUDE_CODE_EXECUTA_TUDO.md`). Se já existirem tabelas com dados, não fazer DROP sem confirmação; documentar conflitos.
2. Garantir `.env` na raiz conforme template do anexo / `.env.example`; nunca commitar segredos reais.
3. Na raiz: `npm install` → `npm run check` → `npm test` → `npm run build` (ajustar se o `package.json` tiver scripts diferentes — documentar).
4. Deploy ou passos claros para URL HTTPS com `GET /api/health` e `POST /api/collect` acessível pelo n8n Cloud. Ver `08_DEPLOY_E_RODAR.md`.
5. n8n: configurar env; importar workflow mínimo de `04_N8N_WORKFLOW/` (ou JSON no anexo). Ver `03_N8N_ENV.md`.
6. Testes: `09_TESTE_PONTA_A_PONTA.md` e curls do anexo; opcional `07_FIXTURES/`.
7. Preencher `CODE_EXECUTA_AQUI/INTEGRATION_LOG.md` e o bloco **LOG FINAL** em `CLAUDE_CODE_EXECUTA_TUDO.md` se aplicável.
8. Opcional Lovable: `06_LOVABLE.md`.

# DEFINITION OF DONE (DoD) — SÓ PARAR QUANDO TUDO ISSO FOR VERDADE
- [ ] Schema Supabase aplicado (ou documentado bloqueio com backup/conflito).
- [ ] `.env` documentado (sem vazar valores); service role só servidor; anon só front.
- [ ] `npm run check`, `npm test` e `npm run build` executados com resultado registrado (sucesso ou erro explicado + correção).
- [ ] URL pública HTTPS do coletor definida ou **## BLOQUEIO** explícito se impossível.
- [ ] n8n com variáveis e workflow apontando para `POST /api/collect` (ou passos manuais claros se import falhar).
- [ ] Testes mínimos: health + collect + status (ou equivalente) descritos e resultado OK ou bloqueio.
- [ ] `INTEGRATION_LOG.md` atualizado.
- [ ] Relatório final neste formato (seção abaixo).

# RELATÓRIO FINAL (OBRIGATÓRIO AO CONCLUIR OU AO BLOQUEAR)
## Status: CONCLUÍDO | BLOQUEIO
## O que foi feito (paths + resumo)
## Variáveis .env / serviços usados (só nomes)
## Como testar (passos numerados)
## Pendências / decisões técnicas
## O que o Cursor deve plugar na UI (URLs, queries Supabase, env Vite)
```

---

## Frase única (atalho)

Depois de colar o bloco acima, pode adicionar uma linha:

`Execute na ordem; use o arquivo CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md como anexo técnico para SQL, env, workflow e curls; preencha INTEGRATION_LOG.md; um único RELATÓRIO FINAL ao terminar ou em BLOQUEIO.`
