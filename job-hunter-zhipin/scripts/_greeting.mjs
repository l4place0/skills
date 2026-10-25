// ============================================================================
// 候选人档案 + 文案生成
// ============================================================================
//
// 文案完全由 profile.json 驱动，脚本内不含任何个人信息。
// 任何字段省略时，对应段落自动不生成（不留占位符、不留空行）。

import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

const PROFILE_PATH = process.env.JOB_HUNTER_PROFILE || join(__SKILL_DIR, 'profile.json');

/**
 * 档案字段说明见 profile.example.json。
 * 全部字段可选；缺失即跳过对应段落。
 */
export async function loadProfile() {
  let raw;
  try {
    raw = await fs.readFile(PROFILE_PATH, 'utf8');
  } catch {
    console.warn(
      `⚠️ 未找到档案: ${PROFILE_PATH}\n` +
      `   请复制 profile.example.json 为 profile.json 并填写。\n` +
      `   将使用最小兜底文案（仅岗位名，无个人经历）。`
    );
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`profile.json 解析失败: ${e.message}`);
  }
}

/** 把数组压成「A、B、C」 */
const listJoin = (arr, sep = '、') => (arr || []).filter(Boolean).join(sep);

/**
 * 生成「背书句」：学历 + 证书 + 奖项。
 * 只使用档案里真实存在的字段，缺什么不提什么。
 *
 * 长度受控 —— BOSS 招呼语太长 HR 不会看完。默认最多 2 项证书 + 2 项奖项，
 * 可用 profile.greetingStyle.maxCerts / maxAwards 调整，设为 0 则整段省略。
 */
export function buildCredential(p) {
  const style = p.greetingStyle || {};
  const maxCerts = style.maxCerts ?? 2;
  const maxAwards = style.maxAwards ?? 2;

  const parts = [];

  const edu = p.education || {};
  const eduBits = [];
  if (edu.cohort) eduBits.push(edu.cohort);
  if (edu.major) eduBits.push(edu.major);
  if (edu.degree) eduBits.push(edu.degree);
  if (eduBits.length) parts.push(eduBits.join(''));

  const certs = (p.certificates || []).filter(Boolean).slice(0, maxCerts);
  if (certs.length) parts.push(`考过${listJoin(certs)}`);

  // 奖项支持两种写法：
  //   "XX 大赛全国二等奖"                              ← 字符串，原样使用
  //   { short: "XX 大赛全国二等奖", full: "全称" }     ← 对象，优先 short
  // short 用于招呼语（要短），full 可留给简历。
  const awards = (p.awards || [])
    .filter(Boolean)
    .slice(0, maxAwards)
    .map(a => (typeof a === 'string' ? a : a.short || a.full || ''))
    .filter(Boolean);
  if (awards.length) parts.push(`拿过${listJoin(awards)}`);

  return parts.length ? parts.join('，') + '。' : '';
}

/**
 * 方向匹配规则：从岗位名判断该突出哪类经历。
 *
 * 规则按 `skills` 里是否命中来选，而不是写死行业。
 * 用户可在 profile.greetingStyle.directions 里覆盖。
 */
const DIRECTION_RULES = [
  {
    key: 'security',
    match: /安全|渗透|等保|风控|合规/i,
    hint: ['安全', '渗透', '风控', '合规', '等保'],
    pivot: '这个方向如果我没做过，我愿意学，基础在，上手应该不慢。',
  },
  {
    key: 'ai',
    match: /AI|智能体|Agent|大模型|LLM|算法|数据/i,
    hint: ['AI', 'Agent', '大模型', 'Python', '算法', '数据', '模型'],
    pivot: '这个方向我做过相关的，愿意深入。',
  },
  {
    key: 'embedded',
    match: /嵌入式|驱动|bsp|linux|车载|座舱|单片机|硬件|电子|android|安卓|鸿蒙/i,
    hint: ['C++', 'C语言', 'Linux', '嵌入式', '驱动', '单片机', '硬件'],
    pivot: '这个方向如果我没做过，我愿意学，基础在，上手应该不慢。',
  },
  {
    key: 'media',
    match: /音视频|编解码|多媒体|算法/i,
    hint: ['C++', '音视频', '编解码', 'ffmpeg', '算法'],
    pivot: '这个方向如果我没做过，我愿意学，基础在，上手应该不慢。',
  },
  {
    key: 'vision',
    match: /视觉|图像|检测|识别/i,
    hint: ['视觉', '图像', 'OpenCV', '算法', 'Python'],
    pivot: '这个方向我没做过，但基础在，愿意学。',
  },
  {
    key: 'frontend',
    match: /前端|web|vue|react|h5/i,
    hint: ['前端', 'React', 'Vue', 'TypeScript', 'JavaScript'],
    pivot: '这个方向我做过相关的。',
  },
  {
    key: 'ops',
    match: /运维|IT|Helpdesk|桌面|支持|网络/i,
    hint: ['运维', 'Linux', '网络', 'IT'],
    pivot: '这个方向我有相关经验。',
  },
  {
    key: 'backend',
    match: /后端|服务端|java|python|go\b|开发/i,
    hint: ['Java', 'Python', '后端', 'SpringBoot', 'FastAPI', '数据库'],
    pivot: '这个方向我做过相关的。',
  },
  {
    key: 'general',
    match: /.*/,
    hint: [],
    pivot: '愿意从基础做起，学得快。',
  },
];

/**
 * 挑出与该岗位最相关的技能条目。
 * 返回命中的 skill 原文（最多 3 条），以及匹配到的方向规则。
 */
function pickSkillsFor(jobName, profile) {
  const skills = (profile.skills || []).filter(Boolean);
  if (!skills.length) return { hits: [], rule: DIRECTION_RULES[DIRECTION_RULES.length - 1] };

  // 允许用户覆盖方向规则
  const custom = profile.greetingStyle?.directions;
  const rules = Array.isArray(custom) && custom.length ? custom : DIRECTION_RULES;

  const rule = rules.find(r => new RegExp(r.match).test(jobName)) || rules[rules.length - 1];

  // 按 hint 关键词给技能打分，取最相关的前 3 条
  const hints = rule.hint || [];
  const scored = skills.map(s => {
    let score = 0;
    for (const h of hints) {
      if (new RegExp(h, 'i').test(s)) score += 1;
    }
    return { s, score };
  });

  const matched = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const hits = (matched.length ? matched : scored).slice(0, 3).map(x => x.s);

  return { hits, rule };
}

/**
 * 组装完整招呼语。
 *
 * 结构（每段缺失则整段跳过）：
 *   开场 → 背书 → 相关经历 → 作品链接 → 收尾
 */
export function buildGreeting(jobName, profile) {
  const style = profile.greetingStyle || {};
  const opening = (style.opening || '您好，看到贵司在招{job}，想自荐一下。').replace('{job}', jobName);
  const closing = style.closing || '希望能有机会聊聊。';

  const blocks = [opening];

  const cred = buildCredential(profile);
  if (cred) blocks.push(cred);

  const { hits, rule } = pickSkillsFor(jobName, profile);
  if (hits.length) {
    blocks.push(`相关经历：${listJoin(hits, '；')}。${rule.pivot || ''}`.trim());
  } else if (profile.strengths) {
    blocks.push(profile.strengths);
  } else if (rule.pivot) {
    blocks.push(rule.pivot);
  }

  const pf = profile.portfolio;
  if (pf && pf.url) {
    const label = pf.label || '作品集';
    const line = `${label}：${pf.url}`;
    blocks.push(pf.blurb ? `${line}\n${pf.blurb}` : line);
  }

  blocks.push(closing);

  // 段间用空行，但过滤掉空段
  let text = blocks.filter(Boolean).join('\n\n');

  // 长度守门：BOSS 招呼语超过 ~280 字 HR 通常扫不完。
  // 超长时优先压缩「证书/奖项」这类可省信息，而不是砍掉经历。
  const maxLen = style.maxLength ?? 280;
  if (text.length > maxLen && cred) {
    const trimmed = buildCredential({ ...profile, greetingStyle: { ...style, maxCerts: 1, maxAwards: 1 } });
    if (trimmed && trimmed.length < cred.length) {
      text = text.replace(cred, trimmed);
    }
  }
  if (text.length > maxLen && cred) {
    // 还超就只留学历
    const eduOnly = buildCredential({ ...profile, greetingStyle: { ...style, maxCerts: 0, maxAwards: 0 } });
    if (eduOnly) text = text.replace(buildCredential({ ...profile, greetingStyle: { ...style, maxCerts: 1, maxAwards: 1 } }), eduOnly);
  }

  return text;
}
