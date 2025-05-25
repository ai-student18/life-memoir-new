
/**
 * Enhanced logging utility for edge functions
 */
export class Logger {
  private functionName: string;
  private prefix: string;
  
  constructor(functionName: string) {
    this.functionName = functionName;
    this.prefix = `[${functionName}]`;
  }

  log(message: string, data?: any) {
    if (data) {
      console.log(`${this.prefix} ${message}`, data);
    } else {
      console.log(`${this.prefix} ${message}`);
    }
  }

  error(message: string, error?: any) {
    if (error) {
      console.error(`${this.prefix} ERROR: ${message}`, error);
    } else {
      console.error(`${this.prefix} ERROR: ${message}`);
    }
  }

  warn(message: string, data?: any) {
    if (data) {
      console.warn(`${this.prefix} WARNING: ${message}`, data);
    } else {
      console.warn(`${this.prefix} WARNING: ${message}`);
    }
  }

  info(message: string, data?: any) {
    if (data) {
      console.info(`${this.prefix} INFO: ${message}`, data);
    } else {
      console.info(`${this.prefix} INFO: ${message}`);
    }
  }

  debug(message: string, data?: any) {
    if (data) {
      console.debug(`${this.prefix} DEBUG: ${message}`, data);
    } else {
      console.debug(`${this.prefix} DEBUG: ${message}`);
    }
  }
}

export const createLogger = (functionName: string) => new Logger(functionName);
