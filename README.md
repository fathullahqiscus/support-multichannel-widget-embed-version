# Qiscus Multichannel Widget - Vanilla JavaScript

A production-ready, SOLID-compliant customer support chat widget for websites. Built with vanilla JavaScript, no frameworks required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://www.ecma-international.org/ecma-262/)

## 🚀 Quick Start

### 1. Include the Widget Files

```html
<script src="services/EventEmitter.js"></script>
<script src="services/StorageService.js"></script>
<script src="services/SDKService.js"></script>
<script src="services/APIService.js"></script>
<script src="services/StateManager.js"></script>
<script src="services/UIService.js"></script>
<script src="services/ChatService.js"></script>
<script src="qiscus-widget-refactored.js"></script>
```

### 2. Initialize the Widget

```javascript
const widget = new QiscusMultichannelWidget({
    appId: 'YOUR_APP_ID',
    primaryColor: '#55B29A'
});

widget.setUser({
    userId: 'customer@example.com',
    displayName: 'John Doe'
});

widget.initiateChat();
```

## 📚 Documentation

### Interactive Tutorial (Recommended)

We provide a comprehensive **Google Codelab** tutorial with step-by-step instructions:

#### Generate the Codelab

```bash
# Quick start - run the generator script
./generate-docs.sh

# Or manually with claat
claat export codelab.md
claat serve
```

Visit: `http://localhost:9090`

#### Setup Instructions

See [CODELAB_SETUP.md](./CODELAB_SETUP.md) for detailed setup instructions.

### Documentation Files

- **[codelab.md](./codelab.md)** - Interactive tutorial source
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[API_IMPLEMENTATION_STATUS.md](./API_IMPLEMENTATION_STATUS.md)** - Implementation details
- **[CODELAB_SETUP.md](./CODELAB_SETUP.md)** - Codelab generation guide

## ✨ Features

- ✅ **Zero Dependencies** - Pure vanilla JavaScript
- ✅ **SOLID Principles** - Clean, maintainable architecture
- ✅ **Session Persistence** - Automatic session management
- ✅ **Real-time Messaging** - Instant message delivery
- ✅ **Event-Driven** - Flexible event system
- ✅ **Customizable UI** - Easy theming and styling
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Production Ready** - Battle-tested code

## 🏗️ Architecture

The widget follows SOLID principles with a service-oriented architecture:

```
qiscus-widget-refactored.js (Main Orchestrator)
├── EventEmitter (Observer Pattern)
├── StorageService (Session Management)
├── SDKService (Qiscus SDK Wrapper)
├── APIService (HTTP Client)
├── StateManager (State Management)
├── UIService (DOM Manipulation)
└── ChatService (Business Logic)
```

### Key Benefits

- **Single Responsibility**: Each service has one clear purpose
- **Open/Closed**: Easy to extend without modifying existing code
- **Liskov Substitution**: Services can be swapped with compatible implementations
- **Interface Segregation**: Services expose only necessary methods
- **Dependency Inversion**: Depends on abstractions, not concrete implementations

## 📖 Usage Examples

### Basic Integration

```javascript
const widget = new QiscusMultichannelWidget({
    appId: 'YOUR_APP_ID',
    channelId: 'YOUR_CHANNEL_ID',
    primaryColor: '#55B29A',
    onReady: (widget) => {
        console.log('Widget ready!');
    }
});

widget.setUser({
    userId: 'user@example.com',
    displayName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    extras: {
        department: 'Sales'
    },
    userProperties: {
        plan: 'Premium'
    }
});

await widget.initiateChat();
```

### Event Handling

```javascript
// Listen to specific events
widget.eventEmitter.on('message:received', (message) => {
    console.log('New message:', message);
});

widget.eventEmitter.on('message:sent', (message) => {
    console.log('Message sent:', message);
});

widget.eventEmitter.on('state:unreadChanged', (count) => {
    console.log('Unread messages:', count);
});
```

### Programmatic Control

```javascript
// Open/close widget
widget.openWidget();
widget.closeWidget();
widget.toggleWidget();

// Send messages
widget.sendMessage('Hello!');

// Load more messages
widget.loadMoreMessages();

// Clear session
widget.clearUser();
```

## 🎨 Customization

### Theme Configuration

```javascript
const widget = new QiscusMultichannelWidget({
    appId: 'YOUR_APP_ID',
    primaryColor: '#007bff',
    secondaryColor: '#f0f0f0',
    theme: {
        fontFamily: 'Arial, sans-serif',
        borderRadius: '12px'
    }
});
```

### Custom CSS

```css
/* Customize chat button */
.qiscus-chat-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Customize header */
.qiscus-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Customize message bubbles */
.qiscus-message.right .qiscus-message-bubble {
    background: #667eea;
    border-radius: 18px 18px 4px 18px;
}
```

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appId` | string | **required** | Your Qiscus App ID |
| `channelId` | string | optional | Specific channel ID |
| `baseURL` | string | `https://multichannel.qiscus.com` | API base URL |
| `primaryColor` | string | `#55B29A` | Main theme color |
| `secondaryColor` | string | `#F4F4F4` | Secondary color |
| `onReady` | function | `() => {}` | Called when widget is ready |
| `onLoginSuccess` | function | `() => {}` | Called on successful login |
| `onLoginError` | function | `() => {}` | Called on login error |
| `onMessageReceived` | function | `() => {}` | Called when message received |
| `onMessageSent` | function | `() => {}` | Called when message sent |
| `onRoomChanged` | function | `() => {}` | Called when room changes |
| `onTyping` | function | `() => {}` | Called on typing status change |

## 🧪 Testing

### Local Development

```bash
# Start a local server
python -m http.server 8000

# Or with Node.js
npx http-server -p 8000

# Open in browser
open http://localhost:8000/example-refactored.html
```

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📦 Production Deployment

### 1. Minify Files

```bash
# Using Terser
npm install -g terser
terser services/*.js qiscus-widget-refactored.js \
  --compress \
  --mangle \
  --output qiscus-widget.min.js
```

### 2. CDN Hosting

```html
<script src="https://cdn.yourcompany.com/qiscus-widget.min.js"></script>
```

### 3. Async Loading

```html
<script>
    (function() {
        const script = document.createElement('script');
        script.src = 'https://cdn.yourcompany.com/qiscus-widget.min.js';
        script.async = true;
        script.onload = function() {
            const widget = new QiscusMultichannelWidget({
                appId: 'YOUR_APP_ID'
            });
        };
        document.head.appendChild(script);
    })();
</script>
```

## 🐛 Troubleshooting

### Widget Not Appearing

```javascript
// Check console for errors
console.log('QiscusMultichannelWidget:', typeof QiscusMultichannelWidget);

// Verify App ID
const widget = new QiscusMultichannelWidget({
    appId: 'YOUR_APP_ID',
    onReady: () => console.log('Widget ready!')
});
```

### Messages Not Sending

```javascript
// Ensure user is set
if (!widget.userConfig) {
    console.error('User not set. Call setUser() first.');
}

// Check chat is initiated
widget.initiateChat()
    .then(() => widget.sendMessage('Test'))
    .catch(error => console.error('Error:', error));
```

### Session Not Persisting

```javascript
// Check localStorage
if (typeof(Storage) === "undefined") {
    console.error('localStorage not supported');
}

// Check stored session
const session = localStorage.getItem('QiscusWidget::last-user-data');
console.log('Stored session:', session);
```

## 📄 API Reference

### Main Widget Class

#### Constructor

```javascript
new QiscusMultichannelWidget(config)
```

#### Methods

- `setUser(params)` - Set user information
- `initiateChat()` - Start chat session
- `sendMessage(text, extras)` - Send a message
- `loadMoreMessages()` - Load message history
- `openWidget()` - Open the widget
- `closeWidget()` - Close the widget
- `toggleWidget()` - Toggle widget visibility
- `clearUser()` - Clear user session

### Event Emitter

```javascript
widget.eventEmitter.on(event, callback)
widget.eventEmitter.off(event, callback)
widget.eventEmitter.emit(event, data)
```

### Available Events

- `sdk:loginSuccess` - User logged in
- `sdk:loginError` - Login failed
- `sdk:newMessages` - New messages received
- `sdk:typing` - Typing status changed
- `message:sent` - Message sent
- `message:received` - Message received
- `room:loaded` - Room loaded
- `state:messageAdded` - Message added to state
- `state:unreadChanged` - Unread count changed
- `chat:initiated` - Chat session started
- `chat:error` - Chat error occurred

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- 📧 Email: support@qiscus.com
- 💬 Chat: Use the widget on [qiscus.com](https://qiscus.com)
- 🐛 Issues: [GitHub Issues](https://github.com/fathullahqiscus/support-multichannel-widget-embed-version/issues)
- 📚 Docs: [Interactive Codelab](./codelab.md)

## 🔗 Links

- [Qiscus Dashboard](https://multichannel.qiscus.com/)
- [API Documentation](./API_DOCUMENTATION.md)
- [Codelab Tutorial](./codelab.md)
- [Setup Guide](./CODELAB_SETUP.md)

---

Made with ❤️ by Qiscus Team
