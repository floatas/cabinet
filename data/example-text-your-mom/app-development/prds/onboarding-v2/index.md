---
title: Onboarding V2 PRD
created: '2026-04-11T00:00:00Z'
modified: '2026-04-12T00:00:00Z'
tags:
  - prd
  - onboarding
  - roadmap-p1
---
# Onboarding V2 PRD

**Status:** In Progress | **Priority:** P1 | **Owner:** Product Manager

## Problem

Users understand the premise immediately, but too many abandon setup before choosing the people they most want help staying in touch with. Current activation is 41% — nearly 6 in 10 new users never set up their first reminder.

The existing onboarding asks for contacts access and notification permissions too early, before the user understands the emotional value. It feels like a productivity app, not a caring one.

## Goal

Get a new user from install to first meaningful relationship reminder in under 90 seconds without making the app feel invasive or needy.

## Proposed Changes

- Ask the user to choose a tiny "don't lose touch" circle first
- Explain reminders in emotional language, not productivity language
- Delay unnecessary permissions until the value is obvious
- Preview how the app helps before asking for commitment

## User Stories

### US-1: Pick Your People First
**As a** new user, **I want to** choose 1-3 people I don't want to lose touch with **so that** the app immediately feels personal and relevant.

**Acceptance criteria:**
- User can type names manually (no contacts permission required at this step)
- Minimum 1 person, soft suggestion of 3, max 5 at onboarding
- Each name gets a warm label: "someone you'd hate to drift from"
- Skipping is possible but gently discouraged with copy like "even one person is a great start"

### US-2: Emotional Framing of Reminders
**As a** new user, **I want** reminders explained as "gentle nudges to stay close" **so that** the app feels caring instead of nagging.

**Acceptance criteria:**
- No use of words like "task," "schedule," "productivity," or "alert"
- Preview screen shows an example reminder: "Hey — it's been a few days since you talked to Mom. A quick text goes a long way."
- Tone is warm, slightly funny, never guilt-trippy

### US-3: Delayed Permission Requests
**As a** new user, **I want** the app to show me value before asking for permissions **so that** I trust the app before granting access.

**Acceptance criteria:**
- Notification permission is requested only after the user has seen a preview of their first reminder
- Contacts permission is requested only when the user taps "import from contacts" (never forced)
- If the user declines a permission, the app continues gracefully with degraded functionality and a soft re-prompt later

### US-4: First Reminder Preview
**As a** new user, **I want to** see exactly what my first reminder will look like **so that** I feel confident the app will help, not annoy.

**Acceptance criteria:**
- After picking people and choosing a frequency, show a mock notification card
- Card includes the person's name, the gentle nudge copy, and the scheduled time
- User can tap "Looks good" to confirm or "Change" to adjust
- Confirming triggers the notification permission request (US-3)

### US-5: Imported Contact Nickname Display
**As a** user who imports contacts, **I want to** see nicknames for my contacts during setup **so that** the experience feels personal.

**Acceptance criteria:**
- If a contact has a nickname in the phone, display it alongside the full name
- Related bug: "Imported contact nickname not shown in setup" (Medium, Open)

## Technical Considerations

- Onboarding state machine: `welcome → pick_people → set_frequency → preview_reminder → permissions → done`
- Store onboarding progress locally so users can resume if they background the app
- Analytics events at each step to identify new drop-off points
- A/B test: current flow vs. v2 flow with 20% holdback

## Success Criteria

| Metric | Current | Target |
| --- | --- | --- |
| Activation rate (first reminder set) | 41% | 55% |
| First-session reminder setup | ~35% | 60% |
| Post-permission-prompt churn (7-day) | 22% | Under 12% |
| Median time to first reminder | ~4 min | Under 90 sec |

## Related

- [[roadmap]] — Priority #1
- Bug: "Imported contact nickname not shown in setup" (Medium)
