/* 分享链接（URL hash 编码输入）与单文件看板下载。 */
(function (root) {
  'use strict';

  function encode(obj) {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
    return '#' + p.toString();
  }

  function decode(hash) {
    const h = (hash || location.hash).replace(/^#/, '');
    if (!h) return null;
    const p = new URLSearchParams(h);
    const o = {};
    p.forEach((v, k) => { o[k] = v; });
    return o;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error('clipboard write failed, fallback to prompt', e);
      window.prompt('复制以下链接：', text);
      return false;
    }
  }

  /** 把当前渲染结果打包成零依赖单文件 HTML（内联全部样式，动画落到终态） */
  async function downloadStandalone(title, innerHtml, filename) {
    const sheets = Array.from(document.querySelectorAll('link[rel=stylesheet]'));
    const css = (await Promise.all(sheets.map((l) => fetch(l.href).then((r) => r.text())))).join('\n');
    const fixed = innerHtml
      .replace(/class="wx-bar (\w+)" data-w="(\d+)"/g, 'class="wx-bar $1" style="width:$2%"')
      // 进场动画靠 .in 触发，静态文件里没有脚本，直接落到终态
      .replace(/class="card(?![\w-])/g, 'class="card in')
      // 数字可能正处在滚动中途，导出时一律取 data-to 的终值
      .replace(/<span class="count" data-to="(\d+)"[^>]*>[^<]*<\/span>/g, '$1%');
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title}</title><style>${css}\n/* 静态导出：进场动画落到终态 */\n.rv{opacity:1;transform:none;filter:none}\n.card-title::before,.dayun-track::before{transform:none}</style>` +
      `</head><body><div class="wrap">${fixed}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  root.Share = { encode, decode, copy, downloadStandalone };
})(window);
