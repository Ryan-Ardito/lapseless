import { logger } from '../lib/logger';

type AsyncFn = () => Promise<void>;

const processors = new Map<string, AsyncFn>();
const running = new Set<string>();
const requeue = new Set<string>();

export function registerProcessor(name: string, fn: AsyncFn) {
  processors.set(name, fn);
}

export function triggerJob(name: string) {
  const fn = processors.get(name);
  if (!fn) return;

  if (running.has(name)) {
    requeue.add(name);
    return;
  }

  running.add(name);
  fn()
    .catch((err) => logger.error(`Triggered job failed: ${name}`, { error: String(err) }))
    .finally(() => {
      running.delete(name);
      if (requeue.delete(name)) triggerJob(name);
    });
}
