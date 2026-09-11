/* =========================================================
   lab-set8.js — 互动模块（八）
     · tdist  t 分布与单样本 t 检验专题
   ---------------------------------------------------------
   单样本 t 检验的完整流程：改样本量、改参照线、改显著性
   水平与检验方向，实时看 t 分布上的 p 区域如何变化，并
   同步给出效应量、置信区间与论文写法。
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

LAB.register({
  id: "tdist",
  render(root) {
    /* 16 位每天刷短视频超 2 小时学生的注意力自评（0–100） */
    const POOL = [62, 71, 58, 66, 55, 73, 60, 64, 69, 57, 63, 68, 59, 70, 61, 65];
    const S = {
      n: 12, mu0: 70, alpha: 0.05, tail: "two", showNorm: true, showGrid: true
    };
    const NU_FIX = [1, 2, 3, 5, 10, 20, 30, 60];

    root.innerHTML =
      '<div class="split">' +

      /* ---------- 左：控制面板 ---------- */
      '<section class="card panel">' +
      '<div class="sect-title">设定与数据</div>' +

      U.ctrl({
        label: "纳入分析的人数 n",
        valHtml: '<span id="tdNv">12</span>',
        body: '<div class="step"><button class="btn sq" id="tdNm">−</button><button class="btn sq" id="tdNp">+</button>' +
          '<div class="chips" id="tdNc"></div></div>',
        note: '问卷共收到 <b>16</b> 份有效回答，序号在前的先纳入。改人数，均值、标准差、自由度都会变。'
      }) +

      U.ctrl({
        label: "参照值 μ₀（校级普查已知值）",
        valHtml: '<span id="tdMuv">70</span>',
        body: '<div class="step"><button class="btn sq" id="tdMum">−1</button><button class="btn sq" id="tdMup">+1</button>' +
          '<div class="chips" id="tdMuc"></div></div>',
        note: '这是拿来比较的那条「基线」，不是样本里的人。'
      }) +

      U.ctrl({
        label: "显著性水平 α",
        valHtml: '<span id="tdAlv">.05</span>',
        body: U.chips("tdAlc", [
          { v: 0.1, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.02, t: ".02" }, { v: 0.01, t: ".01" }
        ], 0.05),
        note: '预先定好的证据门槛。p 低于它，才算证据够硬。'
      }) +

      U.ctrl({
        label: "检验方向",
        valHtml: '<span id="tdTv">双尾</span>',
        body: '<div class="chips" id="tdTc">' +
          '<button class="chip active" data-v="two">双尾：有没有差别</button>' +
          '<button class="chip" data-v="left">单尾：是不是更低</button>' +
          '<button class="chip" data-v="right">单尾：是不是更高</button></div>',
        note: '方向必须在看数据之前定好，事后改方向会放大第一类错误。'
      }) +

      '<div class="ctrl">' +
      U.sw("tdNorm", '叠加标准正态 N(0,1) 对照线', true) +
      U.sw("tdGrid", '显示网格与密度刻度', true) +
      "</div>" +

      '<div class="ctrl"><button class="btn block ghost" id="tdReset">重置为原始设定</button></div>' +

      '<div class="dashed"></div>' +
      '<div class="note"><b>怎么玩</b><br>' +
      "① 只改 n（6 → 16），看 t* 与 p 怎么走；" +
      "② 只改 μ₀，看结论从「不显著」翻到「显著」的临界点在哪；" +
      "③ 把方向从双尾改成单尾，看 p 值减半；" +
      "④ 全程盯住效应量，判断差异到底值不值得关心。</div>" +
      "</section>" +

      /* ---------- 右：主图与读数 ---------- */
      '<section class="viz stack">' +
      '<div class="card">' +
      '<div class="card-h"><h2>t 分布与 p 值区域</h2><span class="spacer"></span>' +
      '<span class="badge" id="tdBadge"></span></div>' +
      '<div class="stage"><svg id="tdChart"></svg></div>' +
      U.legend([
        { c: "var(--g1)", t: "t 分布（自由度 = n − 1）" },
        { c: "var(--g3)", t: "标准正态对照" },
        { c: "rgba(76,201,240,.42)", t: "阴影 = p 值（曲线下面积）" },
        { c: "var(--g4)", t: "临界值 ±t*" },
        { c: "var(--g2)", t: "实测统计量 t" }
      ].map(x => x)) +
      U.hints([
        "<b>点击/拖动</b>图内可移动 t 的位置",
        "<b>竖线</b>绿色 = 临界值，橙色 = 实测 t",
        "<b>阴影</b>面积就是 p 值"
      ]) +
      "</div>" +

      '<div class="readouts" id="tdOut"></div>' +
      "</section>" +
      "</div>" +

      /* ---------- 下半部分 ---------- */
      '<div class="grid g3 mt18">' +

      '<section class="card"><div class="card-h"><h2>① 数据：16 位学生的注意力自评</h2></div>' +
      '<div class="pool" id="tdPool"></div>' +
      '<div class="poolsum" id="tdPoolSum"></div>' +
      '<div class="note mt10">蓝色 = 本次纳入分析的人，灰色 = 暂未纳入。真实研究里人是先抽好再分析的，"挑人"只是为了让你看清样本量对结论的影响。</div>' +
      "</section>" +

      '<section class="card"><div class="card-h"><h2>② 算：一步都不跳</h2></div>' +
      '<div id="tdSteps"></div></section>' +

      '<section class="card"><div class="card-h"><h2>③ 判：说人话，也给论文写法</h2></div>' +
      '<div id="tdVerdict"></div><div id="tdSide" class="mt14"></div></section>' +

      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>t 分布长什么样：自由度的影响</h2>' +
      '<span class="spacer"></span><span class="faint fs12">同一张图上对比，一眼看出厚尾</span></div>' +
      '<div class="stage"><svg id="tdShape"></svg></div>' +
      U.legend([
        { c: "var(--g3)", t: "标准正态 N(0,1)" },
        { c: "var(--g1)", t: "ν = 1（柯西分布，极厚尾）" },
        { c: "var(--g2)", t: "ν = 5" },
        { c: "var(--g4)", t: "ν = 30（几乎与正态重合）" }
      ]) +
      '<div class="note mt10">自由度越小，曲线越矮、两尾越厚。这正是小样本必须用 t 而不能用 z 的原因：同样的｜t｜值，尾部面积更大，临界值也更大。</div>' +
      "</section>" +

      '<section class="card"><div class="card-h"><h2>临界值表 · 随自由度实时重算</h2></div>' +
      '<div id="tdCrit"></div>' +
      '<div class="note mt10">当前 ν = <b id="tdNuTxt">11</b>。ν → ∞ 时退化为标准正态分位数（双尾 .05 为 1.960，双尾 .01 为 2.576）。</div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18" id="tdTerms"></div>';

    const IDS = ["tdNv", "tdNm", "tdNp", "tdNc", "tdMuv", "tdMum", "tdMup", "tdMuc", "tdAlv", "tdAlc",
      "tdTv", "tdTc", "tdNorm", "tdGrid", "tdReset", "tdBadge", "tdChart", "tdOut",
      "tdPool", "tdPoolSum", "tdSteps", "tdVerdict", "tdSide", "tdShape", "tdCrit", "tdNuTxt", "tdTerms"];
    const E = {};
    IDS.forEach(i => E[i] = document.getElementById(i));

    /* ---------------- 计算 ---------------- */
    function calc() {
      const x = POOL.slice(0, S.n);
      const n = x.length;
      const mean = ST.mean(x), sd = ST.sd(x, 1), se = sd / Math.sqrt(n);
      const df = n - 1;
      const t = (mean - S.mu0) / se;
      const d = (mean - S.mu0) / sd;

      let p;
      if (S.tail === "two") p = 2 * (1 - ST.tCDF(Math.abs(t), df));
      else if (S.tail === "right") p = 1 - ST.tCDF(t, df);
      else p = ST.tCDF(t, df);
      p = Math.max(0, Math.min(1, p));

      let tcrit;
      if (S.tail === "two") tcrit = ST.tInv(1 - S.alpha / 2, df);
      else tcrit = ST.tInv(1 - S.alpha, df);

      /* 均值差的置信区间（双尾时用 1 − α/2；单尾用 1 − α 作为单侧边界） */
      const tcCI = ST.tInv(1 - S.alpha / 2, df);
      const ci = [mean - tcCI * se - S.mu0, mean + tcCI * se - S.mu0];

      /* 正态对照：若误用 z */
      const pNorm = S.tail === "two" ? 2 * (1 - ST.normalCDF(Math.abs(t)))
        : S.tail === "right" ? 1 - ST.normalCDF(t) : ST.normalCDF(t);
      const zcrit = S.tail === "two" ? ST.normalInv(1 - S.alpha / 2) : ST.normalInv(1 - S.alpha);

      return {
        x, n, mean, sd, se, df, t, p, d, tcrit, zcrit, pNorm,
        ci, mean_lb: mean - tcCI * se, mean_ub: mean + tcCI * se,
        rejected: S.tail === "two" ? Math.abs(t) >= tcrit : (S.tail === "right" ? t >= tcrit : t <= -tcrit)
      };
    }

    /* ---------------- 主图 ---------------- */
    function drawChart(R) {
      const span = Math.max(6, Math.min(14, Math.ceil(Math.abs(R.t) + 3)), Math.ceil(R.tcrit + 2.5));
      const p = U.makePlot({ W: 880, H: 420, xr: [-span, span] });
      const pdf = v => ST.tPDF(v, R.df);
      const npdf = v => ST.normalPDF(v, 0, 1);
      let mx = 0.05;
      for (let i = -300; i <= 300; i++) mx = Math.max(mx, pdf(i / 50));
      p.setY(0, mx * 1.16);
      if (S.showGrid) p.grid(1, 0.05);
      p.bg();
      p.axes({ xLabel: "t 值", yLabel: "f(t)" });

      /* p 值阴影 */
      const fill = "rgba(76,201,240,.42)";
      const strokeA = "rgba(76,201,240,.9)";
      if (S.tail === "two") {
        p.area(-span, -Math.abs(R.t), pdf, { fill, stroke: strokeA, width: 1 });
        p.area(Math.abs(R.t), span, pdf, { fill, stroke: strokeA, width: 1 });
      } else if (S.tail === "right") {
        p.area(R.t, span, pdf, { fill, stroke: strokeA, width: 1 });
      } else {
        p.area(-span, R.t, pdf, { fill, stroke: strokeA, width: 1 });
      }

      /* 正态对照 */
      if (S.showNorm) {
        p.line(npdf, { stroke: U.g3(), width: 1.8, dash: "6 5", opacity: 0.9 });
      }
      /* t 曲线 */
      p.line(pdf, { stroke: "url(#lgA)", width: 2.8 });

      /* 临界值竖线 */
      if (S.tail === "two") {
        p.vline(-R.tcrit, {
          stroke: U.g4(), width: 1.4, dash: "4 4",
          label: "−t* = " + R.tcrit.toFixed(3), labelColor: U.g4(), anchor: "start", dx: 4
        });
        p.vline(R.tcrit, {
          stroke: U.g4(), width: 1.4, dash: "4 4",
          label: "t* = " + R.tcrit.toFixed(3), labelColor: U.g4(), anchor: "end", dx: -4
        });
      } else {
        const sign = S.tail === "right" ? 1 : -1;
        p.vline(sign * R.tcrit, {
          stroke: U.g4(), width: 1.4, dash: "4 4",
          label: (S.tail === "right" ? "t* = " : "−t* = ") + R.tcrit.toFixed(3),
          labelColor: U.g4(), anchor: S.tail === "right" ? "end" : "start", dx: S.tail === "right" ? -4 : 4
        });
      }
      /* 实测 t */
      p.vline(R.t, {
        stroke: U.g2(), width: 2,
        label: "t = " + R.t.toFixed(3), labelColor: U.g2(),
        labelY: p.M.t + p.PH - 8
      });

      p.mount(E.tdChart);
      E.tdChart.classList.add("draggable");

      U.interactive(E.tdChart, p, {
        onDrag(d) {
          /* 拖动改变 μ₀，从而改变实测 t */
          const target = Math.max(-span, Math.min(span, d.dx));
          const newMu = R.mean - target * R.se;
          S.mu0 = Math.round(newMu * 2) / 2;
          update();
        }
      });
    }

    /* ---------------- 分布形态对比图 ---------------- */
    function drawShape() {
      const p = U.makePlot({ W: 880, H: 320, xr: [-4.6, 4.6] });
      const fns = [[1, U.g1()], [5, U.g2()], [30, U.g4()]];
      p.autoY(v => ST.normalPDF(v, 0, 1));
      p.grid(1, 0.1);
      p.bg();
      p.axes({ xLabel: "t / z", yLabel: "f" });
      fns.forEach(([nu, c]) => p.line(v => ST.tPDF(v, nu), { stroke: c, width: 2.2, opacity: 0.95 }));
      p.line(v => ST.normalPDF(v, 0, 1), { stroke: U.g3(), width: 2.4, dash: "7 5" });
      p.mount(E.tdShape);
    }

    /* ---------------- 临界值表 ---------------- */
    function drawCrit(R) {
      const alphas = [0.1, 0.05, 0.02, 0.01];
      const rows = alphas.map(a => {
        const tc = ST.tInv(1 - a / 2, R.df);
        const to = ST.tInv(1 - a, R.df);
        const hit = 2 * (1 - ST.tCDF(Math.abs(R.t), R.df)) <= a + 1e-12;
        return [
          { v: a === 0.1 ? ".10" : a === 0.05 ? ".05" : a === 0.02 ? ".02" : ".01" },
          { v: tc.toFixed(3) }, { v: to.toFixed(3) },
          { v: hit ? "是" : "否", cls: hit ? "c" : "" }
        ];
      });
      E.tdCrit.innerHTML = U.table(["双尾 α", "双侧 t*", "单侧 t*", "双侧 p ≤ α ？"], rows, { mini: true });
      E.tdNuTxt.textContent = R.df;
    }

    /* ---------------- 数据池 ---------------- */
    function drawPool(R) {
      E.tdPool.innerHTML = POOL.map((v, i) =>
        '<div class="pt ' + (i < S.n ? "in" : "out") + '"><div class="id">' + (i + 1) +
        '</div><div class="sc">' + v + "</div></div>").join("");
      E.tdPoolSum.innerHTML =
        "<span>纳入 <b>" + S.n + "</b> / 16 人</span>" +
        "<span>x̄ = <b>" + R.mean.toFixed(2) + "</b></span>" +
        "<span>s = <b>" + R.sd.toFixed(2) + "</b></span>" +
        "<span>标准误 = <b>" + R.se.toFixed(3) + "</b></span>" +
        "<span>μ₀ = <b>" + S.mu0 + "</b></span>";
    }

    /* ---------------- 计算步骤 ---------------- */
    function drawSteps(R) {
      const xs = R.x.map(v => v.toFixed(0)).join(" + ");
      E.tdSteps.innerHTML = U.steps([
        {
          sym: "样本均值 x̄ = Σx / n",
          num: "(" + xs + ") / " + R.n + " = <b>" + R.mean.toFixed(3) + "</b>",
          plain: "先把纳入的 " + R.n + " 个数加起来再平均。"
        },
        {
          sym: "样本标准差 s = √( Σ(x − x̄)² / (n − 1) )",
          num: "s = <b>" + R.sd.toFixed(3) + "</b>",
          plain: "分母用 n − 1 而不是 n，是为了让 s² 成为总体方差的无偏估计。"
        },
        {
          sym: "标准误 SE = s / √n",
          num: R.sd.toFixed(3) + " / √" + R.n + " = <b>" + R.se.toFixed(3) + "</b>",
          plain: "注意：这是「样本均值的标准差」，不是个体之间的离散程度。"
        },
        {
          sym: "检验统计量 t = (x̄ − μ₀) / SE",
          num: "(" + R.mean.toFixed(3) + " − " + S.mu0 + ") / " + R.se.toFixed(3) + " = <b>" + R.t.toFixed(3) + "</b>",
          plain: "自由度 df = n − 1 = " + R.df + "。t 越大，说明偏离参照线越远（以标准误为单位）。"
        },
        {
          sym: "p 值 = " + (S.tail === "two" ? "P(|T| ≥ |t|)" : S.tail === "right" ? "P(T ≥ t)" : "P(T ≤ t)"),
          num: "p = <b>" + ST.fmt.pApa(R.p) + "</b>",
          plain: "在 H₀ 为真的前提下，出现当前或更极端结果的概率。它与 α = " +
            (S.alpha === 0.1 ? ".10" : S.alpha === 0.05 ? ".05" : S.alpha === 0.02 ? ".02" : ".01") + " 比较后作出决策。"
        },
        {
          sym: "效应量 Cohen's d = (x̄ − μ₀) / s",
          num: "d = <b>" + R.d.toFixed(3) + "</b>（" + ST.fmt.effect(R.d, "d") + "）",
          plain: "p 值答「有没有差异」，效应量答「差异有多大」。"
        }
      ]);
    }

    /* ---------------- 结论区 ---------------- */
    function drawVerdict(R) {
      const dirTxt = R.t > 0 ? "高于" : "低于";
      const human = R.rejected
        ? "样本均值 " + R.mean.toFixed(2) + " 显著" + dirTxt + "参照值 μ₀ = " + S.mu0 +
          "（" + (S.tail === "two" ? "双尾" : "单尾") + "检验，α = " +
          (S.alpha === 0.1 ? ".10" : S.alpha === 0.05 ? ".05" : S.alpha === 0.02 ? ".02" : ".01") +
          "）。差异约 " + Math.abs(R.mean - S.mu0).toFixed(2) + " 分，效应量 " + ST.fmt.effect(R.d, "d") + "。"
        : "在现有 " + S.n + " 人、α = " +
          (S.alpha === 0.1 ? ".10" : S.alpha === 0.05 ? ".05" : S.alpha === 0.02 ? ".02" : ".01") +
          " 的水平下，<b>没有足够证据</b>认为样本均值与 μ₀ = " + S.mu0 + " 有差异。注意：这不等于「两者相等」，只说明证据不够硬。";

      E.tdVerdict.innerHTML =
        '<div class="verdict ' + (R.rejected ? "rej" : "norej") + '">' +
        '<div class="big">' + (R.rejected ? "拒绝 H₀" : "不拒绝 H₀") + "</div>" +
        '<div class="human">' + human + "</div>" +
        '<div class="apa">t(' + R.df + ") = " + R.t.toFixed(3) + ", p = " + ST.fmt.pApa(R.p) +
        ", d = " + R.d.toFixed(2) + "; 95% CI [" + R.mean_lb.toFixed(2) + ", " + R.mean_ub.toFixed(2) + "]" +
        ((S.tail === "two") ? "" : "（单尾检验）") + "</div>" +
        "</div>";

      E.tdSide.innerHTML =
        '<div class="kv">' +
        '<span class="k">实测 t（df = ' + R.df + "）</span><span class=\"v\"><b>" + R.t.toFixed(3) + "</b></span>" +
        '<span class="k">临界值 t*</span><span class="v">' + R.tcrit.toFixed(3) + "</span>" +
        '<span class="k">若误用正态的临界值</span><span class="v">' + R.zcrit.toFixed(3) + "</span>" +
        '<span class="k">若误用正态的 p 值</span><span class="v">' + ST.fmt.pApa(R.pNorm) + "</span>" +
        '<span class="k">均值差 95% CI（分）</span><span class="v">[' +
        (R.mean_lb - S.mu0).toFixed(2) + ", " + (R.mean_ub - S.mu0).toFixed(2) + "]</span>" +
        "</div>" +
        '<div class="callout ' + (Math.abs(R.tcrit - R.zcrit) > 0.25 ? "warn" : "info") + ' mt10" style="margin-bottom:0">' +
        "<span class=\"ttl\">为什么必须用 t</span>" +
        "ν = " + R.df + " 时 t* = " + R.tcrit.toFixed(3) + "，而正态的临界值是 " + R.zcrit.toFixed(3) +
        "。用 z 代替 t 会让门槛变松" + (Math.abs(R.tcrit - R.zcrit) > 0.25 ? "（这里差得还很明显）" : "（这里差距不大，但小样本时会很明显）") +
        "，相当于人为夸大证据强度。</div>";
    }

    /* ---------------- 术语卡 ---------------- */
    function drawTerms() {
      const terms = [
        { t: "t 分布", d: "σ 未知时取代正态的分布，比正态更厚尾。自由度越大越接近正态。" },
        { t: "自由度 df", d: "这里 df = n − 1。均值已被估计出来，n 个数中只有 n − 1 个可以自由取值。" },
        { t: "标准误 SE", d: "样本均值的标准差 s/√n，衡量「换个样本，均值会飘多远」。样本量增大时按 √n 缩小。" },
        { t: "p 值", d: "P(数据 | H₀)。在 H₀ 为真的前提下出现当前或更极端结果的概率。越小越说明数据反常。" },
        { t: "临界值 t*", d: "拒绝域的边界。|t| ≥ t* 就拒绝 H₀。由 α 与自由度共同决定。" },
        { t: "效应量 d", d: "均值差除以标准差，不受样本量影响。0.2 小 / 0.5 中 / 0.8 大。" }
      ];
      E.tdTerms.innerHTML = terms.map(x =>
        '<div class="card"><div class="card-h"><h2>' + x.t + "</h2></div>" +
        '<div class="mut fs13">' + x.d + "</div></div>").join("");
    }

    /* ---------------- 读数卡 ---------------- */
    function drawOut(R) {
      E.tdOut.innerHTML = U.readouts([
        { k: "样本均值 x̄", v: R.mean.toFixed(2), mini: "n = " + R.n },
        { k: "标准差 s", v: R.sd.toFixed(2), mini: "个体离散程度" },
        { k: "标准误 SE", v: R.se.toFixed(3), mini: "s / √n" },
        { k: "统计量 t", v: R.t.toFixed(3), hi: true, mini: "df = " + R.df },
        { k: "p 值", v: ST.fmt.pApa(R.p), cls: R.rejected ? "danger" : "warn", mini: "α = " + S.alpha },
        { k: "临界值 t*", v: R.tcrit.toFixed(3), mini: "正态临界 " + R.zcrit.toFixed(3) },
        { k: "效应量 d", v: R.d.toFixed(2), mini: ST.fmt.effect(R.d, "d") },
        { k: "结论", v: R.rejected ? "拒绝 H₀" : "不拒绝", cls: R.rejected ? "ok" : "warn" }
      ]);
    }

    /* ---------------- 徽标 ---------------- */
    function drawBadge(R) {
      E.tdBadge.className = "badge " + (R.rejected ? "danger" : "warn");
      E.tdBadge.textContent = S.tail === "two" ? "双尾检验" : (S.tail === "right" ? "单尾（更高）" : "单尾（更低）");
    }

    /* ---------------- 统一刷新 ---------------- */
    function update() {
      S.n = Math.max(6, Math.min(16, S.n));
      S.mu0 = Math.max(55, Math.min(85, S.mu0));
      const R = calc();

      E.tdNv.textContent = S.n;
      E.tdMuv.textContent = S.mu0;
      E.tdAlv.textContent = S.alpha === 0.1 ? ".10" : S.alpha === 0.05 ? ".05" : S.alpha === 0.02 ? ".02" : ".01";
      E.tdTv.textContent = S.tail === "two" ? "双尾" : (S.tail === "right" ? "单尾（更高）" : "单尾（更低）");

      U.$$("#tdAlc button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.alpha));
      U.$$("#tdTc button").forEach(b => b.classList.toggle("active", b.dataset.v === S.tail));
      U.$$("#tdNc button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      E.tdNorm.checked = S.showNorm;
      E.tdGrid.checked = S.showGrid;

      drawBadge(R);
      drawChart(R);
      drawShape();
      drawCrit(R);
      drawPool(R);
      drawSteps(R);
      drawVerdict(R);
      drawOut(R);
    }

    /* ---------------- 事件 ---------------- */
    E.tdNc.innerHTML = [6, 8, 10, 12, 14, 16].map(v =>
      '<button class="chip' + (v === S.n ? " active" : "") + '" data-v="' + v + '">' + v + "</button>").join("");
    E.tdMuc.innerHTML = [62, 65, 68, 70, 72, 75].map(v =>
      '<button class="chip' + (v === S.mu0 ? " active" : "") + '" data-v="' + v + '">' + v + "</button>").join("");

    E.tdNm.onclick = () => { S.n--; update(); };
    E.tdNp.onclick = () => { S.n++; update(); };
    E.tdMum.onclick = () => { S.mu0 -= 1; update(); };
    E.tdMup.onclick = () => { S.mu0 += 1; update(); };

    E.tdNc.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.n = +b.dataset.v; update();
    });
    E.tdMuc.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.mu0 = +b.dataset.v; update();
    });
    E.tdAlc.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.alpha = +b.dataset.v; update();
    });
    E.tdTc.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.tail = b.dataset.v; update();
    });
    E.tdNorm.onchange = () => { S.showNorm = E.tdNorm.checked; update(); };
    E.tdGrid.onchange = () => { S.showGrid = E.tdGrid.checked; update(); };
    E.tdReset.onclick = () => {
      S.n = 12; S.mu0 = 70; S.alpha = 0.05; S.tail = "two"; S.showNorm = true; S.showGrid = true;
      update();
      if (window.SITE_UI) window.SITE_UI.toast("已重置为原始设定");
    };

    drawTerms();
    update();
  }
});

})();
