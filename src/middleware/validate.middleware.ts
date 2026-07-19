import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import createHttpError from "http-errors";

export const validateBody = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw createHttpError(400, "Validation failed", {
        issues: result.error.issues,
      });
    }
    // Change request body with parsed and cleaned data
    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw createHttpError(400, "Validation failed", {
        issues: result.error.issues,
      });
    }
    // In Express 5 `req.query` is a getter-only property, so it cannot be
    // assigned directly; redefine it with the parsed and cleaned data.
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
};

export const validateParams = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw createHttpError(400, "Validation failed", {
        issues: result.error.issues,
      });
    }
    // Replace request params with parsed and cleaned data. Defined via
    // `Object.defineProperty` to stay consistent with `validateQuery`.
    Object.defineProperty(req, "params", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
};
