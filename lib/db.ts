import { neon } from "@neondatabase/serverless";
import { setupDatabase } from "./schema";

const client = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
let setup: Promise<void> | null = null;

// A tagged-template proxy: every query first awaits table setup (once per
// server instance), then runs normally. null when DATABASE_URL isn't set.
export const sql = client
  ? (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      setup ??= setupDatabase(client);
      await setup;
      return (client as any)(strings, ...values);
    })
  : null;
