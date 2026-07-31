import { db, closeDb, languagesTable } from "../src/db/index.js";

// Common world languages (English names). Kept to a practical dropdown-sized
// set rather than the full ISO 639 list. Extend this array and re-run; the
// script only inserts names that aren't already present.
const LANGUAGES = [
  "English",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Portuguese",
  "Dutch",
  "Russian",
  "Turkish",
  "Arabic",
  "Chinese (Mandarin)",
  "Japanese",
  "Korean",
  "Hindi",
  "Bengali",
  "Urdu",
  "Persian (Farsi)",
  "Greek",
  "Polish",
  "Ukrainian",
  "Romanian",
  "Hungarian",
  "Czech",
  "Slovak",
  "Bulgarian",
  "Serbian",
  "Croatian",
  "Bosnian",
  "Albanian",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Icelandic",
  "Irish",
  "Welsh",
  "Catalan",
  "Basque",
  "Hebrew",
  "Kurdish",
  "Azerbaijani",
  "Armenian",
  "Georgian",
  "Kazakh",
  "Uzbek",
  "Turkmen",
  "Mongolian",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino (Tagalog)",
  "Tamil",
  "Telugu",
  "Punjabi",
  "Marathi",
  "Gujarati",
  "Swahili",
  "Amharic",
  "Yoruba",
  "Zulu",
  "Afrikaans",
];

const existing = await db.query.languagesTable.findMany({
  columns: { name: true },
});
const existingNames = new Set(existing.map((language) => language.name));

const toInsert = LANGUAGES.filter((name) => !existingNames.has(name)).map(
  (name) => ({ name }),
);

if (toInsert.length === 0) {
  console.log("All languages already present. Nothing to do.");
} else {
  await db.insert(languagesTable).values(toInsert);
  console.log(`Inserted ${toInsert.length} languages.`);
}

await closeDb();
