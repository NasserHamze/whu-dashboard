import { describe, expect, it } from "vitest";
import { analyzeSystemMessages } from "./whu-collector";

describe("analyzeSystemMessages", () => {
  it("classifica Chat assumido por como lead_novo", () => {
    const messages = [
      { isSystemMessage: true, text: "Chat iniciado por: CLIENTE" },
      {
        isSystemMessage: true,
        text: "Chat transferido ao setor: Clinica da família, por: BOT",
      },
      {
        isSystemMessage: true,
        text: "Chat assumido por: Anna Melo (Atendente Treinamento)",
      },
    ];

    const result = analyzeSystemMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      funcionaria: "Anna Melo (Atendente Treinamento)",
      tipo: "lead_novo",
    });
  });

  it("transferência ROLETA é lead_novo", () => {
    const messages = [
      { isSystemMessage: true, text: "Chat iniciado por: CLIENTE" },
      {
        isSystemMessage: true,
        text:
          "Chat transferido para o usuário: Vitoria Ferreira (Confirmação) no setor: Clinica da família, por: ROLETA",
      },
    ];

    const result = analyzeSystemMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0]?.tipo).toBe("lead_novo");
  });

  it("transferência de funcionária é recebido", () => {
    const messages = [
      { isSystemMessage: true, text: "Chat iniciado por: CLIENTE" },
      {
        isSystemMessage: true,
        text: "Chat transferido ao setor: Clinica da família, por: BOT",
      },
      {
        isSystemMessage: true,
        text: "Chat assumido por: Anna Melo (Atendente Treinamento)",
      },
      {
        isSystemMessage: true,
        text:
          "Chat transferido para o usuário: GIOVANA RENATA (SMART CARD) no setor: Clinica da família, por: Anna Melo (Atendente Treinamento)",
      },
    ];

    const result = analyzeSystemMessages(messages);
    const recebido = result.filter((r) => r.tipo === "recebido");
    expect(recebido.length).toBeGreaterThanOrEqual(1);
    expect(recebido[0]?.funcionaria).toContain("GIOVANA");
  });
});
