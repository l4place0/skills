#!/usr/bin/env node
/**
 * pipeline.mjs — 按方向搜索职位 → 提取明文数据 → 生成定制文案
 *
 * 自包含：内嵌最小 CDP 客户端，不依赖外部 skill。
 *
 * 用法:
 *   node pipeline.mjs "AI Agent" --city <城市> --limit 5
 *   node pipeline.mjs "C++" --city 深圳 --limit 10 --pages 2
 *   node pipeline.mjs "Python" --city <城市> --limit 5 --strict
 *
 * 参数:
 *   --city <城市名>     缺省时读 profile.json 的 city（查 data/city_codes.json）
 *   --limit <N>         处理前 N 个（默认 5）
 *   --pages <N>         搜索翻页数（默认 1）
 *   --strict            开启方向相关性过滤（去除模糊匹配噪声）
 *   --port <N>          CDP 端口（默认 9222）
 *   --output <path>     输出 JSON 路径
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL_DATA = join(__SKILL_DIR, 'data');
const CITY_TABLE = join(SKILL_DATA, 'city_codes.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// ============================================================================
// 最小 CDP 客户端（自包含，不依赖外部 skill）
// ============================================================================

/**
 * 只使用 Page + Runtime + Input 三个域。
 * 禁用 DOM/Debugger/bindings/isolated worlds —— 那些会被 Boss 反爬识别。
 */
async function connectCDP(port = 9222) {
  const base = `http://127.0.0.1:${port}`;

  let list;
  try {
    list = await (await fetch(`${base}/json/list`)).json();
  } catch {
    throw new Error(
      `CDP ${port} 不可达。请先启动带调试端口的 Chrome：\n` +
      `  chrome.exe --remote-debugging-port=${port} --user-data-dir=<profile>`
    );
  }

  const pages = list.filter(t => t.type === 'page');
  const page = pages.find(t => /^https?:/.test(t.url)) || pages.find(t => t.url === 'about:blank') || pages[0];
  if (!page) throw new Error(`端口 ${port} 上没有可用的 page target`);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();

  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };

  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('websocket 连接失败'));
    setTimeout(() => rej(new Error('websocket 连接超时')), 10000);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`CDP 超时: ${method}`));
        }
      }, 30000);
    });

  return { send, close: () => { try { ws.close(); } catch {} } };
}

async function evaluate(send, expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`页面脚本异常: ${res.exceptionDetails.text || 'unknown'}`);
  }
  return res.result?.value;
}

async function gotoPage(send, url, { minLen = 400, timeoutMs = 30000 } = {}) {
  await send('Page.navigate', { url });
  const deadline = Date.now() + timeoutMs;
  let last = { url: '', len: -1 };

  while (Date.now() < deadline) {
    await sleep(400);
    try {
      const raw = await evaluate(send, `JSON.stringify({
        url: location.href,
        len: document.body ? document.body.innerText.length : -1
      })`);
      last = JSON.parse(raw);
    } catch {
      continue;
    }
    if (last.len >= minLen) {
      await sleep(rand(300, 700));
      return last;
    }
  }
  throw new Error(`导航未完成: ${last.url} (bodyLen=${last.len})`);
}

// ============================================================================
// 方向相关性过滤（修复搜索模糊匹配噪声）
// ============================================================================

/**
 * BOSS 的搜索是标题模糊匹配，会把"音视频"搜出短视频剪辑、"安全"搜出施工安全员。
 * 这里按方向定义相关岗位名的正则，用于 --strict 模式过滤。
 */
const RELEVANCE = {
  'C++': /c\+\+|qt\b|c语言|上位机|嵌入式|linux|驱动|算法|软件开发|软件工程师/i,
  '音视频': /音视频|编解码|ffmpeg|音视频开发|多媒体|音频算法/i,   // 严格：排除短视频剪辑/主播
  'Linux': /linux|内核|驱动|嵌入式|系统开发|中间件|应用开发/i,
  '嵌入式': /嵌入式|单片机|mcu|硬件|电控|固件|bsp|驱动/i,
  'Python': /python|后端|爬虫|数据|算法|开发/i,
  'AI Agent': /ai|agent|智能体|大模型|llm/i,
  'MCP': /ai|agent|智能体|大模型|llm|全栈|应用开发/i,
  'RAG': /ai|rag|大模型|智能体|应用开发|算法/i,
  '大模型': /ai|大模型|agent|智能体|llm|应用/i,
  '后端开发': /后端|服务端|java|python|go\b|开发工程师|软件开发/i,
  'Java': /java|后端|服务端|开发/i,
  '前端': /前端|vue|react|web\b|h5/i,
  '爬虫': /爬虫|采集|数据抓取|python/i,
  '安全': /网络安全|信息安全|安全工程师|安全研发|渗透|等保|appsec/i,   // 严格：排除施工/化工安全
  '运维': /运维|sre|it支持|技术支持|系统管理/i,
  '测试': /测试|qa\b|质量工程|自动化测试/i,
  '车载': /车载|座舱|车机|智驾|智能驾驶|汽车电子|ivi/i,
  'Android': /android|安卓/i,
  '算法': /算法|模型|机器学习|深度学习|cv\b|nlp/i,
  'Java后端': /java|后端|服务端/i,
};

function isRelevant(keyword, jobName) {
  const re = RELEVANCE[keyword];
  if (!re) return true;               // 未定义的方向不过滤
  return re.test(jobName || '');
}

// ============================================================================
// 候选人档案 + 文案生成（委托给 _greeting.mjs）
// ============================================================================

const { loadProfile, buildGreeting } = await import('./_greeting.mjs');
const PROFILE = await loadProfile();

if (!Object.keys(PROFILE).length) {
  console.warn('⚠️ 档案为空，将生成无个人经历的兜底文案');
} else {
  const bits = [];
  if (PROFILE.education?.degree) bits.push(PROFILE.education.degree);
  if (PROFILE.certificates?.length) bits.push(`${PROFILE.certificates.length} 项证书`);
  if (PROFILE.awards?.length) bits.push(`${PROFILE.awards.length} 项奖项`);
  if (PROFILE.skills?.length) bits.push(`${PROFILE.skills.length} 项技能`);
  console.log(`档案: ${PROFILE.name || '(未填姓名)'} | ${bits.join(' / ') || '信息较少'}`);
}
// ============================================================================
// 参数字典
// ============================================================================

const argv = process.argv.slice(2);
const positional = [];
const flags = new Set();
const opts = {};
const VALUE_FLAGS = new Set(['--city', '--limit', '--pages', '--port', '--output']);

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.has(a)) { opts[a.slice(2)] = argv[++i]; continue; }
  if (a.startsWith('--')) { flags.add(a); continue; }
  positional.push(a);
}

const KEYWORD = positional[0];
if (!KEYWORD) {
  console.error('用法: node pipeline.mjs "<关键词>" [--city <城市>] [--limit 5] [--pages 1] [--strict]');
  process.exit(1);
}

const CITY_NAME = opts.city || PROFILE.city;
if (!CITY_NAME) {
  console.error('缺少城市：请用 --city <城市名>，或在 profile.json 里设置 city 字段。');
  process.exit(1);
}
const LIMIT = Number(opts.limit || 5);
const PAGES = Number(opts.pages || 1);
const PORT = Number(opts.port || 9222);
const STRICT = flags.has('--strict');

// ============================================================================
// 主流程
// ============================================================================

const cityTable = JSON.parse(await fs.readFile(CITY_TABLE, 'utf8'));
const CITY_CODE = cityTable[CITY_NAME];
if (!CITY_CODE) {
  console.error(`未知城市「${CITY_NAME}」。示例: ${Object.keys(cityTable).slice(0, 8).join(', ')}`);
  process.exit(1);
}

console.log(`=== 搜索「${KEYWORD}」| ${CITY_NAME} (${CITY_CODE}) | ${PAGES} 页${STRICT ? ' | 严格过滤' : ''} ===\n`);

const { send, close } = await connectCDP(PORT);
const collected = [];

// ---- Step 1: 搜索（支持翻页）----
for (let page = 1; page <= PAGES; page++) {
  const url = `https://www.zhipin.com/web/geek/jobs?query=${encodeURIComponent(KEYWORD)}&city=${CITY_CODE}&page=${page}`;
  console.log(`[搜索 ${page}/${PAGES}]`);

  try {
    await gotoPage(send, url, { minLen: 500 });
    await sleep(rand(2200, 3200));

    const raw = await evaluate(send, `JSON.stringify([...document.querySelectorAll('li.job-card-box')].map(card => {
      const link = card.querySelector('a[href*="/job_detail/"]');
      let jobId = null;
      if (link) {
        const parts = (link.getAttribute('href') || '').split('/job_detail/');
        if (parts.length > 1) jobId = parts[1].split('.')[0];
      }
      const g = s => { const e = card.querySelector(s); return e ? e.innerText.trim() : null; };
      return {
        jobName: g('.job-name'),
        jobId,
        company: g('.boss-name'),
        location: g('.company-location'),
        tags: [...card.querySelectorAll('.tag-list li')].map(t => t.innerText.trim()).filter(Boolean)
      };
    }).filter(j => j.jobName && j.jobId))`);

    const pageJobs = JSON.parse(raw);
    const inCity = pageJobs.filter(j => (j.location || '').includes(CITY_NAME));
    console.log(`  抓到 ${pageJobs.length} | 在${CITY_NAME} ${inCity.length}`);
    collected.push(...inCity);
  } catch (e) {
    console.log(`  ❌ ${e.message.slice(0, 100)}`);
  }

  if (page < PAGES) await sleep(rand(2500, 4000));
}

// ---- 去重 + 过滤 ----
const seen = new Set();
let list = collected.filter(j => {
  if (seen.has(j.jobId)) return false;
  seen.add(j.jobId);
  return true;
});

console.log(`\n去重后: ${list.length} 个`);

if (STRICT) {
  const before = list.length;
  list = list.filter(j => isRelevant(KEYWORD, j.jobName));
  console.log(`严格过滤: ${before} → ${list.length}（剔除 ${before - list.length} 个模糊匹配噪声）`);
}

if (!list.length) {
  console.log('\n⚠️ 无相关结果');
  close();
  process.exit(0);
}

list = list.slice(0, LIMIT);
console.log(`\n处理前 ${list.length} 个:\n`);
list.forEach((j, i) => console.log(`  ${i + 1}. ${j.jobName} | ${j.company} | ${j.location} | ${j.tags.join('·')}`));

// ---- Step 2: 逐个取详情（明文薪资 + JD）----
console.log(`\n[获取详情]`);
const detailed = [];

for (let i = 0; i < list.length; i++) {
  const j = list[i];
  process.stdout.write(`  [${i + 1}/${list.length}] ${j.jobName.slice(0, 20)}... `);

  try {
    await gotoPage(send, `https://www.zhipin.com/job_detail/${j.jobId}.html`, { minLen: 400 });
    await sleep(rand(1500, 2500));

    const raw = await evaluate(send, `(() => {
      const g = s => { const e = document.querySelector(s); return e ? e.innerText.trim() : null; };
      const ji = window._jobInfo || {};
      const lines = (document.body ? document.body.innerText : '').split('\\n').map(s => s.trim()).filter(Boolean);
      const DEG = ['本科','大专','硕士','博士','高中','中专','中技','学历不限'];
      const isExp = s => /年|应届|经验不限/.test(s) && !DEG.includes(s);
      const sum = lines.find(l => {
        const p = l.split(/\\s+/);
        return p.length >= 2 && p.some(isExp) && p.some(x => DEG.includes(x));
      });
      const parts = sum ? sum.split(/\\s+/) : [];

      // 公司名：优先「公司基本信息」区块下一行（最可靠），
      // 其次 _jobInfo.company，最后 .company-name
      // 注意：.company-info .name 会误匹配到职位名，禁用该选择器
      let company = null;
      const bi = lines.indexOf('公司基本信息');
      if (bi >= 0 && bi + 1 < lines.length) {
        const cand = lines[bi + 1];
        if (cand && cand.length < 40 && !DEG.includes(cand)) company = cand;
      }
      if (!company) company = ji.company || null;
      if (!company) company = g('.company-name') || null;

      return JSON.stringify({
        jobName: g('.job-name, .job-primary .name h1, h1') || ji.job_name || null,
        salaryDesc: g('.salary, .job-salary') || ji.job_salary || null,
        company,
        locationName: parts[0] || null,
        experienceName: parts.find(isExp) || null,
        degreeName: parts.find(x => DEG.includes(x)) || null,
        address: g('.location-address') || null,
        postDescription: (g('.job-sec-text') || '').slice(0, 4000)
      });
    })()`);

    const d = JSON.parse(raw);
    console.log(`${d.salaryDesc || '?'} | ${d.locationName || '?'} | ${d.experienceName || '?'}/${d.degreeName || '?'}`);
    detailed.push({ ...j, ...d, ok: true });
  } catch (e) {
    console.log(`❌ ${e.message.slice(0, 60)}`);
    detailed.push({ ...j, ok: false });
  }

  await sleep(rand(1800, 3000));
}

close();

// ---- Step 3: 生成文案 ----
console.log(`\n[生成定制文案]`);
const final = [];
for (const d of detailed) {
  if (!d.ok) continue;
  const k = parseSalary(d.salaryDesc);
  const rec = { ...d, ...(k || {}), greeting: buildGreeting(d.jobName, PROFILE) };
  final.push(rec);
  console.log(`\n── ${d.jobName} | ${d.salaryDesc} | ${d.company} ──`);
  if (k) console.log(`   年化 ${k.annual} 万`);
  console.log(rec.greeting.split('\n').map(l => '   ' + l).join('\n'));
}

function parseSalary(s) {
  if (!s) return null;
  const m = String(s).match(/([\d.]+)\s*[-~]\s*([\d.]+)\s*K/);
  if (!m) return null;
  const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
  const mm = String(s).match(/·\s*(\d+)\s*薪/);
  const months = mm ? parseInt(mm[1], 10) : 12;
  const mid = (lo + hi) / 2;
  return { salaryLow: lo, salaryHigh: hi, months, salaryMid: mid, annual: +(mid * months / 12).toFixed(1) };
}

// ---- 输出 ----
const outFile = opts.output
  ? path.resolve(opts.output)
  : join(SKILL_DATA, '..', 'out', `pipeline-${CITY_NAME}-${KEYWORD.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.json`);

await fs.mkdir(dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify(final, null, 2), 'utf8');

console.log(`\n=== 完成 ===`);
console.log(`  搜索 ${collected.length} → 去重 ${list.length} → 详情 ${detailed.filter(d => d.ok).length} → 文案 ${final.length}`);
console.log(`  输出: ${outFile}`);
