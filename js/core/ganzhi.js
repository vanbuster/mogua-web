/* 干支基础表与纯函数：五行、阴阳、藏干、十神、地支关系。
   浏览器挂 window.Ganzhi，Node 走 module.exports，两边共用。 */
(function (root) {
  'use strict';

  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const WX = ['木', '火', '土', '金', '水'];
  const WX_CLS = { 木: 'mu', 火: 'huo', 土: 'tu', 金: 'jin', 水: 'shui' };
  const WX_DIR = { 木: '东', 火: '南', 土: '中', 金: '西', 水: '北' };
  const WX_COLOR = { 木: '青绿', 火: '赤红', 土: '黄褐', 金: '白金', 水: '玄黑' };

  const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  // 阴阳：甲丙戊庚壬阳；子寅辰午申戌阳
  const GAN_YANG = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 };
  const ZHI_YANG = { 子: 1, 丑: 0, 寅: 1, 卯: 0, 辰: 1, 巳: 0, 午: 1, 未: 0, 申: 1, 酉: 0, 戌: 1, 亥: 0 };
  const SHENGXIAO = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };

  // 地支藏干：[本气, 中气, 余气]，权重 0.6 / 0.3 / 0.1
  const HIDDEN = {
    子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
    辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
    申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
  };
  const HIDDEN_W = [0.6, 0.3, 0.1];

  // 五行生克：生 木→火→土→金→水→木；克 木→土→水→火→金→木
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

  /** 五行 a 对 b 的关系：same / sheng(a生b) / beisheng(b生a) / ke(a克b) / beike(b克a) */
  function wxRelation(a, b) {
    if (a === b) return 'same';
    if (SHENG[a] === b) return 'sheng';
    if (SHENG[b] === a) return 'beisheng';
    if (KE[a] === b) return 'ke';
    return 'beike';
  }

  /** 以日干为准求某天干的十神 */
  function shiShen(dayGan, gan) {
    const rel = wxRelation(GAN_WX[dayGan], GAN_WX[gan]);
    const same = GAN_YANG[dayGan] === GAN_YANG[gan];
    switch (rel) {
      case 'same': return same ? '比肩' : '劫财';
      case 'sheng': return same ? '食神' : '伤官';
      case 'ke': return same ? '偏财' : '正财';
      case 'beike': return same ? '七杀' : '正官';
      default: return same ? '偏印' : '正印';
    }
  }

  const SHISHEN_GROUP = {
    比肩: '比劫', 劫财: '比劫', 食神: '食伤', 伤官: '食伤', 偏财: '财星', 正财: '财星',
    七杀: '官杀', 正官: '官杀', 偏印: '印星', 正印: '印星',
  };

  /** 十神分组对应的五行（相对日干） */
  function groupWx(dayGan) {
    const me = GAN_WX[dayGan];
    return { 比劫: me, 食伤: SHENG[me], 财星: KE[me], 官杀: WX.find((w) => KE[w] === me), 印星: WX.find((w) => SHENG[w] === me) };
  }

  /** 四柱五行加权量化（天干 1.0，藏干 0.6/0.3/0.1），返回百分比对象 */
  function wuxingWeights(pillars) {
    const sum = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach((p) => {
      if (!p) return;
      sum[GAN_WX[p.gan]] += 1;
      HIDDEN[p.zhi].forEach((g, i) => { sum[GAN_WX[g]] += HIDDEN_W[i]; });
    });
    const total = WX.reduce((a, w) => a + sum[w], 0) || 1;
    // 最大余数法取整，保证五项之和恰为 100
    const exact = WX.map((w) => (sum[w] / total) * 100);
    const floors = exact.map(Math.floor);
    let rest = 100 - floors.reduce((a, b) => a + b, 0);
    const order = exact.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < order.length && rest > 0; k++, rest--) floors[order[k][1]] += 1;
    const pct = {};
    WX.forEach((w, i) => { pct[w] = floors[i]; });
    return { raw: sum, pct };
  }

  // 地支关系
  const LIUCHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
  const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  const LIUHAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
  const SANHE = [['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金']];
  const XING_PAIRS = [['寅', '巳'], ['巳', '申'], ['申', '寅'], ['丑', '戌'], ['戌', '未'], ['未', '丑'], ['子', '卯']];
  const ZIXING = ['辰', '午', '酉', '亥'];

  /** 两地支的关系列表：冲 / 合 / 害 / 刑 / 半合 */
  function zhiRelation(a, b) {
    const r = [];
    if (LIUCHONG[a] === b) r.push('冲');
    if (LIUHE[a] === b) r.push('六合');
    if (LIUHAI[a] === b) r.push('害');
    if (a === b && ZIXING.includes(a)) r.push('自刑');
    if (XING_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) r.push('刑');
    if (a !== b) {
      const ju = SANHE.find((s) => s.includes(a) && s.includes(b));
      if (ju) r.push('半合' + ju[3]);
    }
    return r;
  }

  const API = {
    GAN, ZHI, WX, WX_CLS, WX_DIR, WX_COLOR, GAN_WX, ZHI_WX, GAN_YANG, ZHI_YANG, SHENGXIAO,
    HIDDEN, HIDDEN_W, SHENG, KE, SHISHEN_GROUP, LIUCHONG, LIUHE, LIUHAI, SANHE,
    wxRelation, shiShen, groupWx, wuxingWeights, zhiRelation,
    clsOfGan: (g) => WX_CLS[GAN_WX[g]],
    clsOfZhi: (z) => WX_CLS[ZHI_WX[z]],
  };
  root.Ganzhi = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
