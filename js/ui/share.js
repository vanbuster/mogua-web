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

  /** 把当前渲染结果打包成零依赖单文件 HTML（内联样式，五行条宽度固定） */
  async function downloadStandalone(title, innerHtml, filename) {
    const cssHref = document.querySelector('link[rel=stylesheet]').href;
    const css = await fetch(cssHref).then((r) => r.text());
    const fixed = innerHtml.replace(/class="wx-bar (\w+)" data-w="(\d+)"/g, 'class="wx-bar $1" style="width:$2%"');
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title}</title><style>${css}</style></head><body><div class="wrap">${fixed}</div></body></html>`;
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
