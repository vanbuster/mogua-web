/* 八字解读文案层：把 bazi-engine 的排盘事实翻译成看板文字（规则驱动，不含 AI）。
   口径：结论先行、陈述式、不用恐吓语；凶象只在真有冲克时点出。 */
(function (root) {
  'use strict';
  const G = root.Ganzhi || require('./ganzhi.js');

  const DAYGAN = {
    甲: ['参天大木', '正直向上、有担当，认准的路不易回头；缺点是硬，不肯低头，遇挫易折不易弯。'],
    乙: ['花草藤萝', '柔韧灵活、擅长借力攀附，人际感知细腻；缺点是易随环境摇摆，需要一根可依的"大树"。'],
    丙: ['太阳之火', '热情外放、光明磊落，感染力强，喜欢被看见；缺点是三分钟热度、易急躁，照人多而照己少。'],
    丁: ['灯烛之火', '温和内敛、心思细密，专注力强，适合深耕一门；缺点是敏感多虑，情绪起伏藏在心里。'],
    戊: ['高山厚土', '稳重可靠、包容力强，是团队里的定海针；缺点是慢热固执、变通不足，容易被动等待。'],
    己: ['田园湿土', '细致务实、善于培育与照顾人，适合幕后与运营；缺点是想得多做得慢，容易自我消耗。'],
    庚: ['刀剑之金', '果断刚烈、讲义气、执行力强，能扛硬活；缺点是锋芒外露，说话直，容易伤人也伤己。'],
    辛: ['珠玉之金', '精致敏锐、审美与品味出众，自尊心强；缺点是爱面子、易受打击，对环境要求高。'],
    壬: ['江河之水', '聪明通达、格局大、适应力强，能容能变；缺点是随性不定、有始无终，需要河道约束。'],
    癸: ['雨露之水', '温柔细腻、直觉敏锐、有洞察力，善于潜移默化；缺点是敏感多疑、容易内耗和悲观。'],
  };

  const GOD_STRONG = {
    比劫: '比劫旺：自我意识强、重朋友、敢竞争，但易与人争财，合伙需先立规矩。',
    食伤: '食伤旺：表达欲与创造力强，不服管，适合靠才艺、内容、技术吃饭，忌在体制内硬碰上级。',
    财星: '财星旺：务实、重结果、会算账，对物质和现实有敏锐嗅觉，但过旺时易为财所累、贪多嚼不烂。',
    官杀: '官杀旺：有责任心与野心，扛压能力强，适合有制度与晋升通道的平台，但压力大时易焦虑自苦。',
    印星: '印星旺：爱学习、爱思考、有长辈缘，安全感来自知识与靠山，但想多做少、行动滞后是老毛病。',
  };
  const GOD_WEAK = {
    财星: '财星弱：对钱的敏感度低，不擅长经营现实资源，须刻意练习理财与谈判。',
    官杀: '官杀弱：自由散漫、不喜约束，走体制路线会别扭，更适合自主型工作。',
    印星: '印星弱：靠山少、凡事靠自己，早年多自立，学习靠实践而非书本。',
    食伤: '食伤弱：不善表达和展示自己，才华易被埋没，需主动找出口。',
    比劫: '比劫弱：独立作战偏吃力，缺少同辈帮衬，宜结盟不宜单干。',
  };

  const CAREER = {
    木: '教育、文化出版、内容创作、园林农林、医药、法律与咨询等生发性行业',
    火: '互联网与传媒、能源电力、餐饮演艺、市场营销、AI 与数据等发光发热型行业',
    土: '房地产建筑、农业矿业、仓储物流、管理与行政、保险信托等承载型行业',
    金: '金融证券、机械制造、汽车、军警司法、硬件与精密制造等刚性行业',
    水: '贸易物流、旅游航运、传播公关、智库研究、流动性强的跨域岗位',
  };
  const ORGAN = { 木: '肝胆、筋络、眼睛', 火: '心血管、小肠、血压与睡眠', 土: '脾胃、消化与皮肤', 金: '肺与呼吸道、大肠、皮肤', 水: '肾与泌尿、内分泌、腰腿' };
  const LUCKY_NUM = { 木: '3、8', 火: '2、7', 土: '5、10', 金: '4、9', 水: '1、6' };

  function dominant(godCount) {
    const arr = Object.entries(godCount).sort((a, b) => b[1] - a[1]);
    return { top: arr[0][0], topV: arr[0][1], bottom: arr[arr.length - 1][0], bottomV: arr[arr.length - 1][1] };
  }

  function patternText(chart) {
    const p = chart.pattern;
    const tou = p.tou ? '月令本气透出天干，格局成立较清' : '月令本气未透干，格局取用以藏干为主';
    return `${p.name}（月令${chart.pillars[1].zhi}中本气为${p.god}）。${tou}。${chart.strength.reason}`;
  }

  function personalityText(chart) {
    const [img, desc] = DAYGAN[chart.dayGan];
    const d = dominant(chart.godCount);
    return `日主${chart.dayGan}${chart.dayWx}，如${img}：${desc} ${GOD_STRONG[d.top]}`;
  }

  function careerText(chart) {
    const s = chart.strength;
    const fav = s.favor.map((w) => CAREER[w]).join('；');
    const platform = chart.godCount.官杀 >= 1 ? '命中官杀有力，有平台与制度的地方能借到势' : '官杀不显，自主型、项目制、靠手艺说话的路更顺';
    return `喜用${s.favor.join('')}，事业方向优先看：${fav}。${platform}。利在${s.favor.map((w) => G.WX_DIR[w]).join('、')}方发展。`;
  }

  function wealthText(chart) {
    const c = chart.godCount.财星;
    const strong = chart.strength.level === '身旺';
    if (c >= 1.5 && strong) return '财星旺且身能担财，正财偏财皆有可为，宜主动经营、可承受一定风险的投资。';
    if (c >= 1.5 && !strong) return '财星旺而身弱，财多身弱，看得到摸不牢，宜先固本（学习与合作）再谈扩张，忌高杠杆。';
    if (c < 0.6) return '财星不显，财运靠技能与人脉间接转化，宜走专业积累路线，理财求稳不求快。';
    return '财星中等，正财为主、细水长流，收入与付出成正比，年轻时积累技能比追求暴利更划算。';
  }

  function loveText(chart) {
    const male = chart.gender === '男';
    const star = male ? '财星' : '官杀';
    const c = chart.godCount[star];
    const dz = chart.pillars[2].zhi;
    const clash = chart.pillars.filter((p, i) => p && i !== 2).some((p) => G.zhiRelation(dz, p.zhi).includes('冲'));
    const he = chart.pillars.filter((p, i) => p && i !== 2).some((p) => G.zhiRelation(dz, p.zhi).includes('六合'));
    let t = male ? '男命以财为妻' : '女命以官为夫';
    t += c >= 1.5 ? `，${star}旺，异性缘好、机会多，但要分辨真心` : c < 0.6 ? `，${star}弱，缘分来得慢、需主动经营` : `，${star}中平，感情稳定、细水长流`;
    if (clash) t += '。日支（配偶宫）被冲，感情或同居关系易有波动，遇冲年宜多沟通少赌气';
    else if (he) t += '。日支（配偶宫）有合，伴侣缘分黏合度高，容易被拴住';
    return t + '。';
  }

  function healthText(chart) {
    const pct = chart.wuxing.pct;
    const arr = G.WX.slice().sort((a, b) => pct[a] - pct[b]);
    const weak = arr[0];
    const strong = arr[4];
    return `五行中${weak}最弱（${pct[weak]}%）、${strong}最旺（${pct[strong]}%）。注意${ORGAN[weak]}偏弱易累，以及${ORGAN[strong]}因过旺而失衡。规律作息比任何补法都管用；涉及健康以医学诊断为准。`;
  }

  function traits(chart) {
    const list = [];
    const d = dominant(chart.godCount);
    list.push(`<b>${d.top}为命局主调</b>——${GOD_STRONG[d.top].split('：')[1]}`);
    if (d.bottomV < 0.6) list.push(`<b>${d.bottom}不显</b>——${GOD_WEAK[d.bottom].split('：')[1]}`);
    const gods = chart.pillars.filter(Boolean).map((p) => p.god);
    if (gods.includes('伤官') && gods.includes('正官')) list.push('<b>伤官见官</b>——才华与规则相撞，容易和上级或制度较劲，宜选自主度高的环境。');
    if (gods.includes('七杀') && chart.strength.level === '身弱') list.push('<b>七杀攻身</b>——压力感常在，宜借印星（学习、长辈、资质）化杀为权。');
    chart.shensha.forEach((s) => list.push(`<b>${s.name}</b>（${s.at}）——${s.desc}`));
    list.push(`<b>空亡${chart.xunkong}</b>——落于此二支之事易虚不易实，宜以行动补足。`);
    return list;
  }

  function advice(chart) {
    const f = chart.strength.favor;
    return {
      dir: f.map((w) => G.WX_DIR[w]).join('、'),
      color: f.map((w) => G.WX_COLOR[w]).join('、'),
      num: f.map((w) => LUCKY_NUM[w]).join('、'),
      avoidDir: chart.strength.avoid.map((w) => G.WX_DIR[w]).join('、'),
    };
  }

  function nowText(chart) {
    const n = chart.now;
    const du = n.dayun ? `当前大运 ${n.dayun.gz}（${n.dayun.startAge}-${n.dayun.endAge}岁），${n.dayun.gods}。` : '尚未起运，以月柱为小运。';
    const ln = `流年 ${n.liunian.gz}：${n.liunian.god}，${n.liunian.notes.join('、') || '与原局无显著冲合'}。`;
    const ly = `流月 ${n.liuyue.gz}：${n.liuyue.god}，${n.liuyue.notes.join('、') || '无显著冲合'}。`;
    return { du, ln, ly };
  }

  function build(chart) {
    return {
      pattern: patternText(chart), personality: personalityText(chart), career: careerText(chart),
      wealth: wealthText(chart), love: loveText(chart), health: healthText(chart),
      traits: traits(chart), advice: advice(chart), now: nowText(chart), dayganImage: DAYGAN[chart.dayGan][0],
    };
  }

  const API = { build, DAYGAN, GOD_STRONG, GOD_WEAK, CAREER, ORGAN };
  root.BaziReading = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
