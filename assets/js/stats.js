/* =========================================================
   stats.js — 统计计算内核
   ---------------------------------------------------------
   全部由数值方法求解，不依赖查表插值。
   包含：特殊函数 / 常见分布 PDF·CDF·分位数 / 描述统计 /
         相关与回归 / 方差分析 / 卡方 / 信度 / 随机数 /
         矩阵运算 / 假设检验辅助
   暴露为全局对象：window.ST
   ========================================================= */
(function (global) {
  "use strict";

  const EPS = 3e-14, ITER = 500, FPMIN = 1e-300;

  /* =======================================================
     一、特殊函数
     ======================================================= */

  /** 伽马函数的对数 lnΓ(x) —— Lanczos 近似 */
  function logGamma(x) {
    const g = 7;
    const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    x -= 1;
    let a = C[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += C[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /** 阶乘 n! */
  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  /** 连分式：不完全贝塔函数 */
  function betacf(a, b, x) {
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= ITER; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  /** 正则化不完全贝塔函数 I_x(a,b) */
  function betai(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  /** 级数展开：下不完全伽马（正则化） */
  function gser(a, x) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n <= ITER; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPS) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  /** 连分式：上不完全伽马（正则化） */
  function gcf(a, x) {
    let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i <= ITER; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  }

  /** 下不完全伽马函数 P(a,x) */
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) return gser(a, x);
    return 1 - gcf(a, x);
  }
  /** 上不完全伽马函数 Q(a,x) = 1 − P(a,x) */
  function gammaQ(a, x) { return 1 - gammaP(a, x); }

  /* =======================================================
     二、标准正态分布
     ======================================================= */

  function normalPDF(z, mu, sigma) {
    mu = mu === undefined ? 0 : mu;
    sigma = sigma === undefined ? 1 : sigma;
    return Math.exp(-0.5 * Math.pow((z - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
  }

  /** 标准正态 CDF —— Zelen & Severo 近似（精度约 7.5e-8） */
  function normalCDF(z) {
    const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
    const p = 0.2316419, c = 0.3989422804014327;
    const s = z < 0 ? -1 : 1, a = Math.abs(z);
    const t = 1 / (1 + p * a), t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const tail = c * Math.exp(-a * a / 2) * (b[0] * t + b[1] * t2 + b[2] * t3 + b[3] * t4 + b[4] * t5);
    return s > 0 ? 1 - tail : tail;
  }

  /** 标准正态分位数 —— Acklam 有理逼近 + 一步 Halley 精修（精度约 1e-15） */
  function normalInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
      1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
      6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
      -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
      3.754408661907416e+00];
    const pl = 0.02425, ph = 1 - pl;
    let q, r, x;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= ph) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const e = normalCDF(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  }

  /* =======================================================
     三、t 分布
     ======================================================= */

  function tPDF(t, nu) {
    if (!isFinite(nu)) return normalPDF(t);
    return Math.exp(logGamma((nu + 1) / 2) - logGamma(nu / 2)) / Math.sqrt(nu * Math.PI) *
      Math.pow(1 + t * t / nu, -(nu + 1) / 2);
  }

  function tCDF(t, nu) {
    if (!isFinite(nu)) return normalCDF(t);
    const x = nu / (nu + t * t);
    const ib = betai(nu / 2, 0.5, x);
    return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
  }

  /** t 分位数：二分法反解 F(t)=p，保证单调且稳定 */
  function tInv(p, nu) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    let lo = -1e5, hi = 1e5;
    for (let i = 0; i < 240; i++) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (tCDF(mid, nu) < p) lo = mid; else hi = mid;
    }
    const r = (lo + hi) / 2;
    return Math.abs(r) < 1e-9 ? 0 : r;
  }

  /* =======================================================
     四、F 分布（方差分析用）
     ======================================================= */

  function fPDF(f, d1, d2) {
    if (f <= 0) return 0;
    const lc = (d1 / 2) * Math.log(d1 / d2) + logGamma((d1 + d2) / 2) -
      logGamma(d1 / 2) - logGamma(d2 / 2);
    return Math.exp(lc + (d1 / 2 - 1) * Math.log(f) -
      ((d1 + d2) / 2) * Math.log(1 + d1 * f / d2));
  }

  function fCDF(f, d1, d2) {
    if (f <= 0) return 0;
    const x = d1 * f / (d1 * f + d2);
    return betai(d1 / 2, d2 / 2, x);
  }

  function fInv(p, d1, d2) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    let lo = 0, hi = 1e6;
    for (let i = 0; i < 220; i++) {
      const mid = (lo + hi) / 2;
      if (fCDF(mid, d1, d2) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* =======================================================
     五、卡方分布
     ======================================================= */

  function chi2PDF(x, k) {
    if (x <= 0) return 0;
    return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 -
      (k / 2) * Math.log(2) - logGamma(k / 2));
  }

  function chi2CDF(x, k) {
    if (x <= 0) return 0;
    return gammaP(k / 2, x / 2);
  }

  function chi2Inv(p, k) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    let lo = 0, hi = 1e6;
    for (let i = 0; i < 220; i++) {
      const mid = (lo + hi) / 2;
      if (chi2CDF(mid, k) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* =======================================================
     六、二项分布 / 泊松分布（传播研究常见离散分布）
     ======================================================= */

  function binomPMF(k, n, p) {
    if (k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1) +
      k * Math.log(p) + (n - k) * Math.log(1 - p));
  }
  function binomCDF(k, n, p) {
    k = Math.floor(k);
    if (k < 0) return 0;
    if (k >= n) return 1;
    let s = 0;
    for (let i = 0; i <= k; i++) s += binomPMF(i, n, p);
    return Math.min(1, s);
  }

  function poissonPMF(k, lam) {
    if (k < 0) return 0;
    return Math.exp(-lam + k * Math.log(lam) - logGamma(k + 1));
  }
  function poissonCDF(k, lam) {
    k = Math.floor(k);
    if (k < 0) return 0;
    let s = 0;
    for (let i = 0; i <= k; i++) s += poissonPMF(i, lam);
    return Math.min(1, s);
  }

  /* =======================================================
     七、描述统计
     ======================================================= */

  const sum = a => a.reduce((x, y) => x + y, 0);

  function mean(a) { return a.length ? sum(a) / a.length : NaN; }

  /** 排序副本 */
  function sorted(a) { return a.slice().sort((x, y) => x - y); }

  /** 分位数（R type-7 线性插值），q ∈ [0,1] */
  function quantile(a, q) {
    const s = sorted(a), n = s.length;
    if (!n) return NaN;
    if (n === 1) return s[0];
    const h = (n - 1) * q;
    const lo = Math.floor(h), hi = Math.ceil(h);
    return s[lo] + (h - lo) * (s[hi] - s[lo]);
  }

  function median(a) { return quantile(a, 0.5); }

  /** 众数（可能多个，返回数组） */
  function modes(a) {
    const m = new Map();
    a.forEach(v => m.set(v, (m.get(v) || 0) + 1));
    let best = 0;
    m.forEach(c => { if (c > best) best = c; });
    if (best <= 1) return [];
    const out = [];
    m.forEach((c, v) => { if (c === best) out.push(v); });
    return out.sort((x, y) => x - y);
  }

  /** 极差 */
  function range(a) { return a.length ? Math.max(...a) - Math.min(...a) : NaN; }

  /** 方差：ddof=1 样本方差（默认），ddof=0 总体方差 */
  function variance(a, ddof) {
    ddof = ddof === undefined ? 1 : ddof;
    const n = a.length;
    if (n - ddof <= 0) return NaN;
    const m = mean(a);
    return a.reduce((s, v) => s + (v - m) * (v - m), 0) / (n - ddof);
  }
  function sd(a, ddof) { return Math.sqrt(variance(a, ddof)); }

  /** 平均绝对偏差 */
  function mad(a) {
    const m = mean(a);
    return a.length ? a.reduce((s, v) => s + Math.abs(v - m), 0) / a.length : NaN;
  }

  /** 变异系数 CV = s / x̄ */
  function cv(a) { const m = mean(a); return m === 0 ? NaN : sd(a) / m; }

  /** 标准误 SE = s / √n */
  function sem(a) { return sd(a) / Math.sqrt(a.length); }

  /** 偏度（样本 g1 与总体 G1） */
  function skewness(a, population) {
    const n = a.length, m = mean(a), s = sd(a, population ? 0 : 1);
    if (!n || s === 0) return 0;
    const g1 = a.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0) / n;
    if (population) return g1;
    return g1 * Math.sqrt(n * (n - 1)) / (n - 2);
  }

  /** 超额峰度（正态为 0） */
  function kurtosis(a, population) {
    const n = a.length, m = mean(a), s = sd(a, population ? 0 : 1);
    if (!n || s === 0) return 0;
    const g2 = a.reduce((acc, v) => acc + Math.pow((v - m) / s, 4), 0) / n - 3;
    if (population) return g2;
    return ((n + 1) * g2 + 6) * (n - 1) / ((n - 2) * (n - 3));
  }

  /** 偏度 / 峰度的标准误（用于正态性粗略判断） */
  function skewSE(n) { return Math.sqrt(6 * n * (n - 1) / ((n - 2) * (n + 1) * (n + 3))); }
  function kurtSE(n) { return 2 * skewSE(n) * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5))); }

  /** 四分位与箱线图五数概括 + 离群点（1.5×IQR 规则） */
  function boxStats(a) {
    const s = sorted(a), n = s.length;
    if (!n) return null;
    const q1 = quantile(a, 0.25), q2 = quantile(a, 0.5), q3 = quantile(a, 0.75);
    const iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const mild = [], extreme = [];
    s.forEach(v => {
      if (v < q1 - 3 * iqr || v > q3 + 3 * iqr) extreme.push(v);
      else if (v < loF || v > hiF) mild.push(v);
    });
    const inliers = s.filter(v => v >= loF && v <= hiF);
    return {
      n, min: s[0], max: s[n - 1], q1, q2, q3, iqr,
      lf: loF, uf: hiF,
      whiskerLo: inliers.length ? inliers[0] : q1,
      whiskerHi: inliers.length ? inliers[inliers.length - 1] : q3,
      outliers: mild.concat(extreme),   // 全部离群点
      mild, extreme,
      mean: mean(a), sd: sd(a)
    };
  }

  /** z 分数 */
  function zScores(a, mu, sigma) {
    const m = mu === undefined ? mean(a) : mu;
    const s = sigma === undefined ? sd(a) : sigma;
    return a.map(v => (v - m) / s);
  }

  /** 直方图分组 */
  function histogram(a, nbins) {
    if (!a.length) return { edges: [], counts: [], density: [] };
    const mn = Math.min(...a), mx = Math.max(...a);
    let k = nbins || Math.ceil(Math.sqrt(a.length)) || 1;
    if (mx === mn) k = 1;
    const w = (mx - mn) / k || 1;
    const edges = [];
    for (let i = 0; i <= k; i++) edges.push(mn + i * w);
    const counts = new Array(k).fill(0);
    a.forEach(v => {
      let idx = Math.floor((v - mn) / w);
      if (idx >= k) idx = k - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    });
    const n = a.length;
    return { edges, counts, width: w, density: counts.map(c => c / (n * w)) };
  }

  /** 数据完整摘要 */
  function describe(a) {
    if (!a || !a.length) return null;
    return {
      n: a.length, sum: sum(a), mean: mean(a), median: median(a),
      mode: modes(a), min: Math.min(...a), max: Math.max(...a),
      range: range(a), q1: quantile(a, 0.25), q3: quantile(a, 0.75),
      iqr: quantile(a, 0.75) - quantile(a, 0.25),
      variance: variance(a), sd: sd(a), sd0: sd(a, 0),
      mad: mad(a), cv: cv(a), sem: sem(a),
      skew: skewness(a), kurt: kurtosis(a)
    };
  }

  /* =======================================================
     八、相关分析
     ======================================================= */

  function cov(x, y, ddof) {
    ddof = ddof === undefined ? 1 : ddof;
    const n = x.length, mx = mean(x), my = mean(y);
    if (n - ddof <= 0) return NaN;
    let s = 0;
    for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
    return s / (n - ddof);
  }

  /** 皮尔逊积矩相关系数 */
  function pearson(x, y) {
    const n = x.length;
    if (n < 2) return NaN;
    const mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx, dy = y[i] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0 || syy === 0) return NaN;
    return sxy / Math.sqrt(sxx * syy);
  }

  /** 秩（平均秩处理并列） */
  function ranks(a) {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(a.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  }

  /** 斯皮尔曼等级相关 */
  function spearman(x, y) { return pearson(ranks(x), ranks(y)); }

  /** 肯德尔 tau-b */
  function kendall(x, y) {
    const n = x.length;
    let nc = 0, nd = 0, tx = 0, ty = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = x[i] - x[j], dy = y[i] - y[j];
        if (dx === 0 && dy === 0) continue;
        if (dx === 0) { ty++; continue; }
        if (dy === 0) { tx++; continue; }
        if (dx * dy > 0) nc++; else nd++;
      }
    }
    const d = Math.sqrt((nc + nd + tx) * (nc + nd + ty));
    return d === 0 ? NaN : (nc - nd) / d;
  }

  /** 相关系数的 t 检验：H0: ρ = 0 */
  function corrTest(r, n) {
    if (Math.abs(r) >= 1) return { t: Infinity, df: n - 2, p: 0 };
    const df = n - 2;
    const t = r * Math.sqrt(df / (1 - r * r));
    const p = 2 * (1 - tCDF(Math.abs(t), df));
    return { t, df, p };
  }

  /** Fisher z 变换的置信区间 */
  function corrCI(r, n, alpha) {
    alpha = alpha || 0.05;
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const sez = 1 / Math.sqrt(n - 3);
    const zc = normalInv(1 - alpha / 2);
    const lo = z - zc * sez, hi = z + zc * sez;
    const back = v => (Math.exp(2 * v) - 1) / (Math.exp(2 * v) + 1);
    return { z, se: sez, lo: back(lo), hi: back(hi) };
  }

  /* =======================================================
     九、线性回归（一元 / 多元），最小二乘 + 矩阵求逆
     ======================================================= */

  /** 高斯-约当法求逆 */
  function invMatrix(M) {
    const n = M.length;
    const A = M.map((row, i) => row.concat(
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)));
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++)
        if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-12) return null; // 奇异矩阵
      [A[col], A[piv]] = [A[piv], A[col]];
      const pv = A[col][col];
      for (let j = 0; j < 2 * n; j++) A[col][j] /= pv;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = A[r][col];
        if (f === 0) continue;
        for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[col][j];
      }
    }
    return A.map(row => row.slice(n));
  }

  /** 多元最小二乘：y 一维数组，X 为二维数组（每行一个观测，不含截距列） */
  function ols(y, X) {
    const n = y.length;
    const Xd = X && X.length ? X : y.map(() => []);
    const p = Xd[0] ? Xd[0].length : 0;
    const k = p + 1;
    // 设计矩阵（首列常数项）
    const A = Xd.map(row => [1].concat(row));
    // X'X
    const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let a = 0; a < k; a++)
      for (let b = 0; b < k; b++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += A[i][a] * A[i][b];
        XtX[a][b] = s;
      }
    // X'y
    const Xty = new Array(k).fill(0);
    for (let a = 0; a < k; a++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += A[i][a] * y[i];
      Xty[a] = s;
    }
    const inv = invMatrix(XtX);
    if (!inv) return { ok: false, reason: "设计矩阵奇异（可能存在完全共线或变量恒定）" };
    const beta = new Array(k).fill(0);
    for (let a = 0; a < k; a++) {
      let s = 0;
      for (let b = 0; b < k; b++) s += inv[a][b] * Xty[b];
      beta[a] = s;
    }
    // 拟合值与残差
    const fitted = [], resid = [];
    for (let i = 0; i < n; i++) {
      let f = 0;
      for (let a = 0; a < k; a++) f += beta[a] * A[i][a];
      fitted.push(f);
      resid.push(y[i] - f);
    }
    const my = mean(y);
    const sst = y.reduce((s, v) => s + (v - my) * (v - my), 0);
    const sse = resid.reduce((s, v) => s + v * v, 0);
    const ssr = sst - sse;
    const dfE = n - k, dfR = p;
    const mse = sse / dfE;
    const se = Math.sqrt(mse);
    const r2 = sst === 0 ? NaN : 1 - sse / sst;
    const adjR2 = 1 - (1 - r2) * (n - 1) / dfE;
    // 系数标准误与显著性
    const coef = beta.map((b, a) => {
      const varb = mse * inv[a][a];
      const seb = Math.sqrt(varb);
      const t = seb === 0 ? NaN : b / seb;
      const p = 2 * (1 - tCDF(Math.abs(t), dfE));
      const tc = tInv(0.975, dfE);
      return { b, se: seb, t, p, lo: b - tc * seb, hi: b + tc * seb };
    });
    // 整体 F 检验
    const F = dfR === 0 || mse === 0 ? NaN : (ssr / dfR) / mse;
    const pF = isFinite(F) ? 1 - fCDF(F, dfR, dfE) : NaN;
    return {
      ok: true, beta, coef, fitted, resid, n, p, k,
      sst, ssr, sse, dfE, dfR, mse, se, r2, adjR2, F, pF,
      rmse: se, durbinWatson: dw(resid), XtXinv: inv
    };
  }

  /** 杜宾-沃森统计量（残差自相关诊断） */
  function dw(resid) {
    let num = 0, den = 0;
    for (let i = 1; i < resid.length; i++) num += Math.pow(resid[i] - resid[i - 1], 2);
    for (let i = 0; i < resid.length; i++) den += resid[i] * resid[i];
    return den === 0 ? NaN : num / den;
  }

  /** 一元回归的简化接口 */
  function olsSimple(x, y) {
    const r = ols(y, x.map(v => [v]));
    if (!r.ok) return r;
    r.r = pearson(x, y);
    r.slope = r.beta[1];
    r.intercept = r.beta[0];
    return r;
  }

  /* =======================================================
     十、方差分析 / 卡方检验
     ======================================================= */

  /** 单因素方差分析：groups 为二维数组（每个组一个数组） */
  function anova1(groups) {
    const k = groups.length;
    const ns = groups.map(g => g.length);
    const N = sum(ns);
    const means = groups.map(mean);
    const grand = sum(groups.map((g, i) => sum(g))) / N;
    let ssb = 0, ssw = 0;
    groups.forEach((g, i) => {
      ssb += ns[i] * Math.pow(means[i] - grand, 2);
      g.forEach(v => { ssw += Math.pow(v - means[i], 2); });
    });
    const dfB = k - 1, dfW = N - k;
    const msb = ssb / dfB, msw = ssw / dfW;
    const F = msw === 0 ? Infinity : msb / msw;
    const p = isFinite(F) ? 1 - fCDF(F, dfB, dfW) : 0;
    // 效应量
    const sst = ssb + ssw;
    const eta2 = sst === 0 ? 0 : ssb / sst;
    const omega2 = sst + msw === 0 ? 0 : (ssb - dfB * msw) / (sst + msw);
    const f2 = ssw === 0 ? Infinity : ssb / ssw;
    return {
      k, ns, N, means, grand, ssb, ssw, sst,
      dfB, dfW, msb, msw, F, p, eta2, omega2, f2,
      sd: groups.map(g => sd(g))
    };
  }

  /** 组间两两比较的临界差（LSD / Bonferroni） */
  function posthocLSD(a, groups, alpha) {
    alpha = alpha || 0.05;
    const tc = tInv(1 - alpha / 2, a.dfW);
    const out = [];
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const diff = a.means[i] - a.means[j];
        const se = Math.sqrt(a.msw * (1 / a.ns[i] + 1 / a.ns[j]));
        const t = diff / se;
        const p = 2 * (1 - tCDF(Math.abs(t), a.dfW));
        out.push({
          i, j, diff, se, t, p,
          lsd: tc * se,
          sig: Math.abs(diff) > tc * se,
          cohenD: a.msw === 0 ? NaN : diff / Math.sqrt(a.msw)
        });
      }
    return out;
  }

  /** 双因素方差分析（无重复）：需平衡设计 */
  function anova2(A, B, y) {
    const aLv = [...new Set(A)], bLv = [...new Set(B)];
    const a = aLv.length, b = bLv.length, N = y.length;
    if (a * b !== N) return { ok: false, reason: "双因素无重复方差分析要求平衡设计（每格一个观测）" };
    const grand = mean(y);
    const cell = {}; let ssA = 0, ssB = 0;
    const rowM = {}, colM = {};
    for (let i = 0; i < N; i++) {
      const key = A[i] + "|" + B[i];
      (cell[key] = cell[key] || []).push(y[i]);
    }
    aLv.forEach(al => {
      const vals = [];
      bLv.forEach(bl => { (cell[al + "|" + bl] || []).forEach(v => vals.push(v)); });
      rowM[al] = mean(vals);
      ssA += b * Math.pow(rowM[al] - grand, 2);
    });
    bLv.forEach(bl => {
      const vals = [];
      aLv.forEach(al => { (cell[al + "|" + bl] || []).forEach(v => vals.push(v)); });
      colM[bl] = mean(vals);
      ssB += a * Math.pow(colM[bl] - grand, 2);
    });
    let sst = 0; y.forEach(v => sst += Math.pow(v - grand, 2));
    let sse = 0;
    aLv.forEach(al => bLv.forEach(bl => {
      const g = cell[al + "|" + bl] || [];
      const m = mean(g);
      g.forEach(v => sse += Math.pow(v - m, 2));
    }));
    const dfA = a - 1, dfB = b - 1, dfE = (a - 1) * (b - 1);
    const msA = ssA / dfA, msB = ssB / dfB, msE = sse / dfE;
    const FA = msA / msE, FB = msB / msE;
    return {
      ok: true, aLv, bLv, a, b, N, grand, rowM, colM,
      ssA, ssB, sse, sst, dfA, dfB, dfE, msA, msB, msE,
      FA, FB, pA: 1 - fCDF(FA, dfA, dfE), pB: 1 - fCDF(FB, dfB, dfE),
      etaA: ssA / sst, etaB: ssB / sst
    };
  }

  /** 卡方独立性检验：obs 为二维列联表 */
  function chi2Test(obs) {
    const r = obs.length, c = obs[0].length;
    const rowS = obs.map(row => sum(row));
    const colS = [];
    for (let j = 0; j < c; j++) {
      let s = 0;
      for (let i = 0; i < r; i++) s += obs[i][j];
      colS.push(s);
    }
    const N = sum(rowS);
    const exp = obs.map((row, i) => row.map((_, j) => rowS[i] * colS[j] / N));
    let chi2 = 0, minExp = Infinity;
    const stdResid = obs.map((row, i) => row.map((o, j) => {
      const e = exp[i][j];
      minExp = Math.min(minExp, e);
      if (e > 0) chi2 += (o - e) * (o - e) / e;
      return e > 0 ? (o - e) / Math.sqrt(e) : 0;
    }));
    const df = (r - 1) * (c - 1);
    const p = 1 - chi2CDF(chi2, df);
    // 效应量
    const cramerV = N === 0 ? 0 : Math.sqrt(chi2 / (N * Math.min(r - 1, c - 1)));
    const phi = r === 2 && c === 2 && N ? Math.sqrt(chi2 / N) : null;
    // 成对性指标
    const cells = [];
    for (let i = 0; i < r; i++)
      for (let j = 0; j < c; j++) {
        const o = obs[i][j], e = exp[i][j];
        cells.push({
          i, j, o, e, diff: o - e,
          contrib: e > 0 ? (o - e) * (o - e) / e : 0,
          stdResid: e > 0 ? (o - e) / Math.sqrt(e) : 0
        });
      }
    return { r, c, N, rowS, colS, exp, chi2, df, p, cramerV, phi, stdResid, cells, minExp };
  }

  /** 卡方拟合优度检验 */
  function chi2GOF(obs, expected) {
    let chi2 = 0;
    for (let i = 0; i < obs.length; i++) {
      if (expected[i] > 0) chi2 += Math.pow(obs[i] - expected[i], 2) / expected[i];
    }
    const df = obs.length - 1;
    return { chi2, df, p: 1 - chi2CDF(chi2, df) };
  }

  /** 超几何分布 pmf：P(X = x)，边缘合计 r1/r2/c1/c2 与总数 n */
  function hyperPMF(x, r1, r2, c1, n) {
    const y = r1 - x, z = c1 - x, w = n - r1 - c1 + x;
    if (y < 0 || z < 0 || w < 0) return 0;
    const lp = logGamma(r1 + 1) + logGamma(r2 + 1) + logGamma(c1 + 1) + logGamma(n - c1 + 1) -
      logGamma(n + 1) - logGamma(x + 1) - logGamma(y + 1) - logGamma(z + 1) - logGamma(w + 1);
    return Math.exp(lp);
  }

  /**
   * Fisher 精确检验（2×2 列联表 a b / c d）
   * 固定边缘合计，枚举所有可能的表，双尾 p = 所有 p ≤ p(观测表) 的表概率之和
   */
  function fisher22(a, b, c, d) {
    const n = a + b + c + d;
    const r1 = a + b, r2 = c + d, c1 = a + c;
    const pObs = hyperPMF(a, r1, r2, c1, n);
    const aMin = Math.max(0, c1 - r2), aMax = Math.min(r1, c1);
    let pTwo = 0, pLess = 0, pMore = 0;
    for (let x = aMin; x <= aMax; x++) {
      const p = hyperPMF(x, r1, r2, c1, n);
      if (p <= pObs * (1 + 1e-9)) pTwo += p;
      if (x <= a) pLess += p; else pMore += p;
    }
    return { pTwo: Math.min(1, pTwo), pLess, pMore, pObs };
  }

  /* =======================================================
     十一、信度与效度
     ======================================================= */

  /** Cronbach's α：items 为二维数组（行=被试，列=题项） */
  function cronbachAlpha(items) {
    const n = items.length;
    if (!n) return { alpha: NaN };
    const k = items[0].length;
    const itemVar = [];
    for (let j = 0; j < k; j++) itemVar.push(variance(items.map(r => r[j])));
    const totals = items.map(r => sum(r));
    const totalVar = variance(totals);
    const sumItemVar = sum(itemVar);
    if (totalVar === 0) return { alpha: NaN };
    const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar);
    // 项目-总分相关（校正后）
    const itemTotal = [];
    for (let j = 0; j < k; j++) {
      const rest = items.map(r => sum(r) - r[j]);
      const col = items.map(r => r[j]);
      itemTotal.push(pearson(col, rest));
    }
    // 删除该题后的 α
    const alphaIfDeleted = [];
    for (let j = 0; j < k; j++) {
      const sub = items.map(r => r.filter((_, jj) => jj !== j));
      const kk = k - 1;
      const sv = [];
      for (let jj = 0; jj < kk; jj++) sv.push(variance(sub.map(r => r[jj])));
      const tv = variance(sub.map(r => sum(r)));
      alphaIfDeleted.push(tv === 0 ? NaN : (kk / (kk - 1)) * (1 - sum(sv) / tv));
    }
    // Spearman-Brown 折半信度（奇偶折半）
    const odd = items.map(r => sum(r.filter((_, j) => j % 2 === 0)));
    const even = items.map(r => sum(r.filter((_, j) => j % 2 === 1)));
    const rh = Math.abs(pearson(odd, even));
    const sb = 2 * rh / (1 + rh);
    return { alpha, k, n, itemVar, totalVar, itemTotal, alphaIfDeleted, splitHalf: sb };
  }

  /* =======================================================
     十二、非参数检验
     ======================================================= */

  /** Mann-Whitney U 检验（含正态近似与连续性校正） */
  function mannWhitney(x, y) {
    const n1 = x.length, n2 = y.length;
    const all = ranks(x.concat(y));
    const r1 = sum(all.slice(0, n1));
    const U1 = r1 - n1 * (n1 + 1) / 2;
    const U2 = n1 * n2 - U1;
    const U = Math.min(U1, U2);
    const muU = n1 * n2 / 2;
    const sdU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    const z = sdU === 0 ? 0 : (U - muU + Math.sign(muU - U) * 0.5) / sdU;
    return {
      U, U1, U2, n1, n2, muU, sdU, z,
      p: 2 * (1 - normalCDF(Math.abs(z))),
      rankMean1: r1 / n1, rankMean2: (sum(all.slice(n1)) / n2)
    };
  }

  /** Wilcoxon 符号秩检验（配对） */
  function wilcoxonSigned(d) {
    const diffs = d.filter(v => v !== 0);
    const n = diffs.length;
    if (!n) return { W: 0, n: 0, p: 1 };
    const r = ranks(diffs.map(Math.abs));
    let Wp = 0, Wm = 0;
    diffs.forEach((v, i) => { if (v > 0) Wp += r[i]; else Wm += r[i]; });
    const W = Math.min(Wp, Wm);
    const mu = n * (n + 1) / 4;
    const sdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
    const z = sdW === 0 ? 0 : (W - mu + 0.5) / sdW;
    return { W, Wp, Wm, n, mu, sdW, z, p: 2 * (1 - normalCDF(Math.abs(z))) };
  }

  /** Kruskal-Wallis H 检验 */
  function kruskalWallis(groups) {
    const all = [];
    const tag = [];
    groups.forEach((g, gi) => g.forEach(v => { all.push(v); tag.push(gi); }));
    const N = all.length;
    const r = ranks(all);
    const R = groups.map(() => 0);
    r.forEach((v, i) => { R[tag[i]] += v; });
    const ns = groups.map(g => g.length);
    let H = 0;
    for (let i = 0; i < groups.length; i++) H += R[i] * R[i] / ns[i];
    H = 12 / (N * (N + 1)) * H - 3 * (N + 1);
    const df = groups.length - 1;
    return { H, df, p: 1 - chi2CDF(H, df), rankMean: R.map((v, i) => v / ns[i]) };
  }

  /** 符号检验 */
  function signTest(d) {
    const pos = d.filter(v => v > 0).length;
    const neg = d.filter(v => v < 0).length;
    const n = pos + neg;
    if (!n) return { positives: 0, negatives: 0, n: 0, p: 1 };
    const k = Math.min(pos, neg);
    let p = 0;
    for (let i = 0; i <= k; i++) p += binomPMF(i, n, 0.5);
    return { positives: pos, negatives: neg, n, p: Math.min(1, 2 * p) };
  }

  /* =======================================================
     十三、功效分析与样本量
     ======================================================= */

  /** 单样本 t 检验功效 */
  function powerT1(d, n, alpha, tail) {
    alpha = alpha || 0.05; tail = tail || "two";
    if (n < 2) return 0;
    const df = n - 1;
    const ncp = d * Math.sqrt(n);
    const tcrit = tInv(1 - (tail === "two" ? alpha / 2 : alpha), df);
    // 用非中心 t 的正态近似（教学演示足够精确）
    const approx = z => normalCDF((ncp - z));
    return tail === "two" ? approx(tcrit) + normalCDF(-tcrit - ncp) : approx(tcrit);
  }

  /** 达到目标功效所需样本量（两样本 t 检验，Cohen 近似） */
  function nForPower(d, power, alpha, tail) {
    power = power || 0.8; alpha = alpha || 0.05; tail = tail || "two";
    const zA = normalInv(1 - (tail === "two" ? alpha / 2 : alpha));
    const zB = normalInv(power);
    return Math.ceil(2 * Math.pow(zA + zB, 2) / (d * d));
  }

  /** Cohen's d */
  function cohenD(m1, m2, s) { return s === 0 ? NaN : (m1 - m2) / s; }

  /** 合并标准差 */
  function pooledSD(s1, n1, s2, n2) {
    const df = n1 + n2 - 2;
    return df <= 0 ? NaN : Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / df);
  }

  /** 独立样本 t 检验（含 Welch 校正选项） */
  function tTest2(x, y, welch) {
    const n1 = x.length, n2 = y.length;
    const m1 = mean(x), m2 = mean(y), s1 = sd(x), s2 = sd(y);
    if (welch) {
      const se = Math.sqrt(s1 * s1 / n1 + s2 * s2 / n2);
      const df = Math.pow(s1 * s1 / n1 + s2 * s2 / n2, 2) /
        (Math.pow(s1 * s1 / n1, 2) / (n1 - 1) + Math.pow(s2 * s2 / n2, 2) / (n2 - 1));
      const t = (m1 - m2) / se;
      return {
        t, df, se, m1, m2, diff: m1 - m2, p: 2 * (1 - tCDF(Math.abs(t), df)),
        cohenD: cohenD(m1, m2, Math.sqrt((s1 * s1 + s2 * s2) / 2)), welch: true
      };
    }
    const sp = pooledSD(s1, n1, s2, n2);
    const se = sp * Math.sqrt(1 / n1 + 1 / n2);
    const t = (m1 - m2) / se;
    const df = n1 + n2 - 2;
    return {
      t, df, se, sp, m1, m2, diff: m1 - m2, p: 2 * (1 - tCDF(Math.abs(t), df)),
      cohenD: cohenD(m1, m2, sp), welch: false
    };
  }

  /** 单样本 t 检验 */
  function tTest1(x, mu0) {
    const n = x.length, m = mean(x), s = sd(x);
    const se = s / Math.sqrt(n), df = n - 1;
    const t = (m - mu0) / se;
    const tc = tInv(0.975, df);
    return {
      n, m, s, se, df, t, mu0,
      pTwo: 2 * (1 - tCDF(Math.abs(t), df)),
      pLess: tCDF(t, df),
      pGreater: 1 - tCDF(t, df),
      cohenD: s === 0 ? NaN : (m - mu0) / s,
      lo: m - mu0 - tc * se, hi: m - mu0 + tc * se
    };
  }

  /** 配对样本 t 检验 */
  function tTestPaired(x, y) {
    const d = x.map((v, i) => v - y[i]);
    const r = tTest1(d, 0);
    r.diffs = d; r.meanDiff = mean(d);
    return r;
  }

  /** 样本量估算：比例的置信区间 */
  function nForProportion(p, e, alpha) {
    alpha = alpha || 0.05;
    const z = normalInv(1 - alpha / 2);
    return Math.ceil(z * z * p * (1 - p) / (e * e));
  }

  /* =======================================================
     十四、随机数（可设种子，保证教学演示可复现）
     ======================================================= */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    this._r = mulberry32(seed === undefined ? 20260911 : seed);
    this._spare = null;
  }
  RNG.prototype.uniform = function (a, b) {
    a = a === undefined ? 0 : a; b = b === undefined ? 1 : b;
    return a + (b - a) * this._r();
  };
  RNG.prototype.int = function (a, b) { return Math.floor(this.uniform(a, b + 1)); };
  /** Box-Muller 标准正态 */
  RNG.prototype.normal = function (mu, sigma) {
    mu = mu === undefined ? 0 : mu; sigma = sigma === undefined ? 1 : sigma;
    if (this._spare !== null) {
      const v = this._spare; this._spare = null; return mu + sigma * v;
    }
    let u = 0, v = 0, s = 0;
    do {
      u = this._r() * 2 - 1; v = this._r() * 2 - 1; s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    this._spare = v * m;
    return mu + sigma * (u * m);
  };
  RNG.prototype.exponential = function (lam) {
    lam = lam || 1;
    return -Math.log(1 - this._r()) / lam;
  };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this._r() * arr.length)]; };
  /** 无放回抽样 */
  RNG.prototype.sample = function (arr, k) {
    const c = arr.slice();
    const out = [];
    k = Math.min(k, c.length);
    for (let i = 0; i < k; i++) {
      const j = Math.floor(this._r() * c.length);
      out.push(c.splice(j, 1)[0]);
    }
    return out;
  };
  /** 有放回抽样 */
  RNG.prototype.resample = function (arr, k) {
    const out = [];
    for (let i = 0; i < k; i++) out.push(arr[Math.floor(this._r() * arr.length)]);
    return out;
  };
  /** 从给定均值/标准差的正态总体生成样本 */
  RNG.prototype.normalSample = function (n, mu, sigma) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(this.normal(mu, sigma));
    return out;
  };
  /** 生成指定偏态的经验分布样本（对数正态）—— 用于展示长尾数据 */
  RNG.prototype.lognormalSample = function (n, mu, sigma) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.exp(this.normal(mu, sigma)));
    return out;
  };

  const rng = new RNG(20260911);

  /* =======================================================
     十五、格式与工具
     ======================================================= */

  const fmt = {
    n: (v, d) => (v === null || v === undefined || !isFinite(v)) ? "—" : (+v).toFixed(d === undefined ? 2 : d),
    p: (v) => {
      if (v === null || v === undefined || isNaN(v)) return "—";
      if (v < 0.0001 && v > 0) return v.toExponential(2);
      return (+v).toFixed(4);
    },
    /** 论文规范：p < .001 或 = .032 */
    pApa: (v) => (v < 0.001 ? "< .001" : (+v).toFixed(3).replace(/^0/, "")),
    /** 负号统一为 Unicode 减号 */
    num: (v, d) => (v === null || v === undefined || !isFinite(v)) ? "—"
      : (+v).toFixed(d === undefined ? 2 : d).replace(/-/g, "\u2212"),
    pct: (v, d) => isFinite(v) ? (v * 100).toFixed(d === undefined ? 1 : d) + "%" : "—",
    /** 效应量口语化 */
    effect: (v, type) => {
      const a = Math.abs(v);
      if (!isFinite(a)) return "—";
      if (type === "d") return a >= 0.8 ? "大" : a >= 0.5 ? "中等" : a >= 0.2 ? "小" : "几乎可忽略";
      if (type === "r") return a >= 0.5 ? "强" : a >= 0.3 ? "中等" : a >= 0.1 ? "弱" : "几乎可忽略";
      if (type === "v") return a >= 0.5 ? "强" : a >= 0.3 ? "中等" : a >= 0.1 ? "弱" : "几乎可忽略";
      if (type === "eta") return a >= 0.14 ? "大" : a >= 0.06 ? "中等" : a >= 0.01 ? "小" : "几乎可忽略";
      return "";
    }
  };

  /** 安全数组解析：把 "1,2,3" / 换行 / 制表符分隔的文本变成数字数组 */
  function parseNumbers(text) {
    return String(text)
      .split(/[\s,，;；\t]+/)
      .map(s => s.trim())
      .filter(s => s.length)
      .map(Number)
      .filter(v => isFinite(v));
  }

  /** 简易线性同余的洗牌 */
  function shuffle(arr, r) {
    const a = arr.slice();
    const rand = r || rng;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand.uniform(0, 1) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* =======================================================
     导出
     ======================================================= */
  const ST = {
    // 特殊函数
    logGamma, factorial, betai, gammaP, gammaQ,
    // 正态
    normalPDF, normalCDF, normalInv,
    // t
    tPDF, tCDF, tInv,
    // F
    fPDF, fCDF, fInv,
    // 卡方
    chi2PDF, chi2CDF, chi2Inv,
    // 离散分布
    binomPMF, binomCDF, poissonPMF, poissonCDF,
    // 描述统计
    sum, mean, median, modes, sorted, quantile, range, variance, sd, mad, cv, sem,
    skewness, kurtosis, skewSE, kurtSE, boxStats, zScores, histogram, describe,
    // 相关
    cov, pearson, spearman, kendall, ranks, corrTest, corrCI,
    // 回归
    invMatrix, ols, olsSimple, dw,
    // 方差分析与卡方
    anova1, anova2, posthocLSD, chi2Test, chi2GOF, fisher22,
    // 信度
    cronbachAlpha,
    // 非参数
    mannWhitney, wilcoxonSigned, kruskalWallis, signTest,
    // 功效
    powerT1, nForPower, cohenD, pooledSD, tTest1, tTest2, tTestPaired, nForProportion,
    // 随机
    RNG, rng, shuffle,
    // 工具
    fmt, parseNumbers
  };

  global.ST = ST;
  if (typeof module !== "undefined" && module.exports) module.exports = ST;

})(typeof window !== "undefined" ? window : globalThis);
