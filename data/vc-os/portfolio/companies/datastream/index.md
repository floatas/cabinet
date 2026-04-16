---
title: DataStream
created: '2026-04-13T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - portfolio
  - data
  - infrastructure
  - seed
  - fund-ii
order: 5
---
# DataStream

Real-time streaming data infrastructure for ML teams. Manages event pipelines, feature freshness, and data lineage across multi-cloud environments.

**Warp Investment:** $2M (Seed, April 2025) — part of $4M round  
**Lead GP:** Jordan Levi  
**Board seat:** Jordan Levi (Observer)

---

## Snapshot — April 2026

| Metric | Value | Trend |
|---|---|---|
| ARR | $450K | ↑ 220% YoY |
| MRR | $37.5K | ↑ 20% MoM |
| Customers | 24 teams | ↑ 8 QoQ |
| ACV | $18.7K | Growing |
| Runway | 22 months | Healthy |
| Headcount | 6 | +1 QoQ |
| Burn/month | ~$65K | Very lean |

---

## Series A Timeline

Jordan has green-lit beginning Series A outreach in May 2026. Target raise: $15M at ~$60M pre-money. Jordan's criteria to begin process:
- ARR at $600K+ ✓ (on track for June)
- 3 enterprise reference customers named ✓
- Technical moat articulated (streaming lineage + freshness SLA guarantee)

**Lead candidates Jordan is warming:**
- Databricks Ventures (strategic)
- Battery Ventures
- Index Ventures
- Redpoint

---

## Product

DataStream solves the "data freshness" problem for ML teams running real-time inference:
- **Event pipeline management** — Kafka/Kinesis/Pulsar abstraction with guaranteed delivery
- **Feature freshness SLAs** — Automatically alerts when a model feature goes stale
- **Data lineage graph** — Tracks every transformation from raw event → ML feature → prediction
- **Multi-cloud sync** — Works across AWS, GCP, Azure without vendor lock-in

The key insight: as ML moves to real-time inference (not batch), the cost of stale features is measured in revenue (fraud not caught, recommendations gone cold). DataStream makes freshness a first-class guarantee.

---

## Risks

- Small team (6 people) limits enterprise support bandwidth
- Kafka/Confluent and Databricks each expanding into adjacent territory
- Pricing model still evolving — current per-event pricing doesn't scale well above $500K ARR

---

## Team

| Name | Role | Background |
|---|---|---|
| Yuki Tanaka | CEO/Founder | Ex-Twitter ML infra, Stanford PhD |
| Amir Khaled | CTO/Co-founder | Ex-Confluent, distributed systems |
| Rina Cho | Head of Engineering | Ex-Stripe data team |
