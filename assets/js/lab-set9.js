/* =========================================================
   lab-set9.js — 互动模块（九）
     · graph-dist  用图形呈现分布
   ---------------------------------------------------------
   按数据类型（分类 / 顺序 / 数值型）选择整理方式与图形，
   亲手切换条形图、饼图、直方图、茎叶图、箱线图、线图，
   并亲眼看到「组数」与「纵轴截断」如何改变一张图的样子。
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

LAB.register({
  id: "graph-dist",
  render(root) {
    /* ---------- 数据 ---------- */
    const ATT = [62, 71, 58, 66, 55, 73, 60, 64, 69, 57, 63, 68, 59, 70, 61, 65];

    function lognormal(n) {
      const r = new ST.RNG(20260912);
      const out = [];
      for (let i = 0; i < n; i++) out.push(Math.round(Math.exp(r.normal(3.05, 1.0))));
      return out.sort((a, b) => a - b);
    }

    const DATA = {
      cat: {
        type: "cat",
        name: "分类数据 · 主要使用平台",
        sub: "330 名用户的「主要使用的短视频平台」，定类变量",
        labels: ["抖音", "快手", "视频号", "微博", "B站", "其他"],
        counts: [128, 76, 54, 38, 24, 10]
      },
      ord: {
        type: "ord",
        name: "顺序数据 · 内容满意度",
        sub: "276 名用户对推送内容的满意度，定序变量（顺序不可打乱）",
        labels: ["很不满意", "不满意", "一般", "满意", "很满意"],
        counts: [18, 42, 96, 84, 36]
      },
      numS: {
        type: "num",
        name: "数值型数据 · 注意力自评",
        sub: "16 名学生的注意力自评分数（0–100），定比变量",
        values: ATT
      },
      numL: {
        type: "num",
        name: "数值型数据 · 单日网络接触时长",
        sub: "120 名用户单日网络内容接触时长（分钟），分布严重右偏",
        values: lognormal(120)
      }
    };

    const CHART_BY_TYPE = {
      cat: [
        { v: "bar", t: "条形图" },
        { v: "pie", t: "饼图" },
        { v: "barh", t: "横向条形图" }
      ],
      ord: [
        { v: "bar", t: "条形图（保持顺序）" },
        { v: "cum", t: "累积条形图" },
        { v: "pie", t: "饼图" }
      ],
      num: [
        { v: "hist", t: "直方图" },
        { v: "stem", t: "茎叶图" },
        { v: "box", t: "箱线图" },
        { v: "line", t: "线图" }
      ]
    };

    const S = {
      ds: "cat", chart: "bar", bins: 0, fromZero: true, marks: true, cut: 0.9
    };

    root.innerHTML =
      '<div class="split">' +

      /* ---------- 左：控制 ---------- */
      '<section class="card panel">' +
      '<div class="sect-title">第一步：先看这是什么数据</div>' +
      '<div class="chips" id="gdType">' +
      '<button class="chip active" data-v="cat">分类数据</button>' +
      '<button class="chip" data-v="ord">顺序数据</button>' +
      '<button class="chip" data-v="num">数值型数据</button></div>' +

      '<div class="dashed"></div>' +
      '<div class="sect-title">数据集</div>' +
      '<div class="chips" id="gdDs" style="flex-direction:column;align-items:stretch;gap:6px"></div>' +
      '<div class="note" id="gdDesc"></div>' +

      '<div class="dashed"></div>' +
      '<div class="sect-title">第二步：再选图形</div>' +
      '<div class="chips" id="gdChart" style="flex-direction:column;align-items:stretch;gap:6px"></div>' +

      U.ctrl({
        label: "直方图分组数", valHtml: '<span id="gdBins"></span>',
        body: '<input type="range" id="gdBinsR" min="3" max="24" step="1" value="8">',
        note: "组数变了，同一批数据看上去可能完全不同——这是直方图的主观性所在。"
      }) +

      '<div class="ctrl">' +
      U.sw("gdZero", "纵轴从 0 开始（取消勾选试试）", true) +
      U.sw("gdMarks", "标出均值 / 中位数 / 四分位", true) +
      "</div>" +

      '<div class="ctrl"><button class="btn block ghost" id="gdReset">重置</button></div>' +
      "</section>" +

      /* ---------- 右：图 ---------- */
      '<section class="viz stack">' +
      '<div class="card">' +
      '<div class="card-h"><h2 id="gdTitle">图</h2><span class="spacer"></span>' +
      '<span class="badge" id="gdBadge"></span></div>' +
      '<div class="stage"><svg id="gdChartSvg"></svg></div>' +
      '<div id="gdStemWrap" class="mt10"></div>' +
      '<div class="legend" id="gdLegend"></div>' +
      U.hints([
        "<b>分类</b>数据的长条之间有缝",
        "<b>数值型</b>数据的长条紧挨着",
        "<b>切换组数</b>看分布形状如何变脸"
      ]) +
      "</div>" +
      '<div class="readouts" id="gdOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>分组频数分布表</h2>' +
      '<span class="spacer"></span><span class="faint fs12" id="gdTblNote"></span></div>' +
      '<div id="gdTable"></div></section>' +

      '<section class="card"><div class="card-h"><h2>什么数据配什么图</h2></div>' +
      '<div id="gdGuide"></div>' +
      '<div class="note mt10">定类变量算不了均值，定序变量能排序但不能运算，只有定距 / 定比变量才适合直方图、箱线图与线图。选错图形是描述统计中最常见的失分点。</div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g2 mt18">' +
      '<section class="card"><div class="card-h"><h2>图表是怎么把人带偏的</h2></div>' +
      '<div class="prose fs14">' +
      "<p>试试把上面的「纵轴从 0 开始」取消勾选，再切到<b>分类数据</b>的条形图。你会看到同一批数字，柱子高度的差距被放大到夸张的地步。</p>" +
      "<ul>" +
      "<li><b>截断纵轴</b>：从 95 开始画，2% 的差距看起来像三倍。</li>" +
      "<li><b>面积错觉</b>：把一倍的数值画成两倍的宽高，观感上放大到四倍。</li>" +
      "<li><b>双纵轴</b>：把两个量纲不同的变量画在同一张图上，能造出任意想要的「相关」。</li>" +
      "<li><b>选择性时间段</b>：换一个起止点，趋势可以上升也可以下降。</li>" +
      "<li><b>三维饼图</b>：远处扇形透视变形，比例失真。</li>" +
      "</ul>" +
      "<p class=\"mut\">读任何一张图，第一件事是看纵轴的起点与刻度；画任何一张图，第一件事是问自己有没有为了「好看」而截断。</p>" +
      "</div></section>" +

      '<section class="card"><div class="card-h"><h2>制表与制图的规范</h2></div>' +
      '<div class="prose fs14">' +
      "<p><b>表格</b>：学术论文用三线表（顶线、表头线、底线），表题在表上方；数字按小数点对齐、有效位数统一；表中出现的每个符号与缩写都在表注里说明。</p>" +
      "<p><b>图形</b>：图题在图下方；坐标轴必须有名称与单位；一图一义；同一含义在同一篇文档里用同一种颜色；慎用三维与装饰性渐变；颜色要考虑色弱读者与黑白打印。</p>" +
      "<p><b>一起给</b>：均值配标准差配中位数。只报一个数，读者无法判断分布的形状与风险。</p>" +
      "</div></section>" +
      "</div>";

    const IDS = ["gdType", "gdDs", "gdDesc", "gdChart", "gdBins", "gdBinsR", "gdZero", "gdMarks",
      "gdReset", "gdTitle", "gdBadge", "gdChartSvg", "gdStemWrap", "gdLegend", "gdOut",
      "gdTable", "gdTblNote", "gdGuide"];
    const E = {};
    IDS.forEach(i => E[i] = document.getElementById(i));

    const G = code => U.cvar("--g" + code, "#4cc9f0");
    const PALETTE = ["--g1", "--g2", "--g5", "--g4", "--g3", "--g6"];

    /* ---------- 工具 ---------- */
    function cur() { return DATA[S.ds]; }

    function stemLeaf(values) {
      const map = {};
      values.forEach(v => {
        const st = Math.floor(v / 10);
        const lf = Math.abs(v % 10);
        (map[st] = map[st] || []).push(lf);
      });
      const stems = Object.keys(map).map(Number).sort((a, b) => a - b);
      return stems.map(st => ({ stem: st, leaves: map[st].sort((a, b) => a - b) }));
    }

    /* ---------- 绘图：分类 / 顺序条形图 ---------- */
    function drawBars(d, horizontal) {
      const k = d.labels.length;
      const total = d.counts.reduce((a, b) => a + b, 0);
      const cut = S.fromZero ? 0 : Math.max(0, Math.min.apply(null, d.counts) * S.cut);
      const top = Math.max.apply(null, d.counts) * 1.14;

      if (horizontal) {
        const p = U.makePlot({ W: 880, H: 420, xr: [cut, top] });
        p.setY(0, k);
        p.bg(); p.axes({ xLabel: "频数", yLabel: "" });
        d.counts.forEach((c, i) => {
          const y0 = k - i - 0.72, y1 = k - i - 0.28;
          p.raw('<rect x="' + p.x(cut).toFixed(1) + '" y="' + p.y(y1).toFixed(1) + '" width="' +
            Math.max(0, p.x(c) - p.x(cut)).toFixed(1) + '" height="' + Math.max(1, p.y(y0) - p.y(y1)).toFixed(1) +
            '" fill="' + G(String(i % 6 + 1)) + '" opacity=".55" rx="3"/>');
          p.ptext(p.M.l - 8, p.y((y0 + y1) / 2) + 4, d.labels[i], { anchor: "end", size: 12.5, fill: U.cvar("--fg-dim", "#c6cee2") });
          p.ptext(p.x(c) + 6, p.y((y0 + y1) / 2) + 4, c + "（" + (c / total * 100).toFixed(1) + "%）", { size: 11.5, mono: true });
        });
        p.mount(E.gdChartSvg);
      } else {
        const p = U.makePlot({ W: 880, H: 420, xr: [0, k] });
        p.setY(cut, top);
        p.bg(); p.axes({ xLabel: "", yLabel: "频数" });
        d.counts.forEach((c, i) => {
          const w = 0.62;
          p.bar(i + 0.5 - w / 2, i + 0.5 + w / 2, c, {
            base: cut, fill: G(String(i % 6 + 1)) + "", stroke: G(String(i % 6 + 1)),
            rx: 4
          });
          p.ptext(p.x(i + 0.5), p.y(c) - 7, String(c), { anchor: "middle", size: 12, mono: true, fill: U.cvar("--fg-dim", "#c6cee2") });
          p.ptext(p.x(i + 0.5), p.M.t + p.PH + 38, d.labels[i], { anchor: "middle", size: 12 });
        });
        p.mount(E.gdChartSvg);
      }
    }

    /* ---------- 绘图：饼图 ---------- */
    function drawPie(d) {
      const total = d.counts.reduce((a, b) => a + b, 0);
      const W = 880, H = 420, cx = W / 2, cy = H / 2, R = 148;
      let ang = -Math.PI / 2, out = "";
      d.counts.forEach((c, i) => {
        const a = c / total * Math.PI * 2;
        const x0 = cx + R * Math.cos(ang), y0 = cy + R * Math.sin(ang);
        const x1 = cx + R * Math.cos(ang + a), y1 = cy + R * Math.sin(ang + a);
        const large = a > Math.PI ? 1 : 0;
        out += '<path d="M ' + cx + " " + cy + " L " + x0.toFixed(1) + " " + y0.toFixed(1) +
          " A " + R + " " + R + " 0 " + large + " 1 " + x1.toFixed(1) + " " + y1.toFixed(1) + ' Z" fill="' +
          G(String(i % 6 + 1)) + '" opacity=".6" stroke="' + U.cvar("--card", "#121a2c") + '" stroke-width="2"/>';
        const mid = ang + a / 2;
        const lx = cx + (R + 34) * Math.cos(mid), ly = cy + (R + 34) * Math.sin(mid);
        out += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" fill="' + U.cvar("--fg-dim", "#c6cee2") +
          '" font-size="12.5" text-anchor="' + (Math.cos(mid) < 0 ? "end" : "start") + '">' +
          U.esc(d.labels[i] + " " + (c / total * 100).toFixed(1) + "%") + "</text>";
        ang += a;
      });
      E.gdChartSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
      E.gdChartSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      E.gdChartSvg.innerHTML = out;
    }

    /* ---------- 绘图：累积条形图 ---------- */
    function drawCum(d) {
      const total = d.counts.reduce((a, b) => a + b, 0);
      const k = d.labels.length;
      const cum = [];
      let acc = 0;
      d.counts.forEach(c => { acc += c; cum.push(acc / total); });
      const p = U.makePlot({ W: 880, H: 420, xr: [0, k] });
      p.setY(0, 1.16);
      p.bg(); p.axes({ xLabel: "", yLabel: "累积百分比", stepY: 0.25 });
      cum.forEach((v, i) => {
        const w = 0.6;
        p.bar(i + 0.5 - w / 2, i + 0.5 + w / 2, v, { base: 0, fill: G(String(i % 6 + 1)), stroke: G(String(i % 6 + 1)), rx: 4, width: 1 });
        p.ptext(p.x(i + 0.5), p.y(v) - 7, (v * 100).toFixed(1) + "%", { anchor: "middle", size: 12, mono: true, fill: U.cvar("--fg-dim", "#c6cee2") });
        p.ptext(p.x(i + 0.5), p.M.t + p.PH + 38, d.labels[i], { anchor: "middle", size: 12 });
      });
      p.hline(0.5, { stroke: G("2"), dash: "5 5", width: 1.2 });
      p.ptext(p.M.l + 6, p.y(0.5) - 6, "50% 分界", { size: 11, mono: true, fill: G("2") });
      p.line(v => {
        /* 折线连接各累积点（分段线性） */
        const i = Math.max(0, Math.min(k - 1, Math.round(v - 0.5)));
        return cum[i];
      }, { stroke: G("3"), width: 2.2, opacity: 0.85 });
      p.mount(E.gdChartSvg);
    }

    /* ---------- 绘图：直方图 ---------- */
    function drawHist(values) {
      const auto = Math.max(3, Math.ceil(Math.sqrt(values.length)));
      const k = S.bins || auto;
      const h = ST.histogram(values, k);
      const cut = S.fromZero ? 0 : Math.max(1, Math.min.apply(null, h.counts.filter(c => c > 0)) - 1);
      const top = Math.max.apply(null, h.counts) * 1.16;
      const p = U.makePlot({ W: 880, H: 420, xr: [h.edges[0], h.edges[h.edges.length - 1]] });
      p.setY(cut, top);
      p.bg(); p.axes({ xLabel: "取值", yLabel: "频数" });
      h.counts.forEach((c, i) => {
        p.bar(h.edges[i], h.edges[i + 1], c, { base: cut, gap: 0.6, fill: "rgba(76,201,240,.42)", stroke: "rgba(76,201,240,.85)" });
      });
      if (S.marks) {
        const b = ST.boxStats(values);
        p.vline(b.q1, { stroke: G("5"), dash: "4 4", label: "Q1 " + b.q1.toFixed(1), labelColor: G("5") });
        p.vline(b.q3, { stroke: G("5"), dash: "4 4", label: "Q3 " + b.q3.toFixed(1), labelColor: G("5") });
        p.vline(b.q2, { stroke: G("4"), width: 1.8, label: "中位数 " + b.q2.toFixed(1), labelColor: G("4"), labelY: p.M.t + p.PH - 8 });
        p.vline(b.mean, { stroke: G("2"), width: 1.8, label: "均值 " + b.mean.toFixed(1), labelColor: G("2"), labelY: p.M.t + p.PH - 24 });
      }
      p.mount(E.gdChartSvg);
      return h;
    }

    /* ---------- 绘图：箱线图 ---------- */
    function drawBox(values) {
      const b = ST.boxStats(values);
      const pad = (b.max - b.min) * 0.12 + 1;
      const p = U.makePlot({ W: 880, H: 420, xr: [b.min - pad, b.max + pad] });
      p.setY(0, 1);
      p.bg(); p.axes({ xLabel: "取值", yLabel: "" });
      const yc = 0.5, hh = 0.16;
      /* 箱体 */
      p.raw('<rect x="' + p.x(b.q1).toFixed(1) + '" y="' + p.y(yc + hh).toFixed(1) + '" width="' +
        Math.max(2, p.x(b.q3) - p.x(b.q1)).toFixed(1) + '" height="' + Math.max(2, p.y(yc - hh) - p.y(yc + hh)).toFixed(1) +
        '" fill="rgba(76,201,240,.20)" stroke="rgba(76,201,240,.85)" stroke-width="1.8" rx="3"/>');
      /* 中位线 */
      p.raw('<line x1="' + p.x(b.q2).toFixed(1) + '" y1="' + p.y(yc + hh).toFixed(1) + '" x2="' + p.x(b.q2).toFixed(1) +
        '" y2="' + p.y(yc - hh).toFixed(1) + '" stroke="' + G("4") + '" stroke-width="2.6"/>');
      /* 须 */
      p.raw('<line x1="' + p.x(b.whiskerLo).toFixed(1) + '" y1="' + p.y(yc).toFixed(1) + '" x2="' + p.x(b.q1).toFixed(1) +
        '" y2="' + p.y(yc).toFixed(1) + '" stroke="' + U.cvar("--line-strong", "#4a5680") + '" stroke-width="1.6"/>');
      p.raw('<line x1="' + p.x(b.q3).toFixed(1) + '" y1="' + p.y(yc).toFixed(1) + '" x2="' + p.x(b.whiskerHi).toFixed(1) +
        '" y2="' + p.y(yc).toFixed(1) + '" stroke="' + U.cvar("--line-strong", "#4a5680") + '" stroke-width="1.6"/>');
      [b.whiskerLo, b.whiskerHi].forEach(v => {
        p.raw('<line x1="' + p.x(v).toFixed(1) + '" y1="' + p.y(yc - hh * 0.72).toFixed(1) + '" x2="' + p.x(v).toFixed(1) +
          '" y2="' + p.y(yc + hh * 0.72).toFixed(1) + '" stroke="' + U.cvar("--line-strong", "#4a5680") + '" stroke-width="1.6"/>');
      });
      /* 离群点 */
      b.outliers.forEach(v => p.dot(v, yc, { r: 4.2, stroke: G("3"), width: 2, fill: U.cvar("--card", "#121a2c") }));
      /* 标注 */
      p.text(b.q1, yc - hh - 0.09, "Q1 = " + b.q1.toFixed(1), { mono: true, size: 11.5, anchor: "middle", fill: G("5") });
      p.text(b.q2, yc + hh + 0.14, "中位数 = " + b.q2.toFixed(1), { mono: true, size: 11.5, anchor: "middle", fill: G("4") });
      p.text(b.q3, yc - hh - 0.09, "Q3 = " + b.q3.toFixed(1), { mono: true, size: 11.5, anchor: "middle", fill: G("5") });
      if (b.outliers.length) {
        p.text(b.outliers[b.outliers.length - 1], yc - hh - 0.24, "离群点 " + b.outliers.length + " 个", { mono: true, size: 11.5, anchor: "middle", fill: G("3") });
      }
      p.mount(E.gdChartSvg);
    }

    /* ---------- 绘图：线图 ---------- */
    function drawLine(values) {
      const p = U.makePlot({ W: 880, H: 420, xr: [1, Math.max(2, values.length)] });
      p.autoY(v => values[Math.max(0, Math.min(values.length - 1, Math.round(v) - 1))]);
      p.setY(0, Math.max.apply(null, values) * 1.16);
      p.bg(); p.axes({ xLabel: "观测序号（可理解为时间先后）", yLabel: "时长（分钟）" });
      p.line(v => values[Math.max(0, Math.min(values.length - 1, Math.round(v) - 1))], { stroke: "url(#lgA)", width: 2.2 });
      values.forEach((v, i) => {
        if (values.length <= 60) p.dot(i + 1, v, { r: 3, stroke: G("1"), width: 1.6, fill: U.cvar("--card", "#121a2c") });
      });
      const b = ST.boxStats(values);
      if (S.marks) {
        p.hline(b.q2, { stroke: G("4"), dash: "5 5", width: 1.2 });
        p.ptext(p.M.l + 6, p.y(b.q2) - 6, "中位数 " + b.q2.toFixed(0) + " 分钟", { size: 11.5, mono: true, fill: G("4") });
        p.hline(b.mean, { stroke: G("2"), dash: "5 5", width: 1.2 });
        p.ptext(p.M.l + 6, p.y(b.mean) + 14, "均值 " + b.mean.toFixed(0) + " 分钟", { size: 11.5, mono: true, fill: G("2") });
      }
      p.mount(E.gdChartSvg);
    }

    /* ---------- 茎叶图（HTML） ---------- */
    function drawStem(values) {
      const rows = stemLeaf(values);
      E.gdStemWrap.innerHTML =
        '<div class="card-h"><h2>茎叶图 · 茎 = 十位，叶 = 个位</h2>' +
        '<span class="spacer"></span><span class="faint fs12">样本量小时，它同时保留了原始数值与分布形状</span></div>' +
        U.table(["茎", "叶", "该行个数"], rows.map(r => [
          { v: r.stem }, { v: r.leaves.join(" ") }, { v: r.leaves.length }
        ]), { mini: true }) +
        '<div class="note mt10">把每行顺时针旋转 90° 来看，叶子的长度就是直方图的轮廓——所以茎叶图本质上是「不丢信息的直方图」。样本量上千条时它就不再适用了。</div>';
    }

    /* ---------- 读数 ---------- */
    function drawOut() {
      const d = cur();
      const cards = [];
      if (d.type === "cat" || d.type === "ord") {
        const total = d.counts.reduce((a, b) => a + b, 0);
        const maxI = d.counts.indexOf(Math.max.apply(null, d.counts));
        const minI = d.counts.indexOf(Math.min.apply(null, d.counts));
        cards.push({ k: "总频数", v: total, mini: d.labels.length + " 个类别" });
        cards.push({ k: "众数类别", v: d.labels[maxI], hi: true, mini: d.counts[maxI] + "（" + (d.counts[maxI] / total * 100).toFixed(1) + "%）" });
        if (d.type === "cat") {
          const vr = (total - d.counts[maxI]) / total;
          cards.push({ k: "异众比率", v: vr.toFixed(3), mini: vr < 0.5 ? "众数代表性较强" : "众数代表性偏弱" });
          cards.push({ k: "最大 / 最小", v: d.labels[maxI] + " / " + d.labels[minI], mini: "条形图直接比高度" });
          cards.push({ k: "定类变量的禁区", v: "无均值", cls: "warn", mini: "类别编码不能做算术" });
        } else {
          const cum = [];
          let acc = 0;
          d.counts.forEach(c => { acc += c; cum.push(acc / total); });
          cards.push({ k: "累积属性", v: "可累积", mini: "定序变量的独有优势" });
          cards.push({ k: "「一般」及以下", v: (cum[2] * 100).toFixed(1) + "%", mini: "累积百分比" });
          cards.push({ k: "「满意」及以上", v: ((1 - cum[2]) * 100).toFixed(1) + "%", mini: "1 − 累积百分比" });
        }
      } else {
        const a = d.values;
        const b = ST.boxStats(a);
        const sk = ST.skewness(a);
        cards.push({ k: "样本量 n", v: a.length });
        cards.push({ k: "均值", v: b.mean.toFixed(2), mini: "受极端值影响" });
        cards.push({ k: "中位数", v: b.q2.toFixed(2), hi: true, mini: "对极端值稳健" });
        cards.push({ k: "标准差", v: b.sd.toFixed(2), mini: "离散程度" });
        cards.push({ k: "极差", v: (b.max - b.min).toFixed(1), mini: b.min + " ~ " + b.max });
        cards.push({ k: "四分位距 IQR", v: b.iqr.toFixed(2), mini: "涵盖中间 50%" });
        cards.push({ k: "偏度", v: sk.toFixed(2), cls: Math.abs(sk) > 1 ? "warn" : "", mini: sk > 0.5 ? "右偏：长尾在右侧" : sk < -0.5 ? "左偏" : "近似对称" });
        cards.push({ k: "离群点", v: b.outliers.length, cls: b.outliers.length ? "danger" : "ok", mini: b.outliers.length ? "须之外，需逐一核查" : "1.5×IQR 规则内" });
      }
      E.gdOut.innerHTML = U.readouts(cards);
    }

    /* ---------- 分组频数分布表 ---------- */
    function drawTable() {
      const d = cur();
      if (d.type !== "num") {
        const total = d.counts.reduce((a, b) => a + b, 0);
        let acc = 0;
        const rows = d.labels.map((l, i) => {
          acc += d.counts[i];
          const r = d.counts[i] / total;
          return [
            { v: l }, { v: d.counts[i] }, { v: (r * 100).toFixed(1) + "%" },
            { v: d.type === "ord" ? (acc / total * 100).toFixed(1) + "%" : "—" }
          ];
        });
        const sum = [(d.type === "cat" ? "合计" : "合计"), { v: total }, { v: "100.0%" }, { v: "—" }];
        E.gdTable.innerHTML = U.table(
          ["类别", "频数", "百分比", d.type === "ord" ? "累积百分比" : "累积（不适用）"],
          rows.concat([sum]), { mini: false });
        E.gdTblNote.textContent = d.type === "ord" ? "顺序数据的累积列有意义" : "定类变量不能累积";
        return;
      }
      const a = d.values;
      const auto = Math.max(3, Math.ceil(Math.sqrt(a.length)));
      const k = S.bins || auto;
      const h = ST.histogram(a, k);
      let acc = 0;
      const rows = h.counts.map((c, i) => {
        acc += c;
        return [
          { v: h.edges[i].toFixed(1) + " ~ " + h.edges[i + 1].toFixed(1) },
          { v: c },
          { v: (c / a.length * 100).toFixed(1) + "%" },
          { v: (acc / a.length * 100).toFixed(1) + "%" }
        ];
      });
      E.gdTable.innerHTML = U.table(["组限", "频数", "频率", "累积频率"], rows, { mini: false });
      E.gdTblNote.textContent = "组数 = " + k + "，组距 ≈ " + (h.edges[1] - h.edges[0]).toFixed(2) + "（Sturges 建议 " + auto + " 组）";
    }

    /* ---------- 速查表 ---------- */
    function drawGuide() {
      E.gdGuide.innerHTML = U.table(["数据类型", "可用的整理方式", "推荐图形"], [
        [{ v: "定类", cls: "tx" }, { v: "频数、比例、异众比率", cls: "tx" }, { v: "条形图、饼图", cls: "tx" }],
        [{ v: "定序", cls: "tx" }, { v: "频数、累积频数、中位数、四分位差", cls: "tx" }, { v: "条形图、累积条形图", cls: "tx" }],
        [{ v: "定距 / 定比", cls: "tx" }, { v: "均值、标准差、分组频数表", cls: "tx" }, { v: "直方图、茎叶图、箱线图、线图", cls: "tx" }]
      ], { mini: false });
    }

    /* ---------- 主刷新 ---------- */
    function rebuildChartChips() {
      const d = cur();
      const list = CHART_BY_TYPE[d.type];
      if (!list.some(x => x.v === S.chart)) S.chart = list[0].v;
      E.gdChart.innerHTML = list.map(x =>
        '<button class="chip' + (x.v === S.chart ? " active" : "") + '" data-v="' + x.v +
        '" style="text-align:left;font-family:var(--sans)">' + x.t + "</button>").join("");
    }

    function rebuildDsChips() {
      const t = S.ds === "cat" ? "cat" : S.ds === "ord" ? "ord" : "num";
      E.gdDs.innerHTML = Object.keys(DATA).filter(k => DATA[k].type === t).map(k =>
        '<button class="chip' + (k === S.ds ? " active" : "") + '" data-v="' + k +
        '" style="text-align:left;font-family:var(--sans)">' + DATA[k].name + "</button>").join("");
      E.gdDesc.innerHTML = "<b>" + cur().name + "</b><br>" + cur().sub;
    }

    function update() {
      const d = cur();
      rebuildDsChips();
      rebuildChartChips();

      E.gdZero.checked = S.fromZero;
      E.gdMarks.checked = S.marks;
      const isNum = d.type === "num";
      E.gdBinsR.disabled = !isNum;
      E.gdBins.innerText = isNum ? (S.bins || "自动（" + Math.max(3, Math.ceil(Math.sqrt(d.values.length))) + "）") : "仅数值型可用";

      E.gdStemWrap.innerHTML = "";
      E.gdChartSvg.style.display = "";

      let badge = "", legend = [], title = "";
      switch (S.chart) {
        case "bar":
          title = d.type === "ord" ? "条形图 · 保持原有顺序" : "条形图 · 按频数排序";
          drawBars(d, false);
          badge = d.type === "ord" ? "顺序不可打乱" : "长条之间有缝 = 定类数据";
          legend = [{ c: G("1"), t: "频数（长条高度）" }, { c: G("2"), t: "留白 = 类别之间的间隔" }];
          break;
        case "barh":
          title = "横向条形图 · 类别名较长时更好读";
          drawBars(d, true);
          badge = "横向排列";
          legend = [{ c: G("1"), t: "频数（长条长度）" }];
          break;
        case "pie":
          title = "饼图 · 强调「构成」";
          drawPie(d);
          badge = d.labels.length > 5 ? "类别过多，饼图已难比较" : "适合类别较少的场合";
          legend = [{ c: G("3"), t: "扇形面积 = 比例" }];
          break;
        case "cum":
          title = "累积条形图 · 回答「…及以上占多少」";
          drawCum(d);
          badge = "定序变量专属";
          legend = [{ c: G("4"), t: "累积百分比" }, { c: G("3"), t: "趋势折线" }, { c: G("2"), t: "50% 分界" }];
          break;
        case "hist": {
          title = "直方图 · 长条之间不留空隙";
          const k = S.bins || Math.max(3, Math.ceil(Math.sqrt(d.values.length)));
          drawHist(d.values);
          badge = "组数 = " + k + (S.fromZero ? "" : "（纵轴已截断）");
          legend = [{ c: "rgba(76,201,240,.7)", t: "各组频数" }, { c: G("4"), t: "中位数" }, { c: G("2"), t: "均值" }, { c: G("5"), t: "Q1 / Q3" }];
          break;
        }
        case "stem":
          title = "茎叶图 · 茎为十位，叶为个位";
          E.gdChartSvg.style.display = "none";
          drawStem(d.values);
          badge = "保留全部原始数值";
          legend = [];
          break;
        case "box":
          title = "箱线图 · 五数概括 + 离群点";
          drawBox(d.values);
          badge = d.values.length + " 个观测，IQR = " + ST.boxStats(d.values).iqr.toFixed(1);
          legend = [{ c: "rgba(76,201,240,.6)", t: "箱体 = Q1 ~ Q3（中间 50%）" }, { c: G("4"), t: "中位数" }, { c: G("3"), t: "离群点" }];
          break;
        case "line":
          title = "线图 · 看趋势与周期";
          drawLine(d.values);
          badge = "按时序排列的 " + d.values.length + " 个观测";
          legend = [{ c: G("1"), t: "数值折线" }, { c: G("4"), t: "中位数参照" }, { c: G("2"), t: "均值参照" }];
          break;
      }

      E.gdTitle.textContent = title;
      E.gdBadge.textContent = badge;
      E.gdBadge.className = "badge " + (S.chart === "pie" && d.labels.length > 5 ? "warn" : "acc");
      E.gdLegend.innerHTML = legend.map(x =>
        '<span class="it"><i class="sw" style="background:' + x.c + '"></i>' + x.t + "</span>").join("");

      drawOut();
      drawTable();
    }

    /* ---------- 事件 ---------- */
    drawGuide();

    E.gdType.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      U.$$("#gdType .chip").forEach(x => x.classList.toggle("active", x === b));
      const t = b.dataset.v;
      S.ds = t === "cat" ? "cat" : t === "ord" ? "ord" : (S.ds === "numL" ? "numL" : "numS");
      S.chart = CHART_BY_TYPE[t][0].v;
      S.bins = 0;
      update();
    });

    E.gdDs.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.ds = b.dataset.v; S.bins = 0; update();
    });

    E.gdChart.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      S.chart = b.dataset.v; update();
    });

    let timer = null;
    E.gdBinsR.addEventListener("input", e => {
      clearTimeout(timer);
      const v = +e.target.value;
      timer = setTimeout(() => { S.bins = v; update(); }, 60);
    });

    E.gdZero.onchange = () => { S.fromZero = E.gdZero.checked; update(); };
    E.gdMarks.onchange = () => { S.marks = E.gdMarks.checked; update(); };
    E.gdReset.onclick = () => {
      S.ds = "cat"; S.chart = "bar"; S.bins = 0; S.fromZero = true; S.marks = true;
      U.$$("#gdType .chip").forEach((x, i) => x.classList.toggle("active", i === 0));
      update();
      if (window.SITE_UI) window.SITE_UI.toast("已重置");
    };

    update();
  }
});

})();
