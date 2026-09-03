/* 八字排盘引擎：以 lunar-javascript 为历法底座（节气精确到分钟），
   本文件只做「排盘事实」：四柱、十神、藏干、五行量化、旺衰喜用、大运流年流月、神煞。
   文案解读在 bazi-reading.js，红绿灯与神煞查法在 bazi-luck.js。 */
(function (root) {
  'use strict';
  const G = root.Ganzhi || require('./ganzhi.js');
  const L = root.BaziLuck || require('./bazi-luck.js');
  const Solar = root.Solar || require('../vendor/lunar.js').Solar;

  const SECT = 1; // 晚子时（23:00 后）日柱算次日，与 skill 口径一致
  const LABELS = ['年柱', '月柱', '日柱', '时柱'];
  const WUHU = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 };

  function ganzhiOfYear(year) {
    const idx = ((year - 1984) % 60 + 60) % 60;
    return G.GAN[idx % 10] + G.ZHI[idx % 12];
  }

  function buildPillar(label, gan, zhi, dayGan, naYin, diShi) {
    const isDay = label === '日柱';
    return {
      label, gan, zhi, isDay,
      ganCls: G.clsOfGan(gan), zhiCls: G.clsOfZhi(zhi),
      god: isDay ? '日主' : G.shiShen(dayGan, gan),
      hidden: G.HIDDEN[zhi].map((g) => ({ gan: g, god: G.shiShen(dayGan, g) })),
      naYin, diShi,
    };
  }

  function buildPillars(ec, hourKnown) {
    const d = ec.getDayGan();
    const P = [
      buildPillar(LABELS[0], ec.getYearGan(), ec.getYearZhi(), d, ec.getYearNaYin(), ec.getYearDiShi()),
      buildPillar(LABELS[1], ec.getMonthGan(), ec.getMonthZhi(), d, ec.getMonthNaYin(), ec.getMonthDiShi()),
      buildPillar(LABELS[2], d, ec.getDayZhi(), d, ec.getDayNaYin(), ec.getDayDiShi()),
      hourKnown ? buildPillar(LABELS[3], ec.getTimeGan(), ec.getTimeZhi(), d, ec.getTimeNaYin(), ec.getTimeDiShi()) : null,
    ];
    return P;
  }

  /** 日主旺衰：印比之和 + 月令得失，给出等级与喜忌五行 */
  function strengthOf(dayGan, monthZhi, pct) {
    const gw = G.groupWx(dayGan);
    const shengfu = pct[gw.印星] + pct[gw.比劫];
    const deling = [gw.比劫, gw.印星].includes(G.ZHI_WX[monthZhi]);
    const score = shengfu + (deling ? 8 : -8);
    const level = score >= 55 ? '身旺' : score <= 40 ? '身弱' : '中和';
    const strongSide = level === '身旺' || (level === '中和' && shengfu >= 50);
    const favorGroups = strongSide ? ['食伤', '财星', '官杀'] : ['印星', '比劫'];
    const avoidGroups = strongSide ? ['印星', '比劫'] : ['食伤', '财星', '官杀'];
    const favor = favorGroups.map((k) => gw[k]);
    const avoid = avoidGroups.map((k) => gw[k]);
    const side = level === '中和' ? (strongSide ? '偏强宜克泄耗，喜' : '偏弱宜生扶，喜') : (strongSide ? '身强宜克泄耗，喜' : '身弱宜生扶，喜');
    const reason = `印比合计 ${shengfu}%，月令${monthZhi}${deling ? '得令' : '失令'}，判为${level}；` + side + favor.join('') + '，忌' + avoid.join('') + '。';
    return { score, level, shengfu, deling, favor, avoid, favorGroups, avoidGroups, reason };
  }

  /** 格局：月令本气透干定格，比劫月令定建禄/羊刃 */
  function patternOf(pillars, dayGan) {
    const mz = pillars[1].zhi;
    const main = G.HIDDEN[mz][0];
    const god = G.shiShen(dayGan, main);
    const gans = pillars.filter((p, i) => p && i !== 2).map((p) => p.gan);
    if (god === '比肩') return { name: '建禄格', god, tou: false };
    if (god === '劫财') return { name: G.GAN_YANG[dayGan] ? '羊刃格' : '月劫格', god, tou: false };
    const tou = gans.includes(main);
    return { name: god + '格', god, tou };
  }

  function countGods(pillars) {
    const c = { 比劫: 0, 食伤: 0, 财星: 0, 官杀: 0, 印星: 0 };
    pillars.forEach((p) => {
      if (!p) return;
      if (!p.isDay) c[G.SHISHEN_GROUP[p.god]] += 1;
      p.hidden.forEach((h, i) => { c[G.SHISHEN_GROUP[h.god]] += G.HIDDEN_W[i]; });
    });
    return c;
  }

  function buildDayun(ec, gender, birthYear, nowYear, dayGan) {
    const yun = ec.getYun(gender);
    const list = yun.getDaYun().slice(1, 9).map((d, i) => {
      const gz = d.getGanZhi();
      return {
        idx: i + 1, gz, gan: gz[0], zhi: gz[1],
        ganCls: G.clsOfGan(gz[0]), zhiCls: G.clsOfZhi(gz[1]),
        gods: G.shiShen(dayGan, gz[0]) + '·' + G.shiShen(dayGan, G.HIDDEN[gz[1]][0]),
        startAge: d.getStartAge(), endAge: d.getEndAge(), startYear: d.getStartYear(), endYear: d.getEndYear(),
        isNow: nowYear >= d.getStartYear() && nowYear <= d.getEndYear(),
      };
    });
    return {
      yun: { forward: yun.isForward(), startYear: yun.getStartSolar().getYear(), startAge: yun.getStartYear(),
        startText: `${yun.getStartYear()}岁${yun.getStartMonth()}个月起运（${yun.getStartSolar().toYmd()}）`, },
      dayun: list,
    };
  }

  function buildMonths(chart, yearGz, nowMonthZhi) {
    const start = WUHU[yearGz[0]];
    return Array.from({ length: 12 }, (_, i) => {
      const gan = G.GAN[(start + i) % 10];
      const zhi = G.ZHI[(2 + i) % 12];
      const j = L.judge(gan, zhi, chart);
      return { zhi, gan, gz: gan + zhi, ganCls: G.clsOfGan(gan), zhiCls: G.clsOfZhi(zhi), isNow: zhi === nowMonthZhi, ...j };
    });
  }

  function buildYears(chart, fromYear) {
    return Array.from({ length: 5 }, (_, i) => {
      const year = fromYear + i;
      const gz = ganzhiOfYear(year);
      const j = L.judge(gz[0], gz[1], chart);
      return { year, gz, ganCls: G.clsOfGan(gz[0]), zhiCls: G.clsOfZhi(gz[1]), ...j };
    });
  }

  function lunarText(lunar, hourKnown) {
    const m = lunar.getMonth();
    return `${lunar.getYearInChinese()}年${m < 0 ? '闰' : ''}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` +
      (hourKnown ? ` ${lunar.getTimeZhi()}时` : '');
  }

  /**
   * @param {object} o { year, month, day, hour, minute, gender(1男/0女), hourKnown, name, now }
   */
  function compute(o) {
    const hourKnown = o.hourKnown !== false && Number.isInteger(o.hour);
    const hour = hourKnown ? o.hour : 12;
    const minute = hourKnown ? (o.minute || 0) : 0;
    const now = o.now || new Date();
    const solar = Solar.fromYmdHms(o.year, o.month, o.day, hour, minute, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    ec.setSect(SECT);
    const dayGan = ec.getDayGan();
    const pillars = buildPillars(ec, hourKnown);
    const wuxing = G.wuxingWeights(pillars);
    const strength = strengthOf(dayGan, pillars[1].zhi, wuxing.pct);
    const chart = {
      input: { ...o, hourKnown }, name: o.name || '',
      gender: o.gender === 1 ? '男' : '女',
      solarText: `${o.year}年${o.month}月${o.day}日` + (hourKnown ? ` ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : ' 时辰未知'),
      lunarText: lunarText(lunar, hourKnown),
      shengxiao: lunar.getYearShengXiaoByLiChun(),
      bazi: pillars.filter(Boolean).map((p) => p.gan + p.zhi).join(' '),
      dayGan, dayWx: G.GAN_WX[dayGan], dayYang: !!G.GAN_YANG[dayGan],
      pillars, wuxing, strength,
      pattern: patternOf(pillars, dayGan),
      godCount: countGods(pillars),
      xunkong: ec.getDayXunKong(),
      taiyuan: ec.getTaiYuan(), minggong: ec.getMingGong(),
    };
    chart.shensha = L.shensha(chart);

    const nowLunar = Solar.fromDate(now).getLunar();
    const nowYear = now.getFullYear();
    const yearGz = nowLunar.getYearInGanZhiByLiChun();
    const liuYear = yearGz === ganzhiOfYear(nowYear) ? nowYear : nowYear - 1; // 立春前仍属上一流年
    const nowMonthZhi = nowLunar.getMonthInGanZhiExact()[1];
    Object.assign(chart, buildDayun(ec, o.gender, o.year, liuYear, dayGan));
    chart.months = buildMonths(chart, yearGz, nowMonthZhi);
    chart.years = buildYears(chart, liuYear);
    const cur = chart.dayun.find((d) => d.isNow);
    chart.now = {
      date: now, age: liuYear - o.year + 1, year: liuYear,
      dayun: cur || null,
      liunian: { year: liuYear, gz: yearGz, ...L.judge(yearGz[0], yearGz[1], chart) },
      liuyue: chart.months.find((m) => m.isNow) || chart.months[0],
    };
    return chart;
  }

  const API = { compute, ganzhiOfYear };
  root.BaziEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
