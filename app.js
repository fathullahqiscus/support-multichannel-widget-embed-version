const qs = (selector) => document.querySelector(selector);

// Elements
const widgetEl = qs("#chat-widget");
const fabEl = qs("#fab-chat");
const btnClose = qs("#btn-close");
const btnBack = qs("#btn-back");
const titleEl = qs("#widget-title");
const subtitleEl = qs("#widget-subtitle");

const views = {
  login: qs("#view-login"),
  rooms: qs("#view-room-list"),
  chat: qs("#view-chat"),
};

// Config
const DEFAULT_CONFIG = {
  appId: "sdksample",
  baseUrl: "https://api.qiscus.com",
  statusMode: "auto",
};

// State
let qiscus = null;
const state = {
  rooms: [],
  messages: {}, // roomId -> array
  activeRoomId: null,
  typingUsers: new Set(),
  roomParams: { page: 1, limit: 20 },
  currentView: "login", // login, rooms, chat
  isWidgetOpen: false,
};

// --- View Management ---

function toggleWidget() {
  state.isWidgetOpen = !state.isWidgetOpen;
  if (state.isWidgetOpen) {
    widgetEl.classList.remove("hidden");
    fabEl.classList.add("hidden");
    // Auto init if needed
    setTimeout(() => {
      if (!qiscus) ensureSdkInitialized();
    }, 100);
  } else {
    widgetEl.classList.add("hidden");
    fabEl.classList.remove("hidden");
  }
}

function switchView(viewName) {
  state.currentView = viewName;
  Object.values(views).forEach((el) => el.classList.add("hidden"));
  views[viewName].classList.remove("hidden");

  // Header State
  if (viewName === "chat") {
    btnBack.classList.remove("hidden");
  } else {
    btnBack.classList.add("hidden");
    titleEl.textContent = "Qiscus Chat";
    subtitleEl.textContent = "";
    subtitleEl.classList.add("hidden");
  }

  if (viewName === "rooms") {
    renderRooms();
  }
}

// --- SDK Initialization ---

async function ensureSdkInitialized() {
  if (qiscus) return true;
  if (!window.QiscusSDKCore) {
    console.error("QiscusSDK not loaded yet. Waiting...");
    // Simple retry mechanism or alert
    setTimeout(ensureSdkInitialized, 500);
    return false;
  }
  try {
    qiscus = new QiscusSDKCore();
    // Basic event bindings
    bindSdkEvents();

    await qiscus.init({ AppId: DEFAULT_CONFIG.appId });
    console.log("SDK Initialized");

    // Check if we have a stored session
    if (qiscus.isLogin) {
      console.log("User already logged in", qiscus.userData);
      switchView("rooms");
      loadRoomsFromServer();
    } else {
      switchView("login");
    }
  } catch (err) {
    console.error("SDK Init Error", err);
  }
}

async function handleLogout() {
  try {
    if (qiscus) {
      await qiscus.disconnect();
    }
  } catch (err) {
    console.error("Logout cleanup failed", err);
  } finally {
    state.rooms = [];
    state.messages = {};
    state.activeRoomId = null;
    switchView("login");
    qiscus = null;
  }
}

async function bindSdkEvents() {
  qiscus.events.on("login-success", async (authData) => {
    console.log("Login success", authData);
    //give delay 300 ms
    await new Promise((resolve) => setTimeout(resolve, 300));
    switchView("rooms");
    loadRoomsFromServer();
  });

  qiscus.events.on("newmessages", (messages) => {
    messages.forEach((msg) => addMessageToState(msg.room_id, msg));
  });

  qiscus.events.on("message-delivered", (payload) => {
    // Handle delivery receipts if needed
  });

  qiscus.events.on("message-read", (payload) => {
    // Handle read receipts
  });

  qiscus.events.on("typing", (data) => {
    if (data.room_id === state.activeRoomId) {
      if (data.is_typing) {
        state.typingUsers.add(data.username);
      } else {
        state.typingUsers.delete(data.username);
      }
      updateTypingIndicator();
    }
  });
}

// --- Logic ---

async function handleLogin(formData) {
  if (!qiscus) await ensureSdkInitialized();
  try {
    const { userId, userKey, username } = formData;
    await qiscus.setUser(userId, userKey, username);
    // login-success event will trigger transition
  } catch (err) {
    console.error("Login failed", err);
    alert("Login failed: " + err.message);
  }
}

async function loadRoomsFromServer(page = 1) {
  if (!qiscus) return;
  const nextPage = Math.max(1, page);
  // Fallback when SDK build does not expose loadRoomList
  if (typeof qiscus.loadRoomList !== "function") {
    console.warn("loadRoomList not available on this SDK build, using cached rooms.");
    state.rooms = qiscus.rooms || [];
    state.roomParams.page = nextPage;
    renderRooms();
    return;
  }
  try {
    var params = {
      page: nextPage,
      limit: state.roomParams.limit,
    }
    const res = await qiscus.loadRoomList(params);
    const rooms = Array.isArray(res) ? res : res?.rooms || [];
    state.rooms = rooms;
    state.roomParams.page = nextPage;
    renderRooms();
  } catch (err) {
    console.error("Load rooms failed", err);
  }
}

function setActiveRoom(room) {
  state.activeRoomId = room.id;
  state.typingUsers.clear();

  // Set header info
  titleEl.textContent = room.name || "Chat";
  subtitleEl.textContent = room.id; // Or participant count?
  subtitleEl.classList.remove("hidden");

  // Load messages
  // If we have local messages, show them. Then fetch latest.
  renderMessages();

  qiscus.getRoomById(room.id).then(updatedRoom => {
    // Sync comments
    if (updatedRoom.comments) {
      updatedRoom.comments.forEach(c => addMessageToState(room.id, c));
    }
  }).catch(console.error);

  switchView("chat");
}

function addMessageToState(roomId, msg) {
  if (!state.messages[roomId]) state.messages[roomId] = [];
  const list = state.messages[roomId];
  // Avoid dupes
  const exists = list.some(m => m.unique_temp_id === msg.unique_temp_id || (m.id && m.id === msg.id));
  if (!exists) {
    list.push(msg);
    // Sort
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (state.activeRoomId === roomId && state.currentView === "chat") {
      renderMessages();
    }
  }
}

async function sendMessage(text) {
  if (!state.activeRoomId) return;

  // Optimistic
  const roomId = state.activeRoomId;
  const tempId = `temp-${Date.now()}`;
  const msg = {
    id: null,
    unique_temp_id: tempId,
    message: text,
    timestamp: new Date().toISOString(),
    email: qiscus.userData.email, // identifies 'me'
    sender: { email: qiscus.userData.email, username: qiscus.userData.username },
    status: 'sending'
  };

  addMessageToState(roomId, msg);

  try {
    const sentMsg = await qiscus.sendComment(roomId, text, tempId);
    // Update msg in state
    const list = state.messages[roomId];
    const idx = list.findIndex(m => m.unique_temp_id === tempId);
    if (idx !== -1) {
      list[idx] = sentMsg;
      renderMessages();
    }
  } catch (err) {
    console.error("Send failed", err);
  }
}

async function uploadFile(file) {
  if (!state.activeRoomId) return;
  // We can show a pending message or toast
  console.log("Uploading...", file);
  try {
    await qiscus.uploadFile(state.activeRoomId, file);
    // The file message will come in via newmessage event or response
  } catch (err) {
    console.error("Upload failed", err);
    alert("Upload failed");
  }
}

// --- Renderers ---

function renderRooms() {
  const container = qs("#room-list");
  container.innerHTML = "";

  if (state.rooms.length === 0) {
    container.innerHTML = `<div class="placeholder">No conversations yet.</div>`;
    return;
  }

  state.rooms.forEach(room => {
    const item = document.createElement("div");
    item.className = "room-item";
    item.onclick = () => setActiveRoom(room);

    const lastComment = room.last_comment_message || "No messages";
    const name = room.name || "Room";
    const avatarUrl = room.avatar_url || "";

    // Generate avatar UI
    let avatarHtml = `<div class="avatar">${name.charAt(0).toUpperCase()}</div>`;
    if (avatarUrl && !avatarUrl.includes("via.placeholder")) { // simple check
      avatarHtml = `<img src="${avatarUrl}" class="avatar" alt="${name}" style="object-fit:cover;">`;
    }

    item.innerHTML = `
      ${avatarHtml}
      <div class="room-info">
        <div class="room-name">${name}</div>
        <div class="room-last-message">${lastComment.substring(0, 30)}...</div>
      </div>
    `;
    container.appendChild(item);
  });

  qs("#rooms-page").textContent = `Page ${state.roomParams.page}`;
  qs("#rooms-prev").disabled = state.roomParams.page <= 1;
}

function renderMessages() {
  const container = qs("#message-list");
  container.innerHTML = "";

  const msgs = state.messages[state.activeRoomId] || [];

  if (msgs.length === 0) {
    container.innerHTML = `<div class="placeholder">Say hello!</div>`;
    return;
  }

  const myEmail = qiscus.userData.email;

  msgs.forEach(msg => {
    const isMe = msg.email === myEmail || (msg.sender && msg.sender.email === myEmail);
    const row = document.createElement("div");
    row.className = `message-row ${isMe ? 'mod-me' : 'mod-other'}`;

    const sender = msg.username || (msg.sender && msg.sender.username) || "Unknown";
    const text = msg.message;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check if attachment (basic check)
    let contentHtml = text;
    if (msg.type === "file_attachment" || (msg.payload && msg.payload.url)) {
      const url = msg.payload?.url || msg.message; // fallback
      if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
        contentHtml = `<img src="${url}" style="max-width:200px; border-radius:8px;">`;
      } else {
        contentHtml = `<a href="${url}" target="_blank" style="color:inherit; text-decoration:underline;">📄 Attachment</a>`;
      }
    }

    row.innerHTML = `
      <div class="sender-name ${isMe ? 'hidden' : ''}">${sender}</div>
      <div class="message-bubble">${contentHtml}</div>
      <div class="message-meta">
         <span>${time}</span>
         ${isMe ? `<span>${msg.status === 'read' ? '✓✓' : '✓'}</span>` : ''}
      </div>
    `;
    container.appendChild(row);
  });

  // Scroll to bottom
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function updateTypingIndicator() {
  const bar = qs("#typing-bar");
  if (state.typingUsers.size > 0) {
    const names = Array.from(state.typingUsers).join(", ");
    bar.textContent = `${names} is typing...`;
    bar.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
  }
}

// --- Event Listeners ---

fabEl.addEventListener("click", toggleWidget);
btnClose.addEventListener("click", toggleWidget);

btnBack.addEventListener("click", () => {
  switchView("rooms");
  // maybe clear active room selection visually
});

qs("#auth-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  handleLogin(data);
});

qs("#message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = e.target.querySelector("[name=message]");
  const text = input.value.trim();
  if (text) {
    sendMessage(text);
    input.value = "";
  }
});

qs("#rooms-refresh").addEventListener("click", () => loadRoomsFromServer(1));
qs("#rooms-prev").addEventListener("click", () => loadRoomsFromServer(state.roomParams.page - 1));
qs("#rooms-next").addEventListener("click", () => loadRoomsFromServer(state.roomParams.page + 1));
qs("#btn-logout")?.addEventListener("click", handleLogout);

const btnUpload = qs("#btn-upload");
const fileInput = qs("#file-input");

btnUpload.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) uploadFile(file);
  e.target.value = ""; // reset
});

// Typing listener
qs("input[name=message]").addEventListener("input", () => {
  if (qiscus && state.activeRoomId) {
    qiscus.publishTyping(1);
    clearTimeout(window._typingTimer);
    window._typingTimer = setTimeout(() => {
      qiscus.publishTyping(0);
    }, 1000);
  }
});
