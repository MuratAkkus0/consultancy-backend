import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  editInvoiceSchema,
  invoiceQuerySchema,
} from "./invoices.validators.js";

const base = {
  type: "expense",
  title: "Office rent",
  amount: 1200.5,
  invoiceDate: "2026-03-15T10:00:00Z",
  fileName: "rent.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
};

describe("createInvoiceSchema", () => {
  it("accepts an expense without a number and applies defaults", () => {
    const r = createInvoiceSchema.parse(base);
    expect(r.invoiceNumber).toBeUndefined();
    expect(r.currency).toBe("EUR");
    expect(r.amount).toBe("1200.50");
    expect(r.invoiceDate).toBeInstanceOf(Date);
  });

  it("rejects an income without a number", () => {
    const r = createInvoiceSchema.safeParse({ ...base, type: "income" });
    expect(r.success).toBe(false);
  });

  it.each(["", "   "])("treats %j as a missing number", (blank) => {
    const income = createInvoiceSchema.safeParse({
      ...base,
      type: "income",
      invoiceNumber: blank,
    });
    expect(income.success).toBe(false);

    const expense = createInvoiceSchema.parse({
      ...base,
      invoiceNumber: blank,
    });
    expect(expense.invoiceNumber).toBeUndefined();
  });

  it("trims the number and uppercases the currency", () => {
    const r = createInvoiceSchema.parse({
      ...base,
      type: "income",
      invoiceNumber: "  RE-2026-001 ",
      currency: "usd",
    });
    expect(r.invoiceNumber).toBe("RE-2026-001");
    expect(r.currency).toBe("USD");
  });

  it("rejects non-pdf, oversized files and non-positive amounts", () => {
    expect(
      createInvoiceSchema.safeParse({ ...base, mimeType: "image/png" }).success,
    ).toBe(false);
    expect(
      createInvoiceSchema.safeParse({
        ...base,
        sizeBytes: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
    expect(createInvoiceSchema.safeParse({ ...base, amount: 0 }).success).toBe(
      false,
    );
  });
});

describe("editInvoiceSchema", () => {
  it("requires at least one field", () => {
    expect(editInvoiceSchema.safeParse({}).success).toBe(false);
  });

  it("turns a blank number into null", () => {
    expect(editInvoiceSchema.parse({ invoiceNumber: " " }).invoiceNumber).toBe(
      null,
    );
  });

  it("rejects switching to income while clearing the number", () => {
    const r = editInvoiceSchema.safeParse({
      type: "income",
      invoiceNumber: null,
    });
    expect(r.success).toBe(false);
  });
});

describe("invoiceQuerySchema", () => {
  it("rejects month without year", () => {
    expect(invoiceQuerySchema.safeParse({ month: "3" }).success).toBe(false);
  });

  it("accepts year alone and year with month, coercing strings", () => {
    expect(invoiceQuerySchema.parse({ year: "2026" }).year).toBe(2026);
    const r = invoiceQuerySchema.parse({ year: "2026", month: "12" });
    expect(r.month).toBe(12);
    expect(r.page).toBe(1);
  });

  it("rejects out-of-range values", () => {
    expect(invoiceQuerySchema.safeParse({ year: "1999" }).success).toBe(false);
    expect(
      invoiceQuerySchema.safeParse({ year: "2026", month: "13" }).success,
    ).toBe(false);
  });
});
