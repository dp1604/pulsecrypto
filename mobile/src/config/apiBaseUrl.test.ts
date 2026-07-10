import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import {
  joinApiUrl,
  resolveApiBaseUrl,
  validateApiBaseUrl
} from "./apiBaseUrl";

describe("apiBaseUrl", () => {
  it("accepts a valid explicit URL and removes trailing slash", () => {
    expect(validateApiBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com"
    );
  });

  it("preserves a valid pathname prefix", () => {
    expect(validateApiBaseUrl("https://api.example.com/pulsecrypto/api/")).toBe(
      "https://api.example.com/pulsecrypto/api"
    );
  });

  it("removes multiple trailing slashes from the pathname", () => {
    expect(validateApiBaseUrl("http://10.0.2.2:3000///")).toBe(
      "http://10.0.2.2:3000"
    );
    expect(validateApiBaseUrl("http://localhost:3000/base/path//")).toBe(
      "http://localhost:3000/base/path"
    );
  });

  it("preserves explicit ports", () => {
    expect(validateApiBaseUrl("http://10.0.2.2:3000")).toBe(
      "http://10.0.2.2:3000"
    );
  });

  it("rejects unsupported schemes", () => {
    expect(() => validateApiBaseUrl("ftp://api.example.com")).toThrow(ApiError);
    expect(() => validateApiBaseUrl("relative/path")).toThrow(ApiError);
  });

  it("rejects empty values", () => {
    expect(() => validateApiBaseUrl("   ")).toThrow(ApiError);
  });

  it("rejects credentials", () => {
    expect(() => validateApiBaseUrl("https://user@example.com/api")).toThrow(
      ApiError
    );
    expect(() =>
      validateApiBaseUrl("https://user:password@example.com/api")
    ).toThrow(ApiError);
  });

  it("rejects query strings and fragments", () => {
    expect(() =>
      validateApiBaseUrl("https://example.com/api?version=1")
    ).toThrow(ApiError);
    expect(() => validateApiBaseUrl("https://example.com/api#fragment")).toThrow(
      ApiError
    );
  });

  it("uses Android emulator development fallback", () => {
    expect(
      resolveApiBaseUrl({
        isDevelopment: true,
        platformOs: "android"
      })
    ).toBe("http://10.0.2.2:3000");
  });

  it("uses localhost development fallback for non-Android platforms", () => {
    expect(
      resolveApiBaseUrl({
        isDevelopment: true,
        platformOs: "ios"
      })
    ).toBe("http://127.0.0.1:3000");
  });

  it("requires explicit configuration in production", () => {
    expect(() =>
      resolveApiBaseUrl({
        isDevelopment: false,
        platformOs: "android"
      })
    ).toThrow(ApiError);
  });

  it("joins API paths while preserving the base pathname", () => {
    expect(joinApiUrl("http://127.0.0.1:3000/", "/pairs/meta")).toBe(
      "http://127.0.0.1:3000/pairs/meta"
    );
    expect(
      joinApiUrl("https://example.com/pulsecrypto/api", "/pairs/meta")
    ).toBe("https://example.com/pulsecrypto/api/pairs/meta");
  });
});
