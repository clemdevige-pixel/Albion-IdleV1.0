import { createHash, randomBytes } from "node:crypto";
import { AuthSessionSchema, type AuthSession } from "@game/shared";
import type { Sql } from "postgres";
import type { DiscordOAuthFlowRepository } from "./DiscordOAuth.js";

interface StateRow { return_origin: string | null; }
interface ExchangeRow { session_payload: unknown; }

function hashOneTimeValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Shared, one-time Discord OAuth flow storage for multi-instance production servers. */
export class PostgresDiscordOAuthFlowStore implements DiscordOAuthFlowRepository {
  private constructor(private readonly sql: Sql) {}

  public static async create(sql: Sql): Promise<PostgresDiscordOAuthFlowStore> {
    const store = new PostgresDiscordOAuthFlowStore(sql);
    await store.initialize();
    return store;
  }

  public async issueState(now = Date.now()): Promise<string> {
    return this.issueStateInternal(undefined, now);
  }

  public async issueStateForOrigin(returnOrigin: string, now = Date.now()): Promise<string> {
    return this.issueStateInternal(returnOrigin, now);
  }

  public async consumeState(state: string, now = Date.now()): Promise<boolean> {
    const rows = await this.sql<{ value_hash: string }[]>`
      delete from auth_discord_states
      where value_hash = ${hashOneTimeValue(state)} and expires_at >= ${new Date(now).toISOString()}
      returning value_hash
    `;
    return rows.length === 1;
  }

  public async consumeStateWithOrigin(state: string, now = Date.now()): Promise<string | undefined> {
    const rows = await this.sql<StateRow[]>`
      delete from auth_discord_states
      where value_hash = ${hashOneTimeValue(state)} and expires_at >= ${new Date(now).toISOString()}
      returning return_origin
    `;
    return rows[0]?.return_origin ?? undefined;
  }

  public async issueExchange(session: AuthSession, now = Date.now()): Promise<string> {
    const code = randomBytes(32).toString("base64url");
    await this.sql`
      insert into auth_discord_exchanges (value_hash, session_payload, expires_at)
      values (
        ${hashOneTimeValue(code)},
        ${this.sql.json(session)},
        ${new Date(now + 60_000).toISOString()}
      )
    `;
    return code;
  }

  public async consumeExchange(code: string, now = Date.now()): Promise<AuthSession | undefined> {
    const rows = await this.sql<ExchangeRow[]>`
      delete from auth_discord_exchanges
      where value_hash = ${hashOneTimeValue(code)} and expires_at >= ${new Date(now).toISOString()}
      returning session_payload
    `;
    return rows[0] === undefined ? undefined : AuthSessionSchema.parse(rows[0].session_payload);
  }

  private async initialize(): Promise<void> {
    await this.sql`
      create table if not exists auth_discord_states (
        value_hash text primary key,
        expires_at timestamptz not null
      )
    `;
    await this.sql`alter table auth_discord_states add column if not exists return_origin text`;
    await this.sql`
      create table if not exists auth_discord_exchanges (
        value_hash text primary key,
        session_payload jsonb not null,
        expires_at timestamptz not null
      )
    `;
    await this.sql`create index if not exists auth_discord_states_expires_at_idx on auth_discord_states (expires_at)`;
    await this.sql`create index if not exists auth_discord_exchanges_expires_at_idx on auth_discord_exchanges (expires_at)`;
  }

  private async issueStateInternal(returnOrigin: string | undefined, now: number): Promise<string> {
    const state = randomBytes(24).toString("base64url");
    await this.sql`
      insert into auth_discord_states (value_hash, expires_at, return_origin)
      values (
        ${hashOneTimeValue(state)},
        ${new Date(now + 5 * 60_000).toISOString()},
        ${returnOrigin ?? null}
      )
    `;
    return state;
  }
}
