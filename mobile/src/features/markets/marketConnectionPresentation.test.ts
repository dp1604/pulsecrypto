import { describe, expect, it } from "vitest";
import { deriveMarketConnectionPresentation } from "./marketConnectionPresentation";

describe("marketConnectionPresentation", () => {
  it("maps live with snapshot to a positive live chip", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "live",
      hasSnapshot: true,
      reconnectAttempt: 0,
      connectionErrorMessage: null
    });

    expect(presentation.compactLabel).toBe("LIVE");
    expect(presentation.tone).toBe("positive");
    expect(presentation.showLastKnown).toBe(false);
    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.showRetry).toBe(false);
  });

  it("maps connecting with snapshot to neutral connecting with last known", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "connecting",
      hasSnapshot: true,
      reconnectAttempt: 0,
      connectionErrorMessage: "Transient reconnect message"
    });

    expect(presentation.compactLabel).toBe("CONNECTING");
    expect(presentation.tone).toBe("neutral");
    expect(presentation.showLastKnown).toBe(true);
    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.persistentAlertMessage).toBeNull();
    expect(presentation.showRetry).toBe(false);
  });

  it("maps connected with snapshot to syncing with last known", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "connected",
      hasSnapshot: true,
      reconnectAttempt: 0,
      connectionErrorMessage: null
    });

    expect(presentation.compactLabel).toBe("SYNCING");
    expect(presentation.tone).toBe("neutral");
    expect(presentation.showLastKnown).toBe(true);
    expect(presentation.showPersistentAlert).toBe(false);
  });

  it("maps reconnecting with snapshot to warning without persistent alert or retry", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "reconnecting",
      hasSnapshot: true,
      reconnectAttempt: 3,
      connectionErrorMessage: "Transient reconnect message"
    });

    expect(presentation.compactLabel).toBe("RECONNECTING");
    expect(presentation.tone).toBe("warning");
    expect(presentation.showLastKnown).toBe(true);
    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.showRetry).toBe(false);
    expect(presentation.reconnectAttemptSuffix).toBe(" · 3");
  });

  it("maps reconnecting without snapshot to warning without last known", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "reconnecting",
      hasSnapshot: false,
      reconnectAttempt: 1,
      connectionErrorMessage: "Transient reconnect message"
    });

    expect(presentation.compactLabel).toBe("RECONNECTING");
    expect(presentation.showLastKnown).toBe(false);
    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.reconnectAttemptSuffix).toBeNull();
  });

  it("maps paused with snapshot to muted paused with last known", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "paused",
      hasSnapshot: true,
      reconnectAttempt: 0,
      connectionErrorMessage: null
    });

    expect(presentation.compactLabel).toBe("PAUSED");
    expect(presentation.tone).toBe("muted");
    expect(presentation.showLastKnown).toBe(true);
    expect(presentation.showPersistentAlert).toBe(false);
  });

  it("maps disconnected with error to offline negative with retry and alert", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "disconnected",
      hasSnapshot: true,
      reconnectAttempt: 0,
      connectionErrorMessage: "WebSocket closed"
    });

    expect(presentation.compactLabel).toBe("OFFLINE");
    expect(presentation.tone).toBe("negative");
    expect(presentation.showLastKnown).toBe(true);
    expect(presentation.showPersistentAlert).toBe(true);
    expect(presentation.persistentAlertMessage).toBe("WebSocket closed");
    expect(presentation.showRetry).toBe(true);
  });

  it("maps disconnected without error to offline without persistent alert", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "disconnected",
      hasSnapshot: true,
      reconnectAttempt: 0,
      connectionErrorMessage: null
    });

    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.showRetry).toBe(true);
  });

  it("maps idle without error to muted offline without alert or retry", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "idle",
      hasSnapshot: false,
      reconnectAttempt: 0,
      connectionErrorMessage: null
    });

    expect(presentation.compactLabel).toBe("OFFLINE");
    expect(presentation.tone).toBe("muted");
    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.showRetry).toBe(false);
  });

  it("maps idle with configuration error to persistent alert and retry", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "idle",
      hasSnapshot: false,
      reconnectAttempt: 0,
      connectionErrorMessage: "Invalid WebSocket URL"
    });

    expect(presentation.showPersistentAlert).toBe(true);
    expect(presentation.persistentAlertMessage).toBe("Invalid WebSocket URL");
    expect(presentation.showRetry).toBe(true);
  });

  it("suppresses persistent alert during transient reconnect even when message exists", () => {
    const presentation = deriveMarketConnectionPresentation({
      status: "reconnecting",
      hasSnapshot: true,
      reconnectAttempt: 2,
      connectionErrorMessage: "Transient reconnect message"
    });

    expect(presentation.showPersistentAlert).toBe(false);
    expect(presentation.persistentAlertMessage).toBeNull();
  });
});
