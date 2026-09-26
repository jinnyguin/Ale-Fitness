---
name: Adaptive programming block design
description: Durable rules for evolving ALEFIT plans without losing progression continuity or feedback safety.
---

Keep measurable primary movements stable across a block, and rotate only constrained support work, emphasis, volume, intensity, conditioning, and recovery. After the final scheduled week is handled, continue with a new adaptive block whose sessions have unique IDs.

Sport role or event details may select a block's primary movement when the plan is generated. Keep that choice stable across the block; when a detail only changes coaching guidance, describe it as context rather than claiming it changed exercise selection.

For high recent consistency, add at most one set to the primary movement when recovery is clear and the session can fit it without cutting support work. Keep the deload unchanged.

**Why:** Athletes need continuity to measure progress, while repeating identical support work indefinitely does not respond to goals, readiness, workload, or feedback. Unique continuation IDs also preserve immutable workout snapshots and idempotent feedback recovery.

**How to apply:** Treat phase metadata and deterministic exercise selection as the source of truth. Never rewrite completed session snapshots; use completed, skipped, difficulty, pain, readiness, schedule, equipment, and sport context only to shape future weeks. Do not describe high consistency as increasing the whole session or a deload week.