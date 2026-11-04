export class DraftAutosaver<T> {
  private latest: { value: T; revision: number } | undefined;
  private revision = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private stopped = false;

  private readonly write: (value: T) => Promise<void>;
  private readonly reportError: (error: unknown) => void;
  private readonly delayMs: number;
  private readonly maxWaitMs: number;

  constructor(
    write: (value: T) => Promise<void>,
    reportError: (error: unknown) => void,
    delayMs = 500,
    maxWaitMs = 3000,
  ) {
    this.write = write;
    this.reportError = reportError;
    this.delayMs = delayMs;
    this.maxWaitMs = maxWaitMs;
  }

  changed(value: T): void {
    if (this.stopped) return;
    this.latest = { value: structuredClone(value), revision: ++this.revision };
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.backgroundFlush(), this.delayMs);
    this.maxWaitTimer ??= setTimeout(() => this.backgroundFlush(), this.maxWaitMs);
  }

  private backgroundFlush(): void {
    void this.flush().catch(() => {}); // write failure has already been reported
  }

  private clearTimers(): void {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.maxWaitTimer);
    this.debounceTimer = this.maxWaitTimer = undefined;
  }

  flush(): Promise<void> {
    this.clearTimers();
    const pending = this.latest;
    this.latest = undefined;
    if (!pending) return this.queue;
    const attempt = this.queue.catch(() => {}).then(() => this.write(pending.value));
    this.queue = attempt;
    void attempt.catch(error => {
      // Keep the failed snapshot available for an explicit retry, unless newer
      // input has already replaced it. Never retry after stop/discard.
      if (!this.stopped && !this.latest && pending.revision === this.revision) this.latest = pending;
      this.reportError(error);
    });
    return attempt;
  }

  stop(): Promise<void> {
    this.stopped = true;
    this.clearTimers();
    this.latest = undefined;
    return this.queue.catch(() => {});
  }
}
