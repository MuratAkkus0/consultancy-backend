import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { coursesService } from "./courses.service.js";
import { isUniqueViolation } from "../../lib/service-helpers.js";
import type { UuidParam } from "../../lib/validators.js";
import type {
  CourseQuery,
  CreateCourseDTO,
  EditCourseDTO,
  EnrollStudentDTO,
} from "./courses.types.js";
import type { User } from "../../db/types.js";

export const coursesController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as unknown as CreateCourseDTO;
      const course = await coursesService.create(data);
      res.status(201).json(course);
    } catch (err) {
      next(err);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, consultantId } = req.query as unknown as CourseQuery;
      const { data, total } = await coursesService.list(
        page,
        limit,
        consultantId,
      );
      res.json({ data, pagination: { page, limit, total } });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const user = req.user as User;

      let course;
      if (user.role === "admin") {
        course = await coursesService.getById(id);
      } else if (user.role === "consultant") {
        course = await coursesService.getByIdForConsultant(user.id, id);
      }

      res.json(course);
    } catch (err) {
      next(err);
    }
  },

  editById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const data = req.body as unknown as EditCourseDTO;
      const user = req.user as User;

      let course;
      if (user.role === "admin") {
        course = await coursesService.editById(id, data);
      } else if (user.role === "consultant") {
        course = await coursesService.editByIdForConsultant(id, user.id, data);
      }

      res.json(course);
    } catch (err) {
      next(err);
    }
  },

  softDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const course = await coursesService.softDeleteById(id);
      res.json(course);
    } catch (err) {
      next(err);
    }
  },

  hardDeleteById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const course = await coursesService.hardDeleteById(id);
      res.json(course);
    } catch (err) {
      next(err);
    }
  },

  enrollStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as UuidParam;
      const { studentId } = req.body as unknown as EnrollStudentDTO;
      const enrollment = await coursesService.enrollStudent(id, studentId);
      res.status(201).json(enrollment);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return next(
          createHttpError(409, "Student is already enrolled in this course."),
        );
      }
      next(err);
    }
  },

  unenrollStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, studentId } = req.params as unknown as {
        id: string;
        studentId: string;
      };
      const enrollment = await coursesService.unenrollStudent(id, studentId);
      res.json(enrollment);
    } catch (err) {
      next(err);
    }
  },
};
