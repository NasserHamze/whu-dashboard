# Deploy e como rodar

## Desenvolvimento (máquina local)

Na raiz `whu-dashboard/`:

```bash
cp .env.example .env
# Editar .env com Supabase, WHU_CHANNELS_JSON, COLLECTOR_SECRET, VITE_*

npm install
npm run dev
```

Abre dashboard + API no mesmo processo (porta livre a partir de 3000).

## Produção

```bash
npm install
npm run build
npm start
```

Define `NODE_ENV=production` no ambiente do host. O servidor serve `dist/public` e expõe as rotas `/api/*`.

### Variáveis obrigatórias no host

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Gravação nas tabelas WHU |
| `WHU_CHANNELS_JSON` | JSON `{"Nome canal":"token",...}` |
| `COLLECTOR_SECRET` | Segredo do POST `/api/collect` |
| `PORT` | Opcional; default 3000 |

Opcional: `WHU_BASE_URL`, `WHU_REQUEST_DELAY_MS`, `WHU_DETAIL_DELAY_MS`.

### Build de front estático

O `vite build` gera `dist/public`. Não é necessário CDN separado para o primeiro deploy.

## Health

- `GET /api/health` → `{ "ok": true, "service": "whu-dashboard" }`

## Produção atual — DigitalOcean (Nasser)

Este é o ambiente **que está no ar hoje**. O restante do doc (HostGator, Nginx genérico) serve como **referência** para outro host ou quando migrar domínio + HTTPS.

| Item | Valor |
|------|--------|
| **Provedor** | DigitalOcean — Droplet |
| **Recursos** | 1 vCPU, 1 GB RAM, região **NYC3**, Ubuntu 24.04 |
| **Runtime** | Node.js **v20** + **PM2** (startup automático configurado) |
| **Base URL (HTTP)** | `http://157.245.213.123:3000` |
| **Health** | `GET http://157.245.213.123:3000/api/health` |
| **Coleta (n8n)** | `POST http://157.245.213.123:3000/api/collect` + body `{"secret":"<COLLECTOR_SECRET>"}` |
| **Status coleta** | `GET http://157.245.213.123:3000/api/collect/status` |
| **Repo** | `github.com/NasserHamze/whu-dashboard` |
| **Supabase** | Projeto em uso documentado em `INTEGRATION_LOG.md` |
| **Pendência** | Domínio próprio + HTTPS (ex.: subdomínio → mesmo IP, Nginx + certbot) — ver pendências no `INTEGRATION_LOG.md` |

### SSH (manutenção)

```bash
ssh -i ~/.ssh/id_do_deploy root@157.245.213.123
cd /opt/whu-dashboard
pm2 logs whu-dashboard
pm2 restart whu-dashboard
```

(Ajuste o caminho do projeto na VPS se for diferente de `/opt/whu-dashboard`; a chave SSH se não for `id_do_deploy`.)

### Testes rápidos (de qualquer máquina)

```bash
curl http://157.245.213.123:3000/api/health
curl -X POST http://157.245.213.123:3000/api/collect -H "Content-Type: application/json" -d '{"secret":"SEU_COLLECTOR_SECRET"}'
curl http://157.245.213.123:3000/api/collect/status
```

Detalhes de datas, n8n e relatório do deploy: **`INTEGRATION_LOG.md`**.

## HostGator VPS (recomendado se já está pago)

O coletor é **Node + Express**; precisa de processo **sempre ligado** e **HTTPS** para o n8n Cloud chamar `POST /api/collect`. Plano **compartilhado só PHP** em geral **não** serve; use **VPS** (ou equivalente).

### 1) Servidor

- Instalar **Node.js 20 LTS** (nvm, NodeSource ou pacote do SO).
- Clonar o repo na VPS (`git clone` …) ou enviar pasta `whu-dashboard`.
- Na raiz do projeto:

```bash
npm install
npm run build
```

### 2) Variáveis de ambiente

Criar `/caminho/whu-dashboard/.env` no servidor com as **mesmas** chaves da tabela “Variáveis obrigatórias no host” (não commitar). Ou exportar no systemd/PM2.

### 3) Processo em background (PM2)

```bash
npm install -g pm2
cd /caminho/whu-dashboard
NODE_ENV=production pm2 start dist/server.js --name whu-dashboard
pm2 save
pm2 startup   # seguir a linha que o comando imprimir
```

### 4) Nginx + HTTPS (Let’s Encrypt)

- `server_name` com o domínio (ex.: `whu.seudominio.com.br`).
- `location /` → `proxy_pass http://127.0.0.1:3000;` (ou a `PORT` do `.env`).
- Certificado com **Certbot** (`certbot --nginx`) ou SSL do painel HostGator.

### 5) Firewall

- Liberar 80/443 no painel da VPS; Node pode ficar só em `127.0.0.1:3000`.

### URL para o n8n

Use a base **HTTPS** pública, **sem** barra no final, ex.: `https://whu.seudominio.com.br` → o workflow chama `POST https://whu.seudominio.com.br/api/collect`.

**Produção hoje:** DigitalOcean (mesma seção mais acima neste arquivo). A parte HostGator é só **modelo de VPS** (Node + PM2 + Nginx) se mudar de servidor no futuro.

## Checklist pós-deploy

- [ ] `GET /api/health` retorna 200
- [ ] `POST /api/collect` com secret correto retorna `started` (e depois status em `/api/collect/status`)
- [ ] Supabase mostra linhas novas em `whu_atendimentos_logs` / `whu_metricas_diarias` após coleta
