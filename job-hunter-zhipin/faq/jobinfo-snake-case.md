# `_jobInfo` exists but its fields read as `undefined`

## Symptom

`window._jobInfo` is truthy, but every field comes back `undefined`:

```js
window._jobInfo.jobName     // undefined
window._jobInfo.salaryDesc  // undefined
```

That looks like the object is empty or belongs to a previous page. It is neither.

## Cause

`_jobInfo` on a job detail page uses **snake_case** keys, not camelCase. The camelCase
version comes from a different object on a different page type, which is why the names
feel familiar and wrong at the same time.

Actual shape on `/job_detail/...`:

```json
{
  "job_id": "1468bc1001832ee70nx739m0GVtZ",
  "user_id": "19c73c9d6dc2b40a03x429S1EVY~",
  "job_name": "AIagent 全栈开发",
  "job_salary": "15-25K·13薪",
  "company": "英才达",
  "brand_logo": "https://...",
  "securityId": "PcJsz6rK-...",
  "position": 100123
}
```

## Fix

Read the snake_case fields:

```js
window._jobInfo.job_name
window._jobInfo.job_salary
window._jobInfo.company
```

Or bypass it entirely and read the DOM, which is what `scripts/pipeline.mjs` prefers:

```js
document.querySelector('.job-name')?.innerText
document.querySelector('.salary')?.innerText
```

Use `_jobInfo` as a fallback only, and check the key names before trusting it.

## Why the confusion is easy

A camelCase `_jobInfo` **does** exist on the search list page, and it holds a different
payload (a `jobInfo` wrapper with `encryptId`, `salaryDesc`, `postDescription` and a
`securityId`). So the same global name means different things on different page types.
Confirm which page you are on before reading it.

## How to verify

```bash
node -e "
const r = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const p = r.filter(t=>t.type==='page')[0];
const ws = new WebSocket(p.webSocketDebuggerUrl);
ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{
  expression:'JSON.stringify(Object.keys(window._jobInfo||{}))', returnByValue:true}}));
ws.onmessage=e=>{console.log(JSON.parse(e.data).result.result.value);process.exit(0)};
"
```

On a detail page expect `["job_id","user_id","job_name","job_salary","company",...]`.
If you see `["encryptId","salaryDesc","postDescription",...]`, you are on a list page.
