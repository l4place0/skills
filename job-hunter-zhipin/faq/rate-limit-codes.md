# API returns `code 36` / `code 37`

## Symptom

`/wapi/zpgeek/...` calls return HTTP 200 with a small JSON body:

```json
{"code":37,"message":"您的环境存在异常.","zpData":{}}
{"code":36,"message":"您的账户存在异常行为.","zpData":{}}
```

Pages also start redirecting to `/web/passport/zp/verify.html` or
`/?_security_check=1_<timestamp>`.

## Cause

Two different limits, two different remedies.

| Code | Meaning | Trigger |
| --- | --- | --- |
| `37` | Environment looks abnormal | Rapid API calls from the same session, especially to `detail.json` |
| `36` | Account behaviour looks abnormal | Sustained volume across endpoints; escalates from 37 if you keep retrying |

Important: **`37` escalates to `36` if you keep probing.** A retry loop converts a
short cooldown into a longer one. `36` is account-level and follows the login, not the
browser.

## Fix

1. **Stop immediately.** No further requests. Do not retry in a loop, do not poll.
2. **Let it cool.** Minutes for a mild `37`; considerably longer for `36`.
3. **If a verification page appears,** complete it manually in the browser — solve the
   slider, then return. The session resumes afterwards.
4. **Resume at a slower pace.** The scripts already space jobs 7–13 s apart; if you hit
   a limit, widen that.

Prevention, which matters more than recovery:

- Prefer the detail **page** over the detail **API**. The page is one navigation; the
  API is a request per job and draws attention faster.
- Keep a session under ~30 jobs.
- Never run two scripts against the same account concurrently.
- Do not use an MCP browser bridge — its footprint independently raises the risk of
  being flagged. See [anti-bot-mcp-blanking.md](./anti-bot-mcp-blanking.md).

## Why the account is fine even at `36`

`36` is a behavioural flag, not a ban. It clears. Verified: after clearing a
verification challenge, `card.json` returned `code 0` with a correct plaintext salary
on the same cookies, no re-login needed.

So do not panic, do not switch accounts, and do not assume the cookies are dead.

## How to probe recovery without making it worse

One request, then stop:

```bash
node -e "
const r = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const p = r.filter(t=>t.type==='page')[0];
const ws = new WebSocket(p.webSocketDebuggerUrl);
ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{
  expression:\"fetch('/wapi/zpgeek/job/card.json?jobId=<id>',{credentials:'include'}).then(r=>r.json()).then(j=>JSON.stringify({code:j.code,msg:j.message}))\",
  returnByValue:true, awaitPromise:true}}));
ws.onmessage=e=>{console.log(JSON.parse(e.data).result.result.value);process.exit(0)};
"
```

- `code: 0` → cleared, resume slowly.
- `code: 36/37` → still cooling. Wait, and do not repeat this probe more than a few
  times an hour.
