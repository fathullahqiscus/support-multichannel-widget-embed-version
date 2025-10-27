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
            
            // Check if we can use existing session (matches React Native flow)
            const existingRoom = await this.tryRestoreSession(appId);
            console.log('[ChatService] Existing room:', existingRoom);
            if (existingRoom) {
                // Return existing user if session restored
                return existingRoom.user;
            }

            // Get nonce from SDK
            const nonce = await this.sdkService.getNonce();
            console.log('[ChatService] Nonce:', nonce);
            
            // Prepare API request with all parameters (matches React Native)
            const data = {
                app_id: appId,
                user_id: userConfig.userId,
                name: userConfig.displayName,
                avatar: userConfig.avatarUrl,
                sdk_user_extras: userConfig.extras || {},
                user_properties: userConfig.userProperties || {},
                nonce: nonce
            };

            // Add optional channel_id
            if (channelId != null) {
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
            
            // Get user token from SDK
            const userToken = this.sdkService.getUserToken();
            
            // Parse room ID
            const roomId = Number(customer_room.room_id);
            
            // Save session to storage (matches React Native AsyncStorage.multiSet)
            this.storageService.saveSession(appId, userData, userToken, roomId);
            console.log('[ChatService] Session saved');
            
            // Update state
            this.stateManager.setState({
                currentUser: user,
                roomId: roomId,
                isLoggedIn: true
            });
            
            // Load room and messages
            await this.loadRoom(roomId);

            this.eventEmitter.emit('chat:initiated', { user, roomId });
            
            // Return user (matches React Native return value)
            return user;
        } catch (error) {
            console.error('[ChatService] Initiate chat error:', error);
            this.eventEmitter.emit('chat:error', error);
            throw error;
        }
    }

    async tryRestoreSession(appId) {
        const session = this.storageService.getSession(appId);
        console.log('[ChatService] Session:', session);
        
        // If no session exists, return null to create new session
        if (!session) return null;

        const { user, roomId } = session;
        console.log('[ChatService] User:', user);
        console.log('[ChatService] Room ID:', roomId);
        
        // If we have both user and roomId, check if we can restore
        if (user != null && roomId != null) {
            console.log('[ChatService] Restoring session for room:', roomId);
            
            // Load room and get messages
            await this.loadRoom(roomId);
            const room = this.stateManager.get('room');
            const messages = this.stateManager.get('messagesList');
            
            // Check if room is resolved - check both last message and room extras
            const lastMessageText1 = room?.last_comment_message;
            const lastMessageText2 = messages[messages.length - 1]?.message;
            
            const resolvedText = 'admin marked this conversation as resolved';
            const lastMessageResolved = [lastMessageText1, lastMessageText2]
                .map((it) => it?.toLowerCase())
                .some((it) => it?.includes(resolvedText) === true);
            const roomExtrasResolved = room?.extras?.is_resolved === true;
            
            const isResolved = roomExtrasResolved || lastMessageResolved;
            console.log('[ChatService] Room is resolved:', isResolved);
            
            // Only check session status if room is resolved
            const isSessional = isResolved ? await this.shouldCreateNewSession(appId) : false;
            
            console.log(`[ChatService] Room are resolved(${isResolved}) and sessional(${isSessional})`);
            
            // If not sessional, use existing room
            if (!isSessional) {
                console.log('[ChatService] Room are not sessional, using existing room');
                this.stateManager.setState({
                    currentUser: user,
                    roomId: roomId,
                    isLoggedIn: true
                });
                this.sdkService.setUserWithToken(user);
                return { user, roomId };
            }
            
            // If sessional, return null to create new session
            console.log('[ChatService] Room resolved and app is sessional - creating new session');
            return null;
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
