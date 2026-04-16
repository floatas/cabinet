---
title: Monitoring Requirements
created: '2026-04-13T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - monitoring
  - devops
  - reliability
order: 3
---
# Monitoring Requirements

What we must be watching before, during, and after every release. This is the DevOps contract with the rest of the team: if it's not monitored, it's not shipped.

## Tier 1: Trust Metrics (Alert Immediately)

These metrics represent user trust. A regression here means the app is breaking its promise.

| Metric | Source | Alert Threshold | Why It Matters |
|--------|--------|----------------|----------------|
| Crash-free rate | Crashlytics / App Store Connect | <99% | Crashes destroy trust instantly |
| Reminder delivery success rate | Server logs (once server-push exists) | <95% | Core promise — remind at the right time |
| Reminder delivery latency (p95) | Server logs / device telemetry | >15 min late | RT-4 class bug — late reminder = broken promise |
| Onboarding completion rate | Analytics events (OB-6) | >6pp drop from baseline | Users giving up before first reminder |

## Tier 2: Product Health (Review Daily During Rollout)

| Metric | Source | Watch For |
|--------|--------|-----------|
| Onboarding step drop-off rates | Analytics (per step) | New bottleneck appearing after change |
| Notification dismiss rate | Device analytics | Rising = fatigue or bad timing |
| Streak break rate | App database | Spike after timezone-related change |
| Trial-to-paid conversion | Revenue analytics | Drop after paywall change |
| App Store rating trend | App Store Connect / Play Console | New 1-star reviews mentioning specific flows |
| Support ticket volume | Support inbox | >2x spike on any topic |

## Tier 3: Infrastructure Health (Background)

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (p95) | Server monitoring | >500ms |
| API error rate (5xx) | Server monitoring | >1% |
| Background job success rate | Job scheduler logs | <98% |
| Push notification delivery rate | FCM / APNs dashboards | <90% |

## Current Gaps

As of April 13, 2026:

1. **No server-side delivery logs** — Reminders are scheduled locally on-device. We have zero visibility into whether a reminder was actually shown. This blocks Tier 1 delivery metrics entirely.
2. **OB-6 analytics not yet instrumented** — Onboarding funnel metrics depend on this story shipping. Without it, we cannot measure onboarding completion rate changes.
3. **No alerting configured** — We need to decide on alerting tool (PagerDuty? Slack webhook? Email?) and configure thresholds before the first real rollout.
4. **No crash-free baseline recorded** — Must snapshot current crash-free rate before OB-2 rollout.

## Action Items

- [ ] CTO: Confirm what analytics/crash tooling is in place (Firebase? Amplitude? Mixpanel?)
- [ ] DevOps: Record crash-free baseline before OB-2 ships
- [ ] PM + DevOps: Define OB-6 analytics event schema so funnel tracking is possible
- [ ] CTO: RT-4 investigation should include whether we have any delivery telemetry today
- [ ] DevOps: Set up basic alerting channel (even if just Slack webhook initially)

## Monitoring Philosophy

> If a reminder was late and nobody logged it, the app still failed.

Monitoring is not infrastructure overhead — it is part of the product. A reminder app that cannot prove it reminded on time is shipping blind. Every release must have defined monitoring thresholds before the build is submitted.
