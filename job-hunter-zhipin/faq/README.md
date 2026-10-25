# FAQ Index

Known failures of this platform, and the fixes that actually worked. **Read this
before debugging.** Several plausible-looking fixes are recorded here as wrong.

Every entry is something that cost a real debugging cycle, not a hypothetical.

| Symptom | Entry |
| --- | --- |
| MCP browser bridge attached → page blanks to `about:blank` in ~3 s | [anti-bot-mcp-blanking.md](./anti-bot-mcp-blanking.md) |
| `CDP <port> 不可达` / connect refused | [cdp-port-unreachable.md](./cdp-port-unreachable.md) |
| Chrome starts then exits immediately, no window | [chrome-exits-immediately.md](./chrome-exits-immediately.md) |
| Salary renders as `--K·薪`, digits missing | [salary-obfuscated.md](./salary-obfuscated.md) |
| Typing into the chat box produces 0 characters | [composer-input-fails.md](./composer-input-fails.md) |
| Send button missing or off-screen | [composer-input-fails.md](./composer-input-fails.md) |
| Re-contacting a job shows a "是否就新职位继续沟通" dialog | [new-position-dialog.md](./new-position-dialog.md) |
| Job search returns unrelated roles | [search-is-fuzzy.md](./search-is-fuzzy.md) |
| Zero jobs for a city that clearly has jobs | [city-code-wrong.md](./city-code-wrong.md) |
| Pages show 登录/注册, chat list empty, session expired | [login-session-missing.md](./login-session-missing.md) |
| Company name in output equals the job title | [company-name-wrong-selector.md](./company-name-wrong-selector.md) |
| `_jobInfo` exists but fields read as `undefined` | [jobinfo-snake-case.md](./jobinfo-snake-case.md) |
| Two messages sent per job, first one unwanted | [default-greeting-auto-sent.md](./default-greeting-auto-sent.md) |
| API returns `code 36` / `code 37` | [rate-limit-codes.md](./rate-limit-codes.md) |

## How to extend this FAQ

When you hit a new failure:

1. Name the file after the **symptom**, not the cause you guessed.
2. Record: what you saw, what you tried that failed, what worked, and how to verify
   the fix.
3. Add a row to the table above.

A wrong hypothesis written down is more valuable than none — it stops the next agent
from repeating it.
