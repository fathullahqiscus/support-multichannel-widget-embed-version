# API Documentation

This document describes the external APIs used by the React Native Multichannel Widget.

## Table of Contents

- [Qiscus Multichannel API](#qiscus-multichannel-api)
- [Qismo Session API](#qismo-session-api)
- [Error Handling](#error-handling)

---

## Qiscus Multichannel API

### Base URL

```
https://multichannel.qiscus.com
```

> **Note**: The base URL can be configured via `SetupOptions.baseURLMultichannel` when initializing the widget.

### Endpoints

#### 1. Initiate Chat

Creates a new chat session or returns an existing session for a customer.

**Endpoint**: `POST /api/v2/qiscus/initiate_chat`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | Yes | Your Qiscus application ID |
| `user_id` | string | Yes | Unique identifier for the customer |
| `name` | string | Yes | Display name of the customer |
| `avatar` | string | No | URL to customer's avatar image |
| `sdk_user_extras` | object | No | Additional user metadata/extras |
| `user_properties` | object | No | Custom user properties |
| `nonce` | string | Yes | JWT nonce obtained from Qiscus SDK |
| `channel_id` | string | No | Specific channel ID for widget routing |

**Example Request**:

```json
{
  "app_id": "your-app-id",
  "user_id": "customer-123",
  "name": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "sdk_user_extras": {
    "custom_field": "value"
  },
  "user_properties": {
    "plan": "premium",
    "region": "US"
  },
  "nonce": "jwt-nonce-string",
  "channel_id": "channel-123"
}
```

**Response**:

```json
{
  "data": {
    "identity_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "customer_room": {
      "room_id": "12345",
      "room_name": "Customer Service",
      "avatar_url": "https://example.com/room-avatar.jpg",
      "is_resolved": false
    }
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `identity_token` | string | JWT token for authenticating the user with Qiscus SDK |
| `customer_room.room_id` | string | Unique identifier for the chat room |
| `customer_room.room_name` | string | Name of the chat room |
| `customer_room.avatar_url` | string | Avatar URL for the chat room |
| `customer_room.is_resolved` | boolean | Whether the conversation is marked as resolved |

**Error Response**:

```json
{
  "errors": {
    "message": "Error description here"
  }
}
```

**Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Success - Chat session created or retrieved |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid app_id or authentication |
| 500 | Internal Server Error |

**Implementation Reference**:

See `src/hooks/use-initiate-chat.ts` for the implementation.

---

## Qismo Session API

### Base URL

```
https://qismo.qiscus.com
```

### Endpoints

#### 1. Get Session Status

Checks whether the application is configured for sessional conversations. When a conversation is marked as resolved and the app is sessional, a new chat session will be created instead of continuing the previous one.

**Endpoint**: `GET /{appId}/get_session`

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Your Qiscus application ID |

**Headers**:
```
Content-Type: application/json
```

**Example Request**:

```bash
GET https://qismo.qiscus.com/your-app-id/get_session
```

**Response**:

```json
{
  "data": {
    "is_sessional": true
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `data.is_sessional` | boolean | `true` if the app is configured for sessional conversations, `false` otherwise |

**Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Success - Session status retrieved |
| 400 | Bad Request - Invalid app ID |
| 404 | Not Found - App ID does not exist |
| 500 | Internal Server Error |

**Usage Context**:

This endpoint is called when:
1. A conversation has been marked as resolved (either via `room.extras.is_resolved` or last message contains "admin marked this conversation as resolved")
2. The widget needs to determine whether to create a new session or continue with the existing room

**Implementation Reference**:

See `src/hooks/use-get-sessions.ts` for the implementation.

---

## Error Handling

### General Error Handling Pattern

All API calls in the widget use axios and follow this error handling pattern:

```typescript
try {
  const response = await axios.post(url, data);
  return response.data;
} catch (error) {
  // Parse error response
  const errorMessage = JSON.parse(error.request.response).errors.message;
  throw new Error(errorMessage);
}
```

### Common Error Scenarios

#### 1. Network Errors
- **Cause**: No internet connection or server unreachable
- **Handling**: Axios will throw a network error that should be caught and displayed to the user

#### 2. Authentication Errors
- **Cause**: Invalid app_id, expired nonce, or invalid identity token
- **Handling**: Re-initialize the SDK and obtain a new nonce

#### 3. Invalid Parameters
- **Cause**: Missing required fields or invalid data format
- **Handling**: Validate input before making API calls

#### 4. Session Conflicts
- **Cause**: Attempting to use an expired or invalid session
- **Handling**: Clear user data and reinitiate chat

### Best Practices

1. **Always validate required parameters** before making API calls
2. **Store identity tokens securely** using AsyncStorage
3. **Handle session expiration** by clearing user data and re-authenticating
4. **Implement retry logic** for transient network errors
5. **Log errors appropriately** for debugging while protecting sensitive data

---

## Configuration

### Setting Custom Base URLs

You can configure custom base URLs when setting up the widget:

```typescript
import { useSetup } from '@qiscus-community/react-native-multichannel-widget';

const setup = useSetup();

await setup('your-app-id', {
  baseURLMultichannel: 'https://your-custom-domain.com'
});
```

### Default Configuration

| Setting | Default Value |
|---------|---------------|
| `baseURLMultichannel` | `https://multichannel.qiscus.com` |

---

## Rate Limiting

> **Note**: Specific rate limiting policies are not documented in the codebase. Contact Qiscus support for rate limit information.

**Recommended practices**:
- Implement exponential backoff for retries
- Cache session data when possible
- Avoid unnecessary API calls by checking local state first

---

## Security Considerations

1. **Never expose your app_id** in public repositories
2. **Use HTTPS** for all API communications (enforced by default)
3. **Validate JWT tokens** on your backend if implementing custom authentication
4. **Store tokens securely** using platform-specific secure storage
5. **Implement proper session management** to prevent unauthorized access

---

## Additional Resources

- [Qiscus Multichannel Dashboard](https://multichannel.qiscus.com/)
- [Qiscus Documentation](https://documentation.qiscus.com/)
- Widget Implementation: `src/hooks/use-initiate-chat.ts`
- Session Management: `src/hooks/use-get-sessions.ts`

---

## Support

For API-related issues or questions:
- Visit the [Qiscus Multichannel Dashboard](https://multichannel.qiscus.com/)
- Contact Qiscus support team
- Check the widget's GitHub repository for updates
