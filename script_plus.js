//

/* --------------------
   LIVE COUNTDOWN (SPECIAL DAYS)
-------------------- */
let specialCountdownTicker = null;

function startSpecialCountdownTicker() {
  if (specialCountdownTicker) return;
  // ilk anda güncelle
  renderNextSpecial();
  renderSpecialCountdown();
  specialCountdownTicker = setInterval(() => {
    if (!isAuthed()) return;
    renderSpecialCountdown();
  }, 1000);
}

function stopSpecialCountdownTicker() {
  if (specialCountdownTicker) {
    clearInterval(specialCountdownTicker);
    specialCountdownTicker = null;
  }
}
// script_plus.js (Enhanced + Fixed for missing HTML parts + Theme Palette)

// --------------------
// STORAGE
// --------------------
const STORAGE_KEYS = {
  auth: "mm_auth_ok",
  theme: "mm_theme",
  memories: "mm_memories",
  diary: "mm_diary",
  future: "mm_future",
  specials: "mm_specials",
  specialNotified: "mm_special_notified",
  chat: "mm_chat",
  chatPinned: "mm_chat_pinned",
  bestScore: "mm_best_score",
  lastScores: "mm_last_scores",
  sound: "mm_sound",
  difficulty: "mm_difficulty",
  autoLockOn: "mm_autolock_on",
  autoLockMin: "mm_autolock_min"
};

// Düz şifre (her tarayıcıda çalışır)
const PASSWORD_PLAIN = "08.06.25";

// SHA-256 hash (opsiyonel kontrol)
const PASSWORD_HASH =
  "5b9b64a67c2a6db223fb8b4f9d642e9f5a4b4470d6f73f0e5b9dbb8167344f37";

// Kullanıcı şifre değiştirebilsin diye (LocalStorage override)
function getPasswordConfig() {
  const plain = localStorage.getItem(STORAGE_KEYS.passPlain) || PASSWORD_PLAIN;
  const hash = localStorage.getItem(STORAGE_KEYS.passHash) || PASSWORD_HASH;
  return { plain, hash };
}

async function setNewPassword(newPass) {
  const p = String(newPass || "").trim();
  if (!p) throw new Error("Şifre boş olamaz.");
  // Tercih: hash sakla (daha iyi); WebCrypto yoksa düz sakla (geri dönüş)
  if (hasWebCrypto()) {
    const h = await sha256(p);
    localStorage.setItem(STORAGE_KEYS.passHash, h);
    localStorage.removeItem(STORAGE_KEYS.passPlain);
    return { mode: "hash" };
  }
  localStorage.setItem(STORAGE_KEYS.passPlain, p);
  localStorage.removeItem(STORAGE_KEYS.passHash);
  return { mode: "plain" };
}

function resetPasswordToDefault() {
  localStorage.removeItem(STORAGE_KEYS.passHash);
  localStorage.removeItem(STORAGE_KEYS.passPlain);
}


/* --------------------
   HELPERS
-------------------- */
const $ = (sel) => document.querySelector(sel);

function on(el, evt, fn, opts) {
  if (!el) return;
  el.addEventListener(evt, fn, opts);
}

function setText(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}

function safeUUID() {
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

/* --------------------
   SURPRISE GENERATOR
-------------------- */
const surpriseState = { lastText: "" };

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSurpriseText() {
  const compliments = [
    "Bugün gözlerin ayrı bir güzel. Bunu bil.",
    "Seninle hayat daha hafif.",
    "En sevdiğim alışkanlık: sen.",
    "İyi ki varsın. Cidden."
  ];

  const miniTasks = [
    "10 saniye göz göze bakın. Sonra aynı anda gülümseyin.",
    "Birbirinize 3 tane 'şunu seviyorum' cümlesi kurun.",
    "Bugün bir fotoğraf çekin ve 'bugün' diye kaydedin.",
    "Bir şarkı açın ve 1 dakika dans edin (utanmak yok)."
  ];

  const dateIdeas = [
    "Evde mini piknik: battaniye + atıştırmalık + bir film.",
    "Kısa yürüyüş + sıcak içecek + 10 dakika sohbet.",
    "Beraber yemek yapın: herkes bir adım seçsin.",
    "Birbirinize 5 soruluk mini 'biz' testi yapın."
  ];

  const loveNotes = [
    "Not: Sana sarılmak, bütün günü düzeltir.",
    "Not: Kalbimin en güvenli yeri sensin.",
    "Not: Bugün de seni seçiyorum.",
    "Not: Birlikteyken zaman daha hızlı geçiyor."
  ];

  const header = pick(["💌", "✨", "❤️", "🌙"]) + " " + pick(["Sürpriz", "Mini Görev", "Küçük Not", "Randevu Fikri"]);
  const body = pick([pick(compliments), pick(miniTasks), pick(dateIdeas), pick(loveNotes)]);
  const tail = "\n\n— Mevra ❤️ Mizra";
  return `${header}\n${body}${tail}`;
}

function setSurpriseOut(text) {
  surpriseState.lastText = text || "";
  const out = $("#surpriseOut");
  if (out) out.textContent = text || "";
}

async function copySurprise() {
  const t = surpriseState.lastText || $("#surpriseOut")?.textContent || "";
  if (!t) return toast("Önce üret.");
  try {
    await navigator.clipboard.writeText(t);
    toast("Kopyalandı.");
  } catch {
    toast("Kopyalanamadı (izin?).");
  }
}

async function shareSurprise() {
  const t = surpriseState.lastText || $("#surpriseOut")?.textContent || "";
  if (!t) return toast("Önce üret.");
  if (navigator.share) {
    try {
      await navigator.share({ text: t, title: "Sürpriz" });
      toast("Paylaşıldı.");
      return;
    } catch {
      // ignore
    }
  }
  // fallback: kopyala
  await copySurprise();
}

function renderQuickSetupHint(kind) {
  const out = $("#quickSetupOut");
  if (!out) return;

  if (kind === "install") {
    out.textContent = "Yükleme: Tarayıcı menüsünden 'Ana ekrana ekle' veya yukarıdaki 'Uygulamayı Yükle' düğmesi.";
    return;
  }
  if (kind === "notify") {
    out.textContent = "Bildirim: Ana sayfadaki 'Bildirimleri Aç' düğmesine bas. Özel günleri 'Bildirim gönder' ile işaretle.";
    return;
  }
  if (kind === "backup") {
    out.textContent = "Yedek: Ayarlar → 'Dışa aktar (JSON)'. İçe aktar ile geri yükleyebilirsin.";
    return;
  }
  out.textContent = "";
}


function formatDateTR(d = new Date()) {
  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function escapeHTML(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseAlbum(raw) {
  return (raw || "").trim().slice(0, 40);
}

function parseTags(raw) {
  return (raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function downloadTextFile(filename, content, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("Dosya okunamadı."));
    r.readAsText(file);
  });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ---------- SHA-256 ---------- */
function hasWebCrypto() {
  return !!(window.crypto && crypto.subtle && typeof crypto.subtle.digest === "function");
}

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- AUTH ---------- */
function setAuthed(val) {
  localStorage.setItem(STORAGE_KEYS.auth, val ? "1" : "0");
}
function isAuthed() {
  return localStorage.getItem(STORAGE_KEYS.auth) === "1";
}

function showLogin() {
  const login = $("#loginScreen");
  const site = $("#site");
  if (login) login.style.display = "flex";
  if (site) site.hidden = true;
}

function showSite() {
  const login = $("#loginScreen");
  const site = $("#site");
  if (login) login.style.display = "none";
  if (site) site.hidden = false;
}

async function checkLogin() {
  const passEl = $("#loginPassword");
  const err = $("#loginError");
  const rememberEl = $("#rememberMe");

  if (err) err.textContent = "";

  const pass = passEl ? passEl.value.trim() : "";
  if (!pass) {
    if (err) err.textContent = "Şifre gerekli.";
    return;
  }

  const cfg = getPasswordConfig();
  const okPlain = pass === cfg.plain;

  let okHash = false;
  if (hasWebCrypto()) {
    try {
      okHash = (await sha256(pass)) === cfg.hash;
    } catch {
      okHash = false;
    }
  }

  if (okPlain || okHash) {
    const remember = rememberEl ? rememberEl.checked : false;
    setAuthed(remember);

    showSite();
    toast("Hoş geldin.");
    initAfterLogin();
    return;
  }

  if (err) err.textContent = "Şifre yanlış.";
}

function logout() {
  stopSpecialCountdownTicker();
setAuthed(false);
  const passEl = $("#loginPassword");
  const rememberEl = $("#rememberMe");
  if (passEl) passEl.value = "";
  if (rememberEl) rememberEl.checked = false;
  showLogin();
  toast("Çıkış yapıldı.");
}

/* ---------- NAV ---------- */
function openPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".navbtn").forEach((b) => b.classList.remove("active"));

  const page = document.getElementById(id);
  if (page) page.classList.add("active");

  const btn = document.querySelector(`.navbtn[data-page="${id}"]`);
  if (btn) btn.classList.add("active");

  // URL hash (deeplink) senkronu
  try {
    if (id) history.replaceState(null, "", "#" + id);
  } catch { /* ignore */ }

  // Sayfa geçişlerinde ilgili bölümleri tazele
  if (id === "calendar") {
    renderCalendar();
  }

  if (id === "special") {
    renderSpecials();
    renderNextSpecial();
    renderSpecialCountdown();
  }

  if (id === "home") {
    renderNextSpecial();
    renderSpecialCountdown();
    renderDashboard();
    renderTodayInPast();
  }

  if (id === "memories") {
    renderMemoryAlbumFilter();
    renderMemoryTagFilter();
    renderMemories();
  }

  // Authed ise canlı geri sayım çalışsın
  if (isAuthed()) startSpecialCountdownTicker();

  window.scrollTo({ top: 0, behavior: "smooth" });
}


function applyHashRoute() {
  const h = (location.hash || "").replace("#", "").trim();
  if (!h) return;
  const page = document.getElementById(h);
  if (!page) return;

  // Login olmadan içerik açma
  if (!isAuthed()) return;

  openPage(h);
}

// --- THEME ---
const THEMES = [
  "pink","violet","night","ocean","sunset","forest","cherry","graphite",
  "sky","mint","lemon","coral","ruby","lavender","peach","sand","coffee",
  "aurora","teal","indigo","slate"
];

function applyTheme(theme){
  const t = (theme || "pink").toLowerCase();

  // önce tüm tema class'larını temizle
  THEMES.forEach(x => document.body.classList.remove(`theme-${x}`));

  // pembe default: class basmak zorunda değiliz ama basarsak da sorun olmaz
  document.body.classList.add(`theme-${t}`);

  // meta theme-color (mobil tarayıcı üst bar rengi) güncelle
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--primary1").trim() || "#ff5f7e");

  localStorage.setItem("mm_theme", t);
}

// select change
const themeSelect = document.getElementById("themeSelect");
if (themeSelect){
  themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));
}

// ilk açılışta
applyTheme(localStorage.getItem("mm_theme") || "pink");
if (themeSelect) themeSelect.value = (localStorage.getItem("mm_theme") || "pink");


/* ---------- BG HEARTS ---------- */
function startBgHearts() {
  const wrap = $("#bgHearts");
  if (!wrap) return;

  wrap.innerHTML = "";
  const count = 16;

  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.textContent = "❤";
    s.style.position = "absolute";
    s.style.left = Math.random() * 100 + "%";
    s.style.bottom = -10 - Math.random() * 40 + "px";
    s.style.opacity = (0.1 + Math.random() * 0.2).toFixed(2);
    s.style.fontSize = (10 + Math.random() * 20).toFixed(0) + "px";

    const dur = 7 + Math.random() * 8;
    const delay = Math.random() * 4;

    s.animate(
      [
        { transform: "translateY(0) translateX(0)" },
        { transform: `translateY(-120vh) translateX(${(-40 + Math.random() * 80).toFixed(0)}px)` }
      ],
      { duration: dur * 1000, iterations: Infinity, delay: delay * 1000 }
    );

    wrap.appendChild(s);
  }
}

/* --------------------
   DASHBOARD
-------------------- */
function renderDashboard() {
  const el = $("#dashStats");
  if (!el) return;

  const memories = loadMemories().length;
  const diary = loadEntries(STORAGE_KEYS.diary).length;
  const future = loadEntries(STORAGE_KEYS.future).length;
  const specials = loadSpecials().length;
  const chat = loadChat().length;

  el.innerHTML =
    `<div>🖼️ Anı: <b>${memories}</b></div>` +
    `<div>📓 Anı Defteri: <b>${diary}</b></div>` +
    `<div>🔮 Gelecek: <b>${future}</b></div>` +
    `<div>📅 Özel Gün: <b>${specials}</b></div>` +
    `<div>💬 Mesaj: <b>${chat}</b></div>`;
}

function renderTodayInPast() {
  const el = $("#todayInPast");
  if (!el) return;

  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();

  const hits = [];
  loadEntries(STORAGE_KEYS.diary).forEach((e) => {
    const dt = new Date(e.ts || 0);
    if (dt.getMonth() === m && dt.getDate() === d) hits.push({ type: "Anı Defteri", e });
  });
  loadEntries(STORAGE_KEYS.future).forEach((e) => {
    const dt = new Date(e.ts || 0);
    if (dt.getMonth() === m && dt.getDate() === d) hits.push({ type: "Gelecek", e });
  });

  hits.sort((a, b) => (b.e.ts || 0) - (a.e.ts || 0));

  if (!hits.length) {
    el.textContent = "Kayıt bulunamadı.";
    return;
  }

  const top = hits
    .slice(0, 3)
    .map((x) => {
      const dt = new Date(x.e.ts || Date.now()).toLocaleDateString("tr-TR");
      const title = (x.e.title || "Başlıksız").slice(0, 40);
      return `<div class="t" style="opacity:0.95;">${dt} • ${x.type} • <b>${escapeHTML(title)}</b></div>`;
    })
    .join("");

  el.innerHTML =
    top +
    (hits.length > 3
      ? `<div class="tiny muted mt12">+${hits.length - 3} kayıt daha var.</div>`
      : "");
}


/* --------------------
   MEMORIES UI HELPERS
-------------------- */
function syncMemoryCounters() {
  const t = $("#memoryTitle");
  const outT = $("#memoryTitleCount");
  if (t && outT) outT.textContent = `${(t.value || "").length}/60`;

  const d = $("#memoryText");
  const outD = $("#memoryTextCount");
  if (d && outD) outD.textContent = `${(d.value || "").length}/1200`;
}

function renderMemoryTagsPreview() {
  const wrap = $("#memoryTagsPreview");
  if (!wrap) return;

  const tags = parseTags($("#memoryTags")?.value || "");
  wrap.innerHTML = "";
  if (!tags.length) {
    wrap.hidden = true;
    return;
  }

  tags.slice(0, 10).forEach((tg) => {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tg;
    wrap.appendChild(chip);
  });
  wrap.hidden = false;
}

function renderMemoryImagePreview() {
  const fileEl = $("#memoryImage");
  const file = fileEl && fileEl.files ? fileEl.files[0] : null;

  const box = $("#memoryImagePreview");
  const img = $("#memoryImagePreviewImg");
  if (!box || !img) return;

  if (!file) {
    box.hidden = true;
    img.removeAttribute("src");
    return;
  }

  const r = new FileReader();
  r.onload = () => {
    img.src = String(r.result || "");
    box.hidden = false;
  };
  r.readAsDataURL(file);
}

function clearMemoryForm() {
  const fileEl = $("#memoryImage");
  if (fileEl) fileEl.value = "";
  if ($("#memoryTitle")) $("#memoryTitle").value = "";
  if ($("#memoryText")) $("#memoryText").value = "";
  if ($("#memoryDate")) $("#memoryDate").value = "";
  if ($("#memoryTags")) $("#memoryTags").value = "";
  if ($("#memoryAlbum")) $("#memoryAlbum").value = "";

  renderMemoryTagsPreview();
  renderMemoryImagePreview();
  syncMemoryCounters();
  toast("Form temizlendi.");
}

function clearMemoryFilters() {
  if ($("#memorySearch")) $("#memorySearch").value = "";
  if ($("#memorySort")) $("#memorySort").value = "new";
  if ($("#memoryAlbumFilter")) $("#memoryAlbumFilter").value = "ALL";

  // etiket filtrelerini temizle
  memoryFilter.tags = new Set();
  const wrap = $("#memoryTagFilter");
  if (wrap) wrap.hidden = true;

  renderMemoryTagFilter();
  renderMemories();
  toast("Filtreler sıfırlandı.");
}

/* --------------------
   MEMORIES
-------------------- */
function loadMemories() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.memories) || "[]");
  } catch {
    return [];
  }
}

function saveMemories(list) {
  localStorage.setItem(STORAGE_KEYS.memories, JSON.stringify(list));
}

function getAllMemoryTags(list) {
  const tags = [];
  list.forEach((m) => (m.tags || []).forEach((t) => tags.push(t)));
  return unique(tags).sort((a, b) => a.localeCompare(b, "tr"));
}

const memoryFilter = {
  tags: new Set()
};

function memoryCard(m) {
  const div = document.createElement("div");
  div.className = "card memory";

  const img = document.createElement("img");
  img.src = m.image;
  img.alt = m.title || "Anı görseli";

  const meta = document.createElement("div");
  meta.className = "meta";

  const left = document.createElement("div");
  const t = document.createElement("p");
  t.className = "title";
  t.textContent = m.title || "Başlıksız Anı";

  const d = document.createElement("p");
  d.className = "desc";
  d.textContent = m.text || "";

  const tagsRow = document.createElement("div");
  tagsRow.className = "chips";
  tagsRow.style.gap = "8px";
  tagsRow.style.marginTop = "10px";

  (m.tags || []).slice(0, 6).forEach((tg) => {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tg;
    chip.title = "Etiket";
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      if (memoryFilter.tags.has(tg)) memoryFilter.tags.delete(tg);
      else memoryFilter.tags.add(tg);
      renderMemoryTagFilter();
      renderMemoryAlbumFilter();
      renderMemories();
    });
    tagsRow.appendChild(chip);
  });

  left.appendChild(t);
  left.appendChild(d);
  if ((m.tags || []).length) left.appendChild(tagsRow);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.alignItems = "flex-end";
  right.style.gap = "8px";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = m.date ? new Date(m.date).toLocaleDateString("tr-TR") : "Tarihsiz";
  right.appendChild(badge);

  if (m.album) {
    const alb = document.createElement("span");
    alb.className = "badge";
    alb.style.marginTop = "6px";
    alb.textContent = "Albüm: " + m.album;
    right.appendChild(alb);
  }

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";

  const edit = document.createElement("button");
  edit.className = "ghost";
  edit.style.width = "auto";
  edit.style.padding = "10px 12px";
  edit.textContent = "Düzenle";
  edit.addEventListener("click", () => editMemory(m.id));

  const del = document.createElement("button");
  del.className = "danger";
  del.style.padding = "10px 12px";
  del.style.width = "auto";
  del.textContent = "Sil";
  del.addEventListener("click", () => {
    const list = loadMemories().filter((x) => x.id !== m.id);
    saveMemories(list);
    renderMemories();
    toast("Anı silindi.");
  });

  actions.appendChild(edit);
  actions.appendChild(del);
  right.appendChild(actions);

  meta.appendChild(left);
  meta.appendChild(right);

  div.appendChild(img);
  div.appendChild(meta);
  return div;
}

function getAllMemoryAlbums(list) {
  const a = [];
  list.forEach((m) => {
    const alb = (m.album || "").trim();
    if (alb) a.push(alb);
  });
  return unique(a).sort((x, y) => x.localeCompare(y, "tr"));
}

function renderMemoryAlbumFilter() {
  const sel = $("#memoryAlbumFilter");
  if (!sel) return;

  const all = getAllMemoryAlbums(loadMemories());
  const prev = sel.value || "ALL";

  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "ALL";
  optAll.textContent = "Tüm Albümler";
  sel.appendChild(optAll);

  all.forEach((a) => {
    const o = document.createElement("option");
    o.value = a;
    o.textContent = a;
    sel.appendChild(o);
  });

  sel.value = all.includes(prev) ? prev : "ALL";
}

function renderMemoryTagFilter() {
  const wrap = $("#memoryTagFilter");
  const btn = $("#memoryTagFilterBtn");
  if (!wrap || !btn) return;

  const all = getAllMemoryTags(loadMemories());
  wrap.innerHTML = "";
  if (!all.length) {
    wrap.hidden = true;
    return;
  }

  all.forEach((tg) => {
    const el = document.createElement("span");
    el.className = "tag" + (memoryFilter.tags.has(tg) ? " active" : "");
    el.textContent = tg;
    el.addEventListener("click", () => {
      if (memoryFilter.tags.has(tg)) memoryFilter.tags.delete(tg);
      else memoryFilter.tags.add(tg);
      renderMemoryTagFilter();
      renderMemories();
    });
    wrap.appendChild(el);
  });
}

function renderMemories() {
  const q = (($("#memorySearch")?.value || "").trim().toLowerCase());
  const sort = $("#memorySort")?.value || "new";
  const albumSel = $("#memoryAlbumFilter")?.value || "ALL";

  const all = loadMemories();

  let list = all.filter((m) => {
    const hay = ((m.title || "") + " " + (m.text || "") + " " + (m.tags || []).join(" ") + " " + (m.album || "")).toLowerCase();
    const okQ = !q || hay.includes(q);

    const selectedTags = Array.from(memoryFilter.tags);
    const okTag = !selectedTags.length || selectedTags.every((t) => (m.tags || []).includes(t));

    const okAlb = albumSel === "ALL" || String(m.album || "") === albumSel;

    return okQ && okTag && okAlb;
  });

  if (sort === "new") list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (sort === "old") list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (sort === "date") list.sort((a, b) => (String(a.date || "").localeCompare(String(b.date || ""))));
  if (sort === "title") list.sort((a, b) => (String(a.title || "").localeCompare(String(b.title || ""), "tr")));

  const wrap = $("#memoryList");
  if (wrap) {
    wrap.innerHTML = "";
    list.forEach((m) => wrap.appendChild(memoryCard(m)));
  }

  setText("#memoryStats", `Toplam: ${all.length} • Görünen: ${list.length}`);

  const empty = $("#memoryEmpty");
  if (empty) empty.hidden = all.length !== 0;
}

function addMemory() {
  const fileEl = $("#memoryImage");
  const file = fileEl && fileEl.files ? fileEl.files[0] : null;

  const title = (($("#memoryTitle")?.value || "").trim());
  const text = (($("#memoryText")?.value || "").trim());
  const date = $("#memoryDate")?.value || "";
  const tags = parseTags($("#memoryTags")?.value || "");
  const album = parseAlbum($("#memoryAlbum")?.value || "");

  if (!file) {
    toast("Önce görsel seç.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const m = {
      id: safeUUID(),
      image: reader.result,
      title,
      text,
      date: date || null,
      tags,
      album: album || "",
      createdAt: Date.now()
    };

    const list = loadMemories();
    list.push(m);
    saveMemories(list);

    if (fileEl) fileEl.value = "";
    if ($("#memoryTitle")) $("#memoryTitle").value = "";
    if ($("#memoryText")) $("#memoryText").value = "";
    if ($("#memoryDate")) $("#memoryDate").value = "";
    if ($("#memoryTags")) $("#memoryTags").value = "";
    if ($("#memoryAlbum")) $("#memoryAlbum").value = "";

    renderMemoryImagePreview();
    renderMemoryTagsPreview();
    syncMemoryCounters();

    renderMemoryAlbumFilter();
    renderMemoryTagFilter();
    renderMemories();
    toast("Anı eklendi.");
  };
  reader.readAsDataURL(file);
}

function editMemory(id) {
  const list = loadMemories();
  const m = list.find((x) => x.id === id);
  if (!m) return;

  const newTitle = prompt("Başlık:", m.title || "");
  if (newTitle === null) return;
  const newText = prompt("Açıklama:", m.text || "");
  if (newText === null) return;
  const newDate = prompt("Tarih (YYYY-AA-GG) boş bırakılabilir:", m.date || "");
  if (newDate === null) return;
  const newTags = prompt("Etiketler (virgülle):", (m.tags || []).join(", "));
  if (newTags === null) return;
  const newAlbum = prompt("Albüm (opsiyonel):", m.album || "");
  if (newAlbum === null) return;

  m.title = (newTitle || "").trim();
  m.text = (newText || "").trim();
  m.date = (newDate || "").trim() || null;
  m.tags = parseTags(newTags);
  m.album = parseAlbum(newAlbum);

  saveMemories(list);
  renderMemoryAlbumFilter();
  renderMemoryTagFilter();
  renderMemories();
  toast("Anı güncellendi.");
}

/* --------------------
   MEMORY SLIDESHOW
-------------------- */
const slideshowState = { list: [], i: 0 };

function openSlideshow() {
  const modal = $("#slideshowModal");
  if (!modal) return;

  const albumSel = $("#memoryAlbumFilter")?.value || "ALL";
  const q = (($("#memorySearch")?.value || "").trim().toLowerCase());
  const selectedTags = Array.from(memoryFilter.tags);

  const all = loadMemories().filter((m) => {
    const hay = ((m.title || "") + " " + (m.text || "") + " " + (m.tags || []).join(" ") + " " + (m.album || "")).toLowerCase();
    const okQ = !q || hay.includes(q);
    const okTag = !selectedTags.length || selectedTags.every((t) => (m.tags || []).includes(t));
    const okAlb = albumSel === "ALL" || String(m.album || "") === albumSel;
    return okQ && okTag && okAlb;
  });

  if (!all.length) {
    toast("Slayt için anı bulunamadı.");
    return;
  }

  slideshowState.list = all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  slideshowState.i = 0;

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  renderSlideshow();
}

function closeSlideshow() {
  const modal = $("#slideshowModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function renderSlideshow() {
  const list = slideshowState.list;
  const i = slideshowState.i;
  const m = list[i];
  if (!m) return;

  const img = $("#slideshowImg");
  const meta = $("#slideshowMeta");
  const title = $("#slideshowTitle");

  if (img) img.src = m.image;
  if (title) title.textContent = m.title ? `Slayt • ${m.title}` : "Slayt Gösterisi";
  if (meta) {
    const d = m.date ? new Date(m.date).toLocaleDateString("tr-TR") : "Tarihsiz";
    meta.textContent = `${i + 1}/${list.length} • ${d}` + (m.album ? ` • ${m.album}` : "");
  }
}

function slideshowNext() {
  if (!slideshowState.list.length) return;
  slideshowState.i = (slideshowState.i + 1) % slideshowState.list.length;
  renderSlideshow();
}

function slideshowPrev() {
  if (!slideshowState.list.length) return;
  slideshowState.i = (slideshowState.i - 1 + slideshowState.list.length) % slideshowState.list.length;
  renderSlideshow();
}

/* --------------------
   DIARY & FUTURE
-------------------- */
function loadEntries(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  // Migration: eski sürüm string tutuyorsa -> tek entry
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    const txt = String(raw || "").trim();
    if (!txt) return [];
    const migrated = [{ id: safeUUID(), title: "", text: txt, ts: Date.now() }];
    localStorage.setItem(key, JSON.stringify(migrated));
    return migrated;
  }
}

function saveEntries(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function markdownToHTML(md) {
  const s = escapeHTML(md || "");

  let out = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/\*([^*]+)\*/g, "<i>$1</i>");

  out = out.replace(/^###\s(.+)$/gm, "<h3>$1</h3>");
  out = out.replace(/^##\s(.+)$/gm, "<h2>$1</h2>");
  out = out.replace(/^#\s(.+)$/gm, "<h1>$1</h1>");

  out = out.replace(/^(?:\-\s.+(?:\n|$))+?/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => l.replace(/^\-\s/, ""))
      .map((x) => `<li>${x}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  out = out.replace(/\n/g, "<br>");
  return out;
}

const diaryState = { selectedId: null, preview: false };
const futureState = { selectedId: null, preview: false };

function renderEntryList({ key, listSel, searchSel, state, onSelect }) {
  const listEl = $(listSel);
  if (!listEl) return;

  const q = (($(searchSel)?.value || "").trim().toLowerCase());
  const list = loadEntries(key)
    .filter((e) => {
      const hay = ((e.title || "") + " " + (e.text || "")).toLowerCase();
      return !q || hay.includes(q);
    })
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  listEl.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-inner";
    empty.innerHTML = `<h3>Henüz kayıt yok</h3><p class="muted">Yeni bir kayıt oluşturabilirsin.</p>`;
    const wrap = document.createElement("div");
    wrap.className = "empty";
    wrap.appendChild(empty);
    listEl.appendChild(wrap);
    return;
  }

  list.forEach((e) => {
    const item = document.createElement("div");
    item.className = "list-item" + (e.id === state.selectedId ? " active" : "");

    const left = document.createElement("div");
    left.style.flex = "1";

    const title = document.createElement("div");
    title.style.fontWeight = "800";
    title.textContent = (e.title || "Başlıksız").slice(0, 60);

    const sub = document.createElement("div");
    sub.className = "t";
    sub.textContent = new Date(e.ts || Date.now()).toLocaleString("tr-TR");

    const excerpt = document.createElement("div");
    excerpt.className = "t";
    excerpt.style.opacity = "0.75";
    excerpt.textContent =
      (e.text || "").replace(/\s+/g, " ").slice(0, 72) +
      ((e.text || "").length > 72 ? "…" : "");

    left.appendChild(title);
    left.appendChild(sub);
    left.appendChild(excerpt);

    item.appendChild(left);

    item.addEventListener("click", () => onSelect(e.id));
    listEl.appendChild(item);
  });
}

function selectDiary(id) {
  const list = loadEntries(STORAGE_KEYS.diary);
  const e = list.find((x) => x.id === id);
  if (!e) return;
  diaryState.selectedId = id;
  if ($("#diaryTitle")) $("#diaryTitle").value = e.title || "";
  if ($("#diaryText")) $("#diaryText").value = e.text || "";
  setText("#diarySaved", "Seçildi.");
  renderDiary();
  renderDiaryPreview();
}

function renderDiary() {
  renderEntryList({
    key: STORAGE_KEYS.diary,
    listSel: "#diaryList",
    searchSel: "#diarySearch",
    state: diaryState,
    onSelect: selectDiary
  });
}

function newDiary() {
  const list = loadEntries(STORAGE_KEYS.diary);
  const entry = { id: safeUUID(), title: "", text: "", ts: Date.now() };
  list.unshift(entry);
  saveEntries(STORAGE_KEYS.diary, list);
  diaryState.selectedId = entry.id;
  if ($("#diaryTitle")) $("#diaryTitle").value = "";
  if ($("#diaryText")) $("#diaryText").value = "";
  setText("#diarySaved", "Yeni kayıt.");
  renderDiary();
  renderDiaryPreview();
}

function saveDiaryEntry() {
  const title = (($("#diaryTitle")?.value || "").trim());
  const text = ($("#diaryText")?.value || "");

  let list = loadEntries(STORAGE_KEYS.diary);

  if (!diaryState.selectedId) {
    const entry = { id: safeUUID(), title, text, ts: Date.now() };
    list.unshift(entry);
    diaryState.selectedId = entry.id;
  } else {
    const e = list.find((x) => x.id === diaryState.selectedId);
    if (e) {
      e.title = title;
      e.text = text;
      e.ts = Date.now();
    }
  }

  saveEntries(STORAGE_KEYS.diary, list);
  setText("#diarySaved", "Kaydedildi: " + new Date().toLocaleTimeString("tr-TR"));
  toast("Kayıt kaydedildi.");
  renderDiary();
  renderDiaryPreview();
}

function deleteDiaryEntry() {
  if (!diaryState.selectedId) {
    toast("Silmek için bir kayıt seç.");
    return;
  }
  const ok = confirm("Bu kaydı silmek istiyor musun?");
  if (!ok) return;

  const list = loadEntries(STORAGE_KEYS.diary).filter((x) => x.id !== diaryState.selectedId);
  saveEntries(STORAGE_KEYS.diary, list);
  diaryState.selectedId = null;

  if ($("#diaryTitle")) $("#diaryTitle").value = "";
  if ($("#diaryText")) $("#diaryText").value = "";
  setText("#diarySaved", "Silindi.");

  renderDiary();
  renderDiaryPreview();
  toast("Kayıt silindi.");
}

function renderDiaryPreview() {
  const box = $("#diaryPreview");
  if (!box) return;
  if (!diaryState.preview) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = markdownToHTML($("#diaryText")?.value || "");
}

function toggleDiaryPreview() {
  diaryState.preview = !diaryState.preview;
  renderDiaryPreview();
  toast(diaryState.preview ? "Önizleme açık." : "Önizleme kapalı.");
}

function selectFuture(id) {
  const list = loadEntries(STORAGE_KEYS.future);
  const e = list.find((x) => x.id === id);
  if (!e) return;
  futureState.selectedId = id;
  if ($("#futureTitle")) $("#futureTitle").value = e.title || "";
  if ($("#futureText")) $("#futureText").value = e.text || "";
  setText("#futureSaved", "Seçildi.");
  renderFuture();
  renderFuturePreview();
}

function renderFuture() {
  renderEntryList({
    key: STORAGE_KEYS.future,
    listSel: "#futureList",
    searchSel: "#futureSearch",
    state: futureState,
    onSelect: selectFuture
  });
}

function newFuture() {
  const list = loadEntries(STORAGE_KEYS.future);
  const entry = { id: safeUUID(), title: "", text: "", ts: Date.now() };
  list.unshift(entry);
  saveEntries(STORAGE_KEYS.future, list);
  futureState.selectedId = entry.id;
  if ($("#futureTitle")) $("#futureTitle").value = "";
  if ($("#futureText")) $("#futureText").value = "";
  setText("#futureSaved", "Yeni not.");
  renderFuture();
  renderFuturePreview();
}

function saveFutureEntry() {
  const title = (($("#futureTitle")?.value || "").trim());
  const text = ($("#futureText")?.value || "");

  let list = loadEntries(STORAGE_KEYS.future);

  if (!futureState.selectedId) {
    const entry = { id: safeUUID(), title, text, ts: Date.now() };
    list.unshift(entry);
    futureState.selectedId = entry.id;
  } else {
    const e = list.find((x) => x.id === futureState.selectedId);
    if (e) {
      e.title = title;
      e.text = text;
      e.ts = Date.now();
    }
  }

  saveEntries(STORAGE_KEYS.future, list);
  setText("#futureSaved", "Kaydedildi: " + new Date().toLocaleTimeString("tr-TR"));
  toast("Not kaydedildi.");
  renderFuture();
  renderFuturePreview();
}

function deleteFutureEntry() {
  if (!futureState.selectedId) {
    toast("Silmek için bir not seç.");
    return;
  }
  const ok = confirm("Bu notu silmek istiyor musun?");
  if (!ok) return;

  const list = loadEntries(STORAGE_KEYS.future).filter((x) => x.id !== futureState.selectedId);
  saveEntries(STORAGE_KEYS.future, list);
  futureState.selectedId = null;

  if ($("#futureTitle")) $("#futureTitle").value = "";
  if ($("#futureText")) $("#futureText").value = "";
  setText("#futureSaved", "Silindi.");

  renderFuture();
  renderFuturePreview();
  toast("Not silindi.");
}

function renderFuturePreview() {
  const box = $("#futurePreview");
  if (!box) return;
  if (!futureState.preview) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = markdownToHTML($("#futureText")?.value || "");
}

function toggleFuturePreview() {
  futureState.preview = !futureState.preview;
  renderFuturePreview();
  toast(futureState.preview ? "Önizleme açık." : "Önizleme kapalı.");
}

/* --------------------
   CALENDAR
-------------------- */
const calState = { y: new Date().getFullYear(), m: new Date().getMonth() };

function sameDay(ts, y, m, d) {
  const dt = new Date(ts);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
}

function dayHasChat(y, m, d) {
  return loadChat().some((x) => sameDay(x.ts || 0, y, m, d));
}
function dayHasDiary(y, m, d) {
  return loadEntries(STORAGE_KEYS.diary).some((x) => sameDay(x.ts || 0, y, m, d));
}
function dayHasFuture(y, m, d) {
  return loadEntries(STORAGE_KEYS.future).some((x) => sameDay(x.ts || 0, y, m, d));
}
function dayHasSpecial(y, m, d) {
  return loadSpecials().some((s) => {
    if (!s.date) return false;
    const t = new Date(s.date + "T00:00:00");
    if (s.repeat) return (t.getMonth() === m && t.getDate() === d);
    return (t.getFullYear() === y && t.getMonth() === m && t.getDate() === d);
  });
}

function renderCalendar() {
  const grid = $("#calendarGrid");
  const title = $("#calTitle");
  if (!grid || !title) return;

  const dt = new Date(calState.y, calState.m, 1);
  title.textContent = dt.toLocaleDateString("tr-TR", { year: "numeric", month: "long" });

  grid.innerHTML = "";
  const firstDow = (dt.getDay() + 6) % 7; // Monday=0
  const daysIn = new Date(calState.y, calState.m + 1, 0).getDate();

  const prevDays = new Date(calState.y, calState.m, 0).getDate();
  for (let i = 0; i < firstDow; i++) {
    const d = prevDays - firstDow + i + 1;
    grid.appendChild(makeCalCell(calState.y, calState.m - 1, d, true));
  }

  for (let d = 1; d <= daysIn; d++) {
    grid.appendChild(makeCalCell(calState.y, calState.m, d, false));
  }

  const total = firstDow + daysIn;
  const pad = (7 - (total % 7)) % 7;
  for (let i = 1; i <= pad; i++) {
    grid.appendChild(makeCalCell(calState.y, calState.m + 1, i, true));
  }
}

function makeCalCell(y, m, d, muted) {
  const cell = document.createElement("div");
  cell.className = "cal-cell" + (muted ? " muted" : "");

  const dt = new Date(y, m, d);
  const yy = dt.getFullYear(), mm = dt.getMonth(), dd = dt.getDate();

  const head = document.createElement("div");
  head.className = "cal-d";
  head.textContent = String(dd);
  cell.appendChild(head);

  const badges = document.createElement("div");
  badges.className = "cal-badges";

  if (dayHasDiary(yy, mm, dd)) badges.appendChild(dot());
  if (dayHasFuture(yy, mm, dd)) badges.appendChild(dot());
  if (dayHasSpecial(yy, mm, dd)) badges.appendChild(dot());
  if (dayHasChat(yy, mm, dd)) badges.appendChild(dot());
  if (badges.childElementCount) cell.appendChild(badges);

  const now = new Date();
  if (yy === now.getFullYear() && mm === now.getMonth() && dd === now.getDate()) {
    cell.classList.add("today");
  }

  cell.addEventListener("click", () => showDayDetail(yy, mm, dd));
  return cell;
}

function dot() {
  const s = document.createElement("span");
  s.className = "cal-dot";
  return s;
}

function showDayDetail(y, m, d) {
  const box = $("#calendarDayDetail");
  if (!box) return;

  const title = new Date(y, m, d).toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const diary = loadEntries(STORAGE_KEYS.diary).filter((x) => sameDay(x.ts || 0, y, m, d));
  const future = loadEntries(STORAGE_KEYS.future).filter((x) => sameDay(x.ts || 0, y, m, d));
  const specials = loadSpecials().filter((s) => {
    if (!s.date) return false;
    const t = new Date(s.date + "T00:00:00");
    if (s.repeat) return (t.getMonth() === m && t.getDate() === d);
    return (t.getFullYear() === y && t.getMonth() === m && t.getDate() === d);
  });
  const chat = loadChat().filter((x) => sameDay(x.ts || 0, y, m, d));

  const sec = (items) => {
    if (!items.length) return `<div class="tiny muted">—</div>`;
    return items
      .slice(0, 6)
      .map((it) => `<div class="t" style="opacity:0.95; margin-top:6px;">• ${escapeHTML(it)}</div>`)
      .join("");
  };

  box.hidden = false;
  box.innerHTML =
    `<h3 style="margin:0 0 8px;">${title}</h3>` +
    `<div class="grid2 mt16">` +
    `<div><b>📓 Anı Defteri</b>${sec(diary.map((x) => (x.title || "Başlıksız") + " — " + String(x.text || "").slice(0, 60)))}</div>` +
    `<div><b>🔮 Gelecek</b>${sec(future.map((x) => (x.title || "Başlıksız") + " — " + String(x.text || "").slice(0, 60)))}</div>` +
    `</div>` +
    `<div class="grid2 mt16">` +
    `<div><b>📅 Özel Gün</b>${sec(specials.map((x) => (x.name || "Özel Gün")))}</div>` +
    `<div><b>💬 Sohbet</b>${sec(chat.map((x) => (x.sender === "mizra" ? "Mizra" : "Mevra") + ": " + String(x.text || "").slice(0, 60)))}</div>` +
    `</div>`;
}

function calPrev() { calState.m--; if (calState.m < 0) { calState.m = 11; calState.y--; } renderCalendar(); }
function calNext() { calState.m++; if (calState.m > 11) { calState.m = 0; calState.y++; } renderCalendar(); }
function calToday() { const n = new Date(); calState.y = n.getFullYear(); calState.m = n.getMonth(); renderCalendar(); }

/* --------------------
   SPECIAL DAYS
-------------------- */
function loadSpecials() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.specials) || "[]");
  } catch {
    return [];
  }
}

function saveSpecials(list) {
  localStorage.setItem(STORAGE_KEYS.specials, JSON.stringify(list));
}

function loadNotifiedMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.specialNotified) || "{}");
  } catch {
    return {};
  }
}

function saveNotifiedMap(map) {
  localStorage.setItem(STORAGE_KEYS.specialNotified, JSON.stringify(map));
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - base.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function renderSpecials() {
  const ul = $("#specialList");
  if (!ul) return;
  ul.innerHTML = "";

  const list = loadSpecials().sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  list.forEach((item) => {
    const li = document.createElement("li");
    li.className = "special-item";

    const left = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = item.name || "Özel Gün";

    const sub = document.createElement("div");
    sub.className = "sub";

    const dLeft = daysUntil(item.date);
    const dateTxt = item.date ? new Date(item.date).toLocaleDateString("tr-TR") : "Tarih yok";
    let remainTxt = "";
    if (dLeft === 0) remainTxt = "Bugün.";
    else if (dLeft > 0) remainTxt = `${dLeft} gün kaldı.`;
    else remainTxt = `${Math.abs(dLeft)} gün geçti.`;

    sub.textContent =
      `${dateTxt} • ${remainTxt}` +
      (item.repeat ? " • Her yıl" : "") +
      (item.notify ? " • Bildirim açık" : "");

    left.appendChild(name);
    left.appendChild(sub);

    const del = document.createElement("button");
    del.className = "danger";
    del.style.width = "auto";
    del.style.padding = "10px 12px";
    del.textContent = "Sil";
    del.addEventListener("click", () => {
      saveSpecials(loadSpecials().filter((x) => x.id !== item.id));
      renderSpecials();
      renderNextSpecial();
      renderSpecialCountdown();
      toast("Özel gün silindi.");
    });

    li.appendChild(left);
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function addSpecial() {
  const name = (($("#specialName")?.value || "").trim());
  const date = $("#specialDate")?.value || "";
  const notify = $("#specialNotify")?.checked ?? true;
  const repeat = $("#specialRepeat")?.checked ?? true;

  if (!name || !date) {
    toast("İsim ve tarih gerekli.");
    return;
  }

  const list = loadSpecials();
  list.push({ id: safeUUID(), name, date, notify, repeat });
  saveSpecials(list);

  if ($("#specialName")) $("#specialName").value = "";
  if ($("#specialDate")) $("#specialDate").value = "";

  renderSpecials();
  renderNextSpecial();
  renderSpecialCountdown();
  toast("Özel gün eklendi.");
}

function nextUpcomingSpecial(list) {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let best = null;
  let bestDiff = Infinity;

  list.forEach((s) => {
    if (!s.date) return;
    let t = new Date(s.date + "T00:00:00");
    if (s.repeat) {
      t = new Date(base.getFullYear(), t.getMonth(), t.getDate());
      if (t.getTime() < base.getTime()) t = new Date(base.getFullYear() + 1, t.getMonth(), t.getDate());
    }
    const diff = Math.round((t.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff < bestDiff) {
      bestDiff = diff;
      best = { ...s, diff, targetDate: t.toISOString().slice(0, 10) };
    }
  });

  return best;
}

function renderNextSpecial() {
  const txt = $("#nextSpecialText");
  if (!txt) return;

  const list = loadSpecials();
  const next = nextUpcomingSpecial(list);

  if (!next) {
    txt.textContent = "Henüz eklenmedi.";
    return;
  }

  const showDate = next.targetDate || next.date;
  const dateTxt = showDate ? new Date(showDate).toLocaleDateString("tr-TR") : "Tarih yok";
  const remain = next.diff === 0 ? "Bugün." : `${next.diff} gün kaldı.`;
  txt.textContent = `${next.name} • ${dateTxt} • ${remain}`;
}

async function enableNotifications() {
  const stateEl = $("#notifyState");
  if (!("Notification" in window)) {
    if (stateEl) stateEl.textContent = "Bu tarayıcı bildirim desteklemiyor.";
    toast("Bildirim desteklenmiyor.");
    return;
  }

  const perm = await Notification.requestPermission();
  if (stateEl) stateEl.textContent = perm === "granted" ? "Açık" : "Kapalı";
  toast(perm === "granted" ? "Bildirimler açıldı." : "Bildirim izni verilmedi.");
}

function renderNotifyState() {
  const stateEl = $("#notifyState");
  if (!stateEl) return;

  if (!("Notification" in window)) {
    stateEl.textContent = "Desteklenmiyor";
    return;
  }

  stateEl.textContent =
    Notification.permission === "granted"
      ? "Açık"
      : (Notification.permission === "denied" ? "Kapalı" : "İzin bekliyor");
}

function runSpecialNotificationsCheck() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const list = loadSpecials().filter((s) => s.notify);
  const map = loadNotifiedMap();
  const today = todayISO();

  list.forEach((s) => {
    if (!s.date) return;

    // repeat varsa her yıl aynı ay/gün tetiklenir
    if (s.repeat) {
      const t = new Date(s.date + "T00:00:00");
      const now = new Date();
      const isToday = t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
      if (!isToday) return;
    } else {
      if (s.date !== today) return;
    }

    const key = `${s.id}_${today}`;
    if (map[key]) return;

    try {
      new Notification("Özel Gün", { body: `${s.name} bugün.` });
      map[key] = 1;
    } catch {
      // ignore
    }
  });

  saveNotifiedMap(map);
}

function msToCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return { days, hrs, mins, secs };
}

/* --------------------
   CONFETTI (SPECIAL DAY)
-------------------- */
function launchConfetti(seconds = 2.8) {
  const canvas = $("#confettiCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  };
  resize();

  let running = true;
  const tEnd = performance.now() + seconds * 1000;

  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random(),
    y: -Math.random() * 0.4,
    r: 2 + Math.random() * 5,
    vy: 0.006 + Math.random() * 0.012,
    vx: (Math.random() - 0.5) * 0.003,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.20,
    a: 0.8 + Math.random() * 0.2
  }));

  const draw = (t) => {
    if (!running) return;
    if (t > tEnd) running = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      // wrap
      if (p.y > 1.2) p.y = -0.1;
      if (p.x < -0.1) p.x = 1.1;
      if (p.x > 1.1) p.x = -0.1;

      const x = p.x * canvas.width;
      const y = p.y * canvas.height;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;

      // renkleri hardcode etmiyoruz; tema primary'yi kullanmak için CSS değişkeninden okuyalım
      const c = getComputedStyle(document.body).getPropertyValue("--primary1") || "#ff5f7e";
      ctx.fillStyle = c.trim();
      ctx.fillRect(-p.r * 2, -p.r, p.r * 4, p.r * 2);

      ctx.restore();
    });

    requestAnimationFrame(draw);
  };

  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(draw);

  setTimeout(() => {
    running = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, Math.max(500, seconds * 1000 + 150));
}

function triggerConfettiOncePerDay() {
  const key = STORAGE_KEYS.confettiDay;
  const today = todayISO();
  const last = localStorage.getItem(key) || "";
  if (last === today) return;
  localStorage.setItem(key, today);
  launchConfetti();
}


function renderSpecialCountdown() {
  const homeEl = $("#nextSpecialCountdown");
  const pageEl = $("#specialCountdown");

  const list = loadSpecials();
  const next = nextUpcomingSpecial(list);
  if (!next) {
    if (homeEl) homeEl.textContent = "Henüz eklenmedi.";
    if (pageEl) pageEl.textContent = "Henüz eklenmedi.";
    return;
  }

  const showDate = next.targetDate || next.date;
  const target = new Date(showDate + "T00:00:00");
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  const c = msToCountdown(ms);

  if (ms <= 0) triggerConfettiOncePerDay();

  const txt =
    (ms <= 0)
      ? `${next.name} • Bugün.`
      : `${next.name} • ${c.days}g ${c.hrs}s ${c.mins}d ${c.secs}sn kaldı.`;

  if (homeEl) homeEl.textContent = txt;
  if (pageEl) pageEl.textContent = txt;
}

/* --------------------
   CHAT (two-person, likes, pin, delete + attachments + search + reactions)
-------------------- */
function loadChat() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.chat) || "[]");
  } catch {
    return [];
  }
}

function saveChat(list) {
  localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(list));
}

function getPinnedChatId() {
  return localStorage.getItem(STORAGE_KEYS.chatPinned) || "";
}

function setPinnedChatId(id) {
  localStorage.setItem(STORAGE_KEYS.chatPinned, id || "");
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("Dosya okunamadı."));
    r.readAsDataURL(file);
  });
}

function applyChatSearch(list) {
  const q = (($("#chatSearch")?.value || "").trim().toLowerCase());
  if (!q) return list;
  return list.filter((m) => {
    const t = String(m.text || "").toLowerCase();
    return t.includes(q);
  });
}

function addReaction(messageId, emoji) {
  const all = loadChat();
  const m = all.find((x) => x.id === messageId);
  if (!m) return;
  m.reacts = m.reacts || {};
  m.reacts[emoji] = (m.reacts[emoji] || 0) + 1;
  saveChat(all);
  renderChat();
}

function reactionRow(m) {
  const wrap = document.createElement("div");
  wrap.className = "reacts";
  const reacts = m.reacts || {};
  Object.keys(reacts).slice(0, 8).forEach((k) => {
    const chip = document.createElement("span");
    chip.className = "react-chip";
    chip.textContent = `${k} ${reacts[k]}`;
    wrap.appendChild(chip);
  });
  return wrap;
}

async function sendAttachment(file) {
  const sender = $("#chatSender")?.value || "mevra";
  if (!file) return;

  const type = file.type.startsWith("image/")
    ? "image"
    : (file.type.startsWith("audio/") ? "audio" : "file");

  if (type === "file") {
    toast("Sadece resim veya ses dosyası eklenebilir.");
    return;
  }

  const data = await fileToDataURL(file);
  const list = loadChat();
  list.push({ id: safeUUID(), sender, text: "", ts: Date.now(), likes: 0, type, data, reacts: {} });
  saveChat(list);
  renderChat();
  toast(type === "image" ? "Fotoğraf eklendi." : "Ses eklendi.");
}

function renderChat() {
  const wrap = $("#chatBox");
  if (!wrap) return;
  wrap.innerHTML = "";

  const pinnedId = getPinnedChatId();
  const full = loadChat().slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const list = applyChatSearch(full);

  // pinned (arama filtresinden bağımsız, her zaman gerçek pinned)
  const pinWrap = $("#chatPinned");
  if (pinWrap) {
    const pinned = full.find((m) => m.id === pinnedId);
    if (pinned) {
      pinWrap.hidden = false;
      const body = pinned.type === "image"
        ? `<div style="margin-top:8px;"><i>📷 Fotoğraf</i></div>`
        : (pinned.type === "audio" ? `<div style="margin-top:8px;"><i>🎧 Ses</i></div>` : `<div style="margin-top:8px;">${escapeHTML(pinned.text)}</div>`);
      pinWrap.innerHTML =
        `<b>Sabit</b>` +
        body +
        `<div class="t" style="margin-top:6px; opacity:0.85;">${new Date(pinned.ts).toLocaleString("tr-TR")}</div>`;
    } else {
      pinWrap.hidden = true;
      pinWrap.innerHTML = "";
    }
  }

  list.forEach((m) => {
    const row = document.createElement("div");
    row.className = `msg ${m.sender || "mevra"}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const who = document.createElement("div");
    who.className = "who";
    who.textContent = m.sender === "mizra" ? "Mizra" : "Mevra";

    const content = document.createElement("div");

    if (m.type === "image" && m.data) {
      const im = document.createElement("img");
      im.className = "chat-media";
      im.src = m.data;
      im.alt = "Sohbet görseli";
      content.appendChild(im);
      if (m.text) {
        const cap = document.createElement("div");
        cap.style.marginTop = "8px";
        cap.textContent = m.text;
        content.appendChild(cap);
      }
    } else if (m.type === "audio" && m.data) {
      const au = document.createElement("audio");
      au.controls = true;
      au.src = m.data;
      au.style.width = "100%";
      content.appendChild(au);
      if (m.text) {
        const cap = document.createElement("div");
        cap.style.marginTop = "8px";
        cap.textContent = m.text;
        content.appendChild(cap);
      }
    } else {
      content.textContent = m.text;
    }

    const meta = document.createElement("div");
    meta.className = "t";
    meta.innerHTML = `${new Date(m.ts).toLocaleString("tr-TR")}` + (m.likes ? ` <span class="likes">❤️ ${m.likes}</span>` : "");

    bubble.appendChild(who);
    bubble.appendChild(content);

    // reactions
    if (m.reacts && Object.keys(m.reacts).length) {
      bubble.appendChild(reactionRow(m));
    }

    bubble.appendChild(meta);

    // click = like, Shift+click = reaction
    bubble.addEventListener("click", (e) => {
      if (e && e.shiftKey) {
        const pick = prompt("Reaksiyon seç (örn: ❤️ 😂 😢 😡 😍):", "❤️");
        if (pick) addReaction(m.id, pick.trim().slice(0, 2));
        return;
      }
      const list2 = loadChat();
      const mm = list2.find((x) => x.id === m.id);
      if (!mm) return;
      mm.likes = (mm.likes || 0) + 1;
      saveChat(list2);
      renderChat();
    });

    // right click = delete
    bubble.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        const ok = confirm("Mesaj silinsin mi?");
        if (!ok) return;
        const list2 = loadChat().filter((x) => x.id !== m.id);
        saveChat(list2);
        if (getPinnedChatId() === m.id) setPinnedChatId("");
        renderChat();
        toast("Mesaj silindi.");
      },
      { passive: false }
    );

    row.appendChild(bubble);
    wrap.appendChild(row);
  });

  wrap.scrollTop = wrap.scrollHeight;
}

function sendMessage() {
  const input = $("#chatInput");
  const sender = $("#chatSender")?.value || "mevra";
  const text = (input ? input.value : "").trim();
  if (!text) return;

  const list = loadChat();
  list.push({ id: safeUUID(), sender, text, ts: Date.now(), likes: 0, reacts: {} });
  saveChat(list);

  if (input) input.value = "";
  renderChat();
}

function pinLastMessage() {
  const list = loadChat().slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const last = list[list.length - 1];
  if (!last) {
    toast("Sabitlenecek mesaj yok.");
    return;
  }
  setPinnedChatId(last.id);
  renderChat();
  toast("Son mesaj sabitlendi.");
}

function clearChat() {
  const ok = confirm("Sohbet temizlensin mi?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEYS.chat);
  localStorage.removeItem(STORAGE_KEYS.chatPinned);
  renderChat();
  toast("Sohbet temizlendi.");
}

/* --------------------
   GAME (combo, miss, difficulty, sound, last scores)
-------------------- */
let gameTimer = null;
let moveTimer = null;
let timeLeft = 30;
let score = 0;
let combo = 0;
let miss = 0;
let running = false;

function loadBest() {
  return Number(localStorage.getItem(STORAGE_KEYS.bestScore) || "0") || 0;
}

function saveBest(v) {
  localStorage.setItem(STORAGE_KEYS.bestScore, String(v));
}

function loadLastScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastScores) || "[]");
  } catch {
    return [];
  }
}

function saveLastScores(list) {
  localStorage.setItem(STORAGE_KEYS.lastScores, JSON.stringify(list));
}

function renderLastScores() {
  const wrap = $("#lastScores");
  if (!wrap) return;
  const list = loadLastScores();
  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = `<div class="muted tiny">Henüz skor yok.</div>`;
    return;
  }
  list.slice(0, 10).forEach((s) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.style.cursor = "default";
    item.innerHTML = `<div><div style="font-weight:800;">Skor: ${s.score} • Combo: ${s.combo} • Kaçırma: ${s.miss}</div><div class="t">${new Date(s.ts).toLocaleString("tr-TR")}</div></div>`;
    wrap.appendChild(item);
  });
}

function difficultyConfig() {
  const d = $("#difficulty")?.value || localStorage.getItem(STORAGE_KEYS.difficulty) || "normal";
  if (d === "hard") return { moveMs: 650, scorePerHit: 1 };
  if (d === "insane") return { moveMs: 420, scorePerHit: 1 };
  return { moveMs: 900, scorePerHit: 1 };
}

function placeHeartRandom() {
  const area = $("#gameArea");
  const heart = $("#heartTarget");
  if (!area || !heart) return;

  const pad = 10;
  const rect = area.getBoundingClientRect();
  const size = 64;

  const x = pad + Math.random() * Math.max(0, rect.width - size - pad * 2);
  const y = pad + Math.random() * Math.max(0, rect.height - size - pad * 2);

  heart.style.left = x + "px";
  heart.style.top = y + "px";
  heart.style.transform = "translate(0,0)";
}

function beep(freq = 660, ms = 70) {
  const enabled = $("#soundToggle")?.checked ?? (localStorage.getItem(STORAGE_KEYS.sound) === "1");
  if (!enabled) return;

  try {
    const ctx = beep._ctx || (beep._ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0.05;

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    setTimeout(() => {
      o.stop();
    }, ms);
  } catch {
    // ignore
  }
}

function startGame() {
  if (running) return;
  running = true;

  score = 0;
  combo = 0;
  miss = 0;
  timeLeft = 30;

  setText("#score", String(score));
  setText("#combo", String(combo));
  setText("#miss", String(miss));
  setText("#timeLeft", String(timeLeft));
  setText("#bestScore", String(loadBest()));

  const heart = $("#heartTarget");
  if (heart) heart.hidden = false;

  placeHeartRandom();
  toast("Oyun başladı.");
  beep(720, 90);

  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    timeLeft--;
    setText("#timeLeft", String(timeLeft));
    if (timeLeft <= 0) endGame();
  }, 1000);

  clearInterval(moveTimer);
  const cfg = difficultyConfig();
  moveTimer = setInterval(() => {
    if (!running) return;
    placeHeartRandom();
    combo = 0;
    setText("#combo", String(combo));
  }, cfg.moveMs);
}

function endGame() {
  running = false;
  clearInterval(gameTimer);
  clearInterval(moveTimer);

  const heart = $("#heartTarget");
  if (heart) heart.hidden = true;

  const last = loadLastScores();
  last.unshift({ score, combo, miss, ts: Date.now() });
  saveLastScores(last.slice(0, 10));
  renderLastScores();

  renderCalendar();

  initPWA();
  initAutoLock();

  const best = loadBest();
  if (score > best) {
    saveBest(score);
    setText("#bestScore", String(score));
    toast("Yeni rekor.");
    beep(880, 120);
  } else {
    toast("Oyun bitti.");
    beep(440, 120);
  }
}

function hitHeart() {
  if (!running) return;
  const cfg = difficultyConfig();
  score += cfg.scorePerHit;
  combo++;
  setText("#score", String(score));
  setText("#combo", String(combo));

  if (combo > 0 && combo % 5 === 0) {
    score += 2;
    setText("#score", String(score));
    toast("Combo bonus +2");
  }

  placeHeartRandom();
  beep(760, 60);
}

function missClick() {
  if (!running) return;
  miss++;
  combo = 0;
  setText("#miss", String(miss));
  setText("#combo", String(combo));
  beep(240, 80);
}

function resetBest() {
  saveBest(0);
  setText("#bestScore", "0");
  toast("En iyi skor sıfırlandı.");
}

/* --------------------
   EXPORT / IMPORT
-------------------- */
function exportAllData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {}
  };
  Object.values(STORAGE_KEYS).forEach((k) => {
    payload.data[k] = localStorage.getItem(k);
  });
  downloadTextFile("mevra-mizra-yedek.json", JSON.stringify(payload, null, 2));
  toast("Yedek indirildi.");
}

async function importAllDataFromFile(file) {
  const txt = await readFileAsText(file);
  let obj = null;
  try {
    obj = JSON.parse(txt);
  } catch {
    toast("Geçersiz JSON.");
    return;
  }

  const data = obj && obj.data ? obj.data : obj;
  if (!data || typeof data !== "object") {
    toast("Yedek formatı tanınmadı.");
    return;
  }

  const ok = confirm("İçe aktarma mevcut verilerin üstüne yazabilir. Devam edilsin mi?");
  if (!ok) return;

  Object.values(STORAGE_KEYS).forEach((k) => {
    if (k in data) {
      const v = data[k];
      if (v === null || typeof v === "undefined") localStorage.removeItem(k);
      else localStorage.setItem(k, String(v));
    }
  });

  toast("Yedek içe aktarıldı.");
  initAfterLogin();
}

/* --------------------
   WIPE ALL
-------------------- */
function wipeAll() {
  const ok = confirm("Tüm veriler silinecek. Emin misin?");
  if (!ok) return;

  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  toast("Tüm veriler silindi.");

  // state reset
  diaryState.selectedId = null;
  futureState.selectedId = null;

  // inputs reset
  if ($("#diaryTitle")) $("#diaryTitle").value = "";
  if ($("#diaryText")) $("#diaryText").value = "";
  if ($("#futureTitle")) $("#futureTitle").value = "";
  if ($("#futureText")) $("#futureText").value = "";

  setText("#diarySaved", "");
  setText("#futureSaved", "");

  if ($("#memorySearch")) $("#memorySearch").value = "";

  // memories reset
  memoryFilter.tags.clear();
  renderMemoryAlbumFilter();
  renderMemoryTagFilter();
  renderMemories();

  // diary/future reset
  renderDiary();
  renderDiaryPreview();
  renderFuture();
  renderFuturePreview();

  // specials reset
  renderSpecials();
  renderNextSpecial();
  renderSpecialCountdown();

  // chat reset
  renderChat();

  // game reset
  saveBest(0);
  setText("#bestScore", "0");
  saveLastScores([]);
  renderLastScores();

  // dashboard + calendar
  renderDashboard();
  renderTodayInPast();
  renderCalendar();
}

/* ---------- HELP ---------- */
function showHashHelp() {
  const el = $("#hashHelp");
  if (!el) return;

  el.hidden = !el.hidden;
  el.textContent =
    "Şifre hash üretmek için tarayıcı konsolunda şunu çalıştır:\n" +
    "crypto.subtle.digest('SHA-256', new TextEncoder().encode('SIFREN')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))\n" +
    "Çıkan değeri script_plus.js içindeki PASSWORD_HASH ile değiştir.";
}

/* --------------------
   AUTO LOCK (IDLE)
-------------------- */
const idleState = { last: Date.now(), timer: null };

function getAutoLockConfig() {
  const onv = localStorage.getItem(STORAGE_KEYS.autoLockOn);
  const min = localStorage.getItem(STORAGE_KEYS.autoLockMin);
  return {
    on: onv === null ? true : (onv === "1"),
    minutes: Number(min || "5") || 5
  };
}

function setAutoLockConfig({ on: onVal, minutes }) {
  localStorage.setItem(STORAGE_KEYS.autoLockOn, onVal ? "1" : "0");
  localStorage.setItem(STORAGE_KEYS.autoLockMin, String(minutes || 5));
}

function bumpIdle() {
  idleState.last = Date.now();
}

function initAutoLock() {
  const cfg = getAutoLockConfig();

  if ($("#autoLockToggle")) $("#autoLockToggle").checked = cfg.on;
  if ($("#autoLockMinutes")) $("#autoLockMinutes").value = String(cfg.minutes);

  const watch = () => {
    const cfg2 = getAutoLockConfig();
    if (!cfg2.on) return;

    const limit = cfg2.minutes * 60 * 1000;
    if (Date.now() - idleState.last > limit) {
      toast("Otomatik kilit.");
      logout();
    }
  };

  clearInterval(idleState.timer);
  idleState.timer = setInterval(watch, 10 * 1000);

  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((ev) => {
    document.addEventListener(ev, bumpIdle, { passive: true });
  });
}

/* --------------------
   INIT AFTER LOGIN
-------------------- */
function initAfterLogin() {
  setText("#todayText", formatDateTR(new Date()));

  // Theme UI (palette + select) — fonksiyonlar yoksa kırılmasın
  if (typeof buildThemePalette === "function") buildThemePalette();
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "pink";
  if (typeof syncThemeUI === "function") syncThemeUI(savedTheme);

  // memories
  renderMemoryAlbumFilter();
  renderMemoryTagFilter();
  renderMemories();
  syncMemoryCounters();
  renderMemoryTagsPreview();
  renderMemoryImagePreview();

  // diary/future
  renderDiary();
  renderDiaryPreview();
  renderFuture();
  renderFuturePreview();

  // specials
  renderSpecials();
  renderNextSpecial();
  renderSpecialCountdown();
  renderNotifyState();
  startSpecialCountdownTicker();

  // chat
  renderChat(); // patch’ler renderChat sonrası çalışır (aşağıda)

  // game
  setText("#bestScore", String(loadBest()));
  renderLastScores();

  // restore toggles
  const soundSaved = localStorage.getItem(STORAGE_KEYS.sound);
  if ($("#soundToggle")) $("#soundToggle").checked = soundSaved === "1";

  const diffSaved = localStorage.getItem(STORAGE_KEYS.difficulty) || "normal";
  if ($("#difficulty")) $("#difficulty").value = diffSaved;

  // dashboard + calendar
  renderDashboard();
  renderTodayInPast();
  renderCalendar();

  // notifications check while open
  runSpecialNotificationsCheck();

  // autolock
  initAutoLock();
}

/* --------------------
   PWA
-------------------- */
function initPWA() {
  // Install prompt
  let deferredPrompt = null;

  const installBtn = $("#installBtn");
  const dismissKey = STORAGE_KEYS.installDismiss;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const dismissed = localStorage.getItem(dismissKey) === "1";
    if (installBtn && !dismissed) installBtn.hidden = false;
  });

  on(installBtn, "click", async () => {
    if (!deferredPrompt) {
      toast("Yükleme şu an mümkün değil.");
      return;
    }
    installBtn.hidden = true;
    deferredPrompt.prompt();
    try {
      const res = await deferredPrompt.userChoice;
      if (res && res.outcome === "dismissed") localStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    } finally {
      deferredPrompt = null;
    }
  });

  // Service Worker + update banner
  if (!("serviceWorker" in navigator)) return;

  const updateEl = $("#swUpdate");
  const reloadBtn = $("#swReloadBtn");
  const dismissBtn = $("#swDismissBtn");

  const showUpdate = () => { if (updateEl) updateEl.hidden = false; };
  const hideUpdate = () => { if (updateEl) updateEl.hidden = true; };

  on(dismissBtn, "click", () => hideUpdate());

  let waitingWorker = null;

  const tryShowWaiting = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.waiting) {
      waitingWorker = reg.waiting;
      showUpdate();
    }
  };

  const regPromise = navigator.serviceWorker.register("./sw.js").catch(() => null);

  regPromise.then((reg) => {
    if (!reg) return;

    // Halihazırda waiting varsa
    if (reg.waiting) {
      waitingWorker = reg.waiting;
      showUpdate();
    }

    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        // Yeni SW yüklendi ve bekliyor (controller varsa bu bir update demek)
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          waitingWorker = nw;
          showUpdate();
        }
      });
    });
  });

  on(reloadBtn, "click", async () => {
    try {
      if (!waitingWorker) await tryShowWaiting();
      if (!waitingWorker) {
        toast("Güncelleme bulunamadı.");
        return;
      }
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      hideUpdate();
    } catch {
      toast("Güncelleme başarısız.");
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Yeni SW aktif → sayfayı yenile
    window.location.reload();
  });
}

/* --------------------
   EVENTS
-------------------- */
function wireEvents() {
  // login
  on($("#loginBtn"), "click", checkLogin);
  on($("#loginPassword"), "keydown", (e) => {
    if (e.key === "Enter") checkLogin();
  });
  on($("#logoutBtn"), "click", logout);
  on($("#hintBtn"), "click", () => toast("İpucu: Parola = 08.06.25"));

  // home: surprise + quick setup
  on($("#surpriseBtn"), "click", () => setSurpriseOut(generateSurpriseText()));
  on($("#surpriseCopyBtn"), "click", copySurprise);
  on($("#surpriseShareBtn"), "click", shareSurprise);

  on($("#quickInstallChip"), "click", () => renderQuickSetupHint("install"));
  on($("#quickNotifyChip"), "click", () => renderQuickSetupHint("notify"));
  on($("#quickBackupChip"), "click", () => renderQuickSetupHint("backup"));

  // nav
  document.querySelectorAll(".navbtn").forEach((btn) => {
    on(btn, "click", () => openPage(btn.dataset.page));
  });
  document.querySelectorAll("[data-jump]").forEach((b) => {
    on(b, "click", () => openPage(b.dataset.jump));
  });

  // theme select
  on($("#themeSelect"), "change", (e) => {
    applyTheme(e.target.value);
    toast("Tema değişti.");
  });

  // notifications
  on($("#notifyBtn"), "click", enableNotifications);

  // memories
  on($("#addMemoryBtn"), "click", addMemory);
  on($("#clearMemoryFormBtn"), "click", clearMemoryForm);
  on($("#memoryClearFiltersBtn"), "click", clearMemoryFilters);
  on($("#memoryImage"), "change", () => { renderMemoryImagePreview(); });
  on($("#memoryImageClearBtn"), "click", () => { const f=$("#memoryImage"); if (f) f.value=""; renderMemoryImagePreview(); });
  on($("#memoryTitle"), "input", syncMemoryCounters);
  on($("#memoryText"), "input", syncMemoryCounters);
  on($("#memoryTags"), "input", () => { renderMemoryTagsPreview(); renderMemories(); });
  on($("#memorySearch"), "input", renderMemories);
  on($("#memorySort"), "change", renderMemories);
  on($("#memoryAlbumFilter"), "change", renderMemories);
  on($("#memoryTagFilterBtn"), "click", () => {
    const wrap = $("#memoryTagFilter");
    if (!wrap) return;
    wrap.hidden = !wrap.hidden;
  });
  on($("#memorySlideshowBtn"), "click", openSlideshow);

  // slideshow modal
  on($("#slideshowClose"), "click", closeSlideshow);
  on($("#slideshowPrev"), "click", slideshowPrev);
  on($("#slideshowNext"), "click", slideshowNext);
  on($("#slideshowModal"), "click", (e) => {
    if (e?.target?.dataset?.close) closeSlideshow();
  });

  // diary
  on($("#newDiaryBtn"), "click", newDiary);
  on($("#saveDiaryBtn"), "click", saveDiaryEntry);
  on($("#deleteDiaryBtn"), "click", deleteDiaryEntry);
  on($("#diarySearch"), "input", renderDiary);
  on($("#toggleDiaryPreviewBtn"), "click", toggleDiaryPreview);
  on($("#diaryText"), "input", () => {
    if (diaryState.preview) renderDiaryPreview();
  });

  // future
  on($("#newFutureBtn"), "click", newFuture);
  on($("#saveFutureBtn"), "click", saveFutureEntry);
  on($("#deleteFutureBtn"), "click", deleteFutureEntry);
  on($("#futureSearch"), "input", renderFuture);
  on($("#toggleFuturePreviewBtn"), "click", toggleFuturePreview);
  on($("#futureText"), "input", () => {
    if (futureState.preview) renderFuturePreview();
  });

  // specials
  on($("#addSpecialBtn"), "click", addSpecial);

  // chat
  on($("#sendChatBtn"), "click", sendMessage);
  on($("#chatInput"), "keydown", (e) => {
    // textarea: Enter gönderir, Shift+Enter yeni satır
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  on($("#pinLastBtn"), "click", pinLastMessage);
  on($("#clearChatBtn"), "click", clearChat);
  on($("#chatSearch"), "input", renderChat);

  on($("#attachBtn"), "click", () => $("#chatFile")?.click());
  on($("#chatFile"), "change", async (e) => {
    const f = e?.target?.files?.[0];
    if (f) await sendAttachment(f);
    if (e?.target) e.target.value = "";
  });

  // game
  on($("#startGameBtn"), "click", startGame);
  on($("#heartTarget"), "click", hitHeart);
  on($("#resetBestBtn"), "click", resetBest);
  on($("#gameArea"), "click", (e) => {
    const heart = $("#heartTarget");
    if (!heart) return;
    if (e.target === heart) return;
    missClick();
  });

  on($("#soundToggle"), "change", (e) => {
    localStorage.setItem(STORAGE_KEYS.sound, e.target.checked ? "1" : "0");
  });
  on($("#difficulty"), "change", (e) => {
    localStorage.setItem(STORAGE_KEYS.difficulty, e.target.value);
    toast("Zorluk ayarlandı.");
  });

  // settings
  on($("#wipeAllBtn"), "click", wipeAll);
  on($("#copyHashHelpBtn"), "click", showHashHelp);

  on($("#changePassBtn"), "click", async () => {
    const st = $("#passState");
    if (st) st.textContent = "";

    const oldP = ($("#oldPass")?.value || "").trim();
    const n1 = ($("#newPass")?.value || "").trim();
    const n2 = ($("#newPass2")?.value || "").trim();

    if (!oldP || !n1 || !n2) {
      if (st) st.textContent = "Alanları doldur.";
      return;
    }
    if (n1 !== n2) {
      if (st) st.textContent = "Yeni şifreler aynı değil.";
      return;
    }
    if (n1.length < 4) {
      if (st) st.textContent = "Şifre çok kısa.";
      return;
    }

    // eski şifre doğrula
    const cfg = getPasswordConfig();
    let ok = oldP === cfg.plain;
    if (!ok && hasWebCrypto()) {
      try { ok = (await sha256(oldP)) === cfg.hash; } catch { ok = false; }
    }
    if (!ok) {
      if (st) st.textContent = "Mevcut şifre yanlış.";
      return;
    }

    try {
      const r = await setNewPassword(n1);
      if (st) st.textContent = r.mode === "hash" ? "Şifre güncellendi (hash)." : "Şifre güncellendi (düz).";
      toast("Şifre değişti.");
      $("#oldPass") && ($("#oldPass").value = "");
      $("#newPass") && ($("#newPass").value = "");
      $("#newPass2") && ($("#newPass2").value = "");
    } catch (e) {
      if (st) st.textContent = String(e?.message || "Hata");
    }
  });

  on($("#resetPassBtn"), "click", () => {
    const ok = confirm("Şifre varsayılan değere dönecek. Emin misin?");
    if (!ok) return;
    resetPasswordToDefault();
    const st = $("#passState");
    if (st) st.textContent = "Şifre varsayılana döndü.";
    toast("Şifre sıfırlandı.");
  });

  on($("#exportBtn"), "click", exportAllData);
  on($("#importBtn"), "click", () => $("#importFile")?.click());
  on($("#importFile"), "change", async (e) => {
    const f = e?.target?.files?.[0];
    if (f) await importAllDataFromFile(f);
    if (e?.target) e.target.value = "";
  });

  on($("#autoLockToggle"), "change", () => {
    setAutoLockConfig({
      on: $("#autoLockToggle")?.checked ?? true,
      minutes: Number($("#autoLockMinutes")?.value || "5")
    });
    toast("Ayar kaydedildi.");
  });
  on($("#autoLockMinutes"), "change", () => {
    setAutoLockConfig({
      on: $("#autoLockToggle")?.checked ?? true,
      minutes: Number($("#autoLockMinutes")?.value || "5")
    });
    toast("Ayar kaydedildi.");
  });

  // calendar
  on($("#calPrevBtn"), "click", calPrev);
  on($("#calNextBtn"), "click", calNext);
  on($("#calTodayBtn"), "click", calToday);
}

/* =========================================================
   EXTRA UX PATCHES (SAFE + TEK SEFERLİK)
   - ESC/oklar: slideshow
   - scroll lock: slideshow
   - dblclick pin/unpin: chat (event delegation)
   - textarea auto-resize
   - calendar detail "Kapat"
   - save/add sonrası home widgets & calendar refresh
========================================================= */

// ---- Scroll lock (modal) ----
function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

// Slideshow modal açıkken ESC/oklar
function initSlideshowHotkeys() {
  document.addEventListener("keydown", (e) => {
    const modal = $("#slideshowModal");
    if (!modal || modal.hidden) return;

    if (e.key === "Escape") return closeSlideshow();
    if (e.key === "ArrowRight") return slideshowNext();
    if (e.key === "ArrowLeft") return slideshowPrev();
  });
}

// openSlideshow/closeSlideshow: scroll fix (override)
function patchSlideshowScrollLock() {
  if (patchSlideshowScrollLock._done) return;
  patchSlideshowScrollLock._done = true;

  const _open = openSlideshow;
  openSlideshow = function () {
    _open();
    const modal = $("#slideshowModal");
    if (modal && !modal.hidden) lockScroll(true);
  };

  const _close = closeSlideshow;
  closeSlideshow = function () {
    _close();
    lockScroll(false);
  };
}

// ---- Chat: double click pin/unpin (event delegation) ----
function patchChatDblClickPin() {
  if (patchChatDblClickPin._done) return;
  patchChatDblClickPin._done = true;

  // renderChat'i bir kez patchleyip bubble.dataset.mid dolduralım
  if (typeof renderChat === "function" && !renderChat._patchedForMid) {
    const _render = renderChat;
    renderChat = function () {
      _render();

      // Bu eşleme, mevcut renderChat sıralamasına dayanır:
      // applyChatSearch(full) ile aynı sırada bubble basılıyor.
      const full = loadChat().slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const filtered = applyChatSearch(full);

      const bubbles = Array.from(document.querySelectorAll("#chatBox .bubble"));
      bubbles.forEach((b, i) => {
        const m = filtered[i];
        if (m && m.id) b.dataset.mid = m.id;
      });
    };
    renderChat._patchedForMid = true;
  }

  // Delegation: her render'da yeniden listener bind etme
  const wrap = $("#chatBox");
  if (!wrap) return;

  wrap.addEventListener("dblclick", (e) => {
    const bubble = e.target?.closest?.(".bubble");
    const id = bubble?.dataset?.mid || "";
    if (!id) return;

    const cur = getPinnedChatId();
    if (cur === id) {
      setPinnedChatId("");
      toast("Sabit kaldırıldı.");
    } else {
      setPinnedChatId(id);
      toast("Mesaj sabitlendi.");
    }
    renderChat();
  });
}

// ---- Textarea auto-resize (Diary/Future) ----
function autoResizeTextarea(el) {
  if (!el) return;
  const doResize = () => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 420) + "px";
  };
  doResize();
  el.addEventListener("input", doResize);
  window.addEventListener("resize", doResize);
}

function initTextareaAutoResize() {
  autoResizeTextarea($("#diaryText"));
  autoResizeTextarea($("#futureText"));
}

// ---- Calendar detail: close button injection ----
function ensureCalendarDetailClose() {
  const box = $("#calendarDayDetail");
  if (!box) return;
  if (box.querySelector("[data-cal-close]")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost";
  btn.style.width = "auto";
  btn.style.padding = "8px 10px";
  btn.style.position = "sticky";
  btn.style.top = "0";
  btn.style.float = "right";
  btn.textContent = "Kapat";
  btn.dataset.calClose = "1";
  btn.addEventListener("click", () => {
    box.hidden = true;
  });

  box.prepend(btn);
}

// showDayDetail patch (close butonu garanti)
function patchShowDayDetailCloseButton() {
  if (patchShowDayDetailCloseButton._done) return;
  patchShowDayDetailCloseButton._done = true;

  const _show = showDayDetail;
  showDayDetail = function (y, m, d) {
    _show(y, m, d);
    ensureCalendarDetailClose();
  };
}

// ---- Home widgets hızlı yenile ----
function safeRerenderHomeWidgets() {
  renderDashboard();
  renderTodayInPast();
  renderNextSpecial();
  renderSpecialCountdown();
}

// save/add/delete patch’leri (home + calendar refresh)
function patchDataMutationsForHomeRefresh() {
  if (patchDataMutationsForHomeRefresh._done) return;
  patchDataMutationsForHomeRefresh._done = true;

  const _saveDiary = saveDiaryEntry;
  saveDiaryEntry = function () {
    _saveDiary();
    safeRerenderHomeWidgets();
    renderCalendar();
  };

  const _saveFuture = saveFutureEntry;
  saveFutureEntry = function () {
    _saveFuture();
    safeRerenderHomeWidgets();
    renderCalendar();
  };

  const _addMem = addMemory;
  addMemory = function () {
    _addMem();
    safeRerenderHomeWidgets();
  };

  const _delDiary = deleteDiaryEntry;
  deleteDiaryEntry = function () {
    _delDiary();
    safeRerenderHomeWidgets();
    renderCalendar();
  };

  const _delFuture = deleteFutureEntry;
  deleteFutureEntry = function () {
    _delFuture();
    safeRerenderHomeWidgets();
    renderCalendar();
  };

  const _addSpec = addSpecial;
  addSpecial = function () {
    _addSpec();
    safeRerenderHomeWidgets();
    renderCalendar();
  };
}

/* --------------------
   BOOT
-------------------- */
function boot() {
  try {
    wireEvents();

    // theme (varsa)
    if (typeof buildThemePalette === "function") buildThemePalette();
    if (typeof initTheme === "function") initTheme();

    // bg
    startBgHearts();

    // patches (tek sefer)
    initSlideshowHotkeys();
    patchSlideshowScrollLock();
    patchChatDblClickPin();
    initTextareaAutoResize();
    patchShowDayDetailCloseButton();
    patchDataMutationsForHomeRefresh();

    // authed?
    if (isAuthed()) {
      showSite();
      initAfterLogin();
      applyHashRoute();
    } else {
      showLogin();
    }

    // periodic jobs
    setInterval(() => {
      renderNextSpecial();
      renderDashboard();
      renderTodayInPast();
      runSpecialNotificationsCheck();
    }, 60 * 1000);

    // pwa
    initPWA();

    // deeplink
    window.addEventListener("hashchange", applyHashRoute);

    // idle bump
    bumpIdle();
  } catch (e) {
    console.error("BOOT ERROR:", e);
    alert("SEVİYORUMMMM");
  }
}

document.addEventListener("DOMContentLoaded", boot);
/* EXTRA FULL GAMES IMPLEMENTATION */

// Turn-based Love Game
function startTurnBasedLoveGame(){
  let turn=1;
  let scores=[0,0];
  openGame("🎮 Sıra Bazlı Aşk Oyunu", `
    <p>Oyuncu <b id="turn">1</b> oynuyor</p>
    <button class="primary" id="playTurn">Hamle Yap</button>
    <p class="mt12">Skor: ❤️ ${scores[0]} - 💖 ${scores[1]}</p>
  `);
  document.getElementById("playTurn").onclick=()=>{
    const gain=Math.floor(Math.random()*5)+1;
    scores[turn-1]+=gain;
    turn=turn===1?2:1;
    document.getElementById("turn").textContent=turn;
    toast("Kalp kazanıldı: +"+gain);
  }
}

// Sound Love Game
function startSoundLoveGame(){
  openGame("🔊 Sesli Romantik Oyun", `
    <p>Butona basınca romantik ses çıkar.</p>
    <button class="primary" id="soundBtn">❤️</button>
  `);
  const audio=new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
  document.getElementById("soundBtn").onclick=()=>audio.play();
}

// Know Me Quiz
function startKnowMeQuiz(){
  let score=0;
  const qs=[
    {q:"En sevdiğim renk?", a:["Pembe","Mavi","Siyah","Yeşil"], c:0},
    {q:"En sevdiğim aktivite?", a:["Film","Gezme","Uyuma","Yemek"], c:1}
  ];
  let i=0;
  function render(){
    const q=qs[i];
    openGame("🧠 Beni Ne Kadar Tanıyorsun?", `
      <p>${q.q}</p>
      ${q.a.map((x,j)=>`<button class="ghost ans" data-i="${j}">${x}</button>`).join("")}
    `);
    document.querySelectorAll(".ans").forEach(b=>{
      b.onclick=()=>{
        if(+b.dataset.i===q.c) score+=50;
        i++;
        i<qs.length?render():finish();
      }
    })
  }
  function finish(){
    openGame("Sonuç", `<h2>${score}%</h2><p>${score>50?"Harika tanıyorsun 💕":"Biraz daha vakit!"}</p>`);
  }
  render();
}

// Achievements
function showAchievements(){
  const html = `
    <ul>
      <li>🏆 İlk Oyun</li>
      <li>💖 İlk Kalp</li>
      <li>🎮 Oyun Sever</li>
    </ul>
  `;
  openGame("🏆 Rozetler", html);
}


/* ======================
   GAMES HUB + ACHIEVEMENTS (FULL)
====================== */

const GAME_KEYS = {
  loveMemoryBest: "mm_game_lovememory_best",
  loveMemoryPlays: "mm_game_lovememory_plays",
  loveQuizBest: "mm_game_lovequiz_best",
  loveQuizPlays: "mm_game_lovequiz_plays",
  tttA: "mm_game_ttt_mevra_wins",
  tttB: "mm_game_ttt_mizra_wins",
  tttD: "mm_game_ttt_draws",
  tttPlays: "mm_game_ttt_plays",
  soundBest: "mm_game_sound_best",
  soundPlays: "mm_game_sound_plays",
  knowMeBest: "mm_game_knowme_best",
  knowMePlays: "mm_game_knowme_plays",
  ach: "mm_game_achievements"
};

function numGet(k, def=0){ const v = Number(localStorage.getItem(k)); return Number.isFinite(v) ? v : def; }
function numSet(k, v){ localStorage.setItem(k, String(v)); }
function inc(k, by=1){ numSet(k, numGet(k,0)+by); }
function nowTS(){ return Date.now(); }

function openGame(title, html){
  const m = $("#gameModal");
  const t = $("#gameTitle");
  const b = $("#gameBody");
  if (!m || !t || !b) return;
  t.textContent = title || "Oyun";
  b.innerHTML = html || "";
  m.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeGame(){
  const m = $("#gameModal");
  const b = $("#gameBody");
  if (m) m.hidden = true;
  if (b) b.innerHTML = "";
  document.body.style.overflow = "";
}

function updateGameQuickStats(){
  const el = $("#gameQuickStats");
  if (!el) return;
  const memBest = numGet(GAME_KEYS.loveMemoryBest, 0);
  const quizBest = numGet(GAME_KEYS.loveQuizBest, 0);
  const tttA = numGet(GAME_KEYS.tttA, 0);
  const tttB = numGet(GAME_KEYS.tttB, 0);
  const tttD = numGet(GAME_KEYS.tttD, 0);
  const sndBest = numGet(GAME_KEYS.soundBest, 0);
  const kmBest = numGet(GAME_KEYS.knowMeBest, 0);
  el.innerHTML =
    `💗 Eşleştirme rekor: <b>${memBest}</b> • `+
    `💞 Aşk testi rekor: <b>${quizBest}%</b><br>`+
    `🎮 Üçtaş: <b>${tttA}</b> - <b>${tttB}</b> (ber.: ${tttD}) • `+
    `🔊 Melodi rekor: <b>${sndBest}</b> • `+
    `🧠 Tanıma rekor: <b>${kmBest}%</b>`;
}

/* ---------- ACHIEVEMENTS ---------- */
const ACH_LIST = [
  { id:"first_play", title:"İlk Oyun", desc:"Herhangi bir oyunu ilk kez oyna.", icon:"🎉",
    ok:()=> (numGet(GAME_KEYS.loveMemoryPlays)+numGet(GAME_KEYS.loveQuizPlays)+numGet(GAME_KEYS.tttPlays)+numGet(GAME_KEYS.soundPlays)+numGet(GAME_KEYS.knowMePlays))>=1 },
  { id:"memory_3", title:"Hafıza Ateşi", desc:"Kalp Eşleştirme’de 3 eşleşme üstü tamamla.", icon:"💗",
    ok:()=> numGet(GAME_KEYS.loveMemoryBest,0) >= 3 },
  { id:"quiz_80", title:"Uyum Yüksek", desc:"Aşk Testi’nde %80 ve üstü skor al.", icon:"💞",
    ok:()=> numGet(GAME_KEYS.loveQuizBest,0) >= 80 },
  { id:"ttt_win", title:"İlk Zafer", desc:"Üçtaş’ta ilk galibiyetini al.", icon:"🎮",
    ok:()=> (numGet(GAME_KEYS.tttA,0)+numGet(GAME_KEYS.tttB,0))>=1 },
  { id:"ttt_5", title:"Seri", desc:"Üçtaş’ta toplam 5 oyun oyna.", icon:"✨",
    ok:()=> numGet(GAME_KEYS.tttPlays,0) >= 5 },
  { id:"sound_5", title:"Kulak Kesildi", desc:"Melodi oyununda seviye 5’e ulaş.", icon:"🔊",
    ok:()=> numGet(GAME_KEYS.soundBest,0) >= 5 },
  { id:"knowme_90", title:"Beni Çözdün", desc:"Tanıma testinde %90 ve üstü al.", icon:"🧠",
    ok:()=> numGet(GAME_KEYS.knowMeBest,0) >= 90 },
  { id:"all_rounder", title:"Her Daldan", desc:"Tüm oyunları en az 1 kere oyna.", icon:"🏆",
    ok:()=> numGet(GAME_KEYS.loveMemoryPlays,0)>=1 && numGet(GAME_KEYS.loveQuizPlays,0)>=1 && numGet(GAME_KEYS.tttPlays,0)>=1 && numGet(GAME_KEYS.soundPlays,0)>=1 && numGet(GAME_KEYS.knowMePlays,0)>=1 },
];

function loadAch(){
  try{ return JSON.parse(localStorage.getItem(GAME_KEYS.ach) || "{}"); }catch{ return {}; }
}
function saveAch(a){ localStorage.setItem(GAME_KEYS.ach, JSON.stringify(a)); }

function refreshAchievements(){
  const a = loadAch();
  let unlockedNow = 0;
  ACH_LIST.forEach(x=>{
    if (!a[x.id] && x.ok()){
      a[x.id] = { ts: nowTS() };
      unlockedNow++;
    }
  });
  if (unlockedNow){
    saveAch(a);
    toast(`🏆 ${unlockedNow} rozet açıldı!`);
  } else {
    saveAch(a);
  }
  updateGameQuickStats();
}

function showAchievements(){
  refreshAchievements();
  const a = loadAch();
  const html = `
    <p class="tiny muted">Açılan rozetler cihazında saklanır.</p>
    <div class="badge-grid">
      ${ACH_LIST.map(x=>{
        const ok = !!a[x.id];
        const date = ok ? new Date(a[x.id].ts).toLocaleString("tr-TR") : "Kilitli";
        return `
          <div class="ach-card ${ok?"":"locked"}">
            <div class="ach-title">${x.icon} ${escapeHTML(x.title)}</div>
            <div class="ach-desc">${escapeHTML(x.desc)}</div>
            <div class="ach-date">${date}</div>
          </div>`;
      }).join("")}
    </div>
  `;
  openGame("🏆 Rozetler", html);
}

function showGameStats(){
  refreshAchievements();
  const html = `
    <div class="tiny muted">
      <div>💗 Eşleştirme: oynama <b>${numGet(GAME_KEYS.loveMemoryPlays,0)}</b> • rekor <b>${numGet(GAME_KEYS.loveMemoryBest,0)}</b></div>
      <div>💞 Aşk Testi: oynama <b>${numGet(GAME_KEYS.loveQuizPlays,0)}</b> • rekor <b>${numGet(GAME_KEYS.loveQuizBest,0)}%</b></div>
      <div>🎮 Üçtaş: oynama <b>${numGet(GAME_KEYS.tttPlays,0)}</b> • Mevra <b>${numGet(GAME_KEYS.tttA,0)}</b> • Mizra <b>${numGet(GAME_KEYS.tttB,0)}</b> • Berabere <b>${numGet(GAME_KEYS.tttD,0)}</b></div>
      <div>🔊 Melodi: oynama <b>${numGet(GAME_KEYS.soundPlays,0)}</b> • rekor seviye <b>${numGet(GAME_KEYS.soundBest,0)}</b></div>
      <div>🧠 Tanıma: oynama <b>${numGet(GAME_KEYS.knowMePlays,0)}</b> • rekor <b>${numGet(GAME_KEYS.knowMeBest,0)}%</b></div>
    </div>
  `;
  openGame("📊 Oyun İstatistikleri", html);
}

function resetGameData(){
  const ok = confirm("Oyun skorları + rozetler sıfırlansın mı? Bu işlem geri alınamaz.");
  if (!ok) return;
  Object.values(GAME_KEYS).forEach(k=> localStorage.removeItem(k));
  toast("Oyun verileri sıfırlandı.");
  refreshAchievements();
  updateGameQuickStats();
}

/* ---------- GAME 1: LOVE MEMORY ---------- */
function startLoveMemory(){
  inc(GAME_KEYS.loveMemoryPlays, 1);

  const icons = ["❤️","💗","💖","💘","💕","💞"];
  const deck = [...icons, ...icons].sort(()=>Math.random()-0.5);
  const found = new Set();
  let open = [];
  let matched = 0;
  let moves = 0;
  const start = nowTS();

  const html = `
    <p class="tiny muted">Aynı kalpleri eşleştir. En az hamlede bitir.</p>
    <div class="game-grid" id="memGrid">
      ${deck.map((_,i)=>`<div class="game-card" data-i="${i}">❔</div>`).join("")}
    </div>
    <div class="row mt12" style="justify-content:space-between;">
      <span class="tiny muted">Eşleşme: <b id="memMatch">0</b>/6</span>
      <span class="tiny muted">Hamle: <b id="memMoves">0</b></span>
    </div>
  `;
  openGame("💗 Kalp Eşleştirme", html);

  const grid = $("#memGrid");
  const matchEl = $("#memMatch");
  const movesEl = $("#memMoves");

  function finish(){
    const sec = Math.max(1, Math.round((nowTS()-start)/1000));
    const score = Math.max(1, Math.round((600 - (moves*12) - (sec*2))));
    const best = numGet(GAME_KEYS.loveMemoryBest, 0);
    if (score > best) numSet(GAME_KEYS.loveMemoryBest, score);
    refreshAchievements();
    openGame("💗 Tamamlandı", `
      <p><b>Skor:</b> ${score}</p>
      <p class="tiny muted">Hamle: ${moves} • Süre: ${sec} sn</p>
      <div class="row mt12" style="justify-content:flex-start; gap:10px; flex-wrap:wrap;">
        <button class="primary" id="memAgain" type="button">Tekrar</button>
        <button class="ghost" id="memBack" type="button">Kapat</button>
      </div>
    `);
    $("#memAgain")?.addEventListener("click", startLoveMemory);
    $("#memBack")?.addEventListener("click", closeGame);
  }

  function flip(card, i){
    if (found.has(i)) return;
    if (open.length === 2) return;
    if (open.some(x=>x.i===i)) return;

    card.textContent = deck[i];
    card.classList.add("open");
    open.push({ card, i });

    if (open.length === 2){
      moves++;
      if (movesEl) movesEl.textContent = String(moves);

      const [a,b] = open;
      if (deck[a.i] === deck[b.i]){
        found.add(a.i); found.add(b.i);
        a.card.classList.add("matched");
        b.card.classList.add("matched");
        open = [];
        matched++;
        if (matchEl) matchEl.textContent = String(matched);
        if (matched === 6){
          toast("💞 Harikasınız!");
          finish();
        }
      } else {
        setTimeout(()=>{
          open.forEach(x=>{
            x.card.textContent="❔";
            x.card.classList.remove("open");
          });
          open = [];
        }, 600);
      }
    }
  }

  grid?.querySelectorAll(".game-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      const i = Number(card.getAttribute("data-i"));
      flip(card, i);
    });
  });

  refreshAchievements();
  updateGameQuickStats();
}

/* ---------- GAME 2: LOVE QUIZ ---------- */
function startLoveQuiz(){
  inc(GAME_KEYS.loveQuizPlays, 1);

  const questions = [
    { q:"Birlikte en iyi yaptığınız şey?", a:["Gülmek","Sohbet","Yürüyüş","Film"], w:[18,16,14,12] },
    { q:"En romantik küçük sürpriz?", a:["Not bırakmak","Sarılmak","Çiçek","Şarkı"], w:[18,16,14,12] },
    { q:"Tartışınca en iyisi?", a:["Hemen konuşmak","Biraz beklemek","Gülmek","Çay yapmak"], w:[18,16,12,14] },
    { q:"Sizin “biz” kelimeniz?", a:["Huzur","Tutku","Ev","Macera"], w:[18,16,14,12] },
    { q:"Randevu modu?", a:["Evde","Dışarı","Karışık","Sürpriz"], w:[14,14,16,18] }
  ].sort(()=>Math.random()-0.5);

  let i=0, score=0;

  function render(){
    const q = questions[i];
    const html = `
      <p><b>${escapeHTML(q.q)}</b></p>
      <div class="quiz-choices">
        ${q.a.map((txt,ix)=>`<button class="quiz-choice" data-ix="${ix}" type="button">${escapeHTML(txt)}</button>`).join("")}
      </div>
      <p class="tiny muted mt12">${i+1}/${questions.length}</p>
    `;
    openGame("💞 Aşk Testi", html);

    document.querySelectorAll(".quiz-choice").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const ix = Number(btn.getAttribute("data-ix"));
        score += (q.w[ix] || 12);
        i++;
        if (i<questions.length) render();
        else finish();
      });
    });
  }

  function finish(){
    // normalize to 0-100
    const max = questions.reduce((s,x)=> s + Math.max(...x.w), 0);
    const pct = Math.max(1, Math.min(100, Math.round((score/max)*100)));
    const best = numGet(GAME_KEYS.loveQuizBest, 0);
    if (pct > best) numSet(GAME_KEYS.loveQuizBest, pct);

    const msg = pct >= 85 ? "Ruh eşi seviyesinde uyum 💕"
              : pct >= 70 ? "Tatlı ve güçlü bir uyum 💗"
              : pct >= 55 ? "Güzel gidiyor, biraz daha romantizm 😄"
              : "Tamam, şimdi romantik görev zamanı 😅";

    refreshAchievements();
    openGame("💖 Sonuç", `
      <h2 style="margin:0 0 6px 0;">${pct}%</h2>
      <p class="muted">${escapeHTML(msg)}</p>
      <div class="row mt12" style="justify-content:flex-start; gap:10px; flex-wrap:wrap;">
        <button class="primary" id="quizAgain" type="button">Tekrar</button>
        <button class="ghost" id="quizClose" type="button">Kapat</button>
      </div>
    `);
    $("#quizAgain")?.addEventListener("click", startLoveQuiz);
    $("#quizClose")?.addEventListener("click", closeGame);

    updateGameQuickStats();
  }

  render();
  refreshAchievements();
  updateGameQuickStats();
}

/* ---------- GAME 3: TURN-BASED LOVE TTT ---------- */
function startTurnBasedLoveGame(){
  inc(GAME_KEYS.tttPlays, 1);

  let board = Array(9).fill(null);
  let turn = 0; // 0 -> Mevra, 1 -> Mizra
  const P = [
    { name:"Mevra", mark:"❤️" },
    { name:"Mizra", mark:"💙" }
  ];

  function winner(){
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const ln of lines){
      const [a,b,c] = ln;
      if (board[a] && board[a]===board[b] && board[a]===board[c]){
        return { mark: board[a], line: ln };
      }
    }
    if (board.every(Boolean)) return { draw:true };
    return null;
  }

  function render(){
    const w = winner();
    const status = w?.draw ? "🤝 Berabere!"
                  : w ? `🏆 Kazanan: ${w.mark} (${w.mark===P[0].mark?P[0].name:P[1].name})`
                  : `Sıra: <b>${P[turn].name}</b> ${P[turn].mark}`;
    const html = `
      <p class="tiny muted">3'lü yap, kalbi kap. (Mevra: ❤️, Mizra: 💙)</p>
      <div class="tiny muted">${status}</div>
      <div class="ttt-board" id="tttBoard">
        ${board.map((v,i)=>`<div class="ttt-cell ${v?"filled":""}" data-i="${i}">${v||""}</div>`).join("")}
      </div>
      <div class="row mt12" style="justify-content:flex-start; gap:10px; flex-wrap:wrap;">
        <button class="ghost" id="tttReset" type="button">Yeni Oyun</button>
        <button class="ghost" id="tttClose" type="button">Kapat</button>
      </div>
      <p class="tiny muted mt12">Skor: Mevra <b>${numGet(GAME_KEYS.tttA,0)}</b> • Mizra <b>${numGet(GAME_KEYS.tttB,0)}</b> • Berabere <b>${numGet(GAME_KEYS.tttD,0)}</b></p>
    `;
    openGame("🎮 Sıra Bazlı Aşk Oyunu", html);

    const b = $("#tttBoard");
    b?.querySelectorAll(".ttt-cell").forEach(cell=>{
      cell.addEventListener("click", ()=>{
        const i = Number(cell.getAttribute("data-i"));
        if (board[i]) return;
        if (winner()) return;
        board[i] = P[turn].mark;
        turn = 1 - turn;
        const w2 = winner();
        if (w2){
          if (w2.draw){
            inc(GAME_KEYS.tttD, 1);
            toast("🤝 Berabere!");
          } else {
            const winMevra = w2.mark === P[0].mark;
            inc(winMevra ? GAME_KEYS.tttA : GAME_KEYS.tttB, 1);
            toast("🏆 Kazandınız!");
          }
          refreshAchievements();
        }
        render();
        // highlight win line
        const w3 = winner();
        if (w3 && !w3.draw){
          w3.line.forEach(ix=>{
            b?.querySelector(`.ttt-cell[data-i="${ix}"]`)?.classList.add("ttt-win");
          });
        }
        updateGameQuickStats();
      });
    });

    $("#tttReset")?.addEventListener("click", ()=>{
      board = Array(9).fill(null);
      turn = 0;
      render();
    });
    $("#tttClose")?.addEventListener("click", closeGame);
  }

  render();
  refreshAchievements();
  updateGameQuickStats();
}

/* ---------- GAME 4: SOUND (MELODY MATCH) ---------- */
let audioCtx = null;

function beep(freq=440, dur=0.18){
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.stop(t+dur+0.02);
  }catch{}
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function playSeq(seq, freqs){
  for (const x of seq){
    beep(freqs[x], 0.16);
    await sleep(260);
  }
}

function startSoundLoveGame(){
  inc(GAME_KEYS.soundPlays, 1);

  const freqs = [261.63, 329.63, 392.00, 523.25]; // C E G C5
  let level = 1;
  let seq = [];
  let input = [];
  let locked = true;

  function render(msg="Dinle ve tekrar et."){
    const html = `
      <p class="tiny muted">${escapeHTML(msg)}</p>
      <div class="row mt12" style="justify-content:space-between;">
        <span class="tiny muted">Seviye: <b id="sndLevel">${level}</b></span>
        <span class="tiny muted">Rekor: <b>${numGet(GAME_KEYS.soundBest,0)}</b></span>
      </div>
      <div class="row mt12" style="justify-content:flex-start; gap:10px; flex-wrap:wrap;">
        <button class="primary" id="sndPlay" type="button">Çal</button>
        <button class="ghost" id="sndRestart" type="button">Yeniden</button>
        <button class="ghost" id="sndClose" type="button">Kapat</button>
      </div>

      <div class="note-pad">
        ${["A","B","C","D"].map((t,i)=>`<button class="note-btn" data-i="${i}" type="button">${t}</button>`).join("")}
      </div>

      <p class="tiny muted mt12" id="sndState">${locked ? "Önce Çal'a bas." : "Şimdi sırayı gir."}</p>
    `;
    openGame("🔊 Sesli Romantik Oyun", html);

    $("#sndPlay")?.addEventListener("click", async ()=>{
      locked = true;
      $("#sndState").textContent = "Dinle…";
      input = [];
      await playSeq(seq, freqs);
      locked = false;
      $("#sndState").textContent = "Şimdi sırayı gir.";
    });

    $("#sndRestart")?.addEventListener("click", ()=> startSoundLoveGame());
    $("#sndClose")?.addEventListener("click", closeGame);

    document.querySelectorAll(".note-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = Number(btn.getAttribute("data-i"));
        beep(freqs[i], 0.12);
        if (locked) return toast("Önce Çal.");
        input.push(i);
        // check prefix
        for (let k=0;k<input.length;k++){
          if (input[k] !== seq[k]){
            locked = true;
            const best = numGet(GAME_KEYS.soundBest, 0);
            if (level-1 > best) numSet(GAME_KEYS.soundBest, level-1);
            refreshAchievements();
            openGame("😵 Yanlış", `
              <p><b>Seviye:</b> ${level}</p>
              <p class="tiny muted">Yanlış tuş. Rekor güncellendiyse kaydedildi.</p>
              <div class="row mt12" style="justify-content:flex-start; gap:10px; flex-wrap:wrap;">
                <button class="primary" id="sndAgain" type="button">Tekrar</button>
                <button class="ghost" id="sndClose2" type="button">Kapat</button>
              </div>
            `);
            $("#sndAgain")?.addEventListener("click", startSoundLoveGame);
            $("#sndClose2")?.addEventListener("click", closeGame);
            updateGameQuickStats();
            return;
          }
        }
        if (input.length === seq.length){
          toast("✅ Doğru!");
          level++;
          input = [];
          seq.push(Math.floor(Math.random()*4));
          $("#sndLevel").textContent = String(level);
          $("#sndState").textContent = "Harika. Çal'a bas.";
          locked = true;
          const best = numGet(GAME_KEYS.soundBest, 0);
          if (level-1 > best) numSet(GAME_KEYS.soundBest, level-1);
          refreshAchievements();
          updateGameQuickStats();
        }
      });
    });
  }

  // init sequence
  level = 1;
  seq = [Math.floor(Math.random()*4)];
  input = [];
  locked = true;
  render();
  refreshAchievements();
  updateGameQuickStats();
}

/* ---------- GAME 5: KNOW ME QUIZ ---------- */
function startKnowMeQuiz(){
  inc(GAME_KEYS.knowMePlays, 1);

  const bank = [
    { q:"En sevdiğim tatlı?", a:["Çikolata","Sütlaç","Tiramisu","Baklava"], c:2 },
    { q:"Benim için en iyi randevu?", a:["Evde film","Yürüyüş","Kahve","Sürpriz piknik"], c:3 },
    { q:"Hangi müzik daha çok bende?", a:["Pop","Rap","Rock","Lo-fi"], c:3 },
    { q:"Beni en çok ne mutlu eder?", a:["Sarılmak","Hediye","Mesaj","Birlikte zaman"], c:3 },
    { q:"Benim küçük takıntım?", a:["Düzen","Koku","Saat","Fotoğraf"], c:0 },
    { q:"En sevdiğim mevsim?", a:["İlkbahar","Yaz","Sonbahar","Kış"], c:2 },
    { q:"Bir kelimeyle ben?", a:["Sakin","Hızlı","Duygusal","Mantıklı"], c:2 },
    { q:"Benim kahvem?", a:["Şekerli","Sade","Sütlü","Soğuk"], c:1 },
    { q:"En sevdiğim renk tonu?", a:["Pembe","Mor","Mavi","Siyah"], c:1 },
    { q:"Benim “biz” hayalim?", a:["Seyahat","Ev","Proje","Hepsi"], c:3 },
  ].sort(()=>Math.random()-0.5).slice(0,7);

  let i=0, correct=0;

  function render(){
    const q = bank[i];
    const html = `
      <p><b>${escapeHTML(q.q)}</b></p>
      <div class="quiz-choices">
        ${q.a.map((t,ix)=>`<button class="quiz-choice" data-ix="${ix}" type="button">${escapeHTML(t)}</button>`).join("")}
      </div>
      <p class="tiny muted mt12">${i+1}/${bank.length}</p>
    `;
    openGame("🧠 Tanıma Testi", html);

    document.querySelectorAll(".quiz-choice").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const ix = Number(btn.getAttribute("data-ix"));
        const ok = ix === q.c;
        if (ok) { correct++; btn.classList.add("correct"); toast("✅ Doğru"); }
        else { btn.classList.add("wrong"); toast("❌ Yanlış"); }
        // reveal correct quickly
        document.querySelectorAll(".quiz-choice").forEach(b2=>{
          const j = Number(b2.getAttribute("data-ix"));
          if (j === q.c) b2.classList.add("correct");
          b2.disabled = true;
        });
        setTimeout(()=>{
          i++;
          if (i<bank.length) render();
          else finish();
        }, 650);
      });
    });
  }

  function finish(){
    const pct = Math.round((correct/bank.length)*100);
    const best = numGet(GAME_KEYS.knowMeBest, 0);
    if (pct > best) numSet(GAME_KEYS.knowMeBest, pct);

    const msg = pct>=90 ? "Beni ezberlemişsin. Korkutucu derecede iyi 😄"
              : pct>=70 ? "Gayet iyi tanıyorsun 💗"
              : pct>=50 ? "Fena değil… daha çok sohbet lazım 😉"
              : "Bugün 'soru-cevap' randevusu şart 😅";

    refreshAchievements();
    openGame("🧠 Sonuç", `
      <h2 style="margin:0 0 6px 0;">${pct}%</h2>
      <p class="muted">${escapeHTML(msg)}</p>
      <p class="tiny muted">Doğru: ${correct}/${bank.length}</p>
      <div class="row mt12" style="justify-content:flex-start; gap:10px; flex-wrap:wrap;">
        <button class="primary" id="kmAgain" type="button">Tekrar</button>
        <button class="ghost" id="kmClose" type="button">Kapat</button>
      </div>
    `);
    $("#kmAgain")?.addEventListener("click", startKnowMeQuiz);
    $("#kmClose")?.addEventListener("click", closeGame);

    updateGameQuickStats();
  }

  render();
  refreshAchievements();
  updateGameQuickStats();
}

/* ---------- GAME WIRES ---------- */
function initGamesUI(){
  on($("#btnLoveMemory"), "click", startLoveMemory);
  on($("#btnLoveQuiz"), "click", startLoveQuiz);
  on($("#btnLoveTtt"), "click", startTurnBasedLoveGame);
  on($("#btnLoveSound"), "click", startSoundLoveGame);
  on($("#btnKnowMe"), "click", startKnowMeQuiz);

  on($("#btnAchievements"), "click", showAchievements);
  on($("#btnGameStats"), "click", showGameStats);
  on($("#btnResetGameData"), "click", resetGameData);

  on($("#gameCloseBtn"), "click", closeGame);
  on($("#gameCloseX"), "click", closeGame);

  updateGameQuickStats();
  refreshAchievements();
}

// Hook into existing initAfterLogin if present; else DOMContentLoaded
(function hookGames(){
  if (typeof window.initAfterLogin === "function"){
    const _old = window.initAfterLogin;
    window.initAfterLogin = function(){
      _old();
      initGamesUI();
    };
  } else {
    document.addEventListener("DOMContentLoaded", initGamesUI);
  }
})();


/* SUITE_ENGINE */
(function(){
  const $$ = (s)=>document.querySelector(s);

  const KEYS = {
    mood: "mm_mood_by_day",
    xp: "mm_xp",
    lvl: "mm_level",
    achievements: "mm_achievements",
    weekly: "mm_weekly",
    weeklyDone: "mm_weekly_done",
    capsules: "mm_capsules",
    voice: "mm_voice_notes",
    privacy: "mm_privacy_on",
    fake: "mm_fake_on",
    stats: "mm_suite_stats"
  };

  function nowISO(){
    const d=new Date();
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function isoWeekKey(date=new Date()){
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
  }

  function loadJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || ""); } catch { return fallback; }
  }
  function saveJSON(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ---------- XP / LEVEL ----------
  function getXP(){ return Number(localStorage.getItem(KEYS.xp)||"0")||0; }
  function getLevel(){ return Number(localStorage.getItem(KEYS.lvl)||"1")||1; }
  function xpToNext(level){ return Math.floor(80 + (level-1)*45); }

  function addXP(amount, reason){
    const a = Math.max(0, Number(amount)||0);
    if(!a) return;
    let xp = getXP() + a;
    let lvl = getLevel();
    let need = xpToNext(lvl);
    let leveled = false;

    while(xp >= need){
      xp -= need;
      lvl += 1;
      need = xpToNext(lvl);
      leveled = true;
    }
    localStorage.setItem(KEYS.xp, String(xp));
    localStorage.setItem(KEYS.lvl, String(lvl));
    bumpStat("xpEarned", a);
    if(reason) bumpStat("xpReason_"+reason, a);
    if(leveled) safeToast(`🏆 Seviye ${lvl}!`);
    renderXP();
    checkAchievements();
  }

  function renderXP(){
    const out = $$("#xpOut");
    if(!out) return;
    const lvl = getLevel();
    const xp = getXP();
    const need = xpToNext(lvl);
    out.innerHTML = `<div class="pill">Seviye <b>${lvl}</b></div> <div class="pill">XP <b>${xp}</b> / ${need}</div>`;
  }

  // ---------- MOOD ----------
  function loadMoodMap(){ return loadJSON(KEYS.mood, {}); }
  function saveMood(mood){
    const m = String(mood||"").trim();
    if(!m) return safeToast("Mod seç.");
    const map = loadMoodMap();
    map[nowISO()] = { mood: m, ts: Date.now() };
    saveJSON(KEYS.mood, map);
    bumpStat("moodSaved", 1);
    addXP(10, "mood");
    renderMood();
  }

  function moodStreak(map){
    const days = Object.keys(map).sort();
    if(!days.length) return 0;
    let streak=0;
    let d = new Date();
    for(;;){
      const k = nowISOFrom(d);
      if(map[k]){ streak++; d.setDate(d.getDate()-1); }
      else break;
    }
    return streak;
  }
  function nowISOFrom(d){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function renderMood(){
    const out = $$("#moodOut");
    const sel = $$("#moodSelect");
    if(!out) return;
    const map = loadMoodMap();
    const today = map[nowISO()];
    const streak = moodStreak(map);
    if(sel && today) sel.value = today.mood;
    out.textContent = today ? `Bugün: ${today.mood} • Seri: ${streak} gün` : `Henüz kaydetmedin. • Seri: ${streak} gün`;
  }

  // ---------- WEEKLY CHALLENGE ----------
  const CHALLENGES = [
    { id:"photo", text:"Bugün birlikte 1 fotoğraf çekip Anılar'a ekleyin." , xp:25 },
    { id:"note", text:"Anı Defteri'ne 3 cümle yazın." , xp:20 },
    { id:"compliment", text:"Birbirinize 2 içten iltifat yazın (Mini Sohbet'e)." , xp:18 },
    { id:"walk", text:"10 dakika yürüyüş + 5 dakika sohbet." , xp:22 },
    { id:"music", text:"Bir şarkı seçip 1 dakika dans." , xp:24 },
    { id:"plan", text:"Gelecek'e bir mini plan ekleyin." , xp:20 }
  ];

  function getWeekly(){
    const wk = isoWeekKey();
    const obj = loadJSON(KEYS.weekly, null);
    if(obj && obj.week === wk) return obj;
    return null;
  }

  function pickWeekly(force=false){
    const wk = isoWeekKey();
    if(!force){
      const cur = getWeekly();
      if(cur) return cur;
    }
    const chosen = CHALLENGES[Math.floor(Math.random()*CHALLENGES.length)];
    const obj = { week: wk, ...chosen, pickedAt: Date.now() };
    saveJSON(KEYS.weekly, obj);
    localStorage.removeItem(KEYS.weeklyDone);
    renderWeekly();
    return obj;
  }

  function weeklyDone(){
    const w = getWeekly() || pickWeekly(false);
    if(localStorage.getItem(KEYS.weeklyDone)==="1"){
      return safeToast("Bu hafta zaten tamamlandı.");
    }
    localStorage.setItem(KEYS.weeklyDone, "1");
    bumpStat("weeklyDone", 1);
    addXP(w.xp || 20, "weekly");
    safeToast("✅ Tamamlandı!");
    renderWeekly();
    checkAchievements();
  }

  function renderWeekly(){
    const out = $$("#weeklyOut");
    if(!out) return;
    const w = getWeekly() || pickWeekly(false);
    const done = localStorage.getItem(KEYS.weeklyDone)==="1";
    out.innerHTML = `
      <div class="pill">${w.week}</div>
      <div class="mt10">${escapeHTML2(w.text)}</div>
      <div class="tiny muted mt10">${done ? "Durum: ✅ tamamlandı" : "Durum: ⏳ bekliyor"} • Ödül: <b>+${w.xp}</b> XP</div>
    `;
  }

  // ---------- PRIVACY / FAKE ----------
  function setPrivacy(on){
    const v = !!on;
    document.body.classList.toggle("privacy-on", v);
    localStorage.setItem(KEYS.privacy, v ? "1":"0");
    const out = $$("#privacyOut");
    if(out) out.textContent = v ? "Gizli mod açık." : "Gizli mod kapalı.";
  }
  function togglePrivacy(){ setPrivacy(!(localStorage.getItem(KEYS.privacy)==="1")); }

  function setFake(on){
    const v = !!on;
    document.body.classList.toggle("fake-on", v);
    localStorage.setItem(KEYS.fake, v ? "1":"0");
    safeToast(v ? "Fake mod açık." : "Fake mod kapalı.");
  }
  function toggleFake(){ setFake(!(localStorage.getItem(KEYS.fake)==="1")); }

  // Panic shortcut: Ctrl+Shift+L
  window.addEventListener("keydown",(e)=>{
    if(e.ctrlKey && e.shiftKey && (e.key||"").toLowerCase()==="l"){
      e.preventDefault();
      togglePrivacy();
    }
  });

  // ---------- CAPSULES ----------
  function loadCapsules(){ return loadJSON(KEYS.capsules, []); }
  function saveCapsules(list){ saveJSON(KEYS.capsules, list); }

  function addCapsule(){
    const openAt = ($$("#capsuleOpenAt")?.value||"").trim();
    const title = ($$("#capsuleTitle")?.value||"").trim().slice(0,60);
    const text = ($$("#capsuleText")?.value||"").trim().slice(0,2000);
    if(!openAt){ return safeToast("Açılma tarihi seç."); }
    if(!text){ return safeToast("Mesaj yaz."); }
    const c = { id: safeUUID2(), openAt, title, text, createdAt: Date.now() };
    const list = loadCapsules();
    list.unshift(c);
    saveCapsules(list);
    bumpStat("capsuleAdded", 1);
    addXP(25, "capsule");
    clearCapsuleForm();
    renderCapsules();
    checkAchievements();
  }

  function clearCapsuleForm(){
    if($$("#capsuleOpenAt")) $$("#capsuleOpenAt").value="";
    if($$("#capsuleTitle")) $$("#capsuleTitle").value="";
    if($$("#capsuleText")) $$("#capsuleText").value="";
  }

  function canOpenCapsule(c){
    const now = nowISO();
    return String(c.openAt) <= now;
  }

  function renderCapsules(){
    const wrap = $$("#capsuleList");
    if(!wrap) return;
    const list = loadCapsules();
    if(!list.length){
      wrap.innerHTML = `<div class="tiny muted">Henüz kapsül yok.</div>`;
      return;
    }
    const now = nowISO();
    wrap.innerHTML = `<div class="list">` + list.slice(0,50).map(c=>{
      const openable = canOpenCapsule(c);
      const status = openable ? "Açılabilir" : `Kilitli (${c.openAt})`;
      return `
        <div class="list-item">
          <div class="row">
            <div>
              <div><b>${escapeHTML2(c.title || "Kapsül")}</b></div>
              <div class="tiny muted">Açılma: ${escapeHTML2(c.openAt)} • ${status}</div>
            </div>
            <div class="row" style="justify-content:flex-end;">
              <button class="ghost mini" data-open="${c.id}" ${openable?"":"disabled"} type="button">Aç</button>
              <button class="danger mini" data-del="${c.id}" type="button">Sil</button>
            </div>
          </div>
        </div>
      `;
    }).join("") + `</div>`;

    wrap.querySelectorAll("[data-open]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-open");
        const c = loadCapsules().find(x=>x.id===id);
        if(!c) return;
        if(!canOpenCapsule(c)) return safeToast("Henüz açılmaz.");
        openSuiteModal("⏳ Zaman Kapsülü", `<div class="tiny muted">${escapeHTML2(c.openAt)}</div><p class="mt12" style="white-space:pre-wrap;">${escapeHTML2(c.text)}</p>`);
        bumpStat("capsuleOpened", 1);
        addXP(10, "capsule_open");
        checkAchievements();
      });
    });
    wrap.querySelectorAll("[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-del");
        const list2 = loadCapsules().filter(x=>x.id!==id);
        saveCapsules(list2);
        renderCapsules();
        safeToast("Silindi.");
      });
    });
  }

  // ---------- VOICE NOTES ----------
  let rec=null, chunks=[], recStart=0, recTimer=null;

  function loadVoices(){ return loadJSON(KEYS.voice, []); }
  function saveVoices(list){ saveJSON(KEYS.voice, list); }

  function renderVoices(){
    const wrap = $$("#voiceList");
    if(!wrap) return;
    const list = loadVoices();
    if(!list.length){
      wrap.innerHTML = `<div class="tiny muted">Henüz sesli not yok.</div>`;
      return;
    }
    wrap.innerHTML = `<div class="list">` + list.slice(0,12).map(v=>{
      return `
        <div class="list-item">
          <div class="row">
            <div>
              <div><b>Sesli Not</b></div>
              <div class="tiny muted">${new Date(v.ts).toLocaleString("tr-TR")} • ${Math.round((v.dur||0)/1000)} sn</div>
            </div>
            <div class="row" style="justify-content:flex-end;">
              <button class="ghost mini" data-play="${v.id}" type="button">Oynat</button>
              <button class="danger mini" data-del="${v.id}" type="button">Sil</button>
            </div>
          </div>
          <audio id="aud_${v.id}" controls style="width:100%; margin-top:10px;" hidden></audio>
        </div>
      `;
    }).join("") + `</div>`;

    wrap.querySelectorAll("[data-play]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-play");
        const list = loadVoices();
        const v = list.find(x=>x.id===id);
        if(!v) return;
        const aud = $$("#aud_"+id);
        if(!aud) return;
        aud.hidden = false;
        aud.src = v.dataUrl;
        aud.play().catch(()=>{});
        bumpStat("voicePlayed", 1);
        addXP(3, "voice_play");
      });
    });
    wrap.querySelectorAll("[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-del");
        const list2 = loadVoices().filter(x=>x.id!==id);
        saveVoices(list2);
        renderVoices();
        safeToast("Silindi.");
      });
    });
  }

  async function startRec(){
    if(rec) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      return safeToast("Mikrofon desteklenmiyor.");
    }
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream);
      rec = mr;
      chunks = [];
      recStart = Date.now();
      const state = $$("#voiceState");
      if(state) state.textContent = "Kayıt alınıyor...";
      const b1 = $$("#voiceRecBtn"), b2 = $$("#voiceStopBtn");
      if(b1) b1.disabled = true;
      if(b2) b2.disabled = false;

      mr.ondataavailable = (e)=>{ if(e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = async ()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const dur = Date.now()-recStart;
        const dataUrl = await blobToDataURL(blob);
        const list = loadVoices();
        list.unshift({ id: safeUUID2(), ts: Date.now(), dur, dataUrl });
        saveVoices(list.slice(0,12));
        bumpStat("voiceRecorded", 1);
        addXP(15, "voice");
        renderVoices();
        checkAchievements();
        rec = null;
        chunks = [];
        if(state) state.textContent = "Kaydedildi.";
        const b1 = $$("#voiceRecBtn"), b2 = $$("#voiceStopBtn");
        if(b1) b1.disabled = false;
        if(b2) b2.disabled = true;
      };

      mr.start();
      // auto-stop at 60s
      recTimer = setTimeout(()=>stopRec(), 60000);
    }catch{
      safeToast("Mikrofon izni yok.");
    }
  }

  function stopRec(){
    if(!rec) return;
    try{ rec.stop(); }catch{}
    if(recTimer){ clearTimeout(recTimer); recTimer=null; }
  }

  function blobToDataURL(blob){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload = ()=>res(String(r.result||""));
      r.onerror = ()=>rej(r.error||new Error("okunamadı"));
      r.readAsDataURL(blob);
    });
  }

  // ---------- ACHIEVEMENTS ----------
  const ACH = [
    { id:"firstMood", name:"İlk Mod", desc:"İlk kez mod kaydet.", test:()=>Object.keys(loadMoodMap()).length>=1 },
    { id:"streak3", name:"3 Gün Seri", desc:"3 gün üst üste mod kaydet.", test:()=>moodStreak(loadMoodMap())>=3 },
    { id:"capsule1", name:"Kapsülcü", desc:"1 kapsül oluştur.", test:()=>loadCapsules().length>=1 },
    { id:"capsuleOpen", name:"Zamanı Geldi", desc:"Bir kapsül aç.", test:()=>getStat("capsuleOpened")>=1 },
    { id:"voice1", name:"Sesli Selam", desc:"1 sesli not kaydet.", test:()=>getStat("voiceRecorded")>=1 },
    { id:"weekly1", name:"Disiplin", desc:"Haftalık görevi 1 kez bitir.", test:()=>getStat("weeklyDone")>=1 },
    { id:"lvl5", name:"Seviye 5", desc:"Seviye 5’e ulaş.", test:()=>getLevel()>=5 },
    { id:"xp500", name:"500 XP", desc:"Toplam 500 XP kazan.", test:()=>getStat("xpEarned")>=500 }
  ];

  function loadAch(){ return loadJSON(KEYS.achievements, {}); }
  function saveAch(obj){ saveJSON(KEYS.achievements, obj); }

  function checkAchievements(){
    const a = loadAch();
    let changed=false;
    ACH.forEach(x=>{
      if(a[x.id]) return;
      let ok=false;
      try{ ok = !!x.test(); }catch{ ok=false; }
      if(ok){
        a[x.id] = { ts: Date.now(), name:x.name };
        changed=true;
        safeToast(`🏅 Rozet: ${x.name}`);
        addXP(12, "badge");
      }
    });
    if(changed) saveAch(a);
  }

  function openAchievements(){
    checkAchievements();
    const a = loadAch();
    const rows = ACH.map(x=>{
      const got = !!a[x.id];
      const when = got ? new Date(a[x.id].ts).toLocaleDateString("tr-TR") : "";
      return `
        <div class="list-item">
          <div class="row">
            <div>
              <div><b>${got?"🏅":"🔒"} ${escapeHTML2(x.name)}</b></div>
              <div class="tiny muted">${escapeHTML2(x.desc)} ${got?("• "+when):""}</div>
            </div>
            <span class="pill">${got?"Açıldı":"Kilitli"}</span>
          </div>
        </div>
      `;
    }).join("");
    openSuiteModal("🏆 Rozetler", `<div class="list">${rows}</div>`);
  }

  // ---------- STATS ----------
  function bumpStat(k, n){
    const obj = loadJSON(KEYS.stats, {});
    obj[k] = (Number(obj[k]||0)||0) + (Number(n||0)||0);
    saveJSON(KEYS.stats, obj);
  }
  function getStat(k){
    const obj = loadJSON(KEYS.stats, {});
    return Number(obj[k]||0)||0;
  }
  function openStats(){
    const obj = loadJSON(KEYS.stats, {});
    const items = Object.keys(obj).sort().map(k=>{
      return `<div class="list-item"><div class="row"><b>${escapeHTML2(k)}</b><span class="pill">${obj[k]}</span></div></div>`;
    }).join("") || `<div class="tiny muted">Henüz istatistik yok.</div>`;
    openSuiteModal("📊 İstatistik", `<div class="list">${items}</div>`);
  }

  // ---------- MODAL ----------
  function openSuiteModal(title, html){
    const m = $$("#suiteModal");
    if(!m) return;
    $$("#suiteModalTitle").textContent = title || "";
    $$("#suiteModalBody").innerHTML = html || "";
    m.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSuiteModal(){
    const m = $$("#suiteModal");
    if(!m) return;
    m.hidden = true;
    $$("#suiteModalBody").innerHTML = "";
    document.body.style.overflow = "";
  }

  // ---------- ENCRYPTED EXPORT/IMPORT ----------
  function collectAllData(){
    const keys = Object.keys(localStorage);
    const data = {};
    keys.forEach(k=>{
      if(k.startsWith("mm_")) data[k] = localStorage.getItem(k);
    });
    data.__meta = { exportedAt: Date.now(), v: 1 };
    return data;
  }

  function downloadFile(name, content, mime){
    const blob = new Blob([content], { type: mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportPlain(){
    const data = collectAllData();
    downloadFile("mm_backup.json", JSON.stringify(data, null, 2), "application/json");
    safeToast("JSON yedek indirildi.");
  }

  function hasCrypto(){
    return !!(window.crypto && crypto.subtle && typeof crypto.subtle.importKey==="function");
  }

  async function deriveKey(pass, salt){
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations: 120000, hash:"SHA-256" },
      baseKey,
      { name:"AES-GCM", length: 256 },
      false,
      ["encrypt","decrypt"]
    );
  }

  function b64(buf){
    const bytes = new Uint8Array(buf);
    let s="";
    for(let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(s){
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function exportEncrypted(){
    if(!hasCrypto()) return safeToast("Şifreli yedek için WebCrypto yok.");
    const pass = prompt("Yedek şifresi (unutma):");
    if(!pass) return;
    const data = collectAllData();
    const plain = new TextEncoder().encode(JSON.stringify(data));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt);
    const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, plain);
    const pack = {
      t:"mmenc",
      v:1,
      salt: b64(salt.buffer),
      iv: b64(iv.buffer),
      ct: b64(ct)
    };
    downloadFile("mm_backup.mmenc", JSON.stringify(pack), "application/json");
    safeToast("Şifreli yedek indirildi.");
  }

  async function importAny(file){
    if(!file) return;
    const txt = await readFile(file);
    let obj=null;
    try{ obj=JSON.parse(txt); }catch{ obj=null; }
    if(!obj) return safeToast("Dosya bozuk.");
    if(obj.t==="mmenc"){
      if(!hasCrypto()) return safeToast("WebCrypto yok. Şifreli dosya açılamaz.");
      const pass = prompt("Yedek şifresi:");
      if(!pass) return;
      try{
        const salt = new Uint8Array(unb64(obj.salt));
        const iv = new Uint8Array(unb64(obj.iv));
        const ct = unb64(obj.ct);
        const key = await deriveKey(pass, salt);
        const plainBuf = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct);
        const data = JSON.parse(new TextDecoder().decode(plainBuf));
        restoreAllData(data);
        safeToast("Yedek yüklendi.");
        location.reload();
      }catch{
        safeToast("Şifre yanlış veya dosya bozuk.");
      }
      return;
    }
    // plain
    restoreAllData(obj);
    safeToast("Yedek yüklendi.");
    location.reload();
  }

  function restoreAllData(data){
    if(!data || typeof data!=="object") throw new Error("bad");
    Object.keys(data).forEach(k=>{
      if(k==="__meta") return;
      if(!String(k).startsWith("mm_")) return;
      const v = data[k];
      if(typeof v === "string") localStorage.setItem(k, v);
    });
  }

  function readFile(file){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload = ()=>res(String(r.result||""));
      r.onerror = ()=>rej(r.error||new Error("readfail"));
      r.readAsText(file);
    });
  }

  // ---------- HELPERS (local) ----------
  function safeUUID2(){
    if(window.crypto && typeof crypto.randomUUID==="function") return crypto.randomUUID();
    return "id_"+Date.now()+"_"+Math.random().toString(16).slice(2);
  }
  function safeToast(msg){
    // reuse existing toast if available
    try{ if(typeof toast==="function") toast(msg); else alert(msg); }catch{ alert(msg); }
  }
  function escapeHTML2(str){
    return String(str||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // ---------- HOOK EXISTING BUTTONS FOR XP ----------
  function hookXP(){
    // memory add
    const addMem = $$("#addMemoryBtn");
    if(addMem && !addMem.dataset.xpHook){
      addMem.dataset.xpHook="1";
      addMem.addEventListener("click", ()=>addXP(12, "memory"));
    }
    // diary add (try multiple ids)
    ["#addDiaryBtn","#saveDiaryBtn","#addFutureBtn","#saveFutureBtn","#sendChatBtn","#addSpecialBtn"].forEach(sel=>{
      const el = $$(sel);
      if(el && !el.dataset.xpHook){
        el.dataset.xpHook="1";
        el.addEventListener("click", ()=>addXP(8, "action"));
      }
    });
  }

  // ---------- WIPE ----------
  function wipeAll(){
    const ok = confirm("HER ŞEY silinecek. Emin misin?");
    if(!ok) return;
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith("mm_")) localStorage.removeItem(k);
    });
    safeToast("Sıfırlandı.");
    location.reload();
  }

  // ---------- INIT ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    // modal close
    const cbtn = $$("#suiteModalCloseBtn");
    if(cbtn) cbtn.addEventListener("click", closeSuiteModal);

    // apply persisted privacy/fake
    setPrivacy(localStorage.getItem(KEYS.privacy)==="1");
    setFake(localStorage.getItem(KEYS.fake)==="1");

    // mood
    const mbtn = $$("#moodSaveBtn");
    if(mbtn) mbtn.addEventListener("click", ()=>saveMood($$("#moodSelect")?.value||""));

    // weekly
    const wDone = $$("#weeklyDoneBtn");
    if(wDone) wDone.addEventListener("click", weeklyDone);
    const wNew = $$("#weeklyNewBtn");
    if(wNew) wNew.addEventListener("click", ()=>pickWeekly(true));

    // privacy buttons
    const pbtn = $$("#privacyToggleBtn");
    if(pbtn) pbtn.addEventListener("click", togglePrivacy);
    const fbtn = $$("#fakeToggleBtn");
    if(fbtn) fbtn.addEventListener("click", toggleFake);

    // achievements / stats
    const abtn = $$("#achievementsBtn");
    if(abtn) abtn.addEventListener("click", openAchievements);
    const sbtn = $$("#statsBtn");
    if(sbtn) sbtn.addEventListener("click", openStats);

    // capsules
    const cAdd = $$("#capsuleAddBtn");
    if(cAdd) cAdd.addEventListener("click", addCapsule);
    const cClr = $$("#capsuleClearBtn");
    if(cClr) cClr.addEventListener("click", ()=>{ clearCapsuleForm(); safeToast("Temizlendi."); });

    // voice
    const vr = $$("#voiceRecBtn");
    const vs = $$("#voiceStopBtn");
    if(vr) vr.addEventListener("click", startRec);
    if(vs) vs.addEventListener("click", stopRec);

    // export/import/wipe
    const exE = $$("#exportEncBtn");
    if(exE) exE.addEventListener("click", exportEncrypted);
    const exP = $$("#exportPlainBtn");
    if(exP) exP.addEventListener("click", exportPlain);
    const imp = $$("#importFile");
    if(imp) imp.addEventListener("change", (e)=>importAny(e.target.files && e.target.files[0]));
    const wipe = $$("#wipeAllBtn");
    if(wipe) wipe.addEventListener("click", wipeAll);

    // renderers
    renderXP();
    renderMood();
    renderWeekly();
    renderCapsules();
    renderVoices();
    hookXP();
    checkAchievements();

    // re-hook periodically (in case UI renders later)
    setInterval(hookXP, 2000);
  });
})();