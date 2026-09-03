/* AI provider 目录与协议适配：把「选哪家 + 填什么 Key」收敛成一张表，
   请求构造与流解析都是纯函数，浏览器与 Node 共用（有测试）。
   四家国内平台实测均放行浏览器直连（CORS ok），故无需自建代理。 */
(function (root) {
  'use strict';

  const PROVIDERS = {
    deepseek: {
      label: 'DeepSeek 深度求索',
      proto: 'openai',
      endpoint: 'https://api.deepseek.com/chat/completions',
      models: [
        ['deepseek-chat', 'DeepSeek-V3 · 快'],
        ['deepseek-reasoner', 'DeepSeek-R1 · 会先推演再答'],
      ],
      console: 'https://platform.deepseek.com/api_keys',
      hint: '国内最容易拿到的 Key：手机号注册即可创建，按量计费很便宜。',
      placeholder: 'sk-…',
    },
    zhipu: {
      label: '智谱 GLM',
      proto: 'openai',
      endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      models: [
        ['glm-4-flash', 'GLM-4-Flash · 免费'],
        ['glm-4-plus', 'GLM-4-Plus · 更强'],
      ],
      console: 'https://bigmodel.cn/usercenter/apikeys',
      hint: 'GLM-4-Flash 长期免费，适合先试水。',
      placeholder: 'xxxxxxxx.xxxxxxxx',
    },
    moonshot: {
      label: '月之暗面 Kimi',
      proto: 'openai',
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
      models: [
        ['moonshot-v1-8k', 'moonshot-v1-8k'],
        ['moonshot-v1-32k', 'moonshot-v1-32k'],
      ],
      console: 'https://platform.moonshot.cn/console/api-keys',
      hint: '注册赠送额度，中文写作稳。',
      placeholder: 'sk-…',
    },
    qwen: {
      label: '通义千问 · 阿里百炼',
      proto: 'openai',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      models: [
        ['qwen-plus', 'qwen-plus'],
        ['qwen-turbo', 'qwen-turbo · 便宜'],
        ['qwen-max', 'qwen-max · 最强'],
      ],
      console: 'https://bailian.console.aliyun.com/?tab=model#/api-key',
      hint: '阿里云百炼控制台开通后创建 API-KEY。',
      placeholder: 'sk-…',
    },
    claude: {
      label: 'Claude · Anthropic',
      proto: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: [
        ['claude-opus-5', 'Claude Opus 5'],
        ['claude-sonnet-5', 'Claude Sonnet 5'],
        ['claude-haiku-4-5', 'Claude Haiku 4.5 · 便宜'],
      ],
      console: 'https://console.anthropic.com/settings/keys',
      hint: '需要境外支付方式；中国大陆访问可能需要自备网络条件。',
      placeholder: 'sk-ant-…',
    },
    custom: {
      label: '自定义（OpenAI 兼容）',
      proto: 'openai',
      endpoint: '',
      models: [],
      console: '',
      hint: '任何 OpenAI 兼容接口都能填，例如自建的 one-api、硅基流动、本地 Ollama 的 /v1 网关。',
      placeholder: 'sk-…',
    },
  };

  const DEFAULT = 'deepseek';
  const MAX_TOKENS = 4000;

  /** 组装一次流式请求。返回 {url, headers, body, proto} */
  function buildRequest(o) {
    const p = PROVIDERS[o.provider] || PROVIDERS[DEFAULT];
    const key = (o.key || '').trim();
    if (!key) throw new Error('请先填入 API Key');
    const url = (o.provider === 'custom' ? (o.endpoint || '').trim() : p.endpoint);
    if (!url) throw new Error('请填写自定义接口地址');
    if (!/^https:\/\//.test(url)) throw new Error('接口地址必须以 https 开头');
    const model = (o.model || (p.models[0] && p.models[0][0]) || '').trim();

    if (p.proto === 'anthropic') {
      return {
        proto: 'anthropic', url,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model, max_tokens: MAX_TOKENS, stream: true,
          system: o.system, messages: [{ role: 'user', content: o.prompt }],
        }),
      };
    }
    return {
      proto: 'openai', url,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model, stream: true, max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: o.system }, { role: 'user', content: o.prompt }],
      }),
    };
  }

  /**
   * 返回一个逐行解析器：line → {text} | {think} | {stop} | null
   * think 是推理型模型（如 deepseek-reasoner）的思考流，单独渲染。
   */
  function makeParser(proto) {
    return function parse(line) {
      if (!line || line[0] === ':' || !line.startsWith('data:')) return null;
      const raw = line.slice(5).trim();
      if (!raw || raw === '[DONE]') return null;
      let ev;
      try { ev = JSON.parse(raw); } catch (e) { console.warn('SSE 行解析失败，已跳过', raw.slice(0, 80)); return null; }
      if (proto === 'anthropic') {
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') return { text: ev.delta.text };
        if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) return { stop: ev.delta.stop_reason };
        return null;
      }
      const d = ev.choices && ev.choices[0] && ev.choices[0].delta;
      if (!d) return null;
      if (d.reasoning_content) return { think: d.reasoning_content };
      if (d.content) return { text: d.content };
      return null;
    };
  }

  const STATUS_HINT = {
    400: '请求被拒（可能是模型名不对）',
    401: '认证失败：Key 不对或已失效',
    402: '余额不足，请到控制台充值',
    403: '无权访问该模型',
    404: '接口地址或模型不存在',
    429: '触发频率或额度限制，稍后再试',
  };

  /** 把各家五花八门的错误体压成一句人话 */
  function explainError(status, bodyText) {
    let msg = '';
    try {
      const j = JSON.parse(bodyText);
      msg = (j.error && (j.error.message || j.error.code)) || j.message || '';
    } catch (e) {
      msg = String(bodyText || '').slice(0, 120);
    }
    const head = STATUS_HINT[status] || `请求失败（HTTP ${status}）`;
    return msg ? `${head}：${msg}` : head;
  }

  const API = { PROVIDERS, DEFAULT, MAX_TOKENS, buildRequest, makeParser, explainError };
  root.AIProviders = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
