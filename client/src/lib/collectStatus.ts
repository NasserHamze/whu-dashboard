/** Resposta de GET /api/collect/status (sem segredo). */

export interface CollectStatusResponse {
  status: string;
  collectorRunning: boolean;
  runningForMinutes: number | null;
  lastRun: string | null;
  lastResult: unknown;
}

/** Mesma origem que o app (dev: servidor + Vite; prod: Express estático). */
export async function fetchCollectStatus(): Promise<CollectStatusResponse | null> {
  try {
    const res = await fetch("/api/collect/status");
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object") return null;
    return body as CollectStatusResponse;
  } catch {
    return null;
  }
}
