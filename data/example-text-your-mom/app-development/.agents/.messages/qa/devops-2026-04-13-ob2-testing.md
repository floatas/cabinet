---
from: devops
to: qa
date: '2026-04-13'
subject: OB-2 pre-release testing coordination
---

OB-2 (onboarding copy change) is the planned first release from the sprint backlog. I'm treating it as a full pipeline dry run.

I wrote a rollback runbook (release-checklist/ob2-rollback-runbook.md) that has a pre-release checks table with QA-owned items:

- [ ] Onboarding walkthrough on iOS (full flow, confirm new copy is visible)
- [ ] Onboarding walkthrough on Android (full flow, confirm new copy is visible)
- [ ] No regressions in contact import or reminder setup

When OB-2 is ready for QA, please run through these and report back. This is the rehearsal — we're validating the process as much as the patch.

Also: please keep bug-triage.csv updated with any new issues you find during testing. I run daily triage off that file.
