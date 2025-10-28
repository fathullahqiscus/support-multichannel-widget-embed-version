/**
 * LoggerService - Centralized logging with configurable log levels
 * Follows Single Responsibility Principle
 */
class LoggerService {
    constructor(debugMode = false) {
        this.debugMode = debugMode;
    }

    /**
     * Log debug information (only in debug mode)
     */
    log(...args) {
        if (this.debugMode) {
            console.log(...args);
        }
    }

    /**
     * Log informational messages (only in debug mode)
     */
    info(...args) {
        if (this.debugMode) {
            console.info(...args);
        }
    }

    /**
     * Log warnings (only in debug mode)
     */
    warn(...args) {
        if (this.debugMode) {
            console.warn(...args);
        }
    }

    /**
     * Log errors (always logged, even in production)
     */
    error(...args) {
        console.error(...args);
    }

    /**
     * Group logs together (only in debug mode)
     */
    group(label) {
        if (this.debugMode) {
            console.group(label);
        }
    }

    /**
     * End log group (only in debug mode)
     */
    groupEnd() {
        if (this.debugMode) {
            console.groupEnd();
        }
    }

    /**
     * Log table data (only in debug mode)
     */
    table(data) {
        if (this.debugMode) {
            console.table(data);
        }
    }
}
