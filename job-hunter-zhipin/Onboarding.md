# Onboarding

First-run setup and repair for `job-hunter-zhipin`. Run this once per machine, or
whenever the scripts cannot reach a browser.

Work top to bottom. Each step prints what to check and how to fix it. Nothing here
sends any message — setup only.

---

## 0. What you need

| Requirement | Why |
| --- | --- |
| Node.js 18+ | Scripts use native `fetch` and `WebSocket` (no npm install needed) |
| A Chrome/Edge binary | Drives the real browser |
| A Chrome profile already logged into BOSS Zhipin | Cookies are the session; nothing here logs in for you |
| A free TCP port for CDP (default 9222) | The bridge between scripts and the browser |

No `npm install` and no `pnpm` — every script is dependency-free by design.

```bash
node --version          # expect v18.0.0 or newer
node -e "console.log(typeof fetch, typeof WebSocket)"
# expect: function function
```

If `WebSocket` is `undefined`, the Node version is too old. Upgrade Node.

---

## 1. Pick or create a dedicated Chrome profile

Use a separate profile for automation. Sharing the daily-use profile means the
automation and the user fight over tabs, and a crashed run can leave the user's
normal browsing in a odd state.

A dedicated profile also keeps the BOSS login isolated: log in once, and every
later run reuses it.

**Portable Chrome (recommended when it exists):**

```bat
start "" /b "<path-to-chrome.exe>" ^
  --remote-debugging-port=9222 ^
  --remote-allow-origins=* ^
  --user-data-dir="<path-to-portable-profile>" ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-crashpad ^
  about:blank
```

**System Chrome:**

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList `
  "--remote-debugging-port=9222",
  "--remote-allow-origins=*",
  "--user-data-dir=$env:LOCALAPPDATA\job-hunt-profile",
  "--no-first-run","--no-default-browser-check","about:blank"
```

Notes:

- `--remote-allow-origins=*` is required for the WebSocket handshake from Node.
- `--disable-crashpad` avoids a startup failure where the crash handler cannot open
  the parent process handle and Chrome self-terminates. See
  `faq/chrome-exits-immediately.md`.
- Reuse the **same** `--user-data-dir` every run, or the login is lost each time.

---

## 2. Log into BOSS Zhipin once

In that browser window, open <https://www.zhipin.com/> and log in normally.

Verify the session took:

```bash
curl -s http://127.0.0.1:9222/json/version
```

You should get JSON with `Browser`, `Protocol-Version` and `webSocketDebuggerUrl`.

Then confirm the login inside the page:

```bash
node -e "
const r = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const p = r.filter(t=>t.type==='page')[0];
const ws = new WebSocket(p.webSocketDebuggerUrl);
ws.onopen = () => ws.send(JSON.stringify({id:1,method:'Network.getCookies',params:{urls:['https://www.zhipin.com/']}}));
ws.onmessage = e => { const c = JSON.parse(JSON.parse(e.data).result ? e.data : '{}'); };
"
```

If that is awkward, just run:

```bash
node scripts/pipeline.mjs "test" --city 惠州 --limit 1
```

- It finds jobs → login is fine.
- It errors with a navigation failure or returns zero jobs → the session is missing
  or the anti-bot is intervening. Check `faq/login-session-missing.md`.

---

## 3. Verify the CDP port is the one the scripts use

Scripts default to **9222**. If Chrome was started on another port, pass `--port`:

```bash
node scripts/pipeline.mjs "AI Agent" --city 惠州 --limit 1 --port 9333
```

If port 9222 is occupied by a different browser, either close that one or start this
one elsewhere and always pass `--port`.

---

## 4. Sanity-check the city code table

`data/city_codes.json` maps 374 city names to BOSS city codes. A wrong code silently
returns another city's jobs, which looks like an empty result.

```bash
node -e "
const t = require('./data/city_codes.json');
for (const c of ['惠州','深圳','广州','东莞','佛山']) console.log(c, '=', t[c]);
"
```

Expect 惠州 = `101280300`. If a city is missing, look its code up on the BOSS job
search page (`city=` in the URL) and add it.

---

## 5. First dry run

No messages are sent:

```bash
node scripts/pipeline.mjs "AI Agent" --city 惠州 --limit 2 --strict
node scripts/greet.mjs --input out/pipeline-惠州-AI_Agent.json --limit 2 --dry
```

Both should print job names, salaries and a drafted greeting. `--dry` never clicks.

---

## 6. Only then send

```bash
node scripts/greet.mjs --input out/pipeline-惠州-AI_Agent.json --limit 1
```

Send one, then check the chat in the browser to confirm both the platform default
greeting and the custom message arrived. Only continue if that looks right.

---

## Environment checklist

Copy this into your notes when you finish setup:

```
[ ] Node 18+, fetch + WebSocket available
[ ] Chrome started with --remote-debugging-port and a dedicated --user-data-dir
[ ] BOSS Zhipin logged in inside that profile
[ ] http://127.0.0.1:9222/json/version returns JSON
[ ] city_codes.json has the target city, code verified
[ ] pipeline.mjs --limit 2 returns jobs with plaintext salary
[ ] greet.mjs --dry prints drafted greetings
[ ] one real send verified in the browser chat
```

## Repair

| Symptom | Go to |
| --- | --- |
| Chrome exits immediately after start | `faq/chrome-exits-immediately.md` |
| `CDP 9222 不可达` | `faq/cdp-port-unreachable.md` |
| Jobs found but page is blank | `faq/anti-bot-mcp-blanking.md` |
| Zero jobs for a city that has jobs | `faq/city-code-wrong.md` |
| Salary shows `--K·薪` | `faq/salary-obfuscated.md` |
| Send button missing, or typing does nothing | `faq/composer-input-fails.md` |
