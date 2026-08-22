import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  CLOUD_SAVES_ROUTE,
  CloudSaveDocumentSchema,
  CloudSaveListSchema,
  CloudSaveSlotIdSchema,
  type CloudSaveDocument,
} from "@game/shared";
import { AuthFailure, type AuthService } from "../auth/AuthService.js";
import type { CloudSaveRepository } from "../saves/CloudSaveRepository.js";

const SERVER_SAVED_AT_KEY = "serverSavedAt";
const SERVER_NOW_KEY = "serverNow";

function getBearerToken(request: FastifyRequest): string | undefined {
  const value = request.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || undefined : undefined;
}

function withServerSavedAt(document: CloudSaveDocument, serverSavedAt: number): CloudSaveDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      extra: {
        ...document.metadata.extra,
        [SERVER_SAVED_AT_KEY]: serverSavedAt,
      },
    },
  };
}

function withServerNow(document: CloudSaveDocument, serverNow: number): CloudSaveDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      extra: {
        ...document.metadata.extra,
        [SERVER_NOW_KEY]: serverNow,
      },
    },
  };
}

async function requireAccountId(request: FastifyRequest, reply: FastifyReply, auth: AuthService): Promise<string | undefined> {
  const token = getBearerToken(request);
  if (token === undefined) { void reply.status(401).send({ code: "UNAUTHORIZED", message: "Session requise." }); return undefined; }
  try { return (await auth.getAccount(token)).id; }
  catch (error) {
    if (error instanceof AuthFailure) void reply.status(401).send({ code: error.code, message: error.message });
    else void reply.status(500).send({ code: "UNAUTHORIZED", message: "Erreur d'authentification." });
    return undefined;
  }
}

export function registerSaveRoutes(app: FastifyInstance, auth: AuthService, saves: CloudSaveRepository): void {
  app.get(CLOUD_SAVES_ROUTE, async (request, reply) => {
    const accountId = await requireAccountId(request, reply, auth);
    return accountId === undefined ? reply : CloudSaveListSchema.parse({ saves: await saves.list(accountId) });
  });
  app.get(`${CLOUD_SAVES_ROUTE}/:slotId`, async (request, reply) => {
    const accountId = await requireAccountId(request, reply, auth);
    const slot = CloudSaveSlotIdSchema.safeParse((request.params as { slotId?: unknown }).slotId);
    if (accountId === undefined) return reply;
    if (!slot.success) return reply.status(400).send({ code: "INVALID_REQUEST", message: "Emplacement invalide." });
    const document = await saves.get(accountId, slot.data);
    return document === undefined
      ? reply.status(404).send({ code: "INVALID_REQUEST", message: "Sauvegarde introuvable." })
      : withServerNow(document, Date.now());
  });
  app.put(`${CLOUD_SAVES_ROUTE}/:slotId`, async (request, reply) => {
    const accountId = await requireAccountId(request, reply, auth);
    const slot = CloudSaveSlotIdSchema.safeParse((request.params as { slotId?: unknown }).slotId);
    const document = CloudSaveDocumentSchema.safeParse(request.body);
    if (accountId === undefined) return reply;
    if (!slot.success || !document.success) return reply.status(400).send({ code: "INVALID_REQUEST", message: "Sauvegarde invalide." });
    const serverSavedAt = Date.now();
    const accepted = await saves.save(
      accountId,
      slot.data,
      withServerSavedAt(document.data, serverSavedAt),
    );
    return { accepted, updatedAt: document.data.metadata.updatedAt, serverSavedAt };
  });
  app.delete(`${CLOUD_SAVES_ROUTE}/:slotId`, async (request, reply) => {
    const accountId = await requireAccountId(request, reply, auth);
    const slot = CloudSaveSlotIdSchema.safeParse((request.params as { slotId?: unknown }).slotId);
    if (accountId === undefined) return reply;
    if (!slot.success) return reply.status(400).send({ code: "INVALID_REQUEST", message: "Emplacement invalide." });
    await saves.delete(accountId, slot.data);
    return reply.status(204).send();
  });
}
