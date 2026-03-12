import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    const sql = postgres(url, { max: 1 });
    const db = drizzle(sql);
    console.log(`Running migrations (attempt ${attempt}/${MAX_RETRIES})...`);
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations complete.");
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error(`Migration attempt ${attempt} failed:`, err);
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

console.warn("Migrations failed after all retries. Starting server anyway.");
process.exit(0);
