// Spec 0005 NXT-1: @orvano/nextjs/server. The admin factory, and every @orvano/server service and OrvanoError, so
// server components, route handlers, server actions, and proxy.ts import a client and its services from one entry
// (SHP-2). createSessionClient and @orvano/nextjs/proxy come with feature 21's server sessions.
import "server-only"; // oxlint-disable-line import/no-unassigned-import -- Next fails the build if a client bundle imports this entry
import { createClient, type ClientOptions, type OrvanoClient } from "@orvano/server";
import { publicProject, publicUrl, serverKey } from "./env.js";
import { noStore } from "./no-store.js";

export * from "@orvano/server";

/**
 * Options for `createAdminClient`: `@orvano/server`'s, where `url`, `project`, and `key` fall back to
 * `NEXT_PUBLIC_ORVANO_URL`, `NEXT_PUBLIC_ORVANO_PROJECT`, and `ORVANO_SERVER_KEY` (spec 0005 NXT-5).
 * @public
 */
export type AdminClientOptions = Partial<ClientOptions>;

/**
 * Opens a server client with the project's secret key. Create it per request, inside the server component, route
 * handler, server action, or proxy that uses it, never at module level (spec 0005 NXT-3). Throws `TypeError` at
 * once for a missing or bad option.
 * @public
 */
export function createAdminClient(options: AdminClientOptions = {}): OrvanoClient {
  const url = options.url ?? publicUrl();
  if (url === undefined) {
    throw new TypeError("createAdminClient needs url, or NEXT_PUBLIC_ORVANO_URL.");
  }
  const key = options.key ?? serverKey();
  if (key === undefined) {
    throw new TypeError("createAdminClient needs key, or ORVANO_SERVER_KEY.");
  }
  return createClient({
    ...options,
    url,
    key,
    project: options.project ?? publicProject(),
    fetch: noStore(options.fetch),
  });
}
