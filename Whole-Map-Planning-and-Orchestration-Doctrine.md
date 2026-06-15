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
- parallel decomposition
- adversarial review
- model diversity
- verification loops
- workload isolation

Every swarm must define:
- purpose
- parent plan/task
- required outputs
- worker roles
- routing policy
- success conditions
- failure conditions
- evaluation method
- artifact contract

## 8. Routing Doctrine

Routing is first-class and must be explicit.

Routing decides:
- which agent type is used
- which model lane is used
- which tools are allowed
- whether a task stays single-worker or becomes swarm work
- when escalation occurs
- when cheaper lanes are sufficient
- when premium lanes are justified

Routing must consider:
- task type
- required modality
- tool needs
- urgency
- cost ceiling
- historical performance
- evaluation history
- failure recovery rules

## 9. Evaluation Doctrine

Evaluation is not a log dump.
Evaluation is the system’s learning mechanism.

Evaluation must exist at multiple levels:
- worker run
- swarm run
- task
- plan
- project

Evaluation should track at minimum:
- correctness
- completeness
- autonomy
- cost efficiency
- turnaround time
- verification outcome
- usefulness to Fritz
- resumability quality

Those scores must influence future routing and swarm design.

## 10. Views Doctrine

Views are derived from graph truth.

Examples:
- kanban board
- morning brief
- command center
- dependency map
- active swarm monitor
- cost dashboard
- blocked-work report
- per-lane status board

Views can differ.
Truth cannot.

## 11. Permanent Object Boundaries

These objects must not collapse into each other.

### Lane
- A permanent life/business stream.
- Exists regardless of whether any single project is active.
- Examples: Fritz, Income, Research, Metaphysical, Shay/Platform.
- A lane is not a sprint, campaign, or current focus.
- A lane may contain many projects over time.

### Project
- A bounded initiative inside a lane.
- Has a real outcome, not just activity.
- May touch multiple repos, systems, agents, or workflows.
- Does not become “whatever we are currently working on.”
- Can be active, paused, blocked, dormant, or complete.

### Plan
- The complete operational map for one project.
- Durable, end-to-end, whole-map from the start.
- Defines completion, dependencies, execution shape, delegation shape, and evaluation shape.
- A plan is not a task list.
- A plan is not a queue.
- A plan is not a swarm.
- A project has one canonical plan, though that plan may contain many branches, tasks, queues, and swarms.

### Task
- A concrete unit of work under a plan.
- Small enough to assign, track, block, verify, or dispatch.
- A task is not a project.
- A task does not own the full strategic map.
- A task may be handled directly, queued, or escalated into swarm execution.

### Queue
- A first-class dispatch structure for work items waiting on execution, retry, resume, review, or scheduling.
- A queue is not just a status bucket.
- A queue owns ordering, readiness, eligibility, and dispatchability.
- Queues can contain tasks, swarm requests, retries, resumptions, and review items.

### Swarm
- A dispatchable execution package.
- Exists to perform work through one or more workers under a shared purpose and output contract.
- A swarm is not a plan substitute.
- A swarm is not the planning system.
- A swarm is one execution mechanism available to the plan.

## 12. Parallelism Rules

Parallelism is default where dependency truth allows it.

Can run in parallel:
- multiple lanes
- multiple projects
- multiple plans
- multiple tasks within a plan
- multiple queues across plans
- multiple swarms across projects

Cannot run in parallel when blocked by:
- explicit dependency unsatisfied
- missing credential or runtime
- missing tool capability
- declared user approval boundary
- exceeded cost ceiling
- exclusive resource lock
- incompatible modality or environment requirement

Execution states must distinguish:
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

Approval rule:
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

### Routing Policy
- The declared strategy/rules for how work should be routed.
- Examples:
  - cheap-first
  - codex-first adversarial review
  - text-only workers barred from image evaluation
  - premium lane only after cheap failure
  - browser-required tasks must use browser-capable workers

### Runtime Decision
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

Examples:
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

Ledger entry minimum fields:
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

### Swarm ledger
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

### Observation
- What happened.
- Raw, inspectable, time-bound facts.
Examples:
- worker ran 18 minutes
- used model X
- invoked browser and terminal
- failed verification twice
- artifact missing required section
- cost exceeded expected ceiling by 12%

### Interpretation
- What the observations suggest.
Examples:
- this agent type underperforms on multimodal verification
- cheap lane insufficient for this task class
- routing rule needs adjustment
- task decomposition was too coarse

Why this matters:
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

Rules:
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
