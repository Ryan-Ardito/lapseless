import { env } from '../env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = env.isProd ? 'info' : 'debug';

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;

  const entry = {
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...data,
  };

  if (env.isProd) {
    const out = level === 'error' ? process.stderr : process.stdout;
    out.write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    const extra = data ? ` ${JSON.stringify(data)}` : '';
    if (level === 'error') {
      console.error(`${prefix} ${message}${extra}`);
    } else {
      console.log(`${prefix} ${message}${extra}`);
    }
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};
