/**
 * APIService - Handles Multichannel API communication
 * Follows Single Responsibility Principle
 */
class APIService {
    constructor(baseURL, qismoBaseURL = 'https://qismo.qiscus.com') {
        this.baseURL = baseURL;
        this.qismoBaseURL = qismoBaseURL;
    }

    /**
     * Initiate Chat - Creates or retrieves a chat session
     * Endpoint: POST /api/v2/qiscus/initiate_chat
     * 
     * @param {Object} params - Chat initiation parameters
     * @param {string} params.app_id - Qiscus application ID
     * @param {string} params.user_id - Unique customer identifier
     * @param {string} params.name - Customer display name
     * @param {string} [params.avatar] - Customer avatar URL
     * @param {Object} [params.sdk_user_extras] - Additional user metadata
     * @param {Object} [params.user_properties] - Custom user properties
     * @param {string} params.nonce - JWT nonce from Qiscus SDK
     * @param {string} [params.channel_id] - Specific channel ID
     * @returns {Promise<Object>} Response with identity_token and customer_room
     */
    async initiateChat(params) {
        const response = await fetch(`${this.baseURL}/api/v2/qiscus/initiate_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errors?.message || 'Failed to initiate chat');
        }

        return await response.json();
    }

    /**
     * Get session status (check if app is sessional)
     * @param {string} appId - Qiscus application ID
     * @returns {Promise<Object>} Response with is_sessional boolean
     */
    async getSessionStatus(appId) {
        const response = await fetch(`${this.qismoBaseURL}/${appId}/get_session`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errors?.message || 'Failed to get session status');
        }

        return await response.json();
    }

    /**
     * Decode JWT Token
     * Extracts payload from JWT identity token
     * 
     * @param {string} token - JWT token string
     * @returns {Object} Decoded JWT payload
     */
    decodeJWT(token) {
        try {
            const parts = token.split('.');
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (error) {
            throw new Error('Invalid JWT token');
        }
    }
}
