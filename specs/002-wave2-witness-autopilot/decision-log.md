# Decision Log

Decision: store witness records in `data-center/witness/` instead of a new standalone directory.
Reason: witness is evidence/proof and belongs inside the Data Center.

Decision: use one JSONL file per capability.
Reason: append-only history and baseline lookup stay simple and deterministic.

Decision: classify wave health with fixed metrics and thresholds only.
Reason: this wave is infrastructure, not adaptive control; deterministic proof matters more than sophistication.
