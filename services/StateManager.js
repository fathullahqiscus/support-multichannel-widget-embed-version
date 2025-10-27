/**
 * StateManager - Centralized state management
 * Follows Single Responsibility Principle
 */
class StateManager {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.state = {
            currentUser: null,
            room: null,
            messages: new Map(),
            messagesList: [],
            roomId: null,
            isOpen: false,
            isLoggedIn: false,
            isTyping: false,
            unreadCount: 0
        };
    }

    setState(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.eventEmitter.emit('state:changed', { prevState, newState: this.state });
    }

    getState() {
        return { ...this.state };
    }

    get(key) {
        return this.state[key];
    }

    addMessage(message) {
        const msgId = message.unique_temp_id || message.unique_id || message.id;
        
        if (!this.state.messages.has(msgId)) {
            this.state.messages.set(msgId, message);
            this.state.messagesList.push(message);
            this.eventEmitter.emit('state:messageAdded', message);
        }
    }

    addMessages(messages) {
        messages.forEach(msg => this.addMessage(msg));
    }

    setMessages(messages) {
        this.state.messages.clear();
        this.state.messagesList = [];
        this.addMessages(messages);
    }

    prependMessages(messages) {
        messages.forEach(msg => {
            const msgId = msg.unique_temp_id || msg.unique_id || msg.id;
            if (!this.state.messages.has(msgId)) {
                this.state.messages.set(msgId, msg);
            }
        });
        this.state.messagesList = [...messages, ...this.state.messagesList];
    }

    incrementUnread() {
        this.state.unreadCount++;
        this.eventEmitter.emit('state:unreadChanged', this.state.unreadCount);
    }

    resetUnread() {
        this.state.unreadCount = 0;
        this.eventEmitter.emit('state:unreadChanged', 0);
    }

    reset() {
        this.state = {
            currentUser: null,
            room: null,
            messages: new Map(),
            messagesList: [],
            roomId: null,
            isOpen: false,
            isLoggedIn: false,
            isTyping: false,
            unreadCount: 0
        };
        this.eventEmitter.emit('state:reset');
    }
}
