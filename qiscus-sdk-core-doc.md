# Qiscus Web SDK Core – Developer Documentation
*(Easy-to-read & Single Markdown Doc)*

## 📌 Overview

`QiscusSDK` adalah inti dari Chat SDK (JavaScript) yang menyediakan:

- Autentikasi user  
- Room & message management  
- Realtime messaging via MQTT  
- HTTP API adapter  
- Sync adapter  
- Custom event system  
- Comment sending (pending → sent → delivered → read)  
- Typing, presence, group management, file upload, dll.  

SDK ini memanfaatkan berbagai adapter agar modul tetap modular:  
- **HTTPAdapter** → komunikasi REST API  
- **AuthAdapter** → login, refresh token  
- **RoomAdapter** → mendapatkan dan membuat room  
- **UserAdapter** → user list, presence, message search  
- **MQTT Adapter** → realtime message & presence  
- **SyncAdapter** → fallback sync jika realtime mati  
- **HookAdapter** → middleware untuk intercept message  

---

# 1. Core Concepts

## 1.1 State penting dalam QiscusSDK

QiscusSDK menyimpan berbagai state internal:

| Property | Fungsi |
|---------|--------|
| `userData` | Data user yang sedang login |
| `rooms` | List semua room |
| `selected` | Room yang sedang aktif |
| `pendingCommentId` | ID sementara untuk pending comment |
| `uploadFile` | Track upload file |
| `mqttURL`, `baseURL` | Endpoint backend & realtime |
| `version` | Versi SDK |
| Flags seperti `enableSync`, `enableRealtime`, `updateCommentStatusMode` | Control behavior SDK |

---

# 2. SDK Initialization Flow

## 2.1 Cara kerja `init()`

`init(config)` melakukan hal-hal berikut:

### 🔧 1. Validasi config
- AppId wajib ada  
- Mendeteksi custom URL (baseURL, mqttURL, brokerLBUrl)

### 🔗 2. Load App Config (remote config)
SDK mengambil config backend:

```
GET api/v2/sdk/config
```

Config ini berisi:
- base_url  
- broker URL  
- realtime flags  
- sync interval  
- event report  
- auto refresh token  

### 🔁 3. Setup adapters
Setelah config di-load:

- `HTTPAdapter` → request REST  
- `realtimeAdapter` → MQTT connection  
- `syncAdapter` → sync fallback  
- `customEventAdapter` → custom event pub/sub  
- Setup event listeners untuk callback  

### ⚡ 4. Realtime event bound
SDK listen ke:

| Event | Fungsi |
|-------|--------|
| `new-message` | pesan masuk |
| `typing` | status mengetik |
| `presence` | online/last seen |
| `message-delivered` | status delivered |
| `message-read` | status read |

---

# 3. Authentication Lifecycle

## 3.1 `setUser(userId, key, username, avatarUrl, extras)`
Flow login/register:

1. Tunggu `init` selesai (config loaded)  
2. Panggil Auth API (login/register)  
3. Simpan token & refresh token  
4. Emit event `login-success`  
5. Hubungkan MQTT  
6. Setup auto refresh token + sync

### Setelah login SDK akan:
- Subscribe presence & typing  
- Mulai sync interval  
- Publish online presence tiap 3.5 detik  

---

# 4. Room Management

## 4.1 Membuat / Mendapatkan room

### **chatTarget(userId, options?)**
Digunakan untuk membuat atau membuka 1-on-1 room.

### **chatGroup(roomId)**  
Membuka group room existing.

### **getRoomById(id)**  
Load room + comments.

### **getOrCreateRoomByUniqueId(uniqueId)**  
Digunakan untuk **channel** atau room unik.

### **loadRoomList(params)**  
Memuat daftar room dengan pagination dan opsi filter:

```js
const params = {
  page: 1,
  limit: 100,
  show_participants: false,
  show_empty: false,
  show_removed: false,
};

qiscus.loadRoomList(params)
  .then((rooms) => {
    // rooms: array of room objects
  })
  .catch((err) => {
    // handle error
  });
```

- `show_participants` → jika `true`, ikutkan daftar peserta.  
- `show_empty` → jika `true`, tampilkan room tanpa pesan.  
- Gunakan `page` dan `limit` untuk pagination.
- SDK memetakan response menjadi instance `Room` dan menyalin beberapa field praktis: `last_comment_id`, `last_comment_message`, `last_comment_message_created_at`, `room_type`, serta menyiapkan `comments = []` untuk dipakai UI.

## 4.2 setActiveRoom(room)
Saat room diaktifkan:

- Subscribe typing event  
- Subscribe presence (untuk room single)  
- Reset state typing & presence  
- Emit event `room-changed`  

---

# 5. Comment Lifecycle

Proses pengiriman pesan di SDK:

```
pending → sent → delivered → read
```

## 5.1 `sendComment()`

### Langkah internal:

1. Format pesan → apply hooks `MESSAGE_BEFORE_SENT`  
2. Buat objek `Comment` dengan status pending  
3. Push comment ke UI (optimistic update)  
4. Kirim via HTTP (`userAdapter.postComment`)  
5. Response diterima → update status jadi sent  
6. MQTT read/delivered event akan update status berikutnya  

SDK melakukan retry otomatis hingga 10x jika:
- Offline  
- Status 408, 413, 429, 5xx  
- Timeout  

Jika gagal 10x → emit `comment-retry-exceed`.

## 5.2 Handling new messages

Masuk melalui:

- MQTT realtime  
- SyncAdapter fallback  

Semua message masuk melewati:

```
Hook: MESSAGE_BEFORE_RECEIVED
```

---

# 6. Presence, Typing & Events

## 6.1 Presence
SDK publish presence dengan interval 3.5s.

### Subscribe presence user lain:
```js
subscribeUserPresence(userId)
unsubscribeUserPresence(userId)
```

## 6.2 Typing
```js
publishTyping(true)
publishTyping(false)
```

## 6.3 Custom Event
```js
publishEvent(name, payload)
subscribeEvent(...)
unsubscribeEvent(...)
```

---

# 7. File Upload

## 7.1 Upload File via HTTPAdapter
```js
upload(file, callback)
```

## 7.2 Upload with posting to room
```js
uploadFile(roomId, file)
```

Flow:
- Upload ke server  
- Emit event `fileupload`  
- Kirim comment file attachment  

---

# 8. Hooks / Interceptor System

Hook memungkinkan developer intercept message inbound/outbound:

### Hooks yang tersedia:
- `MESSAGE_BEFORE_SENT`
- `MESSAGE_BEFORE_RECEIVED`
- dll.

### Register interceptor:
```js
qiscus.intercept(qiscus.Interceptor.MESSAGE_BEFORE_SENT, (msg) => {
  msg.message = filterText(msg.message)
  return msg
})
```

---

# 9. Misc Utilities

## 9.1 Search messages
```js
searchMessage({ query, roomIds, userId, type })
```

## 9.2 Get file list
```js
getFileList({ roomIds, fileType })
```

## 9.3 Generate messages without sending
Digunakan untuk UI local preview:

```js
generateMessage()
generateFileAttachmentMessage()
generateCustomMessage()
generateReplyMessage()
```

---

# 10. Realtime Connection Controls

```js
closeRealtimeConnection()
openRealtimeConnection()
startSync()
stopSync()
```

---

# 11. Error Handling & Logging

Gunakan `debugMode = true` untuk enabling SDK internal logs.

---

# 12. Minimal Usage Example

```javascript
import QiscusSDK from './QiscusSDK'

const qiscus = new QiscusSDK()

await qiscus.init({ AppId: 'your-app-id' })
await qiscus.setUser('user1', 'password', 'User One')

const room = await qiscus.chatTarget('user2')
qiscus.sendComment(room.id, 'Hello!')
qiscus.events.on('newmessages', (msgs) => console.log(msgs))
```

---

# 13. Event Summary

| Event | Kapan Dipanggil |
|-------|----------------|
| `login-success` | setelah login berhasil |
| `newmessages` | pesan masuk |
| `comment-delivered` | status delivered |
| `comment-read` | status read |
| `chat-room-created` | membuat room baru |
| `group-room-created` | ketika group dibuat |
| `presence` | presence update |
| `typing` | typing update |
| `comment-deleted` | pesan dihapus |
| `room-cleared` | room dihapus |

---

# 14. Architecture Diagram (Simplified)

```
             ┌─────────────────────────┐
             │        QiscusSDK        │
             └─────────────┬───────────┘
                           │
        ┌──────────────────┼───────────────────┐
        │                  │                   │
   HTTPAdapter        MQTTAdapter          SyncAdapter
        │                  │                   │
   UserAdapter         Realtime           HTTP Fallback
   RoomAdapter        Presence/typing         Events
   AuthAdapter        Message events       Message fetch
```

---

# 15. Conclusion

Dokumen ini adalah *easy-to-digest* versi dari seluruh kode `QiscusSDK`, menjelaskan:

- Struktur  
- Alur inisialisasi  
- Realtime lifecycle  
- Pengiriman pesan  
- Hooks system  
- Room & user management  
- Sync fallback  
- File upload  
- Event handling  
