/**
 * UIService - Handles all UI rendering and DOM manipulation
 * Follows Single Responsibility Principle
 */
class UIService {
    constructor(theme, eventEmitter) {
        this.theme = theme;
        this.eventEmitter = eventEmitter;
        this.container = null;
    }

    createWidget() {
        this.container = document.createElement('div');
        this.container.id = 'qiscus-widget-container';
        this.container.className = 'qiscus-widget-container';
        this.container.innerHTML = this.getWidgetHTML();
        document.body.appendChild(this.container);
        this.injectStyles();
        this.attachEventListeners();
    }

    getWidgetHTML() {
        return `
            <div class="qiscus-chat-button" id="qiscus-chat-button">
                <img src="https://cdn-icons-png.flaticon.com/128/1041/1041916.png" alt="Chat" width="28" height="28" />
                <span class="qiscus-unread-badge" id="qiscus-unread-badge">0</span>
            </div>
            
            <div class="qiscus-chat-window" id="qiscus-chat-window">
                <div class="qiscus-header">
                    <div class="qiscus-header-info">
                        <div class="qiscus-avatar">
                            <img src="https://cdn-icons-png.flaticon.com/128/3135/3135715.png" alt="Avatar" width="32" height="32" />
                        </div>
                        <div class="qiscus-header-text">
                            <div class="qiscus-header-title">Customer Service</div>
                            <div class="qiscus-header-subtitle" id="qiscus-typing-indicator"></div>
                        </div>
                    </div>
                    <button class="qiscus-close-btn" id="qiscus-close-btn">
                        ✕
                    </button>
                </div>
                
                <div class="qiscus-messages" id="qiscus-messages">
                    <div class="qiscus-empty-state"><p>Start a conversation</p></div>
                </div>
                
                <div class="qiscus-input-area">
                    <button class="qiscus-attach-btn" id="qiscus-attach-btn" title="Attach file">
                        📎
                    </button>
                    <input 
                        type="text" 
                        id="qiscus-message-input" 
                        placeholder="Type a message..." 
                        class="qiscus-message-input"
                    />
                    <button class="qiscus-send-btn" id="qiscus-send-btn">
                        <img src="https://cdn-icons-png.flaticon.com/128/3682/3682321.png" alt="Send" width="20" height="20" />
                    </button>
                </div>
                
                <input 
                    type="file" 
                    id="qiscus-file-input" 
                    style="display: none;" 
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                
                <div class="qiscus-upload-progress" id="qiscus-upload-progress" style="display: none;">
                    <div class="qiscus-upload-info">
                        <span id="qiscus-upload-filename">Uploading...</span>
                        <span id="qiscus-upload-percent">0%</span>
                    </div>
                    <div class="qiscus-progress-bar">
                        <div class="qiscus-progress-fill" id="qiscus-progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .qiscus-widget-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .qiscus-chat-button {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: ${this.theme.primaryColor};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s ease;
                position: relative;
            }
            
            .qiscus-chat-button:hover { transform: scale(1.1); }
            
            .qiscus-unread-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff4757;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
            }
            
            .qiscus-unread-badge.show { display: flex; }
            
            .qiscus-chat-window {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 380px;
                height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }
            
            .qiscus-widget-container.open .qiscus-chat-window { display: flex; }
            .qiscus-widget-container.open .qiscus-chat-button { display: none; }
            
            .qiscus-header {
                background: ${this.theme.primaryColor};
                color: white;
                padding: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .qiscus-header-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .qiscus-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .qiscus-avatar svg {
                width: 24px;
                height: 24px;
            }
            
            .qiscus-header-title {
                font-weight: 600;
                font-size: 16px;
            }
            
            .qiscus-header-subtitle {
                font-size: 12px;
                opacity: 0.9;
            }
            
            .qiscus-close-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: 300;
                line-height: 1;
                width: 32px;
                height: 32px;
            }
            
            .qiscus-close-btn:hover {
                opacity: 0.8;
            }
            
            .qiscus-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #f9f9f9;
            }
            
            .qiscus-empty-state {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #999;
            }
            
            .qiscus-message {
                margin-bottom: 12px;
                display: flex;
                flex-direction: column;
            }
            
            .qiscus-message.right { align-items: flex-end; }
            
            .qiscus-message-sender {
                font-size: 12px;
                font-weight: 600;
                color: #666;
                margin-bottom: 4px;
                padding-left: 4px;
            }
            
            .qiscus-message-bubble {
                max-width: 70%;
                padding: 10px 14px;
                border-radius: 12px;
                word-wrap: break-word;
            }
            
            .qiscus-message.left .qiscus-message-bubble {
                background: ${this.theme.secondaryColor};
                color: #333;
            }
            
            .qiscus-message.right .qiscus-message-bubble {
                background: ${this.theme.primaryColor};
                color: white;
            }
            
            .qiscus-message-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
            }
            
            .qiscus-input-area {
                padding: 16px;
                background: white;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 8px;
            }
            
            .qiscus-message-input {
                flex: 1;
                padding: 10px 14px;
                border: 1px solid #e0e0e0;
                border-radius: 20px;
                outline: none;
                font-size: 14px;
            }
            
            .qiscus-message-input:focus { border-color: ${this.theme.primaryColor}; }
            
            .qiscus-send-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: ${this.theme.primaryColor};
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.2s ease;
            }
            
            .qiscus-send-btn:hover { opacity: 0.9; }
            .qiscus-send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .qiscus-attach-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #f5f5f5;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                transition: background 0.2s ease;
            }
            
            .qiscus-attach-btn:hover {
                background: #e0e0e0;
            }
            
            .qiscus-upload-progress {
                padding: 12px 16px;
                background: #f5f5f5;
                border-top: 1px solid #e0e0e0;
            }
            
            .qiscus-upload-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 13px;
                color: #666;
            }
            
            .qiscus-progress-bar {
                width: 100%;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
                overflow: hidden;
            }
            
            .qiscus-progress-fill {
                height: 100%;
                background: ${this.theme.primaryColor};
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .media-message {
                margin: 8px 0;
            }
            
            .media-message img,
            .media-message video {
                max-width: 300px;
                max-height: 300px;
                border-radius: 8px;
                cursor: pointer;
                display: block;
            }
            
            .media-message .file-name {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
            }
            
            .media-message .file-link {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: #f5f5f5;
                border-radius: 8px;
                text-decoration: none;
                color: #333;
                transition: background 0.2s ease;
            }
            
            .media-message .file-link:hover {
                background: #e0e0e0;
            }
            
            .media-message .file-icon {
                font-size: 32px;
            }
            
            .media-message .file-info {
                flex: 1;
            }
            
            .media-message .file-info .file-name {
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .media-message .file-info .file-size {
                font-size: 12px;
                color: #999;
            }
            
            @media (max-width: 480px) {
                .qiscus-chat-window {
                    width: calc(100vw - 40px);
                    height: calc(100vh - 100px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        const chatButton = document.getElementById('qiscus-chat-button');
        chatButton?.addEventListener('click', () => {
            this.eventEmitter.emit('ui:chatButtonClick');
        });

        const closeBtn = document.getElementById('qiscus-close-btn');
        closeBtn?.addEventListener('click', () => {
            this.eventEmitter.emit('ui:closeClick');
        });

        const sendBtn = document.getElementById('qiscus-send-btn');
        sendBtn?.addEventListener('click', () => {
            this.eventEmitter.emit('ui:sendClick');
        });

        const input = document.getElementById('qiscus-message-input');
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.eventEmitter.emit('ui:sendClick');
            }
        });

        // Attach button event
        const attachBtn = document.getElementById('qiscus-attach-btn');
        attachBtn?.addEventListener('click', () => {
            const fileInput = document.getElementById('qiscus-file-input');
            fileInput?.click();
        });

        // File input change event
        const fileInput = document.getElementById('qiscus-file-input');
        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.eventEmitter.emit('ui:fileSelected', file);
            }
        });
    }

    openWidget() {
        this.container?.classList.add('open');
        this.scrollToBottom();
    }

    closeWidget() {
        this.container?.classList.remove('open');
    }

    renderMessages(messages, currentUserEmail) {
        const messagesContainer = document.getElementById('qiscus-messages');
        if (!messagesContainer) return;

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="qiscus-empty-state"><p>Start a conversation</p></div>';
            return;
        }

        messagesContainer.innerHTML = messages.map(msg => {
            // Check if message is from customer (current user) using user_extras
            const isCustomer = msg.user_extras?.is_customer === true;
            const isOwn = isCustomer;
            
            const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const senderName = isOwn ? 'You' : (msg.username || 'Customer Service');

            // Check if message is a media message
            const mediaContent = this.renderMediaContent(msg);

            return `
                <div class="qiscus-message ${isOwn ? 'right' : 'left'}">
                    ${!isOwn ? `<div class="qiscus-message-sender">${this.escapeHtml(senderName)}</div>` : ''}
                    ${mediaContent ? mediaContent : `<div class="qiscus-message-bubble">${this.escapeHtml(msg.message)}</div>`}
                    <div class="qiscus-message-time">${time}</div>
                </div>
            `;
        }).join('');

        this.scrollToBottom();
    }

    updateUnreadBadge(count) {
        const badge = document.getElementById('qiscus-unread-badge');
        if (badge) {
            badge.textContent = count;
            badge.classList.toggle('show', count > 0);
        }
    }

    updateTypingIndicator(isTyping) {
        const indicator = document.getElementById('qiscus-typing-indicator');
        if (indicator) {
            indicator.textContent = isTyping ? 'typing...' : '';
        }
    }

    getMessageInput() {
        return document.getElementById('qiscus-message-input');
    }

    clearMessageInput() {
        const input = this.getMessageInput();
        if (input) input.value = '';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('qiscus-messages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render media content for custom messages
     * @param {Object} message - Message object
     * @returns {string|null} - HTML string or null
     */
    renderMediaContent(message) {
        if (message.type !== 'custom' || !message.payload) return null;

        try {
            const payload = typeof message.payload === 'string' 
                ? JSON.parse(message.payload) 
                : message.payload;
            
            const content = payload.content;

            if (!content || !content.url) {
                return null;
            }

            if (payload.type === 'image') {
                return `
                    <div class="qiscus-message-bubble">
                        <div class="media-message">
                            <img src="${content.url}" 
                                 alt="${content.file_name || 'Image'}" 
                                 onclick="window.open('${content.url}', '_blank')"
                                 style="max-width: 250px; max-height: 250px; border-radius: 8px; cursor: pointer;">
                            ${content.file_name ? `<div class="file-name">${this.escapeHtml(content.file_name)}</div>` : ''}
                        </div>
                    </div>
                `;
            } else if (payload.type === 'video') {
                return `
                    <div class="qiscus-message-bubble">
                        <div class="media-message">
                            <video controls style="max-width: 250px; max-height: 250px; border-radius: 8px;">
                                <source src="${content.url}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            ${content.file_name ? `<div class="file-name">${this.escapeHtml(content.file_name)}</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                const fileSize = content.size ? this.formatFileSize(content.size) : 'File';
                const fileIcon = this.getFileIcon(content.file_name);
                
                return `
                    <div class="qiscus-message-bubble">
                        <div class="media-message">
                            <a href="${content.url}" target="_blank" class="file-link">
                                <span class="file-icon">${fileIcon}</span>
                                <div class="file-info">
                                    <div class="file-name">${this.escapeHtml(content.file_name)}</div>
                                    <div class="file-size">${fileSize}</div>
                                </div>
                            </a>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error('[UIService] Error rendering media:', e);
            return null;
        }
    }

    /**
     * Get file icon emoji
     */
    getFileIcon(filename) {
        if (!filename) return '📎';
        
        const ext = filename.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
        const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
        
        if (imageExts.includes(ext)) return '🖼️';
        if (videoExts.includes(ext)) return '🎥';
        if (docExts.includes(ext)) return '📄';
        return '📎';
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Show upload progress
     */
    showUploadProgress(filename, percent) {
        const progressDiv = document.getElementById('qiscus-upload-progress');
        const filenameSpan = document.getElementById('qiscus-upload-filename');
        const percentSpan = document.getElementById('qiscus-upload-percent');
        const progressFill = document.getElementById('qiscus-progress-fill');

        if (progressDiv && filenameSpan && percentSpan && progressFill) {
            progressDiv.style.display = 'block';
            filenameSpan.textContent = filename;
            percentSpan.textContent = percent + '%';
            progressFill.style.width = percent + '%';
        }
    }

    /**
     * Hide upload progress
     */
    hideUploadProgress() {
        const progressDiv = document.getElementById('qiscus-upload-progress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }

        // Clear file input
        const fileInput = document.getElementById('qiscus-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }
}
