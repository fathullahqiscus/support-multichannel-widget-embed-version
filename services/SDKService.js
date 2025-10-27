/**
 * SDKService - Manages Qiscus SDK initialization and operations
 * Follows Single Responsibility Principle
 */
class SDKService {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
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
                console.log('[SDKService] SDK loaded');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Qiscus SDK'));
            document.head.appendChild(script);
        });
    }

    async initialize(appId) {
        if (this.isInitialized) return this.sdk;

        this.sdk = new window.QiscusSDKCore();
        
        await this.sdk.init({
            AppId: appId,
            options: this.getSDKCallbacks()
        });

        this.isInitialized = true;
        console.log('[SDKService] SDK initialized');
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
        console.log('[SDKService] Identity token verified:', userData);
        return userData;
    }

    async setUserWithToken(userData) {
        if (!this.sdk) throw new Error('SDK not initialized');
        
        const user = await this.sdk.setUserWithIdentityToken(userData);
        console.log('[SDKService] User set with identity token:', user);

        if (this.sdk.HTTPAdapter) {
            this.sdk.HTTPAdapter.token = userData.identity_token || userData;
        }

        return user;
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

    getRoom(roomId) {
        if (!this.sdk) return null;
        const room = this.sdk.getRoomById(roomId);
        console.log('[SDKService] Getting room:', roomId, room ? 'found' : 'not found');
        return room;
    }

    async getPreviousMessagesById(roomId, limit = 20, lastMessageId) {
        if (!this.sdk) throw new Error('SDK not initialized');
        
        console.log('[SDKService] Loading previous messages:', { roomId, limit, lastMessageId });
        
        if (!lastMessageId) {
            return [];
        }
        
        try {
            const messages = await this.sdk.loadMore(lastMessageId, limit);
            console.log('[SDKService] Loaded', messages.length, 'previous messages');
            return messages;
        } catch (error) {
            console.error('[SDKService] Failed to load previous messages:', error);
            return [];
        }
    }

    getUserData() {
        return this.sdk?.userData || null;
    }

    isLoggedIn() {
        return this.sdk?.isLogin || false;
    }
}
