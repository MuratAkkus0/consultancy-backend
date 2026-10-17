import { describe, expect, it } from "vitest";
import {
  berlinYearMonth,
  buildInvoiceKey,
  periodRange,
  violatedConstraint,
} from "./invoices.helpers.js";

describe("periodRange", () => {
  it("covers a single month as a half-open range", () => {
    expect(periodRange(2026, 3)).toEqual({
      from: { year: 2026, month: 3 },
      to: { year: 2026, month: 4 },
    });
  });

  it("rolls December over into the next year", () => {
    expect(periodRange(2026, 12).to).toEqual({ year: 2027, month: 1 });
  });

  it("covers a whole year when no month is given", () => {
    expect(periodRange(2026)).toEqual({
      from: { year: 2026, month: 1 },
      to: { year: 2027, month: 1 },
    });
  });
});

describe("berlinYearMonth", () => {
  it("uses Berlin month boundaries, not UTC", () => {
    // 23:30 UTC on Jan 31 is already Feb 1 in Berlin (UTC+1)
    expect(berlinYearMonth(new Date("2026-01-31T23:30:00Z"))).toEqual({
      year: "2026",
      month: "02",
    });
    // 22:30 UTC on Jun 30 is already Jul 1 in Berlin (UTC+2, summer time)
    expect(berlinYearMonth(new Date("2026-06-30T22:30:00Z"))).toEqual({
      year: "2026",
      month: "07",
    });
    expect(berlinYearMonth(new Date("2026-06-30T21:30:00Z")).month).toBe("06");
  });

  it("rolls the year at Berlin new year", () => {
    expect(berlinYearMonth(new Date("2025-12-31T23:00:00Z"))).toEqual({
      year: "2026",
      month: "01",
    });
  });
});

describe("buildInvoiceKey", () => {
  it("places the file under the Berlin year/month of the invoice date", () => {
    expect(buildInvoiceKey(new Date("2026-01-31T23:30:00Z"), "abc")).toBe(
      "private/invoices/2026/02/abc.pdf",
    );
  });
});

describe("violatedConstraint", () => {
  it("reads the constraint from a nested cause", () => {
    const pg = { code: "23505", constraint: "invoices_invoice_number_unique" };
    expect(violatedConstraint({ cause: pg })).toBe(
      "invoices_invoice_number_unique",
    );
  });

  it("returns undefined when there is none", () => {
    expect(violatedConstraint(new Error("boom"))).toBeUndefined();
    expect(violatedConstraint(null)).toBeUndefined();
  });
});
