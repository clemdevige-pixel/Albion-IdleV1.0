import { z } from "zod";

export const AccountIdSchema = z.string().uuid();

export const AccountSchema = z.object({
  id: AccountIdSchema,
  email: z.string().email().nullable(),
  displayName: z.string().min(2).max(24),
  createdAt: z.string().datetime(),
});

export const RegisterRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(24),
});

export const LoginRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const AuthSessionSchema = z.object({
  token: z.string().min(32),
  account: AccountSchema,
});

export const AuthErrorSchema = z.object({
  code: z.enum([
    "INVALID_REQUEST",
    "EMAIL_ALREADY_USED",
    "INVALID_CREDENTIALS",
    "UNAUTHORIZED",
    "PROVIDER_UNAVAILABLE",
    "OAUTH_FAILED",
  ]),
  message: z.string().min(1),
});

export const AuthProvidersSchema = z.object({
  discord: z.object({ enabled: z.boolean() }),
});

export const DiscordExchangeRequestSchema = z.object({
  code: z.string().min(32),
});

export type Account = z.infer<typeof AccountSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type AuthError = z.infer<typeof AuthErrorSchema>;
export type AuthProviders = z.infer<typeof AuthProvidersSchema>;
export type DiscordExchangeRequest = z.infer<typeof DiscordExchangeRequestSchema>;
