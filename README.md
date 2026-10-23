# Orvano Next.js SDK

An Orvano SDK for Next.js App Router apps. Orvano is an open source, self hostable backend as a service; see
[orvanohq/orvano](https://github.com/orvanohq/orvano).

## Install

```bash
pnpm add @orvano/nextjs
```

## Use

Import a client and its services from the same entry, and create the client per request, never at module level
(spec 0005 NXT-1, NXT-3).

```ts
// A server component, route handler, or server action
import { createAdminClient, Health } from "@orvano/nextjs/server";

const health = await new Health(createAdminClient()).get(); // { status: "ok", apiVersions: [...] }
```

```ts
// A client component
import { createBrowserClient, Health } from "@orvano/nextjs/client";

const client = createBrowserClient({ key: "<publishable key>" });
```

Options win; otherwise `url` and `project` come from `NEXT_PUBLIC_ORVANO_URL` and `NEXT_PUBLIC_ORVANO_PROJECT`, and
the admin client's `key` from `ORVANO_SERVER_KEY`, which only `@orvano/nextjs/server` reads (NXT-5). Every request
passes `cache: 'no-store'`, so Next never caches an Orvano response for you (NXT-4). `createSessionClient` and
`@orvano/nextjs/proxy` arrive with server sessions (feature 21).

## Develop

You need Node 24 (`.node-version`), pnpm, and Docker (or Podman) for the conformance suite.

- `pnpm check`, `pnpm build`, `pnpm test`, and `pnpm size` are the checks CI runs.
- `@orvano/client` and `@orvano/server` aren't on npm yet, so this repo tests against tarballs packed from the
  `sdkJsCommit` and `sdkJsServerCommit` in `orvano-contract.json` (spec 0014 RGN-1, RGN-6). `pnpm regenerate` checks
  the orvano pin, fetches both SDK commits into `.sdks/`, builds and packs them into `vendor/` (pnpm `overrides`
  install them), and copies their conformance dispatchers and scenarios into `packages/nextjs/conformance/*/`. Never
  edit those files by hand: CI regenerates them and fails on any difference. `--pin <sha>`, `--sdk-js <sha>`,
  `--sdk-js-server <sha>`, and `--latest-sdks` move the pins.
- `pnpm conformance` runs every client scenario through `@orvano/nextjs/client` and every server scenario through
  `@orvano/nextjs/server`, in Node (spec 0014 CNF-5). Start the servers first, with the published image of the
  pinned orvano commit:

  ```bash
  pnpm regenerate --fetch-only
  ORVANO_IMAGE_TAG="sha-$(jq -r .commit orvano-contract.json)" docker compose --file .orvano/api/conformance/compose.yaml up --detach --wait
  pnpm conformance
  ```

  A scenario that can't run here goes in `packages/nextjs/conformance/skip.json` with a reason and an issue link;
  any other scenario that doesn't run fails the suite. Set `ORVANO_CONFORMANCE_PARTIAL=1` when you run a few with
  `-t`.

## License

Apache License 2.0 (see `LICENSE` and `NOTICE`). The name "Orvano" and its logo aren't covered by the license;
see [TRADEMARKS.md](https://github.com/orvanohq/orvano/blob/main/TRADEMARKS.md).
