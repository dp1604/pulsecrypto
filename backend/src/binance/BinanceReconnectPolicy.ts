export type BinanceReconnectPolicyOptions = {
  minDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  random?: () => number;
};

const DEFAULT_MIN_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 15_000;
const DEFAULT_JITTER_RATIO = 0.2;

export class BinanceReconnectPolicy {
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitterRatio: number;
  private readonly random: () => number;
  private attempt = 0;

  constructor(options: BinanceReconnectPolicyOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;
    this.random = options.random ?? Math.random;
  }

  nextDelayMs(): number {
    const exponentialDelay = this.minDelayMs * 2 ** this.attempt;
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    const jitteredDelay = this.applyJitter(cappedDelay);

    this.attempt += 1;

    return Math.floor(Math.min(Math.max(jitteredDelay, 0), this.maxDelayMs));
  }

  reset(): void {
    this.attempt = 0;
  }

  private applyJitter(delayMs: number): number {
    if (this.jitterRatio <= 0) {
      return delayMs;
    }

    const boundedRatio = Math.min(this.jitterRatio, 1);
    const jitterRange = delayMs * boundedRatio;
    const randomOffset = (this.random() * 2 - 1) * jitterRange;

    return delayMs + randomOffset;
  }
}
