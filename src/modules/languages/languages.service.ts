import { db } from "../../db/index.js";

export const languagesService = {
  list: async () => {
    return db.query.languagesTable.findMany({
      orderBy: (languages, { asc }) => [asc(languages.name)],
      columns: { id: true, name: true },
    });
  },
};
