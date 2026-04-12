# Handoff exportado pelo Manus → repo `whu-dashboard` (Cursor)

## Onde está o arquivo

Caminho típico no seu PC (ajuste se a pasta mudar):

`C:\Users\nasse\OneDrive\Área de Trabalho\CURSOR\whu leads\WHU-DASHBOARD-SISTEMA-COMPLETO.md`

Esse Markdown é um **snapshot** do projeto gerado no ambiente Manus (stack com tRPC, `server/_core`, etc.). **Não** substitui o código deste repositório; serve como **fonte de credenciais e nomes de canal** ao montar o `.env`.

**Segurança:** o arquivo contém chaves JWT e tokens. **Não** commite esse `.md` dentro do repo nem cole o conteúdo inteiro em chats públicos. Se já vazou, **rotacione** chaves no Supabase e tokens WHU.

---

## Mapa: Manus → variáveis deste repo

| No export Manus | Neste repo (`.env` na raiz) |
|-----------------|----------------------------|
| `SUPABASE_URL` | `SUPABASE_URL` e `VITE_SUPABASE_URL` (mesmo valor) |
| `SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` **somente** (browser) |
| `SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` (servidor / coletor) |
| `COLLECTOR_SECRET` | `COLLECTOR_SECRET` |
| Constante `CHANNELS` em `whu-collector.ts` (no bloco de código do .md) | `WHU_CHANNELS_JSON` — **um único JSON** em uma linha, ex.: `{"Canal A":"token_a","Canal B":"token_b"}` |
| `WHU_BASE_URL` no texto (às vezes `api.whu.chat`) | No código embarcado do próprio export costuma ser `https://api.wescctech.com.br/core/v2/api` — alinhe com `WHU_BASE_URL` no `.env` (o coletor deste repo usa **access-token** + endpoints `chats/list-lite`, não o desenho REST genérico da seção 3 do PDF) |

---

## Canais esperados (só nomes — valores vêm do arquivo Manus)

Copie o **objeto completo** `CHANNELS` do trecho `server/whu-collector.ts` dentro do `WHU-DASHBOARD-SISTEMA-COMPLETO.md` para montar `WHU_CHANNELS_JSON`. Os nomes públicos dos canais no export são:

- `OFICIAL 19 3231-8537`
- `NAL OFICIAL (19999576475)`
- `Canal 3020-0425`
- `CLINICA PARA FAMILIA`
- `FACEBOOK/INSTAGRAM`

---

## Diferenças importantes (Manus vs este repo)

1. **Estrutura:** Manus descreve `server/_core/index.ts`, tRPC, Drizzle, OAuth Manus. **Este repo** usa `server/index.ts` + Express simples + `server/whu-collector.ts` com env (`WHU_CHANNELS_JSON`).
2. **Front:** no export, `client/src/lib/supabase.ts` às vezes usa chave **service** no browser — **incorreto** para produção. Aqui use **anon** + RLS (`02_SUPABASE_SCHEMA.sql`).
3. **API WHU:** a seção “API WHU” do PDF pode descrever `api.whu.chat` e GET genérico; o **coletor atual** segue a integração Wescctech (`WHU_BASE_URL` padrão + `access-token`), igual ao bloco de código grande dentro do mesmo arquivo Manus.

---

## O que Cursor / Claude Code devem fazer com esse arquivo

1. Abrir o `.md` **localmente** (fora do Git ou em pasta ignorada).
2. Preencher `.env` na raiz de `whu-dashboard` com os nomes de variável **desta tabela**, sem commitar.
3. Não sobrescrever o repo inteiro pelo código do export salvo decisão explícita de migração.

---

## Ligação com o pacote “meio a meio”

Depois de copiar credenciais para o `.env`, siga `00_PORTAO_CHECKLIST_CURSOR.md` e `01_PROMPT_MESTRE_CLAUDE_CODE.md` para deploy/n8n/testes.
