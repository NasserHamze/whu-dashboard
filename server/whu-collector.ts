/**
 * WHU Collector — incremental, finalizados (status 3), data pelo início do chat (Brasília).
 */
import axios from "axios";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TZ = "America/Sao_Paulo";

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function parseChannels(): Record<string, string> {
  const raw = getEnv("WHU_CHANNELS_JSON");
  const parsed = JSON.parse(raw) as Record<string, string>;
  if (typeof parsed !== "object" || parsed === null || Object.keys(parsed).length === 0) {
    throw new Error("WHU_CHANNELS_JSON must be a non-empty JSON object of { canalName: token }");
  }
  return parsed;
}

export function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

/** Data YYYY-MM-DD do instante UTC em São Paulo */
export function utcDateInSaoPaulo(isoUtc: string | undefined | null): string | null {
  if (!isoUtc) return null;
  const instant = new Date(isoUtc);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function getSupabase(): SupabaseClient {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

function getWhuBase(): string {
  return process.env.WHU_BASE_URL ?? "https://api.wescctech.com.br/core/v2/api";
}

const REQUEST_DELAY = Number(process.env.WHU_REQUEST_DELAY_MS ?? 80);
const DETAIL_DELAY = Number(process.env.WHU_DETAIL_DELAY_MS ?? 50);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Dias para trás em relação ao dia alvo na busca WHU byStartDate (env WHU_COLLECT_LOOKBACK_DAYS, default 120). */
export function getCollectLookbackDays(): number {
  const raw = process.env.WHU_COLLECT_LOOKBACK_DAYS;
  if (raw === undefined || raw.trim() === "") return 120;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return 120;
  return Math.min(n, 365);
}

function log(msg: string) {
  console.log(`[WHU ${new Date().toISOString()}] ${msg}`);
}

async function whuPost(endpoint: string, token: string, body: unknown): Promise<unknown> {
  const resp = await axios.post(`${getWhuBase()}/${endpoint}`, body, {
    headers: { "access-token": token, "Content-Type": "application/json" },
    timeout: 60000,
  });
  return resp.data;
}

async function whuGet(endpoint: string, token: string): Promise<unknown> {
  const resp = await axios.get(`${getWhuBase()}/${endpoint}`, {
    headers: { "access-token": token, "Content-Type": "application/json" },
    timeout: 60000,
  });
  return resp.data;
}

async function listFinalizados(
  token: string,
  startDate: string,
  endDate: string
): Promise<unknown[]> {
  const allChats: unknown[] = [];
  let page = 1;
  while (true) {
    const body = {
      typeChat: 2,
      status: 3,
      page,
      dateFilters: {
        byStartDate: {
          start: `${startDate}T00:00:00`,
          finish: `${endDate}T23:59:59`,
        },
      },
    };
    try {
      const data = (await whuPost("chats/list-lite", token, body)) as {
        chats?: unknown[];
        hasNext?: boolean;
      };
      const chats = data.chats || [];
      const hasNext = data.hasNext || false;
      allChats.push(...chats);
      if (!hasNext || chats.length === 0) break;
      page++;
      await sleep(REQUEST_DELAY);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number } };
      if (ax.response?.status === 400) break;
      throw err;
    }
  }
  return allChats;
}

async function getChatDetail(token: string, attendanceId: string): Promise<unknown | null> {
  try {
    return await whuGet(`chats/${attendanceId}`, token);
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number } };
    if (ax.response && (ax.response.status === 429 || ax.response.status === 404)) {
      return null;
    }
    await sleep(1000);
    try {
      return await whuGet(`chats/${attendanceId}`, token);
    } catch {
      return null;
    }
  }
}

/**
 * Analisa mensagens de sistema do chat WHU e extrai eventos por funcionária.
 *
 * Padrões reconhecidos (verificados em amostra de 185 msgs, 5 canais, abr/2026):
 * - "Chat assumido por: NOME"           → NOME recebe evento lead_novo
 * - "Chat transferido para o usuário: DEST no setor: ..., por: ORIGEM"  (74.6%)
 *     Se ORIGEM = ROLETA/BOT/SISTEMA    → DEST recebe lead_novo
 *     Se ORIGEM = funcionária real       → DEST recebe recebido, ORIGEM recebe transferiu
 * - "Chat iniciado por: NOME"           → fallback se nenhum assumido/transfer
 *
 * Padrões ignorados (não geram transferiu — correto):
 * - "Chat transferido ao setor: ..., por: BOT"  (23.8%) — BOT não é funcionária
 * - "Chat transferido para o BOT ..."           (1.1%)  — transferência pro BOT
 * - "Chat transferido ao BOT ... por: NOME"     (0.5%)  — raro, destino é BOT
 *
 * Regra de negócio "por:" = quem executou a transferência (autora do transferiu).
 */
export function analyzeSystemMessages(
  messages: unknown[]
): Array<{ funcionaria: string; tipo: "lead_novo" | "recebido" | "transferiu" }> {
  const results: Array<{ funcionaria: string; tipo: "lead_novo" | "recebido" | "transferiu" }> = [];
  let hasAssumidoOrTransfer = false;
  let iniciadoPor: string | null = null;

  for (const msg of messages) {
    const m = msg as { isSystemMessage?: boolean; text?: string; body?: string };
    if (!m.isSystemMessage) continue;
    const text = m.text || m.body || "";

    const assumidoMatch = text.match(/Chat assumido por:\s*(.+)/i);
    if (assumidoMatch) {
      const funcionaria = assumidoMatch[1].trim();
      if (funcionaria !== "BOT" && funcionaria !== "SISTEMA") {
        results.push({ funcionaria, tipo: "lead_novo" });
        hasAssumidoOrTransfer = true;
      }
      continue;
    }

    const transferMatch = text.match(
      /Chat transferido para o usu[aá]rio:\s*(.+?)\s*no setor:.+?,\s*por:\s*(.+)/i
    );
    if (transferMatch) {
      const destinatario = transferMatch[1].trim();
      const origem = transferMatch[2].trim();

      if (origem === "ROLETA" || origem === "BOT" || origem === "SISTEMA") {
        results.push({ funcionaria: destinatario, tipo: "lead_novo" });
      } else {
        // Destinatário recebe o chat → recebido
        results.push({ funcionaria: destinatario, tipo: "recebido" });
        // Origem (por:) executou a transferência → transferiu
        results.push({ funcionaria: origem, tipo: "transferiu" });
      }
      hasAssumidoOrTransfer = true;
      continue;
    }

    const iniciadoMatch = text.match(/Chat iniciado por:\s*(.+)/i);
    if (iniciadoMatch && !iniciadoPor) {
      iniciadoPor = iniciadoMatch[1].trim();
    }
  }

  if (!hasAssumidoOrTransfer && iniciadoPor) {
    if (iniciadoPor !== "BOT" && iniciadoPor !== "SISTEMA") {
      results.push({ funcionaria: iniciadoPor, tipo: "lead_novo" });
    }
  }

  return results;
}

function getStartDate(detail: { utcDhStartChat?: string; utcDhEndChat?: string }): string {
  const start = utcDateInSaoPaulo(detail.utcDhStartChat);
  if (start) return start;
  const end = utcDateInSaoPaulo(detail.utcDhEndChat);
  if (end) return end;
  return todayInSaoPaulo();
}

interface EventEntry {
  attendance_id: string;
  wa_id: string;
  canal: string;
  funcionaria_nome: string;
  tipo: "lead_novo" | "recebido" | "transferiu";
  data: string;
  started_at: string | null; // ISO UTC do início do chat (utcDhStartChat)
}

export interface CollectorResult {
  totalFinalizados: number;
  jaProcessados: number;
  novosProcessados: number;
  errosDetalhe: number;
  eventosGerados: number;
  eventosUnicos: number;
  duplicatasRemovidas: number;
  eventosGravados: number;
  byEmployee: Record<string, { lead_novo: number; recebido: number; atendidos: number }>;
  ok: boolean;
}

function deduplicateEvents(eventos: EventEntry[]): { unique: EventEntry[]; removed: number } {
  const seen = new Set<string>();
  const unique: EventEntry[] = [];
  let removed = 0;

  for (const e of eventos) {
    const key = `${e.attendance_id}|${e.funcionaria_nome}|${e.tipo}`;
    if (seen.has(key)) {
      removed++;
      continue;
    }
    seen.add(key);
    unique.push(e);
  }

  return { unique, removed };
}

export async function collectIncremental(startDate: string, endDate: string, opts?: { force?: boolean }): Promise<CollectorResult> {
  log(`=== Coleta incremental: ${startDate} a ${endDate} ===`);

  const supabase = getSupabase();
  const CHANNELS = parseChannels();

  const allFinalizados: Array<{
    attendanceId: string;
    wa_id: string;
    canal: string;
    token: string;
  }> = [];
  const seenIds = new Set<string>();

  for (const [canalName, token] of Object.entries(CHANNELS)) {
    log(`  Canal: ${canalName}...`);
    const chats = (await listFinalizados(token, startDate, endDate)) as Array<{
      attendanceId?: string;
      secondaryDescription?: string;
    }>;
    log(`  [${canalName}] ${chats.length} chats (list-lite) (${startDate} a ${endDate})`);
    let count = 0;
    let skippedNoWaId = 0;
    let skippedDuplicate = 0;
    for (const chat of chats) {
      const attId = chat.attendanceId || "";
      if (!attId) continue;
      if (seenIds.has(attId)) {
        skippedDuplicate++;
        continue;
      }
      seenIds.add(attId);
      const waId = (chat.secondaryDescription || "").trim();
      if (!waId || !/^\d+$/.test(waId)) {
        skippedNoWaId++;
        continue;
      }
      allFinalizados.push({ attendanceId: attId, wa_id: waId, canal: canalName, token });
      count++;
    }
    log(`    API retornou: ${chats.length} chats | ${count} válidos | ${skippedNoWaId} sem wa_id | ${skippedDuplicate} duplicados`);
    await sleep(REQUEST_DELAY);
  }

  log(`  Total finalizados únicos: ${allFinalizados.length}`);

  const allAttIds = allFinalizados.map((c) => c.attendanceId);
  const processedSet = new Set<string>();
  const forceReprocess = opts?.force ?? false;

  if (!forceReprocess) {
    for (let i = 0; i < allAttIds.length; i += 500) {
      const batch = allAttIds.slice(i, i + 500);
      const { data: existing } = await supabase
        .from("whu_atendimentos_logs")
        .select("attendance_id")
        .in("attendance_id", batch);
      if (existing) {
        for (const row of existing as { attendance_id: string }[]) {
          processedSet.add(row.attendance_id);
        }
      }
    }
  }

  const novos = forceReprocess
    ? allFinalizados
    : allFinalizados.filter((c) => !processedSet.has(c.attendanceId));
  log(`  ${forceReprocess ? "FORCE MODE — reprocessando todos" : `Já processados: ${processedSet.size}`}, novos para processar: ${novos.length}`);

  if (novos.length === 0) {
    log("  Nada novo para processar!");
    return {
      totalFinalizados: allFinalizados.length,
      jaProcessados: processedSet.size,
      novosProcessados: 0,
      errosDetalhe: 0,
      eventosGerados: 0,
      eventosUnicos: 0,
      duplicatasRemovidas: 0,
      eventosGravados: 0,
      byEmployee: {},
      ok: true,
    };
  }

  log(`  Processando ${novos.length} chats novos...`);

  const eventos: EventEntry[] = [];
  let erros = 0;
  let processed = 0;

  for (const chat of novos) {
    const detail = (await getChatDetail(chat.token, chat.attendanceId)) as {
      utcDhStartChat?: string;
      utcDhEndChat?: string;
      messages?: unknown[];
      currentUser?: { name?: string };
    } | null;

    if (!detail) {
      erros++;
      await sleep(DETAIL_DELAY);
      continue;
    }

    const dataInicio = getStartDate(detail);
    const startedAtUtc = detail.utcDhStartChat || null;
    const messages = detail.messages || [];
    const transfers = analyzeSystemMessages(messages);

    if (transfers.length === 0) {
      const currentUser = detail.currentUser?.name;
      if (currentUser && currentUser !== "BOT") {
        eventos.push({
          attendance_id: chat.attendanceId,
          wa_id: chat.wa_id,
          canal: chat.canal,
          funcionaria_nome: currentUser,
          tipo: "lead_novo",
          data: dataInicio,
          started_at: startedAtUtc,
        });
      }
    } else {
      for (const t of transfers) {
        eventos.push({
          attendance_id: chat.attendanceId,
          wa_id: chat.wa_id,
          canal: chat.canal,
          funcionaria_nome: t.funcionaria,
          tipo: t.tipo,
          data: dataInicio,
          started_at: startedAtUtc,
        });
      }
    }

    processed++;
    await sleep(DETAIL_DELAY);

    if (processed % 50 === 0) {
      log(`    ${processed}/${novos.length} processados (${erros} erros)`);
    }
  }

  log(`  Processamento completo: ${processed} ok, ${erros} erros, ${eventos.length} eventos brutos`);

  const { unique: eventosUnicos, removed: duplicatasRemovidas } = deduplicateEvents(eventos);
  log(`  Deduplicação: ${eventos.length} brutos → ${eventosUnicos.length} únicos (${duplicatasRemovidas} duplicatas removidas)`);

  let eventosGravados = 0;
  if (eventosUnicos.length > 0) {
    log(`  Gravando ${eventosUnicos.length} eventos no Supabase...`);

    const rows = eventosUnicos.map((e) => ({
      data: e.data,
      wa_id: e.wa_id,
      attendance_id: e.attendance_id,
      funcionaria_nome: e.funcionaria_nome,
      canal: e.canal,
      tipo_evento: e.tipo,
      ...(e.started_at ? { started_at: e.started_at } : {}),
    }));

    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      // Mesma chave de conflito do upsert: evita duas linhas idênticas no mesmo batch (erro PostgreSQL).
      const dedupMap = new Map<
        string,
        {
          data: string;
          wa_id: string;
          attendance_id: string;
          funcionaria_nome: string;
          canal: string;
          tipo_evento: string;
          started_at?: string;
        }
      >();
      for (const r of slice) {
        const k = `${r.attendance_id}|${r.funcionaria_nome}|${r.tipo_evento}`;
        dedupMap.set(k, r);
      }
      const batch = Array.from(dedupMap.values());

      const { error } = await supabase.from("whu_atendimentos_logs").upsert(batch, {
        onConflict: "attendance_id,funcionaria_nome,tipo_evento",
      });
      if (error) {
        log(`    Erro batch ${i}: ${error.message} | ${error.details ?? ""} | ${error.hint ?? ""}`);
      } else {
        eventosGravados += batch.length;
      }
      if (i % 2000 === 0) log(`    Logs gravados: ${eventosGravados}/${rows.length}`);
    }
    log(`  Total logs gravados: ${eventosGravados}/${rows.length}`);

    const datasAfetadas = new Set(eventosUnicos.map((e) => e.data));
    log(`  Recalculando métricas para ${datasAfetadas.size} datas...`);

    for (const data of Array.from(datasAfetadas)) {
      let allDayEvents: unknown[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data: dayEvents } = await supabase
          .from("whu_atendimentos_logs")
          .select("*")
          .eq("data", data)
          .range(offset, offset + pageSize - 1);

        if (!dayEvents || dayEvents.length === 0) break;
        allDayEvents.push(...dayEvents);
        if (dayEvents.length < pageSize) break;
        offset += pageSize;
      }

      if (allDayEvents.length === 0) continue;

      const agg: Record<string, { lead_novo: number; recebido: number; transferiu: number; atendidos: number }> = {};
      for (const ev of allDayEvents) {
        const row = ev as {
          tipo_evento?: string;
          funcionaria_nome?: string;
          canal?: string;
        };
        if (row.tipo_evento !== "lead_novo" && row.tipo_evento !== "recebido" && row.tipo_evento !== "transferiu") continue;
        const key = `${row.funcionaria_nome}|${row.canal ?? ""}`;
        if (!agg[key]) agg[key] = { lead_novo: 0, recebido: 0, transferiu: 0, atendidos: 0 };
        if (row.tipo_evento === "lead_novo") { agg[key].lead_novo++; agg[key].atendidos++; }
        if (row.tipo_evento === "recebido") { agg[key].recebido++; agg[key].atendidos++; }
        if (row.tipo_evento === "transferiu") agg[key].transferiu++;
        // Nota: transferiu NÃO soma em atendidos (transferir não é atender)
      }

      const { error: delErr } = await supabase.from("whu_metricas_diarias").delete().eq("data", data);
      if (delErr) log(`    Erro delete metricas ${data}: ${delErr.message}`);

      const nowIso = new Date().toISOString();
      const metricasRows = Object.entries(agg).map(([key, m]) => {
        const [funcNome, canal] = key.split("|");
        return {
          data,
          funcionaria_nome: funcNome,
          funcionaria_id: "",
          canal,
          lead_novo: m.lead_novo,
          recebido: m.recebido,
          transferiu: m.transferiu,
          atendidos: m.atendidos,
          updated_at: nowIso,
        };
      });

      if (metricasRows.length > 0) {
        const { error: metErr } = await supabase.from("whu_metricas_diarias").upsert(metricasRows, {
          onConflict: "data,funcionaria_nome,canal",
        });
        if (metErr)
          log(`    Erro upsert metricas ${data}: ${metErr.message} | ${metErr.details ?? ""}`);
      }
    }

    log("  Métricas atualizadas!");
  }

  const byEmployee: Record<string, { lead_novo: number; recebido: number; transferiu: number; atendidos: number }> = {};
  for (const e of eventosUnicos) {
    if (!byEmployee[e.funcionaria_nome]) {
      byEmployee[e.funcionaria_nome] = { lead_novo: 0, recebido: 0, transferiu: 0, atendidos: 0 };
    }
    if (e.tipo === "lead_novo") { byEmployee[e.funcionaria_nome].lead_novo++; byEmployee[e.funcionaria_nome].atendidos++; }
    if (e.tipo === "recebido") { byEmployee[e.funcionaria_nome].recebido++; byEmployee[e.funcionaria_nome].atendidos++; }
    if (e.tipo === "transferiu") byEmployee[e.funcionaria_nome].transferiu++;
  }

  const sorted = Object.entries(byEmployee).sort((a, b) => b[1].atendidos - a[1].atendidos);
  log(`\n  RESUMO desta rodada:`);
  for (const [nome, m] of sorted) {
    log(`    ${nome}: ${m.lead_novo} novos + ${m.recebido} recebidos + ${m.transferiu} transferiu = ${m.atendidos} atendidos`);
  }

  return {
    totalFinalizados: allFinalizados.length,
    jaProcessados: processedSet.size,
    novosProcessados: novos.length,
    errosDetalhe: erros,
    eventosGerados: eventos.length,
    eventosUnicos: eventosUnicos.length,
    duplicatasRemovidas,
    eventosGravados,
    byEmployee,
    ok: true,
  };
}

export async function collectDay(targetDateStr: string): Promise<CollectorResult> {
  const endDate = targetDateStr;
  const lookbackDays = getCollectLookbackDays();
  const d = new Date(targetDateStr + "T12:00:00Z");
  const startD = new Date(d.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const startDate = startD.toISOString().split("T")[0];

  log(`collectDay(${targetDateStr}): lookback=${lookbackDays}d → list-lite byStartDate [${startDate} .. ${endDate}]`);

  return collectIncremental(startDate, endDate);
}
