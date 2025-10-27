/**
 * Qiscus Multichannel Widget - Refactored with SOLID Principles
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Each service has one clear purpose
 * - Open/Closed: Easy to extend with new services without modifying existing code
 * - Liskov Substitution: Services can be swapped with compatible implementations
 * - Interface Segregation: Services expose only necessary methods
 * - Dependency Inversion: Widget depends on abstractions (services) not concrete implementations
 */

class QiscusMultichannelWidget {
    constructor(config = {}) {
        this.config = this.validateConfig(config);
        this.userConfig = null;
        
        // Initialize event system
        this.eventEmitter = new EventEmitter();
        
        // Initialize services (Dependency Injection)
        this.initializeServices();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Initialize widget
        this.initialize();
    }

    validateConfig(config) {
        if (!config.appId) {
            throw new Error('appId is required in configuration');
        }

        return {
            appId: config.appId,
            baseURL: config.baseURL || 'https://multichannel.qiscus.com',
            channelId: config.channelId,
            theme: {
                primaryColor: config.primaryColor || '#55B29A',
                secondaryColor: config.secondaryColor || '#F4F4F4',
                ...config.theme
            },
            callbacks: {
                onReady: config.onReady || (() => {}),
                onLoginSuccess: config.onLoginSuccess || (() => {}),
                onLoginError: config.onLoginError || (() => {}),
                onMessageReceived: config.onMessageReceived || (() => {}),
                onMessageSent: config.onMessageSent || (() => {}),
                onRoomChanged: config.onRoomChanged || (() => {}),
                onTyping: config.onTyping || (() => {})
            }
        };
    }

    initializeServices() {
        // Create services with dependency injection
        this.storageService = new StorageService();
        this.stateManager = new StateManager(this.eventEmitter);
        this.sdkService = new SDKService(this.eventEmitter);
        this.apiService = new APIService(this.config.baseURL);
        this.chatService = new ChatService(
            this.sdkService,
            this.apiService,
            this.stateManager,
            this.storageService,
            this.eventEmitter
        );
        this.uiService = new UIService(this.config.theme, this.eventEmitter);
    }

    setupEventHandlers() {
        // SDK events
        this.eventEmitter.on('sdk:typing', (data) => {
            this.stateManager.setState({ isTyping: data.typing });
            this.uiService.updateTypingIndicator(data.typing);
            this.config.callbacks.onTyping(data);
        });

        this.eventEmitter.on('sdk:newMessages', (messages) => {
            this.chatService.handleNewMessages(messages);
        });

        // Chat events
        this.eventEmitter.on('chat:initiated', ({ user }) => {
            this.config.callbacks.onLoginSuccess(user);
        });

        this.eventEmitter.on('chat:error', (error) => {
            this.config.callbacks.onLoginError(error);
        });

        this.eventEmitter.on('room:loaded', (room) => {
            this.config.callbacks.onRoomChanged(room);
        });

        this.eventEmitter.on('message:sent', (message) => {
            this.config.callbacks.onMessageSent(message);
        });

        this.eventEmitter.on('message:received', (message) => {
            this.config.callbacks.onMessageReceived(message);
        });

        // State events
        this.eventEmitter.on('state:messageAdded', () => {
            this.renderMessages();
        });

        this.eventEmitter.on('state:unreadChanged', (count) => {
            this.uiService.updateUnreadBadge(count);
        });

        // UI events
        this.eventEmitter.on('ui:chatButtonClick', () => {
            this.handleChatButtonClick();
        });

        this.eventEmitter.on('ui:closeClick', () => {
            this.closeWidget();
        });

        this.eventEmitter.on('ui:sendClick', () => {
            this.handleSendMessage();
        });
    }

    async initialize() {
        try {
            console.log('[QiscusWidget] Initializing...');
            
            await this.sdkService.loadSDK();
            await this.sdkService.initialize(this.config.appId);
            await this.restoreSession();
            
            this.uiService.createWidget();
            
            console.log('[QiscusWidget] Initialized successfully');
            this.config.callbacks.onReady(this);
        } catch (error) {
            console.error('[QiscusWidget] Initialization error:', error);
        }
    }

    async restoreSession() {
        const session = this.storageService.getSession(this.config.appId);
        if (!session) return;

        const { user, roomId } = session;
        
        this.stateManager.setState({
            currentUser: user,
            isLoggedIn: true
        });

        if (roomId) {
            console.log('[QiscusWidget] Restoring session for room:', roomId);
            await this.chatService.loadRoom(roomId);
        }

        console.log('[QiscusWidget] Session restored');
    }

    // Public API Methods
    setUser(params) {
        this.userConfig = {
            userId: params.userId,
            displayName: params.displayName,
            avatarUrl: params.avatarUrl,
            userProperties: params.userProperties || {}
        };
        console.log('[QiscusWidget] User configured:', this.userConfig.userId);
    }

    async initiateChat() {
        if (!this.userConfig) {
            throw new Error('User ID is required. Call setUser() first.');
        }

        await this.chatService.initiateChat(
            this.config.appId,
            this.config.channelId,
            this.userConfig
        );
        
        this.openWidget();
    }

    async sendMessage(text, extras = {}) {
        return await this.chatService.sendMessage(text, extras);
    }

    async loadMoreMessages() {
        return await this.chatService.loadMoreMessages();
    }

    clearUser() {
        this.chatService.clearSession();
        this.userConfig = null;
        console.log('[QiscusWidget] User session cleared');
    }

    openWidget() {
        this.stateManager.setState({ isOpen: true });
        this.stateManager.resetUnread();
        this.uiService.openWidget();
    }

    closeWidget() {
        this.stateManager.setState({ isOpen: false });
        this.uiService.closeWidget();
    }

    toggleWidget() {
        const isOpen = this.stateManager.get('isOpen');
        if (isOpen) {
            this.closeWidget();
        } else {
            this.openWidget();
        }
    }

    // Private helper methods
    async handleChatButtonClick() {
        const isLoggedIn = this.stateManager.get('isLoggedIn');
        
        if (!isLoggedIn) {
            try {
                await this.initiateChat();
            } catch (error) {
                console.error('[QiscusWidget] Chat initiation failed:', error);
            }
        } else {
            this.openWidget();
        }
    }

    async handleSendMessage() {
        const input = this.uiService.getMessageInput();
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        try {
            await this.sendMessage(text);
            this.uiService.clearMessageInput();
        } catch (error) {
            console.error('[QiscusWidget] Send message failed:', error);
        }
    }

    renderMessages() {
        const messages = this.stateManager.get('messagesList');
        const currentUser = this.stateManager.get('currentUser');
        this.uiService.renderMessages(messages, currentUser?.email);
    }

    // Getters for accessing state (read-only)
    getState() {
        return this.stateManager.getState();
    }

    getCurrentUser() {
        return this.stateManager.get('currentUser');
    }

    getRoom() {
        return this.stateManager.get('room');
    }

    getMessages() {
        return this.stateManager.get('messagesList');
    }

    isOpen() {
        return this.stateManager.get('isOpen');
    }

    isLoggedIn() {
        return this.stateManager.get('isLoggedIn');
    }
}
