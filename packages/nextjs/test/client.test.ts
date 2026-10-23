// Spec 0005 NXT-1, NXT-4, NXT-5, KEY-4: createBrowserClient and the services @orvano/nextjs/client re-exports.
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiVersion, createBrowserClient, Health, OrvanoError } from "../src/client.js";
import * as root from "../src/index.js";
import { recorder } from "./support/http.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createBrowserClient", () => {
  it("NXT-1, NXT-4: a re-exported service sends the publishable key with cache no-store", async () => {
    const http = recorder([apiVersion]);
    const client = createBrowserClient({
      url: "https://orvano.example.com",
      key: "pk_test",
      fetch: http.fetch,
    });
    await new Health(client).get();
    const [sent] = http.requests;
    expect(sent?.url).toBe("https://orvano.example.com/v1/health");
    expect(sent?.headers.get("Orvano-Key")).toBe("pk_test");
    expect(sent?.cache).toBe("no-store");
  });

  it("NXT-5, KEY-4: url falls back to NEXT_PUBLIC_ORVANO_URL, and ORVANO_SERVER_KEY is never read", async () => {
    vi.stubEnv("NEXT_PUBLIC_ORVANO_URL", "https://env.example.com");
    vi.stubEnv("ORVANO_SERVER_KEY", "sk_must_not_leak");
    const http = recorder([apiVersion]);
    await new Health(createBrowserClient({ key: "pk_test", fetch: http.fetch })).get();
    const [sent] = http.requests;
    expect(sent?.url).toBe("https://env.example.com/v1/health");
    expect(sent?.headers.get("Orvano-Key")).toBe("pk_test");
  });

  it("throws TypeError naming the option when url is missing", () => {
    expect(() => createBrowserClient({ key: "pk_test" })).toThrow(
      new TypeError("createBrowserClient needs url, or NEXT_PUBLIC_ORVANO_URL."),
    );
  });

  it("NXT-1: re-exports OrvanoError from @orvano/client", () => {
    expect(typeof OrvanoError.is).toBe("function");
  });
});

describe("the root entry", () => {
  it("NXT-1: holds types only, no runtime exports", () => {
    expect(Object.keys(root)).toEqual([]);
  });
});
