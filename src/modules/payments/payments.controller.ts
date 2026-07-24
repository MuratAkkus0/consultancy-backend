import type { NextFunction, Request, Response } from "express";
import { paymentsService } from "./payments.service.js";
import type { UuidParam } from "../../lib/validators.js";
import type {
  CreatePaymentDTO,
  EditPaymentDTO,
  PaymentQuery,
  RevenueQuery,
} from "./payments.types.js";

export const paymentsController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as unknown as CreatePaymentDTO;
      const payment = await paymentsService.create(data, req.user!.id);
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = req.query as unknown as PaymentQuery;
      const { data, total } = await paymentsService.list(params);
      res.json({
        data,
        pagination: { page: params.page, limit: params.limit, total },
      });
    } catch (err) {
      next(err);
    }
  },

  revenue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as RevenueQuery;
      const data = await paymentsService.revenue(query);
      res.json({ period: query.period, data });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const payment = await paymentsService.getById(id);
      res.json(payment);
    } catch (err) {
      next(err);
    }
  },

  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const data = req.body as unknown as EditPaymentDTO;
      const payment = await paymentsService.editById(id, data);
      res.json(payment);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const payment = await paymentsService.softDeleteById(id);
      res.json(payment);
    } catch (err) {
      next(err);
    }
  },
};
