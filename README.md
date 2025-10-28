# Qiscus Multichannel Widget - Vanilla JavaScript

A production-ready, SOLID-compliant customer support chat widget for websites. Built with vanilla JavaScript, no frameworks required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://www.ecma-international.org/ecma-262/)

## 🚀 Quick Start

### 1. Include the Widget Files

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website with Qiscus Chat</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    
    <!-- Load Qiscus Widget Services -->
    <script src="services/EventEmitter.js"></script>
    <script src="services/StorageService.js"></script>
    <script src="services/SDKService.js"></script>
    <script src="services/APIService.js"></script>
    <script src="services/StateManager.js"></script>
    <script src="services/UIService.js"></script>
    <script src="services/ChatService.js"></script>
    <script src="qiscus-widget.js"></script>
</body>
</html>
```

### 2. Initialize the Widget

```javascript
<script>
    // Initialize widget with your App ID
    const widget = new QiscusMultichannelWidget({
        appId: 'YOUR_APP_ID',
        channelId: 'YOUR_CHANNEL_ID', // Optional
        primaryColor: '#55B29A',
        onReady: (widget) => {
            console.log('Widget is ready!');
        }
    });

    // Set user information
    widget.setUser({
        userId: 'customer@example.com',
        displayName: 'John Doe',
        avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe',
        extras: {
            department: 'Sales'
        },
        userProperties: {
            plan: 'Premium'
        }
    });

    // Initiate chat
    widget.initiateChat();
</script>
```

## 📚 Documentation

### Available Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference with all endpoints and parameters
- **[index.html](./index.html)** - Working example implementation
- **[docs/index.html](./docs/index.html)** - Interactive documentation (open in browser)

## ✨ Features

- ✅ **Zero Dependencies** - Pure vanilla JavaScript
- ✅ **SOLID Principles** - Clean, maintainable architecture
- ✅ **Smart Session Restoration** - Automatic session recovery with error handling
- ✅ **Resolved Room Detection** - Intelligent conversation state management
- ✅ **Sessional Conversations** - Support for resolved/new session workflows
- ✅ **Real-time Messaging** - Instant message delivery
- ✅ **Event-Driven** - Flexible event system
- ✅ **Customizable UI** - Easy theming and styling
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Production Ready** - Battle-tested code

## 🏗️ Architecture

The widget follows SOLID principles with a service-oriented architecture:

```
qiscus-widget.js (Main Orchestrator)
├── EventEmitter (Observer Pattern)
├── StorageService (Session Management)
├── SDKService (Qiscus SDK Wrapper)
├── APIService (HTTP Client)
├── StateManager (State Management)
├── UIService (DOM Manipulation)
└── ChatService (Business Logic)
```

### Project Structure

```
vanilla-js-examples/
├── services/
│   ├── EventEmitter.js      # Event system for loose coupling
│   ├── StorageService.js    # localStorage management
│   ├── SDKService.js        # Qiscus SDK wrapper
│   ├── APIService.js        # HTTP API client
│   ├── StateManager.js      # State management
│   ├── UIService.js         # DOM manipulation & rendering
│   └── ChatService.js       # Business logic orchestration
├── qiscus-widget.js         # Main widget class
├── index.html               # Example implementation
├── docs/                    # Interactive documentation
└── API_DOCUMENTATION.md     # API reference
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

### Session Restoration

The widget automatically restores user sessions on page refresh:

```javascript
// On page load, the widget checks for existing session
const widget = new QiscusMultichannelWidget({
    appId: 'YOUR_APP_ID',
    onReady: async (widget) => {
        // Session is automatically restored during initialization
        console.log('Widget ready');
    }
});

// Listen for session restoration
widget.eventEmitter.on('chat:restored', (data) => {
    console.log('Session restored!');
    console.log('User:', data.user);
    console.log('Room ID:', data.roomId);
    console.log('Room:', data.room);
    console.log('Messages:', data.messages.length);
});

// If session exists, initiateChat will restore it
// If session doesn't exist or restoration fails, it creates new session
await widget.initiateChat();
```

### Resolved Room Handling

The widget intelligently handles resolved conversations:

```javascript
// When a room is marked as resolved:
// 1. Widget checks room.options.is_resolved flag
// 2. If resolved AND app is sessional → creates new session
// 3. If resolved AND app is NOT sessional → restores existing room
// 4. If NOT resolved → always restores existing room

// Check if room is resolved
const isResolved = widget.chatService.checkIfRoomResolved();
console.log('Room resolved:', isResolved);

// The widget automatically handles this during initiateChat()
```

### Event Handling

```javascript
// Listen to specific events
widget.eventEmitter.on('chat:restored', (data) => {
    console.log('Session restored:', data.user);
    console.log('Room:', data.room);
    console.log('Messages:', data.messages.length);
});

widget.eventEmitter.on('message:received', (message) => {
    console.log('New message:', message);
});

widget.eventEmitter.on('message:sent', (message) => {
    console.log('Message sent:', message);
});

widget.eventEmitter.on('chat:error', (error) => {
    console.error('Chat error:', error);
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

// Update room info (refresh room and messages)
await widget.updateRoomInfo(roomId);

// Clear session (use when session restoration fails)
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
open http://localhost:8000/index.html
```

### View Documentation

```bash
# Open interactive documentation
open docs/index.html
```

### Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📦 Production Deployment

### 1. Minify Files

```bash
# Using Terser
npm install -g terser
terser services/*.js qiscus-widget.js \
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

### Session Restoration Failed

```javascript
// If you see: "Failed to restore existing session"
// This means the widget found a session but couldn't restore it

// Solution 1: Clear the session and try again
widget.clearUser();
widget.setUser({ userId: 'user@example.com', displayName: 'John' });
await widget.initiateChat();

// Solution 2: Manually clear localStorage
Object.keys(localStorage)
    .filter(key => key.startsWith('QiscusWidget::'))
    .forEach(key => localStorage.removeItem(key));

// Then reinitialize
widget.setUser({ userId: 'user@example.com', displayName: 'John' });
await widget.initiateChat();
```

## 📄 API Reference

### Main Widget Class

#### Constructor

```javascript
new QiscusMultichannelWidget(config)
```

#### Methods

- `setUser(params)` - Set user information
- `initiateChat()` - Start chat session (restores existing session or creates new)
- `sendMessage(text, extras)` - Send a message
- `loadMoreMessages()` - Load message history
- `updateRoomInfo(roomId)` - Update room info with messages (returns [room, messages])
- `openWidget()` - Open the widget
- `closeWidget()` - Close the widget
- `toggleWidget()` - Toggle widget visibility
- `clearUser()` - Clear user session (use when restoration fails)

### Event Emitter

```javascript
widget.eventEmitter.on(event, callback)
widget.eventEmitter.off(event, callback)
widget.eventEmitter.emit(event, data)
```

### Available Events

#### Session Events
- `chat:initiated` - New chat session created
- `chat:restored` - Session restored from localStorage (includes user, room, messages)
- `chat:error` - Chat error occurred (e.g., session restoration failed)
- `session:cleared` - Session cleared by user

#### Authentication Events
- `sdk:loginSuccess` - User logged in to SDK
- `sdk:loginError` - SDK login failed
- `sdk:userSet` - User set with token

#### Message Events
- `message:sent` - Message sent successfully
- `message:received` - New message received
- `sdk:newMessages` - Multiple new messages received
- `state:messageAdded` - Message added to state

#### Room Events
- `room:loaded` - Room data loaded
- `state:unreadChanged` - Unread message count changed

#### UI Events
- `sdk:typing` - Typing status changed

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
- 📚 Docs: [API Documentation](./API_DOCUMENTATION.md)

## 🔗 Links

- [Qiscus Dashboard](https://multichannel.qiscus.com/)
- [API Documentation](./API_DOCUMENTATION.md)
- [Interactive Docs](./docs/index.html)
- [Example Implementation](./index.html)

## 📋 Getting Started Checklist

- [ ] Get your App ID from [Qiscus Dashboard](https://multichannel.qiscus.com/)
- [ ] Download or clone this repository
- [ ] Include all service files in your HTML
- [ ] Initialize widget with your App ID
- [ ] Set user information
- [ ] Call `initiateChat()` to start
- [ ] Test in browser
- [ ] Customize styling to match your brand
- [ ] Deploy to production

## 🎯 Next Steps

1. **Review the example**: Open `index.html` to see a working implementation
2. **Read API docs**: Check `API_DOCUMENTATION.md` for complete API reference
3. **Customize**: Modify colors, styling, and behavior to match your needs
4. **Test**: Try the widget with your Qiscus account
5. **Deploy**: Follow production deployment guide above

---

Made with ❤️ by Qiscus Team
