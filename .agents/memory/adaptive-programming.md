---
name: Adaptive programming block design
description: Durable rules for evolving ALEFIT plans without losing progression continuity or feedback safety.
---

Keep measurable primary movements stable across a block, and rotate only constrained support work, emphasis, volume, intensity, conditioning, and recovery. After the final scheduled week is handled, continue with a new adaptive block whose sessions have unique IDs.

Sport role or event details may select a block's primary movement when the plan is generated. Keep that choice stable across the block; when a detail only changes coaching guidance, describe it as context rather than claiming it changed exercise selection. A user-selected sport support focus may remain a stable secondary movement when equipment, impact, and session time allow; rotate the other support work.

For high recent consistency, add at most one set to the primary movement when recovery is clear and the session can fit it without cutting support work. Keep the deload unchanged.

**Why:** Athletes need continuity to measure progress, while repeating identical support work indefinitely does not respond to goals, readiness, workload, or feedback. Acute pain and difficulty should not constrain future training indefinitely once recent recovery is good; persistent limitations remain separate profile constraints. Practices and games are real external load, so reported sport volume should constrain gym work rather than justify adding it. Unique continuation IDs also preserve immutable workout snapshots and idempotent feedback recovery.

**How to apply:** Treat phase metadata and deterministic exercise selection as the source of truth. Use recent dated workout and readiness feedback for temporary effort, pain, and recovery adjustments; keep persistent limitations in the athlete profile. A small rep-range increase is earned only after a fully completed, pain-free week where every session felt too easy. Apply sport frequency, session duration, and effort as conservative caps; never increase gym work by cutting support exercises or exceeding the time limit. Never rewrite completed session snapshots; use completed, skipped, difficulty, pain, readiness, schedule, equipment, and sport context only to shape future weeks. Do not describe high consistency as increasing the whole session or a deload week.