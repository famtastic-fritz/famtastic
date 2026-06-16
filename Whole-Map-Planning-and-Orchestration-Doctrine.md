# Whole-Map Planning and Orchestration Doctrine

## 1. Core Principle

The system must be whole-map in model, even when execution is incremental.

That means:
- the doctrine must describe the full planning and orchestration reality from the start
- implementation may be staged
- visibility may be staged
- automation depth may be staged
- but the conceptual model cannot be partial, cropped, or phase-biased

No fake “v1 thinking.”
No pretending the missing parts do not exist just because they are not automated yet.

## 2. Source-of-Truth Principle

The source of truth is the graph of operational objects and their relationships.

Not:
- chat threads
- reminders
- flat kanban boards
- ad hoc status notes
- one-off morning summaries

Those can be views or artifacts.
They are not the brain.

The brain is the linked operational graph.

## 3. Top-Level Structure

The system is organized as:

Lane
-> Project
-> Plan
-> Task / Queue / Swarm
-> Worker Run / Artifact / Evaluation
-> Brief / View

Definitions:

- Lane
  A top-level life or business stream.
  Examples: Fritz, Income, Research, Metaphysical, Shay/Platform.

- Project
  A bounded initiative within a lane.
  Examples: reseller reactivation, cruise readiness, Site Studio gap closure, Shay orchestration rebuild.

- Plan
  The full end-to-end operating map for a project.
  A plan is durable and complete in concept from the start.

- Task
  A concrete unit of work within a plan.

- Queue
  A stateful holding and dispatch structure for runnable or waiting work.

- Swarm
  A dispatchable execution package composed of one or more workers with a defined purpose.

- Worker Run
  A single executed worker instance with actual model/tool/runtime data.

- Artifact
  Any produced output, decision record, file, report, or deliverable.

- Evaluation
  The scored assessment of work quality, autonomy, correctness, usefulness, cost, or completion.

- Brief / View
  A derived surface for humans to inspect state.
  It is never the source of truth.

## 4. Planning Doctrine

Each project gets one complete plan.

That means:
- not “phase 1 plan now, phase 2 later”
- not “starter roadmap”
- not “initial version of the truth”
- not fragmented subplans pretending to be the plan

A project may have:
- many tasks
- many queues
- many swarms
- many views
- many execution waves

But it should still have one full operating plan.

The plan must answer:
- what completion means
- what work exists
- what can run now
- what is blocked
- what depends on what
- what can be delegated
- what can be swarmed
- what must stay human-owned
- what outputs matter
- how progress is judged

## 5. Parallelism Doctrine

Parallelism is default where dependencies allow it.

The system must support:
- multiple lanes active at once
- multiple projects active at once
- multiple plans active at once
- multiple tasks active inside a plan
- multiple swarms active across plans

Parallelism is constrained only by:
- dependency truth
- resource limits
- cost policy
- human approval gates where explicitly required
- tool/model capability fit

The system must explicitly distinguish:

- Can run now
  No blocking dependency and within policy.

- Must queue
  Runnable in principle, but waiting for scheduling, budget, slot, or orchestration priority.

- Blocked
  Cannot run because a required dependency, artifact, decision, or credential is missing.

- Escalate to swarm
  Work is large enough, parallelizable enough, or valuable enough to justify multi-worker dispatch.

## 6. Queue Doctrine

Queues are first-class objects, not invisible implementation detail.

A queue may hold:
- tasks
- swarm requests
- retries
- resumptions
- evaluations pending review
- human decision prompts
- follow-up work derived from prior runs

Each queued item must know:
- parent lane
- parent project
- parent plan
- current state
- prerequisites
- priority
- routing policy
- cost lane
- escalation eligibility
- resumability pointer

## 7. Swarm Doctrine

A swarm is not a project.
A swarm is not a plan.
A swarm is not the operating system.

A swarm is an execution package.

A swarm exists to perform work that benefits from:
- role specialization
- parallel execution
- cross-checking
- adversarial review
- decomposition into narrower worker roles
- speed under time pressure
- verification before writeback

A swarm should always be attached to a parent plan context.
It exists to serve plan execution, not replace plan structure.

## 8. Routing Doctrine

Routing is first-class because model choice, worker choice, and tool choice are core behavior.

The system should route by cheapest-sufficient execution first, not premium-by-default.

Routing must consider:
- task type
- complexity
- modality
- verification risk
- time pressure
- budget posture
- prior failure history
- worker capability fit

Routing should be explicit enough that the system can later explain why one path was chosen over another.

## 9. Evaluation Doctrine

Telemetry and evaluation are first-class, not afterthought logs.

The system must evaluate:
- work quality
- correctness
- usefulness
- autonomy
- cost efficiency
- retry patterns
- failure patterns
- handoff clarity
- verification success

Evaluation exists to improve routing, decomposition, agent choice, and execution design.

## 10. Views Doctrine

Kanban is a view, not the brain.
Flat boards are useful as one lens, but too weak by themselves for the logic of the system.

Morning briefs should report plan truth, not just loose reminders.
A real brief should show:
- active plans
- current state
- blocked items
- queued swarms
- what changed
- what needs Fritz today

Boards, briefs, dashboards, and summaries are derived surfaces from graph truth.
They are never the source of truth.

## 11. Permanent Object Boundaries

These objects must not collapse into each other.

Lane
- A permanent life/business stream.
- Exists regardless of whether any single project is active.
- Examples: Fritz, Income, Research, Metaphysical, Shay/Platform.
- A lane is not a sprint, campaign, or current focus.
- A lane may contain many projects over time.

Project
- A bounded initiative inside a lane.
- Has a real outcome, not just activity.
- May touch multiple repos, systems, agents, or workflows.
- Does not become “whatever we are currently working on.”
- Can be active, paused, blocked, dormant, or complete.

Plan
- The complete operational map for one project.
- Durable, end-to-end, whole-map from the start.
- Defines completion, dependencies, execution shape, delegation shape, and evaluation shape.
- A plan is not a task list.
- A plan is not a queue.
- A plan is not a swarm.
- A project has one canonical plan, though that plan may contain many branches, tasks, queues, and swarms.

Task
- A concrete unit of work under a plan.
- Small enough to assign, track, block, verify, or dispatch.
- A task is not a project.
- A task does not own the full strategic map.
- A task may be handled directly, queued, or escalated into swarm execution.

Queue
- A first-class dispatch structure for work items waiting on execution, retry, resume, review, or scheduling.
- A queue is not just a status bucket.
- A queue owns ordering, readiness, eligibility, and dispatchability.
- Queues can contain tasks, swarm requests, retries, resumptions, and review items.

Swarm
- A dispatchable execution package.
- Exists to perform work through one or more workers under a shared purpose and output contract.
- A swarm is not a plan substitute.
- A swarm is not the planning system.
- A swarm is one execution mechanism available to the plan.

## 12. Parallelism Rules

Parallelism is default where dependency truth allows it.

Can run in parallel
- multiple lanes
- multiple projects
- multiple plans
- multiple tasks within a plan
- multiple queues across plans
- multiple swarms across projects

Cannot run in parallel when blocked by
- explicit dependency unsatisfied
- missing credential or runtime
- missing tool capability
- declared user approval boundary
- exceeded cost ceiling
- exclusive resource lock
- incompatible modality or environment requirement

Execution states must distinguish
- Draft: defined but not yet eligible
- Ready: eligible to run now
- Queued: ready but waiting for dispatch slot, budget slot, or priority turn
- In Progress: actively executing
- Blocked: cannot execute due to explicit unmet condition
- Parked: intentionally deferred without being invalid
- Review Pending: execution done, human or verifier review needed
- Complete: done and accepted
- Failed: execution attempted but did not meet completion conditions
- Abandoned: intentionally retired with no further execution planned

Approval rule
- Approval gates are exceptions, not defaults.
- Approval is used only where Fritz explicitly wants human control, or where side effects are materially sensitive.
- The doctrine must resist approval creep.

## 13. Routing Truth

Routing defaults to cheapest-sufficient execution.

Premium execution is justified only by:
- modality need
- complexity
- verification risk
- prior cheap-lane failure
- quality threshold unmet by cheaper lanes
- time-criticality where delay costs more than premium routing

Routing Policy
- The declared strategy/rules for how work should be routed.
- Examples:
  - cheap-first
  - codex-first adversarial review
  - text-only workers barred from image evaluation
  - premium lane only after cheap failure
  - browser-required tasks must use browser-capable workers

Runtime Decision
- The actual routing choice made for one run.
- Must record:
  - chosen agent type
  - chosen model
  - chosen tools
  - chosen lane
  - why that choice was made
  - whether it matched declared routing policy
  - if overridden, what triggered override

This distinction is mandatory.
Otherwise the system cannot tell strategy from improvisation.

## 14. Agent Type as First-Class Object

Agent Type must be explicit.

Agent Type defines a reusable worker role shape:
- name
- purpose
- allowed tools
- preferred model lane
- disallowed modalities
- escalation triggers
- output contract
- verification expectation
- evaluation rubric
- cost posture
- retry posture

Examples
- source-finder
- contradiction-checker
- planner
- implementer
- QA observer
- verifier
- cost auditor
- visual workflow mapper

Worker Run is not Agent Type.
Agent Type is the template.
Worker Run is one actual execution instance.

## 15. Durable Run Ledger

The system must maintain a durable run ledger.

Purpose:
Always answer:
- who did what
- under which plan/task/swarm
- with which model
- with which tools
- at what cost
- for how long
- producing which artifacts
- with what result

Ledger entry minimum fields
- run id
- parent lane
- parent project
- parent plan
- parent task or swarm
- agent type
- worker identity
- model/provider
- toolset used
- routing policy reference
- runtime decision record
- start time
- end time
- duration
- cost or token usage when available
- artifacts produced
- observed outcome
- interpreted evaluation
- retry/resume lineage

Swarm ledger
A swarm must also have a higher-level ledger entry summarizing:
- swarm purpose
- worker composition
- dispatch time
- completion state
- artifact bundle
- total cost
- aggregate evaluation
- unresolved issues
- downstream tasks spawned

## 16. Evaluation: Observation vs Interpretation

Evaluation must explicitly separate observation from interpretation.

Observation
- What happened.
- Raw, inspectable, time-bound facts.
Examples:
- worker ran 18 minutes
- used model X
- invoked browser and terminal
- failed verification twice
- artifact missing required section
- cost exceeded expected ceiling by 12%

Interpretation
- What the observations suggest.
Examples:
- this agent type underperforms on multimodal verification
- cheap lane insufficient for this task class
- routing rule needs adjustment
- task decomposition was too coarse

Why this matters
- mixed evaluation muddies learning
- raw evidence must remain inspectable
- strategic conclusions must remain revisable

## 17. Visual Synchronization Doctrine

Visual surfaces are first-class derived interfaces from the same graph truth.

Required synchronized views include:
- board view
- dependency graph
- queue monitor
- swarm monitor
- command-center dashboard
- daily brief
- blocked work view
- cost/performance dashboard

Rules
- no visual surface may invent separate truth
- changing underlying graph state updates all derived views
- views may differ in emphasis, not in reality
- command-center view should be the primary orchestration surface, not an afterthought

## 18. Command-Center Default

The default orchestration surface should show:
- active lanes
- active projects
- each project’s canonical plan state
- ready tasks
- blocked tasks
- queued work
- active swarms
- cost posture
- alerts requiring Fritz
- recent evaluation signals
- resumable runs

This is not “a dashboard for later.”
It is a direct requirement of the doctrine.

## 19. Resumability Rule

Every non-trivial run should leave resumable context.

That means:
- current state
- last completed step
- next intended step
- blocking condition if any
- artifact pointers
- ledger linkage
- parent plan/task/swarm reference

No opaque dead ends.
No “the process was running somewhere.”
No hidden state trapped in a terminal or chat thread.

## 20. Queue and Escalation Mechanics

Queue mechanics must be explicit and operational.

### Queue admission rules
A work item may enter a queue only when all of the following are true:
- it belongs to a parent lane, project, and plan
- it has a clear work type: task, swarm request, retry, resumption, review item, or human-decision prompt
- it has a current state and a next eligible state
- it has declared prerequisites
- it has a routing policy reference
- it has a priority or ordering basis
- it has a cost lane or budget posture
- it has an owner type: human-owned, direct-run, queue-run, or swarm-candidate

If those fields are missing, the item stays Draft and does not enter an execution queue.

### Queue rejection rules
A queue must reject an item when:
- no parent plan exists
- completion criteria are missing
- the item duplicates an existing active item without explicit supersession
- required prerequisites are undefined
- the item requires a modality or tool lane that does not exist
- the item is actually a project or plan masquerading as a task

Rejected items must return with a reason code, not disappear silently.

### Requeue rules
An item is requeued only when:
- execution failed but retry is still justified
- a blocking dependency was resolved
- a human decision was supplied
- verification requested one more pass
- an interrupted run is resumable from known state

Requeue must record:
- why it was requeued
- what changed since last attempt
- whether routing policy changed
- whether cost posture changed
- retry count

### Queue-to-swarm escalation rules
An item escalates from queue item to swarm request when one or more of the following is true:
- the work decomposes cleanly into multiple narrow roles
- verification requires separate reviewer or breaker roles
- the task is time-sensitive enough that parallel execution materially helps
- the work contains multiple independent subtasks
- the work requires multimodal or tool-diverse roles that should not be collapsed into one worker
- the work benefits from adversarial review before writeback

Escalation must not be emotional or hype-driven.
It must be traceable to explicit need.

## 21. Swarm, Hyperswarm, and Specialized-Agent Mechanics

### Swarm creation thresholds
A normal swarm is justified when at least one of these thresholds is crossed:
- 3 or more distinct worker roles are required
- independent subtasks can run in parallel without waiting on each other
- verification should be separated from implementation
- one worker would become too broad, too slow, or too context-heavy

### Hyperswarm definition
A hyperswarm is not “a bigger swarm” by vibes.
A hyperswarm is a swarm architecture designed for aggressive atomic parallelism with:
- many narrow workers
- minimal context injection per worker
- durable worker/run telemetry
- explicit worker IDs and context packets
- captain-visible traceability

Hyperswarm is justified when:
- the work can be decomposed into many repeatable atomic roles
- cost control depends on cheapest-sufficient routing across many workers
- later assessment, replay, or process-improvement analysis matters
- the captain needs precise visibility into exactly which worker got which context and produced which output

If those conditions are not true, use a normal swarm or direct execution instead.

### Specialized-agent creation rules
Create a specialized agent type when:
- the role recurs across projects or plans
- the role has a stable output contract
- the role has a stable tool/modality shape
- the role benefits from reusable routing/evaluation rules

Do not create a new specialized agent type just because a task has a cool label.
One-off novelty is not enough.

### Specialized-agent ingestion rules
External or discovered agents may be ingested only when they are captured into local doctrine as:
- defined purpose
- allowed tools
- preferred model lane
- disallowed modalities or constraints
- output contract
- verification expectation
- evaluation rubric
- cost posture
- retry posture

An ingested agent is not trusted just because it exists elsewhere.
It must be normalized into local agent-type truth.

### New-agent lifecycle
Every new or ingested agent type moves through:
- Proposed
- Trial
- Verified
- Reusable
- Restricted or Retired

Promotion to Reusable requires:
- at least one successful verified run
- no unresolved output-contract ambiguity
- evaluation notes
- explicit routing fit
- explicit cost posture

## 22. Worker Identity, Artifact Contract, and Dependency Model

### Worker identity model
The doctrine must distinguish four layers:

- Agent Type
  The reusable role template.

- Worker Template
  A concrete operational template derived from an agent type for a specific environment, toolset, or lane.

- Worker Instance
  The instantiated worker identity assigned to one queued item or swarm role.

- Worker Run
  One actual execution event by that worker instance.

This distinction prevents reusable role truth from being confused with one-off runtime behavior.

### Artifact contract
Every artifact produced by the system must declare:
- artifact id
- artifact type
- parent lane/project/plan/task/swarm
- producing worker run
- created time
- status: draft, review-pending, accepted, superseded, rejected
- verification state
- output-contract compliance state
- linked dependencies
- linked follow-up work if spawned

Artifacts are not just files.
They are tracked outputs with state.

### Dependency object / edge model
Dependencies must be first-class relations, not just freeform reason text.

Each dependency edge must declare:
- source object
- target object
- dependency type
- blocking or non-blocking
- satisfaction condition
- current satisfaction state
- evidence pointer or artifact pointer

Dependency types may include:
- requires-decision
- requires-artifact
- requires-credential
- requires-completion
- requires-review
- requires-environment

## 23. Evaluation Writeback and Plan-Parsing Mechanics

### Evaluation writeback model
Evaluation must write back into the system in explicit ways.

Writeback targets:
- routing policy adjustment
- agent-type restriction or promotion
- retry posture adjustment
- decomposition rule adjustment
- queue-priority change
- future swarm recommendation
- human-owned caution flag

Writeback must state:
- what observation triggered it
- what interpretation was made
- what rule or object changed
- scope of change: run-only, task-class, agent-type, project, or global doctrine

No silent learning.
If the system got smarter, the writeback path should be inspectable.

### Deep-dive conversation to plan-parsing mechanics
The system must be able to take a broad Fritz conversation about life, work, stress, projects, obligations, ideas, and priorities and convert it into structured operational objects.

The parsing sequence is:

1. Capture raw statements without flattening them.
2. Separate observations, desires, obligations, frustrations, ideas, and constraints.
3. Map each item into the most likely lane.
4. Group related items into bounded projects.
5. For each project, create one canonical whole-map plan.
6. Break the plan into workstreams when different execution patterns exist inside the same project.
7. Break workstreams into tasks.
8. Mark each task as:
- direct execution
- queue candidate
- swarm candidate
- human-owned decision
- blocked item
- research/inventory item
9. Attach dependencies, cost posture, and routing posture.
10. Produce the first executable next steps without losing the larger map.

### Plan-parsing output contract
The result of deep-dive parsing must produce, at minimum:
- lane assignment
- project list
- one canonical plan per project
- workstreams per plan where needed
- task list per workstream
- blocked items
- human-decision items
- queue candidates
- swarm candidates
- first-next actions
- view-ready summary for command-center surfaces

### Practical rule
If a fresh session can read this doctrine and turn Fritz’s deep-dive conversation into those structured outputs without inventing a new planning theory, the doctrine is working.
If it cannot, the doctrine is incomplete.
