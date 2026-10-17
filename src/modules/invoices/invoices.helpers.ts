// Invoices are an accounting concept of a German agency, so calendar
// boundaries (month, year) are Berlin boundaries, not UTC ones.
export const INVOICE_TIME_ZONE = "Europe/Berlin";

const berlinParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: INVOICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

// Calendar year/month an instant falls into in Berlin time.
export const berlinYearMonth = (date: Date) => {
  const parts = berlinParts.formatToParts(date);
  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return { year: pick("year"), month: pick("month") };
};

// S3 key is server-generated; the year/month folders follow the invoice date
// so files are browsable per accounting period.
export const buildInvoiceKey = (invoiceDate: Date, id: string) => {
  const { year, month } = berlinYearMonth(invoiceDate);
  return `private/invoices/${year}/${month}/${id}.pdf`;
};

export interface CivilMonth {
  year: number;
  month: number;
}

// Half-open civil range [from, to) covering the requested year or month.
// Converting these Berlin-local month starts to instants is left to Postgres
// (AT TIME ZONE), which knows the DST rules.
export const periodRange = (
  year: number,
  month?: number,
): { from: CivilMonth; to: CivilMonth } => {
  if (month === undefined) {
    return {
      from: { year, month: 1 },
      to: { year: year + 1, month: 1 },
    };
  }
  return {
    from: { year, month },
    to:
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
  };
};

export const INCOME_NUMBER_CHECK = "invoices_income_requires_number_chk";

// Drizzle wraps the pg DatabaseError in DrizzleQueryError and keeps the
// original (with its `constraint` name) on `cause`, so walk the chain.
export const violatedConstraint = (err: unknown): string | undefined => {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }
  if ("constraint" in err && typeof err.constraint === "string") {
    return err.constraint;
  }
  return "cause" in err ? violatedConstraint(err.cause) : undefined;
};
