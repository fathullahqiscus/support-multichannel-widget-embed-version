/**
 * EventEmitter - Implements Observer pattern for loose coupling
 * Follows Single Responsibility Principle
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return () => this.off(event, listener);
    }

    off(event, listenerToRemove) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
    }

    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`[EventEmitter] Error in ${event} listener:`, error);
            }
        });
    }

    once(event, listener) {
        const onceWrapper = (...args) => {
            listener(...args);
            this.off(event, onceWrapper);
        };
        return this.on(event, onceWrapper);
    }
}
