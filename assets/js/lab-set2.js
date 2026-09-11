/* =========================================================
   lab-set2.js — 互动模块（二）：推断统计基础
     · clt   抽样分布与中心极限定理
     · ci    参数估计与置信区间覆盖模拟
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

/* ==========================================================
   模块 4 · 抽样分布与中心极限定理
   ========================================================== */
LAB.register({
  id: "clt",
  render(root) {
    const POPS = {
      uniform: { name: "均匀分布", mu: 50, sigma: 14.43, gen: (r, N) => { const o = []; for (let i = 0; i < N; i++) o.push(r.uniform(20, 80)); return o; } },
      normal: { name: "正态分布", mu: 50, sigma: 15, gen: (r, N) => r.normalSample(N, 50, 15) },
      right: { name: "右偏（长尾）", mu: 20.4, sigma: 23.6, gen: (r, N) => r.lognormalSample(N, 2.6, 0.9) },
      extreme: { name: "极端右偏", mu: 2.7, sigma: 8.2, gen: (r, N) => r.lognormalSample(N, 0.5, 1.3) },
      bimodal: { name: "双峰分布", mu: 50, sigma: 19.4, gen: (r, N) => { const o = []; for (let i = 0; i < N; i++) o.push(r.normal(i % 2 ? 36 : 64, 8)); return o; } },
      skewedL: { name: "左偏", mu: 79.6, sigma: 23.6, gen: (r, N) => r.lognormalSample(N, 2.6, 0.9).map(v => 100 - v) }
    };
    const S = {
      pop: "extreme", n: 5, means: [], M: 0, running: false,
      popData: null, showNormal: true, bins: 28, logScale: false
    };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">第一步 · 选一个总体</div>' +
      U.chips("clPop", Object.keys(POPS).map(k => ({ v: k, t: POPS[k].name })), "extreme") +
      '<div class="note">为了看清中心极限定理的威力，建议先用<b>「极端右偏」</b>——它的原始分布一点都不像正态。</div>' +

      '<div class="sect-title mt18">第二步 · 决定每次抽多少人</div>' +
      U.ctrl({ label: "样本量 n", valHtml: '<span id="clN">5</span>', body: U.stepper("clNM", "clNP") + U.chips("clNC", [1, 2, 5, 10, 30, 100, 300]) }) +

      '<div class="sect-title mt18">第三步 · 反复抽样</div>' +
      '<div class="row"><button class="btn primary" id="clOne">抽 1 次</button>' +
      '<button class="btn" id="clMany">连抽 500 次</button>' +
      '<button class="btn ok" id="clAuto">自动连抽</button></div>' +
      '<div class="row mt10"><button class="btn block danger" id="clClear">清空所有抽样结果</button></div>' +

      U.ctrl({
        label: "显示选项",
        body: '<div style="display:flex;flex-direction:column;gap:8px">' +
          U.sw("clNorm", "在抽样分布上叠加正态曲线", true) +
          U.sw("clSE", "标出 ±1 标准误范围", true) + "</div>"
      }) +
      '<div class="ctrl"><div class="note">已抽取 <b id="clM">0</b> 次，每次 n = <b id="clM2">5</b>，累计使用了 <b id="clUsed">0</b> 个观测。</div></div>' +
      "</section>" +

      '<section class="viz stack">' +
      // 总体
      '<div class="card"><div class="card-h"><h2>① 原始总体分布</h2><span class="spacer"></span>' +
      '<span class="badge" id="clPopInfo"></span></div>' +
      '<div class="stage"><svg id="clPopChart"></svg></div>' +
      '<div class="note">这是「个体」的分布。可以看到它' +
      '<b id="clPopShape">严重右偏，完全不像正态</b>。' +
      '我们每次只从这里面抽出 n 个人，算一个平均分。</div>' +
      "</div>" +
      // 抽样分布
      '<div class="card"><div class="card-h"><h2>② 样本均值的抽样分布</h2><span class="spacer"></span>' +
      '<span class="badge acc" id="clState">尚未开始抽样</span></div>' +
      '<div class="stage"><svg id="clMeanChart"></svg></div>' +
      U.legend([
        { c: "var(--g5)", t: "样本均值 x̄ 的分布（直方图）" },
        { c: "var(--g3)", t: "正态曲线 N(μ, σ/√n)", dot: false },
        { c: "var(--g4)", t: "μ（总体均值）" },
        { c: "rgba(255,183,3,.20)", t: "±1 标准误范围", dot: false }
      ]) +
      '<div class="narr" id="clNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="clOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>√n 法则 · 实测 vs 理论</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>n</th><th>理论 SE</th><th>实测 SE</th><th>相对缩小</th></tr></thead><tbody id="clSELaw"></tbody></table></div>' +
      '<div class="note mt10">理论值 = σ/√n。切换不同的 n 各抽 500 次，对比实测值，就能验证这条法则。</div></section>' +
      '<section class="card"><div class="card-h"><h2>最容易混淆的一对概念</h2></div>' +
      '<div class="kv" id="clConfuse"></div>' +
      '<div class="callout purple mt10"><span class="ttl">一句话记住</span>' +
      "标准差 s 说的是「<b>人和人</b>差多少」；标准误 SE 说的是「<b>我的平均分</b>有多不准」。<br>加大 n，s 基本不变，SE 却会缩小。</div></section>" +
      '<section class="card"><div class="card-h"><h2>中心极限定理说了什么</h2></div>' +
      '<div class="prose fs14" style="max-width:none">' +
      "<p>无论总体服从<b>什么分布</b>，只要样本量足够大，样本均值的抽样分布就近似正态，其均值等于总体均值 μ，标准差等于 σ/√n。</p>" +
      '<p class="callout warn"><b>但「足够大」没有固定数字。</b>总体对称时 n = 10 可能就够；总体严重右偏时，可能要 n ≥ 100。所以本站把原始总体设成可以切换的——你亲手试一遍，比记结论有用。</p>' +
      '<p class="note mb0">把 n 调到 1：抽样分布会长得和原始总体一模一样——这就是为什么样本量太小时推断不可靠。</p>' +
      "</div></section>" +
      "</div>";

    const ids = ["clPop", "clN", "clNM", "clNP", "clNC", "clOne", "clMany", "clAuto", "clClear",
      "clNorm", "clSE", "clM", "clM2", "clUsed", "clPopInfo", "clPopShape", "clPopChart",
      "clMeanChart", "clState", "clNarr", "clOut", "clSELaw", "clConfuse"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.clNC.innerHTML = [1, 2, 5, 10, 30, 100, 300].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");

    const rng = new ST.RNG(20260911);
    function buildPop() {
      const N = 30000;
      S.popData = POPS[S.pop].gen(rng, N);
    }
    buildPop();

    const stat = () => ST.describe(S.popData);

    function sampleOnce() {
      const n = S.n;
      const arr = new Array(n);
      const N = S.popData.length;
      let sum = 0;
      for (let i = 0; i < n; i++) { const v = S.popData[(rng.uniform(0, 1) * N) | 0]; arr[i] = v; sum += v; }
      return sum / n;
    }

    /** 理论方差（用大样本实测值近似） */
    function popParams() {
      const st = stat();
      return { mu: st.mean, sigma: st.sd };
    }

    function drawPop() {
      const pp = popParams();
      const st = stat();
      E.clPopInfo.textContent = "μ = " + U.F.num(pp.mu, 2) + "  σ = " + U.F.num(pp.sigma, 2);
      E.clPopShape.textContent = Math.abs(st.skew) < 0.3 ? "接近对称"
        : st.skew > 1.5 ? "严重右偏，完全不像正态"
          : st.skew > 0.3 ? "略有右偏" : "左偏";

      const p = U.makePlot({ W: 880, H: 240, xr: [0, 1], yr: [0, 1] });
      const lo = st.min, hi = Math.min(st.max, ST.quantile(S.popData, 0.995));
      const hg = ST.histogram(S.popData.filter(v => v <= hi), 46);
      let mx = Math.max.apply(null, hg.counts);
      p.setX(lo, hi).setY(0, mx * 1.15).bg().grid(0, 0).axes({ xLabel: "个体观测值 x", yLabel: "人数" });
      const w = hg.edges[1] - hg.edges[0];
      hg.counts.forEach((c, i) => {
        p.bar(hg.edges[i], hg.edges[i] + w, c, { fill: "rgba(123,97,255,.42)", stroke: "rgba(123,97,255,.9)", width: 1, gap: 1 });
      });
      p.vline(pp.mu, { stroke: "var(--g4)", label: "μ = " + U.F.num(pp.mu, 1), dash: "4 3" });
      // n 个人
      p.ptext(p.M.l + 8, p.M.t + 16, "从这里每次抽出 n = " + S.n + " 个观测 → 算一个均值", { fill: U.cvar("--fg-mut", "#8d99b6"), size: 11.5 });
      p.mount(E.clPopChart);
    }

    function drawMeans() {
      const pp = popParams();
      const semTheory = pp.sigma / Math.sqrt(S.n);
      const M = S.means.length;

      const p = U.makePlot({ W: 880, H: 320, xr: [0, 1], yr: [0, 1] });
      const lo = Math.max(pp.mu - 5 * Math.max(semTheory, pp.sigma / 3), ST.quantile(S.popData, 0.002));
      const hi = Math.min(pp.mu + 5 * Math.max(semTheory, pp.sigma / 3), ST.quantile(S.popData, 0.998));
      p.setX(lo, hi);

      if (!M) {
        p.setY(0, 1);
        p.bg().grid(0, 0).axes({ xLabel: "样本均值 x̄", yLabel: "次数" });
        p.text((lo + hi) / 2, 0.5, "点击左侧「抽 1 次」开始", { anchor: "middle", size: 14, fill: U.cvar("--fg-faint", "#6f7b9b") });
        p.mount(E.clMeanChart);
        E.clState.textContent = "尚未开始抽样";
        return;
      }

      const hg = ST.histogram(S.means, S.bins);
      let mx = Math.max.apply(null, hg.counts);
      // 与正态曲线同尺度：正态峰值密度 × N × 组距
      const bw = (hi - lo) / Math.max(8, Math.round(2 * Math.pow(M, 1 / 3)));
      const normPeak = M * bw * ST.normalPDF(pp.mu, pp.mu, semTheory);
      p.setY(0, Math.max(mx, normPeak) * 1.2);
      p.bg().grid(0, 0).axes({ xLabel: "样本均值 x̄", yLabel: "次数" });

      const w = hg.edges[1] - hg.edges[0];
      hg.counts.forEach((c, i) => {
        p.bar(hg.edges[i], hg.edges[i] + w, c, { fill: "rgba(123,97,255,.45)", stroke: "rgba(123,97,255,.95)", width: 1, gap: 1 });
      });

      // ±1SE
      if (S.clSE.checked) {
        const a = p.x(pp.mu - semTheory), b = p.x(pp.mu + semTheory);
        p.raw('<rect x="' + a.toFixed(1) + '" y="' + p.M.t + '" width="' + (b - a).toFixed(1) + '" height="' + p.PH + '" fill="rgba(255,183,3,.13)" stroke="rgba(255,183,3,.4)" stroke-dasharray="3 3"/>');
      }

      // 实测分布
      const mMean = ST.mean(S.means), mSd = ST.sd(S.means);
      const sdUse = M > 2 ? mSd : semTheory;

      // 正态对照
      if (S.clNorm.checked) {
        const peak = M * w * ST.normalPDF(mMean, mMean, sdUse);
        const scale = p.yr[1] / (M * w);
        p.line(x => ST.normalPDF(x, mMean, sdUse) * M * w, { stroke: "var(--g3)", width: 2.2, dash: "6 4", opacity: .9 });
      }

      p.vline(pp.mu, { stroke: "var(--g4)", label: "μ = " + U.F.num(pp.mu, 2), dash: "4 3" });
      p.vline(mMean, { stroke: "var(--g1)", label: "x̄ 的均值 = " + U.F.num(mMean, 2), dash: "4 3", labelY: p.M.t + 30 });

      p.mount(E.clMeanChart);

      const st = ST.describe(S.means);
      const sk = st.skew;
      E.clState.textContent = M + " 次抽样的结果";

      // 读数
      E.clOut.innerHTML = U.readouts([
        { k: "总体 μ", v: U.F.num(pp.mu, 2), mini: "固定真值" },
        { k: "总体 σ", v: U.F.num(pp.sigma, 2), mini: "个体离散程度" },
        { k: "样本量 n", v: S.n, mini: "每次抽几人" },
        { k: "理论 SE", v: U.F.num(semTheory, 3), hi: true, mini: "σ/√n" },
        { k: "实测 SE", v: M > 2 ? U.F.num(st.sd, 3) : "—", mini: "抽样分布的标准差" },
        { k: "抽样次数", v: M, mini: "已抽 " + (M * S.n) + " 个观测" },
        { k: "抽样分布偏度", v: M > 5 ? U.F.num(sk, 3) : "—", cls: M > 5 && Math.abs(sk) > 0.5 ? "warn" : (M > 5 ? "ok" : ""), mini: "越接近 0 越正态" },
        { k: "均值覆盖率", v: M > 5 ? U.F.num((ST.normalCDF(1) - ST.normalCDF(-1)) * 100, 1) + "%" : "—", mini: "±1SE 内应有 68%" }
      ]);

      // 叙述
      const closeToNormal = M > 30 && Math.abs(sk) < 0.5;
      E.clNarr.innerHTML =
        "已抽 <b>" + M + "</b> 次，每次 <b>" + S.n + "</b> 人。抽样分布的均值 = <b>" + U.F.num(mMean, 2) +
        "</b>，已经很接近总体均值 <b>" + U.F.num(pp.mu, 2) + "</b>。" +
        (closeToNormal
          ? " 分布形状的偏度只有 <b>" + U.F.num(sk, 2) + "</b>，基本对称——<b>中心极限定理生效了</b>。"
          : " 目前偏度 <b>" + U.F.num(sk, 2) + "</b>，还看得出偏斜。继续抽样，或把 n 调大试试。") +
        (S.n <= 2 ? " <b>注意：n 这么小时，抽样分布几乎就是原始总体的形状</b>——这正是小样本推断不可靠的根本原因。" : "") +
        (S.n >= 30 ? " 当前 n = " + S.n + "，已经较大，分布明显向正态靠拢，标准误也压到了 <b>" + U.F.num(semTheory, 3) + "</b>。" : "");
    }

    function drawLaw() {
      const pp = popParams();
      const rows = [1, 2, 5, 10, 30, 100, 300].map(n => {
        const th = pp.sigma / Math.sqrt(n);
        const mark = n === S.n ? ' style="color:var(--acc);font-weight:600"' : "";
        return "<tr" + mark + '><td class="tx">' + n + "</td><td>" + U.F.num(th, 3) + "</td><td>" +
          (n === S.n && S.means.length > 2 ? U.F.num(ST.sd(S.means), 3) : "—") + "</td><td>" +
          U.F.num(th / (pp.sigma / Math.sqrt(1)) * 100, 1) + "%</td></tr>";
      }).join("");
      E.clSELaw.innerHTML = rows;
    }

    function drawConfuse() {
      const pp = popParams();
      const st = stat();
      const se = pp.sigma / Math.sqrt(S.n);
      E.clConfuse.innerHTML =
        '<div class="k">标准差 s（个体）</div><div class="v">' + U.F.num(pp.sigma, 2) + "</div>" +
        '<div class="k">标准误 SE（均值）</div><div class="v">' + U.F.num(se, 2) + "</div>" +
        '<div class="k">两者的比值</div><div class="v">' + U.F.num(pp.sigma / se, 2) + " 倍</div>" +
        '<div class="k">s 随 n 变化</div><div class="v na">基本不变</div>' +
        '<div class="k">SE 随 n 变化</div><div class="v">按 1/√n 缩小</div>';
    }

    function refresh() {
      E.clM.textContent = S.means.length;
      E.clM2.textContent = S.n;
      E.clUsed.textContent = S.means.length * S.n;
      E.clN.textContent = S.n;
      U.$$("#clNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      drawPop(); drawMeans(); drawLaw(); drawConfuse();
    }

    let timer = null;
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; E.clAuto.classList.remove("active"); E.clAuto.textContent = "自动连抽"; } }

    E.clPop.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      S.pop = b.dataset.v; S.means = [];
      U.$$("#clPop button").forEach(x => x.classList.toggle("active", x === b));
      buildPop(); refresh();
    };
    const setN = v => { S.n = Math.max(1, Math.min(500, Math.round(v))); S.means = []; stopAuto(); refresh(); };
    E.clNM.onclick = () => setN(S.n - 1);
    E.clNP.onclick = () => setN(S.n + 1);
    E.clNC.onclick = e => { const b = e.target.closest("button"); if (b) setN(+b.dataset.v); };
    E.clOne.onclick = () => { S.means.push(sampleOnce()); refresh(); };
    E.clMany.onclick = () => { for (let i = 0; i < 500; i++) S.means.push(sampleOnce()); refresh(); };
    E.clAuto.onclick = () => {
      if (timer) { stopAuto(); return; }
      E.clAuto.classList.add("active"); E.clAuto.textContent = "暂停";
      timer = setInterval(() => {
        for (let i = 0; i < 12; i++) S.means.push(sampleOnce());
        if (S.means.length > 4000) stopAuto();
        refresh();
      }, 44);
    };
    E.clClear.onclick = () => { stopAuto(); S.means = []; refresh(); };
    E.clNorm.onchange = drawMeans;
    E.clSE.onchange = drawMeans;

    refresh();
  }
});

/* ==========================================================
   模块 5 · 置信区间与覆盖模拟
   ========================================================== */
LAB.register({
  id: "ci",
  render(root) {
    const S = { mu: 50, sigma: 15, n: 25, conf: 0.95, reps: 100, intervals: [], showZ: true, hoverIdx: -1 };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">总体真值（未知，模拟中告诉我们）</div>' +
      U.ctrl({ label: "总体均值 μ", valHtml: '<span id="ciMu"></span>', body: '<input type="range" id="ciMuR" min="20" max="80" step="0.5" value="50">', note: "真值是固定的常数。注意：<b>真正做研究时我们并不知道它</b>。" }) +
      U.ctrl({ label: "总体标准差 σ", valHtml: '<span id="ciSig"></span>', body: '<input type="range" id="ciSigR" min="2" max="30" step="0.5" value="15">' }) +
      '<div class="sect-title mt18">抽样设定</div>' +
      U.ctrl({ label: "样本量 n", valHtml: '<span id="ciN"></span>', body: U.stepper("ciNM", "ciNP") + U.chips("ciNC", [9, 16, 25, 49, 100, 400]) }) +
      U.ctrl({ label: "置信水平", valHtml: '<span id="ciConf"></span>', body: U.chips("ciConfC", [{ v: 0.80, t: "80%" }, { v: 0.90, t: "90%" }, { v: 0.95, t: "95%" }, { v: 0.99, t: "99%" }]) }) +
      U.ctrl({ label: "模拟次数", valHtml: '<span id="ciReps"></span>', body: U.chips("ciRepsC", [20, 50, 100, 300, 1000]) }) +
      '<div class="row mt14"><button class="btn primary block" id="ciRun">重新模拟</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>每一条横线，都是一次抽样算出的置信区间</h2>' +
      '<span class="spacer"></span><span class="badge ok" id="ciCover"></span></div>' +
      '<div class="stage"><svg id="ciChart"></svg></div>' +
      U.legend([
        { c: "var(--g4)", t: "盖住了真值 μ（成功）", dot: false },
        { c: "var(--g3)", t: "没盖住真值（失败）", dot: false },
        { c: "var(--g2)", t: "真值 μ", dot: false }
      ]) +
      '<div class="narr" id="ciNarr"></div>' +
      "</div>" +
      '<div class="readouts" id="ciOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>单次抽样的完整计算</h2></div>' +
      '<div id="ciSingle"></div></section>' +
      '<section class="card"><div class="card-h"><h2>置信区间到底在说什么</h2></div>' +
      '<div class="prose fs14" style="max-width:none">' +
      '<p><b>错误说法：</b>「真值有 95% 的概率落在这个区间内。」<br>' +
      '<b>正确说法：</b>「如果重复抽样无数次，按这个公式构造的区间中，约 95% 会包含真值。」</p>' +
      '<p>区别在于：<b>真值 μ 是固定的常数，它要么在区间里，要么不在</b>，不存在概率。会变动的是区间——每次抽样得到一条不同的线。</p>' +
      '<p class="callout info mb0"><span class="ttl">撒网比喻</span>鱼（真值）一动不动地待在水里，你每次撒一张网（区间）。网有 95% 的概率罩住鱼。图上蓝色的网罩住了，红色的漏掉了——但鱼的位置从来没变过。</p>' +
      "</div></section>" +
      '<section class="card"><div class="card-h"><h2>影响区间宽度的三个因素</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>因素</th><th>方向</th><th>怎么变</th></tr></thead><tbody>' +
      '<tr><td class="tx">置信水平 ↑</td><td>区间变宽</td><td>95% → 99% 时 z 从 1.96 → 2.58</td></tr>' +
      '<tr><td class="tx">样本量 n ↑</td><td>区间变窄</td><td>SE 按 1/√n 缩小</td></tr>' +
      '<tr><td class="tx">总体 σ ↑</td><td>区间变宽</td><td>数据本身越散越难估准</td></tr>' +
      "</tbody></table></div>" +
      '<div class="note mt10">前两个因素中，只有<b>样本量</b>是研究者能主动控制的。想同时要「高置信」和「高精度」，只能加样本。</div></section>' +
      "</div>";

    const ids = ["ciMu", "ciMuR", "ciSig", "ciSigR", "ciN", "ciNM", "ciNP", "ciNC", "ciConf", "ciConfC",
      "ciReps", "ciRepsC", "ciRun", "ciChart", "ciCover", "ciNarr", "ciOut", "ciSingle"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));
    E.ciNC.innerHTML = [9, 16, 25, 49, 100, 400].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.ciRepsC.innerHTML = [20, 50, 100, 300, 1000].map(v => '<button class="chip" data-v="' + v + '">' + v + "</button>").join("");
    E.ciConfC.innerHTML = [0.80, 0.90, 0.95, 0.99].map(v => '<button class="chip" data-v="' + v + '">' + Math.round(v * 100) + "%</button>").join("");

    const rng = new ST.RNG(31415926);

    function simulate() {
      const out = [];
      const z = ST.normalInv(1 - (1 - S.conf) / 2);
      for (let i = 0; i < S.reps; i++) {
        const xs = [];
        for (let j = 0; j < S.n; j++) xs.push(rng.normal(S.mu, S.sigma));
        const m = ST.mean(xs);
        const s = ST.sd(xs);
        const se = s / Math.sqrt(S.n);
        const lo = m - z * se, hi = m + z * se;
        out.push({ m, s, se, lo, hi, cover: lo <= S.mu && S.mu <= hi });
      }
      S.intervals = out;
    }

    function draw() {
      E.ciMu.textContent = U.F.num(S.mu, 1);
      E.ciSig.textContent = U.F.num(S.sigma, 1);
      E.ciN.textContent = S.n;
      E.ciConf.textContent = Math.round(S.conf * 100) + "%";
      E.ciReps.textContent = S.reps;
      U.$$("#ciNC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.n));
      U.$$("#ciConfC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.conf));
      U.$$("#ciRepsC button").forEach(b => b.classList.toggle("active", +b.dataset.v === S.reps));

      const iv = S.intervals;
      const covered = iv.filter(x => x.cover).length;
      const rate = iv.length ? covered / iv.length : 0;

      const los = iv.map(x => x.lo), his = iv.map(x => x.hi);
      let x0 = Math.min.apply(null, los.concat([S.mu])), x1 = Math.max.apply(null, his.concat([S.mu]));
      const pad = (x1 - x0) * 0.05; x0 -= pad; x1 += pad;

      const rowH = Math.max(4, Math.min(18, 560 / Math.max(1, iv.length)));
      const H = Math.max(200, iv.length * rowH + 80);
      const p = U.makePlot({ W: 880, H: H, xr: [x0, x1], yr: [0, 1], margin: { l: 56, r: 30, t: 34, b: 44 } });

      // 重画坐标：竖轴表示「第几次抽样」
      p.raw('<rect x="' + p.M.l + '" y="' + p.M.t + '" width="' + p.PW + '" height="' + p.PH + '" fill="' + U.cvar("--card-2", "rgba(255,255,255,.02)") + '" rx="6" opacity=".5"/>');
      // 网格
      const gs = U.niceStep(x1 - x0);
      for (let v = Math.ceil(x0 / gs) * gs; v <= x1 + 1e-9; v += gs) {
        p.raw('<line x1="' + p.x(v).toFixed(1) + '" y1="' + p.M.t + '" x2="' + p.x(v).toFixed(1) + '" y2="' + (p.M.t + p.PH) + '" stroke="' + U.cvar("--line-soft", "rgba(255,255,255,.055)") + '"/>');
        p.raw('<text x="' + p.x(v).toFixed(1) + '" y="' + (p.M.t + p.PH + 20) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="11.5" font-family="monospace" text-anchor="middle">' + (+v.toFixed(4)) + "</text>");
      }
      p.raw('<line x1="' + p.M.l + '" y1="' + (p.M.t + p.PH) + '" x2="' + (p.M.l + p.PW) + '" y2="' + (p.M.t + p.PH) + '" stroke="' + U.cvar("--line-strong", "#4a5680") + '" stroke-width="1.3"/>');
      p.raw('<text x="' + (p.M.l + p.PW) + '" y="' + (p.M.t + p.PH + 40) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") + '" font-size="12" text-anchor="end">样本均值的可能取值</text>');

      // 真值线
      p.raw('<line x1="' + p.x(S.mu).toFixed(1) + '" y1="' + p.M.t + '" x2="' + p.x(S.mu).toFixed(1) + '" y2="' + (p.M.t + p.PH) + '" stroke="var(--g2)" stroke-width="2.2" stroke-dasharray="6 4"/>');
      p.ptext(p.x(S.mu), p.M.t + 16, "真值 μ = " + U.F.num(S.mu, 1), { fill: "var(--g2)", size: 12, mono: true, anchor: "middle", weight: 600 });

      // 区间线
      const gap = (p.M.t + 6) - (p.M.t);
      const step = (p.PH - 12) / Math.max(1, iv.length);
      iv.forEach((it, i) => {
        const cy = p.M.t + 8 + i * step;
        const c = it.cover ? "var(--g4)" : "var(--g3)";
        p.raw('<line x1="' + p.x(it.lo).toFixed(1) + '" y1="' + cy.toFixed(1) + '" x2="' + p.x(it.hi).toFixed(1) + '" y2="' + cy.toFixed(1) + '" stroke="' + c + '" stroke-width="' + Math.max(1.4, Math.min(4, step - 0.6)) + '" stroke-linecap="round" opacity="' + (it.cover ? .85 : 1) + '"/>');
        p.raw('<circle cx="' + p.x(it.m).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + Math.max(1.4, Math.min(3.4, step / 1.8)) + '" fill="var(--g1)"/>');
        if (S.hoverIdx === i) {
          p.raw('<line x1="' + p.M.l + '" y1="' + cy.toFixed(1) + '" x2="' + (p.M.l + p.PW) + '" y2="' + cy.toFixed(1) + '" stroke="' + U.cvar("--fg", "#fff") + '" stroke-width=".7" opacity=".4"/>');
        }
      });

      p.mount(E.ciChart);

      E.ciCover.className = "badge " + (Math.abs(rate - S.conf) < 0.05 ? "ok" : "warn");
      E.ciCover.textContent = "覆盖率 " + U.F.num(rate * 100, 1) + "%  （目标 " + Math.round(S.conf * 100) + "%）";

      E.ciNarr.innerHTML =
        "本次模拟了 <b>" + iv.length + "</b> 次抽样，其中 <b>" + covered + "</b> 次的区间盖住了真值 μ = " + U.F.num(S.mu, 1) +
        "，覆盖率 <b>" + U.F.num(rate * 100, 1) + "%</b>，与设定的置信水平 " + Math.round(S.conf * 100) + "% 相当接近。" +
        (S.reps < 100 ? " 模拟次数较少时，覆盖率波动会比较大——多跑几次就能看出它是围绕设定值波动的。" : "") +
        " 注意红色的失败案例：它们不是计算错误，而是<b>置信水平本来允许的那部分漏网</b>。" +
        " 把 n 从 " + S.n + " 加到 4 倍，你会看到所有横线一起变短——这就是样本量买到的东西。";

      // 单次计算示例（取第一条失败的和第一条成功的，或就第一条）
      const ex = iv.find(x => !x.cover) || iv[0];
      if (ex) {
        const z = ST.normalInv(1 - (1 - S.conf) / 2);
        E.ciSingle.innerHTML = U.steps([
          {
            sym: "样本均值 x̄ = " + U.F.num(ex.m, 3),
            num: "样本标准差 s = <b>" + U.F.num(ex.s, 3) + "</b>",
            plain: "这一次抽到的 " + S.n + " 个人，平均分是 " + U.F.num(ex.m, 2) + " 分。"
          },
          {
            sym: "标准误 SE = s / √n",
            num: "SE = " + U.F.num(ex.s, 2) + " / √" + S.n + " = <b>" + U.F.num(ex.se, 3) + "</b>",
            plain: "平均分这个数字本身有多不稳。"
          },
          {
            sym: "临界值 z（" + Math.round(S.conf * 100) + "% 置信）",
            num: "z<sub>α/2</sub> = <b>" + U.F.num(z, 3) + "</b>",
            plain: "查标准正态分布：要让中间覆盖 " + Math.round(S.conf * 100) + "%，两边各留 " + U.F.num((1 - S.conf) * 50, 1) + "%。"
          },
          {
            sym: "置信区间 = x̄ ± z × SE",
            num: U.F.num(ex.m, 2) + " ± " + U.F.num(z, 3) + " × " + U.F.num(ex.se, 3) + " = <b>[" + U.F.num(ex.lo, 2) + ", " + U.F.num(ex.hi, 2) + "]</b>",
            plain: "这条区间" + (ex.cover ? "<b>盖住了</b>真值 " + U.F.num(S.mu, 1) + "，属于成功的 " + Math.round(S.conf * 100) + "%。" : "<b>没有盖住</b>真值 " + U.F.num(S.mu, 1) + "，属于漏网的 " + Math.round((1 - S.conf) * 100) + "%。")
          }
        ]);
      }

      const widths = iv.map(x => x.hi - x.lo);
      const mw = ST.mean(widths);
      E.ciOut.innerHTML = U.readouts([
        { k: "模拟次数", v: iv.length, mini: "共抽 " + (iv.length * S.n) + " 个观测" },
        { k: "置信水平", v: Math.round(S.conf * 100) + "%", mini: "设定值" },
        { k: "实际覆盖率", v: U.F.num(rate * 100, 1) + "%", hi: true, cls: Math.abs(rate - S.conf) < 0.05 ? "hi ok" : "hi warn", mini: "盖住真值的比例" },
        { k: "漏网次数", v: iv.length - covered, cls: iv.length - covered > 0 ? "warn" : "ok", mini: "理论期望 " + U.F.num((1 - S.conf) * iv.length, 1) + " 次" },
        { k: "平均区间宽度", v: U.F.num(mw, 2), mini: "越窄越精确" },
        { k: "标准误", v: U.F.num(ST.mean(iv.map(x => x.se)), 3), mini: "s/√n" },
        { k: "样本量 n", v: S.n, mini: "n 增 4 倍，宽度减半" }
      ]);
    }

    // 事件
    E.ciMuR.oninput = () => { S.mu = +E.ciMuR.value; simulate(); draw(); };
    E.ciSigR.oninput = () => { S.sigma = +E.ciSigR.value; simulate(); draw(); };
    const setN = v => { S.n = Math.max(2, Math.min(2000, Math.round(v))); simulate(); draw(); };
    E.ciNM.onclick = () => setN(S.n - 1);
    E.ciNP.onclick = () => setN(S.n + 1);
    E.ciNC.onclick = e => { const b = e.target.closest("button"); if (b) setN(+b.dataset.v); };
    E.ciConfC.onclick = e => { const b = e.target.closest("button"); if (b) { S.conf = +b.dataset.v; simulate(); draw(); } };
    E.ciRepsC.onclick = e => { const b = e.target.closest("button"); if (b) { S.reps = +b.dataset.v; simulate(); draw(); } };
    E.ciRun.onclick = () => { simulate(); draw(); };

    E.ciChart.addEventListener("pointermove", ev => {
      const r = E.ciChart.getBoundingClientRect();
      const sc = Math.min(r.width / 880, r.height / Math.max(200, S.intervals.length * Math.max(4, Math.min(18, 560 / Math.max(1, S.intervals.length))) + 80));
      const oy = (r.height - (Math.max(200, S.intervals.length * Math.max(4, Math.min(18, 560 / Math.max(1, S.intervals.length))) + 80)) * sc) / 2;
      const py = (ev.clientY - r.top - oy) / sc;
      const H = Math.max(200, S.intervals.length * Math.max(4, Math.min(18, 560 / Math.max(1, S.intervals.length))) + 80);
      const step = (H - 80 - 12) / Math.max(1, S.intervals.length);
      const i = Math.floor((py - 34 - 8) / step);
      const ni = (i >= 0 && i < S.intervals.length) ? i : -1;
      if (ni !== S.hoverIdx) { S.hoverIdx = ni; draw(); }
    });
    E.ciChart.addEventListener("pointerleave", () => { S.hoverIdx = -1; draw(); });

    simulate();
    draw();
  }
});

})();
