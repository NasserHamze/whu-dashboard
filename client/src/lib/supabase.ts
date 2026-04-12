import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** URL e anon preenchidos (trim) — necessário para queries no browser. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url?.trim() && anon?.trim());
}

if (!isSupabaseConfigured()) {
  console.warn(
    "[WHU Dashboard] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para carregar métricas."
  );
}

export const supabase = createClient(url?.trim() ?? "", anon?.trim() ?? "");

/** Mensagem legível para toast quando a query Supabase falha. */
export function getSupabaseFetchErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) {
      return msg;
    }
  }
  return "Erro ao carregar dados do Supabase";
}

export interface MetricaDiaria {
  id: string;
  data: string;
  funcionaria_nome: string;
  funcionaria_id: string | null;
  canal: string;
  lead_novo: number;
  recebido: number;
  transferiu: number;
  atendidos: number;
  created_at: string;
  updated_at?: string;
}

export interface FuncionariaResumo {
  nome: string;
  lead_novo: number;
  recebido: number;
  atendidos: number;
  canais: number;
  percentual: number;
}

async function fetchAllMetricas(
  dataInicio: string,
  dataFim: string,
  selectCols: string = "*",
  extraFilter?: { column: string; value: string }
): Promise<MetricaDiaria[]> {
  const PAGE_SIZE = 1000;
  let allRows: MetricaDiaria[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("whu_metricas_diarias")
      .select(selectCols)
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (extraFilter) {
      query = query.eq(extraFilter.column, extraFilter.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar métricas:", error);
      throw error;
    }

    const rows = data || [];
    allRows = allRows.concat(rows as unknown as MetricaDiaria[]);

    if (rows.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      offset += PAGE_SIZE;
    }
  }

  return allRows;
}

export async function fetchMetricas(
  dataInicio: string,
  dataFim: string
): Promise<FuncionariaResumo[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const data = await fetchAllMetricas(dataInicio, dataFim);

  const grouped: Record<
    string,
    { lead_novo: number; recebido: number; atendidos: number; canais: Set<string> }
  > = {};

  for (const row of data) {
    const nome = row.funcionaria_nome;
    if (nome === "Sem Atendente") continue;
    if (!grouped[nome]) {
      grouped[nome] = { lead_novo: 0, recebido: 0, atendidos: 0, canais: new Set() };
    }
    grouped[nome].lead_novo += row.lead_novo || 0;
    grouped[nome].recebido += row.recebido || 0;
    grouped[nome].atendidos += row.atendidos || 0;
    grouped[nome].canais.add(row.canal);
  }

  const totalAtendidos = Object.values(grouped).reduce((sum, g) => sum + g.atendidos, 0);

  const result: FuncionariaResumo[] = Object.entries(grouped).map(([nome, g]) => ({
    nome,
    lead_novo: g.lead_novo,
    recebido: g.recebido,
    atendidos: g.atendidos,
    canais: g.canais.size,
    percentual: totalAtendidos > 0 ? (g.atendidos / totalAtendidos) * 100 : 0,
  }));

  result.sort((a, b) => b.atendidos - a.atendidos);

  return result;
}

export async function fetchUltimaAtualizacao(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from("whu_metricas_diarias")
    .select("created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  const row = data[0] as { created_at?: string; updated_at?: string | null };
  return row.updated_at || row.created_at || null;
}
