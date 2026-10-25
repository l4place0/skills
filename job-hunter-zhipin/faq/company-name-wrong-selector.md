# Company name in output equals the job title

## Symptom

Pipeline output shows the company field duplicating the job name:

```
── AI Agent开发工程师 | 13-26K | AI Agent开发工程师 ──
```

The greeting then addresses the wrong thing, and the tracking table lists a job as
its own company.

## Cause

The selector `.company-info .name` does not point at the company on a job detail page.
It resolves to a wrapper whose text is the job header — name plus salary:

```
.company-info .name  →  "AI原生全栈开发工程师\n        8-13"
```

This is a selector trap, not a missing field. The element exists and is non-empty, so
a naive `||` fallback chain happily uses it.

## Fix

Do not use `.company-info .name` on detail pages. Read the company from the
「公司基本信息」 block instead, which is the most reliable source:

```js
const lines = document.body.innerText.split('\n').map(s => s.trim()).filter(Boolean);
const bi = lines.indexOf('公司基本信息');
const company = bi >= 0 ? lines[bi + 1] : null;   // 公司名 / 融资 / 规模 / 行业
```

Fallbacks, in order:

1. `公司基本信息` block, line after the heading
2. `window._jobInfo.company`
3. `.company-name` (a different element that does hold the brand)

Verified on a live page:

| Selector | Result |
| --- | --- |
| `.company-info .name` | `AI原生全栈开发工程师 8-13` ❌ |
| `.company-name` | `惠州知规鸟科技` ✅ |
| `_jobInfo.company` | `硅基九狐` ✅ |
| `公司基本信息` next line | `硅基九狐` ✅ |

Note the `.company-name` and `_jobInfo.company` values can differ (registered entity
vs. brand). Prefer the 公司基本信息 block, which matches what the listing shows.

## How to verify

```bash
node -e "
const d = require('./out/pipeline-惠州-AI_Agent.json');
for (const j of d) {
  const bad = j.company && j.jobName && j.company.startsWith(j.jobName.slice(0,6));
  console.log(bad ? 'BAD ' : 'ok  ', j.jobName, '|', j.company);
}
"
```

No row should start with `BAD`.
