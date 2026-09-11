/* =========================================================
   lab-set6.js — 互动模块（六）
     · nonparam     参数 vs 非参数对决
     · reliability  信度检验实验室（Cronbach's α）
     · sampling     抽样方法对比沙盘
     · data-lab     数据集与描述统计工作台
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

/* ==========================================================
   模块 12 · 参数 vs 非参数对决
   ========================================================== */
LAB.register({
  id: "nonparam",
  render(root) {
    const S = { n: 6, gap: 1.0, outlier: 8.0, alpha: 0.05, seed: 20260911, showRank: true };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">数据设定</div>' +
      U.ctrl({ label: "每组样本量 n", valHtml: '<span id="npN"></span>', body: U.stepper("npNM", "npNP") + U.chips("npNC", [4, 6, 8, 12, 20, 30]) }) +
      U.ctrl({
        label: "两组真实差异", valHtml: '<span id="npGap"></span>',
        body: '<input type="range" id="npGapR" min="0" max="200" step="5" value="100">',
        note: "真实差异越大，两种检验越容易同时检出。"
      }) +
      U.ctrl({
        label: "极端值大小", valHtml: '<span id="npOut"></span>',
        body: '<input type="range" id="npOutR" min="0" max="200" step="5" value="80">',
        note: "往右拉，在最极端的那组末尾塞进一个极大的值。<br><b>看 t 检验的 p 值如何被这一个点拖垮，而 Mann-Whitney 几乎不受影响。</b>"
      }) +
      U.ctrl({ label: "显著性水平 α", valHtml: '<span id="npAlpha"></span>', body: U.chips("npAlphaC", [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]) }) +
      U.ctrl({ label: "显示选项", body: U.sw("npRank", "显示秩变换后的排布", true) }) +
      '<div class="row mt14"><button class="btn primary block" id="npNew">重新生成数据</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>两组数据的分布</h2><span class="spacer"></span><span class="badge" id="npBadge"></span></div>' +
      '<div class="stage"><svg id="npChart1"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "A 组（深度长文）", dot: false },
        { c: "var(--g3)", t: "B 组（短平快资讯）", dot: false },
        { c: "var(--g2)", t: "组均值（t 检验看的量）", dot: false },
        { c: "var(--g4)", t: "组中位数（Mann-Whitney 看的量）", dot: false }
      ]) +
      "</div>" +
      '<div class="card"><div class="card-h"><h2>秩变换：非参数方法看到了什么</h2></div>' +
      '<div class="stage"><svg id="npChart2"></svg></div>' +
      '<div class="narr" id="npNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="npOut2"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>两种检验的正面对比</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>项目</th><th>独立样本 t 检验</th><th>Mann-Whitney U</th></tr></thead><tbody id="npCompare"></tbody></table></div>' +
      "</section>" +
      '<section class="card"><div class="card-h"><h2>该怎么选</h2></div>' +
      '<div class="note mb12">很多人以为「数据不正态就必须用非参数」，这是<b>过度保守</b>。判断顺序应该是：</div>' +
      '<div class="prose fs14" style="max-width:none">' +
      "<ol style=\"padding-left:20px;margin:0 0 10px\">" +
      "<li><b>先看样本量</b>：每组 ≥ 30 时，中心极限定理保证 t 检验可用，功效还更高。</li>" +
      "<li><b>再看分布偏度与极端值</b>：只有 1–2 个极端值且样本量小时，非参数优势明显。</li>" +
      "<li><b>最后看数据性质</b>：只有等级信息（如「最受欢迎账号排名」）时，只能用非参数。</li>" +
      "</ol>" +
      '<p class="callout info mb0"><span class="ttl">代价要清楚</span>秩变换把 «1, 2, 3, 1000» 变成 «1, 2, 3, 4»——极端值的影响被抹平，这既是优点也是缺点。如果数据本身是可靠的等距测量，用非参数等于主动降低精度，通常需要多 5%–15% 的样本才能达到同等功效。</p>' +
      "</div></section>" +
      "</div>";

    const ids = ["npN", "npNM", "npNP", "npNC", "npGap", "npGapR", "npOut", "npOutR", "npAlpha",
      "npAlphaC", "npRank", "npNew", "npBadge", "npChart1", "npChart2", "npNarr", "npOut2", "npCompare"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.npNC.innerHTML = [4, 6, 8, 12, 20, 30].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.npAlphaC.innerHTML = [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]
      .map(o => '<button class="chip' + (o.v === 0.05 ? " active" : "") + '" data-v="' + o.v + '">' + o.t + "</button>").join("");

    let A = [], B = [];
    function gen() {
      const rng = new ST.RNG(S.seed);
      const n = S.n;
      A = []; B = [];
      for (let i = 0; i < n; i++) {
        A.push(+(2.1 + rng.normal(0, 1.35) + S.gap * 0.55).toFixed(2));
        B.push(+(2.1 + rng.normal(0, 1.35)).toFixed(2));
      }
      // 极端值只加在 A 组
      if (S.outlier > 0) A[A.length - 1] = +(A[A.length - 1] + S.outlier).toFixed(2);
    }

    function draw() {
      E.npN.textContent = S.n;
      E.npGap.textContent = U.F.num(S.gap, 2) + "σ";
      E.npOut.textContent = "+" + U.F.num(S.outlier, 1);
      E.npAlpha.textContent = "." + String(S.alpha).replace(/^0\./, "");
      U.$$("#npNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      U.$$("#npAlphaC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.alpha));

      const t = ST.tTest2(A, B, true);
      const mw = ST.mannWhitney(A, B);
      const all = A.concat(B);
      const ranks = ST.ranks(all);

      const lo = Math.min.apply(null, all) - 0.8, hi = Math.max.apply(null, all) + 0.8;

      /* ---- 图 1：两组分布 ---- */
      const p = U.makePlot({ W: 880, H: 280, xr: [lo, hi], yr: [0, 1], margin: { l: 84, r: 26, t: 28, b: 44 } });
      const laneH = p.PH / 2;
      p.raw('<rect x="' + p.M.l + '" y="' + p.M.t + '" width="' + p.PW + '" height="' + p.PH + '" fill="' + U.cvar("--card-2", "rgba(255,255,255,.02)") + '" rx="6" opacity=".5"/>');
      const gs = U.niceStep(hi - lo);
      for (let v = Math.ceil(lo / gs) * gs; v <= hi + 1e-9; v += gs) {
        p.raw('<line x1="' + p.x(v).toFixed(1) + '" y1="' + p.M.t + '" x2="' + p.x(v).toFixed(1) + '" y2="' + (p.M.t + p.PH) + '" stroke="' + U.cvar("--line-soft", "rgba(255,255,255,.055)") + '"/>');
        p.raw('<text x="' + p.x(v).toFixed(1) + '" y="' + (p.M.t + p.PH + 20) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="11.5" font-family="monospace" text-anchor="middle">' + (+v.toFixed(4)) + "</text>");
      }
      p.raw('<text x="' + (p.M.l + p.PW) + '" y="' + (p.M.t + p.PH + 40) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="12" text-anchor="end">影响力增长（万）</text>');

      [[A, 0, "A 组", "var(--g1)"], [B, 1, "B 组", "var(--g3)"]].forEach(([g, idx, nm, col]) => {
        const cy = p.M.t + laneH * (idx + 0.5);
        // 箱体
        const bs = ST.boxStats(g);
        const bh = laneH * 0.34;
        p.raw('<rect x="' + p.x(bs.q1).toFixed(1) + '" y="' + (cy - bh / 2).toFixed(1) + '" width="' + (p.x(bs.q3) - p.x(bs.q1)).toFixed(1) +
          '" height="' + bh.toFixed(1) + '" fill="' + col + '" opacity=".16" stroke="' + col + '" stroke-width="1.3" rx="3"/>');
        p.raw('<line x1="' + p.x(bs.whiskerLo).toFixed(1) + '" y1="' + cy.toFixed(1) + '" x2="' + p.x(bs.whiskerHi).toFixed(1) + '" y2="' + cy.toFixed(1) + '" stroke="' + col + '" stroke-width="1.3" opacity=".7"/>');
        // 散点
        g.forEach((v, j) => {
          const jit = ((j % 3) - 1) * laneH * 0.2;
          p.raw('<circle cx="' + p.x(v).toFixed(1) + '" cy="' + (cy + jit).toFixed(1) + '" r="4" fill="' + col + '" opacity=".55"/>');
        });
        // 均值
        const m = ST.mean(g);
        p.raw('<line x1="' + p.x(m).toFixed(1) + '" y1="' + (cy - bh).toFixed(1) + '" x2="' + p.x(m).toFixed(1) + '" y2="' + (cy + bh).toFixed(1) + '" stroke="var(--g2)" stroke-width="3" stroke-linecap="round"/>');
        p.ptext(p.x(m), cy - bh - 6, "x̄ " + U.F.num(m, 2), { fill: "var(--g2)", size: 11, mono: true, anchor: "middle" });
        // 中位数
        const md = ST.median(g);
        p.raw('<line x1="' + p.x(md).toFixed(1) + '" y1="' + (cy - bh).toFixed(1) + '" x2="' + p.x(md).toFixed(1) + '" y2="' + (cy + bh).toFixed(1) + '" stroke="var(--g4)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 2"/>');
        p.ptext(p.x(md), cy + bh + 14, "Md " + U.F.num(md, 2), { fill: "var(--g4)", size: 10.5, mono: true, anchor: "middle" });
        p.ptext(p.M.l - 12, cy + 4, nm, { fill: U.cvar("--fg-dim", "#c6cee2"), size: 12.5, anchor: "end" });
      });
      p.mount(E.npChart1);

      /* ---- 图 2：秩变换 ---- */
      const p2 = U.makePlot({ W: 880, H: 200, xr: [0, 1], yr: [0, 1], margin: { l: 84, r: 26, t: 24, b: 40 } });
      const nTot = all.length;
      p2.setX(0, nTot + 1).setY(0, 2);
      p2.raw('<rect x="' + p2.M.l + '" y="' + p2.M.t + '" width="' + p2.PW + '" height="' + p2.PH + '" fill="' + U.cvar("--card-2", "rgba(255,255,255,.02)") + '" rx="6" opacity=".5"/>');
      // 排序后的原始值位置
      const order = all.map((v, i) => ({ v, i, r: ranks[i] })).sort((a, b) => a.v - b.v);
      order.forEach((o, pos) => {
        const isA = o.i < A.length;
        const col = isA ? "var(--g1)" : "var(--g3)";
        const px = p2.M.l + (pos + 0.5) / nTot * p2.PW;
        p2.raw('<circle cx="' + px.toFixed(1) + '" cy="' + (p2.M.t + 18) + '" r="6" fill="' + col + '" opacity=".6"/>');
        p2.raw('<text x="' + px.toFixed(1) + '" y="' + (p2.M.t + 22) + '" fill="' + U.cvar("--bg", "#0a0e18") + '" font-size="9.5" font-family="monospace" text-anchor="middle">' + (pos + 1) + "</text>");
        p2.raw('<line x1="' + px.toFixed(1) + '" y1="' + (p2.M.t + 28) + '" x2="' + px.toFixed(1) + '" y2="' + (p2.M.t + 68) + '" stroke="' + col + '" stroke-width="1.4" opacity=".5"/>');
        p2.raw('<text x="' + px.toFixed(1) + '" y="' + (p2.M.t + 84) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="10" font-family="monospace" text-anchor="middle">' + U.F.num(o.v, 1) + "</text>");
      });
      p2.ptext(p2.M.l - 12, p2.M.t + 24, "秩", { fill: U.cvar("--fg-dim", "#c6cee2"), size: 12, anchor: "end" });
      p2.ptext(p2.M.l - 12, p2.M.t + 88, "原始值", { fill: U.cvar("--fg-dim", "#c6cee2"), size: 12, anchor: "end" });
      p2.raw('<line x1="' + p2.M.l + '" y1="' + (p2.M.t + 46) + '" x2="' + (p2.M.l + p2.PW) + '" y2="' + (p2.M.t + 46) + '" stroke="' + U.cvar("--line-strong", "#4a5680") + '" stroke-dasharray="3 4"/>');
      p2.ptext(p2.M.l + 4, p2.M.t + p2.PH - 8, "把 8 个点按大小排成一列并编号——极端值「" + U.F.num(Math.max.apply(null, all), 1) + "」在这里只是「第 " + nTot + " 名」", { fill: U.cvar("--fg-faint", "#6f7b9b"), size: 11 });
      p2.mount(E.npChart2);

      /* ---- 读数 ---- */
      E.npBadge.className = "badge " + (t.p < S.alpha ? "danger" : "ok");
      E.npBadge.textContent = t.p < S.alpha ? "t 检验：拒绝 H₀" : "t 检验：不显著";

      E.npOut2.innerHTML = U.readouts([
        { k: "A 组均值", v: U.F.num(ST.mean(A), 3), mini: "被极端值拉高" },
        { k: "A 组中位数", v: U.F.num(ST.median(A), 3), hi: true, mini: "几乎不受影响" },
        { k: "B 组均值", v: U.F.num(ST.mean(B), 3) },
        { k: "B 组中位数", v: U.F.num(ST.median(B), 3) },
        { k: "t 检验 p", v: U.F.pApa(t.p), hi: true, cls: t.p < S.alpha ? "hi ok" : "hi danger", mini: "t = " + U.F.num(t.t, 2) },
        { k: "Mann-Whitney p", v: U.F.pApa(mw.p), hi: true, cls: mw.p < S.alpha ? "hi ok" : "hi danger", mini: "U = " + U.F.num(mw.U, 1) },
        { k: "两组秩均值", v: U.F.num(mw.rankMean1, 1) + " vs " + U.F.num(mw.rankMean2, 1), mini: "差距越大越显著" },
        { k: "A 组标准差", v: U.F.num(ST.sd(A), 2), cls: "warn", mini: "被单个极端值抬高" }
      ]);

      /* ---- 对比表 ---- */
      const agree = (t.p < S.alpha) === (mw.p < S.alpha);
      E.npCompare.innerHTML =
        "<tr><td class='tx'>检验假设</td><td>两组均值相等</td><td>两组来自同一分布</td></tr>" +
        "<tr><td class='tx'>用到的信息</td><td>全部数值的大小</td><td>只有大小顺序（秩）</td></tr>" +
        "<tr><td class='tx'>统计量</td><td>" + U.F.num(t.t, 3) + "（t 值）</td><td>" + U.F.num(mw.U, 2) + "（U 值）</td></tr>" +
        "<tr><td class='tx'>p 值</td><td style='color:" + (t.p < S.alpha ? "var(--ok)" : "var(--fs-mut)") + "'>" + U.F.pApa(t.p) + "</td><td style='color:" + (mw.p < S.alpha ? "var(--ok)" : "var(--fg-mut)") + "'>" + U.F.pApa(mw.p) + "</td></tr>" +
        "<tr><td class='tx'>结论</td><td>" + (t.p < S.alpha ? "显著" : "不显著") + "</td><td>" + (mw.p < S.alpha ? "显著" : "不显著") + "</td></tr>" +
        "<tr><td class='tx'>对极端值的敏感度</td><td style='color:var(--danger)'>高</td><td style='color:var(--ok)'>低</td></tr>" +
        "<tr><td class='tx'>两组结论是否一致</td><td colspan='2' style='text-align:center;color:" + (agree ? "var(--ok)" : "var(--warn)") + "'>" + (agree ? "一致" : "<b>分歧！</b>") + "</td></tr>";

      /* ---- 叙述 ---- */
      E.npNarr.innerHTML =
        "把 " + (A.length + B.length) + " 个观测按大小排序并编号（1 到 " + (A.length + B.length) + "）。<br>" +
        "A 组的秩均值是 <b>" + U.F.num(mw.rankMean1, 2) + "</b>，B 组是 <b>" + U.F.num(mw.rankMean2, 2) + "</b>。" +
        (agree
          ? " 两种检验结论一致。"
          : " <b>两种检验结论不一致：</b>t 检验" + (t.p < S.alpha ? "显著" : "不显著") + "，Mann-Whitney " + (mw.p < S.alpha ? "显著" : "不显著") + "。" +
          (t.p >= S.alpha && mw.p < S.alpha ? " 原因就在那个极端值：它把 A 组的均值与标准差一起抬高，t 检验的「信号/噪音比」被稀释；而秩变换只把那个点记为「第 1 名」，完全不受它有多大的影响。" : "")) +
        (S.outlier >= 60 ? " 试着把「极端值大小」滑块拉回 0，两种检验的差距会立刻缩小。" : "");
    }

    E.npNM.onclick = () => { S.n = Math.max(3, S.n - 1); gen(); draw(); };
    E.npNP.onclick = () => { S.n = Math.min(60, S.n + 1); gen(); draw(); };
    E.npNC.onclick = e => { const b = e.target.closest("button"); if (b) { S.n = +b.dataset.v; gen(); draw(); } };
    E.npGapR.oninput = () => { S.gap = +E.npGapR.value / 100; gen(); draw(); };
    E.npOutR.oninput = () => { S.outlier = +E.npOutR.value / 10; gen(); draw(); };
    E.npAlphaC.onclick = e => { const b = e.target.closest("button"); if (b) { S.alpha = +b.dataset.v; draw(); } };
    E.npNew.onclick = () => { S.seed = (S.seed * 7919 + 13) % 2147483647; gen(); draw(); };

    gen(); draw();
  }
});

/* ==========================================================
   模块 13 · 信度检验实验室
   ========================================================== */
LAB.register({
  id: "reliability",
  render(root) {
    const S = { k: 8, n: 60, rho: 0.45, reverse: true, seed: 424242, drop: -1 };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">量表设定</div>' +
      U.ctrl({ label: "题项数 k", valHtml: '<span id="rlK"></span>', body: U.stepper("rlKM", "rlKP") + U.chips("rlKC", [4, 6, 8, 10, 12, 16]) }) +
      U.ctrl({ label: "被试人数 n", valHtml: '<span id="rlN"></span>', body: U.stepper("rlNM", "rlNP") + U.chips("rlNC", [30, 60, 100, 200]) }) +
      U.ctrl({
        label: "题项间真实相关强度", valHtml: '<span id="rlRho"></span>',
        body: '<input type="range" id="rlRhoR" min="0" max="80" step="1" value="45">',
        note: "题项之间相关越高，量表越一致，α 越高。真实研究中这个值通常在 0.3–0.5 之间。"
      }) +
      U.ctrl({
        label: "反向计分处理",
        body: U.sw("rlRev", "已正确处理反向题（第 6 题）", true),
        note: "<b>关掉它</b>试试——忘记反转反向题是实操中最常见的低级错误，会让 α 大打折扣。"
      }) +
      '<div class="ctrl"><button class="btn block" id="rlNew">重新生成作答数据</button></div>' +
      '<div class="ctrl"><div class="note">点击右侧表格的列标题，可以模拟「删除该题」后的效果。</div></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>项目分析</h2><span class="spacer"></span><span class="badge" id="rlBadge"></span></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="rlTable"></table></div>' +
      '<div class="note">判定要点：① 校正后项目—总分相关 &lt; <b>0.30</b> 的题目考虑删除；② 「删除后 α」明显<b>高于</b>当前 α 的题目应当删除。</div>' +
      "</div>" +
      '<div class="card"><div class="card-h"><h2>删除各题后的 α 变化</h2></div>' +
      '<div class="stage"><svg id="rlChart"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "删除该题后的 α" },
        { c: "var(--g2)", t: "当前完整量表的 α", dot: false },
        { c: "var(--g3)", t: "低于 0.70 可接受线", dot: false }
      ]) +
      '<div class="narr" id="rlNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="rlOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>α 的检验标准</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>α 范围</th><th>评价</th><th>建议</th></tr></thead><tbody>' +
      '<tr><td class="tx">≥ 0.90</td><td style="color:var(--ok)">优秀</td><td>注意题目是否过于同质</td></tr>' +
      '<tr><td class="tx">0.80 – 0.90</td><td style="color:var(--ok)">良好</td><td>可直接使用</td></tr>' +
      '<tr><td class="tx">0.70 – 0.80</td><td>可接受</td><td>检查是否有可删题目</td></tr>' +
      '<tr><td class="tx">0.60 – 0.70</td><td style="color:var(--warn)">勉强</td><td>需修订或删题</td></tr>' +
      '<tr><td class="tx">&lt; 0.60</td><td style="color:var(--danger)">不可用</td><td>重新编制量表</td></tr>' +
      "</tbody></table></div>" +
      '<div class="note mt10">这些是<b>经验阈值</b>，不是铁律。短量表（少于 5 题）可以接受更低的 α。</div></section>' +
      '<section class="card"><div class="card-h"><h2>α 的三个常见误区</h2></div>' +
      '<div class="callout danger"><span class="ttl">误区一：α 高就说明量表好</span>' +
      "α 高只说明题目之间相关强，<b>不保证量表测的是你想测的东西</b>。α 是信度指标，不是效度指标。</div>" +
      '<div class="callout warn mt10"><span class="ttl">误区二：α 高就说明是单维的</span>' +
      "这是最严重的误用。若量表含两个高度相关的子维度，α 同样可以高达 0.9。必须做因子分析确认结构。</div>" +
      '<div class="callout info mt10"><span class="ttl">误区三：为了提 α 拼命删题</span>' +
      "删题确实能提高 α，但被删掉的往往正是覆盖构念其他维度的题目。α 上去了，内容效度却塌了。</div></section>" +
      '<section class="card"><div class="card-h"><h2>信度与效度的关系</h2></div>' +
      '<div class="prose fs14" style="max-width:none">' +
      "<p><b>信度</b>＝测得稳不稳；<b>效度</b>＝测得准不准。</p>" +
      '<p class="callout purple"><span class="ttl">打靶比喻</span>' +
      "信度是弹着点集中，效度是命中靶心。<br>• 集中且命中 → 高信度高效度<br>• 集中但偏靶心 → <b>高信度低效度</b><br>• 分散但平均在靶心 → 低信度（效度也无从谈起）</p>" +
      '<p class="note mb0">信度是效度的<b>必要条件</b>，不是充分条件。低信度必然导致低效度，反之不成立。</p>' +
      "</div></section>" +
      "</div>";

    const ids = ["rlK", "rlKM", "rlKP", "rlKC", "rlN", "rlNM", "rlNP", "rlNC", "rlRho", "rlRhoR",
      "rlRev", "rlNew", "rlBadge", "rlTable", "rlChart", "rlNarr", "rlOut"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.rlKC.innerHTML = [4, 6, 8, 10, 12, 16].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.rlNC.innerHTML = [30, 60, 100, 200].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");

    let ITEMS = [];
    function gen() {
      const rng = new ST.RNG(S.seed);
      const k = S.k, n = S.n;
      const rho = S.rho / 100;
      // 生成一个潜变量，题目 = 潜变量载荷 + 独立噪音
      const load = Math.sqrt(rho);
      ITEMS = [];
      const rep = [];
      for (let i = 0; i < n; i++) {
        const theta = rng.normal(0, 1);
        const row = [];
        for (let j = 0; j < k; j++) {
          const z = load * theta + Math.sqrt(1 - rho) * rng.normal(0, 1);
          let v = Math.round(3.0 + z * 0.95);
          v = Math.max(1, Math.min(5, v));
          row.push(v);
        }
        // 第 6 题为反向题：真实作答应当反向
        if (k >= 6) row[5] = 6 - row[5];
        rep.push(row);
      }
      // 按设定决定是否「正确反转」
      ITEMS = rep.map(r => {
        const row = r.slice();
        if (k >= 6 && E.rlRev.checked) row[5] = 6 - row[5];  // 反转回来 = 正确计分
        return row;
      });
    }
    E.rlRev.checked = S.reverse;
    gen();

    function draw() {
      E.rlK.textContent = S.k; E.rlN.textContent = S.n;
      E.rlRho.textContent = U.F.num(S.rho / 100, 2);
      U.$$("#rlKC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.k));
      U.$$("#rlNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));

      const a = ST.cronbachAlpha(ITEMS);
      E.rlBadge.className = "badge " + (a.alpha >= 0.8 ? "ok" : a.alpha >= 0.7 ? "acc" : a.alpha >= 0.6 ? "warn" : "danger");
      E.rlBadge.textContent = "α = " + U.F.num(a.alpha, 4);

      /* ---- 项目分析表 ---- */
      let html = "<thead><tr><th>题项</th><th>均值</th><th>标准差</th><th>校正后项目—总分相关</th><th>删除后 α</th><th>是否建议删除</th></tr></thead><tbody>";
      for (let j = 0; j < S.k; j++) {
        const col = ITEMS.map(r => r[j]);
        const rIt = a.itemTotal[j];
        const aDel = a.alphaIfDeleted[j];
        const lowR = rIt < 0.30;
        const raiseA = aDel > a.alpha + 0.005;
        const drop = lowR || raiseA;
        html += '<tr' + (drop ? ' style="background:rgba(247,37,133,.06)"' : "") + '>' +
          '<td class="tx">第 ' + (j + 1) + " 题" + (j === 5 && S.k >= 6 ? ' <span class="badge warn">反向题</span>' : "") + "</td>" +
          "<td>" + U.F.num(ST.mean(col), 3) + "</td>" +
          "<td>" + U.F.num(ST.sd(col), 3) + "</td>" +
          '<td style="color:' + (lowR ? "var(--danger)" : "var(--ok)") + ';font-weight:600">' + U.F.num(rIt, 3) + "</td>" +
          '<td style="color:' + (raiseA ? "var(--danger)" : "var(--fg-dim)") + '">' + U.F.num(aDel, 4) + "</td>" +
          '<td style="color:' + (drop ? "var(--danger)" : "var(--fg-mut)") + '">' + (drop ? (lowR && raiseA ? "建议删除" : lowR ? "相关偏低" : "可提高 α") : "保留") + "</td>" +
          "</tr>";
      }
      html += "</tbody>";
      E.rlTable.innerHTML = html;

      /* ---- 柱状图 ---- */
      const p = U.makePlot({ W: 880, H: 260, xr: [0, 1], yr: [0, 1], margin: { l: 62, r: 26, t: 26, b: 48 } });
      p.setX(-0.6, S.k - 0.4);
      const allA = a.alphaIfDeleted.filter(isFinite).concat([a.alpha, 0.7]);
      p.setY(Math.max(0, Math.min.apply(null, allA) - 0.08), Math.min(1, Math.max.apply(null, allA) + 0.08));
      p.bg().grid(0, 0).axes({ xLabel: "删除的题项", yLabel: "Cronbach's α" });
      // 参考线
      p.hline(a.alpha, { stroke: "var(--g2)", dash: "6 4" });
      p.hline(0.70, { stroke: "var(--g3)", dash: "4 4" });
      p.ptext(p.M.l + 6, p.y(a.alpha) - 6, "当前 α = " + U.F.num(a.alpha, 3), { fill: "var(--g2)", size: 11, mono: true });
      p.ptext(p.M.l + 6, p.y(0.70) - 6, "0.70 可接受线", { fill: "var(--g3)", size: 11, mono: true });
      for (let j = 0; j < S.k; j++) {
        const v = a.alphaIfDeleted[j];
        if (!isFinite(v)) continue;
        const raise = v > a.alpha;
        p.bar(j - 0.36, j + 0.36, v, {
          fill: raise ? "rgba(247,37,133,.45)" : "rgba(76,201,240,.42)",
          stroke: raise ? "var(--g3)" : "rgba(76,201,240,.9)", rx: 3
        });
        p.raw('<text x="' + p.x(j).toFixed(1) + '" y="' + (p.y(v) - 6).toFixed(1) + '" fill="' + (raise ? "var(--g3)" : "var(--fg-dim)") + '" font-size="10.5" font-family="monospace" text-anchor="middle">' + U.F.num(v, 3) + "</text>");
        p.raw('<text x="' + p.x(j).toFixed(1) + '" y="' + (p.M.t + p.PH + 20) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="11" font-family="monospace" text-anchor="middle">第' + (j + 1) + "题</text>");
      }
      p.mount(E.rlChart);

      /* ---- 读数 ---- */
      const dropList = [];
      for (let j = 0; j < S.k; j++) if (a.itemTotal[j] < 0.30 || a.alphaIfDeleted[j] > a.alpha + 0.005) dropList.push(j + 1);
      E.rlOut.innerHTML = U.readouts([
        { k: "题项数 k", v: S.k },
        { k: "被试数 n", v: S.n },
        { k: "Cronbach's α", v: U.F.num(a.alpha, 4), hi: true, cls: a.alpha >= 0.8 ? "hi ok" : a.alpha >= 0.7 ? "hi" : "hi warn", mini: a.alpha >= 0.8 ? "良好" : a.alpha >= 0.7 ? "可接受" : a.alpha >= 0.6 ? "勉强" : "不可用" },
        { k: "平均题项间相关", v: U.F.num(a.itemVar.length ? (a.alpha * 0 + 0) : 0, 3) === "—" ? "—" : U.F.num(alphaToRho(a.alpha, S.k), 3), mini: "由 α 反推" },
        { k: "折半信度", v: U.F.num(a.splitHalf, 4), mini: "奇偶折半 + SB 校正" },
        { k: "建议删除题数", v: dropList.length, cls: dropList.length ? "warn" : "ok", mini: dropList.length ? "第 " + dropList.join("、") + " 题" : "无" },
        { k: "最低题总相关", v: U.F.num(Math.min.apply(null, a.itemTotal), 3), cls: Math.min.apply(null, a.itemTotal) < 0.3 ? "danger" : "ok", mini: "应 ≥ 0.30" }
      ]);

      /* ---- 叙述 ---- */
      const revOn = E.rlRev.checked;
      E.rlNarr.innerHTML =
        "当前 <b>" + S.k + "</b> 题、<b>" + S.n + "</b> 名被试，α = <b>" + U.F.num(a.alpha, 4) + "</b>。" +
        (a.alpha >= 0.8 ? " 达到「良好」水平。" : a.alpha >= 0.7 ? " 达到「可接受」水平，但可以检查是否有题目值得修订。" : " <b>低于 0.70 的可接受线</b>，需要检查题目质量或增加题项。") +
        (dropList.length ? " 其中第 <b>" + dropList.join("、") + "</b> 题的删除后 α 高于当前值，可以考虑删除或改写。" : " 每题的项目—总分相关都达标，没有明显拖后腿的题目。") +
        (revOn
          ? " 反向题（第 6 题）已正确处理。"
          : " <b style='color:var(--danger)'>注意：反向题尚未正确处理！</b>第 6 题与总分的相关转为负值，正在把 α 往下拉。把它反转回来，α 会明显回升——这正是实操中最容易犯、后果又最严重的错误之一。");
    }

    /** 由 α 与题目数反推平均题项间相关（Spearman-Brown 的逆运算） */
    function alphaToRho(alpha, k) {
      if (!isFinite(alpha) || k < 2) return NaN;
      const r = alpha / (k - (k - 1) * alpha);
      return isFinite(r) ? r : NaN;
    }

    E.rlKM.onclick = () => { S.k = Math.max(2, S.k - 1); gen(); draw(); };
    E.rlKP.onclick = () => { S.k = Math.min(20, S.k + 1); gen(); draw(); };
    E.rlKC.onclick = e => { const b = e.target.closest("button"); if (b) { S.k = +b.dataset.v; gen(); draw(); } };
    E.rlNM.onclick = () => { S.n = Math.max(10, S.n - 5); gen(); draw(); };
    E.rlNP.onclick = () => { S.n = Math.min(500, S.n + 5); gen(); draw(); };
    E.rlNC.onclick = e => { const b = e.target.closest("button"); if (b) { S.n = +b.dataset.v; gen(); draw(); } };
    E.rlRhoR.oninput = () => { S.rho = +E.rlRhoR.value; gen(); draw(); };
    E.rlRev.onchange = () => { gen(); draw(); };
    E.rlNew.onclick = () => { S.seed = (S.seed * 6364136223 + 1) % 2147483647; gen(); draw(); };

    draw();
  }
});

/* ==========================================================
   模块 14 · 抽样方法对比沙盘
   ========================================================== */
LAB.register({
  id: "sampling",
  render(root) {
    /* 构造一个有结构差异的总体：3 个层，层间均值差异明显 */
    const STRATA = [
      { name: "一线城市", N: 4000, mu: 78, sd: 12 },
      { name: "二线城市", N: 3500, mu: 62, sd: 13 },
      { name: "三四线及县乡", N: 2500, mu: 45, sd: 14 }
    ];
    const TOT = STRATA.reduce((s, x) => s + x.N, 0);
    const TRUE_MU = STRATA.reduce((s, x) => s + x.mu * x.N, 0) / TOT;

    const S = { n: 120, reps: 200, results: {}, showPlot: "srs" };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">总体结构（模拟）</div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>层</th><th>人数</th><th>占比</th><th>真实均值</th><th>标准差</th></tr></thead><tbody id="spStrata"></tbody></table></div>' +
      '<div class="callout info mt10"><span class="ttl">真值</span>总体均值 μ = <b id="spTrue"></b>（这个数字在实际调查中我们是不知道的）</div>' +
      U.ctrl({ label: "每次抽样的样本量 n", valHtml: '<span id="spN"></span>', body: '<input type="range" id="spNR" min="20" max="600" step="10" value="120">' + U.chips("spNC", [30, 60, 120, 300, 600]) }) +
      U.ctrl({ label: "重复抽样次数", valHtml: '<span id="spReps"></span>', body: U.chips("spRepsC", [50, 200, 500, 1000]) }) +
      '<div class="row mt14"><button class="btn primary block" id="spRun">运行对比模拟</button></div>' +
      U.ctrl({
        label: "关注哪种抽样",
        body: '<div class="chips" id="spFocus"><button class="chip active" data-v="srs">简单随机</button><button class="chip" data-v="strat">分层</button><button class="chip" data-v="clus">整群</button><button class="chip" data-v="conv">便利</button></div>'
      }) +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>估计值分布：哪种抽样更靠得住</h2><span class="spacer"></span>' +
      '<span class="badge" id="spBadge"></span></div>' +
      '<div class="stage"><svg id="spChart"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "简单随机抽样" },
        { c: "var(--g4)", t: "分层抽样" },
        { c: "var(--g3)", t: "整群抽样" },
        { c: "var(--g6)", t: "便利抽样" },
        { c: "var(--g2)", t: "总体真值 μ", dot: false }
      ]) +
      '<div class="narr" id="spNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="spOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>四种方法的系统对比</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>方法</th><th>平均偏差</th><th>估计标准差</th><th>均方误差</th><th>评价</th></tr></thead><tbody id="spCompare"></tbody></table></div>' +
      '<div class="note mt10"><b>平均偏差</b>衡量系统性错误（准确度）；<b>估计标准差</b>衡量随机波动（精密度）；<b>均方误差</b>把两者合在一起，越小越好。</div></section>' +
      '<section class="card"><div class="card-h"><h2>为什么分层抽样更有效率</h2></div>' +
      '<div class="prose fs14" style="max-width:none">' +
      "<p>本例的总体由三个差异巨大的层组成（一线城市均值 78、县乡 45）。</p>" +
      '<p><b>简单随机抽样</b>：完全靠运气抽人。有时抽到的一线城市居民偏多，估计就偏高；反之偏低。层间差异全部变成了估计的噪音。</p>' +
      '<p><b>分层抽样</b>：先按城市层级分层，每层按人口比例随机抽。这样各层的比例被<b>固定</b>住，估计的波动只剩层内差异，方差自然更小。</p>' +
      '<p class="callout ok"><span class="ttl">结论</span>层内同质、层间异质时，分层抽样的效率明显高于简单随机抽样——同样的样本量能得到更精确的估计。</p>' +
      '<p><b>整群抽样</b>：以群（如班级、社区）整体抽取。因为同一群内的人相似，有效样本量小于名义样本量，所以估计波动更大。</p>' +
      '<p class="callout danger mb0"><span class="ttl">便利抽样</span>如果只在「容易接触到的人群」里抽（例如只在高校里发问卷），样本的城市结构会严重偏离总体，导致<b>系统性偏差</b>。注意：这种偏差不会因为样本量增大而消失。</p>' +
      "</div></section>" +
      "</div>";

    const ids = ["spStrata", "spTrue", "spN", "spNR", "spNC", "spReps", "spRepsC", "spRun", "spFocus",
      "spBadge", "spChart", "spNarr", "spOut", "spCompare"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.spNC.innerHTML = [30, 60, 120, 300, 600].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.spRepsC.innerHTML = [50, 200, 500, 1000].map(v => '<button class="chip' + (v === 200 ? " active" : "") + '" data-v="' + v + '">' + v + "</button>").join("");
    E.spFocus.innerHTML = [{ v: "srs", t: "简单随机" }, { v: "strat", t: "分层" }, { v: "clus", t: "整群" }, { v: "conv", t: "便利" }]
      .map(o => '<button class="chip' + (o.v === "srs" ? " active" : "") + '" data-v="' + o.v + '">' + o.t + "</button>").join("");

    E.spStrata.innerHTML = STRATA.map(s =>
      '<tr><td class="tx">' + s.name + "</td><td>" + s.N + "</td><td>" + U.F.num(s.N / TOT * 100, 1) + "%</td><td>" + s.mu + "</td><td>" + s.sd + "</td></tr>"
    ).join("") + '<tr><td class="tx"><b>合计</b></td><td><b>' + TOT + "</b></td><td>100%</td><td><b>" + U.F.num(TRUE_MU, 2) + "</b></td><td>—</td></tr>";
    E.spTrue.textContent = U.F.num(TRUE_MU, 3);

    /* 构造总体（用分层结构，避免真的生成上万个数） */
    function drawFromStratum(st, rng) { return rng.normal(st.mu, st.sd); }

    function runOne(method, n, rng) {
      // 返回一次抽样的估计值
      if (method === "srs") {
        // 按人口比例随机选层（等价于简单随机）
        let sum = 0;
        for (let i = 0; i < n; i++) {
          let u = rng.uniform(0, TOT), acc = 0, st = STRATA[0];
          for (const s of STRATA) { acc += s.N; if (u <= acc) { st = s; break; } }
          sum += drawFromStratum(st, rng);
        }
        return sum / n;
      }
      if (method === "strat") {
        // 按比例分层，层内用比例分配
        let sum = 0, used = 0;
        STRATA.forEach((s, i) => {
          let ni = Math.round(n * s.N / TOT);
          if (i === STRATA.length - 1) ni = n - used;
          used += ni;
          let ss = 0;
          for (let j = 0; j < ni; j++) ss += drawFromStratum(s, rng);
          sum += ss;
        });
        return sum / n;
      }
      if (method === "clus") {
        // 整群：把每个层当作 20 个群，随机抽群
        const CLUSTERS = [];
        STRATA.forEach(s => {
          const cN = s.N / 20, sz = 60;
          for (let c = 0; c < 20; c++) CLUSTERS.push({ st: s, mean: rng.normal(s.mu, s.sd * 0.55), size: sz });
        });
        const need = Math.ceil(n / 60);
        const picked = rng.sample(CLUSTERS, Math.min(need, CLUSTERS.length));
        let sum = 0, cnt = 0;
        picked.forEach(c => { for (let i = 0; i < c.size; i++) { sum += rng.normal(c.mean, c.st.sd * 0.85); cnt++; } });
        return sum / cnt;
      }
      // 便利：只在「一线城市 + 二线城市的大学生」里抽 —— 系统偏高层
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const st = STRATA[rng.uniform(0, 1) < 0.62 ? 0 : 1];
        sum += drawFromStratum(st, rng);
      }
      return sum / n;
    }

    let RES = {};
    function simulate() {
      const rng = new ST.RNG(13579);
      const methods = ["srs", "strat", "clus", "conv"];
      RES = {};
      methods.forEach(m => {
        const arr = [];
        for (let i = 0; i < S.reps; i++) arr.push(runOne(m, S.n, rng));
        const st = ST.describe(arr);
        RES[m] = { arr, mean: st.mean, sd: st.sd, bias: st.mean - TRUE_MU, mse: Math.pow(st.mean - TRUE_MU, 2) + st.sd * st.sd };
      });
    }

    const MCOL = { srs: "var(--g1)", strat: "var(--g4)", clus: "var(--g3)", conv: "var(--g6)" };
    const MNAME = { srs: "简单随机抽样", strat: "分层抽样", clus: "整群抽样", conv: "便利抽样" };

    function draw() {
      E.spN.textContent = S.n;
      E.spReps.textContent = S.reps;
      U.$$("#spNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      U.$$("#spRepsC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.reps));

      const methods = ["srs", "strat", "clus", "conv"];
      const centroids = methods.map(m => RES[m].mean);
      const lo = Math.min.apply(null, centroids.concat([TRUE_MU])) - 6;
      const hi = Math.max.apply(null, centroids.concat([TRUE_MU])) + 6;
      const xr = [Math.min(TRUE_MU - 10, lo), Math.max(TRUE_MU + 10, hi)];

      const p = U.makePlot({ W: 880, H: 340, xr: xr, yr: [0, 1], margin: { l: 62, r: 26, t: 30, b: 48 } });
      // 计算密度
      let ymax = 0;
      const dens = {};
      methods.forEach(m => {
        const st = ST.describe(RES[m].arr);
        const sd = Math.max(st.sd, 0.4);
        dens[m] = x => ST.normalPDF(x, st.mean, sd);
        for (let x = xr[0]; x <= xr[1]; x += (xr[1] - xr[0]) / 300) ymax = Math.max(ymax, dens[m](x));
      });
      p.setY(0, ymax * 1.18).bg().grid(0, 0).axes({ xLabel: "估计出的总体均值（每次抽样的结果）", yLabel: "密度" });

      // 真值
      p.vline(TRUE_MU, { stroke: "var(--g2)", width: 2.4, dash: "6 4", label: "真值 μ = " + U.F.num(TRUE_MU, 2) });

      methods.forEach(m => {
        const st = ST.describe(RES[m].arr);
        const sd = Math.max(st.sd, 0.4);
        const isFocus = S.showPlot === m;
        p.line(x => dens[m](x), { stroke: MCOL[m], width: isFocus ? 3.2 : 2, opacity: isFocus || S.showPlot === "compare" ? 1 : .38 });
      });

      // 标注均值位置
      methods.forEach(m => {
        const st = ST.describe(RES[m].arr);
        p.raw('<circle cx="' + p.x(st.mean).toFixed(1) + '" cy="' + (p.M.t + p.PH - 8) + '" r="5" fill="' + MCOL[m] + '"/>');
      });
      p.ptext(p.M.l, p.M.t - 12, "曲线越窄说明估计越稳定；峰的位置偏离黄色真值线的距离，就是系统性偏差", { fill: U.cvar("--fg-faint", "#6f7b9b"), size: 11.5 });
      p.mount(E.spChart);

      /* ---- 对比表 ---- */
      const rows = methods.map(m => {
        const r = RES[m];
        const best = Math.min.apply(null, methods.map(x => RES[x].mse));
        const isBest = Math.abs(r.mse - best) < 1e-9;
        return "<tr" + (isBest ? ' style="background:rgba(61,220,151,.08)"' : "") + '><td class="tx">' + MNAME[m] + "</td><td>" +
          (r.bias >= 0 ? "+" : "") + U.F.num(r.bias, 3) + "</td><td>" + U.F.num(r.sd, 3) + "</td><td>" +
          U.F.num(r.mse, 3) + '</td><td style="color:' + (Math.abs(r.bias) > 2 ? "var(--danger)" : Math.abs(r.bias) > 0.8 ? "var(--warn)" : "var(--ok)") + '">' +
          (Math.abs(r.bias) > 2 ? "有系统偏差" : Math.abs(r.bias) > 0.8 ? "轻微偏差" : "基本无偏") + "</td></tr>";
      }).join("");
      E.spCompare.innerHTML = rows;

      /* ---- 读数 ---- */
      const fk = RES[S.showPlot] ? S.showPlot : "srs";
      const f = RES[fk];
      E.spBadge.className = "badge " + (Math.abs(f.bias) > 2 ? "danger" : "ok");
      E.spBadge.textContent = MNAME[fk] + (Math.abs(f.bias) > 2 ? "：有系统偏差" : "：基本无偏");

      E.spOut.innerHTML = U.readouts([
        { k: "总体真值 μ", v: U.F.num(TRUE_MU, 2), hi: true, mini: "固定常数" },
        { k: "样本量 n", v: S.n, mini: "重复 " + S.reps + " 次" },
        { k: "关注方法", v: MNAME[fk].replace("抽样", ""), mini: MNAME[fk] },
        { k: "平均估计值", v: U.F.num(f.mean, 2), mini: "多次重复的均值" },
        { k: "平均偏差", v: (f.bias >= 0 ? "+" : "") + U.F.num(f.bias, 3), hi: true, cls: Math.abs(f.bias) > 2 ? "hi danger" : "hi ok", mini: "系统性错误" },
        { k: "估计标准差", v: U.F.num(f.sd, 3), mini: "随机波动" },
        { k: "均方误差 MSE", v: U.F.num(f.mse, 3), mini: "偏差² + 方差" },
        { k: "95% 估计范围", v: "[" + U.F.num(ST.quantile(f.arr, 0.025), 2) + ", " + U.F.num(ST.quantile(f.arr, 0.975), 2) + "]", mini: "实际覆盖区间" }
      ]);

      /* ---- 叙述 ---- */
      const srs = RES.srs, strat = RES.strat, conv = RES.conv, clus = RES.clus;
      E.spNarr.innerHTML =
        "本次模拟每种方法各抽 <b>" + S.reps + "</b> 次，每次 n = <b>" + S.n + "</b>。<br><br>" +
        "<b>分层抽样</b>的估计标准差是 " + U.F.num(strat.sd, 3) + "，" +
        (strat.sd < srs.sd
          ? "<b>小于</b>简单随机抽样的 " + U.F.num(srs.sd, 3) + "（降低约 " + U.F.num((1 - strat.sd / srs.sd) * 100, 1) + "%）。这就是分层的效率优势：相同的样本量，估计更精确。"
          : "与简单随机抽样（" + U.F.num(srs.sd, 3) + "）相差不大。当层间差异明显时，分层的优势会更突出。") +
        "<br><br><b>整群抽样</b>的波动是 " + U.F.num(clus.sd, 3) + "，明显更大——因为同一群里的人相似，信息重复度高，有效样本量小于名义样本量。" +
        "<br><br><b>便利抽样</b>的平均估计值是 " + U.F.num(conv.mean, 2) + "，而真值是 " + U.F.num(TRUE_MU, 2) + "，" +
        "偏差高达 <b>" + U.F.num(conv.bias, 2) + "</b>。注意关键的一点：<b>把样本量从 " + S.n + " 提高到 600，这个偏差几乎不会缩小</b>——" +
        "它来自抽样方式本身，不是随机波动。这就是「垃圾进、垃圾出」。";
    }

    E.spNR.oninput = () => { S.n = +E.spNR.value; simulate(); draw(); };
    E.spNC.onclick = e => { const b = e.target.closest("button"); if (b) { S.n = +b.dataset.v; E.spNR.value = S.n; simulate(); draw(); } };
    E.spRepsC.onclick = e => { const b = e.target.closest("button"); if (b) { S.reps = +b.dataset.v; simulate(); draw(); } };
    E.spFocus.onclick = e => { const b = e.target.closest("button"); if (b) { S.showPlot = b.dataset.v; U.$$("#spFocus button").forEach(x => x.classList.toggle("active", x === b)); draw(); } };
    E.spRun.onclick = () => { simulate(); draw(); };

    simulate(); draw();
  }
});

})();
