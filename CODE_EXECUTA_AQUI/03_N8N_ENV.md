# Variáveis no n8n (Cloud)

Criar como **variáveis de ambiente** do workflow ou credenciais globais. **Não** versionar valores reais no Git.

| Nome | Uso |
|------|-----|
| `WHU_DASHBOARD_URL` | Base URL do servidor deployado **sem** `/` final. Ex.: `https://whu-xxx.onrender.com` |
| `COLLECTOR_SECRET` | Mesmo valor de `COLLECTOR_SECRET` no servidor — vai no JSON do POST |

Opcional:

| Nome | Uso |
|------|-----|
| `TZ` | Se o n8n precisar calcular “data de hoje” em string; o workflow pode usar `$now` formatado |

**Não** é necessário colocar `SUPABASE_SERVICE_ROLE_KEY` nem tokens WHU no n8n: o servidor já tem isso no `.env` do deploy.

### Body típico do POST (coleta do dia corrente em São Paulo no servidor)

O servidor calcula a data se você omitir `date`. Para forçar um dia:

```json
{
  "secret": "{{ $env.COLLECTOR_SECRET }}",
  "date": "2026-04-08"
}
```

### Headers

- `Content-Type: application/json`

### URL do nó HTTP Request

```
{{ $env.WHU_DASHBOARD_URL }}/api/collect
```

Método: **POST**.
