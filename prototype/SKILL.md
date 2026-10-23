---
name: prototype
description: Turn a discussed idea into a fast, tangible prototype on a `proto/*` branch, then hand back what is real versus faked. Use when the user wants to see, try, or demo a concept before committing to real implementation, asks for a quick mockup, demo, spike, proof of concept, or throwaway UI, or wants to prototype something right after a design discussion. Picks the cheapest presentation form that still exposes the idea under judgement, and builds only what answers the question.
---

# Prototype

A prototype answers one question cheaply. It is not early production code.

The measure of success is not code quality. It is whether the person who asked can
now judge the idea by looking at something running.

## 1. Start from the discussion

Prototyping usually follows a design conversation. Recover its conclusion before
writing code:

- What is the idea in one sentence?
- What is the one thing this prototype must let someone judge?
- What did the discussion explicitly rule out?

Do not re-run the whole discussion. If the answer to "what must be judged" is
genuinely unclear, ask one or two sharp questions and stop there. A long
questionnaire defeats the point.

State your reading back in a short paragraph and proceed. Correct course later
if it is wrong; a wrong prototype that runs is cheaper than a perfect spec.

## 2. Create the branch

Work on a throwaway branch in the repository that will host the prototype:

```bash
git switch -c proto/<short-slug>
```

- The prefix is `proto/`; the slug is two or three words, for example
  `proto/batch-upload` or `proto/sidebar-nav`.
- Branch from the branch the discussion was about, not from a random base.
- Check `git status` first. Never commit on top of the user's uncommitted work,
  never switch branches in a way that strands their changes, and never push a
  `proto/*` branch unless asked.
- Never commit the prototype to `main` or `master`.

If the target is not a Git repository, say so and prototype in a scratch
directory instead.

## 3. Choose the presentation form

Pick the cheapest form that still exposes the thing under judgement. Fidelity
that does not serve the question is wasted work.

| What must be judged | Cheapest form |
| --- | --- |
| Visual design, layout, look and feel | One self-contained HTML file |
| Interaction feel, multi-step flow | One HTML file with inline JS |
| Behavior inside the real app (nav, auth, real data shape) | A new route or page in the existing app, behind a flag |
| A tool, automation, or dev workflow | A standalone script or CLI in a scratch path |
| Data transformation, algorithm, calculation | One script printing real-shaped input and output |
| A process, narrative, or product concept | A short Markdown doc or slide-style HTML |

Rules of thumb:

- Prefer one file over many. Prefer no build step over a build step.
- Prefer opening a file in a browser over standing up a server.
- If the idea only makes sense inside the real app, use the real app. Otherwise
  do not pay for its scaffolding.
- Reuse what the repository already has: components, styles, tokens, scripts,
  fixtures. Copying an existing pattern beats inventing a new one.

When two forms are close, choose the one that reaches something running sooner.

## 4. Build fast

Optimize for the first visible result, then iterate in front of the user.

- Hardcode anything that is not under judgement. Inline the data. Skip config.
- Skip tests unless correctness is the thing being judged.
- Skip abstraction, refactoring, and cleanup. Duplication is fine here.
- Skip auth, migrations, error handling, loading states, and accessibility
  polish unless the question depends on them.
- Do not add dependencies if a plain file will do.
- Do not modify shared production code paths. Add a route, a file, or a script
  instead of editing the thing everything depends on.

Fake it honestly:

- Keep mocked parts obvious. Name them, or put a visible `PROTOTYPE` marker in
  the UI.
- Do not let invented numbers look like real measurements.
- Never present a mocked capability as if the real thing had been proven.

## 5. Show it

Get it running and show it early. Give the user the exact command, URL, or file
path, plus what to look at and what to click.

Then respond to what they actually say, not to what you assume they meant. Expect
two or three rounds. Changing the prototype is cheap; defending it is not.

## 6. Hand back

Stop when the question is answered, not when the code is nice. Close with:

- **Question:** what this prototype set out to judge.
- **What is real:** the parts that actually work.
- **What is fake:** every mock, hardcoded value, and skipped path.
- **What we learned:** the judgement, stated plainly, including "the idea does
  not work".
- **Next:** discard, keep iterating on the same branch, or take it to real
  implementation on a fresh branch.

Discarding a prototype that answered its question is a success, not a failure.
If the idea moves forward, do not promote the prototype branch directly; start
real implementation clean, carrying over the learning rather than the shortcuts.

## Guardrails

- Never let prototype shortcuts leak into production code or the default branch.
- Never delete or overwrite the user's uncommitted changes.
- Never claim a mocked behavior proves real feasibility.
- Never keep building after the question is answered.
