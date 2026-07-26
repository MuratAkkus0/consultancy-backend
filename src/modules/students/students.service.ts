import { and, eq } from "drizzle-orm";
import { db, users } from "../../db/index.js";
import { userIdentityColumns } from "../../db/selections.js";

export const studentsService = {
  list: async (page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const where = and(eq(users.status, "active"), eq(users.role, "student"));

    const [data, total] = await Promise.all([
      db.query.users.findMany({
        limit,
        offset,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        where,
        with: {
          studentProfile: true,
        },
      }),
      db.$count(users, where),
    ]);

    return { data, total };
  },

  getById: async (id: string) => {
    const profile = await db.query.studentProfilesTable.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, id),
      with: {
        user: { columns: userIdentityColumns },
        targetCountries: { with: { country: true } },
        languages: { with: { language: true } },
      },
    });

    return profile ?? null;
  },
};
