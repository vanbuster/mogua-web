/* 命盘看板渲染：沿用 bazi-skill/assets/dashboard-template.html 的模块结构与雷达算法。 */
(function (root) {
  'use strict';
  const WXC = { mu: '#4f7a4f', huo: '#c0392b', tu: '#bd9a45', jin: '#9a8a55', shui: '#335a6b' };
  const WX_ORDER = ['木', '火', '土', '金', '水'];
  const WX_CLS = { 木: 'mu', 火: 'huo', 土: 'tu', 金: 'jin', 水: 'shui' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const gz = (gan, zhi, gc, zc) => `<span class="${gc}">${gan}</span><span class="${zc}">${zhi}</span>`;

  function radar(pct) {
    const C = { x: 140, y: 142, R: 104 };
    const ang = WX_ORDER.map((_, i) => ((-90 + i * 72) * Math.PI) / 180);
    const pt = (i, f) => [C.x + f * C.R * Math.cos(ang[i]), C.y + f * C.R * Math.sin(ang[i])];
    let grid = '', ax = '', dots = '', lab = '';
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      grid += `<polygon points="${WX_ORDER.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="${f === 1 ? 'rgba(255,250,235,.5)' : 'none'}" stroke="rgba(120,90,40,.18)" stroke-width="1"/>`;
    });
    WX_ORDER.forEach((_, i) => { const [x, y] = pt(i, 1); ax += `<line x1="${C.x}" y1="${C.y}" x2="${x}" y2="${y}" stroke="rgba(120,90,40,.22)" stroke-width="1"/>`; });
    const MAX = Math.max(...WX_ORDER.map((w) => pct[w])) || 1;
    const vp = WX_ORDER.map((w, i) => pt(i, (pct[w] / MAX) * 0.92).join(',')).join(' ');
    WX_ORDER.forEach((w, i) => {
      const c = WXC[WX_CLS[w]];
      const [px, py] = pt(i, (pct[w] / MAX) * 0.92);
      dots += `<circle cx="${px}" cy="${py}" r="4" fill="${c}" stroke="#fff8e4" stroke-width="1"/>`;
      const [lx, ly] = pt(i, 1.16);
      lab += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="${c}" font-size="22" font-weight="bold" font-family="STKaiti,serif">${w}</text>`;
    });
    return `<svg viewBox="0 0 280 284" width="100%" style="max-width:300px;display:block">${grid}${ax}<polygon points="${vp}" fill="rgba(165,41,41,.20)" stroke="#a52929" stroke-width="2" stroke-linejoin="round"/>${dots}${lab}</svg>`;
  }

  function pillarsHtml(chart) {
    const P = chart.pillars.map((p, i) => {
      if (!p) return `<div class="pillar unknown"><div class="p-label">时柱</div><div class="p-god">未知</div><div class="p-char">？</div><div class="p-char">？</div><div class="p-hidden">时辰未知<small>仅作六字分析</small></div></div>`;
      return `<div class="pillar ${p.isDay ? 'day' : ''}"><div class="p-label">${p.label}</div><div class="p-god">${p.god}</div>
        <div class="p-char ${p.ganCls}">${p.gan}</div><div class="p-char ${p.zhiCls}">${p.zhi}</div>
        <div class="p-hidden">藏：${p.hidden.map((h) => h.gan).join('·')}<small>${p.hidden.map((h) => h.god).join('·')}</small></div>
        <div class="p-nayin">${p.naYin} · ${p.diShi}</div></div>`;
    });
    return P.join('');
  }

  function wuxingHtml(chart) {
    const pct = chart.wuxing.pct;
    const gw = Ganzhi.groupWx(chart.dayGan);
    const roleOf = (w) => Object.keys(gw).find((k) => gw[k] === w);
    const bars = WX_ORDER.map((w) => `<div class="wx-row"><div class="wx-name ${WX_CLS[w]}">${w}</div>
      <div class="wx-bar-bg"><div class="wx-bar ${WX_CLS[w]}" data-w="${pct[w]}"></div></div>
      <div class="wx-pct">${pct[w]}%<small>${roleOf(w)}${chart.strength.favor.includes(w) ? '·喜' : '·忌'}</small></div></div>`).join('');
    return `<div class="wx-flex"><div>${radar(pct)}</div><div>${bars}</div></div><div class="wx-note">${esc(chart.strength.reason)}</div>`;
  }

  function dayunHtml(chart) {
    return chart.dayun.map((d) => `<div class="du ${d.isNow ? 'now' : ''}"><div class="du-age">${d.startAge}-${d.endAge}岁</div><div class="du-dot">${d.idx}</div>
      <div class="du-ganzhi">${gz(d.gan, d.zhi, d.ganCls, d.zhiCls)}</div><div class="du-year">${d.startYear}-${d.endYear}</div>
      <div class="du-year" style="color:var(--gold2)">${d.gods}</div>${d.isNow ? '<div class="du-now-tag">▶ 当下</div>' : ''}</div>`).join('');
  }

  function nowHtml(chart, R) {
    const n = chart.now;
    const card = (o, when, desc) => `<div class="now-card ${o.level === 'r' ? 'warn' : ''}">${o.level === 'r' ? '<div class="warn-tag">⚠ 冲克</div>' : ''}
      <div class="now-head"><span class="now-ganzhi">${gz(o.gz[0], o.gz[1], Ganzhi.clsOfGan(o.gz[0]), Ganzhi.clsOfZhi(o.gz[1]))}</span><span class="now-when">${when}</span></div>
      <div class="now-shipen">${o.gods || o.god + '·' + o.zhiGod}</div><div class="now-desc">${esc(desc)}</div></div>`;
    const du = n.dayun ? card({ ...n.dayun, level: 'y' }, `大运 · ${n.dayun.startAge}-${n.dayun.endAge}岁`, R.now.du)
      : `<div class="now-card"><div class="now-desc">${esc(R.now.du)}</div></div>`;
    return du + card(n.liunian, `流年 · ${n.liunian.year}`, R.now.ln) + card(n.liuyue, `流月 · ${n.liuyue.zhi}月`, R.now.ly);
  }

  function monthsHtml(chart) {
    return chart.months.map((m) => `<div class="month ${m.level} ${m.isNow ? 'now' : ''}" title="${esc(m.notes.join('，') || '无显著冲合')}"><div>${m.zhi}月</div>
      <div class="mg">${gz(m.gan, m.zhi, m.ganCls, m.zhiCls)}</div><div class="mt">${esc(m.note)}</div></div>`).join('');
  }

  function yearsHtml(chart) {
    return chart.years.map((y) => `<div class="year ${y.level}"><div class="yl">${y.year}</div><div class="yg">${gz(y.gz[0], y.gz[1], y.ganCls, y.zhiCls)}</div>
      <div class="yk"><b>${y.god}</b><br>${esc(y.notes.join('，') || (y.level === 'g' ? '喜用到位' : '平稳'))}</div></div>`).join('');
  }

  function html(chart, R) {
    const ana = [['格局', R.pattern], ['性格', R.personality], ['事业', R.career], ['财运', R.wealth], ['感情', R.love], ['健康', R.health]]
      .map(([t, x]) => `<div class="ana"><h4><span class="ic">◈</span>${t}</h4><p>${esc(x)}</p></div>`).join('');
    const traits = R.traits.map((t) => `<li>${t}</li>`).join('');
    const name = chart.name ? esc(chart.name) : '无名氏';
    return `
  <header class="hero"><div class="seal"><span>命盘</span></div>
    <h1>四柱八字命盘</h1>
    <div class="subtitle">${name}　·　${chart.gender}　·　<b>${chart.bazi}</b></div>
    <div class="subtitle" style="margin-top:6px">公历 ${chart.solarText} · 农历 ${chart.lunarText} · 属${chart.shengxiao}　|　排盘日 ${chart.now.date.getFullYear()}-${String(chart.now.date.getMonth() + 1).padStart(2, '0')}-${String(chart.now.date.getDate()).padStart(2, '0')}</div></header>
  <section class="card"><div class="card-title">四　柱　排　盘</div><div class="pillars">${pillarsHtml(chart)}</div>
    <div class="wx-note">日主 ${chart.dayGan}${chart.dayWx}（${R.dayganImage}） · 空亡 ${chart.xunkong} · 胎元 ${chart.taiyuan} · 命宫 ${chart.minggong}</div></section>
  <section class="card"><div class="card-title">五　行　力　量</div>${wuxingHtml(chart)}</section>
  <section class="card"><div class="card-title">大　运　流　转</div><div class="dayun"><div class="dayun-track">${dayunHtml(chart)}</div></div>
    <div class="wx-note">${chart.yun.forward ? '顺排' : '逆排'} · ${esc(chart.yun.startText)}</div></section>
  <section class="card"><div class="card-title">当　下　气　运</div><div class="now-grid">${nowHtml(chart, R)}</div></section>
  <section class="card"><div class="card-title">流　年　流　月</div>
    <div class="tb"><h3>流年 ${chart.now.liunian.gz}（${chart.now.year}）· 十二流月 · 节气序</h3><div class="months">${monthsHtml(chart)}</div>
      <div class="legend"><span><i class="dot" style="background:#7a9a5a"></i>顺</span><span><i class="dot" style="background:#b89a3a"></i>平</span><span><i class="dot" style="background:#b85a4a"></i>险</span><span>红框 = 当前月，悬停看冲合</span></div></div>
    <div class="tb"><h3>未来五年 · 逐年主线</h3><div class="years">${yearsHtml(chart)}</div></div></section>
  <section class="card"><div class="card-title">综　合　论　命</div><div class="ana-grid">${ana}</div></section>
  <section class="card"><div class="card-title">命　格　特　质</div><ul class="traits">${traits}</ul>
    <div class="wx-note" style="margin-top:12px">开运参考：利方 <b>${R.advice.dir}</b> · 利色 <b>${R.advice.color}</b> · 利数 <b>${R.advice.num}</b> · 忌方 ${R.advice.avoidDir}</div></section>`;
  }

  root.BaziRender = { html, radar };
})(window);
