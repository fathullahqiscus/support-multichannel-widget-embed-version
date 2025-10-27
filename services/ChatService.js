/**
 * ChatService - Orchestrates chat operations
 * Follows Single Responsibility Principle
 */
class ChatService {
    constructor(sdkService, apiService, stateManager, storageService, eventEmitter) {
        this.sdkService = sdkService;
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.storageService = storageService;
        this.eventEmitter = eventEmitter;
    }

    async initiateChat(appId, channelId, userConfig) {
        try {
            console.log('[ChatService] Initiating chat...');
            // Check if we can use existing session
            const existingRoom = await this.tryRestoreSession(appId);
            console.log('[ChatService] Existing room:', existingRoom);
            if (existingRoom) {
                return existingRoom;
            }

            // Get nonce
            const nonce = await this.sdkService.getNonce();
            console.log('[ChatService] Nonce:', nonce);
            // Prepare API request
            const data = {
                app_id: appId,
                user_id: userConfig.userId,
                name: userConfig.displayName,
                avatar: userConfig.avatarUrl,
                user_properties: userConfig.userProperties,
                nonce: nonce
            };

            if (channelId) {
                data.channel_id = channelId;
            }

            // Call initiate chat API
            const result = await this.apiService.initiateChat(data);
            const { identity_token, customer_room } = result.data;
            console.log('[ChatService] Initiate chat result:', result);
            
            // Verify identity token first
            const userData = await this.sdkService.verifyIdentityToken(identity_token);
            console.log('[ChatService] Identity token verified:', userData);
            // Set user with verified user data
            const user = await this.sdkService.setUserWithToken(userData);
            console.log('[ChatService] User set:', user);
            // Update state
            const roomId = parseInt(customer_room.room_id, 10);
            this.stateManager.setState({
                currentUser: user,
                roomId: roomId,
                isLoggedIn: true
            });
            console.log('[ChatService] State updated:', this.stateManager.get('state'));
            // Save session
            this.storageService.saveSession(appId, user, identity_token, roomId);
            console.log('[ChatService] Session saved:', this.storageService.getSession(appId));
            // Load room
            await this.loadRoom(roomId);

            this.eventEmitter.emit('chat:initiated', { user, roomId });
            return { user, roomId };
        } catch (error) {
            console.error('[ChatService] Initiate chat error:', error);
            this.eventEmitter.emit('chat:error', error);
            throw error;
        }
    }

    async tryRestoreSession(appId) {
        const session = this.storageService.getSession(appId);
        console.log('[ChatService] Session:', session);
        if (!session) return null;

        const { user, roomId } = session;
        console.log('[ChatService] User:', user);
        console.log('[ChatService] Room ID:', roomId);
        
        // Check if room is resolved
        if (roomId) {
            console.log('[ChatService] Restoring session for room:', roomId);
            await this.loadRoom(roomId);
            const isResolved = this.checkIfRoomResolved();
            
            if (isResolved) {
                // Check if app is sessional
                const shouldCreateNewSession = await this.shouldCreateNewSession(appId);
                if (shouldCreateNewSession) {
                    console.log('[ChatService] Room resolved and app is sessional - creating new session');
                    return null; // Force new session creation
                }
            }
            
            if (!isResolved) {
                this.stateManager.setState({
                    currentUser: user,
                    roomId: roomId,
                    isLoggedIn: true
                });
                return { user, roomId };
            }
        }

        return null;
    }

    /**
     * Check if a new session should be created
     * Calls the Qismo session API to check if app is configured for sessional conversations
     * 
     * @param {string} appId - Application ID
     * @returns {Promise<boolean>} True if new session should be created
     */
    async shouldCreateNewSession(appId) {
        try {
            const response = await this.apiService.getSessionStatus(appId);
            const isSessional = response.data?.is_sessional || false;
            console.log('[ChatService] App is sessional:', isSessional);
            return isSessional;
        } catch (error) {
            console.error('[ChatService] Failed to get session status:', error);
            // Default to non-sessional if API fails
            return false;
        }
    }

    async loadRoom(roomId) {
        try {
            let room = this.sdkService.getRoom(roomId);

            if (!room) {
                room = {
                    id: roomId,
                    name: 'Chat Room',
                    comments: [],
                    participants: []
                };
            }

            const messages = room.comments || [];
            
            this.stateManager.setState({ room });
            this.stateManager.setMessages(messages);

            this.eventEmitter.emit('room:loaded', room);
            console.log('[ChatService] Room loaded with', messages.length, 'messages');
        } catch (error) {
            console.error('[ChatService] Load room error:', error);
            throw error;
        }
    }

    async sendMessage(text, extras = {}) {
        if (!text || !text.trim()) {
            throw new Error('Message text cannot be empty');
        }

        const roomId = this.stateManager.get('roomId');
        if (!roomId) {
            throw new Error('No active room');
        }

        try {
            const message = await this.sdkService.sendMessage(roomId, text, extras);
            this.stateManager.addMessage(message);
            this.eventEmitter.emit('message:sent', message);
            return message;
        } catch (error) {
            console.error('[ChatService] Send message error:', error);
            throw error;
        }
    }

    async loadMoreMessages() {
        const messages = this.stateManager.get('messagesList');
        if (messages.length === 0) return [];

        try {
            const lastMessageId = messages[0].id;
            const olderMessages = await this.sdkService.loadMoreMessages(lastMessageId);
            this.stateManager.prependMessages(olderMessages);
            console.log('[ChatService] Loaded', olderMessages.length, 'more messages');
            return olderMessages;
        } catch (error) {
            console.error('[ChatService] Load more messages error:', error);
            return [];
        }
    }

    handleNewMessages(messages) {
        const isOpen = this.stateManager.get('isOpen');
        
        messages.forEach(message => {
            this.stateManager.addMessage(message);
            
            if (!isOpen) {
                this.stateManager.incrementUnread();
            }
            
            this.eventEmitter.emit('message:received', message);
        });
    }

    checkIfRoomResolved() {
        const room = this.stateManager.get('room');
        if (!room) return false;

        const resolvedText = 'admin marked this conversation as resolved';
        const lastMessage = room.last_comment_message?.toLowerCase() || '';
        return lastMessage.includes(resolvedText) || room.extras?.is_resolved === true;
    }

    clearSession() {
        this.storageService.clearSession();
        this.stateManager.reset();
        this.eventEmitter.emit('session:cleared');
    }
}
