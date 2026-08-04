export type {
  FameSourceId,
  FameCategory,
  FameGainRequest,
  FameResult,
  FameFailureReason,
  FameRecord,
} from "./types.js";
export { asFameSourceId, fameOk, fameFail } from "./types.js";
export { FameService, type FameAwardValue } from "./fame-service.js";
export type {
  FameAwardedEvent,
  FameMilestoneEvent,
  FameEventMap,
} from "./fame-events.js";
export { FameSaveProvider } from "./fame-save-provider.js";
