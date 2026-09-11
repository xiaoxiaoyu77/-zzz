/* =========================================================
   lab-set3.js — 互动模块（三）
     · ttest   t 检验全流程（单样本 / 独立两样本 / 配对样本）
     · anova   单因素方差分析
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

/* ==========================================================
   模块 6 · t 检验全流程
   ========================================================== */
LAB.register({
  id: "ttest",
  render(root) {
    /* ---- 三套案例数据 ---- */
    const DATA = {
      one: {
        title: "单样本设计",
        scene: "某高校新闻与智能传播学院做过一次全校普查，得到学生注意力自评的总体平均分。课程小组关心：每天刷短视频超过 2 小时的那批学生，注意力自评是不是低于全校平均线？",
        q: "H₀: μ = μ₀（这批人与全校平均线没有差别） ｜ H₁: μ < μ₀（低于全校平均线）",
        labelA: "注意力自评分数（0–100）",
        ids: "ABCDEFGHIJKLMNOP",
        A: [62, 71, 58, 66, 55, 73, 60, 64, 69, 57, 63, 68, 59, 70, 61, 65],
        mu0: 70
      },
      two: {
        title: "独立两样本设计",
        scene: "同一批标题风格实验中，研究者把 16 篇文章随机分配到「数字式标题」与「直述式标题」两组，比较两组的打开率是否有差异。两组文章彼此独立，作者、题材、发布时间都做了匹配。",
        q: "H₀: μ₁ = μ₂（两种标题风格效果相同） ｜ H₁: μ₁ ≠ μ₂（效果不同）",
        labelA: "数字式标题打开率（%）",
        labelB: "直述式标题打开率（%）",
        ids: "ABCDEFGH",
        A: [8.6, 9.2, 8.9, 9.4, 8.4, 9.1, 8.7, 9.3],
        B: [5.2, 5.6, 5.4, 5.1, 5.8, 5.3, 5.5, 5.7]
      },
      paired: {
        title: "配对样本设计",
        scene: "沉浸感实验中，24 名被试每人分别观看「有弹幕」和「无弹幕」两个版本的视频片段并打分。因为是同一批人看两个版本，属于配对设计——个体对视频的偏好差异会在差值中被消掉。",
        q: "H₀: μ_差值 = 0（弹幕对沉浸感没有影响） ｜ H₁: μ_差值 ≠ 0（有影响）",
        labelA: "有弹幕版本的沉浸感评分（1–10）",
        labelB: "无弹幕版本的沉浸感评分（1–10）",
        ids: "ABCDEFGH",
        A: [8.2, 7.5, 6.8, 8.9, 7.1, 8.4, 6.5, 7.9],
        B: [7.5, 6.9, 6.2, 8.1, 6.4, 7.7, 5.8, 7.2]
      }
    };

    const S = {
      design: "one", n: 16, mu0: 70, alpha: 0.05, tail: "two", welch: false,
      showNorm: true, xr: 6
    };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">研究设计</div>' +
      U.ctrl({
        label: "选择设计类型",
        body: '<div class="btnrow" id="ttDesign" style="flex-direction:column;align-items:stretch">' +
          '<button class="btn sm active" data-d="one">单样本：一批人 vs 一个参照值</button>' +
          '<button class="btn sm" data-d="two">独立两样本：两批不同的人</button>' +
          '<button class="btn sm" data-d="paired">配对样本：同一批人测两次</button>' +
          "</div>",
        note: "选错设计是 t 检验最常见的误用。<b>判断标准只有一个：每个人是否贡献了一对数据。</b>"
      }) +
      U.ctrl({
        label: "纳入分析的人数 n",
        valHtml: '<span id="ttN">16</span>',
        body: U.stepper("ttNM", "ttNP") + U.chips("ttNC", [6, 8, 10, 12, 16])
      }) +
      '<div id="ttMu0Box">' +
      U.ctrl({
        label: "参照值 μ₀",
        valHtml: '<span id="ttMu0">70</span>',
        body: U.stepper("ttMuM", "ttMuP") + U.chips("ttMuC", [64, 66, 68, 70, 72])
      }) + "</div>" +
      '<div id="ttWelchBox" hidden>' +
      U.ctrl({ label: "方差处理", body: U.sw("ttWelch", "使用 Welch 校正（不假设方差齐性）", false),
        note: "两组样本量悬殊或方差不齐时，Welch 校正能有效控制第一类错误率。不确定时建议直接用 Welch。" }) + "</div>" +
      U.ctrl({
        label: "显著性水平 α",
        valHtml: '<span id="ttAlpha">.05</span>',
        body: U.chips("ttAlphaC", [{ v: 0.10, t: "α = .10" }, { v: 0.05, t: "α = .05" }, { v: 0.01, t: "α = .01" }, { v: 0.001, t: "α = .001" }])
      }) +
      U.ctrl({
        label: "检验方向",
        valHtml: '<span id="ttTail">双尾</span>',
        body: '<div class="btnrow" id="ttTailB" style="flex-direction:column;align-items:stretch">' +
          '<button class="btn sm" data-t="two">双尾：只问「有没有差别」</button>' +
          '<button class="btn sm" data-t="less">单尾：只问「是不是更低」</button>' +
          '<button class="btn sm" data-t="greater">单尾：只问「是不是更高」</button>' +
          "</div>",
        note: "检验方向必须在看数据之前确定。事后改单侧属于 p-hacking。"
      }) +
      U.ctrl({ label: "显示选项", body: U.sw("ttNorm", "叠加标准正态曲线作对照", true) }) +
      '<div class="ctrl"><button class="btn block" id="ttReset">重置为案例原始设定</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>t 分布上的 p 值区域</h2><span class="spacer"></span>' +
      '<span class="badge" id="ttDf"></span></div>' +
      '<div class="stage"><svg id="ttChart"></svg></div>' +
      U.legend([
        { c: "url(#lgA)", t: "t 分布（df = n − 1）", dot: false },
        { c: "var(--g3)", t: "若误用标准正态", dot: false },
        { c: "rgba(76,201,240,.45)", t: "阴影 = p 值（曲线下的面积）", dot: false },
        { c: "var(--g4)", t: "临界值 t*", dot: false }
      ]) +
      '<div class="narr" id="ttNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="ttOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="card mt18"><div class="card-h"><h2>研究情境</h2><span class="spacer"></span>' +
      '<button class="btn sm" id="ttApa">复制 APA 报告语句</button></div>' +
      '<div class="prose fs14" id="ttScene"></div>' +
      '<div class="qbox" id="ttQbox" style="margin-top:12px;padding:11px 14px;border-left:3px solid var(--acc-2);background:var(--card-2);border-radius:8px;font-size:13.5px"></div>' +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>① 数据</h2></div><div id="ttData"></div></section>' +
      '<section class="card"><div class="card-h"><h2>② 算：一步都不跳</h2></div><div id="ttSteps"></div></section>' +
      '<section class="card"><div class="card-h"><h2>③ 判：结论与论文写法</h2></div>' +
      '<div class="verdict" id="ttVerdict"></div><div id="ttSide"></div></section>' +
      "</div>";

    const ids = ["ttDesign", "ttN", "ttNM", "ttNP", "ttNC", "ttMu0Box", "ttMu0", "ttMuM", "ttMuP", "ttMuC",
      "ttWelchBox", "ttWelch", "ttAlpha", "ttAlphaC", "ttTail", "ttTailB", "ttNorm", "ttReset",
      "ttChart", "ttDf", "ttNarr", "ttOut", "ttScene", "ttQbox", "ttData", "ttSteps", "ttVerdict", "ttSide", "ttApa"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.ttNC.innerHTML = [6, 8, 10, 12, 16].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.ttMuC.innerHTML = [64, 66, 68, 70, 72].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.ttAlphaC.innerHTML = [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }, { v: 0.001, t: ".001" }]
      .map(o => '<button class="chip" data-v="' + o.v + '">' + o.t + "</button>").join("");

    /* ---- 核心计算 ---- */
    function compute() {
      const d = DATA[S.design];
      if (S.design === "one") {
        const x = d.A.slice(0, S.n);
        const r = ST.tTest1(x, S.mu0);
        const df = r.df;
        const tcrit = S.tail === "two" ? ST.tInv(1 - S.alpha / 2, df)
          : ST.tInv(1 - S.alpha, df);
        const p = S.tail === "two" ? r.pTwo : (S.tail === "less" ? r.pLess : r.pGreater);
        return Object.assign(r, {
          kind: "one", x, df, tcrit, p, t: r.t,
          reject: S.tail === "two" ? Math.abs(r.t) > tcrit : (S.tail === "less" ? r.t < -tcrit : r.t > tcrit)
        });
      }
      if (S.design === "two") {
        const nn = Math.min(S.n, 8);
        const x = DATA.two.A.slice(0, nn), y = DATA.two.B.slice(0, nn);
        const r = ST.tTest2(x, y, S.welch);
        const df = r.df;
        const tcrit = S.tail === "two" ? ST.tInv(1 - S.alpha / 2, df) : ST.tInv(1 - S.alpha, df);
        const p = S.tail === "two" ? r.p : (S.tail === "less" ? ST.tCDF(r.t, df) : 1 - ST.tCDF(r.t, df));
        return Object.assign(r, { kind: "two", x, y, df, tcrit, p, reject: S.tail === "two" ? Math.abs(r.t) > tcrit : (S.tail === "less" ? r.t < -tcrit : r.t > tcrit) });
      }
      const nn = Math.min(S.n, 8);
      const x = DATA.paired.A.slice(0, nn), y = DATA.paired.B.slice(0, nn);
      const r = ST.tTestPaired(x, y);
      const df = r.df;
      const tcrit = S.tail === "two" ? ST.tInv(1 - S.alpha / 2, df) : ST.tInv(1 - S.alpha, df);
      const p = S.tail === "two" ? r.pTwo : (S.tail === "less" ? r.pLess : r.pGreater);
      return Object.assign(r, { kind: "paired", x, y, df, tcrit, p, reject: S.tail === "two" ? Math.abs(r.t) > tcrit : (S.tail === "less" ? r.t < -tcrit : r.t > tcrit) });
    }

    /* ---- 画图 ---- */
    function draw(s) {
      const d = DATA[S.design];
      const df = s.df;
      const xr = Math.min(14, Math.max(4.5, Math.ceil((Math.abs(s.t) + 1.2) * 2) / 2));
      const p = U.makePlot({ W: 880, H: 400, xr: [-xr, xr], yr: [0, 1] });
      p.autoY(t => ST.tPDF(t, df), -xr, xr, 1.16).bg().grid(1, 0).axes({ xLabel: "t 值", stepX: 1 });

      const sh = "rgba(76,201,240,.42)", shs = "rgba(76,201,240,.95)";
      const at = Math.min(Math.abs(s.t), xr);
      if (S.tail === "two") {
        p.area(-xr, -at, t => ST.tPDF(t, df), { fill: sh, stroke: shs });
        p.area(at, xr, t => ST.tPDF(t, df), { fill: sh, stroke: shs });
      } else if (S.tail === "less") {
        p.area(-xr, Math.max(Math.min(s.t, xr), -xr), t => ST.tPDF(t, df), { fill: sh, stroke: shs });
      } else {
        p.area(Math.max(Math.min(s.t, xr), -xr), xr, t => ST.tPDF(t, df), { fill: sh, stroke: shs });
      }

      if (S.showNorm) p.line(t => ST.normalPDF(t), { x0: -xr, x1: xr, stroke: "var(--g3)", width: 1.8, dash: "7 5", opacity: .85 });
      p.line(t => ST.tPDF(t, df), { stroke: "url(#lgA)", width: 2.8 });
      p.line(t => ST.tPDF(t, df), { stroke: "none", fill: "url(#lgB)" });

      // 临界值
      if (S.tail === "two") {
        [-s.tcrit, s.tcrit].forEach(v => { if (Math.abs(v) <= xr) p.vline(v, { stroke: "var(--g4)", dash: "4 4", label: U.F.num(v, 2) }); });
      } else if (S.tail === "less") p.vline(-s.tcrit, { stroke: "var(--g4)", dash: "4 4", label: "−" + U.F.num(s.tcrit, 2) });
      else p.vline(s.tcrit, { stroke: "var(--g4)", dash: "4 4", label: U.F.num(s.tcrit, 2) });

      // 观测 t
      const tv = Math.max(-xr, Math.min(xr, s.t));
      p.vline(tv, { stroke: "rgba(255,255,255,.42)", dash: "3 4" });
      p.dot(tv, ST.tPDF(tv, df), { stroke: "var(--g1)", r: 5.5 });
      p.text(tv, ST.tPDF(tv, df) * 1.06, "t = " + U.F.num(s.t, 3), { anchor: "middle", mono: true, fill: "var(--g1)", size: 12.5 });

      // p 标注
      const pl = "p = " + U.F.pApa(s.p);
      if (S.tail === "two") {
        p.ptext(p.M.l + 10, p.M.t + p.PH - 14, pl, { fill: "#bfe9fb", size: 12.5, mono: true });
        p.ptext(p.M.l + p.PW - 10, p.M.t + p.PH - 14, pl, { fill: "#bfe9fb", size: 12.5, mono: true, anchor: "end" });
      } else {
        const left = tv < 0;
        p.ptext(left ? p.M.l + 10 : p.M.l + p.PW - 10, p.M.t + p.PH - 14, pl,
          { fill: "#bfe9fb", size: 12.5, mono: true, anchor: left ? "start" : "end" });
      }
      p.mount(E.ttChart);

      E.ttDf.className = "badge " + (s.reject ? "ok" : "warn");
    }
    const opts = { one: {}, two: {}, paired: {} };

    /* ---- 主渲染 ---- */
    function render() {
      const d = DATA[S.design];
      const s = compute();
      opts[S.design] = s;
      E.ttN.textContent = S.design === "one" ? s.n : Math.min(S.n, 8);
      E.ttMu0.textContent = S.mu0;
      E.ttAlpha.textContent = "." + String(S.alpha).replace(/^0\./, "");
      E.ttTail.textContent = { two: "双尾", less: "单尾（更低）", greater: "单尾（更高）" }[S.tail];
      E.ttMu0Box.hidden = S.design !== "one";
      E.ttWelchBox.hidden = S.design !== "two";
      U.$$("#ttDesign button").forEach(b => b.classList.toggle("active", b.dataset.d === S.design));
      U.$$("#ttNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      U.$$("#ttMuC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.mu0));
      U.$$("#ttAlphaC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.alpha));
      U.$$("#ttTailB button").forEach(b => b.classList.toggle("active", b.dataset.t === S.tail));

      E.ttDf.textContent = "df = " + U.F.num(s.df, s.df % 1 ? 2 : 0);

      draw(s);
      renderScene(s);
      renderData(s);
      renderSteps(s);
      renderVerdict(s);
      renderReadouts(s);
      renderNarr(s);
    }

    function renderScene(s) {
      const d = DATA[S.design];
      E.ttScene.innerHTML = "<p>" + d.scene + "</p>";
      E.ttQbox.innerHTML = "<b>研究假设</b>：" + d.q +
        (S.design === "one"
          ? " ｜ 当前 μ₀ = <b>" + S.mu0 + "</b>，因为总体标准差 σ 未知、n 又有限，参照分布不是正态，而是自由度 df = n − 1 = <b>" + U.F.num(s.df, 0) + "</b> 的 t 分布。"
          : " ｜ 当前 df = <b>" + U.F.num(s.df, 0) + "</b>" + (S.design === "two" && S.welch ? "（Welch 校正后的自由度，可能不是整数）" : "。"));
    }

    function renderData(s) {
      const d = DATA[S.design];
      let html = "";
      if (S.design === "one") {
        html = '<div class="note mb12">' + d.labelA + "</div>" +
          U.pool(s.x, { ids: d.ids.split("") }) +
          '<div class="poolsum"><span>∑x = <b>' + U.F.num(s.n * s.m, 1) + "</b></span>" +
          "<span>x̄ = <b>" + U.F.num(s.m, 3) + "</b></span><span>s = <b>" + U.F.num(s.s, 3) + "</b></span>" +
          "<span>SE = <b>" + U.F.num(s.se, 3) + "</b></span></div>";
      } else if (S.design === "two") {
        html = '<div class="note mb6">' + d.labelA + "</div>" +
          U.pool(s.x, { ids: d.ids.split(""), classOf: () => "in" }) +
          '<div class="note mt14 mb6">' + d.labelB + "</div>" +
          U.pool(s.y, { ids: d.ids.split(""), classOf: () => "out" }) +
          '<div class="poolsum"><span>组1 x̄ = <b>' + U.F.num(s.m1, 3) + "</b> (s = " + U.F.num(ST.sd(s.x), 3) + ")</span>" +
          "<span>组2 x̄ = <b>" + U.F.num(s.m2, 3) + "</b> (s = " + U.F.num(ST.sd(s.y), 3) + ")</span></div>";
      } else {
        const rows = s.x.map((v, i) => [d.ids[i], U.F.num(v, 1), U.F.num(s.y[i], 1), U.F.num(s.diffs[i], 1)]);
        html = '<div class="note mb12">每个被试贡献一对数据，做检验时先把每对相减</div>' +
          U.table(["被试", "有弹幕", "无弹幕", "差值 d"], rows, { mini: true }) +
          '<div class="poolsum"><span>d̄ = <b>' + U.F.num(s.meanDiff, 3) + "</b></span>" +
          "<span>s<sub>d</sub> = <b>" + U.F.num(s.s, 3) + "</b></span></div>";
      }
      E.ttData.innerHTML = html;
    }

    function renderSteps(s) {
      let rows = [];
      if (S.design === "one") {
        const plus = s.x.slice(0, 6).map(v => v).join(" + ") + (s.n > 6 ? " + …" : "");
        rows = [
          { sym: "样本均值 x̄ = (" + plus + ") / " + s.n, num: "= " + U.F.num(s.n * s.m, 1) + " / " + s.n + " = <b>" + U.F.num(s.m, 3) + "</b>", plain: "把这 " + s.n + " 个人的分数加起来除以人数，得到平均注意力自评。样本均值是总体均值 μ 的无偏估计。" },
          { sym: "标准差 s = √[ Σ(x − x̄)² / (n − 1) ]", num: "s = <b>" + U.F.num(s.s, 3) + "</b>", plain: "分母用 n − 1 而非 n，是为了修正用 x̄ 代替 μ 造成的系统性低估。" },
          { sym: "标准误 SE = s / √n", num: "SE = " + U.F.num(s.s, 2) + " / √" + s.n + " = <b>" + U.F.num(s.se, 3) + "</b>", plain: "衡量「平均分这个数字本身有多不稳」。n 越大，SE 越小。" },
          { sym: "检验统计量 t = (x̄ − μ₀) / SE", num: "t = (" + U.F.num(s.m, 2) + " − " + S.mu0 + ") / " + U.F.num(s.se, 3) + " = <b>" + U.F.num(s.t, 3) + "</b>", plain: "样本均值离参照线差了 " + U.F.num(Math.abs(s.m - S.mu0), 2) + " 分，相当于 " + U.F.num(Math.abs(s.t), 2) + " 个标准误。" },
          { sym: "自由度 df = n − 1", num: "df = " + s.n + " − 1 = <b>" + U.F.num(s.df, 0) + "</b>", plain: "算 s 时已经用样本均值「代表」了这批人，消耗掉一个自由度。df 越小，t 分布越厚尾。" }
        ];
      } else if (S.design === "two") {
        rows = [
          { sym: "组1：x̄₁ = " + U.F.num(s.m1, 3) + "，s₁ = " + U.F.num(ST.sd(s.x), 3), num: "n₁ = <b>" + s.x.length + "</b>", plain: "独立样本设计——两批人互不重叠，每人只贡献一个观测。" },
          { sym: "组2：x̄₂ = " + U.F.num(s.m2, 3) + "，s₂ = " + U.F.num(ST.sd(s.y), 3), num: "n₂ = <b>" + s.y.length + "</b>", plain: "" },
          {
            sym: S.welch ? "标准误 SE = √(s₁²/n₁ + s₂²/n₂)" : "合并标准差 s<sub>p</sub> = √[ ((n₁−1)s₁² + (n₂−1)s₂²) / (n₁+n₂−2) ]",
            num: S.welch ? "SE = <b>" + U.F.num(s.se, 3) + "</b>" : "s<sub>p</sub> = <b>" + U.F.num(s.sp, 3) + "</b>，SE = s<sub>p</sub>√(1/n₁ + 1/n₂) = <b>" + U.F.num(s.se, 3) + "</b>",
            plain: S.welch ? "Welch 校正不做方差齐性假设，各自用各自的方差，更稳健。" : "合并方差假设两组总体方差相等。样本量悬殊且方差不齐时这个假设风险很大。"
          },
          { sym: "t = (x̄₁ − x̄₂) / SE", num: "t = (" + U.F.num(s.m1, 3) + " − " + U.F.num(s.m2, 3) + ") / " + U.F.num(s.se, 3) + " = <b>" + U.F.num(s.t, 3) + "</b>", plain: "两组均值相差 " + U.F.num(Math.abs(s.diff), 3) + " 个百分点。" },
          { sym: "自由度 df", num: S.welch ? "Welch 校正 df = <b>" + U.F.num(s.df, 2) + "</b>" : "df = n₁ + n₂ − 2 = <b>" + s.df + "</b>", plain: S.welch ? "Welch 的自由度由两组方差与样本量共同决定，通常不是整数。" : "" }
        ];
      } else {
        rows = [
          { sym: "计算每对差值 d = 有弹幕 − 无弹幕", num: "d̄ = <b>" + U.F.num(s.meanDiff, 3) + "</b>，s<sub>d</sub> = <b>" + U.F.num(s.s, 3) + "</b>", plain: "配对设计的精髓就在这里：个体对视频的偏好这个巨大的差异，在相减的时候被消掉了。" },
          { sym: "标准误 SE = s<sub>d</sub> / √n", num: "SE = " + U.F.num(s.s, 2) + " / √" + s.n + " = <b>" + U.F.num(s.se, 3) + "</b>", plain: "注意：这里的 SE 比独立样本小得多，因为噪音被配对消掉了。" },
          { sym: "t = (d̄ − 0) / SE", num: "t = " + U.F.num(s.meanDiff, 3) + " / " + U.F.num(s.se, 3) + " = <b>" + U.F.num(s.t, 3) + "</b>", plain: "配对 t 检验本质上就是对差值做的单样本 t 检验。" },
          { sym: "自由度 df = n − 1", num: "df = " + s.n + " − 1 = <b>" + s.df + "</b>", plain: "n 是被试人数（对数），不是观测总数。" },
          { sym: "如果误当成独立样本会怎样", num: "会用 <b>" + (2 * s.n) + "</b> 个观测、df = " + (2 * s.n - 2) + " 去检验", plain: "这会浪费配对带来的信息，功效大幅下降，很可能把真实存在的效果判成「不显著」。" }
        ];
      }
      E.ttSteps.innerHTML = U.steps(rows);
    }

    function renderVerdict(s) {
      const rej = s.reject;
      const c = document.getElementById("ttVerdict");
      c.className = "verdict " + (rej ? "rej" : "norej");
      const d = DATA[S.design];

      let human, apa;
      if (S.design === "one") {
        const eff = Math.abs(s.cohenD);
        const w = eff >= 0.8 ? "大" : eff >= 0.5 ? "中等" : eff >= 0.2 ? "小" : "几乎可忽略";
        const dir = s.m - S.mu0 < 0 ? "低于" : "高于";
        human = rej
          ? "这批学生的注意力自评<b>显著" + dir + "</b>参照线 " + S.mu0 + " 分，平均" + dir + " <b>" + U.F.num(Math.abs(s.m - S.mu0), 2) + "</b> 分，约 " + U.F.num(eff, 2) + " 个标准差（<b>" + w + "效应</b>）。"
          : "按 α = " + S.alpha + " 的标准，这组数据<b>还不足以</b>断定" + (S.tail === "less" ? "「低于」" : "「有别于」") + "参照线。" + (S.n < 10 ? "样本量只有 " + s.n + " 人，功效很可能不足。" : "");
        apa = "t(" + U.F.num(s.df, 0) + ") = " + U.F.num(s.t, 2) + ", p " + (s.p < 0.001 ? "< .001" : "= " + U.F.pApa(s.p)) + ", d = " + U.F.num(s.cohenD, 2);
      } else if (S.design === "two") {
        const eff = Math.abs(s.cohenD);
        const w = eff >= 0.8 ? "大" : eff >= 0.5 ? "中等" : eff >= 0.2 ? "小" : "几乎可忽略";
        human = rej
          ? "数字式标题的打开率<b>显著高于</b>直述式，平均高出 <b>" + U.F.num(Math.abs(s.diff), 2) + "</b> 个百分点，效应量 <b>" + U.F.num(eff, 2) + "</b>（" + w + "）。"
          : "现有证据<b>不足以</b>断定两种标题风格的打开率有差异。";
        apa = "t(" + U.F.num(s.df, s.df % 1 ? 2 : 0) + ") = " + U.F.num(s.t, 2) + ", p " + (s.p < 0.001 ? "< .001" : "= " + U.F.pApa(s.p)) + ", d = " + U.F.num(s.cohenD, 2) + (S.welch ? "  [Welch 校正]" : "");
      } else {
        const eff = Math.abs(s.cohenD);
        human = rej
          ? "有弹幕版本的沉浸感评分<b>显著高于</b>无弹幕版本，平均高出 <b>" + U.F.num(Math.abs(s.meanDiff), 2) + "</b> 分（1–10 量表），效应量 d = <b>" + U.F.num(eff, 2) + "</b>。"
          : "现有证据<b>不足以</b>断定弹幕对沉浸感有影响。";
        apa = "t(" + s.df + ") = " + U.F.num(s.t, 2) + ", p " + (s.p < 0.001 ? "< .001" : "= " + U.F.pApa(s.p)) + ", d = " + U.F.num(s.cohenD, 2);
      }

      const tcritDisp = S.tail === "two" ? "±" + U.F.num(s.tcrit, 3) : (S.tail === "less" ? "−" + U.F.num(s.tcrit, 3) : U.F.num(s.tcrit, 3));
      const pTwo = S.design === "paired" ? s.pTwo : (S.design === "one" ? s.pTwo : s.p);
      const dirTxt = S.tail === "two" ? "t 的绝对值要大于临界值才算极端。" :
        (S.tail === "less" ? "只砍掉左尾 " + (S.alpha * 100) + "%，门槛比双尾松——因为不惩罚另一侧。" : "只砍掉右尾 " + (S.alpha * 100) + "%。");

      c.innerHTML =
        '<div class="big">' + (rej ? "拒绝 H₀：证据足够" : "不能拒绝 H₀：证据不足") + "</div>" +
        '<div class="human">' + human + "</div>" +
        '<div class="apa">' + apa + "</div>" +
        '<div class="cav">' +
        "<div>临界值 t* = <b>" + tcritDisp + "</b>，观测 t = <b>" + U.F.num(s.t, 3) + "</b>。" + dirTxt + "</div>" +
        (S.design === "one" ? "<div style='margin-top:4px'>差值的 " + Math.round((1 - S.alpha) * 100) + "% 置信区间 = <b>[" + U.F.num(s.lo, 2) + ", " + U.F.num(s.hi, 2) + "]</b>" +
          (s.lo * s.hi > 0 ? "（不含 0，与拒绝 H₀ 一致）" : "（含 0，与不能拒绝 H₀ 一致）") + "</div>" : "") +
        "<div style='margin-top:4px'>单尾 p = <b>" + U.F.pApa(pTwo / 2) + "</b>，双尾 p = <b>" + U.F.pApa(pTwo) + "</b> —— 同一批数据，换成单尾问法，p 会小一半。</div>" +
        "</div>";

      // 副作用区
      const pNorm = S.tail === "two" ? 2 * (1 - ST.normalCDF(Math.abs(s.t))) : (S.tail === "less" ? ST.normalCDF(s.t) : 1 - ST.normalCDF(s.t));
      let warn = "";
      if (s.df < 30) {
        const ratio = s.p > 0 ? (pNorm / s.p) : 1;
        warn = ratio < 0.85
          ? "本例自由度只有 " + U.F.num(s.df, 0) + "，曲线厚尾。如果偷懒用正态分布算，会得到 p = " + U.F.pApa(pNorm) + "，比正确的 " + U.F.pApa(s.p) + " 小约 " + U.F.num(1 / ratio, 1) + " 倍——<b>正态会高估显著性</b>。这就是 t 分布存在的理由。"
          : "本例自由度 " + U.F.num(s.df, 0) + "，正态与 t 的差距已经不大（p 分别为 " + U.F.pApa(pNorm) + " 与 " + U.F.pApa(s.p) + "）。";
      } else {
        warn = "自由度已达 " + U.F.num(s.df, 0) + "，t 分布与正态几乎重合，用哪个结果差别很小。";
      }

      const d2 = DATA[S.design];
      const caution = S.design === "one"
        ? "<b>别急着下因果结论。</b>这是横断面、便利抽样的小样本，只能说「在这一批人里观察到了差异」。要谈「刷短视频导致注意力下降」，需要追踪设计和随机分配。"
        : S.design === "two"
          ? "<b>随机分配是关键。</b>如果文章没有被随机分配到两种标题风格，那么两组的差异可能来自题材、作者或发布时间，而非标题风格本身。"
          : "<b>顺序效应要留意。</b>所有被试都看了两个版本，先看的那一个可能产生顺序效应。规范的实验设计应当做顺序平衡（一半人先看 A，一半人先看 B）。";

      E.ttSide.innerHTML =
        '<div class="callout danger mt10"><span class="ttl">解释边界</span>' + caution + "</div>" +
        '<div class="callout info mt10"><span class="ttl">正态 vs t</span>' + warn + "</div>" +
        (s.p > 0.01 && s.p < 0.10 ? '<div class="callout warn mt10"><span class="ttl">p 值落在边缘区</span>p = ' + U.F.pApa(s.p) + " 正好处在 .05 附近。这类结果最容易被过度解读——两个 p 值相差 0.002 的研究可能被写成完全相反的结论。<b>请结合效应量与置信区间一起判断</b>，而不是只盯着是否跨过 .05。</div>" : "");
    }

    function renderReadouts(s) {
      let cards;
      if (S.design === "one") {
        cards = [
          { k: "样本均值 x̄", v: U.F.num(s.m, 3), mini: "n = " + s.n },
          { k: "标准差 s", v: U.F.num(s.s, 3), mini: "df = " + s.df },
          { k: "标准误 SE", v: U.F.num(s.se, 3), mini: "s / √n" },
          { k: "t 值", v: U.F.num(s.t, 3), hi: true, mini: "(x̄ − μ₀) / SE" },
          { k: "p 值", v: U.F.pApa(s.p), hi: true, cls: s.reject ? "hi ok" : "hi warn", mini: { two: "双尾", less: "左尾", greater: "右尾" }[S.tail] },
          { k: "临界值 t*", v: U.F.num(s.tcrit, 3), mini: "α = " + S.alpha },
          { k: "效应量 d", v: U.F.num(s.cohenD, 2), mini: U.F.effect(s.cohenD, "d") + "效应" },
          { k: "标准误差范围", v: U.F.num(s.hi - s.lo, 2), mini: "差值 " + Math.round((1 - S.alpha) * 100) + "% CI 宽度" }
        ];
      } else if (S.design === "two") {
        cards = [
          { k: "组1 均值", v: U.F.num(s.m1, 3), mini: "n₁ = " + s.x.length },
          { k: "组2 均值", v: U.F.num(s.m2, 3), mini: "n₂ = " + s.y.length },
          { k: "均值差", v: U.F.num(s.diff, 3), mini: "x̄₁ − x̄₂" },
          { k: "标准误 SE", v: U.F.num(s.se, 3), mini: S.welch ? "Welch" : "合并方差" },
          { k: "t 值", v: U.F.num(s.t, 3), hi: true, mini: "df = " + U.F.num(s.df, 2) },
          { k: "p 值", v: U.F.pApa(s.p), hi: true, cls: s.reject ? "hi ok" : "hi warn" },
          { k: "临界值 t*", v: U.F.num(s.tcrit, 3), mini: "α = " + S.alpha },
          { k: "效应量 d", v: U.F.num(s.cohenD, 2), mini: U.F.effect(s.cohenD, "d") + "效应" }
        ];
      } else {
        cards = [
          { k: "平均差值 d̄", v: U.F.num(s.meanDiff, 3), mini: "有弹幕 − 无弹幕" },
          { k: "差值标准差", v: U.F.num(s.s, 3), mini: "s_d" },
          { k: "标准误 SE", v: U.F.num(s.se, 3), mini: "s_d / √n" },
          { k: "t 值", v: U.F.num(s.t, 3), hi: true, mini: "df = " + s.df },
          { k: "p 值", v: U.F.pApa(s.p), hi: true, cls: s.reject ? "hi ok" : "hi warn" },
          { k: "临界值 t*", v: U.F.num(s.tcrit, 3), mini: "α = " + S.alpha },
          { k: "效应量 d", v: U.F.num(s.cohenD, 2), mini: U.F.effect(s.cohenD, "d") + "效应" },
          { k: "差值 95% CI", v: "[" + U.F.num(s.lo, 2) + ", " + U.F.num(s.hi, 2) + "]", mini: s.lo * s.hi > 0 ? "不含 0" : "含 0" }
        ];
      }
      E.ttOut.innerHTML = U.readouts(cards);
    }

    function renderNarr(s) {
      const strong = Math.abs(s.cohenD) >= 0.8;
      let txt;
      if (s.reject) {
        txt = "当前设定下 p = <b>" + U.F.pApa(s.p) + "</b>，已经落在 α = " + S.alpha + " 以下，拒绝 H₀。" +
          (strong ? " 效应量 |d| = " + U.F.num(Math.abs(s.cohenD), 2) + "，差异不只是统计上显著，量级上也够大。" : " 但效应量只有 " + U.F.num(Math.abs(s.cohenD), 2) + "，属于" + U.F.effect(s.cohenD, "d") + "效应——统计上显著不代表现实意义大。");
      } else {
        txt = "当前 p = <b>" + U.F.pApa(s.p) + "</b>，够不着 α = " + S.alpha + " —— 结论只能是「证据不足」，<b>不能写成「没有差异」</b>。";
      }
      const extra = s.df <= 7
        ? "现在自由度只有 " + U.F.num(s.df, 0) + "，曲线两头很厚，临界值高达 " + U.F.num(s.tcrit, 2) + "，真实差异很容易被测不出来（功效不足）。试着增加样本量。"
        : s.df >= 30
          ? "自由度 " + U.F.num(s.df, 0) + "，t 分布已经很接近正态，临界值降到 " + U.F.num(s.tcrit, 3) + "。"
          : "自由度 " + U.F.num(s.df, 0) + "，曲线仍比正态厚尾，临界值 " + U.F.num(s.tcrit, 3) + " 比正态的 1.96 更严。";
      E.ttNarr.innerHTML = txt + " " + extra;
    }

    /* ---- 事件 ---- */
    E.ttDesign.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      S.design = b.dataset.d;
      S.tail = "two";
      if (S.design !== "one") S.n = 8;
      render();
    };
    const setN = v => { S.n = Math.max(2, Math.min(16, Math.round(v))); render(); };
    E.ttNM.onclick = () => setN(S.n - 1);
    E.ttNP.onclick = () => setN(S.n + 1);
    E.ttNC.onclick = e => { const b = e.target.closest("button"); if (b) setN(+b.dataset.v); };
    const setMu = v => { S.mu0 = Math.max(40, Math.min(95, v)); render(); };
    E.ttMuM.onclick = () => setMu(S.mu0 - 1);
    E.ttMuP.onclick = () => setMu(S.mu0 + 1);
    E.ttMuC.onclick = e => { const b = e.target.closest("button"); if (b) setMu(+b.dataset.v); };
    E.ttAlphaC.onclick = e => { const b = e.target.closest("button"); if (b) { S.alpha = +b.dataset.v; render(); } };
    E.ttTailB.onclick = e => { const b = e.target.closest("button"); if (b) { S.tail = b.dataset.t; render(); } };
    E.ttNorm.onchange = () => { S.showNorm = E.ttNorm.checked; render(); };
    E.ttWelch.onchange = () => { S.welch = E.ttWelch.checked; render(); };
    E.ttReset.onclick = () => {
      S.design = "one"; S.n = 16; S.mu0 = 70; S.alpha = 0.05; S.tail = "two"; S.welch = false;
      E.ttNorm.checked = true; S.showNorm = true; E.ttWelch.checked = false;
      render();
    };
    E.ttApa.onclick = () => {
      const s = opts[S.design];
      const txt = E.ttVerdict.querySelector(".apa").textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => window.SITE_UI.toast("已复制：" + txt));
      else window.SITE_UI.toast(txt);
    };

    render();
  }
});

/* ==========================================================
   模块 7 · 单因素方差分析
   ========================================================== */
LAB.register({
  id: "anova",
  render(root) {
    const BASE = {
      "悬念式": [6.2, 7.1, 6.8, 6.4, 7.4, 6.6, 6.9, 7.0],
      "数字式": [8.6, 9.2, 8.9, 9.4, 8.4, 9.1, 8.7, 9.3],
      "疑问式": [7.0, 6.9, 7.3, 7.1, 6.8, 7.4, 7.2, 6.7],
      "直述式": [5.2, 5.6, 5.4, 5.1, 5.8, 5.3, 5.5, 5.7]
    };
    const NAMES = Object.keys(BASE);
    const S = {
      ngroups: 4, nper: 8, gap: 0, noise: 1,
      data: null, alpha: 0.05, posthoc: "tukey"
    };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">实验设定</div>' +
      U.ctrl({ label: "组数 k", valHtml: '<span id="anK">4</span>', body: U.chips("anKC", [2, 3, 4]) }) +
      U.ctrl({ label: "每组样本量", valHtml: '<span id="anN"></span>', body: U.stepper("anNM", "anNP") + U.chips("anNC", [4, 6, 8, 12, 20]) }) +
      U.ctrl({
        label: "组间差异（拉开多少）", valHtml: '<span id="anGap"></span>',
        body: '<input type="range" id="anGapR" min="0" max="100" step="1" value="0">',
        note: "0 = 四组真实均值完全相同（H₀ 为真）；往右拉 = 人为制造组间差异。"
      }) +
      U.ctrl({
        label: "组内噪音（个体差异）", valHtml: '<span id="anNoise"></span>',
        body: '<input type="range" id="anNoiseR" min="20" max="300" step="1" value="100">',
        note: "越大表示组内个体差异越强。<b>F 值关心的是「组间差异相对于组内噪音有多大」</b>——噪音一大，同样的组间差异就淹没在里面了。"
      }) +
      U.ctrl({ label: "显著性水平 α", valHtml: '<span id="anAlpha"></span>', body: U.chips("anAlphaC", [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]) }) +
      '<div class="row mt14"><button class="btn primary block" id="anNew">重新生成一组随机数据</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>四组数据的分布与均值</h2><span class="spacer"></span>' +
      '<span class="badge" id="anDf"></span></div>' +
      '<div class="stage"><svg id="anChart1"></svg></div>' +
      U.legend([
        { c: "rgba(76,201,240,.35)", t: "各组的个体观测（散点 + 箱体）", dot: false },
        { c: "var(--g2)", t: "各组均值", dot: false },
        { c: "var(--g4)", t: "总均值 x̄", dot: false }
      ]) +
      "</div>" +
      '<div class="card"><div class="card-h"><h2>F 分布上的 p 值区域</h2><span class="spacer"></span>' +
      '<span class="badge" id="anBadge"></span></div>' +
      '<div class="stage"><svg id="anChart2"></svg></div>' +
      '<div class="narr" id="anNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="anOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>方差分析表</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>变异来源</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p</th></tr></thead><tbody id="anTable"></tbody></table></div>' +
      '<div class="note mt10">F = MS<sub>组间</sub> / MS<sub>组内</sub>。<b>F ≈ 1 说明分组几乎没起作用</b>——组间差异和组内噪音差不多大。</div></section>' +
      '<section class="card"><div class="card-h"><h2>事后多重比较</h2>' +
      '<span class="spacer"></span><div class="chips" id="anPH">' +
      '<button class="chip active" data-v="tukey">Tukey HSD</button>' +
      '<button class="chip" data-v="lsd">LSD</button>' +
      '<button class="chip" data-v="bonf">Bonferroni</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>比较</th><th>均值差</th><th>临界差</th><th>p</th><th>判定</th></tr></thead><tbody id="anPost"></tbody></table></div>' +
      '<div class="note mt10" id="anPostNote"></div></section>' +
      '<section class="card"><div class="card-h"><h2>为什么不能反复做 t 检验</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>组数 k</th><th>比较次数</th><th>至少一次假阳性概率</th></tr></thead><tbody id="anFWER"></tbody></table></div>' +
      '<div class="callout danger mt10"><span class="ttl">多重比较问题</span>每次检验的 α 都是 .05，但做很多次时，「至少错一次」的概率会迅速逼近 1。方差分析通过<b>一次整体检验</b>把总体的第一类错误率控制在约定的 α 水平。</div></section>' +
      "</div>";

    const ids = ["anK", "anKC", "anN", "anNM", "anNP", "anNC", "anGap", "anGapR", "anNoise", "anNoiseR",
      "anAlpha", "anAlphaC", "anNew", "anDf", "anChart1", "anChart2", "anBadge", "anNarr", "anOut",
      "anTable", "anPH", "anPost", "anPostNote", "anFWER"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.anKC.innerHTML = [2, 3, 4].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.anNC.innerHTML = [4, 6, 8, 12, 20].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.anAlphaC.innerHTML = [{ v: 0.10, t: ".10" }, { v: 0.05, t: ".05" }, { v: 0.01, t: ".01" }]
      .map(o => '<button class="chip" data-v="' + o.v + '">' + o.t + "</button>").join("");

    const rng = new ST.RNG(2718281);
    const TRUE_MEAN = [7.4, 8.0, 7.0, 5.6];

    function gen() {
      const k = S.ngroups, n = S.nper;
      const gapF = S.gap / 100;
      const noiseF = S.noise / 100;
      const base = 7.0;
      const spread = 1.1 * gapF;
      const groups = [], names = [];
      for (let i = 0; i < k; i++) {
        names.push(NAMES[i]);
        const mu = base + (TRUE_MEAN[i] - base) * (spread / 1.1) * 1.4;
        // 保证 gap=0 时所有组真实均值完全相同
        const realMu = (S.gap === 0) ? base : mu;
        const arr = [];
        for (let j = 0; j < n; j++) {
          arr.push(Math.max(0.4, +(realMu + rng.normal(0, 0.62 * noiseF)).toFixed(2)));
        }
        groups.push(arr);
      }
      S.data = { groups, names };
    }
    gen();

    function draw() {
      const { groups, names } = S.data;
      const k = S.ngroups, n = S.nper;
      E.anK.textContent = k; E.anN.textContent = n;
      E.anGap.textContent = S.gap + "%";
      E.anNoise.textContent = S.noise + "%";
      E.anAlpha.textContent = "." + String(S.alpha).replace(/^0\./, "");
      U.$$("#anKC button").forEach(b => b.classList.toggle("active", +b.dataset.v === k));
      U.$$("#anNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === n));
      U.$$("#anAlphaC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.alpha));
      U.$$("#anPH button").forEach(b => b.classList.toggle("active", b.dataset.v === S.posthoc));

      const a = ST.anova1(groups);
      E.anDf.textContent = "F(" + a.dfB + ", " + a.dfW + ")";

      /* ---- 图 1：各组分布 ---- */
      const all = [].concat.apply([], groups);
      const lo = Math.max(0, Math.min.apply(null, all) - 0.6);
      const hi = Math.max.apply(null, all) + 0.6;
      const p = U.makePlot({ W: 880, H: 320, xr: [lo, hi], yr: [0, 1], margin: { l: 96, r: 26, t: 30, b: 44 } });

      // 自定义纵轴：每个组占一档
      const laneH = p.PH / k;
      function gy(v) { return p.M.t + laneH * (v + 0.5); }
      p.raw('<rect x="' + p.M.l + '" y="' + p.M.t + '" width="' + p.PW + '" height="' + p.PH + '" fill="' + U.cvar("--card-2", "rgba(255,255,255,.02)") + '" rx="6" opacity=".5"/>');
      // 横轴网格
      const gs = U.niceStep(hi - lo);
      for (let v = Math.ceil(lo / gs) * gs; v <= hi + 1e-9; v += gs) {
        p.raw('<line x1="' + p.x(v).toFixed(1) + '" y1="' + p.M.t + '" x2="' + p.x(v).toFixed(1) + '" y2="' + (p.M.t + p.PH) + '" stroke="' + U.cvar("--line-soft", "rgba(255,255,255,.055)") + '"/>');
        p.raw('<text x="' + p.x(v).toFixed(1) + '" y="' + (p.M.t + p.PH + 20) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="11.5" font-family="monospace" text-anchor="middle">' + (+v.toFixed(4)) + "</text>");
      }
      p.raw('<text x="' + (p.M.l + p.PW) + '" y="' + (p.M.t + p.PH + 40) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="12" text-anchor="end">打开率（%）</text>');
      // 总均值
      p.raw('<line x1="' + p.x(a.grand).toFixed(1) + '" y1="' + p.M.t + '" x2="' + p.x(a.grand).toFixed(1) + '" y2="' + (p.M.t + p.PH) + '" stroke="var(--g4)" stroke-width="1.8" stroke-dasharray="6 4"/>');
      p.ptext(p.x(a.grand), p.M.t - 8, "总均值 " + U.F.num(a.grand, 3), { fill: "var(--g4)", size: 11.5, mono: true, anchor: "middle" });

      groups.forEach((g, i) => {
        const cy = gy(i);
        // 箱体
        const bs = ST.boxStats(g);
        const bh = laneH * 0.42;
        p.raw('<rect x="' + p.x(bs.q1).toFixed(1) + '" y="' + (cy - bh / 2).toFixed(1) + '" width="' + (p.x(bs.q3) - p.x(bs.q1)).toFixed(1) +
          '" height="' + bh.toFixed(1) + '" fill="rgba(76,201,240,.13)" stroke="rgba(76,201,240,.5)" stroke-width="1.2" rx="3"/>');
        p.raw('<line x1="' + p.x(bs.whiskerLo).toFixed(1) + '" y1="' + cy.toFixed(1) + '" x2="' + p.x(bs.whiskerHi).toFixed(1) + '" y2="' + cy.toFixed(1) + '" stroke="rgba(76,201,240,.6)" stroke-width="1.2"/>');
        // 散点（抖动）
        g.forEach((v, j) => {
          const jit = (rng.uniform(0, 1) - 0.5) * laneH * 0.62;
          p.raw('<circle cx="' + p.x(v).toFixed(1) + '" cy="' + (cy + jit).toFixed(1) + '" r="3" fill="rgba(76,201,240,.55)"/>');
        });
        // 组均值
        p.raw('<line x1="' + p.x(a.means[i]).toFixed(1) + '" y1="' + (cy - laneH * 0.3).toFixed(1) + '" x2="' + p.x(a.means[i]).toFixed(1) + '" y2="' + (cy + laneH * 0.3).toFixed(1) + '" stroke="var(--g2)" stroke-width="3" stroke-linecap="round"/>');
        p.ptext(p.x(a.means[i]), cy - laneH * 0.3 - 5, U.F.num(a.means[i], 2), { fill: "var(--g2)", size: 11, mono: true, anchor: "middle" });
        // 组名
        p.ptext(p.M.l - 12, cy + 4, names[i], { fill: U.cvar("--fg-dim", "#c6cee2"), size: 12.5, anchor: "end" });
      });
      p.mount(E.anChart1);

      /* ---- 图 2：F 分布 ---- */
      const fp = U.makePlot({ W: 880, H: 260, xr: [0, 1], yr: [0, 1] });
      const fmax = Math.max(4.5, Math.min(30, a.F * 1.5));
      fp.setX(0, fmax).autoY(f => ST.fPDF(f, a.dfB, a.dfW), 0.001, fmax, 1.18)
        .bg().grid(0, 0).axes({ xLabel: "F 值", yLabel: "f(F)", stepX: U.niceStep(fmax) });
      const fc = ST.fInv(1 - S.alpha, a.dfB, a.dfW);
      const den = f => ST.fPDF(f, a.dfB, a.dfW);
      fp.area(Math.min(fc, fmax), fmax, den, { fill: "rgba(247,37,133,.32)", stroke: "rgba(247,37,133,.9)" });
      fp.line(f => den(f), { stroke: "url(#lgA)", width: 2.6 });
      fp.line(f => den(f), { stroke: "none", fill: "url(#lgB)" });
      fp.vline(fc, { stroke: "var(--g4)", dash: "4 4", label: "F* = " + U.F.num(fc, 2) });
      if (a.F <= fmax) {
        fp.vline(a.F, { stroke: "rgba(255,255,255,.5)", dash: "3 4" });
        fp.dot(a.F, Math.min(den(a.F), fp.yr[1]), { stroke: "var(--g2)", r: 5 });
        fp.ptext(fp.x(a.F), fp.M.t + fp.PH - 12, "F = " + U.F.num(a.F, 3), { fill: "var(--g2)", size: 12.5, mono: true, anchor: "middle" });
      }
      fp.mount(E.anChart2);

      const reject = a.p < S.alpha;
      E.anBadge.className = "badge " + (reject ? "ok" : "warn");
      E.anBadge.textContent = reject ? "拒绝 H₀" : "不能拒绝 H₀";

      /* ---- 方差分析表 ---- */
      E.anTable.innerHTML =
        '<tr><td class="tx">组间</td><td>' + U.F.num(a.ssb, 3) + "</td><td>" + a.dfB + "</td><td>" + U.F.num(a.msb, 3) + '</td><td class="c">' + U.F.num(a.F, 3) + "</td><td>" + U.F.pApa(a.p) + "</td></tr>" +
        '<tr><td class="tx">组内</td><td>' + U.F.num(a.ssw, 3) + "</td><td>" + a.dfW + "</td><td>" + U.F.num(a.msw, 3) + '</td><td class="faint">—</td><td class="faint">—</td></tr>' +
        '<tr><td class="tx"><b>总计</b></td><td><b>' + U.F.num(a.sst, 3) + "</b></td><td><b>" + (a.N - 1) + '</b></td><td class="faint">—</td><td class="faint">—</td><td class="faint">—</td></tr>';

      /* ---- 事后比较 ---- */
      const ph = ST.posthocLSD(a, groups, S.alpha);
      let rows = "";
      if (!reject) {
        rows = '<tr><td class="tx faint" colspan="5">整体 F 检验未达到显著，按 Fisher 保护程序，不做事后比较。</td></tr>';
      } else {
        const adj = S.posthoc === "bonf" ? 1 / (k * (k - 1) / 2) : 1;
        const tcrit = ST.tInv(1 - S.alpha * adj / 2, a.dfW);
        rows = ph.map(x => {
          const se = Math.sqrt(a.msw * (1 / a.ns[x.i] + 1 / a.ns[x.j]));
          const lsd = tcrit * se;
          let pAdj = x.p;
          if (S.posthoc === "bonf") {
            pAdj = Math.min(1, x.p * (k * (k - 1) / 2));
          } else if (S.posthoc === "tukey") {
            // Tukey: 用学生化极差近似，保守处理
            const q = Math.abs(x.diff) / Math.sqrt(a.msw / a.ns[x.i]);
            pAdj = Math.min(1, 1 - ST.fCDF(Math.pow(q / Math.sqrt(2), 2), k - 1, a.dfW) + 0.0);
            pAdj = Math.min(1, Math.max(pAdj, x.p));
          }
          const sig = Math.abs(x.diff) > lsd;
          return "<tr><td class=\"tx\">" + names[x.i] + " − " + names[x.j] + "</td><td>" + U.F.num(x.diff, 3) + "</td><td>" +
            U.F.num(lsd, 3) + "</td><td>" + U.F.pApa(pAdj) + '</td><td style="color:' + (sig ? "var(--ok)" : "var(--fg-mut)") + '">' + (sig ? "显著" : "不显著") + "</td></tr>";
        }).join("");
      }
      E.anPost.innerHTML = rows;
      E.anPostNote.innerHTML = S.posthoc === "tukey"
        ? "Tukey HSD 控制所有两两比较的<b>总体</b>第一类错误率，是平衡设计下的首选。"
        : S.posthoc === "bonf"
          ? "Bonferroni 把 α 除以比较次数，最保守，功效最低，但几乎不会假阳性。"
          : "LSD 最宽松、功效最高，但只在整体 F 显著后使用（Fisher 保护程序）才勉强可接受。";

      /* ---- FWER 表 ---- */
      E.anFWER.innerHTML = [2, 3, 4, 5, 6, 8, 10].map(kk => {
        const m = kk * (kk - 1) / 2;
        const fw = 1 - Math.pow(0.95, m);
        return '<tr' + (kk === k ? ' style="color:var(--acc);font-weight:600"' : "") + '><td class="tx">' + kk + "</td><td>" + m + "</td><td>" + U.F.num(fw * 100, 1) + "%</td></tr>";
      }).join("");

      /* ---- 读数 ---- */
      E.anOut.innerHTML = U.readouts([
        { k: "组数 k", v: k, mini: "每组 n = " + n },
        { k: "总均值", v: U.F.num(a.grand, 3) },
        { k: "组间均方 MSB", v: U.F.num(a.msb, 3), mini: "由分组解释" },
        { k: "组内均方 MSW", v: U.F.num(a.msw, 3), mini: "随机噪音" },
        { k: "F 值", v: U.F.num(a.F, 3), hi: true, mini: "MSB / MSW" },
        { k: "p 值", v: U.F.pApa(a.p), hi: true, cls: reject ? "hi ok" : "hi warn" },
        { k: "效应量 η²", v: U.F.num(a.eta2, 3), mini: U.F.effect(a.eta2, "eta") + "效应" },
        { k: "ω²（校正）", v: U.F.num(a.omega2, 3), mini: "对总体更无偏" }
      ]);

      /* ---- 叙述 ---- */
      E.anNarr.innerHTML =
        "F = MS<sub>组间</sub> / MS<sub>组内</sub> = " + U.F.num(a.msb, 3) + " / " + U.F.num(a.msw, 3) + " = <b>" + U.F.num(a.F, 3) + "</b>，" +
        (reject
          ? "落在临界值 " + U.F.num(fc, 2) + " 右侧，p = <b>" + U.F.pApa(a.p) + "</b> < α，" + "<b>拒绝「各组均值全相等」的零假设</b>。至少有一组不同——具体是哪几组不同，看右下角的事后比较。"
          : "没有超过临界值 " + U.F.num(fc, 2) + "，p = <b>" + U.F.pApa(a.p) + "</b>，<b>不能拒绝 H₀</b>。") +
        (S.gap === 0 ? " 当前「组间差异」滑块在最左边，四组的真实均值完全相同，所以理论上不应显著——如果不小心得到了显著结果，那正是 α 允许的那 " + (S.alpha * 100) + "% 假阳性。" : "") +
        (S.noise > 200 ? " 当前组内噪音很大，个体差异把组间差异淹没了，F 值被压低。" : "");
    }

    /* ---- 事件 ---- */
    E.anKC.onclick = e => { const b = e.target.closest("button"); if (b) { S.ngroups = +b.dataset.v; gen(); draw(); } };
    const setN = v => { S.nper = Math.max(2, Math.min(60, Math.round(v))); gen(); draw(); };
    E.anNM.onclick = () => setN(S.nper - 1);
    E.anNP.onclick = () => setN(S.nper + 1);
    E.anNC.onclick = e => { const b = e.target.closest("button"); if (b) setN(+b.dataset.v); };
    E.anGapR.oninput = () => { S.gap = +E.anGapR.value; gen(); draw(); };
    E.anNoiseR.oninput = () => { S.noise = +E.anNoiseR.value; gen(); draw(); };
    E.anAlphaC.onclick = e => { const b = e.target.closest("button"); if (b) { S.alpha = +b.dataset.v; draw(); } };
    E.anNew.onclick = () => { gen(); draw(); };
    E.anPH.onclick = e => { const b = e.target.closest("button"); if (b) { S.posthoc = b.dataset.v; draw(); } };

    draw();
  }
});

})();
