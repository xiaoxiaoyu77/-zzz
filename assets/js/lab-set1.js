/* =========================================================
   lab-set1.js — 互动模块（一）
     · center-spread  集中与离散趋势实验室
     · normal         正态分布与标准分实验室
     · dist-basic     离散概率分布实验室（二项 / 泊松）
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

/* ==========================================================
   模块 1 · 集中与离散趋势
   ========================================================== */
LAB.register({
  id: "center-spread",
  render(root) {
    const BASE = [62, 71, 58, 66, 55, 73, 60, 64, 69, 57, 63, 68, 59, 70, 61, 65];
    const PRESETS = {
      attention: { name: "注意力自评（近似对称）", data: BASE.slice() },
      income: { name: "月收入（万元，右偏）", data: [0.4, 0.45, 0.5, 0.52, 0.55, 0.58, 0.6, 0.62, 0.65, 0.7, 0.75, 0.8, 0.9, 1.0, 1.2, 1.6] },
      views: { name: "单篇阅读量（万，重尾）", data: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 1.8, 2.2, 3.0, 4.5, 8.0, 26.0] }
    };
    const S = { preset: "attention", outlierOn: true, outlier: 82, showMean: true, showMedian: true, showSD: true, hoverIdx: -1 };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">数据设定</div>' +
      U.ctrl({
        label: "数据集",
        body: U.chips("csPreset", Object.keys(PRESETS).map(k => ({ v: k, t: PRESETS[k].name.split("（")[0] })), "attention"),
        note: "切换不同形态的分布，观察三个代表值的关系如何变化。"
      }) +
      U.ctrl({
        label: "追加一个极端值",
        valHtml: '<span id="csOutVal">82</span>',
        body: U.sw("csOutOn", "启用（把最后一个点拉大）", true) +
          '<input type="range" id="csOut" min="60" max="400" step="1" value="82">' +
          '<div class="chips" id="csOutChips"></div>',
        note: "向右拖动，看<b>均值</b>被拽走、而<b>中位数</b>几乎不动。"
      }) +
      U.ctrl({
        label: "显示选项",
        body: '<div style="display:flex;flex-direction:column;gap:8px">' +
          U.sw("csMean", "均值线 x̄", true) +
          U.sw("csMed", "中位数线 Md", true) +
          U.sw("csSD", "±1 标准差范围", true) + "</div>"
      }) +
      '<div class="ctrl"><button class="btn block" id="csReset">恢复初始数据</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>点阵图 · 每个点都是一个观测</h2><span class="spacer"></span>' +
      '<span class="badge" id="csN"></span></div>' +
      '<div class="stage"><svg id="csChart1"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "均值 x̄" },
        { c: "var(--g2)", t: "中位数 Md" },
        { c: "var(--g3)", t: "众数 Mo" },
        { c: "rgba(76,201,240,.14)", t: "±1 标准差范围", dot: false }
      ]) +
      "</div>" +
      '<div class="card"><div class="card-h"><h2>箱线图 · 五数概括</h2></div>' +
      '<div class="stage"><svg id="csChart2"></svg></div>' +
      U.hints([
        "<b>箱体</b> = Q1 到 Q3（中间 50% 的人）",
        "<b>箱内竖线</b> = 中位数",
        "<b>须</b> = 1.5 倍 IQR 范围内的最远点",
        "<b>圆点</b> = 离群点"
      ]) +
      "</div>" +
      '<div class="readouts" id="csOut2"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>均值、中位数、众数为什么不在同一个位置</h2></div>' +
      '<div id="csExplain"></div></section>' +
      '<section class="card"><div class="card-h"><h2>完整描述统计量</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><tbody id="csTable"></tbody></table></div>' +
      '<div class="note mt10" id="csNote"></div></section>' +
      "</div>";

    const ids = ["csPreset", "csOutOn", "csOut", "csOutChips", "csMean", "csMed", "csSD", "csReset",
      "csOutVal", "csN", "csChart1", "csChart2", "csOut2", "csExplain", "csTable", "csNote"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));

    E.csOutChips.innerHTML = [62, 82, 120, 200, 300, 400].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");

    function dataset() {
      const d = PRESETS[S.preset].data.slice();
      if (S.outlierOn) d.push(S.outlier);
      return d;
    }

    function draw() {
      const d = dataset();
      const st = ST.describe(d);
      const mn = Math.min.apply(null, d), mx = Math.max.apply(null, d);
      const pad = Math.max(1, (mx - mn) * 0.08);
      const x0 = Math.floor(mn - pad), x1 = Math.ceil(mx + pad);

      E.csN.textContent = "n = " + st.n;
      E.csOutVal.textContent = S.outlier;

      /* ---- 图 1：点阵图 ---- */
      const H1 = 238;
      const p = U.makePlot({ W: 880, H: H1, xr: [x0, x1], yr: [0, 1], margin: { l: 52, r: 26, t: 34, b: 40 } });

      // 均值 ±1SD 范围
      if (S.showSD && st.sd > 0) {
        const a = p.x(st.mean - st.sd), b = p.x(st.mean + st.sd);
        p.raw('<rect x="' + a.toFixed(1) + '" y="' + p.M.t + '" width="' + Math.max(0, b - a).toFixed(1) +
          '" height="' + p.PH + '" fill="rgba(76,201,240,.10)" stroke="rgba(76,201,240,.3)" stroke-dasharray="3 3"/>');
      }
      p.bg().grid(U.niceStep(x1 - x0) * 2, 0).axes({ xLabel: "观测值", stepX: U.niceStep(x1 - x0) * 2 });

      // 堆叠点
      const groups = {};
      d.forEach((v, i) => { (groups[v] = groups[v] || []).push(i); });
      const laneH = 26;
      p.raw('<line x1="' + p.M.l + '" y1="' + (p.M.t + p.PH - 34) + '" x2="' + (p.M.l + p.PW) + '" y2="' + (p.M.t + p.PH - 34) + '" stroke="' + U.cvar("--line-strong", "#4a5680") + '" stroke-width="1.2"/>');
      Object.keys(groups).forEach(k => {
        const v = +k, arr = groups[k];
        arr.forEach((idx, li) => {
          const cy = p.M.t + p.PH - 34 - 12 - li * laneH;
          if (cy < p.M.t + 6) return;
          const isOutlier = S.outlierOn && idx === d.length - 1;
          p.raw('<circle cx="' + p.x(v).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="7" fill="' +
            (isOutlier ? "rgba(247,37,133,.55)" : "rgba(76,201,240,.30)") + '" stroke="' +
            (isOutlier ? "var(--g3)" : "var(--g1)") + '" stroke-width="1.6"' +
            (S.hoverIdx === idx ? ' stroke-width="2.8"' : "") + "/>");
        });
      });

      // 三条竖线
      function vline(v, color, label, dy) {
        if (v < x0 || v > x1) return;
        p.raw('<line x1="' + p.x(v).toFixed(1) + '" y1="' + (p.M.t + 6) + '" x2="' + p.x(v).toFixed(1) + '" y2="' + (p.M.t + p.PH - 34) + '" stroke="' + color + '" stroke-width="1.8" stroke-dasharray="5 4"/>');
        p.ptext(p.x(v), p.M.t + 20 - dy, label, { fill: color, size: 11.5, mono: true, anchor: "middle" });
      }
      if (S.showMedian) vline(st.median, "var(--g2)", "Md " + U.F.num(st.median, 1), 0);
      if (S.showMean) vline(st.mean, "var(--g1)", "x̄ " + U.F.num(st.mean, 1), 12);
      if (st.mode.length) st.mode.forEach(m => vline(m, "var(--g3)", "Mo " + U.F.num(m, 0), 24));

      p.mount(E.csChart1);

      /* ---- 图 2：箱线图 ---- */
      const bx = ST.boxStats(d);
      const p2 = U.makePlot({ W: 880, H: 168, xr: [x0, x1], yr: [0, 1], margin: { l: 52, r: 26, t: 34, b: 40 } });
      p2.bg().grid(U.niceStep(x1 - x0) * 2, 0).axes({ xLabel: "观测值", stepX: U.niceStep(x1 - x0) * 2 });
      const cy = p2.M.t + p2.PH * 0.55;
      const bh = 34;
      // 须
      p2.raw('<line x1="' + p2.x(bx.whiskerLo).toFixed(1) + '" y1="' + cy + '" x2="' + p2.x(bx.q1).toFixed(1) + '" y2="' + cy + '" stroke="var(--g1)" stroke-width="1.6"/>');
      p2.raw('<line x1="' + p2.x(bx.q3).toFixed(1) + '" y1="' + cy + '" x2="' + p2.x(bx.whiskerHi).toFixed(1) + '" y2="' + cy + '" stroke="var(--g1)" stroke-width="1.6"/>');
      [bx.whiskerLo, bx.whiskerHi].forEach(v => {
        p2.raw('<line x1="' + p2.x(v).toFixed(1) + '" y1="' + (cy - bh / 2) + '" x2="' + p2.x(v).toFixed(1) + '" y2="' + (cy + bh / 2) + '" stroke="var(--g1)" stroke-width="1.6"/>');
      });
      // 箱体
      p2.raw('<rect x="' + p2.x(bx.q1).toFixed(1) + '" y="' + (cy - bh / 2) + '" width="' + (p2.x(bx.q3) - p2.x(bx.q1)).toFixed(1) +
        '" height="' + bh + '" fill="rgba(76,201,240,.18)" stroke="var(--g1)" stroke-width="1.8" rx="3"/>');
      // 中位线
      p2.raw('<line x1="' + p2.x(bx.q2).toFixed(1) + '" y1="' + (cy - bh / 2) + '" x2="' + p2.x(bx.q2).toFixed(1) + '" y2="' + (cy + bh / 2) + '" stroke="var(--g2)" stroke-width="2.6"/>');
      // 均值
      p2.raw('<circle cx="' + p2.x(bx.mean).toFixed(1) + '" cy="' + cy + '" r="5" fill="var(--g1)" stroke="' + U.cvar("--bg", "#0a0e18") + '" stroke-width="1.6"/>');
      // 离群点
      bx.outliers.forEach(v => {
        p2.raw('<circle cx="' + p2.x(v).toFixed(1) + '" cy="' + cy + '" r="5.5" fill="none" stroke="var(--g3)" stroke-width="2"/>');
      });
      p2.ptext(p2.M.l, p2.M.t - 12, "Q1=" + U.F.num(bx.q1, 1) + "  Md=" + U.F.num(bx.q2, 1) + "  Q3=" + U.F.num(bx.q3, 1) + "  IQR=" + U.F.num(bx.iqr, 1), { fill: U.cvar("--fg-mut", "#8d99b6"), size: 11.5, mono: true });
      p2.mount(E.csChart2);

      /* ---- 读数 ---- */
      E.csOut2.innerHTML = U.readouts([
        { k: "n", v: st.n, mini: "样本量" },
        { k: "均值 x̄", v: U.F.num(st.mean, 2), hi: true, mini: "受极端值影响" },
        { k: "中位数 Md", v: U.F.num(st.median, 2), mini: "对极端值免疫" },
        { k: "标准差 s", v: U.F.num(st.sd, 2), mini: "个体离散程度" },
        { k: "极差", v: U.F.num(st.range, 1), mini: "max − min" },
        { k: "IQR", v: U.F.num(st.iqr, 2), mini: "中间 50%" },
        { k: "偏度", v: U.F.num(st.skew, 2), cls: Math.abs(st.skew) > 0.5 ? "warn" : "", mini: st.skew > 0.2 ? "右偏" : st.skew < -0.2 ? "左偏" : "近似对称" },
        { k: "变异系数", v: U.F.num(st.cv * 100, 1) + "%", mini: "s / x̄" }
      ]);

      /* ---- 表格 ---- */
      const rows = [
        ["样本量 n", st.n],
        ["总和 Σx", U.F.num(st.sum, 1)],
        ["均值 x̄", U.F.num(st.mean, 4)],
        ["中位数 Md", U.F.num(st.median, 4)],
        ["众数 Mo", st.mode.length ? st.mode.join(", ") : "无（无重复值）"],
        ["最小值", U.F.num(st.min, 2)],
        ["最大值", U.F.num(st.max, 2)],
        ["极差", U.F.num(st.range, 2)],
        ["Q1 / Q3", U.F.num(st.q1, 2) + " / " + U.F.num(st.q3, 2)],
        ["四分位距 IQR", U.F.num(st.iqr, 2)],
        ["样本方差 s²", U.F.num(st.variance, 4)],
        ["样本标准差 s", U.F.num(st.sd, 4)],
        ["总体标准差 σ", U.F.num(st.sd0, 4)],
        ["平均绝对偏差", U.F.num(st.mad, 4)],
        ["变异系数 CV", U.F.num(st.cv * 100, 2) + "%"],
        ["标准误 SE", U.F.num(st.sem, 4)],
        ["偏度 g₁", U.F.num(st.skew, 4)],
        ["超额峰度 g₂", U.F.num(st.kurt, 4)]
      ];
      E.csTable.innerHTML = rows.map(r =>
        '<tr><td class="tx">' + r[0] + "</td><td>" + r[1] + "</td></tr>").join("");

      /* ---- 解释 ---- */
      const gap = st.mean - st.median;
      const rel = Math.abs(gap) / (st.sd || 1);
      let msg;
      if (rel < 0.08) msg = "均值与中位数几乎重合，说明分布<b>基本对称</b>，此时用均值概括很安全。";
      else if (gap > 0) msg = "均值比中位数<b>大 " + U.F.num(gap, 2) + "</b>，分布<b>右偏</b>——右侧的长尾把均值拽走了。此时中位数更能代表「典型水平」。";
      else msg = "均值比中位数<b>小 " + U.F.num(-gap, 2) + "</b>，分布<b>左偏</b>。";
      E.csExplain.innerHTML =
        '<div class="callout info"><span class="ttl">三者相对位置</span>' +
        "Mo " + U.F.num(st.mode.length ? st.mode[0] : st.median, 1) + " &nbsp;·&nbsp; Md " + U.F.num(st.median, 2) + " &nbsp;·&nbsp; x̄ " + U.F.num(st.mean, 2) +
        " &nbsp;→&nbsp; " + (st.mode.length && st.mode[0] < st.median && st.median < st.mean ? "众数 &lt; 中位数 &lt; 均值 ＝ 右偏" :
          st.mode.length && st.mode[0] > st.median && st.median > st.mean ? "众数 &gt; 中位数 &gt; 均值 ＝ 左偏" : "近似对称") + "</div>" +
        '<div class="callout purple mt10"><span class="ttl">怎么读这一组数</span>' + msg + "</div>" +
        '<div class="callout warn mt10"><span class="ttl">实操提醒</span>' +
        "报告传播数据（收入、阅读量、转发数、粉丝数）时，如果只给出均值，读者会用「平均人」的直觉去理解，而那个人可能根本不存在。标准做法是<b>均值与中位数并列报告</b>，并附上标准差。</div>";

      E.csNote.innerHTML = "标准差 s 的分母是 n − 1 = <b>" + (st.n - 1) + "</b>，这是为了修正用 x̄ 代替 μ 造成的系统性低估，使 s² 成为 σ² 的无偏估计。";
    }

    // 事件
    E.csPreset.addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      S.preset = b.dataset.v;
      U.$$("#csPreset button").forEach(x => x.classList.toggle("active", x === b));
      // 极端值范围随数据调整
      const mxv = Math.max.apply(null, PRESETS[S.preset].data);
      E.csOut.max = Math.ceil(mxv * 2.2);
      E.csOut.value = S.outlier = Math.round(mxv * 1.35);
      draw();
    });
    E.csOutChips.addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      S.outlier = +b.dataset.v; E.csOut.value = S.outlier; draw();
    });
    E.csOut.addEventListener("input", () => { S.outlier = +E.csOut.value; draw(); });
    E.csOutOn.addEventListener("change", () => { S.outlierOn = E.csOutOn.checked; draw(); });
    E.csMean.addEventListener("change", () => { S.showMean = E.csMean.checked; draw(); });
    E.csMed.addEventListener("change", () => { S.showMedian = E.csMed.checked; draw(); });
    E.csSD.addEventListener("change", () => { S.showSD = E.csSD.checked; draw(); });
    E.csReset.addEventListener("click", () => {
      S.preset = "attention"; S.outlierOn = true; S.outlier = 82;
      E.csOutOn.checked = true; E.csOut.value = 82; E.csOut.max = 400;
      U.$$("#csPreset button").forEach(x => x.classList.toggle("active", x.dataset.v === "attention"));
      draw();
    });

    draw();
  }
});

/* ==========================================================
   模块 2 · 正态分布与标准分
   ========================================================== */
LAB.register({
  id: "normal",
  render(root) {
    const S = { mu: 0, sigma: 1, mode: "between", a: -1, b: 1, showRule: true };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">分布参数</div>' +
      U.ctrl({ label: "均值 μ", valHtml: '<span id="nmMu"></span>', body: U.stepper("nmMuM", "nmMuP") + '<div class="sub">快速取值</div>' + U.chips("nmMuC", [-2, -1, 0, 1, 2]) }) +
      U.ctrl({ label: "标准差 σ", valHtml: '<span id="nmSd"></span>', body: U.stepper("nmSdM", "nmSdP") + '<div class="sub">快速取值</div>' + U.chips("nmSdC", [0.5, 1, 1.5, 2, 3]) }) +
      U.ctrl({
        label: "概率查询方式",
        valHtml: '<span id="nmModeTxt">区间内</span>',
        body: '<div class="btnrow" id="nmModes">' +
          '<button class="btn sm" data-m="between">P(a &lt; X &lt; b)</button>' +
          '<button class="btn sm" data-m="left">P(X ≤ x)</button>' +
          '<button class="btn sm" data-m="right">P(X ≥ x)</button>' +
          '<button class="btn sm" data-m="abs">P(|X−μ| ≥ d)</button>' +
          "</div>"
      }) +
      U.ctrl({ label: "端点 a", valHtml: '<span id="nmA"></span>', body: '<input type="range" id="nmAr" min="-4" max="4" step="0.05" value="-1">' }) +
      U.ctrl({ label: "端点 b", valHtml: '<span id="nmB"></span>', body: '<input type="range" id="nmBr" min="-4" max="4" step="0.05" value="1">' }) +
      U.ctrl({ label: "显示选项", body: '<div style="display:flex;flex-direction:column;gap:8px">' + U.sw("nmRule", "叠加 68–95–99.7 经验法则", true) + U.sw("nmZ", "坐标轴用 z 分数（标准分）", false) + "</div>" }) +
      '<div class="ctrl"><button class="btn block" id="nmReset">重置为标准正态 N(0,1)</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>正态曲线 · 阴影面积就是概率</h2><span class="spacer"></span><span class="badge acc" id="nmPbadge"></span></div>' +
      '<div class="stage"><svg id="nmChart" class="draggable"></svg></div>' +
      U.legend([
        { c: "url(#lgA)", t: "正态密度曲线 f(x)" },
        { c: "rgba(76,201,240,.42)", t: "阴影 = 当前查询的概率" },
        { c: "var(--g3)", t: "68–95–99.7 分界" }
      ]) +
      U.hints(["<b>拖动</b>左右边界", "<b>点击</b>定位", "<b>悬停</b>读该处密度与累积概率", "<b>↑↓</b> 调 μ &nbsp; <b>←→</b> 调 σ"]) +
      "</div>" +
      '<div class="readouts" id="nmOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>标准分换算器</h2></div>' +
      '<div class="note mb12">把任意量表上的原始分数，换算成「距均值多少个标准差」，即可跨量表比较。</div>' +
      '<label class="fld">原始分数 x</label><input type="number" id="nmX" value="84" step="0.1">' +
      '<div class="subst mt14" id="nmZbox"></div>' +
      '<div class="note mt10">z 只表示相对位置，与原始单位无关。<b>z 为负不代表「差」</b>，只表示低于均值。</div>' +
      "</section>" +
      '<section class="card"><div class="card-h"><h2>常用临界值速查</h2></div>' +
      U.table(["置信水平", "双侧 z*", "覆盖概率", "对应区间"], [
        [{ v: "90%", cls: "tx" }, "1.6449", "0.9000", "μ ± 1.645σ"],
        [{ v: "95%", cls: "tx" }, "1.9600", "0.9500", "μ ± 1.960σ"],
        [{ v: "99%", cls: "tx" }, "2.5758", "0.9900", "μ ± 2.576σ"],
        [{ v: "99.9%", cls: "tx" }, "3.2905", "0.9990", "μ ± 3.291σ"]
      ]) +
      '<div class="note mt10">这些数字在后面的置信区间与假设检验里会反复出现。</div></section>' +
      '<section class="card"><div class="card-h"><h2>经验法则验证</h2></div>' +
      '<div class="kv" id="nmRuleBox"></div>' +
      '<div class="note mt10">拖动 σ，看三个区间的覆盖概率如何变化。<b>经验法则只对正态分布成立</b>，偏态分布下会明显失效。</div></section>' +
      "</div>";

    const ids = ["nmMu", "nmSd", "nmMuM", "nmMuP", "nmSdM", "nmSdP", "nmMuC", "nmSdC", "nmModeTxt", "nmModes",
      "nmA", "nmB", "nmAr", "nmBr", "nmRule", "nmZ", "nmReset", "nmChart", "nmOut", "nmPbadge", "nmX", "nmZbox", "nmRuleBox"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.nmMuC.innerHTML = [-2, -1, 0, 1, 2].map(v => '<button class="chip" data-v="' + v + '">' + (v > 0 ? "+" : "") + v + "</button>").join("");
    E.nmSdC.innerHTML = [0.5, 1, 1.5, 2, 3].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");

    const toX = z => S.mu + z * S.sigma;
    const toZ = x => (x - S.mu) / S.sigma;

    function query() {
      if (S.mode === "between") {
        const a = Math.min(S.a, S.b), b = Math.max(S.a, S.b);
        return { lo: toX(a), hi: toX(b), p: ST.normalCDF(b) - ST.normalCDF(a), label: "P(" + U.F.num(toX(a), 2) + " &lt; X &lt; " + U.F.num(toX(b), 2) + ")" };
      }
      if (S.mode === "left") {
        return { lo: -Infinity, hi: toX(S.a), p: ST.normalCDF(S.a), label: "P(X ≤ " + U.F.num(toX(S.a), 2) + ")" };
      }
      if (S.mode === "right") {
        return { lo: toX(S.a), hi: Infinity, p: 1 - ST.normalCDF(S.a), label: "P(X ≥ " + U.F.num(toX(S.a), 2) + ")" };
      }
      const d = Math.abs(S.a);
      return { lo: null, hi: null, tail: d, p: 2 * (1 - ST.normalCDF(d)), label: "P(|X−μ| ≥ " + U.F.num(d * S.sigma, 2) + ")" };
    }

    function draw() {
      const mu = S.mu, sd = S.sigma;
      E.nmMu.textContent = U.F.num(mu, 2);
      E.nmSd.textContent = U.F.num(sd, 2);
      E.nmA.textContent = U.F.num(toX(S.a), 2);
      E.nmB.textContent = U.F.num(toX(S.b), 2);
      E.nmModeTxt.textContent = { between: "区间内", left: "左尾", right: "右尾", abs: "双侧对称" }[S.mode];
      U.$$("#nmModes button").forEach(b => b.classList.toggle("active", b.dataset.m === S.mode));

      const q = query();
      const zr = 4.2;
      const p = U.makePlot({ W: 880, H: 380, xr: S.showZ ? [-zr, zr] : [toX(-zr), toX(zr)], yr: [0, 1] });
      const dens = S.showZ
        ? z => ST.normalPDF(z, 0, 1)
        : x => ST.normalPDF(x, mu, sd);
      const xOf = v => S.showZ ? v : toX(v);

      p.autoY(dens, -zr, zr, 1.16).bg().grid(1, 0).axes({
        xLabel: S.showZ ? "z（标准差个数）" : "x", stepX: 1
      });

      // 经验法则
      if (S.showRule) {
        [1, 2, 3].forEach((k, i) => {
          const col = ["rgba(247,37,133,.55)", "rgba(255,183,3,.45)", "rgba(61,220,151,.35)"][i];
          [-1, 1].forEach(sgn => {
            p.raw('<line x1="' + p.x(xOf(sgn * k)).toFixed(1) + '" y1="' + p.M.t + '" x2="' + p.x(xOf(sgn * k)).toFixed(1) +
              '" y2="' + (p.M.t + p.PH) + '" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="' + (i === 0 ? "5 4" : "2 4") + '"/>');
          });
        });
      }

      // 阴影
      const sh = "rgba(76,201,240,.42)", shs = "rgba(76,201,240,.95)";
      if (S.mode === "abs") {
        p.area(-zr, -q.tail, z => dens(z), { fill: sh, stroke: shs });
        p.area(q.tail, zr, z => dens(z), { fill: sh, stroke: shs });
      } else if (S.mode === "between") {
        const a = Math.min(S.a, S.b), b = Math.max(S.a, S.b);
        p.area(Math.max(a, -zr), Math.min(b, zr), z => dens(z), { fill: sh, stroke: shs });
      } else if (S.mode === "left") {
        p.area(-zr, Math.min(S.a, zr), z => dens(z), { fill: sh, stroke: shs });
      } else {
        p.area(Math.max(S.a, -zr), zr, z => dens(z), { fill: sh, stroke: shs });
      }

      // 曲线
      p.line(z => dens(z), { x0: -zr, x1: zr, stroke: "url(#lgA)", width: 2.8 });
      p.line(z => dens(z), { x0: -zr, x1: zr, stroke: "none", fill: "url(#lgB)" });

      // 端点
      const marks = S.mode === "abs" ? [-q.tail, q.tail]
        : S.mode === "between" ? [Math.min(S.a, S.b), Math.max(S.a, S.b)] : [S.a];
      marks.forEach((z, i) => {
        if (z < -zr || z > zr) return;
        p.vline(xOf(z), { stroke: "var(--g2)", label: S.showZ ? "z=" + U.F.num(z, 2) : "x=" + U.F.num(toX(z), 1), dash: "3 3" });
        p.dot(xOf(z), dens(z), { stroke: "var(--g2)", r: 5 });
      });

      // 悬停探针
      if (S.probe !== undefined && S.probe !== null) {
        const z = Math.max(-zr, Math.min(zr, S.probe));
        p.vline(xOf(z), { stroke: "rgba(255,255,255,.3)", dash: "2 4" });
        p.dot(xOf(z), dens(z), { stroke: "#ffb703", r: 4 });
        p.ptext(p.M.l + 10, p.M.t + 18,
          "z = " + U.F.num(z, 3) + "   f(z) = " + U.F.num(dens(z), 4) + "   F(z) = " + U.F.num(ST.normalCDF(z), 4),
          { fill: "#ffb703", size: 11.5, mono: true });
      }

      p.mount(E.nmChart);
      E.nmPbadge.textContent = q.label + " = " + U.F.num(q.p, 4);

      // 读数
      const zA = S.mode === "abs" ? q.tail : (S.mode === "between" ? Math.min(S.a, S.b) : S.a);
      E.nmOut.innerHTML = U.readouts([
        { k: "均值 μ", v: U.F.num(mu, 2), mini: "曲线中心" },
        { k: "标准差 σ", v: U.F.num(sd, 2), mini: "曲线胖瘦" },
        { k: "概率", v: U.F.num(q.p, 4), hi: true, mini: q.label.replace(/&lt;/g, "<") },
        { k: "对应 z", v: U.F.num(S.mode === "abs" ? q.tail : zA, 3), mini: "标准分" },
        { k: "峰值密度", v: U.F.num(dens(0), 4), mini: "1/(σ√2π)" },
        { k: "百分位", v: U.F.num(ST.normalCDF(S.mode === "abs" ? q.tail : zA) * 100, 1) + "%", mini: "累积概率" }
      ]);

      // z 换算
      const x = parseFloat(E.nmX.value);
      if (isFinite(x)) {
        const z = (x - mu) / sd;
        const pct = ST.normalCDF(z);
        E.nmZbox.innerHTML =
          '<div><span class="lbl">z = </span>(x − μ) / σ = (' + U.F.num(x, 2) + " − " + U.F.num(mu, 2) + ") / " + U.F.num(sd, 2) + ' = <b>' + U.F.num(z, 4) + "</b></div>" +
          '<div><span class="lbl">该分数以下的累积比例 = </span><b>' + U.F.num(pct * 100, 2) + "%</b></div>" +
          '<div><span class="lbl">高于该分数的人约占 = </span><b>' + U.F.num((1 - pct) * 100, 2) + "%</b></div>" +
          '<div><span class="lbl">解读 = </span>' + (z > 0 ? "比均值高 " : z < 0 ? "比均值低 " : "恰好等于均值 ") + "<b>" + U.F.num(Math.abs(z), 2) + "</b> 个标准差</div>";
      }

      // 经验法则
      const rk = [1, 2, 3].map(k => {
        const pc = ST.normalCDF(k) - ST.normalCDF(-k);
        return '<div class="k">μ ± ' + k + "σ</div><div class=\"v\">" + U.F.num(pc * 100, 2) + "%</div>";
      }).join("");
      E.nmRuleBox.innerHTML = rk;
    }

    // 事件
    const setMu = v => { S.mu = Math.max(-10, Math.min(10, v)); draw(); };
    const setSd = v => { S.sigma = Math.max(0.1, Math.min(10, v)); draw(); };
    E.nmMuM.onclick = () => setMu(S.mu - 0.5);
    E.nmMuP.onclick = () => setMu(S.mu + 0.5);
    E.nmSdM.onclick = () => setSd(+(S.sigma - 0.25).toFixed(2));
    E.nmSdP.onclick = () => setSd(+(S.sigma + 0.25).toFixed(2));
    E.nmMuC.onclick = e => { const b = e.target.closest("button"); if (b) setMu(+b.dataset.v); };
    E.nmSdC.onclick = e => { const b = e.target.closest("button"); if (b) setSd(+b.dataset.v); };
    E.nmModes.onclick = e => { const b = e.target.closest("button"); if (b) { S.mode = b.dataset.m; draw(); } };
    E.nmAr.oninput = () => { S.a = +E.nmAr.value; draw(); };
    E.nmBr.oninput = () => { S.b = +E.nmBr.value; draw(); };
    E.nmRule.onchange = () => { S.showRule = E.nmRule.checked; draw(); };
    E.nmZ.onchange = () => { S.showZ = E.nmZ.checked; draw(); };
    E.nmX.oninput = draw;
    E.nmReset.onclick = () => {
      S.mu = 0; S.sigma = 1; S.a = -1; S.b = 1; S.mode = "between";
      E.nmAr.value = -1; E.nmBr.value = 1;
      draw();
    };

    U.interactive(E.nmChart, {
      W: 880, H: 380, invX() { return 0; }
    }, {});
    // 用真实 plot 绑定拖拽
    const pRef = { W: 880, H: 380, M: { l: 62, r: 26, t: 26, b: 50 } };
    const localOf = (ev) => {
      const svg = E.nmChart, r = svg.getBoundingClientRect();
      const sc = Math.min(r.width / 880, r.height / 380);
      const ox = (r.width - 880 * sc) / 2, oy = (r.height - 380 * sc) / 2;
      return { x: (ev.clientX - r.left - ox) / sc, y: (ev.clientY - r.top - oy) / sc };
    };
    let dragging = false;
    const zFrom = ev => {
      const pt = localOf(ev);
      const px = Math.max(pRef.M.l, Math.min(pRef.M.l + (880 - pRef.M.l - pRef.M.r), pt.x));
      const z = (px - pRef.M.l) / (880 - pRef.M.l - pRef.M.r) * 8.4 - 4.2;
      return Math.round(z * 20) / 20;
    };
    E.nmChart.addEventListener("pointerdown", ev => {
      dragging = true;
      try { E.nmChart.setPointerCapture(ev.pointerId); } catch (e) { }
      const z = zFrom(ev);
      if (S.mode === "between") {
        // 就近选一个端点
        if (Math.abs(z - S.a) <= Math.abs(z - S.b)) S.a = z; else S.b = z;
        E.nmAr.value = S.a; E.nmBr.value = S.b;
      } else { S.a = z; E.nmAr.value = z; }
      draw();
    });
    E.nmChart.addEventListener("pointermove", ev => {
      const z = zFrom(ev);
      if (dragging) {
        if (S.mode === "between") {
          if (Math.abs(z - S.a) <= Math.abs(z - S.b)) { S.a = z; E.nmAr.value = z; } else { S.b = z; E.nmBr.value = z; }
        } else { S.a = z; E.nmAr.value = z; }
      }
      S.probe = z;
      draw();
    });
    E.nmChart.addEventListener("pointerup", () => { dragging = false; draw(); });
    E.nmChart.addEventListener("pointerleave", () => { dragging = false; S.probe = null; draw(); });

    draw();
  }
});

/* ==========================================================
   模块 3 · 离散概率分布（二项 / 泊松）
   ========================================================== */
LAB.register({
  id: "dist-basic",
  render(root) {
    const S = { dist: "binom", n: 20, pi: 0.3, lam: 3, showNormal: true };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">分布设定</div>' +
      U.ctrl({
        label: "分布类型",
        body: '<div class="btnrow" id="dbType">' +
          '<button class="btn sm active" data-d="binom">二项分布 B(n, π)</button>' +
          '<button class="btn sm" data-d="poisson">泊松分布 P(λ)</button></div>',
        note: "二项：n 次独立重复中「成功」的次数。<br>泊松：单位时间内稀有事件发生的次数。"
      }) +
      '<div id="dbBinomBox">' +
      U.ctrl({ label: "试验次数 n", valHtml: '<span id="dbN"></span>', body: U.stepper("dbNM", "dbNP") + U.chips("dbNC", [5, 10, 20, 30, 50, 100]) }) +
      U.ctrl({ label: "单次成功概率 π", valHtml: '<span id="dbPi"></span>', body: '<input type="range" id="dbPiR" min="0.01" max="0.99" step="0.01" value="0.3">' + U.chips("dbPiC", [0.05, 0.1, 0.3, 0.5, 0.7, 0.9]) })
      + "</div>" +
      '<div id="dbPoisBox" hidden>' +
      U.ctrl({ label: "强度参数 λ", valHtml: '<span id="dbLam"></span>', body: '<input type="range" id="dbLamR" min="0.2" max="25" step="0.1" value="3">' + U.chips("dbLamC", [0.5, 1, 3, 5, 10, 20]) })
      + "</div>" +
      U.ctrl({ label: "显示选项", body: '<div style="display:flex;flex-direction:column;gap:8px">' + U.sw("dbNorm", "叠加正态近似曲线", true) + "</div>" }) +
      '<div class="ctrl"><button class="btn block" id="dbReset">重置</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2 id="dbTitle">二项分布</h2><span class="spacer"></span><span class="badge acc" id="dbShape"></span></div>' +
      '<div class="stage"><svg id="dbChart" class="draggable"></svg></div>' +
      U.legend([{ c: "var(--g1)", t: "概率质量 P(X = k)" }, { c: "var(--g3)", t: "正态近似", dot: false }, { c: "var(--g2)", t: "当前选中的 k" }]) +
      U.hints(["<b>单击</b>任意柱查看该点的精确概率与累积概率", "<b>悬停</b>查看读数"]) +
      "</div>" +
      '<div class="readouts" id="dbOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>选中点的概率</h2></div><div class="subst" id="dbCalc"></div></section>' +
      '<section class="card"><div class="card-h"><h2>何时可以用正态近似</h2></div>' +
      '<div id="dbApprox"></div>' +
      '<div class="note mt10">经验规则：<b>nπ ≥ 5 且 n(1−π) ≥ 5</b> 时，二项分布可用正态分布近似，此时需做连续性校正（±0.5）。</div></section>' +
      '<section class="card"><div class="card-h"><h2>传播研究中的对应场景</h2></div>' +
      '<div class="note no-term" id="dbContext"></div></section>' +
      "</div>";

    const ids = ["dbType", "dbN", "dbPi", "dbNM", "dbNP", "dbNC", "dbPiR", "dbPiC", "dbLam", "dbLamR", "dbLamC",
      "dbBinomBox", "dbPoisBox", "dbNorm", "dbReset", "dbChart", "dbTitle", "dbShape", "dbOut", "dbCalc", "dbApprox", "dbContext"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.dbNC.innerHTML = [5, 10, 20, 30, 50, 100].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.dbPiC.innerHTML = [0.05, 0.1, 0.3, 0.5, 0.7, 0.9].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.dbLamC.innerHTML = [0.5, 1, 3, 5, 10, 20].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    S.k = 6;

    function pmf(k) {
      return S.dist === "binom" ? ST.binomPMF(k, S.n, S.pi) : ST.poissonPMF(k, S.lam);
    }
    function cdf(k) {
      return S.dist === "binom" ? ST.binomCDF(k, S.n, S.pi) : ST.poissonCDF(k, S.lam);
    }
    function kmax() { return S.dist === "binom" ? S.n : Math.min(60, Math.ceil(S.lam * 3.2) + 3); }

    function draw() {
      const isB = S.dist === "binom";
      E.dbBinomBox.hidden = !isB; E.dbPoisBox.hidden = isB;
      E.dbTitle.textContent = isB ? "二项分布 B(" + S.n + ", " + U.F.num(S.pi, 2) + ")" : "泊松分布 P(λ = " + U.F.num(S.lam, 1) + ")";
      E.dbN.textContent = S.n; E.dbPi.textContent = U.F.num(S.pi, 2); E.dbLam.textContent = U.F.num(S.lam, 1);
      U.$$("#dbType button").forEach(b => b.classList.toggle("active", b.dataset.d === S.dist));

      const mu = isB ? S.n * S.pi : S.lam;
      const varr = isB ? S.n * S.pi * (1 - S.pi) : S.lam;
      const sd = Math.sqrt(varr);
      if (S.k > kmax()) S.k = Math.round(mu);
      E.dbShape.textContent = "均值 " + U.F.num(mu, 2) + " · 方差 " + U.F.num(varr, 2) + (Math.abs(varr - mu) < 0.05 ? " · 方差 ≈ 均值" : "");

      const K = kmax();
      let mx = 0;
      for (let k = 0; k <= K; k++) mx = Math.max(mx, pmf(k));

      const p = U.makePlot({ W: 880, H: 360, xr: [-0.6, K + 0.6], yr: [0, 1] });
      p.setY(0, mx * 1.2).bg().grid(0, 0).axes({ xLabel: "k（成功次数 / 事件数）", yLabel: "P(X = k)" });

      // 正态近似曲线
      if (S.showNormal && sd > 0 && mx > 0) {
        p.line(k => ST.normalPDF(k, mu, sd), {
          x0: -0.6, x1: K + 0.6, stroke: "var(--g3)", width: 2, dash: "6 4", opacity: .85
        });
      }
      // 柱
      for (let k = 0; k <= K; k++) {
        const pk = pmf(k);
        const on = k === S.k;
        p.bar(k - 0.42, k + 0.42, pk, {
          fill: on ? "rgba(255,183,3,.55)" : "rgba(76,201,240,.42)",
          stroke: on ? "var(--g2)" : "rgba(76,201,240,.9)",
          width: on ? 2 : 1, rx: 2
        });
      }
      // k 标签（稀疏）
      const lab = Math.max(1, Math.ceil(K / 22));
      for (let k = 0; k <= K; k += lab) {
        p.raw('<text x="' + p.x(k).toFixed(1) + '" y="' + (p.M.t + p.PH + 33) + '" fill="' + U.cvar("--fg-faint", "#6f7b9b") + '" font-size="10.5" font-family="monospace" text-anchor="middle">' + k + "</text>");
      }
      // 均值线
      if (mu <= K) p.vline(mu, { stroke: "var(--g4)", label: "μ = " + U.F.num(mu, 1), dash: "4 3" });

      p.mount(E.dbChart);

      // 读数
      const pk = pmf(S.k);
      E.dbOut.innerHTML = U.readouts([
        { k: "均值 μ", v: U.F.num(mu, 3), hi: true, mini: isB ? "nπ" : "λ" },
        { k: "方差 σ²", v: U.F.num(varr, 3), mini: isB ? "nπ(1−π)" : "λ" },
        { k: "标准差 σ", v: U.F.num(sd, 3) },
        { k: "P(X = " + S.k + ")", v: U.F.num(pk, 5), hi: true, mini: "选中点" },
        { k: "P(X ≤ " + S.k + ")", v: U.F.num(cdf(S.k), 5), mini: "累积" },
        { k: "P(X ≥ " + S.k + ")", v: U.F.num(1 - cdf(S.k) + pk, 5), mini: "右尾" }
      ]);

      // 计算明细
      if (isB) {
        E.dbCalc.innerHTML =
          '<div><span class="lbl">公式 </span>P(X = k) = C(n,k) · π^k · (1−π)^(n−k)</div>' +
          '<div><span class="lbl">代入 </span>P(X = ' + S.k + ") = C(" + S.n + "," + S.k + ") × " + U.F.num(S.pi, 2) + "^" + S.k +
          " × " + U.F.num(1 - S.pi, 2) + "^" + (S.n - S.k) + "</div>" +
          '<div><span class="lbl">组合数 </span>C(' + S.n + "," + S.k + ") = <b>" + U.F.num(ST.factorial(S.n) / (ST.factorial(S.k) * ST.factorial(S.n - S.k)), 0) + "</b></div>" +
          '<div><span class="lbl">结果 </span>= <b>' + U.F.num(pk, 6) + "</b></div>";
      } else {
        E.dbCalc.innerHTML =
          '<div><span class="lbl">公式 </span>P(X = k) = λ^k · e^(−λ) / k!</div>' +
          '<div><span class="lbl">代入 </span>P(X = ' + S.k + ") = " + U.F.num(S.lam, 1) + "^" + S.k + " × e^(−" + U.F.num(S.lam, 1) + ") / " + S.k + "!</div>" +
          '<div><span class="lbl">分子 </span><b>' + U.F.num(Math.pow(S.lam, S.k) * Math.exp(-S.lam), 6) + "</b></div>" +
          '<div><span class="lbl">结果 </span>= <b>' + U.F.num(pk, 6) + "</b></div>";
      }

      // 近似检验
      if (isB) {
        const c1 = S.n * S.pi, c2 = S.n * (1 - S.pi);
        const ok = c1 >= 5 && c2 >= 5;
        const maxd = ok ? Math.max(Math.abs(cdf(Math.round(mu)) - ST.normalCDF((Math.round(mu) + 0.5 - mu) / sd)), Math.abs(pmf(Math.round(mu)) - ST.normalPDF(Math.round(mu), mu, sd))) : NaN;
        E.dbApprox.innerHTML =
          '<div class="kv">' +
          '<div class="k">nπ</div><div class="v">' + U.F.num(c1, 2) + "</div>" +
          '<div class="k">n(1−π)</div><div class="v">' + U.F.num(c2, 2) + "</div>" +
          '<div class="k">是否满足条件</div><div class="v ' + (ok ? "" : "na") + '">' + (ok ? "满足，可近似" : "不满足") + "</div>" +
          "</div>" +
          '<div class="callout ' + (ok ? "ok" : "warn") + ' mt10">' +
          (ok ? "两个条件都 ≥ 5，正态近似可用。注意柱状图的轮廓已经和红线很贴合。" :
            "目前分布明显偏斜，正态曲线贴合度差。<b>盲目使用正态近似会得到错误的 p 值</b>——这正是传播数据里「小概率事件」难以用正态处理的原因。") + "</div>";
      } else {
        E.dbApprox.innerHTML = '<div class="callout info">泊松分布无需近似条件。它的特征性质是<b>均值等于方差</b>：当前两者都是 ' + U.F.num(S.lam, 2) + "。</div>" +
          '<div class="callout warn mt10"><span class="ttl">实际数据中的检验</span>若某计数的样本方差<b>远大于</b>均值（过度离散），说明泊松假设不成立——转发数、评论数常属此类，需要改用负二项分布。</div>';
      }

      E.dbContext.innerHTML = isB
        ? "<b>二项分布适合描述：</b><br>" +
        "· n 篇推文中被转发的篇数（每篇只有转发 / 未转发）<br>" +
        "· 抽取 n 人中有多少人接触过某条新闻<br>" +
        "· A/B 测试中 n 个用户里有多少人点击<br><br>" +
        "<b>四个必须同时满足的条件：</b>①试验次数 n 固定；②每次只有两种结果；③各次相互独立；④成功概率 π 保持不变。<br><br>" +
        "<b>最容易被违反的是第 ③ 条</b>——同一个人看多条推送，前一条的体验会影响后一条的点击，此时真实方差会比 nπ(1−π) 大。"
        : "<b>泊松分布适合描述：</b><br>" +
        "· 一小时内某话题的突发转发次数<br>" +
        "· 某条视频在单位时间内的评论数<br>" +
        "· 某地区一天内出现的舆情事件数<br><br>" +
        "<b>为什么这些场景是泊松？</b>因为事件「次数少、基数大」——潜在机会极多，但每次发生概率极低。<br><br>" +
        "<b>与二项分布的关系：</b>当 n → ∞、π → 0 且 nπ = λ 保持不变时，二项分布收敛于泊松分布。可以把泊松理解为「二项分布中稀有事件的极限形态」。";
    }

    // 事件
    const setN = v => { S.n = Math.max(1, Math.min(200, Math.round(v))); if (S.k > S.n) S.k = S.n; draw(); };
    const setPi = v => { S.pi = Math.max(0.01, Math.min(0.99, v)); draw(); };
    const setLam = v => { S.lam = Math.max(0.1, Math.min(60, v)); draw(); };
    E.dbNM.onclick = () => setN(S.n - 1);
    E.dbNP.onclick = () => setN(S.n + 1);
    E.dbNC.onclick = e => { const b = e.target.closest("button"); if (b) setN(+b.dataset.v); };
    E.dbPiR.oninput = () => setPi(+E.dbPiR.value);
    E.dbPiC.onclick = e => { const b = e.target.closest("button"); if (b) { E.dbPiR.value = b.dataset.v; setPi(+b.dataset.v); } };
    E.dbLamR.oninput = () => setLam(+E.dbLamR.value);
    E.dbLamC.onclick = e => { const b = e.target.closest("button"); if (b) { E.dbLamR.value = b.dataset.v; setLam(+b.dataset.v); } };
    E.dbType.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      S.dist = b.dataset.d; S.k = Math.round(S.dist === "binom" ? S.n * S.pi : S.lam); draw();
    };
    E.dbNorm.onchange = () => { S.showNormal = E.dbNorm.checked; draw(); };
    E.dbReset.onclick = () => {
      S.dist = "binom"; S.n = 20; S.pi = 0.3; S.lam = 3; S.k = 6;
      E.dbPiR.value = 0.3; E.dbLamR.value = 3; draw();
    };

    // 点击柱
    const hit = () => {
      const svg = E.dbChart, r = svg.getBoundingClientRect();
      const sc = Math.min(r.width / 880, r.height / 360);
      const ox = (r.width - 880 * sc) / 2, oy = (r.height - 360 * sc) / 2;
      return { sc, ox, oy };
    };
    E.dbChart.addEventListener("click", ev => {
      const { sc, ox, oy } = hit();
      const px = (ev.clientX - E.dbChart.getBoundingClientRect().left - ox) / sc;
      const K = kmax();
      const left = 62, right = 880 - 26;
      const k = Math.round((px - left) / (right - left) * (K + 1.2) - 0.6);
      if (k >= 0 && k <= K) { S.k = k; draw(); }
    });

    draw();
  }
});

})();
