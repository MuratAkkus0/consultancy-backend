import type { NextFunction, Request, Response } from "express";
import { meService } from "./me.service.js";
import type { User, UserRole } from "../../db/types.js";
import type { EditSelfDTO } from "./me.types.js";
import type { PaginationParams } from "../../lib/validators.js";
import { coursesService } from "../courses/courses.service.js";
import { paymentsService } from "../payments/payments.service.js";
import type { StudentPaymentQuery } from "../payments/payments.types.js";
import { applicationsService } from "../applications/applications.service.js";
import type { StudentApplicationQuery } from "../applications/applications.types.js";
import { appointmentsService } from "../appointments/appointments.service.js";
import type { StudentAppointmentQuery } from "../appointments/appointments.types.js";
import { assignmentsService } from "../assignments/assignments.service.js";
import { documentsService } from "../documents/documents.service.js";
import type {
  CreateDocumentDTO,
  MyDocumentQuery,
} from "../documents/documents.types.js";
import type { UuidParam } from "../../lib/validators.js";

export const meController = {
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await meService.getByUserId(req.user!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
  editProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.user!;
      const data = req.body as unknown as EditSelfDTO;
      const profile = await meService.editOwnProfile(
        id,
        role as UserRole,
        data,
      );
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  softDeleteMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.user!;
      const user = await meService.softDeleteById(id, role as UserRole);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  hardDeleteMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.user!;
      const user = await meService.hardDeleteById(id, role as UserRole);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  getCourses: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.user! as User;
      const { page, limit } = req.query as unknown as PaginationParams;
      let course;
      if (role === "student") {
        course = await coursesService.listForStudent(page, limit, id);
      } else if (role === "consultant") {
        course = await coursesService.listForConsultant(page, limit, id);
      }

      res.json({
        data: course?.data,
        pagination: { page, limit, total: course?.total },
      });
    } catch (err) {
      next(err);
    }
  },
  getApplications: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const params = req.query as unknown as StudentApplicationQuery;
      const { data, total } = await applicationsService.listForStudent(
        id,
        params,
      );
      res.json({
        data,
        pagination: { page: params.page, limit: params.limit, total },
      });
    } catch (err) {
      next(err);
    }
  },
  getAppointments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const params = req.query as unknown as StudentAppointmentQuery;
      const { data, total } = await appointmentsService.listForStudent(
        id,
        params,
      );
      res.json({
        data,
        pagination: { page: params.page, limit: params.limit, total },
      });
    } catch (err) {
      next(err);
    }
  },
  getPayments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const params = req.query as unknown as StudentPaymentQuery;
      const { data, total } = await paymentsService.listForStudent(id, params);
      res.json({
        data,
        pagination: { page: params.page, limit: params.limit, total },
      });
    } catch (err) {
      next(err);
    }
  },
  getAssignments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const { page, limit } = req.query as unknown as PaginationParams;

      const { data, total } = await assignmentsService.getStudentsForConsultant(
        id,
        page,
        limit,
      );

      res.json({
        data,
        pagination: { page, limit, total },
      });
    } catch (err) {
      next(err);
    }
  },
  getConsultant: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const consultant = await assignmentsService.getConsultantForStudent(id);
      res.json(consultant ?? null);
    } catch (err) {
      next(err);
    }
  },
  createDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const data = req.body as unknown as CreateDocumentDTO;
      const result = await documentsService.createForStudent(id, data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
  confirmDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId } = req.user! as User;
      const { id } = req.params as unknown as UuidParam;
      const document = await documentsService.confirmUploadForStudent(
        userId,
        id,
      );
      res.json(document);
    } catch (err) {
      next(err);
    }
  },
  getDocuments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user! as User;
      const params = req.query as unknown as MyDocumentQuery;
      const { data, total } = await documentsService.listForStudent(id, params);
      res.json({
        data,
        pagination: { page: params.page, limit: params.limit, total },
      });
    } catch (err) {
      next(err);
    }
  },
  getDocumentDownloadUrl: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id: userId } = req.user! as User;
      const { id } = req.params as unknown as UuidParam;
      const result = await documentsService.getDownloadUrlForStudent(
        userId,
        id,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
  deleteDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId } = req.user! as User;
      const { id } = req.params as unknown as UuidParam;
      const document = await documentsService.softDeleteByIdForStudent(
        userId,
        id,
      );
      res.json(document);
    } catch (err) {
      next(err);
    }
  },
};
