import { connect, type Connection } from "@lancedb/lancedb";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Thin wrapper around LanceDB (embedded vector DB, no separate server
 * process - it's just files on disk under data/lancedb/).
 *
 * One table per embedding model (see chunksTableName below): Ollama's
 * nomic-embed-text produces 768-dim vectors, OpenAI's text-embedding-3-small
 * produces 1536-dim vectors, and a LanceDB table has a fixed vector width.
 * Keeping one table per model means switching providers later never
 * corrupts or collides with existing embeddings - it just starts a fresh,
 * initially-empty table for the new model.
 */

export interface ChunkRow {
  id: string;
  conversationId: string;
  chunkOrder: number;
  text: string;
  startMessageId: string;
  endMessageId: string;
  tokenEstimate: number;
  createdAt: string;
  vector: number[];
}

export interface ChunkSearchResult extends Omit<ChunkRow, "vector"> {
  /** Lower = more similar. Cosine distance (1 - cosine similarity), 0-2 range. */
  distance: number;
}

let connectionPromise: Promise<Connection> | null = null;

/**
 * Finds the monorepo root by walking up from process.cwd() until we find
 * turbo.json. We deliberately don't use __dirname here: once Next.js
 * bundles this file for the server build, __dirname points somewhere
 * inside .next/server/, not the real package location on disk, which
 * would silently create a new lancedb/ folder inside the build output on
 * every build. process.cwd() (wherever `next dev`/`next start` was
 * launched from) is stable across dev and build.
 */
function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "turbo.json"))) return dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume cwd itself is fine (e.g. a standalone script run from
  // the repo root).
  return startDir;
}

function getDbDir(): string {
  const root = findWorkspaceRoot(process.cwd());
  return join(root, "data", "lancedb");
}

async function getConnection(): Promise<Connection> {
  if (!connectionPromise) {
    connectionPromise = connect(getDbDir());
  }
  return connectionPromise;
}

/** Sanitizes an embedding model name into a safe LanceDB table name. */
export function chunksTableName(embeddingModel: string): string {
  const safe = embeddingModel.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `chunks__${safe}`;
}

/**
 * Inserts one embedded chunk into the table for its embedding model,
 * creating the table (with the right vector width) on first use.
 */
export async function addChunkVector(embeddingModel: string, row: ChunkRow): Promise<void> {
  const db = await getConnection();
  const tableName = chunksTableName(embeddingModel);
  const existingNames = await db.tableNames();
  const rowData = [row] as unknown as Record<string, unknown>[];

  if (!existingNames.includes(tableName)) {
    await db.createTable(tableName, rowData);
    return;
  }

  const table = await db.openTable(tableName);
  await table.add(rowData);
}

/**
 * Removes any existing rows for a chunk id, then inserts the new one.
 * Used by the retry path so re-embedding a previously-failed chunk doesn't
 * leave duplicate rows behind.
 */
export async function upsertChunkVector(embeddingModel: string, row: ChunkRow): Promise<void> {
  const db = await getConnection();
  const tableName = chunksTableName(embeddingModel);
  const existingNames = await db.tableNames();
  const rowData = [row] as unknown as Record<string, unknown>[];

  if (!existingNames.includes(tableName)) {
    await db.createTable(tableName, rowData);
    return;
  }

  const table = await db.openTable(tableName);
  await table.delete(`id = '${row.id}'`);
  await table.add(rowData);
}

/**
 * Vector similarity search against the table for the given embedding
 * model. Returns the closest `limit` chunks, ranked by ascending distance.
 */
export async function searchChunks(
  embeddingModel: string,
  queryVector: number[],
  limit = 10
): Promise<ChunkSearchResult[]> {
  const db = await getConnection();
  const tableName = chunksTableName(embeddingModel);
  const existingNames = await db.tableNames();

  if (!existingNames.includes(tableName)) {
    return [];
  }

  const table = await db.openTable(tableName);
  // LanceDB defaults to L2 (Euclidean) distance, but embedding models
  // (nomic-embed-text, OpenAI's text-embedding-3-small) are trained and
  // evaluated for COSINE similarity. Using the default silently produces
  // rankings that are usually-but-not-reliably correct, so we pin it
  // explicitly rather than trust the default. table.search() is typed to
  // return Query | VectorQuery depending on the input; passing a plain
  // number[] always yields a VectorQuery, so this cast just narrows what
  // TypeScript already knows to be true at runtime.
  const vectorQuery = table.search(queryVector) as import("@lancedb/lancedb").VectorQuery;
  const results = await vectorQuery.distanceType("cosine").limit(limit).toArray();

  return results.map((r: any) => ({
    id: r.id,
    conversationId: r.conversationId,
    chunkOrder: r.chunkOrder,
    text: r.text,
    startMessageId: r.startMessageId,
    endMessageId: r.endMessageId,
    tokenEstimate: r.tokenEstimate,
    createdAt: r.createdAt,
    distance: r._distance,
  }));
}

/** Row count for a model's table, mainly for diagnostics/verification. */
export async function countChunkVectors(embeddingModel: string): Promise<number> {
  const db = await getConnection();
  const tableName = chunksTableName(embeddingModel);
  const existingNames = await db.tableNames();
  if (!existingNames.includes(tableName)) return 0;

  const table = await db.openTable(tableName);
  return table.countRows();
}
