const app = {
  chats: [],
  currId: null,
  tempFiles: [],
  pendingDeleteId: null,
  userKey: "",

  init() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
      window.location.href = "/login";
      return;
    }

    const creds = JSON.parse(localStorage.getItem("user_creds"));

    if (creds) {
      document.getElementById("user-display-name").innerText = creds.user;
      this.userKey = `med_vault_${creds.email || creds.user}`;
      this.chats = JSON.parse(localStorage.getItem(this.userKey)) || [];
    }

    const input = document.getElementById("user-input");

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      this.toggleBtn();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    window.onclick = (e) => {
      if (!e.target.closest(".menu-trigger")) {
        document
          .querySelectorAll(".dropdown-menu")
          .forEach((m) => m.classList.remove("show"));
      }
    };

    this.showHome();
  },

  // ======================
  // HOME
  // ======================
  showHome() {
    this.currId = null;

    document.getElementById("chat-container").classList.add("is-home");
    document.getElementById("chat-container").classList.remove("is-chat");

    document.getElementById("home-screen").style.display = "flex";
    document.getElementById("messages-wrapper").innerHTML = "";

    this.renderSidebar();
  },

  loadChat(id) {
    this.currId = id;

    document.getElementById("chat-container").classList.remove("is-home");
    document.getElementById("chat-container").classList.add("is-chat");

    document.getElementById("home-screen").style.display = "none";

    this.render();
  },

  fill(text) {
    const input = document.getElementById("user-input");
    input.value = text;
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    this.toggleBtn();
  },

  // ======================
  // SEND MESSAGE (FIXED FLOW)
  // ======================
  async send() {
    const input = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");

    const text = input.value.trim();

    if (!text && this.tempFiles.length === 0) return;

    // lock UI
    input.disabled = true;
    sendBtn.style.opacity = "0.5";
    sendBtn.style.pointerEvents = "none";

    // create chat if needed
    if (!this.currId) {
      const id = Date.now();
      this.chats.unshift({ id, title: "New Chat", msgs: [] });
      this.currId = id;

      document.getElementById("chat-container").classList.remove("is-home");
      document.getElementById("chat-container").classList.add("is-chat");
      document.getElementById("home-screen").style.display = "none";
    }

    const chat = this.chats.find((c) => c.id === this.currId);

    // title generation
    if (chat.msgs.length === 0 && text.length > 5) {
      chat.title = this.generateTitle(text);
    }

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // user message
    chat.msgs.push({
      role: "user",
      text,
      files: [...this.tempFiles],
      time: timestamp,
    });

    const savedFiles = [...this.tempFiles];

    // reset input
    this.tempFiles = [];
    input.value = "";
    input.style.height = "auto";
    this.renderPreviews();

    // render user msg immediately
    this.render();

    // add bot loading message
    const botIndex =
      chat.msgs.push({
        role: "bot",
        text: "thinking...",
        time: timestamp,
      }) - 1;

    this.render();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          files: savedFiles,
        }),
      });

      const data = await response.json();

      chat.msgs[botIndex].text =
        data.status === "success" ? data.reply : "something went wrong";
    } catch (err) {
      chat.msgs[botIndex].text = "could not connect to server";
    } finally {
      input.disabled = false;
      sendBtn.style.opacity = "1";
      sendBtn.style.pointerEvents = "auto";

      this.render();
      input.focus();

      localStorage.setItem(this.userKey, JSON.stringify(this.chats));
    }
  },

  // ======================
  // SIDEBAR
  // ======================
  renderSidebar() {
    const list = document.getElementById("chat-list");

    list.innerHTML = this.chats
      .map(
        (c) => `
        <div class="chat-item ${c.id === this.currId ? "active" : ""}"
             onclick="app.loadChat(${c.id})">

          <i class="ph ph-chat-centered-dots"></i>
          <span class="chat-title-text">${c.title}</span>

          <i class="ph ph-dots-three-vertical menu-trigger"
             onclick="app.toggleMenu(event, ${c.id})"></i>

          <div class="dropdown-menu" id="menu-${c.id}">
            <div class="dropdown-item"
                 onclick="app.openDeleteModal(event, ${c.id})">
              <i class="ph ph-trash"></i> delete
            </div>
          </div>
        </div>
      `,
      )
      .join("");
  },

  // ======================
  // CHAT RENDER
  // ======================
  render() {
    this.renderSidebar();

    const chat = this.chats.find((c) => c.id === this.currId);
    if (!chat) return;

    const wrapper = document.getElementById("messages-wrapper");

    wrapper.innerHTML = chat.msgs
      .map(
        (m) => `
      <div class="message ${m.role}">
      <div class="bubble" style="white-space: pre-line;">
  ${m.text}
</div>

          <div class="attachment-grid">
            ${(m.files || [])
              .map((f) =>
                f.type.startsWith("image/")
                  ? `<img src="${f.data}" class="att-img">`
                  : `<div class="att-doc">DOC</div>`,
              )
              .join("")}
          </div>

        </div>

        <div class="meta">
          <span>${m.time}</span>

          ${
            m.role === "bot"
              ? `<i class="ph ph-copy copy-btn"
                onclick="app.copyText(this, \`${m.text.replace(/`/g, "\\`")}\`)"></i>`
              : ""
          }
        </div>
      </div>
    `,
      )
      .join("");

    const container = document.getElementById("chat-container");
    container.scrollTop = container.scrollHeight;
  },

  generateTitle(text) {
    const words = text.split(/\s+/).filter((w) => w.length > 2);
    return words.length < 2 ? "New Chat" : words.slice(0, 5).join(" ") + "...";
  },

  toggleBtn() {
    const hasText =
      document.getElementById("user-input").value.trim().length > 0;
    const hasFiles = this.tempFiles.length > 0;

    document
      .getElementById("send-btn")
      .classList.toggle("active", hasText || hasFiles);
  },

  copyText(el, text) {
    navigator.clipboard.writeText(text).then(() => {
      const original = el.className;
      el.className = "ph ph-check copy-btn copied";
      setTimeout(() => (el.className = original), 2000);
    });
  },

  handleFiles(files) {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        this.tempFiles.push({
          name: file.name,
          type: file.type,
          data: e.target.result,
        });

        this.renderPreviews();
      };

      reader.readAsDataURL(file);
    });
  },

  renderPreviews() {
    const strip = document.getElementById("preview-strip");

    strip.innerHTML = this.tempFiles
      .map(
        (f, i) => `
      <div class="pre-item">
        ${
          f.type.startsWith("image/")
            ? `<img src="${f.data}">`
            : `<div class="att-doc">DOC</div>`
        }

        <div class="pre-del" onclick="app.removeFile(${i})">×</div>
      </div>
    `,
      )
      .join("");

    this.toggleBtn();
  },

  removeFile(i) {
    this.tempFiles.splice(i, 1);
    this.renderPreviews();
  },

  toggleMenu(e, id) {
    e.stopPropagation();

    document
      .querySelectorAll(".dropdown-menu")
      .forEach((m) => m.id !== `menu-${id}` && m.classList.remove("show"));

    document.getElementById(`menu-${id}`).classList.toggle("show");
  },

  openDeleteModal(e, id) {
    e.stopPropagation();
    this.pendingDeleteId = id;
    document.getElementById("modal-overlay").style.display = "flex";
  },

  closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
    this.pendingDeleteId = null;
  },

  confirmDelete() {
    this.chats = this.chats.filter((c) => c.id !== this.pendingDeleteId);
    localStorage.setItem(this.userKey, JSON.stringify(this.chats));
    this.closeModal();
    this.showHome();
  },

  openLogoutModal() {
    document.getElementById("logout-modal-overlay").style.display = "flex";
  },

  closeLogoutModal() {
    document.getElementById("logout-modal-overlay").style.display = "none";
  },

  confirmLogout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user_creds");
    window.location.href = "/login";
  },
};

app.init();
