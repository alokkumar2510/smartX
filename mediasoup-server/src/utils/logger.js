'use strict';

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = process.env.NODE_ENV === 'production' ? levels.info : levels.debug;

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  debug: (...args) => currentLevel <= levels.debug && console.debug(`[${timestamp()}] DEBUG`, ...args),
  info:  (...args) => currentLevel <= levels.info  && console.info (`[${timestamp()}] INFO `, ...args),
  warn:  (...args) => currentLevel <= levels.warn  && console.warn (`[${timestamp()}] WARN `, ...args),
  error: (...args) => currentLevel <= levels.error && console.error(`[${timestamp()}] ERROR`, ...args),
};

module.exports = logger;
