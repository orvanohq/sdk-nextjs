// Spec 0005 NXT-1: @orvano/nextjs/client. A thin wrapper over @orvano/client for client components, and every
// @orvano/client service and OrvanoError, so a client and its services come from one entry (SHP-2).
import "client-only"; // oxlint-disable-line import/no-unassigned-import -- Next fails the build if a server component imports this entry
import { createClient, type ClientOptions, type OrvanoClient } from "@orvano/client";
import { publicProject, publicUrl } from "./env.js";
import { noStore } from "./no-store.js";

export * from "@orvano/client";

/**
 * Options for `createBrowserClient`: `@orvano/client`'s, where `url` and `project` fall back to
 * `NEXT_PUBLIC_ORVANO_URL` and `NEXT_PUBLIC_ORVANO_PROJECT` (spec 0005 NXT-5). The publishable `key` is required.
 * @public
 */
export type BrowserClientOptions = Omit<ClientOptions, "url"> & {
  readonly url?: string | undefined;
};

/**
 * Opens a client for client components with the project's publishable key. Throws `TypeError` at once for a missing
 * or bad option.
 * @public
 */
export function createBrowserClient(options: BrowserClientOptions): OrvanoClient {
  const url = options.url ?? publicUrl();
  if (url === undefined) {
    throw new TypeError("createBrowserClient needs url, or NEXT_PUBLIC_ORVANO_URL.");
  }
  return createClient({
    ...options,
    url,
    project: options.project ?? publicProject(),
    fetch: noStore(options.fetch),
  });
}
