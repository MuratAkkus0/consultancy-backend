import type { NextFunction, Request, Response } from "express";
import { invoicesService } from "./invoices.service.js";
import type { UuidParam } from "../../lib/validators.js";
import type {
  CreateInvoiceDTO,
  EditInvoiceDTO,
  InvoiceQuery,
} from "./invoices.types.js";

export const invoicesController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as unknown as CreateInvoiceDTO;
      const result = await invoicesService.create(data, req.user!.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  confirm: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const invoice = await invoicesService.confirmUpload(id);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = req.query as unknown as InvoiceQuery;
      const { data, total, summary } = await invoicesService.list(params);
      res.json({
        data,
        pagination: { page: params.page, limit: params.limit, total },
        summary,
      });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const invoice = await invoicesService.getById(id);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  },

  getDownloadUrl: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const result = await invoicesService.getDownloadUrl(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const data = req.body as unknown as EditInvoiceDTO;
      const invoice = await invoicesService.editById(id, data);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const invoice = await invoicesService.softDeleteById(id);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  },
};
