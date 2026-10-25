# Typing into the chat box produces 0 characters / send button stays disabled

## Symptom

The composer is found, the click lands, but `innerText` stays empty. The send button
remains `disabled`, or the message disappears instead of sending. Scripts report
`已输入 0 字` or `input-failed`.

Two distinct causes hide behind this symptom. Check them in order.

## Cause 1 — `dispatchKeyEvent` with `type: 'char'` does not work on `contenteditable`

The chat box is a `<div class="chat-input" contenteditable="true">`, not a
`<textarea>`. `Input.dispatchKeyEvent { type: 'char', text: 'x' }` is a no-op there:
no `beforeinput`, no text insertion, nothing.

Do **not** try to fix this by focusing harder, clicking twice, or using
`document.execCommand`. The event type itself is wrong.

### Fix

Use `Input.insertText`:

```js
await send('Input.insertText', { text: 'a chunk of text' });
```

Insert in chunks of roughly 8–20 characters with a short pause between chunks. That
mimics human paste-or-type cadence and avoids one giant synthetic insertion.

For newlines, send Ctrl+Enter (`modifiers: 2`), which is BOSS's line-break shortcut:

```js
await send('Input.dispatchKeyEvent', {
  type: 'keyDown', key: 'Enter', code: 'Enter',
  windowsVirtualKeyCode: 13, modifiers: 2
});
await send('Input.dispatchKeyEvent', {
  type: 'keyUp', key: 'Enter', code: 'Enter',
  windowsVirtualKeyCode: 13, modifiers: 2
});
```

This is implemented in `typeInto()` in `scripts/greet.mjs`.

## Cause 2 — the composer is blocked by a dialog

If the click on 立即沟通 raised the "您与该Boss已沟通过，是否就新职位继续沟通？" dialog,
the page has `body.boss-layer__lock-scroll`, focus stays on `<body>`, and the
composer is inert. Typing appears to do nothing.

### How to tell it apart

```js
document.activeElement.tagName            // 'BODY' means focus never entered
document.body.className                   // contains 'boss-layer__lock-scroll'
document.body.innerText.includes('是否就新职位')
```

### Fix

Click 「沟通新职位」 to dismiss the dialog, wait ~3 s, then click the composer again.
See [new-position-dialog.md](./new-position-dialog.md).

## Cause 3 — sending by clicking the button misses

Separate from input: `.btn-send` can sit behind the right sidebar when the viewport
is narrow (a 929 px viewport against 1224 px of content). The reported centre is
inside the viewport but occluded, so a coordinate click does nothing.

### Fix

Send with **Enter**. The composer footer literally advertises
`按Enter键发送，按Ctrl+Enter键换行发送`.

Refocus the composer first, then press Enter without modifiers. Do not pass
`modifiers: 2` here, or you insert a newline instead of sending.

## How to verify

After typing, read the composer before sending:

```js
const el = document.querySelector('div.chat-input[contenteditable="true"]');
el.innerText.length   // should be > 20 for a real greeting
```

After sending, the same `.length` should drop below ~10. If it stays the same, the
message was not sent.
