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

            // Check if user has existing session
            const existingSession = this.storageService.getSession(appId);

            if (existingSession && existingSession.user && existingSession.token && existingSession.roomId) {
                console.log('[ChatService] Found existing session, attempting to restore...');

                // Try to restore previous session
                const restoredSession = await this.tryRestoreSession(appId);

                if (restoredSession) {
                    console.log('[ChatService] Session restored successfully');
                    this.eventEmitter.emit('chat:restored', {
                        user: restoredSession.user,
                        roomId: restoredSession.roomId,
                        room: restoredSession.room,
                        messages: restoredSession.messages
                    });
                    return restoredSession.user;
                } else {
                    // Session exists but restoration failed - throw error
                    const error = new Error('Failed to restore existing session. Please clear your session and try again.');
                    console.error('[ChatService] Session restoration failed for existing session');
                    this.eventEmitter.emit('chat:error', error);
                    throw error;
                }
            }

            console.log('[ChatService] No existing session found, creating new session...');

            // Get nonce from SDK (matches React Native getJWTNonce)
            const nonce = await this.sdkService.getNonce();
            console.log('[ChatService] Nonce:', nonce);

            // Prepare API request (matches React Native)
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

            // Parse room ID
            const roomId = Number(customer_room.room_id);

            // Verify identity token and get user data
            const userData = await this.sdkService.verifyIdentityToken(identity_token);
            console.log('[ChatService] User data:', userData);

            // Set user with token (matches React Native setUserWithIdentityToken)
            const user = await this.sdkService.setUserWithToken(userData);
            console.log('[ChatService] User set:', user);

            // Get user token from SDK
            const userToken = this.sdkService.getUserToken();

            // Save session to storage (matches React Native AsyncStorage.multiSet)
            // Save userData (from verifyIdentityToken) to match what we restore
            this.storageService.saveSession(appId, userData, userToken, roomId);
            console.log('[ChatService] Session saved');

            // Update state (matches React Native atom setters)
            this.stateManager.setState({
                currentUser: userData,
                roomId: roomId,
                isLoggedIn: true
            });

            // Update room info with messages
            await this.updateRoomInfo(roomId);

            this.eventEmitter.emit('chat:initiated', { user: userData, roomId });

            // Return user (matches React Native return value)
            return userData;
        } catch (error) {
            console.error('[ChatService] Initiate chat error:', error);
            this.eventEmitter.emit('chat:error', error);
            throw error;
        }
    }

    /**
     * Update room info with messages (matches React Native useUpdateRoomInfo)
     * @param {number} roomId - Room ID to load
     * @returns {Promise<[Object|null, Array]>} Returns [room, messages]
     */
    async updateRoomInfo(roomId) {
        if (!this.sdkService.isLoggedIn()) {
            console.log('[ChatService] User is not logged in');
            return [null, []];
        }
        const currentUser = this.stateManager.get('currentUser');

        if (roomId == null) {
            return [null, []];
        }

        // Get chat room with messages (matches React Native getChatRoomWithMessages)
        const roomObj = await this.sdkService.getRoom(roomId);
        let room = roomObj;
        let messages = Array.isArray(roomObj?.comments) ? roomObj.comments : [];
        console.log('[ChatService] updateRoomInfo Room:', room);
        console.log('[ChatService] updateRoomInfo Messages:', messages);

        // Get previous messages (matches React Native getPreviousMessagesById)
        if (messages.length > 0) {
            const lastMessageId = room?.last_comment_id;
            if (lastMessageId) {
                const previousMessages = await this.sdkService.getPreviousMessagesById(roomId, 20, lastMessageId);
                if (Array.isArray(previousMessages)) {
                    messages.push(...previousMessages);
                }
            }
        }

        // Update room in state (matches React Native set(roomAtom))
        this.stateManager.setState({
            room: { ...this.stateManager.get('room'), ...room }
        });

        // Update messages in state (matches React Native set(messagesAtom))
        this.stateManager.setMessages(messages);

        // Build subtitle from participants
        let subtitle = [];
        let avatar = room.avatarUrl;
        room.participants?.forEach((participant) => {
            if (participant.id === currentUser?.id) {
                subtitle.unshift('You');
            } else {
                const type = participant.extras?.type;
                if (type === 'agent') {
                    avatar = participant.avatarUrl;
                }
                subtitle.push(participant.name);
            }
        });

        // Update subtitle and avatar in state (matches React Native set(subtitleAtom) and set(avatarAtom))
        this.stateManager.setState({
            subtitle: subtitle.join(', '),
            avatar: avatar
        });

        return [room, messages];
    }

    /**
     * Try to restore a previous chat session
     * 
     * This method attempts to restore a user's previous chat session by:
     * 1. Retrieving stored session data (user, token, roomId)
     * 2. Loading the room and checking if it's resolved
     * 3. Determining if a new session should be created based on:
     *    - Whether the room is resolved
     *    - Whether the app is configured for sessional conversations
     * 
     * Sessional behavior:
     * - If room is NOT resolved: Always restore the existing session
     * - If room IS resolved AND app is sessional: Create a new session (return null)
     * - If room IS resolved AND app is NOT sessional: Restore existing session
     * 
     * @param {string} appId - Qiscus application ID
     * @returns {Promise<{user: Object, roomId: number}|null>} Session data if restored, null if new session needed
     */
    async tryRestoreSession(appId) {
        const session = this.storageService.getSession(appId);
        console.log('[ChatService] Attempting to restore session:', session);

        // If no session exists, return null to create new session
        if (!session) {
            console.log('[ChatService] No stored session found');
            return null;
        }

        const { user, token, roomId } = session;

        // Validate session data
        if (!user || !token || !roomId) {
            console.log('[ChatService] Incomplete session data:', { hasUser: !!user, hasToken: !!token, hasRoomId: !!roomId });
            return null;
        }

        try {
            console.log('[ChatService] Restoring session for user:', user.user.username || user.user.id, 'room:', roomId);

            // Set user with token first to authenticate
            // Set user with token and wait for completion
            await this.sdkService.setUserWithToken(user);

            // Ensure SDK is fully ready before proceeding
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load room info with messages
            const [room, messages] = await this.updateRoomInfo(roomId);

            if (!room) {
                console.log('[ChatService] Failed to load room:', roomId);
                return null;
            }

            // Check if room is resolved using the dedicated method
            const isResolved = this.checkIfRoomResolved();
            console.log('[ChatService] Room resolved status:', isResolved);

            // Only check session status if room is resolved
            if (isResolved) {
                const isSessional = await this.shouldCreateNewSession(appId);
                console.log('[ChatService] App sessional status:', isSessional);

                if (isSessional) {
                    console.log('[ChatService] Room resolved and app is sessional - new session required');
                    return null;
                }
            }

            // Restore session - room is either not resolved or app is not sessional
            console.log('[ChatService] Session restored successfully');
            this.stateManager.setState({
                currentUser: user,
                roomId: roomId,
                isLoggedIn: true
            });

            this.eventEmitter.emit('chat:restored', { user, roomId, room, messages });

            return { user, roomId };

        } catch (error) {
            console.error('[ChatService] Failed to restore session:', error);
            return null;
        }
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
            let room = await this.sdkService.getRoom(roomId);

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
        console.log('[ChatService] checkIfRoomResolved Room:', room);
        if (!room) return false;

        // Check is_resolved from multiple possible locations
        let isResolved = false;

        // 1. Check room.options (parsed JSON string)
        if (room.options) {
            try {
                const options = typeof room.options === 'string' ? JSON.parse(room.options) : room.options;
                isResolved = options?.is_resolved === true || options?.extras?.is_resolved === true;
                console.log('[ChatService] Resolved from room.options:', isResolved);
            } catch (error) {
                console.error('[ChatService] Failed to parse room.options:', error);
            }
        }
        return isResolved;
    }

    clearSession() {
        this.storageService.clearSession();
        this.stateManager.reset();
        this.eventEmitter.emit('session:cleared');
    }
}
