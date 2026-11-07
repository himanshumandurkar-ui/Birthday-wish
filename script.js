// Friendly birthday gate, not secure authentication: the date is readable in data.json.
const DEFAULTS = {
  "name": "Vedika",
  "birthday": "2026-11-11",
  "accent": "#bd6687",
  "heroEyebrow": "11 NOVEMBER · YOUR SPECIAL DAY",
  "heroTitle": "Happy Birthday,",
  "heroLine": "A little page for a friend who makes ordinary moments feel special.",
  "introA": "Some friendships happen",
  "introB": "when you least expect them.",
  "introText": "We haven't known each other for ages, but somehow we've already collected moments worth keeping. So here's a small collection of them — just for you.",
  "bubbleTitle": "Our Bubble Memories",
  "bubbleSub": "Pop a bubble to open a photo. The big letter bubble has something just for you.",
  "footerTitle": "Keep smiling, birthday girl!",
  "footerText": "Here's to more laughs, more memories and many more good days.",
  "footerStrong": "Happy Birthday, Vedika! 🎂",
  "footerSmall": "Made with friendship by Himanshu · 11.11.2026",
  "showLetterBubble": true,
  "letter": "Dear Vedika,\n\nSome people don't need to do anything special to make the atmosphere better. They just show up, bring their own energy, and make an ordinary day feel lighter. Honestly, you're one of those people.\n\nTujhi ek goshta mala khup avadte — tu hamesha happy rahates ani lok kay mhantil yacha jast vichar karat nahis. Tujha carefree attitude tula vegla banavto. ❤️\n\nEven though we haven't known each other for a very long time, I'm genuinely glad that we became friends. Our random talks, funny moments and little memories have made this friendship special.\n\nI hope you keep smiling, achieve everything you're working towards, and never lose that positive energy. And remember, you don't have to be happy every single moment. You deserve care and happiness too.\n\nStay happy, stay crazy, and keep being YOU.\n\n— Himanshu ♡",
  "photos": [
    {
      "src": "assets/college-selfie.jpg",
      "caption": "Good friends, good memories ♡"
    },
    {
      "src": "assets/rockside-memory-1.png",
      "caption": "A day to remember"
    },
    {
      "src": "assets/rockside-memory-2.png",
      "caption": "Random talks, happy moments"
    },
    {
      "src": "assets/sunglasses-memory.png",
      "caption": "Bestie vibes 😎"
    },
    {
      "src": "assets/purple-fun-memory.jpg",
      "caption": "Your carefree side 😂"
    },
    {
      "src": "assets/park-memory.jpg",
      "caption": "Always keep this smile ♡"
    }
  ]
};
let DATA = DEFAULTS;
const $ = id => document.getElementById(id);
const gate = $("gate"), site = $("site"), error = $("error"), dateInput = $("birthday");

function applyData() {
  const d = DATA;
  document.title = "A Little Surprise for " + d.name + " 💗";
  document.documentElement.style.setProperty("--accent", d.accent || "#bd6687");
  const t = (id, v) => { const e = $(id); if (e) e.textContent = v || ""; };
  t("gate-title", "Hey, " + d.name + "!"); t("brand-name", d.name);
  t("hero-eyebrow", d.heroEyebrow); t("hero-title", d.heroTitle); t("hero-name", d.name + "!"); t("hero-line", d.heroLine);
  t("intro-a", d.introA); t("intro-b", d.introB); t("intro-text", d.introText);
  t("mem-title", d.bubbleTitle); t("mem-sub", d.bubbleSub);
  t("footer-title", d.footerTitle); t("footer-text", d.footerText); t("footer-strong", d.footerStrong); t("footer-small", d.footerSmall);
  items = [];
  if (d.showLetterBubble !== false) items.push({ type: "letter" });
  (d.photos || []).forEach(p => items.push({ type: "photo", src: p.src, caption: p.caption }));
  render();
}

$("unlock-form").addEventListener("submit", e => {
  e.preventDefault();
  if (dateInput.value === DATA.birthday) {
    gate.classList.add("hidden"); site.classList.remove("hidden");
    document.body.classList.add("unlocked"); showPage(0);
  } else {
    error.textContent = "Hmm, that's not the right date. Try again, birthday girl! 💗";
    dateInput.focus();
  }
});

/* ===== Pages (Next / Back buttons) ===== */
const pages = [...document.querySelectorAll(".page")];
let pageIdx = 0;
function showPage(n) {
  pageIdx = Math.max(0, Math.min(pages.length - 1, n));
  pages.forEach((p, i) => p.classList.toggle("active", i === pageIdx));
  pages[pageIdx].scrollTop = 0;
  if (pageIdx === 2) startSim(); else stopSim();
}
document.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", () => showPage(pageIdx + 1)));
document.querySelectorAll("[data-prev]").forEach(b => b.addEventListener("click", () => showPage(pageIdx - 1)));
document.querySelectorAll("[data-first]").forEach(b => b.addEventListener("click", () => showPage(0)));

/* ===== Floating bubble memories ===== */
const field = $("bubble-field"), modal = $("modal"), modalBody = $("modal-body");
const reduce = false; // bubbles always move
let items = [], sim = [], raf = 0, last = 0, W = 0, H = 0;

function render() {
  field.innerHTML = ""; sim = [];
  items.forEach(it => {
    const el = makeBubble(it); field.appendChild(el);
    sim.push({ el, it, d: 0, x: 0, y: 0, vx: 0, vy: 0, alive: true, placed: false });
  });
  if (pageIdx === 2) startSim();
}

function makeBubble(it) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "bubble" + (it.type === "letter" ? " letter" : "");
  b.setAttribute("aria-label", it.type === "letter" ? "Pop the letter bubble" : "Pop a memory bubble");
  const o = document.createElement("span"); o.className = "orb";
  o.textContent = it.type === "letter" ? "✉ Letter" : "Happy\nBirthday ♡";
  b.appendChild(o);
  b.addEventListener("click", () => pop(b, it));
  return b;
}

function measure() { const r = field.getBoundingClientRect(); W = r.width; H = r.height; }

function layout() {
  const n = sim.length; if (!n) return;
  const hasL = sim.some(s => s.it.type === "letter");
  const units = n + (hasL ? 0.82 : 0);
  const base = Math.max(56, Math.min(150, Math.sqrt((4 * W * H * 0.34) / (Math.PI * units))));
  sim.forEach(s => {
    s.d = s.it.type === "letter" ? Math.min(base * 1.35, 190) : base * (0.85 + Math.random() * 0.3);
    s.el.style.width = s.el.style.height = s.d + "px";
    if (s.it.type !== "letter") s.el.firstChild.style.fontSize = Math.max(11, s.d * 0.16) + "px";
  });
  sim.forEach((s, k) => {
    for (let t = 0; t < 80; t++) {
      s.x = Math.random() * Math.max(1, W - s.d); s.y = Math.random() * Math.max(1, H - s.d);
      if (!sim.slice(0, k).some(o => Math.hypot(o.x - s.x, o.y - s.y) < (o.d + s.d) / 2 + 4)) break;
    }
    const a = Math.random() * 6.283, sp = 22 + Math.random() * 18;
    s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.placed = true;
  });
}

function draw() { sim.forEach(s => { s.el.style.transform = `translate3d(${s.x}px,${s.y}px,0)`; }); }

function tick(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  const live = sim.filter(s => s.alive);
  live.forEach(s => {
    let sp = Math.hypot(s.vx, s.vy) || 20, a = Math.atan2(s.vy, s.vx) + (Math.random() - 0.5) * 2.2 * dt;
    sp = Math.max(18, Math.min(44, sp + (Math.random() - 0.5) * 24 * dt));
    s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); } else if (s.x > W - s.d) { s.x = W - s.d; s.vx = -Math.abs(s.vx); }
    if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); } else if (s.y > H - s.d) { s.y = H - s.d; s.vy = -Math.abs(s.vy); }
  });
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const p = live[i], q = live[j];
    const dx = (q.x + q.d / 2) - (p.x + p.d / 2), dy = (q.y + q.d / 2) - (p.y + p.d / 2);
    const dist = Math.hypot(dx, dy) || 0.01, min = (p.d + q.d) / 2;
    if (dist < min) {
      const nx = dx / dist, ny = dy / dist, push = (min - dist) / 2;
      p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
      const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
      if (rel < 0) { p.vx += rel * nx; p.vy += rel * ny; q.vx -= rel * nx; q.vy -= rel * ny; }
    }
  }
  draw();
  raf = requestAnimationFrame(tick);
}

function startSim() {
  stopSim(); measure(); if (W < 50 || H < 50) return;
  if (!sim.some(s => s.placed)) layout();
  sim.forEach(s => { s.x = Math.min(s.x, Math.max(0, W - s.d)); s.y = Math.min(s.y, Math.max(0, H - s.d)); });
  draw();
  if (!reduce) { last = performance.now(); raf = requestAnimationFrame(tick); }
}
function stopSim() { cancelAnimationFrame(raf); raf = 0; }
window.addEventListener("resize", () => { if (pageIdx === 2 && modal.classList.contains("hidden")) startSim(); });

function pop(b, it) {
  const s = sim.find(x => x.el === b); if (s) s.alive = false;
  const r = b.getBoundingClientRect();
  if (!reduce) burst(r.left + r.width / 2, r.top + r.height / 2);
  b.classList.add("popped");
  setTimeout(() => { b.style.visibility = "hidden"; openModal(it); }, reduce ? 0 : 260);
}

function burst(x, y) {
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("span");
    p.className = "spark"; p.textContent = i % 2 ? "♡" : "✦";
    p.style.left = x + "px"; p.style.top = y + "px";
    document.body.appendChild(p);
    const a = (Math.PI * 2 * i) / 12, d = 50 + Math.random() * 50;
    p.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.4)`, opacity: 0 }],
      { duration: 700, easing: "ease-out" }).onfinish = () => p.remove();
  }
}

function openModal(it) {
  stopSim(); modalBody.innerHTML = "";
  if (it.type === "photo") {
    const fig = document.createElement("figure"); fig.className = "modal-photo";
    const img = document.createElement("img"); img.src = it.src; img.alt = it.caption || "Memory";
    const cap = document.createElement("figcaption"); cap.id = "modal-title"; cap.textContent = it.caption || "A memory ♡";
    fig.append(img, cap); modalBody.appendChild(fig);
  } else {
    const wrap = document.createElement("div"); wrap.className = "letter-view";
    const top = document.createElement("div"); top.className = "letter-top"; top.id = "modal-title"; top.textContent = "✉  A LETTER FOR YOU";
    wrap.appendChild(top);
    (DATA.letter || "").split(/\n\s*\n/).forEach(par => {
      const p = document.createElement("p"); p.textContent = par.trim(); p.style.whiteSpace = "pre-line"; wrap.appendChild(p);
    });
    modalBody.appendChild(wrap);
  }
  modal.classList.remove("hidden"); document.body.classList.add("no-scroll"); $("modal-close").focus();
}

function closeModal() {
  modal.classList.add("hidden"); document.body.classList.remove("no-scroll");
  if (pageIdx === 2) startSim();
}
$("modal-close").onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) { closeModal(); return; }
  if (site.classList.contains("hidden") || !modal.classList.contains("hidden")) return;
  if (e.key === "ArrowRight") showPage(pageIdx + 1); if (e.key === "ArrowLeft") showPage(pageIdx - 1);
});
$("reset-bubbles").onclick = render;

applyData();
const qs = new URLSearchParams(location.search).get("for");
const slug = /^[a-z0-9-]{1,40}$/.test(qs || "") ? qs : null;
fetch("profiles/index.json?v=" + Date.now()).then(r => r.ok ? r.json() : {}).catch(() => ({}))
  .then(ix => fetch("profiles/" + (slug || ix.default || "vedika") + ".json?v=" + Date.now()))
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(j => { DATA = Object.assign({}, DEFAULTS, j); applyData(); }).catch(() => {});
