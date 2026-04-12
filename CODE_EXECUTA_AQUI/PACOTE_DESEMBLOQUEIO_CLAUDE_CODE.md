# Colar no Claude Code — depois do BLOQUEIO (deploy + n8n)

O relatório anterior parou em **BLOQUEIO** porque faltava: **(1)** host com HTTPS para o Node e **(2)** sessão válida no n8n Cloud.

## O que o humano precisa deixar disponível **uma vez** (sem “fazer deploy na mão” depois)

Escolha **A** ou **B** para o deploy:

### A) VPS HostGator (recomendado — já pago)

- **SSH** funcionando: `ssh usuario@ip_ou_host` (chave ou senha).
- O agente precisa poder rodar na VPS: `git`, `node`, `npm`, idealmente **PM2** + **Nginx** (ou permissão para instalar).

Cole no início da mensagem pro Code:

`Tenho VPS HostGator com SSH. Host: ___ Usuário: ___ (o Code usa chave já configurada no ambiente dele ou peça BLOQUEIO se não tiver acesso). Repositório whu-dashboard está em: ___. Domínio HTTPS desejado: ___.`

### B) Outro PaaS (se um dia usar)

Conta já criada + token/API de deploy no ambiente onde o Code roda — o Code não cria conta sozinho se isso for proibido na sessão dele.

### n8n Cloud

- Você **reloga** uma vez em `https://nasserhamze.app.n8n.cloud` (ou URL atual).
- Ou deixa o Code usar **API Key** do n8n (Settings → API) colocada **só** no ambiente do Code, **nunca** no Git.

`N8N_API_KEY` no ambiente do agente + URL da instância permite criar/importar workflow via API em alguns planos; se não der, último passo é importar o JSON `04_N8N_WORKFLOW/workflow-whu-collect-minimal.json` na UI (único clique que às vezes não dá para API).

---

## Prompt (corpo)

```markdown
Retomar whu-dashboard após BLOQUEIO.

DoD:
1. App Node em **HTTPS** público (prioridade: VPS HostGator conforme CODE_EXECUTA_AQUI/08_DEPLOY_E_RODAR.md — PM2 + Nginx + SSL). **Não** insistir em Render se o humano usa HostGator.
2. `GET {BASE}/api/health` e `POST {BASE}/api/collect` testados na URL pública.
3. n8n: workflow disparando POST para `{BASE}/api/collect` com o mesmo COLLECTOR_SECRET do servidor (ler `.env` ou env do deploy — não commitar).
4. Atualizar CODE_EXECUTA_AQUI/INTEGRATION_LOG.md com BASE URL (sem keys).

Se faltar SSH, login n8n ou permissão de DNS/SSL: ## BLOQUEIO com uma linha objetiva do que o humano deve colocar no ambiente (SSH_HOST, N8N_API_KEY, etc.).
```
