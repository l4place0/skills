# Login session missing or expired

## Symptom

Pages load but show 登录/注册 instead of the user's name, the chat list is empty, or
`/web/geek/chat` redirects to the login page. API calls return a permission code rather
than data.

## Cause

The CDP browser is using a profile that is not logged into BOSS Zhipin. The login state
lives in cookies in that specific `--user-data-dir`; the scripts never log in.

Common ways to end up here:

- A fresh or temporary `--user-data-dir` (e.g. a `%TEMP%` path) — new profile, no cookies.
- Chrome relaunched without `--user-data-dir`, so it picked the default profile.
- The session genuinely expired (BOSS invalidates stale logins).
- Cookies cleared by the user or a privacy tool.

## Fix

1. In the **same** browser window the scripts talk to, open <https://www.zhipin.com/>
   and log in normally (QR or SMS).
2. Confirm the profile persists: relaunch Chrome with the **identical**
   `--user-data-dir` you will use later. A profile under `%TEMP%` will disappear and
   take the login with it — use a stable path.
3. Verify the session inside the page.

## Verify the session

```bash
node -e "
const r = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const p = r.filter(t=>t.type==='page')[0];
const ws = new WebSocket(p.webSocketDebuggerUrl);
ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{
  expression:\"JSON.stringify({url:location.href, loggedIn: !document.body.innerText.includes('登录/注册'), hasName: /林|用户/.test(document.body.innerText)})\",
  returnByValue:true}}));
ws.onmessage=e=>{console.log(JSON.parse(e.data).result.result.value);process.exit(0)};
"
```

`loggedIn: true` means the session is usable.

## A note on the token cookie

`__zp_stoken__` is an anti-bot token, not the login itself. It can be absent right after
a fresh navigation and then appear once a page has run its challenge script. Do not
treat a missing `__zp_stoken__` on one check as "logged out" — navigate to a page and
re-check. The `wt2` cookie and the presence of the user's name in the header are better
signals.

## If the login keeps dropping

- Confirm only one Chrome uses that profile. Two instances sharing a `--user-data-dir`
  cause session churn.
- Avoid closing Chrome by killing processes mid-request; let it exit normally.
- Keep the profile out of `%TEMP%`.
