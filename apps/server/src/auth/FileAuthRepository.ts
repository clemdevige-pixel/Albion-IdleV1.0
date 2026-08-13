import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { AccountSchema } from "@game/shared";
import type { AuthRepository, StoredAccount } from "./AuthRepository.js";

const StoredAccountSchema = AccountSchema.extend({
  passwordHash: z.string().min(1).optional(),
  discordId: z.string().min(1).optional(),
});

const StoredSessionSchema = z.object({
  accountId: z.string().uuid(),
  expiresAt: z.string().datetime(),
});

const AuthStoreSchema = z.object({
  version: z.literal(1),
  accounts: z.array(StoredAccountSchema),
  sessions: z.record(StoredSessionSchema),
});

interface AuthStore {
  version: 1;
  accounts: StoredAccount[];
  sessions: Record<string, { accountId: string; expiresAt: string }>;
}

function emptyStore(): AuthStore {
  return { version: 1, accounts: [], sessions: {} };
}

/**
 * Durable local adapter. It deliberately sits behind AuthRepository so a
 * database can replace it without changing routes or authentication rules.
 */
export class FileAuthRepository implements AuthRepository {
  private readonly ready: Promise<void>;
  private store: AuthStore = emptyStore();
  private mutationQueue: Promise<void> = Promise.resolve();

  public constructor(private readonly filePath: string) {
    this.ready = this.load();
  }

  public async findAccountByEmail(email: string): Promise<StoredAccount | undefined> {
    await this.awaitCurrentState();
    return this.store.accounts.find((account) => account.email === email);
  }

  public async findAccountById(accountId: string): Promise<StoredAccount | undefined> {
    await this.awaitCurrentState();
    return this.store.accounts.find((account) => account.id === accountId);
  }

  public async findAccountByDiscordId(discordId: string): Promise<StoredAccount | undefined> {
    await this.awaitCurrentState();
    return this.store.accounts.find((account) => account.discordId === discordId);
  }

  public async saveAccount(account: StoredAccount): Promise<void> {
    return this.mutate(() => {
      const index = this.store.accounts.findIndex((candidate) => candidate.id === account.id);
      if (index === -1) this.store.accounts.push(account);
      else this.store.accounts[index] = account;
    });
  }

  public async saveSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void> {
    return this.mutate(() => { this.store.sessions[tokenHash] = { accountId, expiresAt }; });
  }

  public async findSessionAccountId(tokenHash: string): Promise<string | undefined> {
    await this.awaitCurrentState();
    const session = this.store.sessions[tokenHash];
    if (session === undefined) return undefined;
    if (Date.parse(session.expiresAt) > Date.now()) return session.accountId;
    await this.deleteSession(tokenHash);
    return undefined;
  }

  public async deleteSession(tokenHash: string): Promise<void> {
    return this.mutate(() => { delete this.store.sessions[tokenHash]; });
  }

  private async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.store = AuthStoreSchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.store = emptyStore();
        return;
      }
      throw new Error(`Unable to load authentication store at ${this.filePath}`, { cause: error });
    }
  }

  private async awaitCurrentState(): Promise<void> {
    await this.ready;
    await this.mutationQueue;
  }

  private async mutate(change: () => void): Promise<void> {
    const operation = this.mutationQueue.then(async () => {
      await this.ready;
      change();
      await this.persist();
    });
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  private async persist(): Promise<void> {
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(this.store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, this.filePath);
  }
}
