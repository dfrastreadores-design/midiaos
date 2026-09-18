import { describe, it, expect } from "vitest";
import {
  sanitizePhone,
  sanitizeMessage,
  isValidWhatsappPhone,
  buildWhatsappUrl,
} from "./whatsapp-share";

describe("sanitizePhone", () => {
  it("mantém apenas dígitos e adiciona DDI 55 quando tem 10 dígitos (fixo)", () => {
    expect(sanitizePhone("(61) 3322-1100")).toBe("556133221100");
  });

  it("mantém apenas dígitos e adiciona DDI 55 quando tem 11 dígitos (celular)", () => {
    expect(sanitizePhone("(61) 99999-8888")).toBe("5561999998888");
  });

  it("remove espaços, hífens, parênteses e o sinal de +", () => {
    expect(sanitizePhone("+55 61 99999-8888")).toBe("5561999998888");
  });

  it("remove zeros à esquerda", () => {
    expect(sanitizePhone("0061999998888")).toBe("5561999998888");
  });

  it("preserva número internacional com 11+ dígitos após remover DDI curto", () => {
    // "+1 415 555 0132" → 11 dígitos → função assume BR e prefixa 55
    expect(sanitizePhone("+1 415 555 0132")).toBe("5514155550132");
  });

  it("mantém números longos (>11 dígitos) sem prefixar 55", () => {
    expect(sanitizePhone("+44 20 7946 0958")).toBe("442079460958");
  });

  it("retorna string vazia para null/undefined/vazio", () => {
    expect(sanitizePhone(null)).toBe("");
    expect(sanitizePhone(undefined)).toBe("");
    expect(sanitizePhone("")).toBe("");
  });
});

describe("isValidWhatsappPhone", () => {
  it.each([
    ["(61) 99999-8888", true],
    ["+55 61 99999-8888", true],
    ["+1 415 555 0132", true],
    ["61 3322-1100", true],
  ])("aceita %s", (input, expected) => {
    expect(isValidWhatsappPhone(input)).toBe(expected);
  });

  it.each([
    ["", false],
    ["abc", false],
    ["123", false],
    ["99999-8888", false], // sem DDD
    ["0000000000", false], // começa com 0 após sanitizar vira vazio
  ])("rejeita %s", (input, expected) => {
    expect(isValidWhatsappPhone(input)).toBe(expected);
  });
});

describe("sanitizeMessage", () => {
  it("trim e colapsa quebras de linha excessivas", () => {
    expect(sanitizeMessage("  olá\n\n\n\nmundo  ")).toBe("olá\n\nmundo");
  });

  it("remove caracteres de controle", () => {
    expect(sanitizeMessage("abc\u0000def")).toBe("abcdef");
  });

  it("limita a 4000 caracteres", () => {
    const big = "a".repeat(5000);
    const out = sanitizeMessage(big);
    expect(out.length).toBeLessThanOrEqual(4000);
    expect(out.endsWith("…")).toBe(true);
  });

  it("retorna vazio para null/undefined", () => {
    expect(sanitizeMessage(null)).toBe("");
    expect(sanitizeMessage(undefined)).toBe("");
  });
});

describe("buildWhatsappUrl (integração)", () => {
  it("monta URL wa.me com telefone formatado e mensagem codificada", () => {
    const url = buildWhatsappUrl("(61) 99999-8888", "Olá, tudo bem?");
    expect(url).toBe("https://wa.me/5561999998888?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });

  it("aceita telefone internacional longo sem prefixar 55", () => {
    const url = buildWhatsappUrl("+44 20 7946 0958", "hi");
    expect(url).toBe("https://wa.me/442079460958?text=hi");
  });

  it("gera URL sem número quando telefone é vazio ou totalmente não-numérico", () => {
    expect(buildWhatsappUrl("", "oi")).toBe("https://wa.me/?text=oi");
    // strings sem dígitos viram vazio → link genérico (sem lançar)
    expect(buildWhatsappUrl("abcxyz", "oi")).toBe("https://wa.me/?text=oi");
  });

  it("lança erro para telefone com dígitos insuficientes", () => {
    expect(() => buildWhatsappUrl("123", "oi")).toThrow(/Telefone inválido/);
    expect(() => buildWhatsappUrl("55 61 9999", "oi")).toThrow(/Telefone inválido/);
  });

  it("aplica sanitização de mensagem antes de codificar", () => {
    const url = buildWhatsappUrl("(61) 99999-8888", "  olá\n\n\n\nmundo  ");
    expect(url).toContain("text=ol%C3%A1%0A%0Amundo");
  });

  it("normaliza espaços/parênteses/hífens no telefone", () => {
    const a = buildWhatsappUrl("(61) 99999-8888", "x");
    const b = buildWhatsappUrl("+55 61 99999 8888", "x");
    expect(a).toBe(b);
  });
});
