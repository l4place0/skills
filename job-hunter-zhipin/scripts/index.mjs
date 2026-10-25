#!/usr/bin/env node
/**
 * index.mjs — 从 Boss 消息页抓沟通状态，生成投递追踪索引
 *
 * 用法:
 *   node index.mjs --jobs out/pipeline-惠州-AI_Agent.json
 *   node index.mjs --jobs out/pipeline.json --output tracking.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL_DATA = join(__SKILL_DIR, 'data');

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function gotoPage(send, url, { minLen = 200, timeoutMs = 30000 } = {}) {
  await send('Page.navigate', { url });
  const deadline = Date.now() + timeoutMs;
  let last = { url: '', len: -1 };
  while (Date.now() < deadline) {
    await sleep(400);
    try {
      last = JSON.parse(await evaluate(send, `JSON.stringify({url: location.href, len: document.body?document.body.innerText.length:-1})`));
    } catch { continue; }
    if (last.len >= minLen) { await sleep(600); return last; }
  }
  throw new Error(`导航未完成: ${last.url}`);
}

// ============================================================================
// 参数
// ============================================================================
const argv = process.argv.slice(2);
const flags = new Set();
const opts = {};
const VALUE_FLAGS = new Set(['--jobs', '--output', '--port']);

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.has(a)) { opts[a.slice(2)] = argv[++i]; continue; }
  if (a.startsWith('--')) { flags.add(a); continue; }
}

if (!opts.jobs) {
  console.error('用法: node index.mjs --jobs <pipeline输出.json> [--output tracking.md] [--port 9222]');
  process.exit(1);
}
const PORT = Number(opts.port || 9222);

// ============================================================================
// 主流程
// ============================================================================
const jobs = JSON.parse(await fs.readFile(resolve(opts.jobs), 'utf8'));
console.log(`=== 读取 ${jobs.length} 个岗位 ===`);

const { send, close } = await connectCDP(PORT);
console.log('打开消息页...');
await gotoPage(send, 'https://www.zhipin.com/web/geek/chat', { minLen: 200 });
await sleep(3000);

// 抓会话列表
const convRaw = await evaluate(send, `JSON.stringify([...document.querySelectorAll('.friend-content')].map(el => (el.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean).join(' | ')))`);
const convs = JSON.parse(convRaw);
console.log(`抓到 ${convs.length} 条会话`);

close();

// 匹配：按公司名 / 岗位名关联
function statusOf(job) {
  const co = (job.company || '').replace(/\.\.\.$/, '');
  const jn = (job.jobName || '').slice(0, 12);

  for (const c of convs) {
    const hitCompany = co && c.includes(co);
    const hitJob = jn && c.includes(jn);
    if (!hitCompany && !hitJob) continue;

    if (/不合适|不方便|抱歉|已招满/.test(c)) return '已回复(婉拒)';
    if (/\[已读\]/.test(c)) return '已读';
    if (/\[送达\]/.test(c)) return '已送达';
    return '沟通中';
  }
  return '未沟通';
}

const rows = jobs.map((j, i) => ({
  idx: i + 1,
  jobName: j.jobName,
  company: j.company,
  salary: j.salaryDesc,
  annual: j.annual,
  exp: j.experienceName,
  degree: j.degreeName,
  jobId: j.jobId,
  status: statusOf(j)
}));

// 生成 Markdown
const md = [];
md.push('---');
md.push(`Title: "JD 投递追踪索引"`);
md.push(`Url: "https://www.zhipin.com/web/geek/chat"`);
md.push(`Author: "BOSS直聘"`);
md.push(`Origin: "zhipin.com"`);
md.push(`Description: "BOSS直聘岗位投递与沟通追踪表：含薪资、要求、沟通状态与对方反馈。"`);
md.push('Tags:');
for (const t of ['求职', 'BOSS直聘', '投递追踪', '岗位索引']) md.push(`  - "${t}"`);
md.push('read: false');
md.push(`created: "${new Date().toISOString().slice(0, 19).replace('T', ' ')}"`);
md.push(`rid: "${crypto.randomUUID()}"`);
md.push('---');
md.push('');
md.push('# JD 投递追踪索引');
md.push('');
md.push(`> 更新：${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);
md.push(`> 共 ${rows.length} 个岗位，已沟通 **${rows.filter(r => r.status !== '未沟通').length}** 个`);
md.push('');
md.push('## 状态总览');
md.push('');
md.push('| # | 职位 | 公司 | 薪资 | 年化 | 要求 | 状态 |');
md.push('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const icon = r.status.includes('婉拒') ? '❌' : r.status === '未沟通' ? '⬜' : r.status === '已读' ? '👀' : '✅';
  md.push(`| ${r.idx} | ${r.jobName} | ${r.company || '?'} | ${r.salary || '?'} | ${r.annual ?? '?'}万 | ${r.exp || '?'}/${r.degree || '?'} | ${icon} ${r.status} |`);
}
md.push('');
md.push('## 图例');
md.push('');
md.push('| 标记 | 含义 |');
md.push('|---|---|');
md.push('| ✅ | 已发送（送达） |');
md.push('| 👀 | 对方已读 |');
md.push('| ❌ | 对方婉拒 |');
md.push('| ⬜ | 未沟通 |');
md.push('');
md.push('## 明细');
md.push('');
for (const r of rows) {
  md.push(`### ${r.idx}. ${r.jobName} · ${r.company || '?'}`);
  md.push(`- 薪资：${r.salary || '?'}（年化 ${r.annual ?? '?'} 万）`);
  md.push(`- 要求：${r.exp || '?'} / ${r.degree || '?'}`);
  md.push(`- 状态：**${r.status}**`);
  md.push(`- 链接：https://www.zhipin.com/job_detail/${r.jobId}.html`);
  md.push('');
}

const outFile = opts.output ? resolve(opts.output) : join(SKILL_DATA, '..', 'out', 'tracking.md');
await fs.mkdir(dirname(outFile), { recursive: true });
await fs.writeFile(outFile, md.join('\n'), 'utf8');

const stat = {};
for (const r of rows) stat[r.status] = (stat[r.status] || 0) + 1;

console.log(`\n=== 统计 ===`);
for (const [k, v] of Object.entries(stat)) console.log(`  ${k}: ${v}`);
console.log(`\n索引: ${outFile}`);
