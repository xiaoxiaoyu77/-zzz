/* =========================================================
   lab-set5.js — 互动模块（五）：相关与回归
     · corr-reg    相关与一元回归（含 Anscombe 四组数据）
     · multi-reg   多元回归与共线性诊断
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

/* ==========================================================
   模块 10 · 相关与一元回归
   ========================================================== */
LAB.register({
  id: "corr-reg",
  render(root) {
    /* Anscombe 四组数据 —— 经典教学材料：r 完全相同，图形截然不同 */
    const ANSCOMBE = {
      a1: { name: "Anscombe I（正常线性）", x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68] },
      a2: { name: "Anscombe II（曲线）", x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74] },
      a3: { name: "Anscombe III（一个离群点）", x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73] },
      a4: { name: "Anscombe IV（全靠一个点）", x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89] }
    };
    const S = {
      preset: "lin", pts: [], drag: -1, showResid: true, showMean: true, showR2: false, hover: -1
    };

    const PRESETS = {
      lin: "线性正相关",
      strong: "强相关",
      none: "无关系",
      curv: "U 型（非线性）",
      outlier: "一个极端值毁掉一切",
      a1: "Anscombe I", a2: "Anscombe II", a3: "Anscombe III", a4: "Anscombe IV"
    };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">数据形态</div>' +
      U.chips("crPreset", Object.keys(PRESETS).map(k => ({ v: k, t: PRESETS[k] })), "lin") +
      '<div class="note" id="crScene"></div>' +
      U.ctrl({ label: "显示选项", body: '<div style="display:flex;flex-direction:column;gap:8px">' + U.sw("crResid", "画出残差（竖直短线）", true) + U.sw("crMean", "画出两个变量的均值线", true) + U.sw("crR2", "用面积拆分显示 r²", false) + "</div>" }) +
      '<div class="ctrl"><div class="sub">操作提示</div><div class="note">' +
      "<b>拖动任何一个点</b>，回归直线、r、r² 会立刻重算。<br>" +
      "<b>双击画布</b>空白处可以新增一个点。<br>" +
      "<b>右键点击</b>某个点可以删除它。</div></div>" +
      '<div class="ctrl"><button class="btn block" id="crReset">恢复初始数据</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>散点图与回归直线</h2><span class="spacer"></span>' +
      '<span class="badge" id="crBadge"></span></div>' +
      '<div class="stage"><svg id="crChart" class="draggable"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "观测点（可拖动）", dot: true },
        { c: "url(#lgA)", t: "最小二乘回归直线", dot: false },
        { c: "var(--g2)", t: "残差 = 实际 − 预测", dot: false },
        { c: "var(--g4)", t: "x̄ 与 ȳ 的位置", dot: false }
      ]) +
      U.hints(["<b>拖动点</b>改变数据", "<b>双击</b>新增", "<b>右键</b>删除", "<b>悬停</b>读该点坐标与残差"]) +
      "</div>" +
      '<div class="readouts" id="crOut"></div>' +
      '<div class="narr" id="crNarr"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>回归方程与检验</h2></div><div id="crReg"></div></section>' +
      '<section class="card"><div class="card-h"><h2>r 与 r² 的关系</h2></div>' +
      '<div id="crR2bar"></div>' +
      '<div class="callout warn mt10"><span class="ttl">最容易被混淆的一步</span>' +
      "r = 0.50 听起来「中等偏强」，但 r² = <b>0.25</b> —— 只解释了四分之一的变异。<br>" +
      "r 衡量<b>线性关系强度</b>，r² 衡量<b>能解释多少</b>。报告时必须两个都给。</div></section>" +
      '<section class="card"><div class="card-h"><h2>相关 ≠ 因果</h2></div>' +
      '<div class="prose fs14" style="max-width:none">' +
      '<p>X 与 Y 相关，至少有四种可能：</p>' +
      "<ul style=\"padding-left:20px;margin:8px 0\">" +
      "<li><b>X → Y</b>：真因果</li>" +
      "<li><b>Y → X</b>：反向因果</li>" +
      "<li><b>Z → X 且 Z → Y</b>：共同原因</li>" +
      "<li><b>纯巧合</b>：抽样波动或数据挖掘的产物</li></ul>" +
      '<p class="note mb0">回归只能控制<b>已观测</b>的混淆变量。未观测的混淆变量，统计方法无从发现。</p>' +
      "</div></section>" +
      "</div>" +

      '<div class="card mt18"><div class="card-h"><h2>Anscombe 四组数据：统计量相同，图形天差地别</h2>' +
      '<span class="spacer"></span><span class="badge purple">r ≈ 0.816，全部相同</span></div>' +
      '<div class="grid g4" id="crAnsc" style="margin-top:0"></div>' +
      '<div class="callout danger mt14"><span class="ttl">这张图说明了什么</span>' +
      "四组数据的 <b>均值、方差、相关系数、回归直线完全相同</b>（x̄ = 9, ȳ = 7.5, r = 0.816, 斜率 = 0.5），但图形完全不同：<br>" +
      "I 是正常线性关系；II 是明显的曲线；III 有一个把直线拉偏的离群点；IV 则完全靠一个 x = 19 的点支撑起「相关」。<br><br>" +
      "<b>结论：任何相关 / 回归分析都必须先看散点图。</b>只看统计量会得出严重错误的判断。</div>" +
      "</div>";

    const ids = ["crPreset", "crScene", "crResid", "crMean", "crR2", "crReset", "crBadge",
      "crChart", "crOut", "crNarr", "crReg", "crR2bar", "crAnsc"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));

    const rng = new ST.RNG(1618033);
    function gen(k) {
      if (ANSCOMBE[k]) {
        return ANSCOMBE[k].x.map((x, i) => ({ x, y: ANSCOMBE[k].y[i] }));
      }
      const out = [];
      for (let i = 0; i < 18; i++) {
        const x = 1 + i * 0.55 + rng.normal(0, 0.28);
        let y;
        if (k === "lin") y = 2 + 1.1 * x + rng.normal(0, 1.05);
        else if (k === "strong") y = 2 + 1.1 * x + rng.normal(0, 0.38);
        else if (k === "none") y = 6 + rng.normal(0, 1.5);
        else if (k === "curv") y = 2 + 2.6 * x - 0.19 * x * x + rng.normal(0, 0.4);
        else if (k === "outlier") y = 2 + 1.1 * x + rng.normal(0, 0.42);
        out.push({ x: +x.toFixed(2), y: +y.toFixed(2) });
      }
      if (k === "outlier") out.push({ x: 8.2, y: 16.5 });
      return out;
    }

    const SCENES = {
      lin: "两个变量大致呈线性同向变动。这是最「标准」的情形。",
      strong: "点几乎贴着一条直线排布，相关系数接近 1。",
      none: "x 与 y 毫无关系——但注意，回归软件仍然会给你画出一条线、给出一个 r 值。工具永远会输出数字，判断靠人。",
      curv: "真实关系是倒 U 型。线性相关系数会**接近 0**，让人误以为「没有关系」。这是 r 最容易骗人的场景。",
      outlier: "添加了一个位于右上角的极端值。观察 r 从平凡变成「显著」的过程。",
      a1: "Anscombe I：标准线性关系。",
      a2: "Anscombe II：明显是曲线，但线性相关系数与 I 完全相同。",
      a3: "Anscombe III：一个离群点把直线拉偏，其余点几乎垂直排列。",
      a4: "Anscombe IV：除一个 x = 19 的点外，其余所有 x 都等于 8，直线完全由一个点决定。"
    };

    function load(k) {
      S.preset = k;
      S.pts = gen(k);
      U.$$("#crPreset button").forEach(b => b.classList.toggle("active", b.dataset.v === k));
      E.crScene.textContent = SCENES[k].replace(/\*\*/g, "");
    }
    load("lin");

    function draw() {
      const pts = S.pts;
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const reg = ST.olsSimple(xs, ys);
      const r = ST.pearson(xs, ys);
      const n = pts.length;

      const xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
      const ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
      const xpad = (xmax - xmin) * 0.12 || 1, ypad = (ymax - ymin) * 0.14 || 1;

      const p = U.makePlot({
        W: 880, H: 430,
        xr: [xmin - xpad, xmax + xpad],
        yr: [ymin - ypad, ymax + ypad]
      });
      p.bg().grid(0, 0).axes({ xLabel: "自变量 X", yLabel: "因变量 Y", zeroLine: false });

      // 均值线
      if (S.showMean) {
        p.vline(ST.mean(xs), { stroke: "var(--g4)", dash: "5 4", label: "x̄ = " + U.F.num(ST.mean(xs), 2) });
        p.hline(ST.mean(ys), { stroke: "var(--g4)", dash: "5 4" });
        p.ptext(p.M.l + 6, p.y(ST.mean(ys)) - 6, "ȳ = " + U.F.num(ST.mean(ys), 2), { fill: "var(--g4)", size: 11, mono: true });
      }

      // 回归直线
      if (reg.ok) {
        const x0 = p.xr[0], x1 = p.xr[1];
        p.line(x => reg.intercept + reg.slope * x, { x0, x1, n: 2, stroke: "url(#lgA)", width: 2.8 });
      }

      // 残差
      if (S.showResid && reg.ok) {
        pts.forEach(pt => {
          const fit = reg.intercept + reg.slope * pt.x;
          p.raw('<line x1="' + p.x(pt.x).toFixed(1) + '" y1="' + p.y(pt.y).toFixed(1) + '" x2="' + p.x(pt.x).toFixed(1) + '" y2="' + p.y(fit).toFixed(1) + '" stroke="var(--g2)" stroke-width="1.8" opacity=".8"/>');
        });
      }

      // r² 面积可视化（把每个点的变异拆成「被解释」与「残差」）
      if (S.showR2 && reg.ok) {
        const mx = ST.mean(xs), my = ST.mean(ys);
        pts.forEach(pt => {
          const fit = reg.intercept + reg.slope * pt.x;
          p.raw('<line x1="' + p.x(pt.x).toFixed(1) + '" y1="' + p.y(my).toFixed(1) + '" x2="' + p.x(pt.x).toFixed(1) + '" y2="' + p.y(fit).toFixed(1) + '" stroke="rgba(61,220,151,.85)" stroke-width="3"/>');
          p.raw('<line x1="' + p.x(pt.x).toFixed(1) + '" y1="' + p.y(fit).toFixed(1) + '" x2="' + p.x(pt.x).toFixed(1) + '" y2="' + p.y(pt.y).toFixed(1) + '" stroke="rgba(247,37,133,.85)" stroke-width="3"/>');
        });
      }

      // 点
      pts.forEach((pt, i) => {
        const on = S.drag === i || S.hover === i;
        p.raw('<circle cx="' + p.x(pt.x).toFixed(1) + '" cy="' + p.y(pt.y).toFixed(1) + '" r="' + (on ? 8 : 6) + '" fill="' +
          (on ? "rgba(76,201,240,.55)" : "rgba(76,201,240,.22)") + '" stroke="var(--g1)" stroke-width="' + (on ? 3 : 2) + '"/>');
      });

      // 悬停提示
      if (S.hover >= 0 && S.hover < pts.length && reg.ok) {
        const pt = pts[S.hover];
        const fit = reg.intercept + reg.slope * pt.x;
        p.tooltip(p.x(pt.x), p.y(pt.y), [
          "第 " + (S.hover + 1) + " 个点",
          "x = " + U.F.num(pt.x, 3),
          "y = " + U.F.num(pt.y, 3),
          "预测 ŷ = " + U.F.num(fit, 3),
          "残差 = " + U.F.num(pt.y - fit, 3)
        ]);
      }

      p.mount(E.crChart);

      /* ---- 读数 ---- */
      const ct = n > 2 ? ST.corrTest(r, n) : { t: NaN, df: n - 2, p: NaN };
      const ci = n > 3 ? ST.corrCI(r, n, 0.05) : null;
      E.crBadge.className = "badge " + (Math.abs(r) >= 0.5 ? "ok" : Math.abs(r) >= 0.3 ? "warn" : "");
      E.crBadge.textContent = "r = " + U.F.num(r, 3) + "  ·  r² = " + U.F.num(r * r, 3);

      E.crOut.innerHTML = U.readouts([
        { k: "样本量 n", v: n },
        { k: "相关系数 r", v: U.F.num(r, 4), hi: true, mini: U.F.effect(r, "r") + "线性关系" },
        { k: "决定系数 r²", v: U.F.num(r * r, 4), hi: true, mini: "解释 " + U.F.num(r * r * 100, 1) + "% 的变异" },
        { k: "回归系数 b₁", v: reg.ok ? U.F.num(reg.slope, 4) : "—", mini: "X 每增 1，Y 平均变这么多" },
        { k: "截距 b₀", v: reg.ok ? U.F.num(reg.intercept, 4) : "—" },
        { k: "r 的 p 值", v: U.F.pApa(ct.p), cls: ct.p < 0.05 ? "ok" : "warn", mini: "df = " + (n - 2) },
        { k: "r 的 95% CI", v: ci ? "[" + U.F.num(ci.lo, 2) + ", " + U.F.num(ci.hi, 2) + "]" : "—", mini: "Fisher z 变换" },
        { k: "斯皮尔曼 ρ", v: U.F.num(ST.spearman(xs, ys), 4), mini: "秩相关" }
      ]);

      /* ---- 回归卡 ---- */
      if (reg.ok) {
        const eq = "ŷ = " + U.F.num(reg.intercept, 3) + (reg.slope >= 0 ? " + " : " − ") + U.F.num(Math.abs(reg.slope), 3) + "x";
        E.crReg.innerHTML =
          '<div class="formula" style="font-size:17px">' + eq + "</div>" +
          U.steps([
            { sym: "斜率 b₁ = r · (s<sub>y</sub> / s<sub>x</sub>)", num: "= " + U.F.num(r, 3) + " × (" + U.F.num(ST.sd(ys), 3) + " / " + U.F.num(ST.sd(xs), 3) + ") = <b>" + U.F.num(reg.slope, 4) + "</b>", plain: "b₁ 与 r 同号。r 是无量纲的强度，b₁ 有单位、有实际含义。" },
            { sym: "截距 b₀ = ȳ − b₁ · x̄", num: "= " + U.F.num(ST.mean(ys), 3) + " − " + U.F.num(reg.slope, 4) + " × " + U.F.num(ST.mean(xs), 3) + " = <b>" + U.F.num(reg.intercept, 4) + "</b>", plain: "回归直线必然穿过点 (x̄, ȳ)。" },
            { sym: "b₁ 的显著性检验", num: "t(" + reg.dfE + ") = <b>" + U.F.num(reg.coef[1].t, 3) + "</b>，p = <b>" + U.F.pApa(reg.coef[1].p) + "</b>", plain: "在一元回归中，检验 b₁ = 0 与检验 r = 0 完全等价。" },
            { sym: "决定系数 R²", num: "R² = <b>" + U.F.num(reg.r2, 4) + "</b>", plain: "模型解释了 Y 变异的 " + U.F.num(reg.r2 * 100, 1) + "%，还剩 " + U.F.num((1 - reg.r2) * 100, 1) + "% 无法解释。" }
          ]) +
          '<div class="callout info mt10"><span class="ttl">残差诊断</span>' +
          "残差的标准差（RMSE）= <b>" + U.F.num(reg.rmse, 3) + "</b>，即模型预测的平均误差量级。" +
          (Math.abs(reg.durbinWatson - 2) > 0.8 ? " 杜宾-沃森值 = " + U.F.num(reg.durbinWatson, 2) + "，偏离 2 较多，提示残差可能存在自相关。" : "") +
          "</div>";
      }

      /* ---- r² 拆解 ---- */
      const rr = Math.max(0, Math.min(1, r * r));
      const exp = Math.round(rr * 100), un = 100 - exp;
      E.crR2bar.innerHTML =
        '<div style="font-family:var(--mono);font-size:12.5px;color:var(--fg-mut);margin-bottom:8px">Y 的总变异</div>' +
        '<div class="prog" style="height:26px;border-radius:9px;overflow:hidden;display:flex">' +
        '<i style="width:' + exp + '%;height:100%;background:var(--grad);border-radius:0;display:flex;align-items:center;justify-content:center;font-size:11px">' + (exp > 12 ? exp + "%" : "") + "</i>" +
        '<i style="width:' + un + '%;height:100%;background:rgba(247,37,133,.35);border-radius:0;display:flex;align-items:center;justify-content:center;font-size:11px">' + (un > 12 ? un + "%" : "") + "</i>" +
        "</div>" +
        '<div class="kv mt14">' +
        '<div class="k">被 X 解释（r²）</div><div class="v">' + U.F.num(rr * 100, 2) + "%</div>" +
        '<div class="k">未被解释（1 − r²）</div><div class="v">' + U.F.num((1 - rr) * 100, 2) + "%</div>" +
        '<div class="k">相关系数 |r|</div><div class="v">' + U.F.num(Math.abs(r), 4) + "</div>" +
        '<div class="k">判定强度</div><div class="v">' + U.F.effect(r, "r") + "</div>" +
        "</div>";
    }

    /* ---- Anscombe 缩略图 ---- */
    function drawAnscombe() {
      E.crAnsc.innerHTML = ["a1", "a2", "a3", "a4"].map(k => {
        const d = ANSCOMBE[k];
        const xs = d.x, ys = d.y;
        const r = ST.pearson(xs, ys);
        const reg = ST.olsSimple(xs, ys);
        const p = U.makePlot({ W: 240, H: 170, xr: [2, 21], yr: [2, 14], margin: { l: 28, r: 10, t: 16, b: 24 } });
        p.bg().axes({ stepX: 5, stepY: 4 });
        p.line(x => reg.intercept + reg.slope * x, { x0: 2, x1: 21, n: 2, stroke: "url(#lgA)", width: 2 });
        xs.forEach((x, i) => { p.raw('<circle cx="' + p.x(x).toFixed(1) + '" cy="' + p.y(ys[i]).toFixed(1) + '" r="3.2" fill="rgba(76,201,240,.5)" stroke="var(--g1)" stroke-width="1.2"/>'); });
        return '<div class="card pad-s"><div class="fs11 mono faint">Anscombe ' + k.slice(1).toUpperCase() + "</div>" +
          '<div class="stage" style="border:0;background:transparent;padding:0"><svg id="ansc_' + k + '"></svg></div>' +
          '<div class="kv" style="font-size:11.5px;margin-top:6px">' +
          '<div class="k">r</div><div class="v">' + U.F.num(r, 3) + "</div>" +
          '<div class="k">斜率</div><div class="v">' + U.F.num(reg.slope, 3) + "</div>" +
          '<div class="k">R²</div><div class="v">' + U.F.num(reg.r2, 3) + "</div>" +
          "</div></div>";
      }).join("") ;
      ["a1", "a2", "a3", "a4"].forEach(k => {
        const d = ANSCOMBE[k];
        const reg = ST.olsSimple(d.x, d.y);
        const p = U.makePlot({ W: 240, H: 170, xr: [2, 21], yr: [2, 14], margin: { l: 28, r: 10, t: 16, b: 24 } });
        p.bg().axes({ stepX: 5, stepY: 4 });
        p.line(x => reg.intercept + reg.slope * x, { x0: 2, x1: 21, n: 2, stroke: "url(#lgA)", width: 2 });
        d.x.forEach((x, i) => { p.raw('<circle cx="' + p.x(x).toFixed(1) + '" cy="' + p.y(d.y[i]).toFixed(1) + '" r="3.2" fill="rgba(76,201,240,.5)" stroke="var(--g1)" stroke-width="1.2"/>'); });
        const svg = document.getElementById("ansc_" + k);
        if (svg) p.mount(svg);
      });
    }

    /* ---- 叙述 ---- */
    function narr() {
      const pts = S.pts;
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const r = ST.pearson(xs, ys);
      const reg = ST.olsSimple(xs, ys);
      const n = pts.length;
      const ct = n > 2 ? ST.corrTest(r, n) : { p: NaN };
      const absr = Math.abs(r);
      let shape = "";
      if (absr < 0.1) shape = "这两个变量几乎没有线性关系。<b>但注意：r 接近 0 只说明「没有线性关系」，不等于「没有关系」</b>——把数据预设切换到「U 型」看看。";
      else if (absr < 0.3) shape = "线性关系很弱，点的散布远超直线本身能解释的范围。";
      else if (absr < 0.5) shape = "线性关系中等，但仍有一大半变异无法由这条直线解释。";
      else if (absr < 0.7) shape = "线性关系较强，散点明显围绕直线聚集。";
      else shape = "线性关系很强，点几乎贴着直线排列。";
      const pTxt = ct.p < 0.001 ? "< .001" : "= " + U.F.pApa(ct.p);
      E.crNarr.innerHTML =
        "n = <b>" + n + "</b>，r = <b>" + U.F.num(r, 4) + "</b>，r² = <b>" + U.F.num(r * r, 4) + "</b>，p " + pTxt + "。" + shape +
        (reg.ok ? " 每增加 1 个单位 X，Y 平均变化 <b>" + U.F.num(reg.slope, 3) + "</b> 个单位。" : "") +
        (S.preset === "curv" ? " <b>当前数据有明显弯曲趋势</b>——r 值会严重低估真实关系的强度，这是相关系数最典型的失效场景。" : "") +
        (S.preset === "outlier" ? " <b>试试拖走右上角那个点</b>，看 r 如何骤然下跌。一个观测就能决定整篇结论。" : "");
    }
    const narrOld = narr;

    /* ---- 事件 ---- */
    E.crPreset.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      load(b.dataset.v); draw(); narr();
    };
    E.crResid.onchange = () => { S.showResid = E.crResid.checked; draw(); };
    E.crMean.onchange = () => { S.showMean = E.crMean.checked; draw(); };
    E.crR2.onchange = () => { S.showR2 = E.crR2.checked; draw(); };
    E.crReset.onclick = () => { load(S.preset); draw(); narr(); };

    // 拖拽
    let W = 880, H = 430;
    const localOf = ev => {
      const r = E.crChart.getBoundingClientRect();
      const sc = Math.min(r.width / W, r.height / H);
      const ox = (r.width - W * sc) / 2, oy = (r.height - H * sc) / 2;
      return { x: (ev.clientX - r.left - ox) / sc, y: (ev.clientY - r.top - oy) / sc };
    };
    const toData = ev => {
      const xs = S.pts.map(p => p.x), ys = S.pts.map(p => p.y);
      const xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
      const ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
      const xpad = (xmax - xmin) * 0.12 || 1, ypad = (ymax - ymin) * 0.14 || 1;
      const ML = 62, MR = 26, MT = 26, MB = 50;
      const PW = W - ML - MR, PH = H - MT - MB;
      const lp = localOf(ev);
      return {
        x: (xmin - xpad) + (lp.x - ML) / PW * ((xmax + xpad) - (xmin - xpad)),
        y: (ymin - ypad) + (1 - (lp.y - MT) / PH) * ((ymax + ypad) - (ymin - ypad)),
        lp
      };
    };
    const nearest = (d) => {
      let best = -1, bd = 1e9;
      S.pts.forEach((pt, i) => {
        const dx = pt.x - d.x, dy = pt.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bd) { bd = dist; best = i; }
      });
      const span = Math.max(1e-6, Math.abs(d.x) * 0.06 + 0.35);
      return bd < span ? best : -1;
    };

    E.crChart.addEventListener("pointerdown", ev => {
      const d = toData(ev);
      const i = nearest(d);
      if (i >= 0) { S.drag = i; try { E.crChart.setPointerCapture(ev.pointerId); } catch (e) { } }
    });
    E.crChart.addEventListener("pointermove", ev => {
      const d = toData(ev);
      if (S.drag >= 0) {
        S.pts[S.drag].x = +d.x.toFixed(2);
        S.pts[S.drag].y = +d.y.toFixed(2);
        draw(); narr();
      } else {
        const i = nearest(d);
        if (i !== S.hover) { S.hover = i; draw(); }
      }
    });
    E.crChart.addEventListener("pointerup", () => { S.drag = -1; draw(); });
    E.crChart.addEventListener("pointerleave", () => { S.drag = -1; S.hover = -1; draw(); });
    E.crChart.addEventListener("dblclick", ev => {
      const d = toData(ev);
      S.pts.push({ x: +d.x.toFixed(2), y: +d.y.toFixed(2) });
      draw(); narr();
    });
    E.crChart.addEventListener("contextmenu", ev => {
      ev.preventDefault();
      const d = toData(ev);
      const i = nearest(d);
      if (i >= 0 && S.pts.length > 3) { S.pts.splice(i, 1); draw(); narr(); }
    });

    draw(); narr(); drawAnscombe();
  }
});

/* ==========================================================
   模块 11 · 多元回归与共线性诊断
   ========================================================== */
LAB.register({
  id: "multi-reg",
  render(root) {
    const S = {
      use: { fans: true, len: true, img: true, titleLen: true, likes: false, topicHot: false },
      n: 60, noise: 100, alpha: 0.05, showStd: false
    };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">自变量选择</div>' +
      U.ctrl({
        label: "进入模型的自变量",
        body: '<div style="display:flex;flex-direction:column;gap:6px">' +
          U.sw("mrFans", "粉丝基数（真实有效）", true) +
          U.sw("mrLen", "正文字数（真实无效）", true) +
          U.sw("mrImg", "是否配图（真实有效）", true) +
          U.sw("mrTl", "标题长度（真实无效）", true) +
          U.sw("mrLikes", "<b style='color:var(--danger)'>点赞数（与因变量高度共线）</b>", false) +
          U.sw("mrTopic", "<b style='color:var(--warn)'>话题热度（与粉丝基数共线）</b>", false) + "</div>",
        note: "后两个是专门用来演示<b>共线性</b>的：它们与因变量或与已有自变量高度相关。打开它们，看系数和标准误怎么变。"
      }) +
      U.ctrl({ label: "样本量 n（推文条数）", valHtml: '<span id="mrN"></span>', body: '<input type="range" id="mrNR" min="20" max="400" step="5" value="60">' }) +
      U.ctrl({ label: "随机噪音强度", valHtml: '<span id="mrNoise"></span>', body: '<input type="range" id="mrNoiseR" min="20" max="300" step="5" value="100">', note: "噪音越大，R² 越低，系数越难显著。" }) +
      U.ctrl({ label: "显示选项", body: U.sw("mrStd", "系数表显示标准化系数 Beta", false) }) +
      '<div class="ctrl"><button class="btn block" id="mrNew">重新生成一批数据</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>回归系数表</h2><span class="spacer"></span>' +
      '<span class="badge" id="mrFit"></span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      "<th>自变量</th><th>" + "B" + "</th><th>标准误</th><th>Beta / t</th><th>p</th><th>95% CI</th><th>VIF</th>" +
      '</tr></thead><tbody id="mrTable"></tbody></table></div>' +
      '<div class="note">B 是<b>非标准化</b>系数，用于写回归方程；Beta 是<b>标准化</b>系数，用于比较不同自变量的相对重要性。<b>VIF &gt; 10 提示严重共线性</b>。</div>' +
      "</div>" +
      '<div class="readouts" id="mrOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>残差诊断</h2></div>' +
      '<div class="stage"><svg id="mrResid" class="draggable"></svg></div>' +
      '<div class="note mt10" id="mrResidNote"></div></section>' +
      '<section class="card"><div class="card-h"><h2>共线性诊断：VIF 怎么看</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>VIF</th><th>含义</th><th>处理</th></tr></thead><tbody>' +
      '<tr><td class="tx">&lt; 5</td><td>安全</td><td>正常解读</td></tr>' +
      '<tr><td class="tx">5 – 10</td><td>值得警惕</td><td>检查相关矩阵</td></tr>' +
      '<tr><td class="tx" style="color:var(--danger)">&gt; 10</td><td>严重共线</td><td>删变量 / 合并 / 用岭回归</td></tr>' +
      "</tbody></table></div>" +
      '<div class="callout warn mt10"><span class="ttl">共线性为什么可怕</span>' +
      "当两个自变量高度相关时，模型<b>无法分辨</b>各自独立的贡献。表现是：标准误急剧膨胀、置信区间变宽、系数符号甚至可能反常（本该为正的系数变成负的），而你却看不出任何计算错误。<br><br>" +
      "<b>症状自检：</b>整个模型 F 检验显著、R² 很高，但每个自变量单独看都不显著——这几乎必然是共线性。</div></section>" +
      '<section class="card"><div class="card-h"><h2>这份数据的真实结构</h2></div>' +
      '<div class="note mb12">下面这张表是<b>生成数据时使用的真实参数</b>，可用来检验模型能不能把它们估回来。真实研究里我们当然看不到这张表。</div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>自变量</th><th>真实系数</th><th>是否真有效</th></tr></thead><tbody id="mrTruth"></tbody></table></div>' +
      '<div class="callout info mt10">观察点：样本量越大、噪音越小，估计出的系数越接近真值。这就是「一致性」的直观含义。</div></section>' +
      "</div>";

    const ids = ["mrFans", "mrLen", "mrImg", "mrTl", "mrLikes", "mrTopic", "mrN", "mrNR", "mrNoise", "mrNoiseR",
      "mrStd", "mrNew", "mrFit", "mrTable", "mrOut", "mrResid", "mrResidNote", "mrTruth"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));

    /* 真实数据生成结构：阅读量（千次） */
    const TRUTH = {
      fans: { b: 0.042, label: "粉丝基数（万）", valid: true },
      len: { b: 0.0009, label: "正文字数", valid: false },
      img: { b: 1.35, label: "是否配图（1=有）", valid: true },
      titleLen: { b: 0.02, label: "标题长度", valid: false },
      likes: { b: 0.28, label: "点赞数", valid: true },
      topicHot: { b: 0.55, label: "话题热度指数", valid: true }
    };

    const rng = new ST.RNG(987654321);
    let DS = null;

    function gen() {
      const n = S.n, noiseF = S.noise / 100;
      const fans = [], len = [], img = [], titleLen = [], likes = [], topicHot = [], y = [];
      for (let i = 0; i < n; i++) {
        const fan = Math.max(0.5, rng.normal(18, 11));
        const L = Math.max(200, Math.round(rng.normal(1800, 620)));
        const im = rng.uniform(0, 1) < 0.62 ? 1 : 0;
        const TL = Math.max(6, Math.round(rng.normal(21, 5)));
        // 话题热度与粉丝基数共线
        const hot = Math.max(1, Math.min(100, 40 + fan * 0.9 + rng.normal(0, 9)));
        // 点赞数与阅读量强相关（事后才知道，但生成时就是共线的）
        const base = 3.2 + TRUTH.fans.b * fan + TRUTH.img.b * im + TRUTH.topicHot.b * (hot - 40) + rng.normal(0, 2.4 * noiseF);
        const lk = Math.max(0, Math.round((base * 12 + rng.normal(0, 22)) * 1.0));
        y.push(+Math.max(0.2, base + TRUTH.likes.b * (lk / 12 - 12) * 0.3).toFixed(3));
        fans.push(+fan.toFixed(2)); len.push(L); img.push(im); titleLen.push(TL);
        likes.push(lk); topicHot.push(+hot.toFixed(1));
      }
      DS = { fans, len, img, titleLen, likes, topicHot, y };
    }
    gen();

    function activeVars() {
      const map = { fans: "fans", len: "len", img: "img", titleLen: "titleLen", likes: "likes", topicHot: "topicHot" };
      const out = [];
      [["mrFans", "fans"], ["mrLen", "len"], ["mrImg", "img"], ["mrTl", "titleLen"], ["mrLikes", "likes"], ["mrTopic", "topicHot"]]
        .forEach(([id, k]) => { if (S.use[k]) out.push(k); });
      return out;
    }

    function vif(X, j) {
      // 用其余自变量预测第 j 个
      const others = [];
      for (let k = 0; k < X[0].length; k++) if (k !== j) others.push(k);
      if (!others.length) return 1;
      const Xs = X.map(r => others.map(k => r[k]));
      const yv = X.map(r => r[j]);
      const rg = ST.ols(yv, Xs);
      if (!rg.ok) return Infinity;
      return 1 / (1 - rg.r2);
    }

    function draw() {
      E.mrN.textContent = S.n;
      E.mrNoise.textContent = S.noise + "%";
      S.use.fans = E.mrFans.checked; S.use.len = E.mrLen.checked; S.use.img = E.mrImg.checked;
      S.use.titleLen = E.mrTl.checked; S.use.likes = E.mrLikes.checked; S.use.topicHot = E.mrTopic.checked;

      const vars = activeVars();
      if (!vars.length) {
        E.mrTable.innerHTML = '<tr><td class="tx faint" colspan="7">请至少选择一个自变量。</td></tr>';
        E.mrOut.innerHTML = "";
        E.mrResid.innerHTML = "";
        return;
      }
      const X = DS.y.map((_, i) => vars.map(k => DS[k][i]));
      const reg = ST.ols(DS.y, X);

      if (!reg.ok) {
        E.mrTable.innerHTML = '<tr><td class="tx faint" colspan="7">' + reg.reason + "</td></tr>";
        return;
      }

      const names = vars.map(k => TRUTH[k].label);
      const sdY = ST.sd(DS.y);
      const rows = [];
      // 截距
      rows.push('<tr><td class="tx">（常数项）</td><td>' + U.F.num(reg.coef[0].b, 3) + '</td><td>' + U.F.num(reg.coef[0].se, 3) +
        '</td><td class="faint">' + U.F.num(reg.coef[0].t, 2) + "</td><td>" + U.F.pApa(reg.coef[0].p) + '</td><td class="faint">—</td><td class="faint">—</td></tr>');

      const vifs = [];
      vars.forEach((k, j) => {
        const c = reg.coef[j + 1];
        const sdX = ST.sd(DS[k]);
        const beta = c.b * sdX / sdY;
        const v = vif(X, j);
        vifs.push({ k, v });
        const sig = c.p < S.alpha;
        const hiVif = v > 10;
        rows.push('<tr' + (hiVif ? ' style="background:rgba(247,37,133,.07)"' : "") + '>' +
          '<td class="tx">' + TRUTH[k].label + (TRUTH[k].valid ? "" : ' <span class="badge">真无效</span>') + "</td>" +
          "<td>" + U.F.num(c.b, 4) + "</td>" +
          "<td>" + U.F.num(c.se, 4) + "</td>" +
          '<td style="color:' + (sig ? "var(--ok)" : "var(--fg-mut)") + '">' + (S.showStd ? U.F.num(beta, 3) : U.F.num(c.t, 2)) + "</td>" +
          '<td style="color:' + (sig ? "var(--ok)" : "var(--fg-mut)") + '">' + U.F.pApa(c.p) + "</td>" +
          '<td style="font-size:11.5px">[' + U.F.num(c.lo, 3) + ", " + U.F.num(c.hi, 3) + "]</td>" +
          '<td style="color:' + (hiVif ? "var(--danger)" : v > 5 ? "var(--warn)" : "var(--ok)") + ';font-weight:600">' + U.F.num(v, 2) + "</td>" +
          "</tr>");
      });
      E.mrTable.innerHTML = rows.join("");

      E.mrFit.className = "badge " + (reg.r2 > 0.5 ? "ok" : "");
      E.mrFit.textContent = "R² = " + U.F.num(reg.r2, 3) + "  调整 R² = " + U.F.num(reg.adjR2, 3) + "  F(" + reg.dfR + "," + reg.dfE + ") = " + U.F.num(reg.F, 2);

      /* ---- 读数 ---- */
      const maxVif = Math.max.apply(null, vifs.map(x => x.v)) || 1;
      const pj = [];
      vifs.forEach(x => x.j = 0);
      E.mrOut.innerHTML = U.readouts([
        { k: "样本量 n", v: reg.n, mini: "自变量 " + reg.p + " 个" },
        { k: "R²", v: U.F.num(reg.r2, 4), hi: true, mini: "解释 " + U.F.num(reg.r2 * 100, 1) + "% 变异" },
        { k: "调整 R²", v: U.F.num(reg.adjR2, 4), mini: "对变量数做了惩罚" },
        { k: "整体 F", v: U.F.num(reg.F, 3), cls: reg.pF < 0.05 ? "ok" : "warn", mini: "p " + U.F.pApa(reg.pF) },
        { k: "残差标准误", v: U.F.num(reg.rmse, 3), mini: "预测的平均误差" },
        { k: "最大 VIF", v: U.F.num(maxVif, 2), hi: true, cls: maxVif > 10 ? "hi danger" : maxVif > 5 ? "hi warn" : "hi ok", mini: maxVif > 10 ? "严重共线性" : maxVif > 5 ? "值得警惕" : "安全" },
        { k: "显著自变量数", v: reg.coef.slice(1).filter(c => c.p < S.alpha).length + " / " + reg.p },
        { k: "杜宾-沃森", v: U.F.num(reg.durbinWatson, 3), mini: "接近 2 为宜" }
      ]);

      /* ---- 真实结构表 ---- */
      E.mrTruth.innerHTML = vars.map((k, j) => {
        const c = reg.coef[j + 1];
        const t = TRUTH[k];
        return '<tr><td class="tx">' + t.label + "</td><td>" + U.F.num(t.b, 4) + "</td><td>" +
          (t.valid ? '<span style="color:var(--ok)">是</span>' : '<span class="faint">否（真值为 0 效果）</span>') + "</td></tr>";
      }).join("");

      /* ---- 残差图 ---- */
      const p = U.makePlot({ W: 700, H: 280, xr: [0, 1], yr: [0, 1] });
      const fitted = reg.fitted, resid = reg.resid;
      const fmin = Math.min.apply(null, fitted), fmax = Math.max.apply(null, fitted);
      const rmax = Math.max.apply(null, resid.map(Math.abs));
      p.setX(fmin, fmax).setY(-rmax * 1.2, rmax * 1.2).bg().grid(0, 0)
        .axes({ xLabel: "预测值 ŷ", yLabel: "残差 e", zeroLine: true });
      p.hline(0, { stroke: "var(--g4)", dash: "4 3" });
      fitted.forEach((f, i) => {
        p.raw('<circle cx="' + p.x(f).toFixed(1) + '" cy="' + p.y(resid[i]).toFixed(1) + '" r="3.6" fill="rgba(76,201,240,.4)" stroke="var(--g1)" stroke-width="1.2"/>');
      });
      p.mount(E.mrResid);

      // 残差诊断
      const absR = resid.map(Math.abs);
      const corrFR = ST.pearson(fitted, absR);
      let note = "残差应大致均匀地散布在 0 线上下，没有明显形状。";
      if (Math.abs(corrFR) > 0.35) note = "残差绝对值与预测值呈相关（r = " + U.F.num(corrFR, 2) + "），<b>残差图呈喇叭形</b>，提示方差齐性假设可能不成立。";
      E.mrResidNote.innerHTML = note + " 留意是否存在远离 0 线的孤立点——那可能是强影响点。";
    }

    E.mrNR.oninput = () => { S.n = +E.mrNR.value; gen(); draw(); };
    E.mrNoiseR.oninput = () => { S.noise = +E.mrNoiseR.value; gen(); draw(); };
    E.mrStd.onchange = () => { S.showStd = E.mrStd.checked; draw(); };
    E.mrNew.onclick = () => { gen(); draw(); };
    ["mrFans", "mrLen", "mrImg", "mrTl", "mrLikes", "mrTopic"].forEach(id => {
      E[id].onchange = () => draw();
    });

    draw();
  }
});

})();
