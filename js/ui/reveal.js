/* 进场动效驱动：滚动到视口就给元素加 .in，并为需要交错的子元素写入 --i。
   CSS 负责怎么动（css/motion.css），本文件只负责何时动、第几个动。 */
(function (root) {
  'use strict';

  // 需要交错的子元素：父选择器 → 子选择器
  const STAGGER = [
    ['.entries', '.entry'], ['.almanac', '> div'], ['.pillars', '.pillar'],
    ['.wuxing', '.wx-row'], ['.dayun-track', '.du'], ['.now-grid', '.now-card'],
    ['.ana-grid', '.ana'], ['.months', '.month'], ['.years', '.year'],
    ['.traits', 'li'], ['.reading', 'p'],
  ];

  /** 给交错容器的子元素编号，CSS 用 calc(var(--i) * 步长) 算延迟 */
  function index(scope) {
    STAGGER.forEach(([parent, child]) => {
      scope.querySelectorAll(parent).forEach((el) => {
        const kids = child.startsWith('>') ? el.children : el.querySelectorAll(child);
        Array.prototype.forEach.call(kids, (k, i) => k.style.setProperty('--i', i));
      });
    });
    // 四柱的干支大字与柱同步（每柱两个字，共用柱序）
    scope.querySelectorAll('.pillar').forEach((p, i) => {
      p.querySelectorAll('.p-char').forEach((c) => c.style.setProperty('--i', i));
    });
  }

  /** 点亮一个容器：加 .in，并让其中的数字滚起来 */
  function light(el) {
    el.classList.add('in');
    // 数字在 HTML 里就是终值（不依赖脚本也能读）。归零动作放在 countUp 的首帧里做，
    // 这样一旦动画帧不可用（后台标签页），数字就原样停在终值而不是卡在 0。
    el.querySelectorAll('.count[data-to]').forEach((c, i) => {
      if (c.dataset.rolled) return;
      c.dataset.rolled = '1';
      setTimeout(() => countUp(c, Number(c.dataset.to), 900, '%'), 200 + i * 80);
    });
  }

  let io = null;
  function observer() {
    if (io) return io;
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        light(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    return io;
  }

  /** 观察 scope 内所有卡片与 .rv 元素；已在视口内的立刻点亮 */
  function watch(scope) {
    const root_ = scope || document;
    index(root_);
    const targets = root_.querySelectorAll('.card, .rv, .entries, .almanac');
    targets.forEach((el) => {
      if (el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.92 && r.bottom > 0) light(el);
      else observer().observe(el);
    });
    // 后台标签页里 IntersectionObserver 不回调，会让内容一直停在初始态；
    // 兜底：页面重新可见时按当前视口再判一次。
    if (!watch.bound) {
      watch.bound = true;
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) document.querySelectorAll('.card:not(.in), .rv:not(.in)').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight * 0.92 && r.bottom > 0) light(el);
        });
      });
    }
  }

  /** 数字从 0 滚到目标值。后台标签页里 rAF 不跑，用定时器保证最终落到终值 */
  function countUp(el, to, ms, suffix) {
    const dur = ms || 900;
    const t0 = performance.now();
    const sfx = suffix || '';
    let done = false;
    const step = (now) => {
      if (done) return;
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round((1 - Math.pow(1 - k, 3)) * to) + sfx;
      if (k < 1) requestAnimationFrame(step);
      else done = true;
    };
    requestAnimationFrame(step);
    setTimeout(() => { if (!done) { done = true; el.textContent = to + sfx; } }, dur + 400);
  }

  /** 首页入口卡片的墨韵跟随鼠标 */
  function inkFollow(scope) {
    (scope || document).querySelectorAll('.entry').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  function init() { watch(document); inkFollow(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  root.Reveal = { watch, index, countUp, inkFollow, light };
})(window);
