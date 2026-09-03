/* 梅花易数起卦与解卦引擎：时间起卦 / 数字起卦 / 铜钱六爻 → 本卦、变卦、互卦、体用生克。
   爻序自下而上 1..6；lines 数组 index 0 = 初爻。 */
(function (root) {
  'use strict';
  const G = root.Ganzhi || require('./ganzhi.js');
  const D = root.YijingData || require('./yijing-data.js');

  const byName = {};
  D.TRIGRAMS.forEach((t) => { byName[t.name] = t; });

  /** 先天卦数取余：余 0 作 8（坤） */
  function trigramByNumber(n) {
    const r = ((n % 8) + 8) % 8;
    return D.TRIGRAMS[(r === 0 ? 8 : r) - 1];
  }

  function trigramFromLines(three) {
    return D.TRIGRAMS.find((t) => t.lines.every((v, i) => v === three[i]));
  }

  /** 六爻 → 卦对象（含上下卦） */
  function hexagramFromLines(lines) {
    const low = trigramFromLines(lines.slice(0, 3));
    const up = trigramFromLines(lines.slice(3, 6));
    const h = D.HEXAGRAMS[up.name + low.name];
    return { ...h, upper: up, lower: low, lines: lines.slice() };
  }

  function movingIndex(total) {
    const r = total % 6;
    return r === 0 ? 6 : r;
  }

  function compose(upper, lower, moving) {
    const lines = lower.lines.concat(upper.lines);
    return { upper, lower, moving, lines, hex: hexagramFromLines(lines) };
  }

  /** 时间起卦：年支数(子1)+农历月+农历日 → 上卦；再加时辰数(子1) → 下卦；总和 → 动爻 */
  function castByTime({ yearZhiIndex, lunarMonth, lunarDay, hourZhiIndex }) {
    const y = yearZhiIndex + 1;
    const h = hourZhiIndex + 1;
    const m = Math.abs(lunarMonth);
    const a = y + m + lunarDay;
    const b = a + h;
    const c = compose(trigramByNumber(a), trigramByNumber(b), movingIndex(b));
    c.formula = `上卦 (${y}+${m}+${lunarDay})÷8 余 → ${c.upper.name}；下卦 (${y}+${m}+${lunarDay}+${h})÷8 余 → ${c.lower.name}；动爻 ${b}÷6 余 → ${c.moving}`;
    return c;
  }

  /** 数字起卦：1 个数拆前后半；2 个数上下卦、和数取动爻；3 个数第三数取动爻 */
  function castByNumbers(nums) {
    let a, b, mv;
    if (nums.length === 1) {
      const s = String(Math.abs(nums[0]));
      const cut = Math.ceil(s.length / 2);
      a = parseInt(s.slice(0, cut), 10);
      b = parseInt(s.slice(cut) || s.slice(0, cut), 10);
      mv = a + b;
    } else if (nums.length === 2) {
      [a, b] = nums; mv = a + b;
    } else {
      [a, b] = nums; mv = nums[2];
    }
    const c = compose(trigramByNumber(a), trigramByNumber(b), movingIndex(mv));
    c.formula = `上卦 ${a}÷8 余 → ${c.upper.name}；下卦 ${b}÷8 余 → ${c.lower.name}；动爻 ${mv}÷6 余 → ${c.moving}`;
    return c;
  }

  /** 三枚铜钱背面数 → 爻。0 背老阴、1 背少阳、2 背少阴、3 背老阳 */
  function coinsToLine(backs) {
    return [
      { yang: 0, moving: true, label: '老阴' },
      { yang: 1, moving: false, label: '少阳' },
      { yang: 0, moving: false, label: '少阴' },
      { yang: 1, moving: true, label: '老阳' },
    ][backs];
  }

  /** 六次摇卦结果 → 卦。tosses: [{yang, moving}] 自初爻起 */
  function castByCoins(tosses) {
    const lines = tosses.map((t) => t.yang);
    const moving = tosses.map((t, i) => (t.moving ? i + 1 : 0)).filter(Boolean);
    return { lines, movingList: moving, moving: moving.length ? moving[moving.length - 1] : 0, hex: hexagramFromLines(lines) };
  }

  const REL_TEXT = {
    用生体: '用卦生体卦，外力来助，事顺可成。',
    比和: '体用比和，同气相求，平顺无阻。',
    体克用: '体克用，事可成但要自己出力，费心费力得小利。',
    体生用: '体生用，我方耗泄，付出多回报慢，宜节制投入。',
    用克体: '用克体，外力压身，阻力大，宜守不宜进。',
  };

  function relationOf(yongWx, tiWx) {
    const r = G.wxRelation(yongWx, tiWx);
    return { same: '比和', sheng: '用生体', ke: '用克体', beisheng: '体生用', beike: '体克用' }[r];
  }

  /**
   * 解卦：给定六爻与动爻列表，返回本卦/变卦/互卦/体用。
   * 多个动爻取最上一爻定体用（梅花本法只取一爻，六爻摇卦多动时的简化约定）。
   */
  function analyze(lines, movingList) {
    const ben = hexagramFromLines(lines);
    const bianLines = lines.map((v, i) => (movingList.includes(i + 1) ? 1 - v : v));
    const bian = hexagramFromLines(bianLines);
    const hu = hexagramFromLines([lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]]);
    const mv = movingList.length ? movingList[movingList.length - 1] : 0;
    const yongIsLower = mv >= 1 && mv <= 3;
    const yong = yongIsLower ? ben.lower : ben.upper;
    const ti = yongIsLower ? ben.upper : ben.lower;
    const relation = mv ? relationOf(yong.wx, ti.wx) : '比和';
    const bianYong = yongIsLower ? bian.lower : bian.upper;
    const bianRel = mv ? relationOf(bianYong.wx, ti.wx) : '比和';
    const huRel = { lower: relationOf(hu.lower.wx, ti.wx), upper: relationOf(hu.upper.wx, ti.wx) };
    return {
      ben, bian, hu, ti, yong, moving: mv, movingList: movingList.slice(), relation,
      relationText: REL_TEXT[relation], bianYong, bianRel, bianRelText: REL_TEXT[bianRel], huRel,
      isStatic: !mv,
    };
  }

  const API = { trigramByNumber, hexagramFromLines, castByTime, castByNumbers, coinsToLine, castByCoins, analyze, REL_TEXT, byName };
  root.Meihua = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
