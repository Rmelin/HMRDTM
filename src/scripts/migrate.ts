import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "../lib/db";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
migrate(db, { migrationsFolder });
console.log("Migrations applied");
