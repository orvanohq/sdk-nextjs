// Spec 0005 NXT-1, NXT-4, NXT-5: createAdminClient and the services @orvano/nextjs/server re-exports.
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiVersion, createAdminClient, Health, OrvanoError } from "../src/server.js";
import { recorder } from "./support/http.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createAdminClient", () => {
  it("NXT-1, NXT-4: a re-exported service sends the secret key with cache no-store", async () => {
    const http = recorder([apiVersion]);
    const client = createAdminClient({
      url: "https://orvano.example.com",
      key: "sk_test",
      fetch: http.fetch,
    });
    await expect(new Health(client).get()).resolves.toEqual({
      status: "ok",
      apiVersions: [apiVersion],
    });
    const [sent] = http.requests;
    expect(sent?.url).toBe("https://orvano.example.com/v1/health");
    expect(sent?.headers.get("Orvano-Key")).toBe("sk_test");
    expect(sent?.cache).toBe("no-store");
  });

  it("NXT-5: url, project, and key fall back to the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_ORVANO_URL", "https://env.example.com");
    vi.stubEnv("NEXT_PUBLIC_ORVANO_PROJECT", "project-from-env");
    vi.stubEnv("ORVANO_SERVER_KEY", "sk_env");
    const http = recorder([apiVersion]);
    await new Health(createAdminClient({ fetch: http.fetch })).get();
    const [sent] = http.requests;
    expect(sent?.url).toBe("https://env.example.com/v1/health");
    expect(sent?.headers.get("Orvano-Key")).toBe("sk_env");
  });

  it("NXT-5: options win over the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_ORVANO_URL", "https://env.example.com");
    vi.stubEnv("ORVANO_SERVER_KEY", "sk_env");
    const http = recorder([apiVersion]);
    await new Health(
      createAdminClient({ url: "https://option.example.com", key: "sk_option", fetch: http.fetch }),
    ).get();
    const [sent] = http.requests;
    expect(sent?.url).toBe("https://option.example.com/v1/health");
    expect(sent?.headers.get("Orvano-Key")).toBe("sk_option");
  });

  it("throws TypeError naming the option when url or key is missing or empty", () => {
    vi.stubEnv("NEXT_PUBLIC_ORVANO_URL", "");
    expect(() => createAdminClient({ key: "sk_test" })).toThrow(
      new TypeError("createAdminClient needs url, or NEXT_PUBLIC_ORVANO_URL."),
    );
    expect(() => createAdminClient({ url: "https://orvano.example.com" })).toThrow(
      new TypeError("createAdminClient needs key, or ORVANO_SERVER_KEY."),
    );
  });

  it("NXT-1: re-exports OrvanoError from @orvano/server", () => {
    expect(typeof OrvanoError.is).toBe("function");
  });
});
