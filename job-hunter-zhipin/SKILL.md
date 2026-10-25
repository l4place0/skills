---
name: job-hunter-zhipin
description: Automate a BOSS Zhipin (BOSS直聘) job hunt end to end — search by direction and city, extract plaintext salary and full JD, generate tailored greetings from a candidate profile, send them with real CDP input events, and maintain an application tracking index. Use when the user asks to find jobs in a direction or city, batch-apply, write or personalize greeting messages, update an application tracker, or analyze job-market data. Built for strong anti-bot targets; it never uses an MCP browser bridge. When any step fails, read faq/ before changing code.
---

# Job Hunter · BOSS Zhipin

Drive a real Chrome over CDP to search, read, and greet on BOSS Zhipin without
tripping its anti-bot. The pipeline is **search → detail → greeting → send → track**.

Speed is not a goal here. Not getting blocked is.

> **First run on a new machine?** Follow [`Onboarding.md`](./Onboarding.md) before
> anything else. It checks Chrome, the CDP port, the login session, and Node.

> **Something failed?** Read [`faq/`](./faq/) first. Most failures here are known
> platform behaviours, not bugs in the scripts. Do not rewrite logic until the FAQ
> has been checked — several "obvious fixes" are documented there as wrong.

---

## What this skill is for

The user names a direction ("AI Agent", "C++", "车载") and a city. You turn that into
sent job applications with personalised greetings, then keep a tracker of what went
where and what came back.

### Collect the candidate profile first

Before drafting anything, gather a profile once and cache it as `profile.json` (see
`profile.example.json`). Do not assume the candidate is a software engineer — the same
workflow serves a driver, a nurse, a salesperson or a fresh graduate with no portfolio.

Ask only for what the user can answer, and skip whatever does not apply:

| Field | Why it matters | If the user has none |
| --- | --- | --- |
| `name` | Sign-off and identity | Optional |
| `targetRoles` | Directions to search | Required — the search query |
| `city` | Search city | Required |
| `education` | Degree, school, cohort | Say nothing rather than guess |
| `yearsExperience` | Seniority framing | Omit entirely; never state a number |
| `skills` | Concrete capabilities | Plain tool/equipment names, not jargon |
| `certificates` | Licences, 软考, 驾照, 教师资格 | Skip the section |
| `awards` | Competitions, internal honours | Skip the section |
| `portfolio` | GitHub, 作品集, 抖音/小红书, 个人站 | Skip the link line |
| `strengths` | What they actually do well | Free text, in their own words |

Two rules that keep this honest for any profession:

- **Only include what is true and checkable.** A licence number, a competition placing,
  a shipped product, a public profile — those carry weight. Adjectives do not.
- **Where experience is thin, say so and pivot to willingness.** For a trade role that
  means "有证/有基础，愿意学"; for an office role "做过类似的事，上手快". Never invent a
  project.

Non-technical profiles are expected. A candidate with no GitHub simply gets a greeting
without a link line — the template drops the section rather than leaving a placeholder.

`scripts/pipeline.mjs` reads the profile from `profile.json` and composes greetings from
it. Edit that file, not the script, when the candidate changes:

```bash
cp profile.example.json profile.json
# then fill it in — every field is optional
```

With no `profile.json` the script still runs and produces a minimal greeting (job title
plus a generic closing). That is deliberate: it lets you search and preview before the
user has supplied a profile, and it never blocks on missing data.

`_greeting.mjs` holds the composition logic. It picks the 3 most relevant `skills`
entries for the job's direction and drops any section the profile does not have — no
placeholders, no empty lines. Length is capped at 280 characters by default
(`greetingStyle.maxLength`), trimming certificates and awards first, because a BOSS
greeting that runs long does not get read.

---

## The four steps

Run them in order. Each is a separate script so a failure mid-way does not lose work.

### 1. Search and preview

```bash
node scripts/pipeline.mjs "AI Agent" --city 惠州 --limit 5 --strict
```

Produces `out/pipeline-<city>-<keyword>.json`: job name, company, plaintext salary,
full JD, and a generated greeting per job. **Read this output to the user before
sending anything.** The user is approving both the job list and the wording.

`--strict` applies per-direction relevance filters. Without it, BOSS's fuzzy title
search returns noise (see FAQ: search is fuzzy).

### 2. Send

```bash
node scripts/greet.mjs --input out/pipeline-惠州-AI_Agent.json --limit 5
```

Before the first real send, tell the user plainly: **clicking 立即沟通 makes BOSS
send its own default greeting immediately, and that cannot be unsent.** The custom
message always arrives as a second message. If the user is not fine with two
messages, stop and discuss.

Use `--dry` to rehearse, `--start N` to resume after a partial run.

### 3. Track

```bash
node scripts/index.mjs --jobs out/pipeline-惠州-AI_Agent.json --output tracking.md
```

Reads the chat list and writes a status table: 已送达 / 已读 / 婉拒 / 未沟通.

### 4. Report

Summarise for the user: how many sent, salary range, which companies replied. Keep
`out/` out of version control — it is generated data.

---

## How to work when something goes wrong

1. **Stop.** Do not fire more requests; several failure modes get worse with retries.
2. **Read `faq/`.** Match the symptom, not the guess.
3. **Only then** change a script — and record the new symptom in `faq/` as a file.

The FAQ is the accumulated knowledge of this platform. Treat it as the first
diagnostic surface, and extend it whenever you learn something expensive.

---

## Layout

| Path | Role |
| --- | --- |
| `SKILL.md` | This file — how to run the hunt |
| `Onboarding.md` | One-time environment setup and repair |
| `faq/` | Known failures and their fixes; read before debugging |
| `scripts/pipeline.mjs` | Search → detail → greeting |
| `scripts/greet.mjs` | Click, type, send |
| `scripts/index.mjs` | Tracking table from chat list |
| `data/city_codes.json` | 374 city name → BOSS city code |

---

## Non-negotiables

**Never swap in an MCP browser bridge.** Measured on the same profile, same account,
same cookies: a hand-written CDP client kept the page alive 12/12 probes, while
`chrome-devtools-mcp` attached blanked it to `about:blank` in about three seconds.
The MCP bridge enables extra CDP domains, bindings and isolated worlds; Boss's
anti-bot keys on that. Each script here embeds its own minimal client for this
reason. See `faq/anti-bot-mcp-blanking.md`.

**Never fabricate experience in a greeting.** Where the direction is new, say so and
pivot to "愿意学，基础在". An interviewer finds the gap in minutes.

**Pace it.** 7–13 s between jobs, serial only, under ~30 jobs per session. Abort on
`code 36` / `code 37`.

**Confirm before the first send.** The default greeting cannot be recalled.
