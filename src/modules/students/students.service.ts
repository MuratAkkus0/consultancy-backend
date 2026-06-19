import { db, studentProfilesTable } from "../../db/index.js";

const userIdentityColumns = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
} as const;

export const studentsService = {
  list: async (page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.query.studentProfilesTable.findMany({
        limit,
        offset,
        orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
        with: {
          user: { columns: userIdentityColumns },
        },
      }),
      db.$count(studentProfilesTable),
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
