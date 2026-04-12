# Textos para colar — Fase 1 (Cursor) e Fase 2 (Claude Code)

---

## Fase 1 — Cole no Cursor (antes das chaves)

Use quando for **nova integração** ou “ligar tudo”. O Cursor deve **só** planejar e mandar o checklist primeiro.

```
Estou no repo whu-dashboard. Abra CODE_EXECUTA_AQUI/00_PORTAO_CHECKLIST_CURSOR.md.

Entregue APENAS na primeira resposta: (1) resumo do que entendeu em 3–6 linhas; (2) seção ## CHECKLIST DE CHAVES E ACESSOS na forma de tabela (variável, onde obter, onde colocar, obrigatória/opcional); (3) pedido para eu preencher .env/painéis sem colar secrets no chat e confirmar quando as obrigatórias estiverem prontas.

Não escreva o prompt mestre final nem mande executar o Claude Code até eu confirmar as chaves.
```

---

## Fase 2 — Cole no Claude Code (depois das chaves)

**Preferência:** abrir o arquivo **`01_PROMPT_MESTRE_CLAUDE_CODE.md`**, copiar o **bloco markdown inteiro** (entre as cercas ```markdown … ```) e colar no Claude Code.

**Atalho** (se já tiver aberto os arquivos no repo):

```
Chaves obrigatórias já estão preenchidas conforme CODE_EXECUTA_AQUI/00_PORTAO_CHECKLIST_CURSOR.md.

Abra CODE_EXECUTA_AQUI/01_PROMPT_MESTRE_CLAUDE_CODE.md e execute o prompt mestre completo. Use CODE_EXECUTA_AQUI/CLAUDE_CODE_EXECUTA_TUDO.md como anexo técnico (SQL, .env, workflow n8n, curls). Preencha CODE_EXECUTA_AQUI/INTEGRATION_LOG.md. Ao terminar ou bloquear, devolva um único RELATÓRIO FINAL no formato exigido pelo prompt (CONCLUÍDO ou BLOQUEIO).

Pare e declare ## BLOQUEIO apenas se: sem acesso ao Supabase; impossível ter URL HTTPS pública para o coletor; ou DROP destrutivo em produção sem minha confirmação explícita.
```

---

## Depois que o Code responder

Cole o **RELATÓRIO FINAL** de volta no **Cursor** para revisão e eventuais ajustes de UI no repo.
