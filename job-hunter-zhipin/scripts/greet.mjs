#!/usr/bin/env node
/**
 * greet.mjs — 批量打招呼（CDP 真实点击 + 拟人输入）
 *
 * 自包含：内嵌最小 CDP 客户端。
 *
 * 流程:
 *   1. 打开职位页
 *   2. 点「立即沟通」（BOSS 会自动发默认招呼）
 *   3. 若弹「是否就新职位继续沟通」→ 点「沟通新职位」
 *   4. 定位聊天输入框（若未跳转则主动导航到消息页）
 *   5. Input.insertText 输入定制文案
 *   6. 按 Enter 发送
 *
 * 用法:
 *   node greet.mjs --input pipeline.json            # 从 pipeline 输出读取
 *   node greet.mjs --input pipeline.json --dry      # 演练
 *   node greet.mjs --input pipeline.json --limit 3  # 只发前3个
 *   node greet.mjs --input pipeline.json --start 5  # 从第5个开始
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL_DATA = join(__SKILL_DIR, 'data');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// ============================================================================
// 最小 CDP 客户端
// ============================================================================
async function connectCDP(port = 9222) {
  const base = `http://127.0.0.1:${port}`;
  let list;
  try {
    list = await (await fetch(`${base}/json/list`)).json();
  } catch {
    throw new Error(`CDP ${port} 不可达。请先启动带调试端口的 Chrome。`);
  }
  const pages = list.filter(t => t.type === 'page');
  const page = pages.find(t => /^https?:/.test(t.url)) || pages.find(t => t.url === 'about:blank') || pages[0];
  if (!page) throw new Error(`端口 ${port} 无可用 page`);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  };
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('ws 连接失败'));
    setTimeout(() => rej(new Error('ws 连接超时')), 10000);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP 超时: ${method}`)); }
      }, 30000);
    });
  return { send, close: () => { try { ws.close(); } catch {} } };
}

async function evaluate(send, expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(`页面异常: ${res.exceptionDetails.text || 'unknown'}`);
  return res.result?.value;
}

async function gotoPage(send, url, { minLen = 400, timeoutMs = 30000 } = {}) {
  await send('Page.navigate', { url });
  const deadline = Date.now() + timeoutMs;
  let last = { url: '', len: -1 };
  while (Date.now() < deadline) {
    await sleep(400);
    try {
      last = JSON.parse(await evaluate(send, `JSON.stringify({url: location.href, len: document.body?document.body.innerText.length:-1})`));
    } catch { continue; }
    if (last.len >= minLen) { await sleep(rand(300, 700)); return last; }
  }
  throw new Error(`导航未完成: ${last.url}`);
}

/** 拟人点击 */
async function clickAt(send, x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - rand(20, 60), y: y - rand(15, 45), button: 'none', buttons: 0 });
  await sleep(rand(60, 150));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  await sleep(rand(100, 250));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(rand(50, 120));
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}

/** 定位聊天输入框和发送按钮 */
async function locateChat(send) {
  const raw = await evaluate(send, `(() => {
    const out = {};
    const inp = document.querySelector('div.chat-input[contenteditable="true"], .chat-input[contenteditable]');
    if (inp) {
      const r = inp.getBoundingClientRect();
      out.input = { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    }
    const btn = document.querySelector('button.btn-send, .btn-send');
    if (btn) {
      const r = btn.getBoundingClientRect();
      out.sendBtn = { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), disabled: btn.disabled };
    }
    out.url = location.href;
    out.inputLen = inp ? (inp.innerText || '').length : -1;
    return JSON.stringify(out);
  })()`);
  return JSON.parse(raw);
}

/**
 * 输入文本到 contenteditable。
 * 必须用 Input.insertText —— dispatchKeyEvent{type:'char'} 对 contenteditable 无效。
 * 按行分段插入，行间用 Ctrl+Enter 换行（BOSS 的换行快捷键）。
 */
async function typeInto(send, text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let pos = 0;
    while (pos < line.length) {
      const chunk = Math.min(line.length - pos, Math.floor(rand(8, 20)));
      await send('Input.insertText', { text: line.slice(pos, pos + chunk) });
      pos += chunk;
      await sleep(rand(120, 380));
    }
    if (i < lines.length - 1) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 2 });
      await sleep(rand(40, 90));
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 2 });
      await sleep(rand(150, 350));
    }
  }
  await sleep(rand(500, 900));
}

// ============================================================================
// 参数
// ============================================================================
const argv = process.argv.slice(2);
const flags = new Set();
const opts = {};
const VALUE_FLAGS = new Set(['--input', '--limit', '--start', '--port', '--gap']);

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.has(a)) { opts[a.slice(2)] = argv[++i]; continue; }
  if (a.startsWith('--')) { flags.add(a); continue; }
}

const INPUT = opts.input;
if (!INPUT) {
  console.error('用法: node greet.mjs --input <pipeline输出.json> [--limit N] [--start N] [--dry] [--port 9222]');
  process.exit(1);
}
const PORT = Number(opts.port || 9222);
const LIMIT = Number(opts.limit || 999);
const START = Number(opts.start || 1);
const GAP_MIN = Number(opts.gap || 7000);
const DRY = flags.has('--dry');

// ============================================================================
// 主流程
// ============================================================================
const jobs = JSON.parse(await fs.readFile(resolve(INPUT), 'utf8'));
if (!Array.isArray(jobs) || !jobs.length) {
  console.error('输入文件为空或格式错误');
  process.exit(1);
}

const startIdx = START - 1;
const endIdx = Math.min(jobs.length, startIdx + LIMIT);

console.log(`=== 打招呼 ${DRY ? '[演练]' : ''} | ${startIdx + 1}..${endIdx} / 共 ${jobs.length} ===\n`);

const { send, close } = await connectCDP(PORT);
const results = [];

for (let i = startIdx; i < endIdx; i++) {
  const j = jobs[i];
  const text = j.greeting;
  const rec = { index: i + 1, jobName: j.jobName, company: j.company, salary: j.salaryDesc, jobId: j.jobId, status: 'pending' };

  console.log(`[${i + 1}/${jobs.length}] ${j.jobName} | ${j.salaryDesc || '?'} | ${j.company || '?'}`);

  if (!text) {
    console.log('  ⚠️ 无文案，跳过');
    rec.status = 'no-greeting';
    results.push(rec);
    continue;
  }

  try {
    // 1. 打开职位页
    await gotoPage(send, `https://www.zhipin.com/job_detail/${j.jobId}.html`, { minLen: 400 });
    await sleep(rand(900, 1500));

    // 2. 找按钮
    const preRaw = await evaluate(send, `(() => {
      const t = document.body ? document.body.innerText : '';
      const btns = [...document.querySelectorAll('a,div')]
        .filter(el => {
          const x = (el.innerText || '').trim();
          return (x === '立即沟通' || x === '继续沟通') && el.getBoundingClientRect().width > 4;
        })
        .map(el => {
          const r = el.getBoundingClientRect();
          return { text: el.innerText.trim(), x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) };
        });
      return JSON.stringify({ btns, already: t.includes('继续沟通') });
    })()`);
    const pre = JSON.parse(preRaw);

    if (!pre.btns.length) {
      console.log('  ⚠️ 无「立即沟通/继续沟通」按钮（可能已下架）');
      rec.status = 'no-button';
      results.push(rec);
      continue;
    }

    if (DRY) {
      console.log(`  [演练] 会点「${pre.btns[0].text}」(${pre.btns[0].x},${pre.btns[0].y}) 并输入 ${text.length} 字`);
      rec.status = 'dry';
      results.push(rec);
      continue;
    }

    // 3. 点按钮
    const btn = pre.btns[0];
    console.log(`  点击「${btn.text}」`);
    await clickAt(send, btn.x, btn.y);
    await sleep(rand(2000, 3000));

    // 4. 处理「是否就新职位继续沟通」弹窗
    const dlgRaw = await evaluate(send, `(() => {
      const t = document.body ? document.body.innerText : '';
      if (!(t.includes('是否就新职位') || t.includes('更换沟通职位'))) return JSON.stringify({ has: false });
      for (const el of document.querySelectorAll('button, a, div, span')) {
        const x = (el.innerText || '').trim();
        if (x === '沟通新职位' && el.getBoundingClientRect().width > 10) {
          const r = el.getBoundingClientRect();
          return JSON.stringify({ has: true, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) });
        }
      }
      return JSON.stringify({ has: true, btn: null });
    })()`);
    const dlg = JSON.parse(dlgRaw);
    if (dlg.has) {
      if (dlg.x) {
        console.log('  确认「沟通新职位」');
        await clickAt(send, dlg.x, dlg.y);
        await sleep(rand(2500, 3500));
      } else {
        console.log('  ⚠️ 弹窗但找不到确认按钮');
      }
    }

    // 5. 定位输入框
    let chat = await locateChat(send);

    // 未跳转聊天页 → 主动导航（首次沟通不跳转）
    if (!chat.input) {
      console.log('  未跳转，主动导航到消息页');
      await gotoPage(send, 'https://www.zhipin.com/web/geek/chat', { minLen: 200 });
      await sleep(rand(2500, 3500));

      const convRaw = await evaluate(send, `(() => {
        const el = document.querySelector('.friend-content');
        if (!el) return JSON.stringify(null);
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) });
      })()`);
      const conv = JSON.parse(convRaw);
      if (conv) {
        console.log('  点最新会话');
        await clickAt(send, conv.x, conv.y);
        await sleep(rand(2000, 3000));
      }
      chat = await locateChat(send);
    }

    if (!chat.input) {
      console.log('  ⚠️ 找不到输入框');
      rec.status = 'no-input';
      results.push(rec);
      await fs.writeFile(join(SKILL_DATA, '..', 'out', 'greet-results.json'), JSON.stringify(results, null, 2), 'utf8');
      await sleep(rand(2000, 4000));
      continue;
    }

    // 6. 点输入框并输入
    await clickAt(send, chat.input.x, chat.input.y);
    await sleep(rand(500, 900));
    console.log(`  输入 ${text.length} 字...`);
    await typeInto(send, text);

    // 7. 验证
    const typedRaw = await evaluate(send, `(() => {
      const el = document.querySelector('div.chat-input[contenteditable="true"], .chat-input[contenteditable]');
      return JSON.stringify({ len: el ? (el.innerText || '').length : -1 });
    })()`);
    const typed = JSON.parse(typedRaw);
    console.log(`  已输入 ${typed.len} 字`);

    if (typed.len < 20) {
      console.log('  ⚠️ 输入过少，跳过发送');
      rec.status = 'input-failed';
      results.push(rec);
      await fs.writeFile(join(SKILL_DATA, '..', 'out', 'greet-results.json'), JSON.stringify(results, null, 2), 'utf8');
      await sleep(rand(2000, 4000));
      continue;
    }

    // 8. 重新聚焦 + Enter 发送
    await clickAt(send, chat.input.x, chat.input.y);
    await sleep(rand(400, 700));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(rand(60, 110));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(rand(1800, 2800));

    // 9. 验证已发送
    const afterRaw = await evaluate(send, `(() => {
      const el = document.querySelector('div.chat-input[contenteditable="true"], .chat-input[contenteditable]');
      return JSON.stringify({ len: el ? (el.innerText || '').length : -1 });
    })()`);
    const after = JSON.parse(afterRaw);
    const ok = after.len < 10;

    console.log(ok ? '  ✅ 已发送' : '  ⚠️ 可能未发送');
    rec.status = ok ? 'sent' : 'uncertain';
    rec.sentAt = new Date().toISOString();
    results.push(rec);
    await fs.writeFile(join(SKILL_DATA, '..', 'out', 'greet-results.json'), JSON.stringify(results, null, 2), 'utf8');

    // 10. 间隔
    if (i < endIdx - 1) {
      const gap = rand(GAP_MIN, GAP_MIN + 6000);
      console.log(`  ⏳ ${(gap / 1000).toFixed(1)}s`);
      await sleep(gap);
    }
  } catch (e) {
    console.log(`  ❌ ${e.message.slice(0, 100)}`);
    rec.status = 'error';
    rec.error = e.message.slice(0, 200);
    results.push(rec);
    await fs.writeFile(join(SKILL_DATA, '..', 'out', 'greet-results.json'), JSON.stringify(results, null, 2), 'utf8');
    await sleep(rand(3000, 6000));
  }
}

close();

const stat = {};
for (const r of results) stat[r.status] = (stat[r.status] || 0) + 1;
console.log(`\n=== 完成 ===`);
for (const [k, v] of Object.entries(stat)) console.log(`  ${k}: ${v}`);
console.log(`  结果: ${join(SKILL_DATA, '..', 'out', 'greet-results.json')}`);
