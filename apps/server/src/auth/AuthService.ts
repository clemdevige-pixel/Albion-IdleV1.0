import { createHash, randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Account, AuthSession, LoginRequest, RegisterRequest } from "@game/shared";
import type { AuthRepository, StoredAccount } from "./AuthRepository.js";

const scrypt = promisify(nodeScrypt);
const HASH_BYTES = 64;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60_000;

export type AuthFailureCode = "EMAIL_ALREADY_USED" | "INVALID_CREDENTIALS" | "UNAUTHORIZED" | "OAUTH_FAILED";

export interface DiscordIdentity {
  readonly id: string;
  readonly username: string;
  readonly globalName?: string | null;
  readonly email?: string | null;
  readonly emailVerified: boolean;
}

export class AuthFailure extends Error {
  public constructor(public readonly code: AuthFailureCode, message: string) {
    super(message);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, HASH_BYTES) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, expectedHex] = storedHash.split(":");
  if (salt === undefined || expectedHex === undefined) return false;
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== HASH_BYTES) return false;
  const actual = await scrypt(password, salt, HASH_BYTES) as Buffer;
  return timingSafeEqual(expected, actual);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function publicAccount(account: StoredAccount): Account {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
}

export class AuthService {
  public constructor(private readonly repository: AuthRepository) {}

  public async register(input: RegisterRequest): Promise<AuthSession> {
    const email = normalizeEmail(input.email);
    if (await this.repository.findAccountByEmail(email) !== undefined) {
      throw new AuthFailure("EMAIL_ALREADY_USED", "Un compte utilise déjà cette adresse.");
    }

    const account: StoredAccount = {
      id: randomUUID(),
      email,
      displayName: input.displayName.trim(),
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(input.password),
    };
    await this.repository.saveAccount(account);
    return this.createSession(account);
  }

  public async login(input: LoginRequest): Promise<AuthSession> {
    const account = await this.repository.findAccountByEmail(normalizeEmail(input.email));
    if (account?.passwordHash === undefined || !(await verifyPassword(input.password, account.passwordHash))) {
      throw new AuthFailure("INVALID_CREDENTIALS", "Adresse ou mot de passe incorrect.");
    }
    return this.createSession(account);
  }

  public async loginWithDiscord(identity: DiscordIdentity): Promise<AuthSession> {
    let account = await this.repository.findAccountByDiscordId(identity.id);
    const normalizedEmail = identity.email === undefined || identity.email === null
      ? null
      : normalizeEmail(identity.email);

    if (account === undefined && identity.emailVerified && normalizedEmail !== null) {
      const emailAccount = await this.repository.findAccountByEmail(normalizedEmail);
      if (emailAccount !== undefined) {
        account = { ...emailAccount, discordId: identity.id };
        await this.repository.saveAccount(account);
      }
    }

    if (account === undefined) {
      account = {
        id: randomUUID(),
        email: identity.emailVerified ? normalizedEmail : null,
        displayName: (identity.globalName ?? identity.username).slice(0, 24),
        createdAt: new Date().toISOString(),
        discordId: identity.id,
      };
      await this.repository.saveAccount(account);
    }

    return this.createSession(account);
  }

  public async getAccount(token: string): Promise<Account> {
    const accountId = await this.repository.findSessionAccountId(hashToken(token));
    const account = accountId === undefined ? undefined : await this.repository.findAccountById(accountId);
    if (account === undefined) throw new AuthFailure("UNAUTHORIZED", "Session invalide.");
    return publicAccount(account);
  }

  public async logout(token: string): Promise<void> {
    await this.repository.deleteSession(hashToken(token));
  }

  private async createSession(account: StoredAccount): Promise<AuthSession> {
    const token = randomBytes(32).toString("base64url");
    await this.repository.saveSession(
      hashToken(token),
      account.id,
      new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    );
    return { token, account: publicAccount(account) };
  }
}
