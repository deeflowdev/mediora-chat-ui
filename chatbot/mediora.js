const app = {
  chats: [],
  currId: null,
  tempFiles: [],
  pendingDeleteId: null,
  userKey: "",

  init() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
      window.location.href = "../auth/login.html";
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

  showHome() {
    this.currId = null;
    const container = document.getElementById("chat-container");
    container.classList.add("is-home");
    container.classList.remove("is-chat");
    document.getElementById("home-screen").style.display = "flex";
    document.getElementById("messages-wrapper").innerHTML = "";
    this.renderSidebar();
  },

  loadChat(id) {
    this.currId = id;
    const container = document.getElementById("chat-container");
    container.classList.remove("is-home");
    container.classList.add("is-chat");
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

  send() {
    const input = document.getElementById("user-input");
    const text = input.value.trim();
    if (!text && this.tempFiles.length === 0) return;

    if (!this.currId) {
      const id = Date.now();
      this.chats.unshift({ id, title: "New Consult", msgs: [] });
      this.currId = id;
      document.getElementById("chat-container").classList.remove("is-home");
      document.getElementById("chat-container").classList.add("is-chat");
      document.getElementById("home-screen").style.display = "none";
    }

    const chat = this.chats.find((c) => c.id === this.currId);
    if (chat && chat.msgs.length === 0 && text.length > 5) {
      chat.title = this.generateTitle(text);
    }

    chat.msgs.push({
      role: "user",
      text: text || "Sent clinical attachments",
      files: [...this.tempFiles],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    this.tempFiles = [];
    input.value = "";
    input.style.height = "auto";
    this.renderPreviews();
    this.render();

    setTimeout(() => {
      chat.msgs.push({
        role: "bot",
        text: "Reviewing your submission. Analysing clinical patterns...",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      this.render();
      localStorage.setItem(this.userKey, JSON.stringify(this.chats));
    }, 800);
  },

  renderSidebar() {
    const list = document.getElementById("chat-list");
    list.innerHTML = this.chats
      .map(
        (c) => `
      <div class="chat-item ${c.id === this.currId ? "active" : ""}" onclick="app.loadChat(${c.id})">
        <i class="ph ph-chat-centered-dots"></i>
        <span class="chat-title-text">${c.title}</span>
        <i class="ph ph-dots-three-vertical menu-trigger" onclick="app.toggleMenu(event, ${c.id})"></i>
        <div class="dropdown-menu" id="menu-${c.id}">
          <div class="dropdown-item" onclick="app.openDeleteModal(event, ${c.id})">
            <i class="ph ph-trash"></i> delete
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  },

  render() {
    this.renderSidebar();
    const chat = this.chats.find((c) => c.id === this.currId);
    if (!chat) return;

    const wrapper = document.getElementById("messages-wrapper");
    wrapper.innerHTML = chat.msgs
      .map(
        (m) => `
      <div class="message ${m.role}"> 
        <div class="bubble">${m.text}
          <div class="attachment-grid">
            ${(m.files || [])
              .map((f) =>
                f.type.startsWith("image/")
                  ? `<img src="${f.data}" class="att-img">`
                  : `<div class="att-doc"><i class="ph ph-file-pdf"></i>${f.name}</div>`,
              )
              .join("")}
          </div>
        </div>
        <div class="meta">
          <span>${m.time}</span>
          ${m.role === "bot" ? `<i class="ph ph-copy copy-btn" onclick="app.copyText(this, \`${m.text.replace(/`/g, "\\`")}\`)"></i>` : ""}
        </div>
      </div>
    `,
      )
      .join("");

    wrapper.scrollTop = wrapper.scrollHeight;
  },

  generateTitle(text) {
    const words = text.split(/\s+/).filter((w) => w.length > 2);
    return words.length < 2
      ? "Clinical Analysis"
      : words.slice(0, 5).join(" ") + "...";
  },

  toggleMenu(e, id) {
    e.stopPropagation();
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((m) => m.id !== `menu-${id}` && m.classList.remove("show"));
    document.getElementById(`menu-${id}`).classList.toggle("show");
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
    window.location.href = "../auth/login.html";
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
        ${f.type.startsWith("image/") ? `<img src="${f.data}">` : `<div class="att-doc">DOC</div>`}
        <div class="pre-del" onclick="app.removeFile(${i})">×</div>
      </div>`,
      )
      .join("");
    this.toggleBtn();
  },

  removeFile(i) {
    this.tempFiles.splice(i, 1);
    this.renderPreviews();
  },

  toggleBtn() {
    const hasText =
      document.getElementById("user-input").value.trim().length > 0;
    const hasFiles = this.tempFiles.length > 0;
    document
      .getElementById("send-btn")
      .classList.toggle("active", hasText || hasFiles);
  },
};

app.init();
