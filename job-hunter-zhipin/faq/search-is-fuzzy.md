# Job search returns unrelated roles

## Symptom

Searching a technical direction returns things from a different domain:

| Query | What came back |
| --- | --- |
| `音视频` | short-video editors, live-stream hosts, AI-comic presenters, a PCB technician |
| `安全` | construction safety officers, chemical registered safety engineers |
| `前端` | a product manager role, a part-time "AI development" listing |

A naive read of that output said "15 audio-video jobs in Huizhou". The true number was
one, and the one was a TV-testing role, not audio-video engineering at all.

## Cause

BOSS search matches against the job title with loose semantics, roughly substring and
keyword-OR rather than phrase. It has no notion of your intended domain. A job whose
title happens to contain a related character or a loosely associated word will rank in.

Nothing is broken — the search is simply broader than it appears.

## Fix

Filter after fetching, by job title, with an explicit per-direction regex. This is
what `--strict` does in `scripts/pipeline.mjs`; the table lives in `RELEVANCE`.

Examples of the shape:

```js
const RELEVANCE = {
  '音视频': /音视频|编解码|ffmpeg|音视频开发|多媒体|音频算法/i,
  '安全':   /网络安全|信息安全|安全工程师|安全研发|渗透|等保|appsec/i,
  '前端':   /前端|vue|react|web\b|h5/i,
};
```

Two lessons in choosing patterns:

- **Exclude aggressively.** For `音视频`, do not include a bare `视频` — it matches
  every short-video editing role. Require `音视频` or a codec/framework term.
- **Add domain context to `安全`.** Bare `安全` matches 施工安全 and 化工安全. Require
  `网络安全` / `信息安全` / `渗透` and similar.

An undefined direction means no filtering, which is the safe default for a keyword you
have not characterised yet.

## Cost of ignoring this

Approval of a wrong job list wastes the user's attention, and sending to irrelevant
companies burns credibility and account standing. One mis-filtered run sent greetings
to short-video editor postings.

## How to verify

Run with and without `--strict` and compare counts:

```bash
node scripts/pipeline.mjs "音视频" --city 惠州 --limit 3
node scripts/pipeline.mjs "音视频" --city 惠州 --limit 3 --strict
```

For a niche direction in a mid-size city, expect a large drop. If `--strict` returns
zero, the regex is too tight — read the pre-filter titles and widen it deliberately.
