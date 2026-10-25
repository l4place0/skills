# Two messages sent per job — the first one was not wanted

## Symptom

The chat shows two outbound messages per application:

```
送达
Boss您好，我是26年毕业生，可以和您进一步沟通AI Agent开发工程师这个职位吗？
送达
您好，看到贵司在招AI Agent开发工程师，想自荐一下。...
```

The first is a generic template the user never wrote. The custom message follows as a
second message.

## Cause

Clicking 立即沟通 makes the platform **send its own default greeting immediately**, as
part of the click handler, before any composer becomes available. The custom message
cannot be typed in time to replace it, and there is no setting to suppress it.

The default text is generated from the job title:

```
Boss您好，我是26年毕业生，可以和您进一步沟通{jobName}这个职位吗？
```

Once sent, it cannot be recalled or edited.

## Consequence for the workflow

Treat the custom greeting as a **follow-up**, not a replacement. The result is
acceptable — a short platform greeting followed by a substantive personal note — but
the user must agree to it *before* the first send.

## What not to do

- Do not try to intercept the request that sends the default greeting.
- Do not try to click 立即沟通 and race the composer. The send is synchronous with the
  click; typing cannot beat it.
- Do not present a custom-only transcript to the user. It misrepresents what was sent.

## Fix

There is no technical fix. Handle it as an expectation:

1. Before the first real send, state plainly that two messages will arrive and that
   the first is platform-generated.
2. If the user objects, stop — the only alternatives are not sending, or sending
   through the mobile app manually, which is outside this skill.

`scripts/greet.mjs` implements the accepted pattern: click, let the default fire, then
navigate to the chat and send the custom text.

## How to verify

Open the chat for a contacted job and read the transcript. Expect exactly:

1. `[送达] Boss您好，我是26年毕业生，可以和您进一步沟通<职位>这个职位吗？`
2. `[送达] <custom greeting>`

If only one message appears, the custom text failed to send — see
[composer-input-fails.md](./composer-input-fails.md).
