/**
 * ChatService - Orchestrates chat operations
 * Follows Single Responsibility Principle
 */
class ChatService {
    /**
     * SDK Configuration Delay
     * The Qiscus SDK polls for configuration every 300ms internally.
     * We need to wait for at least one polling cycle to ensure the SDK
     * is fully configured before making API calls.
     * @see https://github.com/qiscus/qiscus-sdk-web-core - SDK polling mechanism
     */
    static SDK_CONFIG_POLL_INTERVAL = 300;

    constructor(sdkService, apiService, stateManager, storageService, eventEmitter, logger) {
        this.sdkService = sdkService;
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.storageService = storageService;
        this.eventEmitter = eventEmitter;
        this.logger = logger;
    }

    async initiateChat(appId, channelId, userConfig) {
        try {
            this.logger.log('[ChatService] Initiating chat...');

            // Check if user has existing session
            const existingSession = this.storageService.getSession(appId);

            if (existingSession && existingSession.user && existingSession.token && existingSession.roomId) {
                this.logger.log('[ChatService] Found existing session, attempting to restore...');

                // Try to restore previous session
                const restoredSession = await this.tryRestoreSession(appId);

                if (restoredSession) {
                    this.logger.log('[ChatService] Session restored successfully');
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
                    this.logger.error('[ChatService] Session restoration failed for existing session');
                    this.eventEmitter.emit('chat:error', error);
                    throw error;
                }
            }

            this.logger.log('[ChatService] No existing session found, creating new session...');

            // Get nonce from SDK (matches React Native getJWTNonce)
            const nonce = await this.sdkService.getNonce();
            this.logger.log('[ChatService] Nonce:', nonce);

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
            this.logger.log('[ChatService] Initiate chat result:', result);

            // Parse room ID
            const roomId = Number(customer_room.room_id);

            // Verify identity token and get user data
            const userData = await this.sdkService.verifyIdentityToken(identity_token);
            this.logger.log('[ChatService] User data:', userData);

            // Set user with token (matches React Native setUserWithIdentityToken)
            const user = await this.sdkService.setUserWithToken(userData);
            this.logger.log('[ChatService] User set:', user);

            // Get user token from SDK
            const userToken = this.sdkService.getUserToken();

            // Save session to storage (matches React Native AsyncStorage.multiSet)
            // Save userData (from verifyIdentityToken) to match what we restore
            this.storageService.saveSession(appId, userData, userToken, roomId);
            this.logger.log('[ChatService] Session saved');

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
            this.logger.error('[ChatService] Initiate chat error:', error);
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
            this.logger.log('[ChatService] User is not logged in');
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
        this.logger.log('[ChatService] updateRoomInfo Room:', room);
        this.logger.log('[ChatService] updateRoomInfo Messages:', messages);

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
        this.logger.log('[ChatService] Attempting to restore session:', session);

        // If no session exists, return null to create new session
        if (!session) {
            this.logger.log('[ChatService] No stored session found');
            return null;
        }

        const { user, token, roomId } = session;

        // Validate session data
        if (!user || !token || !roomId) {
            this.logger.log('[ChatService] Incomplete session data:', { hasUser: !!user, hasToken: !!token, hasRoomId: !!roomId });
            return null;
        }

        try {
            this.logger.log('[ChatService] Restoring session for user:', user.user.username || user.user.id, 'room:', roomId);

            // Set user with token first to authenticate
            // Set user with token and wait for completion
            await this.sdkService.setUserWithToken(user);

            // Wait for SDK configuration polling cycle to complete
            // The SDK polls for config every 300ms internally, so we need to wait
            // for at least one cycle to ensure the SDK is fully ready
            this.logger.log('[ChatService] Waiting for SDK configuration...');
            await new Promise(resolve => setTimeout(resolve, ChatService.SDK_CONFIG_POLL_INTERVAL));

            // Load room info with messages
            const [room, messages] = await this.updateRoomInfo(roomId);

            if (!room) {
                this.logger.log('[ChatService] Failed to load room:', roomId);
                return null;
            }

            // Check if room is resolved using the dedicated method
            const isResolved = this.checkIfRoomResolved();
            this.logger.log('[ChatService] Room resolved status:', isResolved);

            // Only check session status if room is resolved
            if (isResolved) {
                const isSessional = await this.shouldCreateNewSession(appId);
                this.logger.log('[ChatService] App sessional status:', isSessional);

                if (isSessional) {
                    this.logger.log('[ChatService] Room resolved and app is sessional - new session required');
                    return null;
                }
            }

            // Restore session - room is either not resolved or app is not sessional
            this.logger.log('[ChatService] Session restored successfully');
            this.stateManager.setState({
                currentUser: user,
                roomId: roomId,
                isLoggedIn: true
            });

            this.eventEmitter.emit('chat:restored', { user, roomId, room, messages });

            return { user, roomId };

        } catch (error) {
            this.logger.error('[ChatService] Failed to restore session:', error);
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
            this.logger.log('[ChatService] App is sessional:', isSessional);
            return isSessional;
        } catch (error) {
            this.logger.error('[ChatService] Failed to get session status:', error);
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
            this.logger.log('[ChatService] Room loaded with', messages.length, 'messages');
        } catch (error) {
            this.logger.error('[ChatService] Load room error:', error);
            throw error;
        }
    }

    /**
     * Send text message
     * @param {string} text - Message text
     * @param {Object} extras - Extra parameters
     * @returns {Promise<Object>} - Sent message
     */
    async sendMessage(text, extras = {}) {
        const roomId = this.stateManager.get('roomId');
        if (!roomId) {
            throw new Error('No active room');
        }

        if (!text || !text.trim()) {
            throw new Error('Message text cannot be empty');
        }

        try {
            this.logger.log('[ChatService] Sending text message:', text);

            const message = await this.sdkService.sendMessage(roomId, text, extras);

            this.stateManager.addMessage(message);
            this.eventEmitter.emit('message:sent', message);
            return message;
        } catch (error) {
            this.logger.error('[ChatService] Send message error:', error);
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
            this.logger.log('[ChatService] Loaded', olderMessages.length, 'more messages');
            return olderMessages;
        } catch (error) {
            this.logger.error('[ChatService] Load more messages error:', error);
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
        this.logger.log('[ChatService] checkIfRoomResolved Room:', room);
        if (!room) return false;

        // Check is_resolved from multiple possible locations
        let isResolved = false;

        // 1. Check room.options (parsed JSON string)
        if (room.options) {
            try {
                const options = typeof room.options === 'string' ? JSON.parse(room.options) : room.options;
                isResolved = options?.is_resolved === true || options?.extras?.is_resolved === true;
                this.logger.log('[ChatService] Resolved from room.options:', isResolved);
            } catch (error) {
                this.logger.error('[ChatService] Failed to parse room.options:', error);
            }
        }
        return isResolved;
    }

    clearSession() {
        this.storageService.clearSession();
        this.stateManager.reset();
        this.eventEmitter.emit('session:cleared');
    }

    // ==================== MEDIA UPLOAD METHODS ====================

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    /**
     * Check if file is an image
     */
    isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const ext = this.getFileExtension(filename).toLowerCase();
        return imageExtensions.includes(ext);
    }

    /**
     * Check if file is a video
     */
    isVideoFile(filename) {
        const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'];
        const ext = this.getFileExtension(filename).toLowerCase();
        return videoExtensions.includes(ext);
    }

    /**
     * Check if file is a document
     */
    isDocumentFile(filename) {
        const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
        const ext = this.getFileExtension(filename).toLowerCase();
        return docExtensions.includes(ext);
    }

    /**
     * Get media type for message
     */
    getMediaType(filename) {
        if (this.isImageFile(filename)) return 'image';
        if (this.isVideoFile(filename)) return 'video';
        return 'file';
    }

    /**
     * Prepare temporary message for file upload
     */
    prepareFileMessage(filename, uri) {
        return {
            message: `File attachment: ${filename}`,
            uniqueId: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            type: 'file',
            uri: uri,
            filename: filename,
            status: 'pending'
        };
    }

    /**
     * Validate file before upload
     * @param {File} file - File object
     * @returns {Object} - Validation result { valid: boolean, error: string }
     */
    validateFile(file) {
        const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
        const ALLOWED_EXTENSIONS = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', // Images
            'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', // Videos
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv' // Documents
        ];

        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        if (!file.name) {
            return { valid: false, error: 'File name is missing' };
        }

        const ext = this.getFileExtension(file.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, error: `File type .${ext} is not supported` };
        }

        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: `File size exceeds 25MB limit (${Math.round(file.size / 1024 / 1024)}MB)` };
        }

        return { valid: true };
    }

    /**
     * Prepare file object from File input
     * @param {File} file - File from input element
     * @returns {Object} - File object ready for upload
     */
    prepareFileForUpload(file) {
        // Validate file first
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return {
            uri: file,
            type: file.type,
            name: file.name,
            size: file.size
        };
    }

    /**
     * Upload and send media file
     * Complete flow: validate → upload → send message
     * @param {Object} mediaOrDocs - File object { uri: File, type, name, size }
     * @param {number} roomId - Room ID
     * @returns {Promise<Object>} - Sent message
     */
    async uploadAndSendMedia(mediaOrDocs, roomId) {
        // === VALIDATION ===
        if (!this.sdkService.sdk) throw new Error('SDK not initialized');
        if (!roomId) throw new Error('Room ID is required');
        if (!mediaOrDocs?.uri) throw new Error('Invalid file object');
        if (!mediaOrDocs.name) throw new Error('File name is required');

        this.logger.log('[ChatService] 📤 Starting media upload:', mediaOrDocs.name);

        // Prepare temp message for UI tracking
        const tempMessage = this.prepareFileMessage(mediaOrDocs.name, mediaOrDocs.uri);
        this.eventEmitter.emit('media:uploading', { message: tempMessage, file: mediaOrDocs });

        try {
            // === STEP 1: Upload file to Qiscus CDN ===
            this.logger.log('[ChatService] ⬆️  Uploading to CDN...');
            const fileURL = await this.uploadFile(mediaOrDocs);
            
            if (!fileURL) throw new Error('Upload failed: No URL returned');
            this.logger.log('[ChatService] ✅ File uploaded:', fileURL);

            // === STEP 2: Send message with file URL ===
            this.logger.log('[ChatService] 💬 Sending message...');
            const sentMessage = await this.sendMediaMessage(roomId, mediaOrDocs, fileURL, tempMessage);
            this.logger.log('[ChatService] ✅ Message sent successfully');

            // Emit success
            this.eventEmitter.emit('media:uploaded', { message: sentMessage, fileURL });
            return sentMessage;
            
        } catch (error) {
            this.logger.error('[ChatService] ❌ Upload failed:', error);
            this.eventEmitter.emit('media:error', { message: tempMessage, error });
            throw error;
        }
    }

    /**
     * Upload file to Qiscus CDN
     * @param {Object} mediaOrDocs - File object { uri: File, name, size }
     * @returns {Promise<string>} - Uploaded file URL
     */
    uploadFile(mediaOrDocs) {
        return new Promise((resolve, reject) => {
            // SDK upload expects just the File object
            this.sdkService.sdk.upload(mediaOrDocs.uri, (error, progress, fileURL) => {
                if (error) {
                    reject(error);
                    return;
                }

                // Progress callback
                if (progress) {
                    const percent = Math.round(progress.percent);
                    this.eventEmitter.emit('media:progress', {
                        filename: mediaOrDocs.name,
                        percent: percent
                    });
                }

                // Success callback
                if (fileURL) {
                    resolve(fileURL);
                }
            });
        });
    }

    /**
     * Send media message using SDK's official method
     * @param {number} roomId - Room ID
     * @param {Object} mediaOrDocs - File object { name, size }
     * @param {string} fileURL - Uploaded file URL from CDN
     * @param {Object} tempMessage - Temp message { message, uniqueId }
     * @returns {Promise<Object>} - Sent message
     */
    async sendMediaMessage(roomId, mediaOrDocs, fileURL, tempMessage) {
        // Generate file attachment message using SDK's official method
        const message = this.sdkService.sdk.generateFileAttachmentMessage({
            roomId: roomId,
            text: tempMessage.message, // e.g., "File attachment: image.png"
            url: fileURL,              // CDN URL
            filename: mediaOrDocs.name,
            size: mediaOrDocs.size || 0,
            caption: '',
            extras: {}
        });

        // Send using SDK's sendComment with generated message properties
        return this.sdkService.sdk.sendComment(
            message.room_id,
            message.message,
            message.unique_id,
            message.type,
            message.payload,
            message.extras
        );
    }
}
