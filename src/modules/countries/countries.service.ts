import { eq } from "drizzle-orm";
import { countriesTable, db } from "../../db/index.js";

export const countriesService = {
  list: async () => {
    return db.query.countriesTable.findMany({
      where: eq(countriesTable.isActive, true),
      orderBy: (countries, { asc }) => [asc(countries.nameTr)],
      columns: { id: true, countryCode: true, nameEn: true, nameTr: true },
    });
  },
};
