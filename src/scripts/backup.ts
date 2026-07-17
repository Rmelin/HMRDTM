import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const source = path.resolve(process.env.DATABASE_PATH ?? "data/app.db");
const backupDir = path.resolve(process.env.BACKUP_DIR ?? "backups");
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `hmrdtm-${stamp}.sqlite3`);
const database = new Database(source, { readonly: true });
await database.backup(target);
database.close();
console.log(`Backup oprettet: ${target}`);
