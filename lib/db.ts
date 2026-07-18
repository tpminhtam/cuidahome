import fs from "fs";
import path from "path";
import { DB } from "./types";
import { buildSeed } from "./seed";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

let cache: DB | null = null;

export function getDB(): DB {
  if (cache) return cache;
  if (fs.existsSync(DB_PATH)) {
    cache = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DB;
    return cache;
  }
  cache = buildSeed();
  persist();
  return cache;
}

export function persist() {
  if (!cache) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 1));
  fs.renameSync(tmp, DB_PATH);
}

export function resetDB(): DB {
  cache = buildSeed();
  persist();
  return cache;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
