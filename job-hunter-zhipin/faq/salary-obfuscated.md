# Salary renders as `--K·薪` — digits are missing

## Symptom

In search results, `.job-salary` shows something like `--K·薪` or `--元/天`. The
digits are simply not in the DOM. `innerText` returns an empty-looking string, and
`el.innerHTML` has no `<svg>` either, so there is nothing to decode.

## Cause

BOSS renders list-view salary digits with a custom font whose glyphs map to
unreachable code points. The digits are visually present but not textually readable.
This is font-level obfuscation, not SVG paths.

Consequence: **search list views are useless as a salary source.** No amount of
DOM traversal will recover the number from the card.

## Fix

Open the job detail page and read the plaintext salary there.

The detail page exposes it in two independent places — read both and prefer the
first that is non-empty:

```js
// 1. Rendered text
document.querySelector('.salary')?.innerText
document.querySelector('.job-salary')?.innerText

// 2. Global data object
window._jobInfo?.job_salary
```

Both give the true string, e.g. `13-26K`, `14-24K·16薪`.

`scripts/pipeline.mjs` does exactly this: it navigates to
`/job_detail/<jobId>.html`, waits for the body to reach a minimum length, then reads
`.salary` with `_jobInfo.job_salary` as fallback.

## Cost of ignoring this

Reading salary from the list gives `undefined` for every job, which silently breaks
annual-salary ranking and any salary-based filtering. Worse, it looks like the field
is merely empty rather than obfuscated, so it invites more DOM spelunking.

## How to verify

Open any detail page and check both sources agree:

```bash
node -e "
const r = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const p = r.filter(t=>t.type==='page')[0];
const ws = new WebSocket(p.webSocketDebuggerUrl);
ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{
  expression:\"JSON.stringify({text:document.querySelector('.salary')?.innerText, api:window._jobInfo?.job_salary})\",
  returnByValue:true}}));
ws.onmessage=e=>{console.log(JSON.parse(e.data).result.result.value);process.exit(0)};
"
```

Expect a concrete range like `13-26K`. If it is empty on a detail page, the page
probably has not finished rendering — increase the settle wait rather than retrying
the selector.
