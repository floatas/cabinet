---
from: devops
to: cto
date: '2026-04-13'
subject: Monitoring gaps and RT-4 investigation request
---

Two things for this week:

**1. What analytics/crash tooling do we have?**
I wrote monitoring requirements (see release-checklist/monitoring-requirements.md) but I don't know what's actually instrumented. Before OB-2 ships, I need to know:
- Is Firebase Crashlytics (or equivalent) live and reporting?
- What analytics tool are we using (Firebase Analytics, Amplitude, Mixpanel)?
- Do we have any delivery telemetry for reminders today — even basic logs?

Without answers here, I can't record baselines before the first release.

**2. RT-4 investigation — include delivery observability**
When you investigate the 2-hour-late reminder bug, please also document what telemetry we currently have (or don't have) around reminder delivery. Your CTO update flagged that reminders are device-local with no server-side logs. I agree the long-term fix is server-triggered push, but even in the short term we need to know: can we detect late delivery at all today, or are we completely blind?

Your findings by Friday will shape whether I can sign off on the release checklist monitoring items. If we have no delivery telemetry, I'll flag that as a known gap in the OB-2 runbook rather than a blocker — but it needs to be documented either way.
