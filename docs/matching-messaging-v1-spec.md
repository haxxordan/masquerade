# Matching + Messaging V1 Implementation Spec (Draft)

## Document Status
- Version: 0.1 (draft)
- Date: 2026-03-13
- Owner: Babe (Product) + Me (Engineering)
- Scope: Week 1 through Week 6 rollout plan; this document starts implementation at Week 1.

## Problem Statement
Current matching and messaging are functional but minimal:
- Match ranking relies primarily on static profile overlap.
- Messaging has no built-in opener support or stale-conversation recovery.
- Admin visibility into conversation health is limited.

## Goals
- Improve match quality and user confidence in recommendations.
- Increase first-message and first-reply conversion.
- Add a safe, controlled rollout path via feature flags.

## Non-Goals (V1)
- No LLM-generated free-text chat assistant.
- No hard moderation automation (recommendations only).
- No major redesign of existing profile model.

## Success Metrics
Primary metrics:
- Match -> first message conversion rate.
- First message -> first reply conversion rate (24h).
- Median time-to-first-reply.
- Messages per match in first 72h.

Secondary metrics:
- 7-day retention among users with >= 1 match.
- Stale conversation rate.

## Feature Flags
Config-backed booleans under `FeatureFlags`:
- `matching.topPicksV1`
- `matching.scoreV2`
- `messaging.smartOpenersV1`
- `messaging.stallNudgesV1`

Rollout strategy:
- Ship dark (all false).
- Enable internally.
- Ramp to 10%, 25%, 50%, 100% by environment/config.

## Architecture Overview
### Matching
- Keep current overlap logic as baseline.
- Add compatibility score and reasons (explainability).
- Add top-picks entry point (curated subset).

### Messaging
- Add message kind + metadata scaffolding for future system/nudge messages.
- Track conversation state timestamps (first message/reply, stale/nudge timing).

### Admin
- Add funnel-friendly aggregates in admin APIs once data is populated.

## Data Model Changes (Week 1 Scaffold)
### `Match`
Add nullable columns:
- `CompatibilityScore` (int)
- `CompatibilityReasonsJson` (jsonb string)
- `LastMessageAt` (datetime)
- `MessageCount` (int, default 0)

### `Message`
Add:
- `Kind` (enum: `Text`, `System`, `Nudge`)
- `MetadataJson` (jsonb string)

### New table `ConversationState`
- `MatchId` (PK, FK to `Match`)
- `FirstMessageAt` (nullable datetime)
- `FirstReplyAt` (nullable datetime)
- `LastNudgedAt` (nullable datetime)
- `IsStale` (bool)

## API Surface (Planned)
### Week 1
- No externally breaking behavior changes.
- Extend DTOs with optional fields so existing clients remain compatible.

### Week 2+
- `POST /api/profiles/top-picks`
- `GET /api/matches/{matchId}/openers`
- `POST /api/matches/{matchId}/nudge`
- `GET /api/matches/{matchId}/state`

## DTO Evolution Strategy
- Add optional fields to match/message DTOs for forward compatibility.
- Keep existing request shapes unchanged in Week 1.

## Week-by-Week Plan
### Week 1 (start now)
- Add `FeatureFlags` options binding.
- Add domain model scaffolding and DB context wiring.
- Add optional DTO fields and shared type/package placeholders.
- Create EF migration.

### Week 2
- Implement score v2 behind `matching.scoreV2`.
- Add top picks endpoint behind `matching.topPicksV1`.

### Week 3
- Add opener generation endpoint behind `messaging.smartOpenersV1`.

### Week 4
- Add stale detection + nudge endpoint behind `messaging.stallNudgesV1`.

### Week 5
- Add admin funnel metrics and trend endpoints.

### Week 6
- Run A/B analysis and ramp rollout.

## Risks
- Schema expansion without migration discipline can drift across environments.
- Feature flags without observability can hide regressions.
- Message-kind expansion can break clients if non-optional.

## Mitigations
- Keep new DTO fields optional.
- Use config defaults = false for all new flags.
- Add migration in the same PR as model changes.
- Add admin observability before broad rollout.

## Testing Strategy
Unit:
- Score calculation with deterministic fixtures.
- Conversation state transitions for first message/reply.

Integration:
- Like -> match -> message flow remains unchanged.
- New columns serialize/deserialize as expected.

Smoke:
- Existing mobile/web/admin flows still function with flags disabled.

## Open Questions
- Should top picks be cached per user/day?
- Should nudges be system messages or client-only prompts?
- Should compatibility reasons be localized server-side or client-side?

## Week 1 Acceptance Criteria
- App starts with all new flags disabled.
- Existing endpoints remain backward compatible.
- Database migration is generated and applies cleanly.
- No regression in like/match/message core flows.
