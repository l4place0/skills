# Zero jobs for a city that clearly has jobs

## Symptom

A search for a city returns jobs from a different city, or returns nothing, even
though browsing BOSS in the browser shows plenty of local roles. The page title is a
giveaway: searching 惠州 produced `「深圳招聘」-2026年深圳人才招聘信息`.

## Cause

The BOSS city code is wrong. City codes are opaque 9-digit ids and are **not** ordered
in a way you can guess.

Worked example — the wrong assumption:

| Assumed | Actual |
| --- | --- |
| `101280600` = 惠州 | `101280600` = **深圳** |
| — | `101280300` = **惠州** |
| — | `101280100` = 广州 |
| — | `101281600` = 东莞 |

A wrong code does not error. It silently returns another city's results, which reads
as "no local jobs" rather than "wrong parameter".

## Fix

Always resolve the city name through `data/city_codes.json` (374 entries) rather than
hard-coding a code:

```bash
node -e "
const t = require('./data/city_codes.json');
for (const c of ['惠州','深圳','广州','东莞','佛山','珠海']) console.log(c, '=', t[c]);
"
```

`scripts/pipeline.mjs` takes `--city <name>` and does the lookup itself; passing a raw
code is not supported on purpose.

## Adding a missing city

Open the BOSS job search page, switch the city in the UI, and read `city=` from the
resulting URL:

```
https://www.zhipin.com/web/geek/jobs?city=101280300&query=...
                                  ^^^^^^^^^^
```

Add it to `data/city_codes.json` as `"城市名": "101280300"`.

## How to verify

After a run, check that the returned locations actually match:

```bash
node -e "
const d = require('./out/pipeline-惠州-AI_Agent.json');
for (const j of d) console.log(j.locationName, '|', j.jobName);
"
```

Every row should show the target city. If rows show another city, the code was wrong.
