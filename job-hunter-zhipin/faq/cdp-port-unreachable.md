# `CDP <port> 不可达` — cannot connect to the debugging port

## Symptom

Every script fails immediately:

```
Error: CDP 9222 不可达。请先启动带调试端口的 Chrome。
```

or `fetch failed` / `ECONNREFUSED` on `http://127.0.0.1:9222/json/list`.

## Cause

Nothing is listening on the CDP port. Usual reasons, in order of likelihood:

1. Chrome is not running.
2. Chrome is running **without** `--remote-debugging-port`.
3. Chrome was started on a different port than the scripts use (default 9222).
4. Chrome started but exited immediately — see
   [chrome-exits-immediately.md](./chrome-exits-immediately.md).
5. Another process holds the port, so the new Chrome silently attached to the existing
   instance instead of opening its own debugging endpoint.

## Fix

Check whether anything is listening:

```powershell
Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Check the endpoint directly:

```powershell
try { Invoke-RestMethod http://127.0.0.1:9222/json/version } catch { $_.Exception.Message }
```

A healthy response looks like:

```json
{
  "Browser": "Chrome/155.0.8059.40",
  "Protocol-Version": "1.3",
  "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/..."
}
```

If nothing is listening, start Chrome with the debugging port — see
`Onboarding.md` step 1. The essentials are:

- `--remote-debugging-port=9222`
- `--remote-allow-origins=*` (required for the WebSocket handshake)
- a dedicated `--user-data-dir`

If a **different** Chrome instance is already running with the same `--user-data-dir`,
the new launch will hand off to it and no debugging endpoint appears. Close all
Chrome processes using that profile first:

```powershell
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
```

Then relaunch. Wait ~10 s — a cold start with a large profile can take a while before
the endpoint answers.

## Using another port

If 9222 is permanently taken, start Chrome elsewhere and pass the port explicitly:

```bash
node scripts/pipeline.mjs "AI Agent" --city 惠州 --limit 1 --port 9333
```

All three scripts accept `--port`.

## How to verify

```bash
curl -s http://127.0.0.1:9222/json/list
```

Expect a JSON array containing at least one `"type": "page"` entry. If the array is
empty, Chrome is up but has no tab — open one, or restart with `about:blank` as the
last argument.
