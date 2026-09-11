/* =========================================================
   site.js — 站点公共能力：主题、导航、页脚、全局搜索、访问闸门
   所有页面共用。必须最先加载（在 stats.js 之后）。
   ========================================================= */
(function () {
  "use strict";

  /* =======================================================
     一、配置区（老师可直接改这里）
     ======================================================= */
  window.APP = {
    /* 访问口令设置 -----------------------------------------
       本站是纯静态站点，口令校验在浏览器端完成。
       它只能挡住「随手点进来的人」，不能阻止懂技术的人查看源码。
       若要真正的账号安全，请升级为后端校验
       （about.html 附有 PHP / Node / JSP 三种后端实现说明）。
       enabled: false 可完全关闭访问闸门。
    ------------------------------------------------------ */
    auth: {
      enabled: true,
      password: "HLXYNB",
      rememberDays: 30
    },
    theme: {
      defaultTheme: "dark"    // "dark" | "light"
    },
    site: {
      brand: "新闻传播统计学",
      sub: "教学互动平台",
      logo: "统"
    }
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  /* =======================================================
     二、主题
     ======================================================= */
  const THEME_KEY = "xwcb.theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { }
    $$("[data-theme-toggle]").forEach(b => {
      b.setAttribute("aria-label", t === "dark" ? "切换到浅色主题" : "切换到深色主题");
      b.innerHTML = t === "dark" ? iconSun() : iconMoon();
      b.title = t === "dark" ? "浅色主题" : "深色主题";
    });
  }
  function initTheme() {
    let t = APP.theme.defaultTheme;
    try { t = localStorage.getItem(THEME_KEY) || t; } catch (e) { }
    applyTheme(t);
  }
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }
  function iconSun() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  }
  function iconMoon() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  }

  /* =======================================================
     三、访问闸门
     ======================================================= */
  const AUTH_KEY = "xwcb.auth";

  /* 本地存储可用性探测 -------------------------------------
     某些环境（Safari 隐私模式、被禁用的存储、iframe 里的第三方
     存储限制）会让 localStorage 直接抛异常。若不探测，就会出现
     「登录 → 记不住 → 跳回登录页」的死循环，因此这里降级为
     「本次会话不做口令校验」，而不是把用户卡在门外。
  --------------------------------------------------------- */
  const CAN_STORE = (function () {
    try {
      const k = "__xwcb_probe__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function isAuthed() {
    if (!APP.auth.enabled || !CAN_STORE) return true;
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return false;
      const o = JSON.parse(raw);
      return o && o.ok === true && (!o.exp || Date.now() < o.exp);
    } catch (e) { return false; }
  }
  function setAuthed(remember) {
    if (!CAN_STORE) return;
    const days = APP.auth.rememberDays || 30;
    const exp = remember ? Date.now() + days * 864e5 : null;
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ ok: true, exp })); } catch (e) { }
  }
  function clearAuth() { try { localStorage.removeItem(AUTH_KEY); } catch (e) { } }

  const PAGE = (location.pathname.split(/[\\/]/).pop() || "index.html").toLowerCase();

  /* 遮罩式访问闸门（不依赖页面跳转）-----------------------------
     早期实现是「未登录 → 跳 login.html」，但在预览 iframe / 沙箱环境里
     导航可能被拦截，导致输入口令后「进不去」。改为在当前页面覆盖一层
     全屏遮罩：验证通过即移除遮罩并继续初始化，任何环境都能用。
  ------------------------------------------------------------ */
  let gateEl = null;

  function showGate() {
    if (gateEl) return;
    gateEl = document.createElement("div");
    gateEl.className = "gate-ov";
    gateEl.setAttribute("role", "dialog");
    gateEl.setAttribute("aria-modal", "true");
    gateEl.setAttribute("aria-label", "访问验证");
    gateEl.innerHTML =
      '<div class="gate"><div class="gate-box">' +
      '<div class="logo-lg">' + esc(APP.site.logo) + "</div>" +
      "<h1>" + esc(APP.site.brand) + "</h1>" +
      '<p class="sub">' + esc(APP.site.sub) + " · 输入访问口令后进入<br>" +
      '<span class="faint fs12">口令由任课老师提供</span></p>' +
      '<form autocomplete="off" novalidate>' +
      '<div class="fld-row"><label class="fld" for="gatePw">访问口令</label>' +
      '<input type="password" id="gatePw" placeholder="请输入口令" autocomplete="current-password" spellcheck="false"></div>' +
      '<div class="fld-row"><label class="switch"><input type="checkbox" id="gateRm" checked>' +
      "<span>记住我 " + (APP.auth.rememberDays || 30) + " 天（本机免重复输入）</span></label></div>" +
      '<div class="err" role="alert" hidden></div>' +
      '<button type="submit" class="btn primary block">进入平台</button>' +
      "</form>" +
      '<div class="ft">本站为课程配套教学资源，内容为原创编写的讲解、案例、数据与互动模型。<br>' +
      "如忘记口令，请向任课老师索取。</div>" +
      "</div></div>";
    document.body.appendChild(gateEl);
    document.body.style.overflow = "hidden";

    const form = $("form", gateEl), pw = $("#gatePw", gateEl),
      err = $(".err", gateEl), rm = $("#gateRm", gateEl);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const v = String(pw.value || "").trim();
      if (!v) { err.hidden = false; err.textContent = "请输入访问口令。"; pw.focus(); return; }
      if (!APP.auth.enabled || v === APP.auth.password) {
        setAuthed(rm.checked);
        hideGate();
        startUI();
      } else {
        err.hidden = false;
        err.textContent = "口令不正确，请检查后重试。";
        pw.select();
      }
    });
    pw.addEventListener("input", function () { if (!err.hidden) err.hidden = true; });
    setTimeout(function () { pw.focus(); }, 40);
  }

  function hideGate() {
    if (!gateEl) return;
    gateEl.remove();
    gateEl = null;
    document.body.style.overflow = "";
    try { window.scrollTo({ top: 0 }); } catch (e) { }
  }

  /* =======================================================
     四、导航
     ======================================================= */
  const NAV = [
    { u: "index.html", t: "首页" },
    { u: "map.html", t: "知识地图" },
    { u: "chapters.html", t: "课程详解" },
    { u: "lab.html", t: "互动实验室" },
    { u: "cases.html", t: "案例库" },
    { u: "data.html", t: "数据与模型" },
    { u: "quiz.html", t: "自测" },
    { u: "glossary.html", t: "术语表" }
  ];

  function renderTopbar() {
    const host = $("[data-topbar]");
    if (!host) return;
    const cur = PAGE;
    host.className = "topbar";
    host.innerHTML =
      '<div class="wrap">' +
      '<a class="brand" href="index.html">' +
      '<span class="logo">' + esc(APP.site.logo) + "</span>" +
      '<span class="tt"><b>' + esc(APP.site.brand) + "</b><i>" + esc(APP.site.sub) + "</i></span>" +
      "</a>" +
      '<nav class="nav">' + NAV.map(n =>
        '<a href="' + n.u + '"' + (n.u === cur ? ' class="active"' : "") + ">" + n.t + "</a>"
      ).join("") + "</nav>" +
      '<div class="tools">' +
      '<button class="search-btn" data-open-search title="全局搜索 (Ctrl+K)">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>' +
      '<span class="tx">搜索</span><kbd>Ctrl K</kbd></button>' +
      '<button class="icon-btn" data-theme-toggle></button>' +
      (APP.auth.enabled
        ? '<button class="icon-btn" data-logout title="退出登录">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg></button>' : "") +
      "</div></div>";
  }

  function renderFooter() {
    const host = $("[data-footer]");
    if (!host) return;
    const parts = (window.PARTS || []).map(p =>
      '<a href="map.html#part' + p.id + '">' + esc(p.name) + "</a>").join("");
    host.className = "footer";
    host.innerHTML =
      '<div class="wrap">' +
      '<div class="cols">' +
      "<div><h4>课程内容</h4>" + parts + "</div>" +
      "<div><h4>互动学习</h4>" +
      '<a href="lab.html">互动实验室</a><a href="cases.html">案例库</a>' +
      '<a href="data.html">数据与模型</a><a href="quiz.html">自测练习</a></div>' +
      "<div><h4>常用工具</h4>" +
      '<a href="glossary.html">术语速查</a><a href="lab.html?m=data-lab">数据工作台</a>' +
      '<a href="lab.html?m=power">样本量计算器</a><a href="chapters.html">课程详解</a></div>' +
      "<div><h4>关于</h4>" +
      '<a href="about.html">使用说明</a><a href="about.html#backend">部署与防护</a>' +
      '<a href="about.html#credits">内容说明</a></div>' +
      "</div>" +
      '<div class="btm">' +
      "<span>" + esc(window.SITE ? window.SITE.author : "") + "</span>" +
      '<span class="spacer"></span>' +
      "<span>v" + (window.SITE ? window.SITE.version : "1.0") + " · 教学用途</span>" +
      "</div></div>";
  }

  /* =======================================================
     五、全局搜索
     ======================================================= */
  let SEARCH_INDEX = null;
  function getIndex() {
    if (!SEARCH_INDEX) SEARCH_INDEX = window.buildSearchIndex ? window.buildSearchIndex() : [];
    return SEARCH_INDEX;
  }

  function highlight(text, terms) {
    let out = esc(text);
    terms.forEach(t => {
      if (!t) return;
      const re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }

  function score(item, terms) {
    const T = (item.t || "").toLowerCase();
    const D = (item.d || "").toLowerCase();
    const G = (item.tag || "").toLowerCase();
    let s = 0;
    terms.forEach(term => {
      const q = term.toLowerCase();
      if (T === q) s += 100;
      else if (T.indexOf(q) === 0) s += 60;
      else if (T.indexOf(q) >= 0) s += 34;
      if (G.indexOf(q) >= 0) s += 12;
      if (D.indexOf(q) >= 0) s += 8;
    });
    // 类别权重：重难点 > 章节 > 知识点 > 其余
    const w = { key: 1.3, chapter: 1.2, point: 1.1, caselib: 1.05, lab: 1.0, term: 0.95, pitfall: 0.9, case: 0.9 };
    s *= (w[item.k] || 1);
    return s;
  }

  function search(q) {
    const raw = String(q || "").trim();
    if (!raw) return [];
    // 中文按字切分 + 也保留整串，让「抽样分布」能命中
    const terms = [raw];
    if (raw.length > 2 && /^[\u4e00-\u9fa5]+$/.test(raw)) {
      for (let i = 0; i < raw.length - 1; i++) terms.push(raw.slice(i, i + 2));
    }
    const rawL = raw.toLowerCase();
    const seen = new Set();
    return getIndex()
      .map(it => {
        let s = score(it, terms);
        // 整串出现在标题里，权重更高（避免只靠二字碎片命中）
        if ((it.t || "").toLowerCase().indexOf(rawL) >= 0) s += 30;
        return { it, s };
      })
      .filter(x => x.s >= 8)          // 过滤只靠描述碎片勉强命中的噪音
      .sort((a, b) => b.s - a.s)
      .filter(x => { const k = x.it.k + x.it.t; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 25)
      .map(x => ({ ...x.it, _terms: terms }));
  }

  const TAG_LABEL = {
    chapter: "章节", point: "知识点", key: "重难点", pitfall: "易错点",
    case: "案例", caselib: "案例库", term: "术语", lab: "互动实验"
  };

  let modalEl = null, selIdx = 0, curResults = [];
  function buildModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement("div");
    modalEl.className = "modal";
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.setAttribute("aria-label", "全站搜索");
    modalEl.hidden = true;
    modalEl.innerHTML =
      '<div class="modal-box">' +
      '<div class="inp">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8d99b6" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>' +
      '<input type="text" placeholder="搜索知识点、重难点、术语、案例、实验…" aria-label="搜索关键词" autocomplete="off" spellcheck="false">' +
      '<button class="btn sm ghost" data-close-search>Esc</button>' +
      "</div>" +
      '<div class="res"></div>' +
      '<div class="ft"><span>↑↓ 选择</span><span>Enter 打开</span><span>Esc 关闭</span><span class="spacer" style="flex:1"></span><span data-cnt></span></div>' +
      "</div>";
    document.body.appendChild(modalEl);
    const input = $("input", modalEl);
    input.addEventListener("input", () => runSearch(input.value));
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); go(curResults[selIdx]); }
      else if (e.key === "Escape") { closeSearch(); }
    });
    modalEl.addEventListener("click", e => {
      if (e.target === modalEl || e.target.closest("[data-close-search]")) closeSearch();
      const r = e.target.closest(".sr");
      if (r) go(curResults[Number(r.dataset.i)]);
    });
    return modalEl;
  }

  function move(d) {
    if (!curResults.length) return;
    selIdx = (selIdx + d + curResults.length) % curResults.length;
    $$(".sr", modalEl).forEach((el, i) => el.classList.toggle("sel", i === selIdx));
    const el = $$(".sr", modalEl)[selIdx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function runSearch(q) {
    const box = $(".res", modalEl);
    curResults = search(q);
    selIdx = 0;
    $("[data-cnt]", modalEl).textContent = q.trim() ? curResults.length + " 条结果" : "";
    if (!q.trim()) {
      box.innerHTML = '<div class="empty">输入关键词开始搜索<br><span class="fs12">可搜：知识点 · 重难点 · 公式 · 术语 · 案例 · 实验</span></div>';
      return;
    }
    if (!curResults.length) {
      box.innerHTML = '<div class="empty">没有找到「' + esc(q) + '」<br><span class="fs12">试试更短的关键词，比如「抽样」「p 值」「回归」</span></div>';
      return;
    }
    box.innerHTML = curResults.map((r, i) =>
      '<a class="sr' + (i === 0 ? " sel" : "") + '" data-i="' + i + '" href="' + esc(r.url) + '">' +
      '<div class="t">' + highlight(r.t, r._terms) + "</div>" +
      '<div class="d">' + highlight(String(r.d || "").slice(0, 130), r._terms) + "</div>" +
      '<div class="m"><span class="badge">' + (TAG_LABEL[r.k] || "内容") + "</span>" +
      '<span class="faint fs12">' + esc(r.tag || "") + "</span></div></a>"
    ).join("");
  }

  function go(r) {
    if (!r) return;
    location.href = r.url;
  }

  function openSearch(prefill) {
    buildModal();
    modalEl.hidden = false;
    document.body.style.overflow = "hidden";
    const input = $("input", modalEl);
    runSearch(prefill || "");
    input.value = prefill || "";
    setTimeout(() => input.focus(), 20);
  }
  function closeSearch() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.style.overflow = "";
  }

  /* =======================================================
     六、通用小工具
     ======================================================= */
  function toast(msg) {
    let t = $("#__toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "__toast";
      t.style.cssText = "position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:900;" +
        "background:var(--card);border:1px solid var(--line-strong);color:var(--fg);" +
        "padding:10px 18px;border-radius:11px;font-size:13.5px;box-shadow:var(--sh-3);" +
        "opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;max-width:82vw;text-align:center";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(t._tm);
    t._tm = setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(8px)";
    }, 2000);
  }

  /** 读 URL 参数 */
  function param(name, def) {
    const m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : (def === undefined ? null : def);
  }

  /** 自动给正文中的术语加提示（简单实现：只处理 glossary 里的词，避免误伤） */
  function autoTerms(root) {
    if (!root || !window.GLOSSARY) return;
    const map = {};
    window.GLOSSARY.forEach(g => { map[g.t] = g.d; });
    const keys = Object.keys(map).sort((a, b) => b.length - a.length).slice(0, 60);
    if (!keys.length) return;
    const re = new RegExp("(" + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "g");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.nodeName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "A" ||
          tag === "H1" || tag === "H2" || tag === "H3" || tag === "BUTTON" || tag === "MARK") {
          return NodeFilter.FILTER_REJECT;
        }
        if (p.classList && (p.classList.contains("no-term") || p.classList.contains("term"))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach(node => {
      const txt = node.nodeValue;
      if (!re.test(txt)) return;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(txt)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const sp = document.createElement("span");
        sp.className = "no-term";
        sp.title = map[m[1]] || "";
        sp.style.cssText = "border-bottom:1px dotted var(--acc);cursor:help";
        sp.textContent = m[1];
        frag.appendChild(sp);
        last = m.index + m[1].length;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* =======================================================
     七、启动
     ======================================================= */
  function boot() {
    initTheme();

    // login.html 自带表单，不需要遮罩
    if (PAGE === "login.html") { startUI(); return; }

    if (!isAuthed()) { showGate(); return; }
    startUI();
  }

  let uiStarted = false;
  function startUI() {
    if (uiStarted) return;
    uiStarted = true;

    renderTopbar();
    renderFooter();

    if (APP.auth.enabled && !CAN_STORE) {
      console.warn("[site] 当前浏览器禁用了本地存储，已跳过访问口令校验（避免登录后反复跳转）。");
      toast("浏览器禁用了本地存储，本次已跳过口令校验");
    }

    $$("[data-theme-toggle]").forEach(b => b.addEventListener("click", toggleTheme));
    $$("[data-open-search]").forEach(b => b.addEventListener("click", () => openSearch()));
    $$("[data-logout]").forEach(b => b.addEventListener("click", () => {
      if (confirm("确定退出登录吗？")) {
        clearAuth();
        location.reload();
      }
    }));

    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); openSearch();
      } else if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault(); openSearch();
      }
    });

    // 让当前页对应的导航高亮（含带参数页）
    $$(".nav a").forEach(a => {
      const href = a.getAttribute("href");
      if (href && href === PAGE) a.classList.add("active");
    });

    document.dispatchEvent(new CustomEvent("site:ready"));
  }

  window.SITE_UI = {
    openSearch, closeSearch, toast, param, esc, autoTerms, isAuthed,
    setAuthed, clearAuth, applyTheme, toggleTheme, $, $$, canStore: CAN_STORE
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
