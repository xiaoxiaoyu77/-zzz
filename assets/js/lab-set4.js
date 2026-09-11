/* =========================================================
   lab-set4.js — 互动模块（四）
     · chi2    卡方列联表实验室
     · power   样本量与统计功效计算器
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

/* ==========================================================
   模块 8 · 卡方列联表实验室
   ========================================================== */
LAB.register({
  id: "chi2",
  render(root) {
    const PRESETS = {
      platform: {
        name: "平台偏好 × 年龄段",
        rowName: "年龄段", colName: "主要短视频平台",
        rows: ["18–25 岁", "26–35 岁", "36 岁以上"],
        cols: ["抖音", "快手", "视频号"],
        data: [[92, 28, 20], [60, 42, 38], [30, 35, 55]],
        scene: "某课题组调查 400 名用户，交叉分析年龄段与主要使用的短视频平台。问题是：平台偏好与年龄是否相互独立？"
      },
      title: {
        name: "标题风格 × 是否点击",
        rowName: "标题风格", colName: "是否点击",
        rows: ["数字式", "悬念式"],
        cols: ["点击", "未点击"],
        data: [[148, 52], [96, 104]],
        scene: "某媒体把 400 篇文章随机分配到两种标题风格，记录点击情况。问题是：点击率是否与标题风格有关？"
      },
      ad: {
        name: "广告类型 × 购买意愿",
        rowName: "广告形式", colName: "购买意愿",
        rows: ["信息流", "开屏", "贴片"],
        cols: ["愿意", "不确定", "不愿意"],
        data: [[58, 40, 22], [44, 38, 38], [30, 36, 54]],
        scene: "某品牌测试三种广告形式下用户的购买意愿分布。问题是：三种形式的意愿分布是否有差异？"
      }
    };
    const S = {
      preset: "platform", obs: null, showExp: true, showStd: true, alpha: 0.05,
      colorBy: "std", minExpWarn: true
    };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">案例数据</div>' +
      U.chips("chPreset", Object.keys(PRESETS).map(k => ({ v: k, t: PRESETS[k].name })), "platform") +
      '<div class="note" id="chScene"></div>' +
      U.ctrl({
        label: "显示选项",
        body: '<div style="display:flex;flex-direction:column;gap:8px">' +
          U.sw("chExp", "在单元格内显示期望频数", true) +
          U.sw("chStd", "显示标准化残差（定位差异来源）", true) +
          U.sw("chWarn", "期望频数过小时给出警告", true) + "</div>"
      }) +
      U.ctrl({
        label: "单元格填色依据",
        body: '<div class="chips" id="chColor">' +
          '<button class="chip active" data-v="std">标准化残差</button>' +
          '<button class="chip" data-v="contrib">χ² 贡献</button>' +
          '<button class="chip" data-v="pct">行百分比</button></div>',
        note: "标准化残差绝对值大于 2 的格子，是造成 χ² 显著的主要来源。"
      }) +
      U.ctrl({ label: "显著性水平 α", valHtml: '<span id="chAlpha"></span>', body: U.chips("chAlphaC", [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]) }) +
      '<div class="ctrl"><button class="btn block" id="chReset">恢复案例原始数据</button></div>' +
      '<div class="ctrl"><div class="note">提示：直接点击右侧表格里的数字，或用下方的加减按钮修改任何一个格子，所有统计量都会实时重算。</div></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>列联表（点击数字可修改）</h2><span class="spacer"></span>' +
      '<span class="badge" id="chN"></span></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="chTable"></table></div>' +
      U.legend([
        { c: "rgba(61,220,151,.35)", t: "实际 > 期望（偏多）", dot: false },
        { c: "rgba(247,37,133,.30)", t: "实际 < 期望（偏少）", dot: false },
        { c: "var(--g2)", t: "期望频数", dot: true }
      ]) +
      '<div class="row mt14" id="chEditor"></div>' +
      "</div>" +
      '<div class="readouts" id="chOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="card mt18"><div class="card-h"><h2>χ² 分布与 p 值</h2><span class="spacer"></span>' +
      '<span class="badge" id="chBadge"></span></div>' +
      '<div class="stage"><svg id="chDist"></svg></div>' +
      '<div class="narr" id="chNarr"></div>' +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>逐格拆解：差异从哪里来</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>格子</th><th>实际 f<sub>o</sub></th><th>期望 f<sub>e</sub></th><th>差</th><th>贡献</th><th>标准化残差</th></tr></thead><tbody id="chCells"></tbody></table></div>' +
      '<div class="note mt10">贡献 = (f<sub>o</sub> − f<sub>e</sub>)² / f<sub>e</sub>，所有格子贡献之和就是 χ²。</div></section>' +
      '<section class="card"><div class="card-h"><h2>计算过程</h2></div><div id="chSteps"></div></section>' +
      '<section class="card"><div class="card-h"><h2>适用条件检查</h2></div>' +
      '<div id="chCheck"></div>' +
      '<div class="callout warn mt10"><span class="ttl">期望频数过小怎么办</span>' +
      "顺序是：① 合并语义相近的类别；② 若仍是 2×2 且期望 &lt; 5，用 <b>Fisher 精确检验</b>；③ 更大表可用精确检验或蒙特卡洛模拟。切忌对期望频数很小的表格直接读 χ² 的 p 值。</div></section>" +
      "</div>";

    const ids = ["chPreset", "chScene", "chExp", "chStd", "chWarn", "chColor", "chAlpha", "chAlphaC",
      "chReset", "chN", "chTable", "chEditor", "chOut", "chBadge", "chDist", "chNarr", "chCells", "chSteps", "chCheck"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.chAlphaC.innerHTML = [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]
      .map(o => '<button class="chip" data-v="' + o.v + '">' + o.t + "</button>").join("");
    E.chColor.innerHTML = [{ v: "std", t: "标准化残差" }, { v: "contrib", t: "χ² 贡献" }, { v: "pct", t: "行百分比" }]
      .map(o => '<button class="chip' + (o.v === "std" ? " active" : "") + '" data-v="' + o.v + '">' + o.t + "</button>").join("");

    function loadPreset(k) {
      S.preset = k;
      const P = PRESETS[k];
      S.obs = P.data.map(r => r.slice());
      U.$$("#chPreset button").forEach(b => b.classList.toggle("active", b.dataset.v === k));
    }
    loadPreset("platform");

    function cellColor(v, maxAbs) {
      const a = Math.min(1, Math.abs(v) / (maxAbs || 1));
      if (v > 0) return "rgba(61,220,151," + (0.10 + a * 0.42).toFixed(3) + ")";
      if (v < 0) return "rgba(247,37,133," + (0.10 + a * 0.38).toFixed(3) + ")";
      return "transparent";
    }

    function draw() {
      const P = PRESETS[S.preset];
      const t = ST.chi2Test(S.obs);
      E.chScene.innerHTML = P.scene;
      E.chN.textContent = "N = " + t.N;
      E.chAlpha.textContent = "." + String(S.alpha).replace(/^0\./, "");
      U.$$("#chAlphaC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.alpha));
      U.$$("#chColor button").forEach(b => b.classList.toggle("active", b.dataset.v === S.colorBy));

      /* ---- 列联表 ---- */
      let maxAbsStd = 0;
      t.cells.forEach(c => maxAbsStd = Math.max(maxAbsStd, Math.abs(c.stdResid)));
      const maxContrib = Math.max.apply(null, t.cells.map(c => c.contrib)) || 1;

      let html = "<thead><tr><th>" + P.rowName + " ＼ " + P.colName + "</th>" +
        P.cols.map(c => "<th>" + c + "</th>").join("") + "<th>行合计</th></tr></thead><tbody>";
      for (let i = 0; i < t.r; i++) {
        html += '<tr><td class="tx"><b>' + P.rows[i] + "</b></td>";
        for (let j = 0; j < t.c; j++) {
          const idx = i * t.c + j;
          const cell = t.cells[idx];
          let bg = "transparent", txt = "";
          if (S.colorBy === "std") { bg = cellColor(cell.stdResid, maxAbsStd); txt = (cell.stdResid > 0 ? "+" : "") + U.F.num(cell.stdResid, 2); }
          else if (S.colorBy === "contrib") { bg = cellColor(cell.contrib / maxContrib, 1); txt = U.F.num(cell.contrib, 2); }
          else { bg = cellColor(cell.o / t.rowS[i] - 0.5, 0.5); txt = U.F.num(cell.o / t.rowS[i] * 100, 1) + "%"; }
          html += '<td class="c" style="background:' + bg + '" data-i="' + idx + '">' +
            "<div style='font-size:15px;font-weight:600;color:var(--fg)'>" + cell.o + "</div>" +
            (S.showExp ? '<div style="font-size:11px;color:var(--g2)">e = ' + U.F.num(cell.e, 1) + "</div>" : "") +
            (S.showStd ? '<div style="font-size:10.5px;color:var(--fg-mut)">' + txt + "</div>" : "") +
            "</td>";
        }
        html += '<td style="color:var(--fg-mut)">' + t.rowS[i] + "</td></tr>";
      }
      html += '<tr><td class="tx"><b>列合计</b></td>' +
        t.colS.map(s => '<td style="color:var(--fg-mut)">' + s + "</td>").join("") +
        '<td style="color:var(--accent)">' + t.N + "</td></tr></tbody>";
      E.chTable.innerHTML = html;

      /* ---- 编辑控件 ---- */
      let ed = "";
      for (let i = 0; i < t.r; i++) {
        ed += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">' +
          '<span class="fs12 mut" style="min-width:74px">' + P.rows[i] + "</span>";
        for (let j = 0; j < t.c; j++) {
          const k = i * t.c + j;
          ed += '<span class="badge">' + P.cols[j] + " " +
            '<button class="btn sm ghost" style="padding:0 5px" data-dec="' + k + '">−</button>' +
            '<b data-v="' + k + '">' + S.obs[i][j] + "</b>" +
            '<button class="btn sm ghost" style="padding:0 5px" data-inc="' + k + '">+</button></span>';
        }
        ed += "</div>";
      }
      E.chEditor.innerHTML = ed;

      /* ---- 逐格拆解 ---- */
      E.chCells.innerHTML = t.cells.map(c =>
        '<tr><td class="tx">' + P.rows[c.i] + " × " + P.cols[c.j] + "</td><td>" + c.o + "</td><td>" + U.F.num(c.e, 2) +
        "</td><td>" + U.F.num(c.diff, 2) + "</td><td>" + U.F.num(c.contrib, 3) +
        '</td><td style="color:' + (Math.abs(c.stdResid) > 2 ? "var(--danger)" : "var(--fg-mut)") + '">' + U.F.num(c.stdResid, 2) + "</td></tr>"
      ).join("");

      /* ---- χ² 分布 ---- */
      const df = t.df;
      const fp = U.makePlot({ W: 880, H: 250, xr: [0, 1], yr: [0, 1] });
      const xmax = Math.max(6, Math.min(60, t.chi2 * 1.4 + 3));
      fp.setX(0, xmax).autoY(x => ST.chi2PDF(Math.max(x, 1e-6), df), 0.001, xmax, 1.18)
        .bg().grid(0, 0).axes({ xLabel: "χ² 值", yLabel: "f(χ²)", stepX: U.niceStep(xmax) });
      const crit = ST.chi2Inv(1 - S.alpha, df);
      const den = x => ST.chi2PDF(Math.max(x, 1e-6), df);
      fp.area(Math.min(crit, xmax), xmax, den, { fill: "rgba(247,37,133,.32)", stroke: "rgba(247,37,133,.9)" });
      fp.line(x => den(x), { x0: 0.02, stroke: "url(#lgA)", width: 2.6 });
      fp.line(x => den(x), { x0: 0.02, stroke: "none", fill: "url(#lgB)" });
      fp.vline(crit, { stroke: "var(--g4)", dash: "4 4", label: "χ²* = " + U.F.num(crit, 2) });
      if (t.chi2 <= xmax) {
        fp.vline(t.chi2, { stroke: "rgba(255,255,255,.5)", dash: "3 4" });
        fp.dot(t.chi2, Math.min(den(t.chi2), fp.yr[1] * 0.96), { stroke: "var(--g2)", r: 5 });
        fp.ptext(fp.x(t.chi2), fp.M.t + fp.PH - 12, "χ² = " + U.F.num(t.chi2, 3), { fill: "var(--g2)", size: 12.5, mono: true, anchor: "middle" });
      }
      fp.mount(E.chDist);

      const reject = t.p < S.alpha;
      E.chBadge.className = "badge " + (reject ? "ok" : "warn");
      E.chBadge.textContent = reject ? "拒绝独立：两变量存在关联" : "不能拒绝独立：无充分证据";

      /* ---- 读数 ---- */
      const sigCells = t.cells.filter(c => Math.abs(c.stdResid) > 2);
      E.chOut.innerHTML = U.readouts([
        { k: "样本量 N", v: t.N },
        { k: "χ² 统计量", v: U.F.num(t.chi2, 3), hi: true, mini: "Σ(o−e)²/e" },
        { k: "自由度", v: t.df, mini: "(r−1)(c−1)" },
        { k: "p 值", v: U.F.pApa(t.p), hi: true, cls: reject ? "hi ok" : "hi warn" },
        { k: "Cramér's V", v: U.F.num(t.cramerV, 3), cls: t.cramerV >= 0.3 ? "warn" : "", mini: U.F.effect(t.cramerV, "v") + "关联" },
        { k: "最小期望频数", v: U.F.num(t.minExp, 2), cls: t.minExp < 5 ? "danger" : "ok", mini: t.minExp < 5 ? "偏小，慎用" : "满足要求" },
        { k: "显著格子数", v: sigCells.length, mini: "|标准化残差| > 2" }
      ]);

      /* ---- 计算步骤 ---- */
      E.chSteps.innerHTML = U.steps([
        { sym: "期望频数 f<sub>e</sub> = 行合计 × 列合计 / 总计", num: "例：第 1 行第 1 列 e = " + t.rowS[0] + " × " + t.colS[0] + " / " + t.N + " = <b>" + U.F.num(t.exp[0][0], 2) + "</b>", plain: "这是在「两变量相互独立」假设下，这个格子理论上应该有多少人。" },
        { sym: "χ² = Σ (f<sub>o</sub> − f<sub>e</sub>)² / f<sub>e</sub>", num: "χ² = <b>" + U.F.num(t.chi2, 4) + "</b>", plain: "衡量实际与期望的整体偏离程度。偏离越大，越不像「相互独立」。" },
        { sym: "自由度 df = (r − 1)(c − 1)", num: "df = (" + t.r + " − 1) × (" + t.c + " − 1) = <b>" + t.df + "</b>", plain: "边缘合计固定后，只有这么多格子能自由变动。" },
        { sym: "Cramér's V = √(χ² / (N · min(r−1, c−1)))", num: "V = √(" + U.F.num(t.chi2, 3) + " / (" + t.N + " × " + Math.min(t.r - 1, t.c - 1) + ")) = <b>" + U.F.num(t.cramerV, 4) + "</b>", plain: "把样本量的影响剔除后，关联强度属于" + U.F.effect(t.cramerV, "v") + "。这一步必不可少，因为 χ² 会随 N 增大而增大。" }
      ]);

      /* ---- 条件检查 ---- */
      const small = t.cells.filter(c => c.e < 5).length;
      const pctSmall = small / t.cells.length;
      const hasZero = t.minExp < 1;
      const okAll = !hasZero && pctSmall <= 0.2;
      E.chCheck.innerHTML =
        '<div class="kv">' +
        '<div class="k">最小期望频数</div><div class="v ' + (t.minExp < 5 ? "na" : "") + '">' + U.F.num(t.minExp, 2) + "</div>" +
        '<div class="k">期望 &lt; 5 的格子数</div><div class="v ' + (pctSmall > 0.2 ? "na" : "") + '">' + small + " / " + t.cells.length + "</div>" +
        '<div class="k">占比</div><div class="v">' + U.F.num(pctSmall * 100, 1) + "%</div>" +
        '<div class="k">是否满足条件</div><div class="v">' + (okAll ? "满足" : "不满足") + "</div>" +
        "</div>" +
        (S.minExpWarn
          ? '<div class="callout ' + (okAll ? "ok" : "danger") + ' mt10">' +
          (okAll
            ? "期望频数条件满足（所有期望 ≥ 1，且期望 &lt; 5 的格子不超过 20%），χ² 的 p 值可以放心使用。"
            : "<span class='ttl'>⚠ 期望频数条件不满足</span>当前有 " + small + " 个格子的期望频数小于 5（占 " + U.F.num(pctSmall * 100, 1) + "%）。此时 χ² 的连续近似会失效，<b>p 值偏小、假阳性升高</b>。请合并类别或改用精确检验。") + "</div>"
          : "") +
        (t.r === 2 && t.c === 2 && (hasZero || pctSmall > 0.2)
          ? (function () {
            const f = ST.fisher22(S.obs[0][0], S.obs[0][1], S.obs[1][0], S.obs[1][1]);
            return '<div class="callout purple mt10"><span class="ttl">Fisher 精确检验结果</span>本例是 2×2 表，已自动计算精确检验：<b>双尾 p = ' + U.F.pApa(f.pTwo) + "</b>（左尾 " + U.F.pApa(f.pLess) + "，右尾 " + U.F.pApa(f.pMore) + "）。<br>与 χ² 的 p = " + U.F.pApa(t.p) + " 相比，精确检验的结果在小样本时更可靠。</div>";
          })()
          : "");

      /* ---- 叙述 ---- */
      E.chNarr.innerHTML =
        "χ²(" + t.df + ", N = " + t.N + ") = <b>" + U.F.num(t.chi2, 2) + "</b>，p " + (t.p < 0.001 ? "< .001" : "= " + U.F.pApa(t.p)) +
        "，Cramér's V = <b>" + U.F.num(t.cramerV, 3) + "</b>。" +
        (reject
          ? " 在 α = " + S.alpha + " 水平上拒绝独立性假设，两变量<b>存在关联</b>，强度属于「" + U.F.effect(t.cramerV, "v") + "」。"
          : " 未能拒绝独立性假设，没有充分证据表明两变量有关联。") +
        (sigCells.length
          ? " 差异主要集中在：" + sigCells.slice(0, 3).map(c => "<b>" + PRESETS[S.preset].rows[c.i] + " × " + PRESETS[S.preset].cols[c.j] + "</b>（残差 " + U.F.num(c.stdResid, 1) + (c.diff > 0 ? "，实际偏多" : "，实际偏少") + "）").join("、") + "。"
          : "") +
        " <b>注意：χ² 只说明「是否有关联」，不说明因果，也不给出方向。</b>";
    }

    /* ---- 事件 ---- */
    E.chPreset.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      loadPreset(b.dataset.v); draw();
    };
    E.chExp.onchange = () => { S.showExp = E.chExp.checked; draw(); };
    E.chStd.onchange = () => { S.showStd = E.chStd.checked; draw(); };
    E.chWarn.onchange = () => { S.minExpWarn = E.chWarn.checked; draw(); };
    E.chColor.onclick = e => { const b = e.target.closest("button"); if (b) { S.colorBy = b.dataset.v; draw(); } };
    E.chAlphaC.onclick = e => { const b = e.target.closest("button"); if (b) { S.alpha = +b.dataset.v; draw(); } };
    E.chReset.onclick = () => { loadPreset(S.preset); draw(); };

    root.addEventListener("click", e => {
      const dec = e.target.closest("[data-dec]"), inc = e.target.closest("[data-inc]");
      const td = e.target.closest("td.c");
      if (dec || inc) {
        const k = +((dec || inc).dataset.dec !== undefined ? dec.dataset.dec : inc.dataset.inc);
        const i = Math.floor(k / S.obs[0].length), j = k % S.obs[0].length;
        S.obs[i][j] = Math.max(0, S.obs[i][j] + (inc ? 1 : -1));
        draw();
      } else if (td) {
        const k = +td.dataset.i;
        const i = Math.floor(k / S.obs[0].length), j = k % S.obs[0].length;
        const v = prompt("输入第 " + (i + 1) + " 行第 " + (j + 1) + " 列的新频数：", S.obs[i][j]);
        if (v !== null && isFinite(+v) && +v >= 0) { S.obs[i][j] = Math.round(+v); draw(); }
      }
    });

    draw();
  }
});

/* ==========================================================
   模块 9 · 样本量与统计功效计算器
   ========================================================== */
LAB.register({
  id: "power",
  render(root) {
    const S = { d: 0.5, n: 64, alpha: 0.05, tail: "two", target: 0.80, design: "two" };

    /** 两独立样本 t 检验的功效（正态近似） */
    function power2(d, n, alpha, tail) {
      const df = 2 * n - 2;
      if (df < 1) return 0;
      const delta = d * Math.sqrt(n / 2);
      const tc = tail === "two" ? ST.tInv(1 - alpha / 2, df) : ST.tInv(1 - alpha, df);
      return tail === "two"
        ? Math.min(1, ST.normalCDF(delta - tc) + ST.normalCDF(-delta - tc))
        : Math.min(1, ST.normalCDF(delta - tc));
    }
    /** 单样本 t 检验的功效 */
    function power1(d, n, alpha, tail) {
      const df = n - 1;
      if (df < 1) return 0;
      const delta = d * Math.sqrt(n);
      const tc = tail === "two" ? ST.tInv(1 - alpha / 2, df) : ST.tInv(1 - alpha, df);
      return tail === "two"
        ? Math.min(1, ST.normalCDF(delta - tc) + ST.normalCDF(-delta - tc))
        : Math.min(1, ST.normalCDF(delta - tc));
    }
    const powerOf = (n) => S.design === "two" ? power2(S.d, n, S.alpha, S.tail) : power1(S.d, n, S.alpha, S.tail);

    /** 反推所需样本量 */
    function nFor(target) {
      for (let n = 2; n <= 20000; n++) {
        if (powerOf(n) >= target) return n;
      }
      return null;
    }

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">研究设计参数</div>' +
      U.ctrl({
        label: "检验类型",
        body: '<div class="chips" id="pwDesign">' +
          '<button class="chip active" data-v="two">两独立样本 t 检验</button>' +
          '<button class="chip" data-v="one">单样本 t 检验</button></div>'
      }) +
      U.ctrl({
        label: "预期效应量 d", valHtml: '<span id="pwD"></span>',
        body: '<input type="range" id="pwDR" min="0.05" max="1.5" step="0.05" value="0.5">' + U.chips("pwDC", [{ v: 0.2, t: "0.2 小" }, { v: 0.5, t: "0.5 中" }, { v: 0.8, t: "0.8 大" }, { v: 1.2, t: "1.2 很大" }]),
        note: "效应量应来自<b>前人研究或预实验</b>，不能随便拍。它是最难确定、也最影响计算结果的一个参数。"
      }) +
      U.ctrl({ label: "显著性水平 α", valHtml: '<span id="pwA"></span>', body: U.chips("pwAC", [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]) }) +
      U.ctrl({ label: "检验方向", valHtml: '<span id="pwT"></span>', body: '<div class="chips" id="pwTC"><button class="chip active" data-v="two">双尾</button><button class="chip" data-v="one">单尾</button></div>', note: "单尾检验功效更高，但方向必须事先确定。" }) +
      U.ctrl({ label: "目标功效 (1 − β)", valHtml: '<span id="pwTarget"></span>', body: U.chips("pwTargetC", [{ v: 0.70, t: "0.70" }, { v: 0.80, t: "0.80" }, { v: 0.90, t: "0.90" }, { v: 0.95, t: "0.95" }]), note: "学术惯例是 0.80，即「真的有 0.5 个标准差的效应时，有 80% 的把握检测出来」。" }) +
      U.ctrl({ label: "当前每组样本量", valHtml: '<span id="pwN"></span>', body: U.stepper("pwNM", "pwNP") + '<input type="range" id="pwNR" min="4" max="800" step="1" value="64">' + U.chips("pwNC", [10, 20, 30, 64, 128, 300]) }) +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>H₀ 与 H₁ 两个分布：α 与 β 的空间</h2><span class="spacer"></span>' +
      '<span class="badge" id="pwBadge"></span></div>' +
      '<div class="stage"><svg id="pwChart1"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "H₀ 为真时的分布（无效应）", dot: false },
        { c: "var(--g5)", t: "H₁ 为真时的分布（有效应）", dot: false },
        { c: "rgba(247,37,133,.34)", t: "α：第一类错误（误报）", dot: false },
        { c: "rgba(255,183,3,.34)", t: "β：第二类错误（漏报）", dot: false },
        { c: "rgba(61,220,151,.30)", t: "1 − β：功效", dot: false }
      ]) +
      '<div class="narr" id="pwNarr"></div>' +
      "</div>" +
      '<div class="card"><div class="card-h"><h2>功效曲线：样本量与功效的关系</h2></div>' +
      '<div class="stage"><svg id="pwChart2"></svg></div>' +
      U.hints(["<b>蓝色曲线</b> = 当前效应量下的功效随 n 的变化", "<b>黄线</b> = 目标功效", "<b>圆点</b> = 当前样本量"]) +
      "</div>" +
      '<div class="readouts" id="pwOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>达到目标功效需要多少样本</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>目标功效</th><th>每组所需 n</th><th>总样本量</th><th>相对 0.80</th></tr></thead><tbody id="pwTable"></tbody></table></div>' +
      '<div class="note mt10">样本量随效应量减小而<b>急剧</b>增长——注意观察上表里 d 从 0.5 降到 0.3 时 n 变成了几倍。</div></section>' +
      '<section class="card"><div class="card-h"><h2>为什么很多实验测不出效果</h2></div>' +
      '<div id="pwWhy"></div></section>' +
      '<section class="card"><div class="card-h"><h2>报告功效分析的标准写法</h2></div>' +
      '<div class="subst" id="pwApa"></div>' +
      '<div class="note mt10">在方法部分必须说明：<b>用了什么检验、预期效应量是多少（依据来源）、α 与目标功效、最终所需样本量</b>。这不只是为了形式规范——它决定你的研究有没有可能发现真实效应。</div></section>' +
      "</div>";

    const ids = ["pwDesign", "pwD", "pwDR", "pwDC", "pwA", "pwAC", "pwT", "pwTC", "pwTarget", "pwTargetC",
      "pwN", "pwNM", "pwNP", "pwNR", "pwNC", "pwBadge", "pwChart1", "pwChart2", "pwNarr", "pwOut",
      "pwTable", "pwWhy", "pwApa"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.pwDC.innerHTML = [{ v: 0.2, t: "0.2 小" }, { v: 0.5, t: "0.5 中" }, { v: 0.8, t: "0.8 大" }, { v: 1.2, t: "1.2 很大" }]
      .map(o => '<button class="chip" data-v="' + o.v + '">' + o.t + "</button>").join("");
    E.pwAC.innerHTML = [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]
      .map(o => '<button class="chip' + (o.v === 0.05 ? " active" : "") + '" data-v="' + o.v + '">' + o.t + "</button>").join("");
    E.pwTargetC.innerHTML = [0.70, 0.80, 0.90, 0.95].map(v => '<button class="chip' + (v === 0.80 ? " active" : "") + '" data-v="' + v + '">' + v.toFixed(2) + "</button>").join("");
    E.pwNC.innerHTML = [10, 20, 30, 64, 128, 300].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");

    function draw() {
      const pw = powerOf(S.n);
      E.pwD.textContent = U.F.num(S.d, 2);
      E.pwA.textContent = "." + String(S.alpha).replace(/^0\./, "");
      E.pwT.textContent = S.tail === "two" ? "双尾" : "单尾";
      E.pwTarget.textContent = S.target.toFixed(2);
      E.pwN.textContent = S.n;
      U.$$("#pwDC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.d));
      U.$$("#pwAC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.alpha));
      U.$$("#pwTC button").forEach(b => b.classList.toggle("active", b.dataset.v === S.tail));
      U.$$("#pwTargetC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.target));
      U.$$("#pwNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      U.$$("#pwDesign button").forEach(b => b.classList.toggle("active", b.dataset.v === S.design));

      const crit = S.tail === "two" ? ST.normalInv(1 - S.alpha / 2) : ST.normalInv(1 - S.alpha);
      const shift = S.design === "two" ? S.d * Math.sqrt(S.n / 2) : S.d * Math.sqrt(S.n);
      const xr = Math.max(4.5, Math.abs(crit) + shift + 2);

      const p = U.makePlot({ W: 880, H: 300, xr: [-xr, xr], yr: [0, 1] });
      const h0 = x => ST.normalPDF(x, 0, 1);
      const h1 = x => ST.normalPDF(x, shift, 1);
      p.autoY(x => Math.max(h0(x), h1(x)), -xr, xr, 1.14).bg().grid(1, 0)
        .axes({ xLabel: "检验统计量（标准化后）", yLabel: "密度", stepX: 1 });

      // α 区域
      if (S.tail === "two") {
        p.area(-xr, -crit, h0, { fill: "rgba(247,37,133,.34)", stroke: "rgba(247,37,133,.9)" });
        p.area(crit, xr, h0, { fill: "rgba(247,37,133,.34)", stroke: "rgba(247,37,133,.9)" });
        // β 区域
        p.area(-crit, crit, h1, { fill: "rgba(255,183,3,.34)", stroke: "rgba(255,183,3,.9)" });
        // power 区域
        p.area(crit, xr, h1, { fill: "rgba(61,220,151,.30)", stroke: "rgba(61,220,151,.9)" });
      } else {
        p.area(crit, xr, h0, { fill: "rgba(247,37,133,.34)", stroke: "rgba(247,37,133,.9)" });
        p.area(-xr, crit, h1, { fill: "rgba(255,183,3,.34)", stroke: "rgba(255,183,3,.9)" });
        p.area(crit, xr, h1, { fill: "rgba(61,220,151,.30)", stroke: "rgba(61,220,151,.9)" });
      }
      p.line(h0, { stroke: "var(--g1)", width: 2.4 });
      p.line(h1, { stroke: "var(--g5)", width: 2.4, dash: "7 4" });
      p.vline(crit, { stroke: "var(--g4)", dash: "4 3", label: "临界值" });
      if (S.tail === "two") p.vline(-crit, { stroke: "var(--g4)", dash: "4 3" });
      p.ptext(p.x(0), p.M.t + 16, "H₀ 分布", { fill: "var(--g1)", size: 11.5, mono: true, anchor: "middle" });
      p.ptext(Math.min(p.x(shift), p.M.l + p.PW - 40), p.M.t + 16 + 0, "H₁ 分布", { fill: "var(--g5)", size: 11.5, mono: true, anchor: "middle", dy: 14 });
      p.mount(E.pwChart1);

      E.pwBadge.className = "badge " + (pw >= 0.8 ? "ok" : pw >= 0.5 ? "warn" : "danger");
      E.pwBadge.textContent = "功效 = " + U.F.num(pw, 3);

      /* ---- 功效曲线 ---- */
      const p2 = U.makePlot({ W: 880, H: 260, xr: [0, 1], yr: [0, 1] });
      const nmax = Math.max(200, Math.min(2000, S.n * 2.5));
      p2.setX(0, nmax).setY(0, 1.05).bg().grid(0, 0).axes({ xLabel: "每组样本量 n", yLabel: "功效 1−β", stepX: U.niceStep(nmax), stepY: 0.2 });
      // 目标线
      p2.hline(S.target, { stroke: "var(--g2)", dash: "5 4" });
      p2.ptext(p2.M.l + p2.PW - 6, p2.y(S.target) - 6, "目标 " + S.target.toFixed(2), { fill: "var(--g2)", size: 11.5, mono: true, anchor: "end" });
      // 0.8 参考
      p2.hline(0.8, { stroke: "var(--fg-faint)", dash: "2 5" });
      // 功效曲线
      p2.line(n => powerOf(Math.max(2, Math.round(n))), { x0: 2, x1: nmax, n: 300, stroke: "url(#lgA)", width: 2.8 });
      // 当前点
      if (S.n <= nmax) {
        p2.dot(S.n, pw, { stroke: "var(--g2)", r: 5.5 });
        p2.vline(S.n, { stroke: "rgba(255,255,255,.35)", dash: "3 4" });
      }
      p2.mount(E.pwChart2);

      /* ---- 读数 ---- */
      const need80 = nFor(0.80), needTarget = nFor(S.target);
      E.pwOut.innerHTML = U.readouts([
        { k: "预期效应量 d", v: U.F.num(S.d, 2), mini: U.F.effect(S.d, "d") + "效应" },
        { k: "每组样本量", v: S.n, mini: S.design === "two" ? "总计 " + 2 * S.n + " 人" : "共 " + S.n + " 人" },
        { k: "当前功效", v: U.F.num(pw, 3), hi: true, cls: pw >= 0.8 ? "hi ok" : "hi warn", mini: (pw * 100).toFixed(0) + "% 的把握检出" },
        { k: "第二类错误 β", v: U.F.num(1 - pw, 3), mini: "漏报概率" },
        { k: "非中心参数 δ", v: U.F.num(shift, 3), mini: S.design === "two" ? "d·√(n/2)" : "d·√n" },
        { k: "达标所需 n", v: needTarget === null ? ">20000" : needTarget, hi: true, mini: "每组，功效 " + S.target.toFixed(2) },
        { k: "0.80 所需 n", v: need80 === null ? ">20000" : need80, mini: "学界惯例线" },
        { k: "当前是否达标", v: pw >= S.target ? "是" : "否", cls: pw >= S.target ? "ok" : "danger" }
      ]);

      /* ---- 表格 ---- */
      const base80 = need80 || 1;
      E.pwTable.innerHTML = [0.70, 0.80, 0.90, 0.95].map(tg => {
        const nn = nFor(tg);
        return "<tr" + (Math.abs(tg - S.target) < 1e-9 ? ' style="color:var(--acc);font-weight:600"' : "") + '><td class="tx">' + tg.toFixed(2) + "</td><td>" +
          (nn === null ? "&gt;20000" : nn) + "</td><td>" + (nn === null ? "—" : (S.design === "two" ? 2 * nn : nn)) + "</td><td>" +
          (nn === null ? "—" : U.F.num(nn / base80, 2) + "×") + "</td></tr>";
      }).join("");

      /* ---- 为什么测不出 ---- */
      const small = nFor(0.5), smaller = nFor(0.3);
      E.pwWhy.innerHTML =
        "<p class='fs13 mut'>传播学实验的常见样本量是每组 20–30 人。看看这够不够：</p>" +
        '<div class="kv">' +
        '<div class="k">d = 0.8（大效应），n = 26</div><div class="v">功效 ' + U.F.num(powerOf(26) * 0 + power2(0.8, 26, 0.05, "two"), 2) + "</div>" +
        '<div class="k">d = 0.5（中效应），n = 26</div><div class="v">功效 ' + U.F.num(power2(0.5, 26, 0.05, "two"), 2) + "</div>" +
        '<div class="k">d = 0.3（小效应），n = 26</div><div class="v">功效 ' + U.F.num(power2(0.3, 26, 0.05, "two"), 2) + "</div>" +
        "</div>" +
        '<div class="callout danger mt10"><span class="ttl">这就是可重复性危机的算术根源</span>' +
        "若真实效应是中等（d = 0.5）而每组只有 26 人，功效不足 0.4——意味着<b>即使效应真实存在，也有六成概率检测不出来</b>。<br><br>" +
        "更糟的是幸存者偏差：那些碰巧测出显著的小样本研究被发表了，测不出的被压在抽屉里。于是文献里充斥着被高估的效应量，后续研究按这些虚高的 d 去算样本量，又继续低估所需人数。</div>" +
        '<div class="callout info mt10"><span class="ttl">所需样本量参考（d = 0.5，双尾，α = .05）</span>' +
        "功效 .70 → 每组 <b>" + nFor(0.70) + "</b> 人<br>功效 .80 → 每组 <b>" + small + "</b> 人<br>功效 .90 → 每组 <b>" + nFor(0.90) + "</b> 人<br>" +
        "若效应只有 d = 0.3，功效 .80 则需要每组 <b>" + smaller + "</b> 人。</div>";

      /* ---- APA 写法 ---- */
      const need = needTarget === null ? ">20000" : needTarget;
      E.pwApa.innerHTML =
        "<div>先验功效分析采用 G*Power 类方法，检验类型为" + (S.design === "two" ? "两独立样本 t 检验" : "单样本 t 检验") + "。</div>" +
        "<div>预期效应量设定为 <b>d = " + U.F.num(S.d, 2) + "</b>（依据：既有文献报告的范围）。</div>" +
        "<div>显著性水平 α = <b>" + S.alpha + "</b>（" + (S.tail === "two" ? "双尾" : "单尾") + "），目标功效 1 − β = <b>" + S.target.toFixed(2) + "</b>。</div>" +
        "<div>计算结果：每组需 <b>" + need + "</b> 名被试" + (S.design === "two" ? "，合计 " + (need === null ? ">40000" : need * 2) + " 人" : "") + "。</div>" +
        "<div>实际招募 " + S.n + " 人" + (S.design === "two" ? "（每组）" : "") + "，对应实际功效为 <b>" + U.F.num(pw, 3) + "</b>。</div>";
    }

    /* ---- 事件 ---- */
    E.pwDR.oninput = () => { S.d = +E.pwDR.value; draw(); };
    E.pwDC.onclick = e => { const b = e.target.closest("button"); if (b) { S.d = +b.dataset.v; E.pwDR.value = S.d; draw(); } };
    E.pwAC.onclick = e => { const b = e.target.closest("button"); if (b) { S.alpha = +b.dataset.v; draw(); } };
    E.pwTC.onclick = e => { const b = e.target.closest("button"); if (b) { S.tail = b.dataset.v; draw(); } };
    E.pwTargetC.onclick = e => { const b = e.target.closest("button"); if (b) { S.target = +b.dataset.v; draw(); } };
    const setN = v => { S.n = Math.max(3, Math.min(2000, Math.round(v))); E.pwNR.value = S.n; draw(); };
    E.pwNM.onclick = () => setN(S.n - 1);
    E.pwNP.onclick = () => setN(S.n + 1);
    E.pwNR.oninput = () => setN(+E.pwNR.value);
    E.pwNC.onclick = e => { const b = e.target.closest("button"); if (b) setN(+b.dataset.v); };
    E.pwDesign.onclick = e => { const b = e.target.closest("button"); if (b) { S.design = b.dataset.v; draw(); } };

    draw();
  }
});

})();
