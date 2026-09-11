/* =========================================================
   lab-set10.js — 互动模块（十）
     · cluster  聚类分析实验室
   ---------------------------------------------------------
   同一批受众数据，换距离定义、换连接方法、换 K、是否标准
   化——亲眼看到聚类结果如何变脸，以及为什么聚类没有「唯一
   正确答案」。
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

LAB.register({
  id: "cluster",
  render(root) {
    const SPEC = [
      { mu: [62, 6.2], sd: [7, 1.05], n: 22, name: "沉浸分享型" },
      { mu: [58, 1.0], sd: [7, 0.42], n: 18, name: "沉浸潜水型" },
      { mu: [17, 5.4], sd: [5, 1.05], n: 20, name: "轻量活跃型" },
      { mu: [20, 0.7], sd: [5, 0.34], n: 14, name: "轻度潜水型" }
    ];
    const VARS = [
      { key: "min", name: "日均使用时长（分钟）", unit: "分钟" },
      { key: "shr", name: "日均分享次数（次）", unit: "次" }
    ];

    const S = {
      seed: 20260913, outliers: true, std: false, method: "kmeans", k: 4, showCentroid: true
    };

    let PTS = [];

    function gen() {
      const r = new ST.RNG(S.seed);
      const pts = [];
      SPEC.forEach((sp, gi) => {
        for (let i = 0; i < sp.n; i++) {
          const x = Math.max(2, Math.min(92, sp.mu[0] + r.normal(0, 1) * sp.sd[0]));
          const y = Math.max(0, Math.min(10, sp.mu[1] + r.normal(0, 1) * sp.sd[1]));
          pts.push({ min: +x.toFixed(1), shr: +y.toFixed(2), truth: gi });
        }
      });
      if (S.outliers) {
        pts.push({ min: 89.5, shr: 9.4, truth: -1 });
        pts.push({ min: 3.2, shr: 0.15, truth: -1 });
      }
      return pts;
    }

    /* ---------- 距离与标准化 ---------- */
    function scaler() {
      const sc = {};
      VARS.forEach(v => {
        const col = PTS.map(p => p[v.key]);
        sc[v.key] = { m: ST.mean(col), s: ST.sd(col, 1) || 1 };
      });
      return sc;
    }
    function feat(p, sc) {
      return VARS.map(v => S.std ? (p[v.key] - sc[v.key].m) / sc[v.key].s : p[v.key]);
    }
    function d2(a, b) {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
      return s;
    }
    function dist(a, b) { return Math.sqrt(d2(a, b)); }

    /* ---------- K 均值 ---------- */
    function kmeans(X, k, seed) {
      const n = X.length, dim = X[0].length;
      const r = new ST.RNG(seed);
      let best = null;
      for (let restart = 0; restart < 6; restart++) {
        /* k-means++ 初始化 */
        const C = [X[Math.floor(r.uniform(0, 1) * n)].slice()];
        while (C.length < k) {
          const dd = X.map(x => Math.min.apply(null, C.map(c => d2(x, c))));
          const tot = dd.reduce((a, b) => a + b, 0) || 1;
          let u = r.uniform(0, 1) * tot, idx = 0;
          for (let i = 0; i < n; i++) { u -= dd[i]; if (u <= 0) { idx = i; break; } }
          C.push(X[idx].slice());
        }
        let lab = new Array(n).fill(0);
        for (let it = 0; it < 40; it++) {
          let moved = false;
          for (let i = 0; i < n; i++) {
            let bi = 0, bd = Infinity;
            for (let c = 0; c < k; c++) { const d = d2(X[i], C[c]); if (d < bd) { bd = d; bi = c; } }
            if (lab[i] !== bi) { lab[i] = bi; moved = true; }
          }
          const sum = Array.from({ length: k }, () => new Array(dim).fill(0));
          const cnt = new Array(k).fill(0);
          for (let i = 0; i < n; i++) { cnt[lab[i]]++; for (let d = 0; d < dim; d++) sum[lab[i]][d] += X[i][d]; }
          for (let c = 0; c < k; c++) {
            if (!cnt[c]) { C[c] = X[Math.floor(r.uniform(0, 1) * n)].slice(); continue; }
            for (let d = 0; d < dim; d++) C[c][d] = sum[c][d] / cnt[c];
          }
          if (!moved && it > 0) break;
        }
        let sse = 0;
        for (let i = 0; i < n; i++) sse += d2(X[i], C[lab[i]]);
        if (!best || sse < best.sse) best = { lab: lab.slice(), C: C.map(c => c.slice()), sse };
      }
      return best;
    }

    /* ---------- 层次聚类（Ward） ---------- */
    function ward(X) {
      let clusters = X.map((x, i) => ({ members: [i], cen: x.slice(), size: 1, h: 0, left: null, right: null }));
      const history = [];
      while (clusters.length > 1) {
        let bi = 0, bj = 1, bd = Infinity;
        for (let i = 0; i < clusters.length; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const a = clusters[i], b = clusters[j];
            const d = (a.size * b.size / (a.size + b.size)) * d2(a.cen, b.cen);
            if (d < bd) { bd = d; bi = i; bj = j; }
          }
        }
        const a = clusters[bi], b = clusters[bj];
        const size = a.size + b.size;
        const cen = a.cen.map((v, d) => (v * a.size + b.cen[d] * b.size) / size);
        const node = {
          members: a.members.concat(b.members), cen, size, h: Math.sqrt(bd),
          left: a, right: b
        };
        history.push({ h: node.h, a: a.size, b: b.size });
        clusters = clusters.filter((_, i) => i !== bi && i !== bj);
        clusters.push(node);
      }
      return { root: clusters[0], history };
    }

    function cutTree(root, k) {
      const groups = [root];
      while (groups.length < k) {
        /* 拆开合并高度最大的那个内部节点 */
        let bi = -1, bh = -1;
        groups.forEach((g, i) => {
          if (g.left && g.h > bh) { bh = g.h; bi = i; }
        });
        if (bi < 0) break;
        const g = groups[bi];
        groups.splice(bi, 1, g.left, g.right);
      }
      const lab = new Array(PTS.length).fill(0);
      groups.forEach((g, gi) => g.members.forEach(m => lab[m] = gi));
      return { lab, groups };
    }

    /* ---------- 轮廓系数 ---------- */
    function silhouette(X, lab) {
      const n = X.length;
      const ks = Array.from(new Set(lab)).sort((a, b) => a - b);
      if (ks.length < 2) return { mean: NaN, per: new Array(n).fill(0) };
      const per = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        const byK = {};
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const d = dist(X[i], X[j]);
          (byK[lab[j]] = byK[lab[j]] || []).push(d);
        }
        const own = byK[lab[i]] || [];
        const a = own.length ? ST.mean(own) : 0;
        let b = Infinity;
        ks.forEach(k => {
          if (k === lab[i]) return;
          const arr = byK[k] || [];
          if (arr.length) b = Math.min(b, ST.mean(arr));
        });
        per[i] = (b === Infinity || Math.max(a, b) === 0) ? 0 : (b - a) / Math.max(a, b);
      }
      return { mean: ST.mean(per), per };
    }

    /* ---------- 统一聚类 ---------- */
    function run() {
      const sc = scaler();
      const X = PTS.map(p => feat(p, sc));
      const k = Math.max(2, Math.min(S.k, 6));
      let lab, cents = null, sse = 0, wardRes = null;
      if (S.method === "kmeans") {
        const r = kmeans(X, k, S.seed + 7);
        lab = r.lab; cents = r.C; sse = r.sse;
      } else {
        wardRes = ward(X);
        const c = cutTree(wardRes.root, k);
        lab = c.lab;
        sse = 0;
        c.groups.forEach(g => g.members.forEach(m => { sse += d2(X[m], g.cen); }));
      }
      const sil = silhouette(X, lab);

      /* 肘部法曲线 */
      const sseCurve = [];
      for (let kk = 1; kk <= 6; kk++) {
        if (S.method === "kmeans") sseCurve.push(kmeans(X, kk, S.seed + 7).sse);
        else {
          const w = ward(X);
          const c = cutTree(w.root, kk);
          let s = 0;
          c.groups.forEach(g => g.members.forEach(m => { s += d2(X[m], g.cen); }));
          sseCurve.push(s);
        }
      }
      const silCurve = [];
      for (let kk = 2; kk <= 6; kk++) {
        let l;
        if (S.method === "kmeans") l = kmeans(X, kk, S.seed + 7).lab;
        else l = cutTree(ward(X).root, kk).lab;
        silCurve.push({ k: kk, v: silhouette(X, l).mean });
      }

      /* 类画像（在原始量纲上） */
      const groups = [];
      const kk = Array.from(new Set(lab)).sort((a, b) => a - b);
      kk.forEach((id, gi) => {
        const mem = PTS.filter((_, i) => lab[i] === id);
        groups.push({
          id, label: "第 " + (gi + 1) + " 类", n: mem.length,
          min: ST.mean(mem.map(p => p.min)),
          shr: ST.mean(mem.map(p => p.shr)),
          members: mem
        });
      });
      return { X, sc, lab, cents, sse, sil, sseCurve, silCurve, groups, k, wardRes };
    }

    /* ---------- 骨架 ---------- */
    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">数据与设定</div>' +

      U.ctrl({
        label: "变量标准化（z 分数）",
        body: U.sw("clStd", "把两个变量放到同一尺度上", false) +
          U.sw("clOut", "包含 2 个离群个体", true),
        note: "日均使用时长跨度约 <b>90 分钟</b>，日均分享次数跨度不到 <b>10 次</b>。不标准化时，欧氏距离会被时长完全主导——人眼看得见的结构，算法反而看不见。"
      }) +

      U.ctrl({
        label: "聚类方法",
        valHtml: '<span id="clMv"></span>',
        body: '<div class="chips" id="clMc">' +
          '<button class="chip active" data-v="kmeans">K 均值快速聚类</button>' +
          '<button class="chip" data-v="ward">层次聚类（Ward 法）</button></div>',
        note: "K 均值要事先给定 K、结果受初始中心影响；层次聚类不用给定 K，但合并之后无法撤销。"
      }) +

      U.ctrl({
        label: "聚类数 K",
        valHtml: '<span id="clKv">4</span>',
        body: '<input type="range" id="clKr" min="2" max="6" step="1" value="4">' +
          '<div class="chips mt6" id="clKc"></div>',
        note: "K 均值里 K 是「分几组」；层次聚类里 K 相当于「树状图从哪个高度横向截断」。"
      }) +

      '<div class="ctrl">' +
      U.sw("clCent", "显示各类的中心点", true) +
      "</div>" +

      '<div class="ctrl"><button class="btn block ghost" id="clRegen">换一批模拟数据</button></div>' +

      '<div class="dashed"></div>' +
      '<div class="note"><b>建议的探索顺序</b><br>' +
      "① 先<b>不标准化</b>、K = 2，看结果几乎只是按时长切成两半；<br>" +
      "② 打开<b>标准化</b>，看四类结构如何浮现；<br>" +
      "③ 把 K 从 2 调到 6，对照肘部法与轮廓系数；<br>" +
      "④ 切换到层次聚类，看树状图与 K 均值是否一致。</div>" +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card">' +
      '<div class="card-h"><h2 id="clTitle">聚类结果</h2><span class="spacer"></span>' +
      '<span class="badge" id="clBadge"></span></div>' +
      '<div class="stage"><svg id="clScatter"></svg></div>' +
      '<div class="legend" id="clLegend"></div>' +
      U.hints([
        "<b>横轴</b>日均使用时长（分钟）",
        "<b>纵轴</b>日均分享次数（次）",
        "<b>细十字</b>各类中心（质心）"
      ]) +
      "</div>" +
      '<div class="readouts" id="clOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>肘部法：类内离差平方和随 K 的变化</h2></div>' +
      '<div class="stage"><svg id="clElbow"></svg></div>' +
      '<div class="note mt10">曲线由陡变缓的那个拐点就是常用的 K。这里 K = ' +
      '<b id="clElbowTxt">—</b>。注意：拐点往往不明显，所以还需要轮廓系数与可解释性一起判断。</div></section>' +

      '<section class="card"><div class="card-h"><h2>轮廓系数：每个点贴合本类的程度</h2></div>' +
      '<div class="stage"><svg id="clSil"></svg></div>' +
      '<div class="note mt10">取值 −1 到 1，越接近 1 越好。最优 K = <b id="clSilTxt">—</b>。' +
      '轮廓系数基于距离定义，换一种距离算法，结论也可能变。</div></section>' +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>各类的均值画像（据此给类命名）</h2></div>' +
      '<div id="clTable"></div>' +
      '<div class="note mt10">聚类算法只会给出编号，类名必须由研究者根据这份画像赋予。没有画像支撑的类名，等于编故事。</div></section>' +

      '<section class="card"><div class="card-h"><h2>树状图：合并的全过程</h2>' +
      '<span class="spacer"></span><span class="faint fs12">纵轴 = 合并时的距离</span></div>' +
      '<div class="stage" id="clDenWrap"><svg id="clDen"></svg></div>' +
      '<div class="note mt10">自下而上阅读：每一步把距离最近的两类合并。在某个高度横向截断，截断线上方的分支数就是类数。</div></section>' +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>距离定义决定聚类结果</h2></div>' +
      '<div class="prose fs14">' +
      "<p>同一批数据，用欧氏距离与用夹角余弦，可能得到完全不同的分群；换最短距离法与 Ward 法同样如此。所以聚类分析<b>没有唯一正确答案</b>，只有「在当前方法设定下的一个合理分群」。</p>" +
      "<p>规范的论文必须把四件事写清楚：<b>①用了哪些变量；②是否标准化、怎么标准化；③用什么距离；④用什么连接方法（或 K 均值）与如何确定 K。</b>缺了任何一项，读者都无法复现你的分群。</p>" +
      "<p class=\"mut\">看别人的聚类结果时，也先问这四句。</p>" +
      "</div></section>" +

      '<section class="card"><div class="card-h"><h2>聚类分析的五条注意事项</h2></div>' +
      '<div class="prose fs14"><ol>' +
      "<li><b>量纲问题</b>：欧氏距离对量纲敏感，变量必须标准化，除非有意按重要性加权。</li>" +
      "<li><b>没有显著性检验</b>：不能说「各类之间存在显著差异」，只能用外部变量做事后比较来佐证分类有效性。</li>" +
      "<li><b>离群点自成一类</b>：它们往往把类中心拉偏，需要单独判断是剔除、单独成类，还是保留并解释。</li>" +
      "<li><b>K 的选择带主观性</b>：肘部法与轮廓系数只是参考，最终要结合「几类讲得通」。</li>" +
      "<li><b>结果不是真理</b>：聚类无监督、无标签，本质是一种结构化的描述工具，不是发现世界固有结构的手段。</li>" +
      "</ol></div></section>" +
      "</div>";

    const IDS = ["clStd", "clOut", "clMv", "clMc", "clKv", "clKr", "clKc", "clCent", "clRegen",
      "clTitle", "clBadge", "clScatter", "clLegend", "clOut", "clElbow", "clElbowTxt",
      "clSil", "clSilTxt", "clTable", "clDen", "clDenWrap"];
    const E = {};
    IDS.forEach(i => E[i] = document.getElementById(i));

    const PAL = ["--g1", "--g2", "--g5", "--g4", "--g3", "--g6"];
    const col = i => U.cvar(PAL[i % 6], "#4cc9f0");

    /* ---------- 散点图 ---------- */
    function drawScatter(R) {
      const xs = PTS.map(p => p.min), ys = PTS.map(p => p.shr);
      const p = U.makePlot({
        W: 880, H: 460,
        xr: [Math.min.apply(null, xs) - 4, Math.max.apply(null, xs) + 4],
        yr: [Math.min.apply(null, ys) - 0.5, Math.max.apply(null, ys) + 0.6]
      });
      p.bg(); p.axes({ xLabel: "日均使用时长（分钟）", yLabel: "日均分享次数（次）" });

      PTS.forEach((pt, i) => {
        p.dot(pt.min, pt.shr, {
          r: 5, stroke: col(R.lab[i]), width: 1.8, fill: col(R.lab[i])
        });
      });

      if (S.showCentroid) {
        const seen = {};
        R.groups.forEach((g, gi) => {
          p.raw('<line x1="' + (p.x(g.min) - 7).toFixed(1) + '" y1="' + p.y(g.shr).toFixed(1) +
            '" x2="' + (p.x(g.min) + 7).toFixed(1) + '" y2="' + p.y(g.shr).toFixed(1) +
            '" stroke="' + col(gi) + '" stroke-width="2"/>');
          p.raw('<line x1="' + p.x(g.min).toFixed(1) + '" y1="' + (p.y(g.shr) - 7).toFixed(1) +
            '" x2="' + p.x(g.min).toFixed(1) + '" y2="' + (p.y(g.shr) + 7).toFixed(1) +
            '" stroke="' + col(gi) + '" stroke-width="2"/>');
          p.text(g.min + 1.5, g.shr + 0.75, "C" + (gi + 1), { mono: true, size: 12, fill: col(gi), weight: 600 });
          seen[gi] = true;
        });
      }
      p.mount(E.clScatter);

      E.clLegend.innerHTML = R.groups.map((g, gi) =>
        '<span class="it"><i class="dot" style="background:' + col(gi) + '"></i>' +
        "第 " + (gi + 1) + " 类 · " + g.n + " 人（" + (g.n / PTS.length * 100).toFixed(0) + "%）</span>").join("");
    }

    /* ---------- 肘部法 ---------- */
    function drawElbow(R) {
      const p = U.makePlot({ W: 440, H: 260, xr: [0.6, 6.4], margin: { l: 52, r: 18, t: 18, b: 40 } });
      p.autoY(v => {
        const k = Math.round(v);
        return R.sseCurve[Math.max(0, Math.min(5, k - 1))];
      }, 1, 6);
      p.bg(); p.grid(0, 0);
      p.axes({ xLabel: "K", yLabel: "类内离差平方和", stepX: 1 });
      const mx = R.sseCurve[0] || 1;
      R.sseCurve.forEach((s, i) => {
        const k = i + 1;
        p.dot(k, s, { r: 4.2, stroke: col(0), width: 2, fill: k === S.k ? col(2) : U.cvar("--card", "#121a2c") });
        if (k === S.k) p.ptext(p.x(k), p.y(s) - 12, "K = " + k, { anchor: "middle", size: 11.5, mono: true, fill: col(2) });
      });
      p.line(v => {
        const k = Math.max(1, Math.min(6, Math.round(v)));
        const a = R.sseCurve[k - 1];
        if (k >= 6) return a;
        const b = R.sseCurve[k];
        return a + (b - a) * (v - k);
      }, { stroke: col(0), width: 2.2 });
      p.mount(E.clElbow);

      /* 拐点：最大降幅比 */
      let bestK = 2, bestDrop = -1;
      for (let k = 2; k < R.sseCurve.length; k++) {
        const d = R.sseCurve[k - 2] - R.sseCurve[k - 1];
        if (d > bestDrop) { bestDrop = d; bestK = k; }
      }
      E.clElbowTxt.textContent = bestK;
    }

    /* ---------- 轮廓系数 ---------- */
    function drawSil(R) {
      const p = U.makePlot({ W: 440, H: 260, xr: [1.4, 6.6], yr: [-0.05, 1], margin: { l: 52, r: 18, t: 18, b: 40 } });
      p.bg(); p.grid(0, 0.25);
      p.axes({ xLabel: "K", yLabel: "平均轮廓系数", stepX: 1, stepY: 0.25 });
      p.hline(0, { stroke: U.cvar("--line-strong", "#4a5680"), width: 1 });
      let bestK = NaN, bestV = -Infinity;
      R.silCurve.forEach(o => {
        if (o.v > bestV) { bestV = o.v; bestK = o.k; }
      });
      R.silCurve.forEach(o => {
        p.dot(o.k, o.v, { r: 4.2, stroke: col(0), width: 2, fill: o.k === S.k ? col(2) : U.cvar("--card", "#121a2c") });
        p.ptext(p.x(o.k), p.y(o.v) - 12, o.v.toFixed(2), { anchor: "middle", size: 11, mono: true, fill: U.cvar("--fg-mut", "#8d99b6") });
      });
      p.line(v => {
        const k = Math.max(2, Math.min(6, Math.round(v)));
        const o = R.silCurve[k - 2];
        if (k >= 6) return o.v;
        const o2 = R.silCurve[k - 1];
        return o.v + (o2.v - o.v) * (v - k);
      }, { stroke: col(0), width: 2.2 });
      p.mount(E.clSil);
      E.clSilTxt.textContent = isFinite(bestK) ? bestK + "（轮廓系数 " + bestV.toFixed(3) + "）" : "—";
    }

    /* ---------- 树状图 ---------- */
    function drawDendro(R) {
      if (!R.wardRes) {
        E.clDenWrap.innerHTML = '<div class="mut fs13 tc" style="padding:38px 0">树状图只在「层次聚类」模式下显示。' +
          "切到层次聚类，就能看到合并的全过程。</div>";
        return;
      }
      if (!E.clDenWrap.querySelector("svg")) {
        E.clDenWrap.innerHTML = '<svg id="clDen"></svg>';
        E.clDen = document.getElementById("clDen");
      }
      const root = R.wardRes.root;
      const leaves = [];
      (function walk(node) {
        if (!node.left) { leaves.push(node); return; }
        walk(node.left); walk(node.right);
      })(root);
      const pos = new Map();
      leaves.forEach((lf, i) => pos.set(lf, i));
      (function setPos(node) {
        if (!node.left) return;
        setPos(node.left); setPos(node.right);
        node.x = (node.left.x + node.right.x) / 2;
      })(root);
      leaves.forEach((lf, i) => { lf.x = i; });

      const W = 440, H = 260, M = { l: 46, r: 14, t: 16, b: 30 };
      const PW = W - M.l - M.r, PH = H - M.t - M.b;
      const n = leaves.length;
      const maxH = root.h || 1;
      const X = i => M.l + (i + 0.5) / n * PW;
      const Y = h => M.t + PH - (h / maxH) * PH;

      let out = '<rect x="' + M.l + '" y="' + M.t + '" width="' + PW + '" height="' + PH +
        '" fill="' + U.cvar("--card-2", "rgba(255,255,255,.02)") + '" rx="5" opacity=".5"/>';
      (function draw(node) {
        if (!node.left) return;
        draw(node.left); draw(node.right);
        const yl = Y(node.left.h), yr2 = Y(node.right.h), yp = Y(node.h);
        out += '<path d="M ' + X(node.left.x).toFixed(1) + " " + yl.toFixed(1) +
          " L " + X(node.left.x).toFixed(1) + " " + yp.toFixed(1) +
          " L " + X(node.right.x).toFixed(1) + " " + yp.toFixed(1) +
          " L " + X(node.right.x).toFixed(1) + " " + yr2.toFixed(1) + '" fill="none" stroke="' +
          U.cvar("--line-strong", "#4a5680") + '" stroke-width="1"/>';
      })(root);

      /* 当前截断高度（第 K 类的分界） */
      const cutH = (function () {
        const heights = [];
        (function walk(node) {
          if (node.left) { heights.push(node.h); walk(node.left); walk(node.right); }
        })(root);
        heights.sort((a, b) => b - a);
        return heights[Math.min(S.k - 2, heights.length - 1)] || 0;
      })();
      out += '<line x1="' + M.l + '" y1="' + Y(cutH).toFixed(1) + '" x2="' + (M.l + PW) +
        '" y2="' + Y(cutH).toFixed(1) + '" stroke="' + col(2) + '" stroke-width="1.6" stroke-dasharray="5 4"/>';
      out += '<text x="' + (M.l + PW - 4) + '" y="' + (Y(cutH) - 5).toFixed(1) + '" fill="' + col(2) +
        '" font-size="11" font-family="monospace" text-anchor="end">截断高度 → ' + S.k + " 类</text>";
      out += '<text x="' + (M.l - 8) + '" y="' + (M.t + 11) + '" fill="' + U.cvar("--fg-faint", "#5f6a86") +
        '" font-size="10.5" font-family="monospace" text-anchor="end">' + maxH.toFixed(1) + "</text>";
      out += '<text x="' + (M.l - 8) + '" y="' + (M.t + PH) + '" fill="' + U.cvar("--fg-faint", "#5f6a86") +
        '" font-size="10.5" font-family="monospace" text-anchor="end">0</text>';
      out += '<text x="' + (M.l + PW / 2) + '" y="' + (H - 6) + '" fill="' + U.cvar("--fg-mut", "#8d99b6") +
        '" font-size="11" text-anchor="middle">' + n + " 个个体（按合并顺序排列）</text>";

      E.clDen.setAttribute("viewBox", "0 0 " + W + " " + H);
      E.clDen.setAttribute("preserveAspectRatio", "xMidYMid meet");
      E.clDen.innerHTML = out;
    }

    /* ---------- 画像表 ---------- */
    function drawTable(R) {
      const gm = ST.mean(PTS.map(p => p.min)), gs = ST.mean(PTS.map(p => p.shr));
      const name = g => {
        const hiM = g.min >= gm, hiS = g.shr >= gs;
        if (hiM && hiS) return "时长高 · 分享高";
        if (hiM && !hiS) return "时长高 · 分享低";
        if (!hiM && hiS) return "时长低 · 分享高";
        return "时长低 · 分享低";
      };
      const rows = R.groups.map((g, gi) => [
        { v: '<span style="color:' + col(gi) + '">●</span> 第 ' + (gi + 1) + " 类", cls: "tx" },
        { v: g.n + "（" + (g.n / PTS.length * 100).toFixed(1) + "%）" },
        { v: g.min.toFixed(1) + " 分钟" },
        { v: g.shr.toFixed(2) + " 次" },
        { v: name(g), cls: "tx" }
      ]);
      E.clTable.innerHTML = U.table(["类别", "人数", "时长均值", "分享均值", "画像速览"], rows, { mini: false }) +
        '<div class="note mt6">把每一类的均值画成画像，再据此命名——例如「时长高 + 分享高」可以叫<b>沉浸分享型</b>。' +
        "类名不是算法给的，是研究者根据画像赋予的；没有画像支撑的类名，等于编故事。</div>";
    }

    /* ---------- 读数 ---------- */
    function drawOut(R) {
      const ks = R.groups.length;
      E.clOut.innerHTML = U.readouts([
        { k: "个体数", v: PTS.length, mini: S.outliers ? "含 2 个离群个体" : "不含离群个体" },
        { k: "聚类数 K", v: ks, hi: true, mini: S.method === "kmeans" ? "K 均值" : "Ward 层次聚类" },
        { k: "类内离差平方和", v: R.sse.toFixed(1), mini: "越小越紧凑" },
        { k: "平均轮廓系数", v: isFinite(R.sil.mean) ? R.sil.mean.toFixed(3) : "—", cls: R.sil.mean > 0.5 ? "ok" : R.sil.mean > 0.25 ? "warn" : "danger", mini: R.sil.mean > 0.5 ? "结构清晰" : R.sil.mean > 0.25 ? "结构一般" : "结构较弱" },
        { k: "是否标准化", v: S.std ? "是" : "否", cls: S.std ? "ok" : "danger", mini: S.std ? "两变量权重相当" : "时长主导距离" },
        { k: "最小类占比", v: (Math.min.apply(null, R.groups.map(g => g.n)) / PTS.length * 100).toFixed(0) + "%", mini: "过小的类需谨慎解读" }
      ]);
    }

    /* ---------- 刷新 ---------- */
    function update() {
      const R = run();
      E.clStd.checked = S.std;
      E.clOut.checked = S.outliers;
      E.clCent.checked = S.showCentroid;
      E.clKr.value = S.k;
      E.clKv.textContent = S.k;
      E.clMv.textContent = S.method === "kmeans" ? "K 均值" : "Ward 法";
      U.$$("#clMc .chip").forEach(b => b.classList.toggle("active", b.dataset.v === S.method));
      U.$$("#clKc .chip").forEach(b => b.classList.toggle("active", +b.dataset.v === S.k));

      E.clTitle.textContent = S.method === "kmeans" ? "K 均值聚类结果" : "Ward 层次聚类结果";
      E.clBadge.className = "badge " + (S.std ? "ok" : "danger");
      E.clBadge.textContent = S.std ? "已标准化" : "未标准化：时长主导距离";

      drawScatter(R);
      drawElbow(R);
      drawSil(R);
      drawDendro(R);
      drawTable(R);
      drawOut(R);
    }

    /* ---------- 事件 ---------- */
    E.clKc.innerHTML = [2, 3, 4, 5, 6].map(v =>
      '<button class="chip' + (v === S.k ? " active" : "") + '" data-v="' + v + '">' + v + "</button>").join("");

    E.clMc.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.method = b.dataset.v; update();
    });
    E.clKc.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.k = +b.dataset.v; update();
    });
    E.clKr.addEventListener("input", e => { S.k = +e.target.value; update(); });
    E.clStd.onchange = () => { S.std = E.clStd.checked; update(); };
    E.clOut.onchange = () => { S.outliers = E.clOut.checked; PTS = gen(); update(); };
    E.clCent.onchange = () => { S.showCentroid = E.clCent.checked; update(); };
    E.clRegen.onclick = () => {
      S.seed = S.seed + 977;
      PTS = gen();
      update();
      if (window.SITE_UI) window.SITE_UI.toast("已重新生成模拟数据");
    };

    PTS = gen();
    update();
  }
});

})();
