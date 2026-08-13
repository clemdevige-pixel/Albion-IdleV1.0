import type { Sql } from "postgres";
import type { AuthRepository, StoredAccount } from "./AuthRepository.js";

interface AccountRow {
  id: string;
  email: string | null;
  display_name: string;
  created_at: Date;
  password_hash: string | null;
  discord_id: string | null;
}

interface SessionRow { account_id: string; }

/** Durable production authentication store backed by PostgreSQL. */
export class PostgresAuthRepository implements AuthRepository {
  private constructor(private readonly sql: Sql) {}

  public static async create(sql: Sql): Promise<PostgresAuthRepository> {
    const repository = new PostgresAuthRepository(sql);
    await repository.initialize();
    return repository;
  }

  public async findAccountByEmail(email: string): Promise<StoredAccount | undefined> {
    const rows = await this.sql<AccountRow[]>`
      select id, email, display_name, created_at, password_hash, discord_id
      from auth_accounts where email = ${email} limit 1
    `;
    return this.mapAccount(rows[0]);
  }

  public async findAccountById(accountId: string): Promise<StoredAccount | undefined> {
    const rows = await this.sql<AccountRow[]>`
      select id, email, display_name, created_at, password_hash, discord_id
      from auth_accounts where id = ${accountId} limit 1
    `;
    return this.mapAccount(rows[0]);
  }

  public async findAccountByDiscordId(discordId: string): Promise<StoredAccount | undefined> {
    const rows = await this.sql<AccountRow[]>`
      select id, email, display_name, created_at, password_hash, discord_id
      from auth_accounts where discord_id = ${discordId} limit 1
    `;
    return this.mapAccount(rows[0]);
  }

  public async saveAccount(account: StoredAccount): Promise<void> {
    await this.sql`
      insert into auth_accounts (id, email, display_name, created_at, password_hash, discord_id)
      values (
        ${account.id}, ${account.email}, ${account.displayName}, ${account.createdAt},
        ${account.passwordHash ?? null}, ${account.discordId ?? null}
      )
      on conflict (id) do update set
        email = excluded.email,
        display_name = excluded.display_name,
        password_hash = excluded.password_hash,
        discord_id = excluded.discord_id
    `;
  }

  public async saveSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void> {
    await this.sql`
      insert into auth_sessions (token_hash, account_id, expires_at)
      values (${tokenHash}, ${accountId}, ${expiresAt})
      on conflict (token_hash) do update set
        account_id = excluded.account_id,
        expires_at = excluded.expires_at
    `;
  }

  public async findSessionAccountId(tokenHash: string): Promise<string | undefined> {
    const rows = await this.sql<SessionRow[]>`
      delete from auth_sessions
      where token_hash = ${tokenHash} and expires_at <= now()
    `;
    void rows;
    const active = await this.sql<SessionRow[]>`
      select account_id from auth_sessions
      where token_hash = ${tokenHash} and expires_at > now()
      limit 1
    `;
    return active[0]?.account_id;
  }

  public async deleteSession(tokenHash: string): Promise<void> {
    await this.sql`delete from auth_sessions where token_hash = ${tokenHash}`;
  }

  private async initialize(): Promise<void> {
    await this.sql`
      create table if not exists auth_accounts (
        id uuid primary key,
        email text unique,
        display_name varchar(24) not null,
        created_at timestamptz not null,
        password_hash text,
        discord_id text unique
      )
    `;
    await this.sql`
      create table if not exists auth_sessions (
        token_hash text primary key,
        account_id uuid not null references auth_accounts(id) on delete cascade,
        expires_at timestamptz not null
      )
    `;
    await this.sql`create index if not exists auth_sessions_expires_at_idx on auth_sessions (expires_at)`;
  }

  private mapAccount(row: AccountRow | undefined): StoredAccount | undefined {
    if (row === undefined) return undefined;
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at.toISOString(),
      ...(row.password_hash === null ? {} : { passwordHash: row.password_hash }),
      ...(row.discord_id === null ? {} : { discordId: row.discord_id }),
    };
  }
}
