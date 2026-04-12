import { Button } from "@/components/ui/button";
import { fetchCollectStatus, type CollectStatusResponse } from "@/lib/collectStatus";
import {
  fetchMetricas,
  fetchUltimaAtualizacao,
  getSupabaseFetchErrorMessage,
  isSupabaseConfigured,
  type FuncionariaResumo,
} from "@/lib/supabase";
import {
  type DatePreset,
  getPresetRange,
  formatDateBR,
  getEmployeeColor,
} from "@/lib/dates";
import { toast } from "sonner";
import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Calendar, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";

type SortField = "nome" | "lead_novo" | "recebido" | "atendidos" | "percentual";
type SortDir = "asc" | "desc";

function formatCollectorHint(status: CollectStatusResponse | null): string | null {
  if (!status) return null;
  if (status.collectorRunning) {
    const m = status.runningForMinutes;
    return m != null ? `Coleta em andamento (~${m} min)` : "Coleta em andamento";
  }
  if (status.lastRun) {
    const d = new Date(status.lastRun);
    if (!Number.isNaN(d.getTime())) {
      return `Última coleta (servidor): ${d.toLocaleString("pt-BR")}`;
    }
  }
  return null;
}

export default function Home() {
  const [preset, setPreset] = useState<DatePreset>("mes");
  const [customRange, setCustomRange] = useState(() => getPresetRange("mes"));
  const [data, setData] = useState<FuncionariaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("atendidos");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [collectorHint, setCollectorHint] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (preset === "personalizado") return customRange;
    return getPresetRange(preset);
  }, [preset, customRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetchMetricas(dateRange.inicio, dateRange.fim),
      fetchUltimaAtualizacao(),
      fetchCollectStatus(),
    ]);

    const [metricasResult, ultimaResult, collectResult] = results;

    if (metricasResult.status === "fulfilled") {
      setData(metricasResult.value);
    } else {
      console.error(metricasResult.reason);
      setData([]);
      toast.error(getSupabaseFetchErrorMessage(metricasResult.reason));
    }

    if (ultimaResult.status === "fulfilled") {
      setLastUpdate(ultimaResult.value);
    } else {
      setLastUpdate(null);
    }

    if (collectResult.status === "fulfilled") {
      setCollectorHint(formatCollectorHint(collectResult.value));
    } else {
      setCollectorHint(null);
    }

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, f) => ({
        lead_novo: acc.lead_novo + f.lead_novo,
        recebido: acc.recebido + f.recebido,
        atendidos: acc.atendidos + f.atendidos,
      }),
      { lead_novo: 0, recebido: 0, atendidos: 0 }
    );
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      if (sortField === "nome") {
        cmp = a.nome.localeCompare(b.nome, "pt-BR");
      } else {
        cmp = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "nome" ? "asc" : "desc");
    }
  };

  const formattedUpdate = lastUpdate
    ? new Date(lastUpdate).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  const presets: { key: DatePreset; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "ontem", label: "Ontem" },
    { key: "7dias", label: "7 dias" },
    { key: "mes", label: "Este mês" },
    { key: "personalizado", label: "Personalizado" },
  ];

  const topRanked = sortedData.slice(0, 10);
  const maxAtendidos = sortedData[0]?.atendidos || 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isSupabaseConfigured() && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-b border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          role="status"
        >
          <AlertCircle className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
          <span>
            Configure <code className="px-1 rounded bg-amber-500/20 font-mono text-xs">VITE_SUPABASE_URL</code> e{" "}
            <code className="px-1 rounded bg-amber-500/20 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> no{" "}
            <code className="px-1 rounded bg-amber-500/20 font-mono text-xs">.env</code> na raiz do projeto e reinicie o
            servidor.
          </span>
        </div>
      )}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">W</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">WHU Dashboard</h1>
                <p className="text-xs text-muted-foreground">Leads por atendente</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => {
                    setPreset("personalizado");
                    setCustomRange((r) => ({ ...r, inicio: e.target.value }));
                  }}
                  className="text-sm bg-transparent outline-none w-[120px]"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="date"
                  value={dateRange.fim}
                  onChange={(e) => {
                    setPreset("personalizado");
                    setCustomRange((r) => ({ ...r, fim: e.target.value }));
                  }}
                  className="text-sm bg-transparent outline-none w-[120px]"
                />
              </div>

              <Button onClick={loadData} disabled={loading} size="sm" className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p.key)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    preset === p.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              {formattedUpdate && (
                <span className="text-xs text-emerald-600 font-medium">
                  Dados Supabase: {formattedUpdate}
                </span>
              )}
              {collectorHint && (
                <span className="text-xs text-muted-foreground font-medium">{collectorHint}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {dateRange.inicio === dateRange.fim
                ? formatDateBR(dateRange.inicio)
                : `${formatDateBR(dateRange.inicio)} até ${formatDateBR(dateRange.fim)}`}
            </span>
            <span className="text-sm font-medium text-primary">· {data.length} funcionárias</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold">Leads por funcionária</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[40px]">
                    #
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => handleSort("nome")}
                  >
                    <span className="flex items-center gap-1.5">
                      Nome <SortIcon field="nome" />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => handleSort("lead_novo")}
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      Novos <SortIcon field="lead_novo" />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => handleSort("recebido")}
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      Recebidos <SortIcon field="recebido" />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => handleSort("atendidos")}
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      Total <SortIcon field="atendidos" />
                    </span>
                  </th>
                  <th
                    className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => handleSort("percentual")}
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      % do total <SortIcon field="percentual" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={6} className="px-6 py-4">
                        <div
                          className="h-5 bg-secondary/60 rounded animate-pulse"
                          style={{
                            animationDelay: `${i * 80}ms`,
                            width: `${70 + (i % 3) * 10}%`,
                          }}
                        />
                      </td>
                    </tr>
                  ))
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <p className="text-muted-foreground font-medium">
                        Nenhum dado encontrado para este período
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure o .env (Supabase) ou execute o coletor (POST /api/collect).
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedData.map((func, i) => {
                    const color = getEmployeeColor(i);
                    return (
                      <tr
                        key={func.nome}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors animate-fade-in-up"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <td className="px-6 py-3.5 text-sm text-muted-foreground font-medium">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-semibold">{func.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: "#C4704B" }}
                          >
                            {func.lead_novo.toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: "#6B8F71" }}
                          >
                            {func.recebido.toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-bold tabular-nums">
                            {func.atendidos.toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {func.percentual.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {!loading && sortedData.length > 0 && (
                <tfoot>
                  <tr className="bg-secondary/40 font-bold">
                    <td className="px-6 py-3.5 text-sm">Σ</td>
                    <td className="px-4 py-3.5 text-sm">Total ({data.length} funcionárias)</td>
                    <td
                      className="px-4 py-3.5 text-right text-sm tabular-nums"
                      style={{ color: "#C4704B" }}
                    >
                      {totals.lead_novo.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className="px-4 py-3.5 text-right text-sm tabular-nums"
                      style={{ color: "#6B8F71" }}
                    >
                      {totals.recebido.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums">
                      {totals.atendidos.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                      100%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {!loading && sortedData.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mt-6">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold">Ranking de leads</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {topRanked.map((func, i) => {
                const color = getEmployeeColor(i);
                const barWidth = (func.atendidos / maxAtendidos) * 100;
                return (
                  <div key={func.nome} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 truncate font-medium">
                      {func.nome.split(" ")[0]}
                    </span>
                    <div className="flex-1 h-7 bg-secondary/60 rounded-md overflow-hidden relative">
                      <div
                        className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 ease-out"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: color,
                        }}
                      />
                      {barWidth > 20 && (
                        <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-bold text-white drop-shadow-sm">
                          {func.atendidos.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                    {barWidth <= 20 && (
                      <span className="text-xs font-bold" style={{ color }}>
                        {func.atendidos.toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="container py-4 text-center text-xs text-muted-foreground border-t border-border">
        WHU Dashboard · Dados: API WHU + Supabase
      </footer>
    </div>
  );
}
