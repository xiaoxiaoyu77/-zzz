/* =========================================================
   lab-core.js — 互动实验室框架
   ---------------------------------------------------------
   提供：
     1. 模块注册表 LAB.register / LAB.render
     2. SVG 绘图器 makePlot()：坐标轴、网格、曲线、面积、
        竖线、散点、文本、直方图、误差棒
     3. 交互助手：拖拽、悬停读数、键盘
     4. UI 构建器：控制面板、读数卡、芯片按钮、表格
   依赖 stats.js（window.ST）
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST;

  /* =======================================================
     通用 DOM 工具
     ======================================================= */
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  /** 简洁的 HTML 字符串拼接（不做 DOM 创建开销） */
  const h = (strings) => strings.join("");

  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "style") n.style.cssText = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  /** 主题取色（跟随深/浅色主题） */
  function cvar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  /* =======================================================
     SVG 绘图器
     ======================================================= */
  /**
   * makePlot 用法：
   *   const p = makePlot({W:880,H:420,xr:[-4,4]});
   *   p.setY([0, .4]); p.grid(); p.axes({xLabel:'t 值', yLabel:'f(t)'});
   *   p.line(t => ST.tPDF(t, 10), {stroke:'url(#g1)', width:2.6});
   *   p.area(-3,-2, t=>ST.tPDF(t,10), {fill:'rgba(76,201,240,.3)'});
   *   p.mount(svgEl);
   */
  function makePlot(opt) {
    opt = opt || {};
    const W = opt.W || 880, H = opt.H || 420;
    const M = Object.assign({ l: 62, r: 26, t: 26, b: 50 }, opt.margin || {});
    const PW = W - M.l - M.r, PH = H - M.t - M.b;
    let xr = opt.xr || [-4, 4];
    let yr = opt.yr || [0, 1];
    const parts = [];
    let defsAdded = false;

    const api = {
      W, H, M, PW, PH,
      x: v => M.l + (v - xr[0]) / (xr[1] - xr[0]) * PW,
      y: v => M.t + PH - (v - yr[0]) / (yr[1] - yr[0]) * PH,
      /** 反解：像素 → 数据 */
      invX: px => xr[0] + (px - M.l) / PW * (xr[1] - xr[0]),
      get xr() { return xr.slice(); },
      get yr() { return yr.slice(); },
      setX(a, b) { xr = [a, b]; return api; },
      setY(a, b) { yr = [a, b]; return api; },
      /** 按数据自动定纵轴上界 */
      autoY(f, x0, x1, pad) {
        x0 = x0 === undefined ? xr[0] : x0;
        x1 = x1 === undefined ? xr[1] : x1;
        let mx = 0;
        for (let i = 0; i <= 400; i++) mx = Math.max(mx, f(x0 + (x1 - x0) * i / 400));
        yr = [0, mx * (pad || 1.14) || 1];
        return api;
      },
      defs() {
        if (defsAdded) return api;
        defsAdded = true;
        parts.push(
          "<defs>" +
          '<linearGradient id="lgA" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4cc9f0"/><stop offset="100%" stop-color="#7b61ff"/></linearGradient>' +
          '<linearGradient id="lgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(76,201,240,.22)"/><stop offset="100%" stop-color="rgba(123,97,255,.02)"/></linearGradient>' +
          '<linearGradient id="lgC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,183,3,.28)"/><stop offset="100%" stop-color="rgba(255,183,3,.03)"/></linearGradient>' +
          '<linearGradient id="lgD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(247,37,133,.26)"/><stop offset="100%" stop-color="rgba(247,37,133,.03)"/></linearGradient>' +
          "</defs>");
        return api;
      },
      bg() {
        parts.push('<rect x="' + M.l + '" y="' + M.t + '" width="' + PW + '" height="' + PH + '" fill="' + cvar("--card-2", "rgba(255,255,255,.02)") + '" rx="6" opacity=".55"/>');
        return api;
      },
      raw(s) { parts.push(s); return api; },
      /** 网格线 */
      grid(stepX, stepY) {
        const sx = stepX || niceStep(xr[1] - xr[0]);
        const col = cvar("--line-soft", "rgba(255,255,255,.055)");
        for (let v = Math.ceil(xr[0] / sx) * sx; v <= xr[1] + 1e-9; v += sx) {
          parts.push('<line x1="' + api.x(v).toFixed(1) + '" y1="' + M.t + '" x2="' + api.x(v).toFixed(1) + '" y2="' + (M.t + PH) + '" stroke="' + col + '" stroke-width="1"/>');
        }
        if (stepY !== 0) {
          const sy = stepY || niceStep(yr[1] - yr[0]);
          for (let v = 0; v <= yr[1] + 1e-9; v += sy) {
            parts.push('<line x1="' + M.l + '" y1="' + api.y(v).toFixed(1) + '" x2="' + (M.l + PW) + '" y2="' + api.y(v).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>');
          }
        }
        return api;
      },
      /** 坐标轴 + 刻度 + 轴标签 */
      axes(o) {
        o = o || {};
        const ax = cvar("--line-strong", "#4a5680");
        const tx = cvar("--fg-mut", "#8d99b6");
        const mono = "monospace";
        // 主线
        parts.push('<line x1="' + M.l + '" y1="' + (M.t + PH) + '" x2="' + (M.l + PW) + '" y2="' + (M.t + PH) + '" stroke="' + ax + '" stroke-width="1.3"/>');
        parts.push('<line x1="' + M.l + '" y1="' + M.t + '" x2="' + M.l + '" y2="' + (M.t + PH) + '" stroke="' + ax + '" stroke-width="1.3"/>');
        if (o.zeroLine && yr[0] < 0 && yr[1] > 0) {
          parts.push('<line x1="' + M.l + '" y1="' + api.y(0).toFixed(1) + '" x2="' + (M.l + PW) + '" y2="' + api.y(0).toFixed(1) + '" stroke="' + ax + '" stroke-width="1.3"/>');
        }
        // X 刻度
        const sx = o.stepX || niceStep(xr[1] - xr[0]);
        for (let v = Math.ceil(xr[0] / sx) * sx; v <= xr[1] + 1e-9; v += sx) {
          const px = api.x(v);
          parts.push('<line x1="' + px.toFixed(1) + '" y1="' + (M.t + PH) + '" x2="' + px.toFixed(1) + '" y2="' + (M.t + PH + 5) + '" stroke="' + ax + '"/>');
          parts.push('<text x="' + px.toFixed(1) + '" y="' + (M.t + PH + 20) + '" fill="' + tx + '" font-size="11.5" font-family="' + mono + '" text-anchor="middle">' + (+v.toFixed(6)) + "</text>");
        }
        // Y 刻度
        const sy = o.stepY || niceStep(yr[1] - yr[0]);
        for (let v = Math.ceil(yr[0] / sy) * sy; v <= yr[1] + 1e-9; v += sy) {
          if (v < yr[0] - 1e-9) continue;
          parts.push('<text x="' + (M.l - 9) + '" y="' + (api.y(v) + 4).toFixed(1) + '" fill="' + tx + '" font-size="11" font-family="' + mono + '" text-anchor="end">' + (+v.toFixed(6)) + "</text>");
        }
        // 轴名
        if (o.xLabel) parts.push('<text x="' + (M.l + PW) + '" y="' + (M.t + PH + 42) + '" fill="' + tx + '" font-size="12" text-anchor="end">' + esc(o.xLabel) + "</text>");
        if (o.yLabel) parts.push('<text x="' + (M.l - 46) + '" y="' + (M.t - 9) + '" fill="' + tx + '" font-size="12">' + esc(o.yLabel) + "</text>");
        return api;
      },
      /** 由函数画曲线 */
      line(fn, o) {
        o = o || {};
        const n = o.n || 420;
        const x0 = o.x0 === undefined ? xr[0] : o.x0;
        const x1 = o.x1 === undefined ? xr[1] : o.x1;
        let d = "";
        for (let i = 0; i <= n; i++) {
          const v = x0 + (x1 - x0) * i / n;
          const py = api.y(fn(v));
          d += (i ? " L " : "M ") + api.x(v).toFixed(2) + " " + py.toFixed(2);
        }
        parts.push('<path d="' + d + '" fill="' + (o.fill || "none") + '" stroke="' +
          (o.stroke || "url(#lgA)") + '" stroke-width="' + (o.width || 2.6) + '"' +
          (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") +
          (o.opacity ? ' opacity="' + o.opacity + '"' : "") +
          ' stroke-linejoin="round" stroke-linecap="round"/>');
        return api;
      },
      /** 曲线下填充区域 */
      area(x0, x1, fn, o) {
        o = o || {};
        const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
        const n = o.n || Math.max(40, Math.round(500 * (hi - lo) / (xr[1] - xr[0])));
        const base = o.base === undefined ? 0 : o.base;
        let d = "M " + api.x(lo).toFixed(2) + " " + api.y(base).toFixed(2);
        for (let i = 0; i <= n; i++) {
          const v = lo + (hi - lo) * i / n;
          d += " L " + api.x(v).toFixed(2) + " " + api.y(fn(v)).toFixed(2);
        }
        d += " L " + api.x(hi).toFixed(2) + " " + api.y(base).toFixed(2) + " Z";
        parts.push('<path d="' + d + '" fill="' + (o.fill || "rgba(76,201,240,.30)") + '" stroke="' +
          (o.stroke || "rgba(76,201,240,.85)") + '" stroke-width="' + (o.width || 1.3) + '"/>');
        return api;
      },
      /** 竖线 */
      vline(x, o) {
        o = o || {};
        const px = api.x(x);
        if (px < M.l - 1 || px > M.l + PW + 1) return api;
        parts.push('<line x1="' + px.toFixed(1) + '" y1="' + (o.top === undefined ? M.t : o.top) + '" x2="' + px.toFixed(1) + '" y2="' + (o.bottom === undefined ? M.t + PH : o.bottom) + '" stroke="' + (o.stroke || "rgba(61,220,151,.75)") + '" stroke-width="' + (o.width || 1.3) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>");
        if (o.label) {
          const anchor = o.anchor || (px > M.l + PW - 70 ? "end" : "start");
          const dx = o.dx === undefined ? (anchor === "end" ? -5 : 5) : o.dx;
          parts.push('<text x="' + px.toFixed(1) + '" y="' + (o.labelY === undefined ? M.t + 14 : o.labelY) + '" fill="' + (o.labelColor || o.stroke || "#3ddc97") + '" font-size="11" font-family="monospace" text-anchor="' + anchor + '" dx="' + dx + '">' + esc(o.label) + "</text>");
        }
        return api;
      },
      hline(y, o) {
        o = o || {};
        parts.push('<line x1="' + M.l + '" y1="' + api.y(y).toFixed(1) + '" x2="' + (M.l + PW) + '" y2="' + api.y(y).toFixed(1) + '" stroke="' + (o.stroke || "rgba(255,183,3,.6)") + '" stroke-width="' + (o.width || 1.2) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>");
        return api;
      },
      /** 数据点 */
      dot(x, y, o) {
        o = o || {};
        parts.push('<circle cx="' + api.x(x).toFixed(1) + '" cy="' + api.y(y).toFixed(1) + '" r="' + (o.r || 5) + '" fill="' + (o.fill || cvar("--bg", "#0a0e18")) + '" stroke="' + (o.stroke || "#4cc9f0") + '" stroke-width="' + (o.width || 2.4) + '"/>');
        return api;
      },
      /** 柱（直方图用，按数据宽度） */
      bar(x0, x1, y, o) {
        o = o || {};
        const px = api.x(x0), pw = api.x(x1) - px;
        const py = api.y(y);
        parts.push('<rect x="' + px.toFixed(2) + '" y="' + py.toFixed(2) + '" width="' + Math.max(0.6, pw - (o.gap || 1)).toFixed(2) + '" height="' + Math.max(0, api.y(o.base === undefined ? 0 : o.base) - py).toFixed(2) + '" fill="' + (o.fill || "rgba(76,201,240,.45)") + '" stroke="' + (o.stroke || "rgba(76,201,240,.9)") + '" stroke-width="' + (o.width === undefined ? 1 : o.width) + '" rx="' + (o.rx === undefined ? 2 : o.rx) + '"/>');
        return api;
      },
      /** 误差棒（含端点帽） */
      errorBar(x, y, lo, hi, o) {
        o = o || {};
        const px = api.x(x), y1 = api.y(lo), y2 = api.y(hi);
        const c = o.stroke || "#ffb703";
        parts.push('<line x1="' + px.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + px.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + c + '" stroke-width="' + (o.width || 1.6) + '"/>');
        const w = o.cap || 7;
        parts.push('<line x1="' + (px - w) + '" y1="' + y1.toFixed(1) + '" x2="' + (px + w) + '" y2="' + y1.toFixed(1) + '" stroke="' + c + '" stroke-width="' + (o.width || 1.6) + '"/>');
        parts.push('<line x1="' + (px - w) + '" y1="' + y2.toFixed(1) + '" x2="' + (px + w) + '" y2="' + y2.toFixed(1) + '" stroke="' + c + '" stroke-width="' + (o.width || 1.6) + '"/>');
        return api;
      },
      text(x, y, s, o) {
        o = o || {};
        parts.push('<text x="' + api.x(x).toFixed(1) + '" y="' + api.y(y).toFixed(1) + '" fill="' + (o.fill || cvar("--fg-dim", "#c6cee2")) + '" font-size="' + (o.size || 12) + '"' +
          (o.mono ? ' font-family="monospace"' : "") +
          ' text-anchor="' + (o.anchor || "start") + '"' +
          (o.dx ? ' dx="' + o.dx + '"' : "") + (o.dy ? ' dy="' + o.dy + '"' : "") +
          (o.weight ? ' font-weight="' + o.weight + '"' : "") +
          (o.opacity ? ' opacity="' + o.opacity + '"' : "") + ">" + esc(s) + "</text>");
        return api;
      },
      /** 像素坐标文本（图例、角标用） */
      ptext(px, py, s, o) {
        o = o || {};
        parts.push('<text x="' + px + '" y="' + py + '" fill="' + (o.fill || cvar("--fg-mut", "#8d99b6")) + '" font-size="' + (o.size || 12) + '"' +
          (o.mono ? ' font-family="monospace"' : "") + ' text-anchor="' + (o.anchor || "start") + '"' +
          (o.weight ? ' font-weight="' + o.weight + '"' : "") + ">" + esc(s) + "</text>");
        return api;
      },
      /** 信息浮层 */
      tooltip(px, py, lines, o) {
        o = o || {};
        const w = o.w || 168, lh = 15;
        const hgt = 12 + lines.length * lh;
        const bx = px > M.l + PW - w - 12 ? px - w - 12 : px + 12;
        const by = Math.min(Math.max(M.t + 4, py - hgt / 2), M.t + PH - hgt - 4);
        parts.push('<g transform="translate(' + bx.toFixed(1) + "," + by.toFixed(1) + ')">' +
          '<rect width="' + w + '" height="' + hgt + '" rx="7" fill="' + cvar("--card", "#121a2c") + '" stroke="' + cvar("--line-strong", "#3d4f78") + '" opacity=".97"/>' +
          lines.map((s, i) =>
            '<text x="10" y="' + (17 + i * lh) + '" fill="' + (i === 0 ? "#ffb703" : cvar("--fg-dim", "#c6cee2")) + '" font-family="monospace" font-size="11.5">' + esc(s) + "</text>").join("") +
          "</g>");
        return api;
      },
      /** 画布命中区（用于拖拽/点击，需放在最后） */
      hitArea(id) {
        parts.push('<rect id="' + (id || "hit") + '" x="' + M.l + '" y="' + M.t + '" width="' + PW + '" height="' + PH + '" fill="transparent" style="cursor:crosshair"/>');
        return api;
      },
      /** 输出到 <svg> */
      mount(svg) {
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.innerHTML = parts.join("");
        return svg;
      },
      html() { return parts.join(""); }
    };
    api.defs();
    return api;
  }

  function niceStep(span) {
    const raw = span / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  /* =======================================================
     交互助手
     ======================================================= */
  /**
   * 把鼠标/触摸位置换算成 SVG 内部坐标
   */
  function localPoint(svg, ev, W, H) {
    const r = svg.getBoundingClientRect();
    const vb = (svg.getAttribute("viewBox") || ("0 0 " + W + " " + H)).split(/\s+/).map(Number);
    const vw = vb[2] || W, vh = vb[3] || H;
    // preserveAspectRatio="xMidYMid meet" 下的缩放
    const sc = Math.min(r.width / vw, r.height / vh);
    const ox = (r.width - vw * sc) / 2, oy = (r.height - vh * sc) / 2;
    return {
      x: (ev.clientX - r.left - ox) / sc,
      y: (ev.clientY - r.top - oy) / sc
    };
  }

  /** 统一的拖拽处理：drag(svg, plot, {onDrag, onHover, onLeave, onUp}) */
  function interactive(svg, plot, cb) {
    const W = plot.W, H = plot.H;
    let dragging = false;
    const toData = ev => {
      const p = localPoint(svg, ev, W, H);
      return { dx: plot.invX(p.x), px: p.x, py: p.y };
    };
    svg.style.touchAction = "none";
    svg.addEventListener("pointerdown", ev => {
      dragging = true;
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { }
      const d = toData(ev);
      if (cb.onDown) cb.onDown(d);
      if (cb.onDrag) cb.onDrag(d);
    });
    svg.addEventListener("pointermove", ev => {
      const d = toData(ev);
      if (dragging) { if (cb.onDrag) cb.onDrag(d); }
      else if (cb.onHover) cb.onHover(d);
    });
    const end = ev => {
      if (!dragging) return;
      dragging = false;
      if (cb.onUp) cb.onUp(toData(ev));
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener("pointerleave", () => { if (cb.onLeave) cb.onLeave(); });
    return { isDragging: () => dragging };
  }

  /* =======================================================
     UI 构建器
     ======================================================= */
  /** 控制块：标题 + 数值 + 主体 */
  function ctrl(o) {
    return '<div class="ctrl">' +
      '<div class="ctrl-h"><span class="lab">' + o.label + '</span>' +
      (o.valHtml !== undefined ? '<span class="val">' + o.valHtml + "</span>" : "") + "</div>" +
      (o.body || "") +
      (o.note ? '<div class="note">' + o.note + "</div>" : "") +
      "</div>";
  }
  /** 加减按钮组 */
  function stepper(idMinus, idPlus, extra) {
    return '<div class="step">' +
      '<button class="btn sq" id="' + idMinus + '">−</button>' +
      '<button class="btn sq" id="' + idPlus + '">+</button>' +
      (extra || "") + "</div>";
  }
  /** 芯片组 */
  function chips(id, items, active) {
    return '<div class="chips" id="' + id + '">' + items.map(it => {
      const v = typeof it === "object" ? it.v : it;
      const t = typeof it === "object" ? it.t : it;
      return '<button class="chip' + (active !== undefined && String(active) === String(v) ? " active" : "") +
        '" data-v="' + esc(v) + '">' + t + "</button>";
    }).join("") + "</div>";
  }
  /** 开关 */
  function sw(id, label, checked) {
    return '<label class="switch"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
  }
  /** 读数卡组 */
  function readouts(cards) {
    return cards.map(c =>
      '<div class="ro ' + (c.cls || (c.hi ? "hi" : "")) + '">' +
      '<div class="k">' + c.k + "</div>" +
      '<div class="v">' + c.v + "</div>" +
      (c.mini ? '<div class="mini">' + c.mini + "</div>" : "") +
      "</div>").join("");
  }
  /** 计算步骤 */
  function steps(rows) {
    return rows.map((r, i) =>
      '<div class="calc-row"><div class="no">' + (i + 1) + '</div><div class="body">' +
      '<div class="sym">' + r.sym + "</div>" +
      (r.num ? '<div class="num">' + r.num + "</div>" : "") +
      (r.plain ? '<div class="plain">' + r.plain + "</div>" : "") +
      "</div></div>").join("");
  }
  /** 数据点池 */
  function pool(vals, opts) {
    opts = opts || {};
    const idOf = i => opts.ids ? opts.ids[i] : String(i + 1);
    return '<div class="pool">' + vals.map((v, i) => {
      const cls = opts.classOf ? opts.classOf(v, i) : "";
      return '<div class="pt ' + cls + '" data-i="' + i + '"><div class="id">' + idOf(i) + '</div><div class="sc">' + v + "</div></div>";
    }).join("") + "</div>";
  }
  /** 标准表格 */
  function table(head, rows, o) {
    o = o || {};
    return '<div class="tbl-wrap"><table class="tbl' + (o.mini ? " mini" : "") + '"><thead><tr>' +
      head.map(x => "<th>" + x + "</th>").join("") +
      "</tr></thead><tbody>" + rows.map(r =>
        "<tr>" + r.map((c, i) => {
          if (typeof c === "object" && c !== null) {
            return '<td class="' + (c.cls || "") + '"' + (c.data ? Object.keys(c.data).map(k => " data-" + k + '="' + esc(c.data[k]) + '"').join("") : "") + ">" + c.v + "</td>";
          }
          return "<td" + (i === 0 ? ' class="tx"' : "") + ">" + c + "</td>";
        }).join("") + "</tr>").join("") +
      "</tbody></table></div>";
  }
  /** 图例 */
  function legend(items) {
    return '<div class="legend">' + items.map(it =>
      '<span class="it"><i class="' + (it.dot ? "dot" : "sw") + '" style="background:' + it.c + '"></i>' + it.t + "</span>"
    ).join("") + "</div>";
  }
  /** 提示条 */
  function hints(items) {
    return '<div class="hint">' + items.map(t => "<span>" + t + "</span>").join("") + "</div>";
  }

  /* =======================================================
     工具：常用统计计算快捷方式
     ======================================================= */
  const F = ST.fmt;

  /** 生成一个正态随机样本 */
  function randn(n, mu, sigma, seed) {
    const r = seed === undefined ? ST.rng : new ST.RNG(seed);
    return r.normalSample(n, mu === undefined ? 0 : mu, sigma === undefined ? 1 : sigma);
  }
  /** 对数正态样本（长尾） */
  function randLognormal(n, mu, sigma, seed) {
    const r = seed === undefined ? ST.rng : new ST.RNG(seed);
    return r.lognormalSample(n, mu, sigma);
  }
  /** 均匀样本 */
  function randUniform(n, a, b, seed) {
    const r = seed === undefined ? ST.rng : new ST.RNG(seed);
    const out = [];
    for (let i = 0; i < n; i++) out.push(r.uniform(a, b));
    return out;
  }

  /** 全局模块注册表 */
  const LAB = {
    modules: {},
    order: [],
    register(def) {
      if (!def || !def.id) throw new Error("模块必须提供 id");
      this.modules[def.id] = def;
      if (this.order.indexOf(def.id) < 0) this.order.push(def.id);
      return def;
    },
    get(id) { return this.modules[id]; },
    meta(id) {
      return (window.LAB_MODULES || []).filter(m => m.id === id)[0] || null;
    },
    /** 渲染到容器 */
    render(id, root) {
      const m = this.modules[id];
      if (!m) {
        root.innerHTML = '<div class="card"><div class="card-h"><h2>模块未找到</h2></div>' +
          '<p class="mut">ID「' + esc(id) + '」尚未注册。已注册：' + Object.keys(this.modules).join("、") + "</p></div>";
        return;
      }
      root.innerHTML = "";
      try {
        m.render(root);
        // 渲染后统一执行一次收尾（绑定事件等）
        if (m.after) m.after(root);
      } catch (err) {
        console.error("[LAB] 模块渲染失败：" + id, err);
        root.innerHTML = '<div class="card"><div class="card-h"><h2>模块出错</h2></div>' +
          '<p class="mut">' + esc(err.message || String(err)) + "</p></div>";
      }
    }
  };

  /* =======================================================
     导出
     ======================================================= */
  window.LAB = LAB;
  window.LABUI = {
    makePlot, niceStep, interactive, localPoint, el, $, $$, esc, h, cvar,
    ctrl, stepper, chips, sw, readouts, steps, pool, table, legend, hints,
    randn, randLognormal, randUniform, F,
    g1: () => cvar("--g1", "#4cc9f0"),
    g2: () => cvar("--g2", "#ffb703"),
    g3: () => cvar("--g3", "#f72585"),
    g4: () => cvar("--g4", "#3ddc97"),
    g5: () => cvar("--g5", "#7b61ff"),
    g6: () => cvar("--g6", "#ff7b54")
  };

})();
