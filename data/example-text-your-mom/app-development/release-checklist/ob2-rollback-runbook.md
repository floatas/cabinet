---
title: OB-2 Rollback & Monitoring Runbook
created: '2026-04-13T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - release
  - runbook
  - ob-2
order: 2
---
# OB-2 Rollback & Monitoring Runbook

OB-2 is a copy-only change to onboarding. It is also the first release from the sprint backlog. Treat it as a pipeline rehearsal — the process matters more than the patch.

## What Ships

- Emotional reminder framing: warm copy replaces productivity language in onboarding screens
- No logic changes, no new permissions, no schema changes

## Pre-Release Checks

| Check | Owner | Pass? |
|-------|-------|-------|
| Onboarding walkthrough on iOS (full flow, new copy visible) | QA | |
| Onboarding walkthrough on Android (full flow, new copy visible) | QA | |
| No regressions in contact import or reminder setup | QA | |
| Crash-free rate baseline recorded (pre-release) | DevOps | |
| Onboarding funnel baseline recorded (pre-release) | DevOps | |
| Build signed for both platforms | CTO | |
| Feature flag or staged rollout configured (10% initial) | DevOps | |

## Rollout Plan

1. **Merge to main** — squash merge, no force push
2. **Build and sign** — iOS (TestFlight) + Android (Play Console internal track)
3. **Internal dogfood** — team installs, runs full onboarding, confirms copy
4. **10% staged rollout** — push to 10% of users
5. **Monitor 24 hours** — watch metrics below
6. **If clean → 50%** — monitor another 24 hours
7. **If clean → 100%** — full rollout, mark release complete

## Monitoring During Rollout

Watch these metrics for 24 hours at each rollout stage:

| Metric | Baseline | Red Flag Threshold | Source |
|--------|----------|-------------------|--------|
| Crash-free rate | ≥99.5% | Drop below 99% | Firebase Crashlytics / App Store Connect |
| Onboarding completion rate | 41% (current) | Drop below 35% | Analytics events |
| Onboarding drop-off at step 1 | TBD (record baseline) | >10% increase from baseline | Analytics events |
| App Store rating trend | Current avg | New 1-star reviews mentioning onboarding | App Store Connect / Play Console |
| Support tickets mentioning onboarding | Current rate | >2x spike | Support inbox |

## Rollback Procedure

**Trigger:** Any red flag threshold breached, or team judgment that copy is causing confusion.

**Steps:**

1. **Halt rollout immediately** — stop staged percentage in App Store Connect / Play Console
2. **Do NOT submit a new build yet** — assess whether the issue is the copy or something else
3. **If copy is the problem:**
   - Revert the copy commit on main
   - Build, sign, and submit a hotfix with the old copy
   - Push hotfix through expedited review (Apple: request expedited; Google: immediate)
4. **If not the copy:**
   - Investigate root cause before reverting — the copy change is low-risk, so the bug is likely pre-existing
   - Document the finding in the release checklist lessons learned section
5. **Communicate** — post in #engineering channel: what happened, what was rolled back, what's next

**Rollback time estimate:** ~4-6 hours for iOS (expedited review), ~1-2 hours for Android (Play Console rollback is near-instant).

## Post-Release

After full rollout, document:

- [ ] Any steps that were unclear or missing from this runbook
- [ ] Actual rollout timeline vs plan
- [ ] Whether monitoring thresholds were useful or need adjustment
- [ ] Lessons learned for next release

This document updates the release checklist. Every future release should be at least this well-prepared.
