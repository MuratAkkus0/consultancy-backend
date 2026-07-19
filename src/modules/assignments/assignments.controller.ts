import type { NextFunction, Request, Response } from "express";
import type {
  AdminEditAssignmentDTO,
  AssignmentQuery,
  AssignStudentToConsultantDTO,
} from "./assignments.types.js";
import { assignmentsService } from "./assignments.service.js";
import type { UuidParam } from "../../lib/validators.js";
import createHttpError from "http-errors";
import { isUniqueViolation } from "../../lib/service-helpers.js";

export const assignmentsController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as AssignmentQuery;

      if ("consultantId" in query) {
        const data = await assignmentsService.getConsultantStudentsForAdmin(
          query.consultantId,
        );
        return res.json(data);
      }

      if ("studentId" in query) {
        const data = await assignmentsService.getStudentConsultantsForAdmin(
          query.studentId,
        );
        return res.json(data);
      }

      throw createHttpError(400, "studentId or consultantId must be provided.");
    } catch (err) {
      next(err);
    }
  },
  assignStudentToConsultant: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = req.body as unknown as AssignStudentToConsultantDTO;
      const assignment =
        await assignmentsService.assignStudentToConsultant(data);
      res.json(assignment);
    } catch (err) {
      if (isUniqueViolation(err)) {
        next(
          createHttpError(
            409,
            "Student is already assigned to this consultant.",
          ),
        );
      }
      next(err);
    }
  },
  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const data = req.body as unknown as AdminEditAssignmentDTO;
      const assignment = await assignmentsService.editByIdForAdmin(id, data);
      res.json(assignment);
    } catch (err) {
      next(err);
    }
  },
  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const assignment = await assignmentsService.softDeleteById(id);
      res.json(assignment);
    } catch (err) {
      next(err);
    }
  },
  hardDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const assignment = await assignmentsService.hardDeleteById(id);
      res.json(assignment);
    } catch (err) {
      next(err);
    }
  },
};
