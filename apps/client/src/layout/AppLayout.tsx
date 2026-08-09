import { AppShell } from "../ui/shell";

/**
 * Compatibility entry point kept while callers migrate to the permanent shell.
 */
export function AppLayout(): JSX.Element {
  return <AppShell />;
}
