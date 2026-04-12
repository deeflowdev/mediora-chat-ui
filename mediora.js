
/**
 * Mediora AI - Logic Module
 */
const app = {
state: {
    chats: JSON.parse(localStorage.getItem("mediora_chats")) || [],
    currentChatId: null,
    selectedFiles: [],
},

init() {
    this.renderChatList();
    this.setupEventListeners();
    if (this.state.chats.length > 0) {
    this.loadChat(this.state.chats[0].id);
    } else {
    this.createNewChat();
    }
},

setupEventListeners() {
    const input = document.getElementById("user-input");
    input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
    });

    input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
    }
    });
},

// --- State Management ---
saveToLocal() {
    localStorage.setItem(
    "mediora_chats",
    JSON.stringify(this.state.chats),
    );
},

createNewChat() {
    const id = Date.now().toString();
    const newChat = {
    id,
    title: `New Session ${this.state.chats.length + 1}`,
    messages: [],
    timestamp: new Date().toISOString(),
    };
    this.state.chats.unshift(newChat);
    this.state.currentChatId = id;
    this.saveToLocal();
    this.renderChatList();
    this.renderMessages();
},

loadChat(id) {
    this.state.currentChatId = id;
    this.renderChatList();
    this.renderMessages();
},

// --- UI Rendering ---
renderChatList() {
    const list = document.getElementById("chat-list");
    list.innerHTML = this.state.chats
    .map(
        (chat) => `
            <div class="chat-item ${chat.id === this.state.currentChatId ? "active" : ""}" onclick="app.loadChat('${chat.id}')">
                <i class="ph ph-chat-centered-text"></i>
                <span class="hide-on-collapse">${chat.title}</span>
            </div>
        `,
    )
    .join("");
},

renderMessages() {
    const container = document.getElementById("chat-container");
    const chat = this.state.chats.find(
    (c) => c.id === this.state.currentChatId,
    );

    if (!chat) return;

    container.innerHTML = chat.messages
    .map(
        (msg) => `
            <div class="message ${msg.role}">
                <div class="bubble">
                    ${msg.text}
                    ${this.renderMessageAttachments(msg.files)}
                </div>
                <div class="meta">
                    <span>${msg.time}</span>
                    <i class="ph ph-copy copy-btn" onclick="app.copyText('${msg.text.replace(/'/g, "\\'")}')"></i>
                </div>
            </div>
        `,
    )
    .join("");
    this.scrollToBottom();
},

renderMessageAttachments(files) {
    if (!files || files.length === 0) return "";
    return (
    `<div class="attachments">` +
    files
        .map((f) => {
        if (f.type.startsWith("image/")) {
            return `<img src="${f.data}" class="thumb">`;
        }
        return `<div class="doc-chip"><i class="ph ph-file"></i> ${f.name}</div>`;
        })
        .join("") +
    `</div>`
    );
},

// --- Chat Actions ---
async sendMessage() {
    const input = document.getElementById("user-input");
    const text = input.value.trim();
    if (!text && this.state.selectedFiles.length === 0) return;

    const chat = this.state.chats.find(
    (c) => c.id === this.state.currentChatId,
    );
    const newMessage = {
    role: "user",
    text: text,
    time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    }),
    files: [...this.state.selectedFiles],
    };

    chat.messages.push(newMessage);

    // Set chat title based on first message
    if (chat.messages.length === 1)
    chat.title = text.substring(0, 20) + "...";

    input.value = "";
    input.style.height = "auto";
    this.state.selectedFiles = [];
    this.renderFilePreviews();
    this.renderMessages();
    this.saveToLocal();

    // Bot Response Simulation
    this.showTypingIndicator();
    setTimeout(() => {
    this.removeTypingIndicator();
    const botMsg = {
        role: "bot",
        text: "I'm Mediora AI. I've received your message and any files attached. How can I assist you further?",
        time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        }),
        files: [],
    };
    chat.messages.push(botMsg);
    this.renderMessages();
    this.saveToLocal();
    }, 1500);
},

// --- File Handling ---
handleFiles(files) {
    if (this.state.selectedFiles.length + files.length > 3) {
    alert("Max 3 files per message");
    return;
    }

    Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        this.state.selectedFiles.push({
        name: file.name,
        type: file.type,
        data: e.target.result,
        });
        this.renderFilePreviews();
    };
    reader.readAsDataURL(file);
    });
},

renderFilePreviews() {
    const area = document.getElementById("preview-area");
    area.innerHTML = this.state.selectedFiles
    .map(
        (f, i) => `
            <div class="preview-item">
                ${f.type.startsWith("image/") ? `<img src="${f.data}" class="thumb">` : `<div class="doc-chip" style="height:60px; width:60px; justify-content:center"><i class="ph ph-file"></i></div>`}
                <div class="remove-file" onclick="app.removeFile(${i})">×</div>
            </div>
        `,
    )
    .join("");
},

removeFile(index) {
    this.state.selectedFiles.splice(index, 1);
    this.renderFilePreviews();
},

// --- Utilities ---
toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("collapsed");
},

showTypingIndicator() {
    const container = document.getElementById("chat-container");
    const div = document.createElement("div");
    div.id = "typing-indicator";
    div.className = "message bot";
    div.innerHTML = `<div class="bubble typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    container.appendChild(div);
    this.scrollToBottom();
},

removeTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
},

scrollToBottom() {
    const container = document.getElementById("chat-container");
    container.scrollTop = container.scrollHeight;
},

copyText(text) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
},
};

// Start the app
app.init();