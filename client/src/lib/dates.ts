/**
 * Date utilities — períodos no fuso de referência (Brasil).
 */

export type DatePreset = "hoje" | "ontem" | "7dias" | "mes" | "personalizado";

function toBrasiliaWallClock(): Date {
  const now = new Date();
  const brasiliaOffsetMin = -3 * 60;
  const localOffsetMin = now.getTimezoneOffset();
  const diff = brasiliaOffsetMin - -localOffsetMin;
  return new Date(now.getTime() + diff * 60 * 1000);
}

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function getPresetRange(preset: DatePreset): { inicio: string; fim: string } {
  const hoje = toBrasiliaWallClock();

  switch (preset) {
    case "hoje":
      return { inicio: formatDate(hoje), fim: formatDate(hoje) };
    case "ontem": {
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      return { inicio: formatDate(ontem), fim: formatDate(ontem) };
    }
    case "7dias": {
      const seteDias = new Date(hoje);
      seteDias.setDate(seteDias.getDate() - 6);
      return { inicio: formatDate(seteDias), fim: formatDate(hoje) };
    }
    case "mes": {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: formatDate(inicioMes), fim: formatDate(hoje) };
    }
    default:
      return { inicio: formatDate(hoje), fim: formatDate(hoje) };
  }
}

export const EMPLOYEE_COLORS: string[] = [
  "#C4704B",
  "#6B8F71",
  "#D4A843",
  "#8B6F47",
  "#A0522D",
  "#7B9EA8",
  "#C77D5E",
  "#8FAE6E",
  "#B8860B",
  "#9C7C5B",
  "#6A8E7F",
  "#C08552",
  "#7D8471",
  "#A67B5B",
  "#8E735B",
  "#6B7F5E",
  "#B5724C",
];

export function getEmployeeColor(index: number): string {
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
}
