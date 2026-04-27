// Deterministic clock helper for tests. The orchestration timer code accepts a
// `now: () => Date` injection point; tests pass a FakeClock to get full control over
// "the current time" without relying on real-clock waits or system mocks.

export class FakeClock {
  private currentMs: number;

  constructor(initial: Date | string | number = '2026-04-27T12:00:00.000Z') {
    this.currentMs = new Date(initial).getTime();
  }

  now = (): Date => new Date(this.currentMs);

  nowIso = (): string => new Date(this.currentMs).toISOString();

  advanceMs(deltaMs: number): void {
    this.currentMs += deltaMs;
  }

  advanceSeconds(s: number): void {
    this.advanceMs(s * 1000);
  }

  setTo(when: Date | string | number): void {
    this.currentMs = new Date(when).getTime();
  }
}
