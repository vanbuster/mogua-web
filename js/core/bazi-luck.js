/* 流年流月红绿灯 + 神煞。依赖 Ganzhi。纯函数，输入原局，输出可渲染的判断。 */
(function (root) {
  'use strict';
  const G = root.Ganzhi || require('./ganzhi.js');

  const POS_NAME = ['年支', '月令', '日支', '时支'];
  const POS_WEIGHT = [1, 2, 2, 1];

  /** 某一流运干支对原局的冲合评分与说明 */
  function judge(gan, zhi, chart) {
    let score = 0;
    const notes = [];
    chart.pillars.forEach((p, i) => {
      if (!p) return;
      G.zhiRelation(zhi, p.zhi).forEach((r) => {
        if (r === '冲') { score -= POS_WEIGHT[i]; notes.push(`${zhi}${p.zhi}冲${POS_NAME[i]}`); }
        else if (r === '六合') { score += 1; notes.push(`${zhi}${p.zhi}合${POS_NAME[i]}`); }
        else if (r.startsWith('半合')) { score += 0.5; notes.push(`${zhi}${p.zhi}${r}`); }
        else if (r === '害' || r === '刑' || r === '自刑') { score -= 0.5; notes.push(`${zhi}${p.zhi}${r}`); }
      });
    });
    const god = G.shiShen(chart.dayGan, gan);
    const zhiGod = G.shiShen(chart.dayGan, G.HIDDEN[zhi][0]);
    const gw = G.GAN_WX[gan];
    const zw = G.ZHI_WX[zhi];
    if (chart.strength.favor.includes(gw)) score += 0.5;
    if (chart.strength.avoid.includes(gw)) score -= 0.5;
    if (chart.strength.favor.includes(zw)) score += 0.5;
    if (chart.strength.avoid.includes(zw)) score -= 0.5;
    // 经典凶象：伤官见官、七杀攻身（身弱）
    const gods = chart.pillars.filter(Boolean).map((p) => p.god);
    if (god === '正官' && gods.includes('伤官')) { score -= 1; notes.push('伤官见官'); }
    if (god === '七杀' && chart.strength.level === '身弱') { score -= 1; notes.push('七杀攻身'); }
    const level = score >= 1 ? 'g' : score <= -1 ? 'r' : 'y';
    const tone = level === 'g' ? '宜进' : level === 'r' ? '宜守' : '平稳';
    return { score, level, god, zhiGod, notes, note: notes[0] || `${god}·${tone}` };
  }

  // ---- 神煞（常用七种，按查法表） ----
  const YIMA = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };
  const TAOHUA = { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' };
  const HUAGAI = { 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 巳: '丑', 酉: '丑', 丑: '丑', 亥: '未', 卯: '未', 未: '未' };
  const TIANYI = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' };
  const WENCHANG = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
  const YANGREN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
  const LUSHEN = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };

  const SHENSHA_DESC = {
    驿马: '命带驿马，主奔波迁动，换城市、出差、远行之象多；驿马逢冲则动得更急。',
    桃花: '命带桃花，人缘与异性缘偏旺，社交场合容易被注意到，感情机会多也需分辨。',
    华盖: '命带华盖，偏爱独处与精神世界，宜宗教、艺术、玄学、研究类事务，孤高而有才。',
    天乙贵人: '命带天乙贵人，逢难有人扶，贵人多出自长辈或体制内平台，求助不必羞于开口。',
    文昌: '命带文昌，学习与文字表达有天赋，考试、写作、策划类工作占便宜。',
    羊刃: '命带羊刃，性烈气盛、敢拼敢冲，宜有明确出口（竞技、创业、外科等），忌意气用事。',
    禄神: '日禄归时或禄在四柱，衣食有依，做事踏实可积累，宜守本业稳中求进。',
  };

  function shensha(chart) {
    const P = chart.pillars.filter(Boolean);
    const zhis = P.map((p) => p.zhi);
    const yZhi = chart.pillars[0].zhi;
    const dZhi = chart.pillars[2].zhi;
    const dGan = chart.dayGan;
    const out = [];
    const has = (name, target) => {
      if (!target) return;
      const hit = zhis.filter((z) => target.includes(z));
      if (hit.length) out.push({ name, at: hit.join('、'), desc: SHENSHA_DESC[name] });
    };
    // 驿马/桃花/华盖以年支、日支查
    has('驿马', [YIMA[yZhi], YIMA[dZhi]].join(''));
    has('桃花', [TAOHUA[yZhi], TAOHUA[dZhi]].join(''));
    has('华盖', [HUAGAI[yZhi], HUAGAI[dZhi]].join(''));
    has('天乙贵人', TIANYI[dGan]);
    has('文昌', WENCHANG[dGan]);
    has('羊刃', YANGREN[dGan]);
    has('禄神', LUSHEN[dGan]);
    return out;
  }

  const API = { judge, shensha, SHENSHA_DESC };
  root.BaziLuck = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
