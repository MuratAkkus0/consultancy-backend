import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: result.error.issues });
    }
    // Change request body with parsed and cleaned data
    req.body = result.data;
    next();
  };
};
