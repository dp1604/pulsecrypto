import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import {
  resolveWebSocketUrl,
  validateWebSocketUrl
} from "./webSocketUrl";

describe("webSocketUrl", () => {
  it("accepts ws in development", () => {
    expect(validateWebSocketUrl("ws://127.0.0.1:3001")).toBe(
      "ws://127.0.0.1:3001"
    );
  });

  it("accepts wss", () => {
    expect(validateWebSocketUrl("wss://api.example.com/market")).toBe(
      "wss://api.example.com/market"
    );
  });

  it("accepts production wss", () => {
    expect(
      validateWebSocketUrl("wss://api.example.com/", { requireSecure: true })
    ).toBe("wss://api.example.com");
  });

  it("rejects production ws", () => {
    expect(() =>
      validateWebSocketUrl("ws://api.example.com", { requireSecure: true })
    ).toThrow(ApiError);
  });

  it("uses Android emulator development fallback", () => {
    expect(
      resolveWebSocketUrl({
        isDevelopment: true,
        platformOs: "android"
      })
    ).toBe("ws://10.0.2.2:3001");
  });

  it("uses localhost development fallback for non-Android platforms", () => {
    expect(
      resolveWebSocketUrl({
        isDevelopment: true,
        platformOs: "ios"
      })
    ).toBe("ws://127.0.0.1:3001");
  });

  it("requires explicit configuration in production", () => {
    expect(() =>
      resolveWebSocketUrl({
        isDevelopment: false,
        platformOs: "android"
      })
    ).toThrow(ApiError);
  });

  it("rejects blank values", () => {
    expect(() => validateWebSocketUrl("   ")).toThrow(ApiError);
  });

  it("rejects invalid URLs", () => {
    expect(() => validateWebSocketUrl("not-a-url")).toThrow(ApiError);
  });

  it("rejects relative URLs", () => {
    expect(() => validateWebSocketUrl("/ws/market")).toThrow(ApiError);
  });

  it("rejects credentials", () => {
    expect(() => validateWebSocketUrl("ws://user@127.0.0.1:3001")).toThrow(
      ApiError
    );
    expect(() =>
      validateWebSocketUrl("ws://user:password@127.0.0.1:3001")
    ).toThrow(ApiError);
  });

  it("rejects query strings and fragments", () => {
    expect(() =>
      validateWebSocketUrl("ws://127.0.0.1:3001?token=abc")
    ).toThrow(ApiError);
    expect(() =>
      validateWebSocketUrl("ws://127.0.0.1:3001#fragment")
    ).toThrow(ApiError);
  });

  it("rejects unsupported schemes", () => {
    expect(() => validateWebSocketUrl("http://127.0.0.1:3001")).toThrow(
      ApiError
    );
    expect(() => validateWebSocketUrl("ftp://127.0.0.1:3001")).toThrow(
      ApiError
    );
  });

  it("preserves pathname prefixes", () => {
    expect(validateWebSocketUrl("ws://127.0.0.1:3001/pulsecrypto/ws/")).toBe(
      "ws://127.0.0.1:3001/pulsecrypto/ws"
    );
  });

  it("normalizes trailing slashes", () => {
    expect(validateWebSocketUrl("ws://127.0.0.1:3001///")).toBe(
      "ws://127.0.0.1:3001"
    );
  });

  it("preserves IPv4 hosts and explicit ports", () => {
    expect(validateWebSocketUrl("ws://10.0.2.2:3001")).toBe(
      "ws://10.0.2.2:3001"
    );
  });
});
