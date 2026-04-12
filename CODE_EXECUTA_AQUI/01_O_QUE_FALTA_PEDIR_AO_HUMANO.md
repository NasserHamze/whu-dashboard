# O que falta pedir / confirmar com o humano

**Tabela resumida:** ver `00_PORTAO_CHECKLIST_CURSOR.md` (portão da fase 1 — Cursor).

**Se você tem o export do Manus** (`WHU-DASHBOARD-SISTEMA-COMPLETO.md` na pasta `whu leads` ou equivalente): siga **`HANDOFF_MANUS_REFERENCIA.md`** para traduzir credenciais e `CHANNELS` → `WHU_CHANNELS_JSON` no `.env` deste repo (não commitar o .md com secrets).

Aqui está a **versão expandida** para marcar o que já existe.

## Obrigatório para ligar o sistema

- [ ] **Supabase**
  - [ ] URL do projeto (`https://xxx.supabase.co`)
  - [ ] **Service role key** — só no **servidor** (variável de ambiente do deploy) e no `.env` local de desenvolvimento; **nunca** no Lovable nem no repositório
  - [ ] **Anon key** — no front (`.env` `VITE_SUPABASE_ANON_KEY`) e no Lovable, com **RLS** aplicado (`02_SUPABASE_SCHEMA.sql`)

- [ ] **API WHU (Wescctech / WhatHub)**
  - [ ] `WHU_BASE_URL` se for diferente do default (`https://api.wescctech.com.br/core/v2/api`)
  - [ ] JSON **nome do canal → access-token** para montar `WHU_CHANNELS_JSON` no servidor (um objeto JSON por linha no `.env` ou string única escapada)

- [ ] **Servidor do coletor (Node)**
  - [ ] Onde hospedar: Render, Fly.io, Railway, VPS, etc. (precisa **HTTPS** público para o n8n Cloud chamar)
  - [ ] `COLLECTOR_SECRET` — string longa aleatória; a mesma no n8n no body do POST

- [ ] **n8n Cloud** (ou self-hosted com HTTPS)
  - [ ] Conta e permissão para criar workflow + variáveis
  - [ ] `WHU_DASHBOARD_URL` = base URL do app **sem barra final** (ex.: `https://whu-dashboard.onrender.com`)

## Opcional

- [ ] **Lovable** — projeto criado só para UI; mesmas `VITE_*` do Supabase
- [ ] Domínio próprio apontando para o deploy
- [ ] Alerta se coleta falhar (n8n → email/Slack após checar `/api/collect/status`)

## Não pedir de novo

- Lógica de classificação “assumido / transferido / recebido” — está em `server/whu-collector.ts` e nos testes `npm test`.
