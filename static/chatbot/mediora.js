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
      const avatar = document.querySelector(".user-avatar");
      if (creds.user.length % 2 === 0) {
        avatar.style.filter = "hue-rotate(45deg)";
      }
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

    document.getElementById("sidebar").classList.remove("active");
    this.render();
    document.getElementById("user-input").focus();
  },

  fill(text) {
    const input = document.getElementById("user-input");
    input.value = text;
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    this.toggleBtn();
    input.focus();
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

    // push user message
    chat.msgs.push({
      role: "user",
      text: text || "Sent clinical attachments",
      files: [...this.tempFiles],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    const filesToSend = [...this.tempFiles]; // preserve before clearing

    // clear input + UI
    this.tempFiles = [];
    input.value = "";
    input.style.height = "auto";
    this.renderPreviews();
    this.render();

    // temporary loading message (optional but feels premium)
    const loadingMsg = {
      role: "bot",
      text: "Reviewing your submission. Analysing clinical patterns...",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    chat.msgs.push(loadingMsg);
    this.render();

    fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        files: filesToSend,
        history: chat.msgs.slice(-5),
      }),
    })
      .then(async (res) => {
        const raw = await res.text();

        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("INVALID JSON:", raw);
          throw new Error("Invalid JSON response");
        }
      })
      .then((data) => {
        console.log("API RESPONSE:", data);

        chat.msgs.pop();

        chat.msgs.push({
          role: "bot",
          text: data.reply || "No response generated.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });

        this.render();
      })
      .catch((err) => {
        console.error("FETCH ERROR:", err);

        chat.msgs.pop();

        chat.msgs.push({
          role: "bot",
          text: "Server error. Try again.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });

        this.render();
      });
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
        (m, msgIdx) => `
      <div class="message ${m.role}"> 
        <div class="message-content">
          
          ${
            m.files && m.files.length > 0
              ? `
            <div class="attachment-grid">
              ${m.files
                .map((f) => {
                  const isImg = f.type.startsWith("image/");
                  return `
                  <div class="attachment-wrapper sent-mode ${isImg ? "is-img" : "is-doc"}">
                    ${
                      isImg
                        ? `<img src="${f.data}" class="att-img">`
                        : `<div class="att-doc-compact">
                          <i class="ph-fill ph-file-pdf"></i>
                        <span>${f.name}</span>
                        </div>`
                    }
                  </div>`;
                })
                .join("")}
            </div>
          `
              : ""
          }
  
          <div class="bubble">
          ${this.formatMessage(m.text)}
          </div>
  
          <div class="meta">
            <span>${m.time}</span>
            <i class="ph ph-copy copy-btn" 
              onclick="app.copyText(this, \`${m.text.replace(/`/g, "\\`").replace(/\n/g, "\\n")}\`)">
            </i>
          </div>
  
        </div>
      </div>
    `,
      )
      .join("");

    wrapper.scrollTop = wrapper.scrollHeight;
  },

  generateTitle(text) {
    let cleanText = text.replace(/[^\w\s]/gi, "").trim();
    if (cleanText.length < 5) return "New Consultation";
    const stopWords = ["a", "an", "the", "is", "can", "please", "help", "with"];
    let words = cleanText
      .split(/\s+/)
      .filter((w) => !stopWords.includes(w.toLowerCase()));
    let title = words
      .slice(0, 4)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    return title.length < 3
      ? cleanText.split(/\s+/).slice(0, 3).join(" ") + "..."
      : title;
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
    window.location.href = "/login";
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

  formatMessage(text) {
    let formatted = text
      .replace(/### (.*?)(\n|$)/g, "<h3>$1</h3>")
      .replace(/—/g, "<hr>")
      .replace(/• (.*?)(\n|$)/g, "<li>$1</li>");

    if (formatted.includes("<li>")) {
      formatted = "<ul>" + formatted + "</ul>";
    }

    return formatted.replace(/\n/g, "<br>");
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
            : `<div class="att-doc" style="display:flex; flex-direction:column; align-items:center; justify-content:center; background:#222; height:100%; border-radius:8px;">
              <i class="ph-fill ph-file-pdf" style="font-size:1.5rem; color:var(--accent);"></i>
              <span style="font-size:8px; color:var(--text-muted); margin-top:2px;">PDF</span>
            </div>`
        }
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

  removeFileFromMessage(msgIdx, fIdx) {
    const chat = this.chats.find((c) => c.id === this.currId);
    if (chat && chat.msgs[msgIdx]) {
      chat.msgs[msgIdx].files.splice(fIdx, 1);
      localStorage.setItem(this.userKey, JSON.stringify(this.chats));
      this.render();
    }
  },

  toggleBtn() {
    const hasText =
      document.getElementById("user-input").value.trim().length > 0;
    const hasFiles = this.tempFiles.length > 0;
    document
      .getElementById("send-btn")
      .classList.toggle("active", hasText || hasFiles);
  },

  // Add this inside the app object
  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
  },
};

app.init();
