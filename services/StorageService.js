/**
 * StorageService - Handles all localStorage operations
 * Follows Single Responsibility Principle
 * Follows Dependency Inversion Principle (can be swapped with different storage)
 */
class StorageService {
    constructor(storageProvider = localStorage) {
        this.storage = storageProvider;
        this.KEYS = {
            lastUserId: 'QiscusWidget::last-user-id',
            lastRoomId: 'QiscusWidget::last-room-id',
            lastUserData: 'QiscusWidget::last-user-data',
            lastUserToken: 'QiscusWidget::last-user-token',
            lastAppId: 'QiscusWidget::last-app-id'
        };
    }

    /**
     * Get item from storage (matches AsyncStorage.getItem)
     * @param {string} key - Storage key name (without prefix)
     * @returns {string|null} Stored value or null
     */
    getItem(key) {
        try {
            const storageKey = this.KEYS[key];
            if (!storageKey) {
                console.warn(`[StorageService] Unknown key: ${key}`);
                return null;
            }
            return this.storage.getItem(storageKey);
        } catch (error) {
            console.error('[StorageService] Get item error:', error);
            return null;
        }
    }

    /**
     * Set item in storage (matches AsyncStorage.setItem)
     * @param {string} key - Storage key name (without prefix)
     * @param {string} value - Value to store
     */
    setItem(key, value) {
        try {
            const storageKey = this.KEYS[key];
            if (!storageKey) {
                console.warn(`[StorageService] Unknown key: ${key}`);
                return;
            }
            this.storage.setItem(storageKey, value);
        } catch (error) {
            console.error('[StorageService] Set item error:', error);
        }
    }

    saveSession(appId, user, token, roomId) {
        try {
            this.storage.setItem(this.KEYS.lastAppId, appId);
            this.storage.setItem(this.KEYS.lastUserId, user.email || user.id);
            this.storage.setItem(this.KEYS.lastUserData, JSON.stringify(user));
            this.storage.setItem(this.KEYS.lastUserToken, token);
            if (roomId) {
                this.storage.setItem(this.KEYS.lastRoomId, roomId.toString());
            }
        } catch (error) {
            console.error('[StorageService] Save session error:', error);
        }
    }

    getSession(appId) {
        try {
            const lastAppId = this.storage.getItem(this.KEYS.lastAppId);
            if (lastAppId !== appId) return null;

            const userData = this.storage.getItem(this.KEYS.lastUserData);
            const userToken = this.storage.getItem(this.KEYS.lastUserToken);
            const roomId = this.storage.getItem(this.KEYS.lastRoomId);

            if (!userData || !userToken) return null;

            return {
                user: JSON.parse(userData),
                token: userToken,
                roomId: roomId ? parseInt(roomId, 10) : null
            };
        } catch (error) {
            console.error('[StorageService] Get session error:', error);
            return null;
        }
    }

    clearSession() {
        Object.values(this.KEYS).forEach(key => {
            this.storage.removeItem(key);
        });
    }
}
