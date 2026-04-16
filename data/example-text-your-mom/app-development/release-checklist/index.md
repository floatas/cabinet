---
title: Release Checklist
created: '2026-04-11T00:00:00Z'
modified: '2026-04-13T10:00:00Z'
tags:
  - release
  - checklist
---
# Release Checklist

## Before Shipping

- [ ] Critical notification bugs reviewed (check RT-4 status — CTO investigating)
- [ ] Onboarding regressions checked (manual walkthrough of full onboarding flow on both iOS and Android)
- [ ] Subscription flow sanity checked (test dismiss button on small screens — see PC-3)
- [ ] Rollback plan written and communicated to team (see [[OB-2 Rollback & Monitoring Runbook]])
- [ ] Monitoring baselines recorded: crash-free rate, onboarding completion rate, onboarding step 1 drop-off
- [ ] Monitoring thresholds confirmed: crash-free ≥99%, onboarding completion not dropping >6pp, no 1-star review spikes
- [ ] Feature flags verified (kill switch works for new features)
- [ ] Build signed and submitted to App Store / Play Store
- [ ] Staged rollout percentage decided (10% → 50% → 100%, 24h soak at each stage)
- [ ] Rollback procedure reviewed by at least one other team member

## Ship Standard

If the app cannot be trusted to gently remind someone at the right time, it is not ready.

## First Release Notes (Week of April 14)

The first release from this sprint will be OB-2 (copy change). Treat it as a dry run of the full pipeline. Document any steps that are missing or unclear, and update this checklist accordingly.

**Rollout plan for OB-2:**
1. Merge to main
2. Run full checklist above (even for a copy change — this is the rehearsal)
3. Submit build (iOS TestFlight + Android Play Console internal track)
4. Internal dogfood — team runs full onboarding, confirms copy
5. 10% staged rollout, monitor for 24 hours (see [[OB-2 Rollback & Monitoring Runbook]] for thresholds)
6. If clean → 50%, monitor 24 hours
7. If clean → 100%
8. Document lessons learned and update this checklist

**Open gaps (as of April 13):**
- No CI/CD pipeline has been exercised — first build will surface unknown process issues
- Monitoring baselines not yet recorded — must capture before rollout begins
- OB-6 analytics events not yet instrumented — onboarding funnel measurement depends on this shipping first or alongside OB-2
- RT-4 (reminder 2h late) is still open — does not block OB-2 but blocks P2
