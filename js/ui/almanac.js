/* 首页「今日黄历」：全部取自 lunar-javascript。 */
(function (root) {
  'use strict';
  const el = document.getElementById('almanac');
  if (!el || typeof Solar === 'undefined') return;
  const now = new Date();
  const solar = Solar.fromDate(now);
  const l = solar.getLunar();
  const ec = l.getEightChar();
  const jq = l.getNextJieQi();
  const tags = (arr, cls) => arr.slice(0, 6).map((t) => `<span class="tag ${cls}">${t}</span>`).join('');
  const item = (k, v) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`;
  el.innerHTML = [
    item('公历', `${solar.toYmd()} 星期${solar.getWeekInChinese()}`),
    item('农历', `${l.getYearInChinese()}年${l.getMonth() < 0 ? '闰' : ''}${l.getMonthInChinese()}月${l.getDayInChinese()} · ${l.getYearShengXiaoByLiChun()}年`),
    item('干支', `${ec.getYear()}年 ${ec.getMonth()}月 ${ec.getDay()}日 ${ec.getTime()}时`),
    item('时辰', `${l.getTimeZhi()}时（${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}）`),
    item('下一节气', `${jq.getName()} · ${jq.getSolar().toYmd()}`),
    item('吉神方位', `喜神${l.getDayPositionXiDesc()} · 财神${l.getDayPositionCaiDesc()} · 福神${l.getDayPositionFuDesc()}`),
    item('冲煞', `冲${l.getDayChongDesc()} 煞${l.getDaySha()}`),
    item('值神', `${l.getDayTianShen()}（${l.getDayTianShenLuck()}） · ${l.getZhiXing()}日`),
    `<div style="grid-column:1/-1"><div class="k">宜</div><div>${tags(l.getDayYi(), 'yi')}</div></div>`,
    `<div style="grid-column:1/-1"><div class="k">忌</div><div>${tags(l.getDayJi(), 'ji')}</div></div>`,
  ].join('');
  if (root.Reveal) root.Reveal.watch(document);
})(window);
