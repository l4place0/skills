# Re-contacting a job raises a "是否就新职位继续沟通" dialog

## Symptom

After clicking 继续沟通 on a job whose company you already contacted, a modal appears:

```
温馨提示
您与该Boss已沟通过，是否就新职位视觉工程师继续沟通？
注：更换沟通职位将通知Boss
[取消]  [沟通新职位]
```

The composer never becomes usable. `document.activeElement` stays `<body>`,
`document.body.className` contains `boss-layer__lock-scroll`, and typing does nothing.
Symptom-wise this looks identical to the input bug — that is why it must be ruled out
first.

## Cause

BOSS tracks contact per **Boss (recruiter)**, not per job posting. One recruiter often
owns several postings. Contacting a second posting from the same recruiter needs
explicit confirmation, because switching the conversation context notifies the Boss.

So 继续沟通 on a sibling posting is a two-step action: click, then confirm.

## Fix

Detect the dialog after the click, and click 「沟通新职位」 before touching the composer:

```js
const t = document.body.innerText;
if (t.includes('是否就新职位') || t.includes('更换沟通职位')) {
  for (const el of document.querySelectorAll('button, a, div, span')) {
    if ((el.innerText || '').trim() === '沟通新职位' && el.getBoundingClientRect().width > 10) {
      const r = el.getBoundingClientRect();
      // click centre of r
      break;
    }
  }
}
```

Then wait ~3 s for the chat page and composer to settle.

`scripts/greet.mjs` does this between the click and the composer lookup.

## How to tell this apart from the typing bug

| Check | Dialog present | Typing bug |
| --- | --- | --- |
| `body.innerText` contains 是否就新职位 | yes | no |
| `body.className` has `boss-layer__lock-scroll` | yes | maybe |
| `activeElement` after clicking composer | `BODY` | `DIV.chat-input` |
| Composer exists | yes | yes |

The decisive one is the dialog text.

## Side effect worth knowing

「沟通新职位」 notifies the recruiter that the candidate switched postings. That is a
real, visible action — it is the platform's intent, but mention it if the user is
sending to several postings from one company.

## How to verify

After dismissing, the composer should accept text:

```js
document.querySelector('div.chat-input[contenteditable="true"]')?.innerText.length
```

After typing, expect a non-zero length. If it stays 0, the dialog is still up or you
hit the input bug instead.
