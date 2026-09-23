import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), "storage");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "documents";

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Saves a file under a logical prefix (e.g. a document id) and returns the
 * storage key used to retrieve it later. Uses Supabase Storage when
 * configured, otherwise falls back to the local `storage/` directory so the
 * app is fully usable without any cloud account during local development.
 */
export async function saveFile(
  prefix: string,
  filename: string,
  data: Buffer
): Promise<string> {
  const key = `${prefix}/${randomUUID()}-${filename}`;

  if (isSupabaseConfigured()) {
    const { getSupabaseClient } = await import("./supabase");
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(BUCKET).upload(key, data, {
      upsert: false,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return key;
  }

  const fullPath = path.join(LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, data);
  return key;
}

export async function readFile(key: string): Promise<Buffer> {
  if (isSupabaseConfigured()) {
    const { getSupabaseClient } = await import("./supabase");
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) {
      throw new Error(`Supabase download failed: ${error?.message ?? "unknown error"}`);
    }
    return Buffer.from(await data.arrayBuffer());
  }

  const fullPath = path.join(LOCAL_STORAGE_DIR, key);
  return fs.readFile(fullPath);
}
