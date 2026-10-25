# MCP browser bridge attached → page blanks to `about:blank`

## Symptom

The job page loads, then within about three seconds the document is replaced by an
empty `about:blank`. `document.body.innerText.length` drops to `0`, the URL becomes
`about:blank`, and any screenshot is a blank page. The first probe after navigation
often succeeds, which makes it look like a timing bug in the script.

## Cause

Boss's anti-bot detects the CDP client, not the page.

Measured on the same Chrome profile, same account, same cookies:

| Client | Page survival |
| --- | --- |
| Hand-written CDP: `Page` + `Runtime` + `Input` only | 12 / 12 probes alive |
| `chrome-devtools-mcp` attached | 1 / 12 — blank within ~3 s |
| MCP attached, but driven by a *separate* raw CDP client | 1 / 12 — still blank |

That third row is the important one: the blanking happens **because the MCP bridge
is attached**, not because of who sends the navigation. Detaching the bridge made the
same profile and cookies work again immediately.

`chrome-devtools-mcp` enables extra CDP domains plus bindings and isolated worlds.
Boss's anti-bot appears to key on those.

Note this is **not** a browser-build or profile problem. The same portable Chrome
with a fresh profile works fine; the same profile works fine without the bridge.

## Fix

Do not mount a browser MCP bridge for this platform. Use the minimal client embedded
in each script (`connectCDP` in `scripts/*.mjs`), which touches only:

- `Page.navigate`, `Page.captureScreenshot`
- `Runtime.evaluate`
- `Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`, `Input.insertText`

## How to verify

Navigate a job page and poll the body length for ~10 s:

```bash
node -e "
const r = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const p = r.filter(t=>t.type==='page')[0];
console.log('target:', p.url);
"
```

Then run `scripts/pipeline.mjs --limit 1`. If it returns a job with a plaintext
salary, the client footprint is fine. If the page keeps blanking, check whether some
other tool has attached to the same CDP port — an MCP bridge elsewhere counts.
