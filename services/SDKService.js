/**
 * SDKService - Manages Qiscus SDK initialization and operations
 * Follows Single Responsibility Principle
 */
class SDKService {
    constructor(eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.sdk = null;
        this.isInitialized = false;
    }

    async loadSDK() {
        if (window.QiscusSDKCore) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/qiscus-sdk-core';
            script.onload = () => {
                this.logger.log('[SDKService] SDK loaded');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Qiscus SDK'));
            document.head.appendChild(script);
        });
    }

    async initialize(appId) {
        if (this.isInitialized) return this.sdk;

        this.sdk = new window.QiscusSDKCore();
        this.sdk.debugMode = this.logger.debugMode;
        await this.sdk.init({
            AppId: appId,
            options: this.getSDKCallbacks()
        });

        this.isInitialized = true;
        this.logger.log('[SDKService] SDK initialized');
        return this.sdk;
    }

    getSDKCallbacks() {
        return {
            loginSuccessCallback: (user) => {
                this.eventEmitter.emit('sdk:loginSuccess', user);
            },
            loginErrorCallback: (error) => {
                this.eventEmitter.emit('sdk:loginError', error);
            },
            commentDeletedCallback: (data) => {
                this.eventEmitter.emit('sdk:commentDeleted', data);
            },
            commentDeliveredCallback: (message) => {
                this.eventEmitter.emit('sdk:messageDelivered', message);
            },
            commentReadCallback: (message) => {
                this.eventEmitter.emit('sdk:messageRead', message);
            },
            presenceCallback: (data, userId) => {
                this.eventEmitter.emit('sdk:presence', { data, userId });
            },
            typingCallback: (data) => {
                this.eventEmitter.emit('sdk:typing', data);
            },
            onReconnectCallback: (data) => {
                this.eventEmitter.emit('sdk:reconnect', data);
            },
            newMessagesCallback: (messages) => {
                this.eventEmitter.emit('sdk:newMessages', messages);
            },
            roomClearedCallback: (data) => {
                this.eventEmitter.emit('sdk:roomCleared', data);
            },
            roomChangedCallback: (data) => {
                this.eventEmitter.emit('sdk:roomChanged', data);
            }
        };
    }

    async verifyIdentityToken(identityToken) {
        if (!this.sdk) throw new Error('SDK not initialized');
        
        const userData = await this.sdk.verifyIdentityToken(identityToken);
        this.logger.log('[SDKService] Identity token verified:', userData);
        return userData;
    }

    async setUserWithToken(userData) {
        if (!this.sdk) throw new Error('SDK not initialized');
        
        // Set the user with the identity token
        const result = await this.sdk.setUserWithIdentityToken(userData);
        
        // Ensure token is properly set in all required places
        if (this.sdk.HTTPAdapter) {
            this.sdk.HTTPAdapter.token = userData.user.token;
            this.sdk.token = userData.user.token;
            this.logger.log('[SDKService] User token set:', this.sdk.token);
        }
        
        this.eventEmitter.emit('sdk:userSet', userData);
        return result;
    }

     getUserToken() {
        return this.sdk?.token || null;
    }

    async getNonce() {
        if (!this.sdk) throw new Error('SDK not initialized');
        const response = await this.sdk.getNonce();
        return typeof response === 'object' && response.nonce ? response.nonce : response;
    }

    async sendMessage(roomId, text, extras = {}) {
        if (!this.sdk) throw new Error('SDK not initialized');
        
        return await this.sdk.sendComment(
            roomId,
            text,
            null, // uniqueId
            'text',
            null, // payload
            extras
        );
    }

    async loadMoreMessages(lastMessageId) {
        if (!this.sdk) throw new Error('SDK not initialized');
        return await this.sdk.loadMore(lastMessageId);
    }

    /**
     * Get chat room with messages (matches React Native getChatRoomWithMessages)
     * @param {number} roomId - Room ID
     * @returns {Promise<Object>} Returns room object with comments
     */
    async getRoom(roomId) {
        if (!this.sdk) throw new Error('SDK not initialized');
        this.logger.log('[SDKService] user data:', this.getUserData());
        
        if(!this.sdk.HTTPAdapter || !this.sdk.HTTPAdapter.token) throw new Error('User not logged in');
        
        this.logger.log('[SDKService] Getting chat room with messages:', roomId);
        
        // Use chatTarget to load room (this properly initializes the room)
        const room = await this.sdk.getRoomById(roomId);
        this.logger.log('[SDKService] Room loaded with', room.comments?.length || 0, 'messages');
        
        return room;
    }

    async getPreviousMessagesById(roomId, limit = 20, lastMessageId) {
        if (!this.sdk) throw new Error('SDK not initialized');
        
        this.logger.log('[SDKService] Loading previous messages:', { roomId, limit, lastMessageId });
        
        if (!lastMessageId) {
            return [];
        }
        
        try {
            const messages = await this.sdk.loadMore(lastMessageId, {
                limit: limit
            });
            this.logger.log('[SDKService] Loaded', messages, 'previous messages');
            return messages;
        } catch (error) {
            this.logger.error('[SDKService] Failed to load previous messages:', error);
            return [];
        }
    }

    getUserData() {
        return this.sdk?.userData || null;
    }

    isLoggedIn() {
        if(!this.sdk) return false;
        this.logger.log('[SDKService] User is logged in:', this.sdk.isLogin);
        return this.sdk?.isLogin || false;
    }
}
