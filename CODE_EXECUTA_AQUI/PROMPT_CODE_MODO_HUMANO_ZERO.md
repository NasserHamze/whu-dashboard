# Colar no Claude Code — modo humano zero (faz tudo sozinho)

**Instrução fixa:** o humano **não** vai digitar, clicar em painéis nem confirmar passos. Você executa **tudo** o que for possível com as ferramentas que tem (terminal, browser, APIs, leitura de arquivos). **Só** pare com **`## BLOQUEIO`** quando for **impossível** continuar sem credencial ou sessão que **não exista** no ambiente (ex.: não há `.env` com keys, não há login Supabase/n8n no browser, conta de deploy sem token).

**Repo:** raiz `whu-dashboard/`. **Anexo técnico:** `CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md` + `02_SUPABASE_SCHEMA.sql`, `03_N8N_ENV.md`, `04_N8N_WORKFLOW/`, `08_DEPLOY_E_RODAR.md`, `09_TESTE_PONTA_A_PONTA.md`.

---

Cole o bloco abaixo no Claude Code:

```markdown
# PAPEL
Você é o executor **cabo a rabo**, **100% autônomo**. O humano **não** vai interagir com teclado, mouse nem chat durante a execução. Faça você mesmo: ler/criar `.env`, SQL no Supabase (browser ou CLI se disponível), build, deploy, n8n, testes, logs.

# MODO HUMANO ZERO
- **Não** pedir “confirme”, “cole isso”, “clique aqui” ao humano. Se precisar de interação humana impossível de substituir, única saída: **## BLOQUEIO** com lista objetiva do que falta **fora** do seu alcance.
- Assuma: credenciais podem estar em `.env` / `.env.local` na raiz do repo (leia primeiro). Se faltar variável obrigatória no disco, declare BLOQUEIO com **nomes** das vars ausentes — sem pedir que o humano digite no chat.
- Escolhas técnicas triviais (provedor de deploy, nome de branch, ajuste de expressão n8n): **decida você** e documente no relatório.
- DROP destrutivo ou apagar dados em produção: **não** faça; contorne (CREATE IF NOT EXISTS, policies idempotentes) como já está no SQL do projeto.

# REGRAS GERAIS
- Não commite `.env` nem secrets.
- Service role e `WHU_CHANNELS_JSON` **só** servidor; n8n só `WHU_DASHBOARD_URL` + `COLLECTOR_SECRET`.
- Ordem: Supabase SQL → `.env` + `npm install` → `npm run check` → `npm test` → `npm run build` → deploy HTTPS público → n8n → curls/testes → `INTEGRATION_LOG.md` + relatório.

# CONTEXTO
WHU Dashboard: Node coleta API WHU, grava Supabase, endpoints `/api/health`, `/api/collect`, `/api/collect/status`. n8n agenda POST collect.

# CREDENCIAIS (descobrir sozinho)
Ler `.env.example` e qualquer `.env` existente. Variáveis alvo: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `WHU_CHANNELS_JSON`, `COLLECTOR_SECRET`, `WHU_BASE_URL` se necessário. Deploy e n8n: usar tokens/sessões **já** disponíveis no ambiente (CI, perfil logado no browser, etc.) — não inventar.

# ESCOPO
1. Aplicar `CODE_EXECUTA_AQUI/02_SUPABASE_SCHEMA.sql` (ou SQL equivalente no anexo) no projeto Supabase.
2. Garantir `.env` na raiz completo para dev/deploy sem commitar.
3. `npm install` → `npm run check` → `npm test` → `npm run build`.
4. Publicar coletor em URL **HTTPS** acessível externamente (use o fluxo que seu ambiente permitir: CLI Render/Fly/Railway, ou documente BLOQUEIO se não houver credencial de deploy).
5. n8n: variáveis + import workflow (`04_N8N_WORKFLOW/` ou JSON no anexo).
6. Testar health + collect + status (curl ou equivalente).
7. Preencher `CODE_EXECUTA_AQUI/INTEGRATION_LOG.md` e LOG FINAL do anexo se aplicável.

# DoD
- [ ] SQL aplicado ou BLOQUEIO documentado
- [ ] Build + testes OK registrados
- [ ] URL pública do coletor ou BLOQUEIO
- [ ] n8n configurado ou BLOQUEIO com causa
- [ ] Testes de API registrados
- [ ] INTEGRATION_LOG preenchido
- [ ] Um único RELATÓRIO FINAL (abaixo)

# RELATÓRIO FINAL
## Status: CONCLUÍDO | BLOQUEIO
## O que foi feito (paths)
## Variáveis usadas (só nomes)
## Como testar (passos)
## Pendências
## O que o Cursor deve plugar na UI
```

---

**Frase extra (opcional):**  
`Cursor já rodou npm run check e npm test no repo com sucesso. Continue do zero de integração (Supabase/deploy/n8n) sem pedir nada ao humano até BLOQUEIO ou CONCLUÍDO.`

**O que o Cursor faz sozinho quando possível (sem humano):** subir `npm run dev` no repo, chamar `GET /api/health`, disparar `POST /api/collect` com o `COLLECTOR_SECRET` do `.env` (PowerShell: `Invoke-RestMethod` com JSON; em bash: `curl`). Deploy HTTPS e n8n Cloud continuam com Claude Code / CI até haver URL pública.
