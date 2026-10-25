# Chrome starts then exits immediately, no window

## Symptom

Launching Chrome produces no window and no process. Captured stderr shows:

```
ERROR:third_party\crashpad\crashpad\client\crashpad_client_win.cc:430]
  OpenProcess: 拒绝访问。 (0x5)
ERROR:third_party\crashpad\crashpad\client\crashpad_client_win.cc:144]
  crash server failed to launch, self-terminating
```

Followed in some cases by:

```
FATAL:mojo\public\cpp\platform\platform_channel.cc:112] Check failed: . : 拒绝访问。 (0x5)
```

`Get-Process chrome` returns nothing a second later.

## Cause

Chrome's Crashpad crash handler cannot open a handle to its parent process
(`OpenProcess: access denied, 0x5`), and Chrome treats a failed crash server as fatal,
so it terminates itself.

This shows up when Chrome is launched from a process whose handle it is not permitted
to open — a restricted sandbox, a service account, or a container-ish parent. It is an
**environment** problem, not a Chrome bug and not a profile problem.

## Fix

Launch Chrome from a normal interactive session. If that is not possible, or if it
still fails, disable the crash handler for the automation instance:

```
--disable-crashpad --disable-breakpad --no-sandbox
```

A working launch:

```powershell
Start-Process "<chrome.exe>" -ArgumentList `
  "--remote-debugging-port=9222",
  "--remote-allow-origins=*",
  "--user-data-dir=<dedicated-profile>",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-crashpad",
  "--disable-breakpad",
  "--no-sandbox",
  "about:blank"
```

Notes:

- `--no-sandbox` reduces isolation. Acceptable for a dedicated automation profile on a
  personal machine; think twice on a shared host.
- `--disable-crashpad` alone is usually enough; the other two are belt-and-braces.
- Capture the log when diagnosing:

```powershell
Start-Process "<chrome.exe>" -ArgumentList "..." `
  -RedirectStandardError "$env:TEMP\chrome-err.log"
Start-Sleep 8
Get-Content "$env:TEMP\chrome-err.log" -Tail 40
```

## What does not help

- Reinstalling Chrome.
- Creating a new profile. (Tested: a fresh profile with the same sandbox fails
  identically.)
- Using `--headless`. Crashpad still initialises.

The failure is about process-handle permissions at launch, so it follows the launcher,
not the browser data.

## How to verify

After launch, within ~10 s:

```powershell
try { Invoke-RestMethod http://127.0.0.1:9222/json/version } catch { "still failing" }
Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count
```

Expect a `Browser` string and a non-zero process count. If the count is 0, re-read the
stderr log — a different error now means you are past this one.
