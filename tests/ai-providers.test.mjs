import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../js/core/ai-providers.js');

test('provider 目录：DeepSeek 为默认，且每家都有必需字段', () => {
  assert.equal(P.DEFAULT, 'deepseek');
  const ids = Object.keys(P.PROVIDERS);
  assert.ok(ids.includes('deepseek') && ids.includes('claude') && ids.includes('custom'));
  ids.forEach((id) => {
    const p = P.PROVIDERS[id];
    assert.ok(p.label, id + ' 缺 label');
    assert.ok(['openai', 'anthropic'].includes(p.proto), id + ' 协议非法');
    assert.ok(Array.isArray(p.models), id + ' 缺 models');
    if (id !== 'custom') {
      assert.ok(p.endpoint.startsWith('https://'), id + ' endpoint 必须 https');
      assert.ok(p.models.length >= 1, id + ' 至少一个模型');
      assert.ok(p.console.startsWith('https://'), id + ' 缺控制台链接');
    }
  });
});

test('构造请求：OpenAI 兼容协议（DeepSeek）', () => {
  const r = P.buildRequest({ provider: 'deepseek', model: 'deepseek-chat', key: 'sk-abc', system: 'S', prompt: 'P' });
  assert.equal(r.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(r.headers.Authorization, 'Bearer sk-abc');
  assert.equal(r.headers['Content-Type'], 'application/json');
  assert.ok(!r.headers['x-api-key']);
  const b = JSON.parse(r.body);
  assert.equal(b.model, 'deepseek-chat');
  assert.equal(b.stream, true);
  assert.deepEqual(b.messages[0], { role: 'system', content: 'S' });
  assert.deepEqual(b.messages[1], { role: 'user', content: 'P' });
});

test('构造请求：Anthropic 协议（system 独立字段 + 浏览器直连头）', () => {
  const r = P.buildRequest({ provider: 'claude', model: 'claude-opus-5', key: 'sk-ant-x', system: 'S', prompt: 'P' });
  assert.equal(r.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(r.headers['x-api-key'], 'sk-ant-x');
  assert.equal(r.headers['anthropic-version'], '2023-06-01');
  assert.equal(r.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.ok(!r.headers.Authorization);
  const b = JSON.parse(r.body);
  assert.equal(b.system, 'S');
  assert.equal(b.stream, true);
  assert.equal(b.messages.length, 1);
  assert.ok(b.max_tokens > 0);
});

test('构造请求：自定义 provider 用用户填的 endpoint 与 model', () => {
  const r = P.buildRequest({ provider: 'custom', model: 'my-model', key: 'k', system: 'S', prompt: 'P', endpoint: 'https://example.com/v1/chat/completions' });
  assert.equal(r.url, 'https://example.com/v1/chat/completions');
  assert.equal(JSON.parse(r.body).model, 'my-model');
});

test('构造请求：缺 key 或缺自定义 endpoint 时抛出可读错误', () => {
  assert.throws(() => P.buildRequest({ provider: 'deepseek', model: 'deepseek-chat', key: '', prompt: 'P' }), /API Key/);
  assert.throws(() => P.buildRequest({ provider: 'custom', model: 'm', key: 'k', prompt: 'P', endpoint: '' }), /接口地址/);
  assert.throws(() => P.buildRequest({ provider: 'custom', model: 'm', key: 'k', prompt: 'P', endpoint: 'http://x.com' }), /https/);
});

test('解析 SSE：OpenAI 兼容的正文与推理增量', () => {
  const s = P.makeParser('openai');
  assert.deepEqual(s('data: {"choices":[{"delta":{"content":"你"}}]}'), { text: '你' });
  assert.deepEqual(s('data: {"choices":[{"delta":{"reasoning_content":"想"}}]}'), { think: '想' });
  assert.equal(s('data: [DONE]'), null);
  assert.equal(s(''), null);
  assert.equal(s(': keep-alive'), null);
  assert.equal(s('data: {"choices":[{"delta":{}}]}'), null);
});

test('解析 SSE：Anthropic 的文本增量与 stop_reason', () => {
  const s = P.makeParser('anthropic');
  assert.deepEqual(s('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"卦"}}'), { text: '卦' });
  assert.deepEqual(s('data: {"type":"message_delta","delta":{"stop_reason":"refusal"}}'), { stop: 'refusal' });
  assert.equal(s('data: {"type":"ping"}'), null);
});

test('解析 SSE：坏 JSON 不抛异常，返回 null', () => {
  const s = P.makeParser('openai');
  assert.equal(s('data: {不是 json'), null);
});

test('错误信息提取：各家 401 响应体都能读出人话', () => {
  assert.match(P.explainError(401, '{"error":{"message":"Authentication Fails"}}'), /Authentication Fails/);
  assert.match(P.explainError(401, '{"error":{"code":"401","message":"令牌已过期或验证不正确"}}'), /令牌已过期/);
  assert.match(P.explainError(429, '{}'), /频率|额度/);
  assert.match(P.explainError(401, 'not json at all'), /Key/);
});
