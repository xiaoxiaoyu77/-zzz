/* =========================================================
   lab-set7.js — 互动模块（七）
     · data-lab  数据集与描述统计工作台
   ========================================================= */
(function () {
  "use strict";
  const ST = window.ST, U = window.LABUI, LAB = window.LAB;

LAB.register({
  id: "data-lab",
  render(root) {
    const rng = new ST.RNG(1123581321);

    /* ---- 内置数据集生成 ---- */
    function makeArticles(n) {
      const rows = [];
      const r = new ST.RNG(20260911);
      for (let i = 0; i < n; i++) {
        const fans = Math.max(0.5, r.normal(18, 11));
        const words = Math.max(200, Math.round(r.normal(1800, 620)));
        const img = r.uniform(0, 1) < 0.62 ? 1 : 0;
        const titleLen = Math.max(6, Math.round(r.normal(21, 5)));
        const read = Math.max(0.2, +(3.2 + 0.042 * fans + 1.35 * img + r.normal(0, 2.4)).toFixed(2));
        const likes = Math.max(0, Math.round(read * 12 + r.normal(0, 22)));
        rows.push({ id: i + 1, fans: +fans.toFixed(1), words, img, titleLen, read, likes });
      }
      return rows;
    }
    function makeLikert(n, k) {
      const r = new ST.RNG(31415);
      const rows = [];
      for (let i = 0; i < n; i++) {
        const theta = r.normal(0, 1);
        const row = { id: i + 1 };
        for (let j = 0; j < k; j++) {
          let v = Math.round(3.0 + (0.67 * theta + 0.74 * r.normal(0, 1)) * 0.95);
          row["Q" + (j + 1)] = Math.max(1, Math.min(5, v));
        }
        rows.push(row);
      }
      return rows;
    }
    function makeLognormal(n) {
      const r = new ST.RNG(271828);
      const rows = [];
      for (let i = 0; i < n; i++) {
        rows.push({ id: i + 1, minutes: Math.round(Math.exp(r.normal(3.1, 0.95))) });
      }
      return rows;
    }

    const BUILTIN = [
      { id: "attention", name: "注意力自评", n: 16, desc: "某学院课程调查中 16 位每天刷短视频超 2 小时学生的注意力自评（0–100）" },
      { id: "articles", name: "公众号推文数据", n: 60, desc: "60 篇推文的粉丝基数、正文字数、是否配图、标题长度、阅读量、点赞数" },
      { id: "likert", name: "媒介素养量表", n: 80, desc: "80 名被试在 8 道 5 点量表题上的作答" },
      { id: "lognormal", name: "网络使用时长", n: 120, desc: "120 名用户单日网络内容接触时长（分钟），分布严重右偏" },
      { id: "custom", name: "粘贴我自己的数据", n: 0, desc: "把一列或多列数字粘贴进来（逗号、空格或换行分隔）" }
    ];

    const S = { ds: "articles", rows: [], vars: [], picks: {}, alpha: 0.05, bins: 0 };

    root.innerHTML =
      '<div class="split">' +
      '<section class="card panel">' +
      '<div class="sect-title">选择数据集</div>' +
      '<div class="chips" id="dlDs" style="flex-direction:column;align-items:stretch;gap:6px">' +
      BUILTIN.map(d => '<button class="chip' + (d.id === "articles" ? " active" : "") + '" data-v="' + d.id + '" style="text-align:left;font-family:var(--sans)">' + d.name + "</button>").join("") +
      "</div>" +
      '<div class="note" id="dlDesc"></div>' +
      '<div id="dlCustomBox" hidden>' +
      '<label class="fld mt14">粘贴数据（每行一条记录，列用逗号 / Tab / 空格分隔）</label>' +
      '<textarea id="dlPaste" rows="7" placeholder="例如：&#10;62 71 58 66 55&#10;73 60 64 69 57" style="font-family:var(--mono);font-size:12.5px"></textarea>' +
      '<div class="row mt6"><button class="btn sm" id="dlParse">解析并载入</button><button class="btn sm ghost" id="dlSample">填入示例</button></div>' +
      "</div>" +
      U.ctrl({ label: "直方图分组数", valHtml: '<span id="dlBins"></span>', body: '<input type="range" id="dlBinsR" min="0" max="60" step="1" value="0">', note: "0 = 自动（按 √n 规则）。" }) +
      '<div class="ctrl"><button class="btn block" id="dlDl">下载当前数据集（CSV）</button></div>' +
      "</section>" +

      '<section class="viz stack">' +
      '<div class="card"><div class="card-h"><h2>描述统计总览</h2><span class="spacer"></span><span class="badge" id="dlShape"></span></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="dlTable"></table></div>' +
      "</div>" +
      '<div class="card"><div class="card-h"><h2>分布形态</h2><span class="spacer"></span>' +
      '<div class="chips" id="dlVarPick"></div></div>' +
      '<div class="stage"><svg id="dlChart1"></svg></div>' +
      '<div class="stage mt10"><svg id="dlChart2"></svg></div>' +
      U.hints(["上图 = 直方图 + 均值 / 中位数标线", "下图 = 箱线图与离群点", "切换变量可对比不同量纲的数据"]) +
      "</div>" +
      '<div class="readouts" id="dlOut"></div>' +
      "</section>" +
      "</div>" +

      '<div class="grid g3 mt18">' +
      '<section class="card"><div class="card-h"><h2>变量间的相关矩阵</h2></div>' +
      '<div class="tbl-wrap"><table class="tbl mini" id="dlCorr"></table></div>' +
      '<div class="note mt10">只对数值型变量计算皮尔逊相关。相关系数强的组合值得进一步做回归分析。</div></section>' +
      '<section class="card"><div class="card-h"><h2>下一步该用什么方法</h2></div>' +
      '<div id="dlSuggest"></div></section>' +
      '<section class="card"><div class="card-h"><h2>数据质量检查</h2></div>' +
      '<div class="kv" id="dlQuality"></div>' +
      '<div class="note mt10">正式分析前必须完成这几项检查。实际操作中，数据清理花掉的时间往往超过统计分析本身。</div></section>' +
      "</div>";

    const ids = ["dlDs", "dlDesc", "dlCustomBox", "dlPaste", "dlParse", "dlSample", "dlBins", "dlBinsR",
      "dlDl", "dlShape", "dlTable", "dlVarPick", "dlChart1", "dlChart2", "dlOut", "dlCorr", "dlSuggest", "dlQuality"];
    const E = {};
    ids.forEach(i => E[i] = document.getElementById(i));

    function loadDs(id) {
      S.ds = id;
      U.$$("#dlDs button").forEach(b => b.classList.toggle("active", b.dataset.v === id));
      const meta = BUILTIN.filter(x => x.id === id)[0];
      E.dlDesc.textContent = meta.desc;
      E.dlCustomBox.hidden = id !== "custom";
      if (id === "attention") {
        const arr = [62, 71, 58, 66, 55, 73, 60, 64, 69, 57, 63, 68, 59, 70, 61, 65];
        S.rows = arr.map((v, i) => ({ id: i + 1, score: v }));
      } else if (id === "articles") {
        S.rows = makeArticles(60);
      } else if (id === "likert") {
        S.rows = makeLikert(80, 8);
      } else if (id === "lognormal") {
        S.rows = makeLognormal(120);
      } else {
        S.rows = S.rows.length ? S.rows : [];
      }
      S.vars = S.rows.length ? Object.keys(S.rows[0]).filter(k => k !== "id") : [];
      S.picks = {};
      S.vars.forEach(v => S.picks[v] = true);
      if (!S.vars.length) { E.dlChart1.innerHTML = ""; E.dlChart2.innerHTML = ""; }
      draw();
    }

    const isNum = v => S.rows.every(r => typeof r[v] === "number" || r[v] === "" || r[v] === null);
    const col = v => S.rows.map(r => r[v]).filter(x => typeof x === "number" && isFinite(x));
    const labelOf = (v) => {
      const M = { score: "注意力自评", fans: "粉丝基数（万）", words: "正文字数", img: "是否配图", titleLen: "标题长度", read: "阅读量（千）", likes: "点赞数", minutes: "使用时长（分钟）" };
      if (M[v]) return M[v];
      if (/^Q\d+$/.test(v)) return "第 " + v.slice(1) + " 题";
      return v;
    };

    /* 初始化：载入默认数据集（须在 isNum / col / labelOf 声明之后调用） */
    loadDs("articles");

    function draw() {
      const numVars = S.vars.filter(v => isNum(v) && col(v).length >= 3);
      E.dlBins.textContent = S.bins === 0 ? "自动" : S.bins;
      E.dlVarPick.innerHTML = numVars.map((v, i) =>
        '<button class="chip' + (S.picks[v] ? " active" : "") + '" data-v="' + v + '">' + labelOf(v) + "</button>").join("");

      if (!numVars.length) {
        E.dlTable.innerHTML = '<tr><td class="tx faint">暂无可用数据。请在左侧选择内置数据集，或粘贴自己的数据。</td></tr>';
        E.dlOut.innerHTML = ""; E.dlCorr.innerHTML = "";
        return;
      }

      /* ---- 描述统计总览 ---- */
      let html = "<thead><tr><th>变量</th><th>n</th><th>均值</th><th>中位数</th><th>标准差</th><th>最小</th><th>最大</th><th>偏度</th><th>峰度</th><th>CV</th></tr></thead><tbody>";
      numVars.forEach(v => {
        const d = col(v);
        const st = ST.describe(d);
        const sk = Math.abs(st.skew) > 1 ? "var(--danger)" : Math.abs(st.skew) > 0.5 ? "var(--warn)" : "var(--fg-mut)";
        html += '<tr><td class="tx">' + labelOf(v) + "</td><td>" + st.n + "</td><td>" + U.F.num(st.mean, 2) + "</td><td>" +
          U.F.num(st.median, 2) + "</td><td>" + U.F.num(st.sd, 2) + "</td><td>" + U.F.num(st.min, 2) + "</td><td>" +
          U.F.num(st.max, 2) + '</td><td style="color:' + sk + '">' + U.F.num(st.skew, 3) + "</td><td>" + U.F.num(st.kurt, 3) +
          "</td><td>" + U.F.num(st.cv * 100, 1) + "%</td></tr>";
      });
      html += "</tbody>";
      E.dlTable.innerHTML = html;

      /* ---- 选中变量绘图 ---- */
      const pick = numVars.filter(v => S.picks[v]);
      const main = pick[0] || numVars[0];
      if (main) {
        const d = col(main);
        const st = ST.describe(d);
        const nb = S.bins > 0 ? S.bins : undefined;
        const hg = ST.histogram(d, nb);
        const w = hg.edges[1] - hg.edges[0];
        const p = U.makePlot({ W: 880, H: 280, xr: [hg.edges[0], hg.edges[hg.edges.length - 1]], yr: [0, 1] });
        const mx = Math.max.apply(null, hg.counts);
        p.setY(0, mx * 1.2).bg().grid(0, 0).axes({ xLabel: labelOf(main), yLabel: "频数" });
        hg.counts.forEach((c, i) => {
          p.bar(hg.edges[i], hg.edges[i] + w, c, { fill: "rgba(76,201,240,.42)", stroke: "rgba(76,201,240,.9)", rx: 2 });
        });
        p.vline(st.mean, { stroke: "var(--g1)", dash: "5 4", label: "x̄ " + U.F.num(st.mean, 2), width: 2 });
        p.vline(st.median, { stroke: "var(--g2)", dash: "5 4", label: "Md " + U.F.num(st.median, 2), labelY: p.M.t + 30 });
        p.mount(E.dlChart1);

        // 箱线图
        const bs = ST.boxStats(d);
        const p2 = U.makePlot({ W: 880, H: 130, xr: [hg.edges[0], hg.edges[hg.edges.length - 1]], yr: [0, 1], margin: { l: 62, r: 26, t: 26, b: 38 } });
        p2.bg().grid(0, 0).axes({ stepX: U.niceStep(hg.edges[hg.edges.length - 1] - hg.edges[0]) });
        const cy = p2.M.t + p2.PH * 0.5, bh = 30;
        p2.raw('<line x1="' + p2.x(bs.whiskerLo).toFixed(1) + '" y1="' + cy + '" x2="' + p2.x(bs.q1).toFixed(1) + '" y2="' + cy + '" stroke="var(--g1)" stroke-width="1.6"/>');
        p2.raw('<line x1="' + p2.x(bs.q3).toFixed(1) + '" y1="' + cy + '" x2="' + p2.x(bs.whiskerHi).toFixed(1) + '" y2="' + cy + '" stroke="var(--g1)" stroke-width="1.6"/>');
        [bs.whiskerLo, bs.whiskerHi].forEach(v => {
          p2.raw('<line x1="' + p2.x(v).toFixed(1) + '" y1="' + (cy - bh / 2) + '" x2="' + p2.x(v).toFixed(1) + '" y2="' + (cy + bh / 2) + '" stroke="var(--g1)" stroke-width="1.6"/>');
        });
        p2.raw('<rect x="' + p2.x(bs.q1).toFixed(1) + '" y="' + (cy - bh / 2) + '" width="' + (p2.x(bs.q3) - p2.x(bs.q1)).toFixed(1) + '" height="' + bh + '" fill="rgba(76,201,240,.18)" stroke="var(--g1)" stroke-width="1.8" rx="3"/>');
        p2.raw('<line x1="' + p2.x(bs.q2).toFixed(1) + '" y1="' + (cy - bh / 2) + '" x2="' + p2.x(bs.q2).toFixed(1) + '" y2="' + (cy + bh / 2) + '" stroke="var(--g2)" stroke-width="2.4"/>');
        bs.outliers.forEach(v => {
          p2.raw('<circle cx="' + p2.x(v).toFixed(1) + '" cy="' + cy + '" r="5" fill="none" stroke="var(--g3)" stroke-width="2"/>');
        });
        p2.ptext(p2.M.l, p2.M.t - 8, "离群点 " + bs.outliers.length + " 个，Q1 = " + U.F.num(bs.q1, 2) + "，Q3 = " + U.F.num(bs.q3, 2) + "，IQR = " + U.F.num(bs.iqr, 2), { fill: U.cvar("--fg-mut", "#8d99b6"), size: 11.5, mono: true });
        p2.mount(E.dlChart2);

        /* ---- 读数 ---- */
        const gap = st.mean - st.median;
        E.dlShape.className = "badge " + (Math.abs(st.skew) > 1 ? "danger" : Math.abs(st.skew) > 0.5 ? "warn" : "ok");
        E.dlShape.textContent = Math.abs(st.skew) < 0.3 ? "近似对称" : st.skew > 0 ? "右偏" : "左偏";
        E.dlOut.innerHTML = U.readouts([
          { k: "当前变量", v: labelOf(main), mini: "n = " + st.n },
          { k: "均值 x̄", v: U.F.num(st.mean, 3), hi: true },
          { k: "中位数", v: U.F.num(st.median, 3), mini: "均值 − 中位数 = " + U.F.num(gap, 2) },
          { k: "标准差 s", v: U.F.num(st.sd, 3), mini: "个体离散程度" },
          { k: "标准误 SE", v: U.F.num(st.sem, 4), mini: "s/√n，估计精度" },
          { k: "偏度", v: U.F.num(st.skew, 3), cls: Math.abs(st.skew) > 0.5 ? "warn" : "", mini: Math.abs(st.skew) > 0.5 ? "建议同时报中位数" : "分布尚可" },
          { k: "变异系数", v: U.F.num(st.cv * 100, 2) + "%", mini: "跨变量可比" },
          { k: "离群点数", v: bs.outliers.length, cls: bs.outliers.length > st.n * 0.05 ? "warn" : "", mini: "1.5×IQR 规则" }
        ]);
      }

      /* ---- 相关矩阵 ---- */
      if (numVars.length >= 2) {
        const cors = {};
        numVars.forEach(a => numVars.forEach(b => {
          if (a === b) cors[a + "|" + b] = 1;
          else if (cors[b + "|" + a] !== undefined) cors[a + "|" + b] = cors[b + "|" + a];
          else cors[a + "|" + b] = ST.pearson(col(a), col(b));
        }));
        let h = "<thead><tr><th></th>" + numVars.map(v => "<th>" + labelOf(v).slice(0, 5) + "</th>").join("") + "</tr></thead><tbody>";
        numVars.forEach(a => {
          h += '<tr><td class="tx">' + labelOf(a) + "</td>";
          numVars.forEach(b => {
            const r = cors[a + "|" + b];
            const ar = Math.abs(r);
            let bg = "transparent";
            if (a !== b && isFinite(r)) {
              bg = r > 0 ? "rgba(76,201,240," + (ar * 0.42).toFixed(2) + ")" : "rgba(247,37,133," + (ar * 0.38).toFixed(2) + ")";
            }
            h += '<td style="background:' + bg + ';' + (a === b ? "color:var(--fg-faint)" : "") + '">' + (isFinite(r) ? U.F.num(r, 2) : "—") + "</td>";
          });
          h += "</tr>";
        });
        h += "</tbody>";
        E.dlCorr.innerHTML = h;
      } else {
        E.dlCorr.innerHTML = '<tbody><tr><td class="tx faint">需要至少两个数值型变量才能计算相关矩阵。</td></tr></tbody>';
      }

      /* ---- 方法建议 ---- */
      const suggestions = buildSuggestions(numVars);
      E.dlSuggest.innerHTML = suggestions;

      /* ---- 数据质量 ---- */
      let miss = 0, total = 0, outliers = 0, zeroVar = [];
      S.vars.forEach(v => {
        const c = col(v);
        miss += S.rows.length - c.length; total += S.rows.length;
        if (c.length > 1 && ST.sd(c) === 0) zeroVar.push(labelOf(v));
        const bs = ST.boxStats(c);
        outliers += bs ? bs.outliers.length : 0;
      });
      E.dlQuality.innerHTML =
        '<div class="k">记录数</div><div class="v">' + S.rows.length + "</div>" +
        '<div class="k">变量数</div><div class="v">' + S.vars.length + "（数值型 " + numVars.length + "）</div>" +
        '<div class="k">缺失单元格</div><div class="v ' + (miss > 0 ? "na" : "") + '">' + miss + " / " + total + "（" + U.F.num(miss / Math.max(1, total) * 100, 2) + "%）</div>" +
        '<div class="k">离群点总数</div><div class="v">' + outliers + "</div>" +
        '<div class="k">零方差变量</div><div class="v ' + (zeroVar.length ? "na" : "") + '">' + (zeroVar.length ? zeroVar.join("、") : "无") + "</div>" +
        '<div class="k">重复记录</div><div class="v">—（示例数据无重复）</div>';
    }

    function buildSuggestions(numVars) {
      const items = [];
      // 是否有二分类变量
      const binary = numVars.filter(v => {
        const u = Array.from(new Set(col(v)));
        return u.length === 2;
      });
      // 是否有分类变量（整数且取值少）
      const cat = numVars.filter(v => {
        const u = Array.from(new Set(col(v)));
        return u.length > 2 && u.length <= 5 && u.every(x => Number.isInteger(x));
      });
      const cont = numVars.filter(v => new Set(col(v)).size > 5);

      if (binary.length && cont.length) {
        items.push(["两组均值比较", "用独立样本 t 检验比较 " + labelOf(binary[0]) + " 两组在「" + labelOf(cont[0]) + "」上的差异；若方差不齐用 Welch 校正。"]);
      }
      if (cat.length && cont.length) {
        items.push(["三组以上比较", "用单因素方差分析比较 " + labelOf(cat[0]) + " 各组的「" + labelOf(cont[0]) + "」均值，显著后做 Tukey 事后比较。"]);
      }
      if (numVars.length >= 2) {
        // 找最强相关
        let best = null;
        numVars.forEach((a, i) => numVars.forEach((b, j) => {
          if (j <= i) return;
          const r = ST.pearson(col(a), col(b));
          if (!isFinite(r)) return;
          if (!best || Math.abs(r) > Math.abs(best.r)) best = { a, b, r };
        }));
        if (best && Math.abs(best.r) > 0.25) {
          items.push(["相关与回归", "「" + labelOf(best.a) + "」与「" + labelOf(best.b) + "」的相关最强（r = " + U.F.num(best.r, 3) + "）。可据此建立一元回归，或把它作为因变量做多元回归。"]);
        }
      }
      if (S.vars.some(v => /^Q\d+$/.test(v))) {
        items.push(["信度检验", "检出 " + S.vars.filter(v => /^Q\d+$/.test(v)).length + " 道量表题项，可计算 Cronbach's α 并做项目分析。注意检查是否存在反向题。"]);
      }
      const skewed = numVars.filter(v => Math.abs(ST.skewness(col(v))) > 1);
      if (skewed.length) {
        items.push(["⚠ 先做变换", "「" + skewed.map(labelOf).join("」「") + "」偏度绝对值超过 1，属明显偏态。做参数检验前建议考虑对数变换，或改用非参数方法。"]);
      }
      if (S.rows.length < 30) {
        items.push(["⚠ 样本量偏小", "当前只有 " + S.rows.length + " 条记录。每组样本量低于 30 时，正态假设更脆弱，应先做功效分析。"]);
      }
      if (!items.length) {
        items.push(["从描述统计开始", "先画分布图、算集中与离散趋势，再根据变量类型确定后续方法。"]);
      }
      return items.map(it =>
        '<div class="callout ' + (it[0].indexOf("⚠") === 0 ? "warn" : "info") + '" style="margin-bottom:9px">' +
        '<span class="ttl">' + it[0].replace("⚠ ", "") + "</span>" + it[1] + "</div>").join("") +
        '<div class="note mt10">以上为基于变量类型与分布的自动建议，仅供参考。<b>方法的最终选择应由研究问题决定，而不是由数据决定。</b></div>';
    }

    /* ---- 事件 ---- */
    E.dlDs.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      loadDs(b.dataset.v);
    };
    E.dlBinsR.oninput = () => { S.bins = +E.dlBinsR.value; draw(); };
    E.dlVarPick.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      const v = b.dataset.v;
      // 单选：只显示一个变量
      Object.keys(S.picks).forEach(k => S.picks[k] = false);
      S.picks[v] = true;
      draw();
    };
    E.dlSample.onclick = () => {
      E.dlPaste.value = "62 71 58 66 55 73 60 64 69 57\n63 68 59 70 61 65 67 54\n72 56 63 69 58 66 70 61\n64 59 71 62 68 57 65 60";
    };
    E.dlParse.onclick = () => {
      const raw = E.dlPaste.value.trim();
      if (!raw) { window.SITE_UI.toast("请先粘贴数据"); return; }
      const lines = raw.split(/\r?\n/).filter(s => s.trim());
      const rows = [];
      const multiCol = lines.some(l => l.trim().split(/[\s,，;；\t]+/).filter(Boolean).length > 1);
      if (!multiCol) {
        const nums = ST.parseNumbers(raw);
        nums.forEach((v, i) => rows.push({ id: i + 1, value: v }));
      } else {
        lines.forEach((l, i) => {
          const parts = l.trim().split(/[\s,，;；\t]+/).filter(Boolean);
          const o = { id: i + 1 };
          parts.forEach((p, j) => { o["V" + (j + 1)] = isFinite(+p) ? +p : p; });
          rows.push(o);
        });
      }
      if (!rows.length) { window.SITE_UI.toast("没有解析出有效数据"); return; }
      S.rows = rows;
      S.vars = Object.keys(rows[0]).filter(k => k !== "id");
      S.picks = {}; S.vars.forEach(v => S.picks[v] = true);
      S.ds = "custom";
      U.$$("#dlDs button").forEach(b => b.classList.toggle("active", b.dataset.v === "custom"));
      E.dlDesc.textContent = "已载入自定义数据：" + rows.length + " 条记录，" + S.vars.length + " 个变量。";
      draw();
      window.SITE_UI.toast("已载入 " + rows.length + " 条记录");
    };
    E.dlDl.onclick = () => {
      if (!S.rows.length) { window.SITE_UI.toast("没有数据可导出"); return; }
      const heads = ["id"].concat(S.vars);
      const csv = [heads.join(",")].concat(S.rows.map(r => heads.map(h => r[h] === undefined ? "" : r[h]).join(","))).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dataset_" + S.ds + ".csv";
      a.click();
      window.SITE_UI.toast("已导出 CSV");
    };

    draw();
  }
});

})();
