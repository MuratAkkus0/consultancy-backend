import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import createHttpError from "http-errors";
import { appointmentsTable, db, users } from "../../db/index.js";
import { userIdentityColumns } from "../../db/selections.js";
import type {
  AppointmentQuery,
  ConsultantCreateAppointmentDTO,
  ConsultantEditAppointmentDTO,
  CreateAppointmentDTO,
  EditAppointmentDTO,
  StudentAppointmentQuery,
} from "./appointments.types.js";

// Ensures the given id belongs to an active consultant, otherwise 404.
const assertActiveConsultant = async (consultantId: string) => {
  const consultant = await db.query.users.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, consultantId),
        eq(table.role, "consultant"),
        eq(table.status, "active"),
      ),
    columns: { id: true },
  });

  if (!consultant) {
    throw createHttpError(404, "Consultant not found.");
  }
};

// Ensures the given id belongs to an active student, otherwise 404.
const assertActiveStudent = async (studentId: string) => {
  const student = await db.query.users.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.id, studentId),
        eq(table.role, "student"),
        eq(table.status, "active"),
      ),
    columns: { id: true },
  });

  if (!student) {
    throw createHttpError(404, "Student not found.");
  }
};

// Ensures the student is actively assigned to this consultant. A consultant may
// only schedule appointments with their own students, otherwise 403.
const assertStudentAssignedToConsultant = async (
  consultantId: string,
  studentId: string,
) => {
  const assignment = await db.query.consultantAssignmentsTable.findFirst({
    where: (table, { eq, and, isNull }) =>
      and(
        eq(table.consultantId, consultantId),
        eq(table.studentId, studentId),
        isNull(table.deletedAt),
      ),
    columns: { id: true },
  });

  if (!assignment) {
    throw createHttpError(403, "Student is not assigned to you.");
  }
};

// `scheduledAt` is unique per consultant but not across consultants, so the
// admin list can still contain equal timestamps. createdAt is appended as a
// stable tiebreaker to keep pagination deterministic.
const orderBySchedule = (table: typeof appointmentsTable) => [
  asc(table.scheduledAt),
  desc(table.createdAt),
];

// A transaction handle (what db.transaction passes to its callback).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Either the root db or a transaction handle, so a caller (e.g. the assignments
// module) can run an operation inside its own transaction.
type DbExecutor = typeof db | Tx;

// Serialises bookings per consultant: two concurrent transactions locking the
// same consultant row queue up, so both can never pass the overlap check at
// the same time. Same pattern as the capacity check in assignments.
const lockConsultantRow = async (tx: Tx, consultantId: string) => {
  await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, consultantId))
    .for("update");
};

// Finds an active appointment of the consultant overlapping the given window.
// Two windows [startA, endA) and [startB, endB) overlap when
// startA < endB AND startB < endA. `excludeId` skips the appointment itself.
const findOverlap = async (
  executor: DbExecutor,
  consultantId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeId?: string,
) => {
  const newEnd = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  const conditions: SQL[] = [
    eq(appointmentsTable.consultantId, consultantId),
    isNull(appointmentsTable.deletedAt),
    // existing.start < new.end
    lt(appointmentsTable.scheduledAt, newEnd),
    // existing.end > new.start
    sql`${appointmentsTable.scheduledAt} + make_interval(mins => ${appointmentsTable.durationMinutes}) > ${scheduledAt}`,
  ];
  if (excludeId) conditions.push(ne(appointmentsTable.id, excludeId));

  const [conflict] = await executor
    .select({ id: appointmentsTable.id })
    .from(appointmentsTable)
    .where(and(...conditions))
    .limit(1);

  return conflict;
};

// Rejects the booking when it overlaps another active appointment of the same
// consultant. Must run AFTER lockConsultantRow within the same transaction.
const assertNoOverlap = async (
  tx: Tx,
  consultantId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeId?: string,
) => {
  const conflict = await findOverlap(
    tx,
    consultantId,
    scheduledAt,
    durationMinutes,
    excludeId,
  );

  if (conflict) {
    throw createHttpError(
      409,
      "Consultant already has an appointment in this time range.",
    );
  }
};

export const appointmentsService = {
  // Admin path: names both parties, so both are validated as active. An admin is
  // not constrained by consultant/student assignments.
  create: async (data: CreateAppointmentDTO) => {
    await Promise.all([
      assertActiveConsultant(data.consultantId),
      assertActiveStudent(data.studentId),
    ]);

    return db.transaction(async (tx) => {
      await lockConsultantRow(tx, data.consultantId);
      await assertNoOverlap(
        tx,
        data.consultantId,
        data.scheduledAt,
        data.durationMinutes,
      );

      const [appointment] = await tx
        .insert(appointmentsTable)
        .values(data)
        .returning();

      return appointment;
    });
  },

  // Consultant path: the consultant schedules under their own id and may only do
  // so with a student actively assigned to them.
  createForConsultant: async (
    consultantId: string,
    data: ConsultantCreateAppointmentDTO,
  ) => {
    await assertActiveStudent(data.studentId);
    await assertStudentAssignedToConsultant(consultantId, data.studentId);

    return db.transaction(async (tx) => {
      await lockConsultantRow(tx, consultantId);
      await assertNoOverlap(
        tx,
        consultantId,
        data.scheduledAt,
        data.durationMinutes,
      );

      const [appointment] = await tx
        .insert(appointmentsTable)
        .values({ ...data, consultantId })
        .returning();

      return appointment;
    });
  },

  list: async (params: AppointmentQuery) => {
    const { page, limit, studentId, consultantId, from, to } = params;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [isNull(appointmentsTable.deletedAt)];
    if (studentId) conditions.push(eq(appointmentsTable.studentId, studentId));
    if (consultantId)
      conditions.push(eq(appointmentsTable.consultantId, consultantId));
    if (from) conditions.push(gte(appointmentsTable.scheduledAt, from));
    if (to) conditions.push(lte(appointmentsTable.scheduledAt, to));
    const where = and(...conditions);

    const [data, total] = await Promise.all([
      db.query.appointmentsTable.findMany({
        limit,
        offset,
        where,
        orderBy: orderBySchedule(appointmentsTable),
        with: {
          student: { columns: userIdentityColumns },
          consultant: { columns: userIdentityColumns },
        },
      }),
      db.$count(appointmentsTable, where),
    ]);

    return { data, total };
  },

  // A consultant only ever sees appointments they own; the session id is forced
  // into the filter, so a `consultantId` query param can never widen the scope.
  listForConsultant: async (consultantId: string, params: AppointmentQuery) => {
    const { page, limit, studentId, from, to } = params;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      isNull(appointmentsTable.deletedAt),
      eq(appointmentsTable.consultantId, consultantId),
    ];
    if (studentId) conditions.push(eq(appointmentsTable.studentId, studentId));
    if (from) conditions.push(gte(appointmentsTable.scheduledAt, from));
    if (to) conditions.push(lte(appointmentsTable.scheduledAt, to));
    const where = and(...conditions);

    const [data, total] = await Promise.all([
      db.query.appointmentsTable.findMany({
        limit,
        offset,
        where,
        orderBy: orderBySchedule(appointmentsTable),
        with: {
          student: { columns: userIdentityColumns },
        },
      }),
      db.$count(appointmentsTable, where),
    ]);

    return { data, total };
  },

  getById: async (id: string) => {
    const appointment = await db.query.appointmentsTable.findFirst({
      where: and(
        eq(appointmentsTable.id, id),
        isNull(appointmentsTable.deletedAt),
      ),
      with: {
        student: { columns: userIdentityColumns },
        consultant: { columns: userIdentityColumns },
      },
    });

    if (!appointment) {
      throw createHttpError(404, "Appointment not found.");
    }

    return appointment;
  },

  getByIdForConsultant: async (consultantId: string, id: string) => {
    const appointment = await db.query.appointmentsTable.findFirst({
      where: and(
        eq(appointmentsTable.id, id),
        eq(appointmentsTable.consultantId, consultantId),
        isNull(appointmentsTable.deletedAt),
      ),
      with: {
        student: { columns: userIdentityColumns },
      },
    });

    if (!appointment) {
      throw createHttpError(404, "Appointment not found.");
    }

    return appointment;
  },

  editById: async (id: string, data: EditAppointmentDTO) => {
    // Reassigning to a new consultant must still land on an active one.
    if (data.consultantId) {
      await assertActiveConsultant(data.consultantId);
    }

    return db.transaction(async (tx) => {
      // The overlap rule applies to the FINAL (consultant, start, duration)
      // triple, so merge the patch over the current row first.
      const current = await tx.query.appointmentsTable.findFirst({
        where: and(
          eq(appointmentsTable.id, id),
          isNull(appointmentsTable.deletedAt),
        ),
        columns: {
          consultantId: true,
          scheduledAt: true,
          durationMinutes: true,
        },
      });

      if (!current) {
        throw createHttpError(404, "Appointment not found.");
      }

      const timingChanged =
        data.consultantId !== undefined ||
        data.scheduledAt !== undefined ||
        data.durationMinutes !== undefined;

      if (timingChanged) {
        const consultantId = data.consultantId ?? current.consultantId;
        await lockConsultantRow(tx, consultantId);
        await assertNoOverlap(
          tx,
          consultantId,
          data.scheduledAt ?? current.scheduledAt,
          data.durationMinutes ?? current.durationMinutes,
          id,
        );
      }

      const [appointment] = await tx
        .update(appointmentsTable)
        .set(data)
        .where(
          and(
            eq(appointmentsTable.id, id),
            isNull(appointmentsTable.deletedAt),
          ),
        )
        .returning();

      if (!appointment) {
        throw createHttpError(404, "Appointment not found.");
      }

      return appointment;
    });
  },

  editByIdForConsultant: async (
    id: string,
    consultantId: string,
    data: ConsultantEditAppointmentDTO,
  ) => {
    return db.transaction(async (tx) => {
      // The overlap rule applies to the FINAL (start, duration) pair, so merge
      // the patch over the current row first (scoped to the owning consultant).
      const current = await tx.query.appointmentsTable.findFirst({
        where: and(
          eq(appointmentsTable.id, id),
          eq(appointmentsTable.consultantId, consultantId),
          isNull(appointmentsTable.deletedAt),
        ),
        columns: { scheduledAt: true, durationMinutes: true },
      });

      if (!current) {
        throw createHttpError(404, "Appointment not found.");
      }

      const timingChanged =
        data.scheduledAt !== undefined || data.durationMinutes !== undefined;

      if (timingChanged) {
        await lockConsultantRow(tx, consultantId);
        await assertNoOverlap(
          tx,
          consultantId,
          data.scheduledAt ?? current.scheduledAt,
          data.durationMinutes ?? current.durationMinutes,
          id,
        );
      }

      const [appointment] = await tx
        .update(appointmentsTable)
        .set(data)
        .where(
          and(
            eq(appointmentsTable.id, id),
            eq(appointmentsTable.consultantId, consultantId),
            isNull(appointmentsTable.deletedAt),
          ),
        )
        .returning();

      if (!appointment) {
        throw createHttpError(404, "Appointment not found.");
      }

      return appointment;
    });
  },

  // The student's own appointments, with the consultant's identity attached.
  listForStudent: async (studentId: string, params: StudentAppointmentQuery) => {
    const { page, limit, from, to } = params;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      isNull(appointmentsTable.deletedAt),
      eq(appointmentsTable.studentId, studentId),
    ];
    if (from) conditions.push(gte(appointmentsTable.scheduledAt, from));
    if (to) conditions.push(lte(appointmentsTable.scheduledAt, to));
    const where = and(...conditions);

    const [data, total] = await Promise.all([
      db.query.appointmentsTable.findMany({
        limit,
        offset,
        where,
        orderBy: orderBySchedule(appointmentsTable),
        with: {
          consultant: { columns: userIdentityColumns },
        },
      }),
      db.$count(appointmentsTable, where),
    ]);

    return { data, total };
  },

  // Hands the student's FUTURE appointments over to their newly assigned
  // consultant. Past appointments stay with whoever actually held them —
  // moving them would falsify history. A future appointment that clashes with
  // the new consultant's calendar cannot be transferred without breaking the
  // no-overlap invariant, so it is cancelled (soft-deleted) instead.
  // Called by the assignments module inside its transaction, AFTER it has
  // locked the new consultant's row, so the overlap checks are race-safe.
  reassignFutureForStudent: async (
    studentId: string,
    consultantId: string,
    executor: DbExecutor = db,
  ) => {
    const future = await executor
      .select({
        id: appointmentsTable.id,
        scheduledAt: appointmentsTable.scheduledAt,
        durationMinutes: appointmentsTable.durationMinutes,
      })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.studentId, studentId),
          isNull(appointmentsTable.deletedAt),
          gte(appointmentsTable.scheduledAt, new Date()),
        ),
      );

    // The student's own appointments never overlap each other (they all lived
    // on one consultant's conflict-free calendar), so checking each one only
    // against the NEW consultant's calendar is sufficient.
    const transferredIds: string[] = [];
    const cancelledIds: string[] = [];
    for (const appointment of future) {
      const conflict = await findOverlap(
        executor,
        consultantId,
        appointment.scheduledAt,
        appointment.durationMinutes,
      );
      (conflict ? cancelledIds : transferredIds).push(appointment.id);
    }

    if (transferredIds.length) {
      await executor
        .update(appointmentsTable)
        .set({ consultantId })
        .where(inArray(appointmentsTable.id, transferredIds));
    }
    if (cancelledIds.length) {
      await executor
        .update(appointmentsTable)
        .set({ deletedAt: new Date() })
        .where(inArray(appointmentsTable.id, cancelledIds));
    }

    return { transferred: transferredIds.length, cancelled: cancelledIds.length };
  },

  softDeleteById: async (id: string) => {
    const [appointment] = await db
      .update(appointmentsTable)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(appointmentsTable.id, id), isNull(appointmentsTable.deletedAt)),
      )
      .returning();

    if (!appointment) {
      throw createHttpError(404, "Appointment not found.");
    }

    return appointment;
  },

  hardDeleteById: async (id: string) => {
    const [appointment] = await db
      .delete(appointmentsTable)
      .where(eq(appointmentsTable.id, id))
      .returning();

    if (!appointment) {
      throw createHttpError(404, "Appointment not found.");
    }

    return appointment;
  },
};
