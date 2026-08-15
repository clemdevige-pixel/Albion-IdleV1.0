import { CloudSaveDocumentSchema, type CloudSaveDocument, type CloudSaveSlotId, type CloudSaveSummary } from "@game/shared";
import type { JSONValue, Sql } from "postgres";
import type { CloudSaveRepository } from "./CloudSaveRepository.js";

interface SaveRow { slot_id: CloudSaveSlotId; document: unknown; updated_at_ms: string; }

export class PostgresCloudSaveRepository implements CloudSaveRepository {
  private constructor(private readonly sql: Sql) {}
  public static async create(sql: Sql): Promise<PostgresCloudSaveRepository> { const repository = new PostgresCloudSaveRepository(sql); await repository.initialize(); return repository; }
  public async list(accountId: string): Promise<readonly CloudSaveSummary[]> { const rows = await this.sql<SaveRow[]>`select slot_id, updated_at_ms from player_saves where account_id = ${accountId}`; return rows.map((row) => ({ slotId: row.slot_id, updatedAt: Number(row.updated_at_ms) })); }
  public async get(accountId: string, slotId: CloudSaveSlotId): Promise<CloudSaveDocument | undefined> { const rows = await this.sql<SaveRow[]>`select slot_id, document, updated_at_ms from player_saves where account_id = ${accountId} and slot_id = ${slotId} limit 1`; return rows[0] === undefined ? undefined : CloudSaveDocumentSchema.parse(rows[0].document); }
  public async save(accountId: string, slotId: CloudSaveSlotId, document: CloudSaveDocument): Promise<boolean> {
    const serializedDocument = JSON.parse(JSON.stringify(document)) as JSONValue;
    const rows = await this.sql<{ updated_at_ms: string }[]>`
      insert into player_saves (account_id, slot_id, document, updated_at_ms)
      values (${accountId}, ${slotId}, ${this.sql.json(serializedDocument)}, ${document.metadata.updatedAt})
      on conflict (account_id, slot_id) do update set document = excluded.document, updated_at_ms = excluded.updated_at_ms
      where player_saves.updated_at_ms <= excluded.updated_at_ms returning updated_at_ms
    `;
    return rows.length === 1;
  }
  public async delete(accountId: string, slotId: CloudSaveSlotId): Promise<void> { await this.sql`delete from player_saves where account_id = ${accountId} and slot_id = ${slotId}`; }
  private async initialize(): Promise<void> {
    await this.sql`
      create table if not exists player_saves (
        account_id uuid not null references auth_accounts(id) on delete cascade,
        slot_id varchar(32) not null,
        document jsonb not null,
        updated_at_ms bigint not null,
        primary key (account_id, slot_id),
        constraint player_saves_slot_id_check check (slot_id in ('player_slot_1', 'player_slot_2', 'player_slot_3'))
      )
    `;
  }
}
