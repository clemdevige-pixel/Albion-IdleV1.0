import type { Account } from "@game/shared";

export interface StoredAccount extends Account {
  readonly passwordHash?: string | undefined;
  readonly discordId?: string | undefined;
}

/** Storage boundary. A durable adapter can replace the in-memory implementation. */
export interface AuthRepository {
  findAccountByEmail(email: string): Promise<StoredAccount | undefined>;
  findAccountById(accountId: string): Promise<StoredAccount | undefined>;
  findAccountByDiscordId(discordId: string): Promise<StoredAccount | undefined>;
  saveAccount(account: StoredAccount): Promise<void>;
  saveSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void>;
  findSessionAccountId(tokenHash: string): Promise<string | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly accountsById = new Map<string, StoredAccount>();
  private readonly accountIdsByEmail = new Map<string, string>();
  private readonly accountIdsByDiscordId = new Map<string, string>();
  private readonly sessions = new Map<string, { readonly accountId: string; readonly expiresAt: string }>();

  public findAccountByEmail(email: string): Promise<StoredAccount | undefined> {
    const id = this.accountIdsByEmail.get(email);
    return Promise.resolve(id === undefined ? undefined : this.accountsById.get(id));
  }

  public findAccountById(accountId: string): Promise<StoredAccount | undefined> {
    return Promise.resolve(this.accountsById.get(accountId));
  }

  public findAccountByDiscordId(discordId: string): Promise<StoredAccount | undefined> {
    const id = this.accountIdsByDiscordId.get(discordId);
    return Promise.resolve(id === undefined ? undefined : this.accountsById.get(id));
  }

  public saveAccount(account: StoredAccount): Promise<void> {
    this.accountsById.set(account.id, account);
    if (account.email !== null) this.accountIdsByEmail.set(account.email, account.id);
    if (account.discordId !== undefined) this.accountIdsByDiscordId.set(account.discordId, account.id);
    return Promise.resolve();
  }

  public saveSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void> {
    this.sessions.set(tokenHash, { accountId, expiresAt });
    return Promise.resolve();
  }

  public findSessionAccountId(tokenHash: string): Promise<string | undefined> {
    const session = this.sessions.get(tokenHash);
    if (session === undefined) return Promise.resolve(undefined);
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.sessions.delete(tokenHash);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(session.accountId);
  }

  public deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
    return Promise.resolve();
  }
}
