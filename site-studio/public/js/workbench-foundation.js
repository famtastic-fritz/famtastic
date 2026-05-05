(function () {
  const TOOL_ORDER_STORAGE_KEY = 'famtastic-workbench-tool-order';

  const state = {
    scope: 'all-sites',
    submode: 'sites',
    selected: 'portfolio',
    mode: 'build',
    console: 'runs',
    themeIndex: 0,
    toolOrder: readToolOrder(),
    planData: null,
    planDataError: null
  };

  const themes = ['malachite', 'electric', 'paper'];

  const scopes = {
    'all-sites': {
      title: 'All Sites',
      submodes: ['sites', 'pages', 'meta', 'media', 'templates', 'runs', 'proof'],
      objects: {
        sites: [
          ['portfolio', 'Portfolio overview', 'Site roster, revenue fit, proof state, and next job'],
          ['site-mbsh', 'MBSH Reunion', 'Pages, RSVP, sponsor flow, admin, media, deploy'],
          ['site-pip', 'Pip Knows', 'Knowledge product, audience, asset needs'],
          ['site-next', 'Next site candidate', 'Idea, brief, revenue hypothesis, readiness']
        ],
        pages: [
          ['page-map', 'Page map', 'Home, RSVP, library, admin, missing pages, and owner'],
          ['page-proof', 'Page proof', 'Screenshots, links, a11y, fulfillment, and regression checks'],
          ['page-next', 'Next page job', 'Create, split, merge, repair, or retire a page']
        ],
        meta: [
          ['taxonomy', 'Site taxonomy', 'Tags, verticals, audience, product type'],
          ['revenue', 'Revenue model', 'Offer, pricing, conversion route'],
          ['quality', 'Quality gates', 'FAM, Lighthouse, a11y, proof'],
          ['memory', 'Canonical memory', 'Decisions, learnings, gaps, and changelog touchpoints']
        ],
        media: [
          ['hero-assets', 'Hero assets', 'Images tied to selected page and section'],
          ['brand-assets', 'Brand assets', 'Logo, icons, social cards, favicon pack'],
          ['unused-assets', 'Unused assets', 'Find, retire, or repurpose']
        ],
        templates: [
          ['site-template', 'Site template', 'Chrome, sections, component recipes'],
          ['admin-template', 'Admin template', 'Forms, tables, status panels, modals'],
          ['shay-template', 'Shay template', 'Show Me, Propose, Do It surfaces']
        ],
        runs: [
          ['active-run', 'Active run', 'Current build/review/deploy work'],
          ['queued-work', 'Queued work', 'Worker queue with purpose and unblock'],
          ['stale-work', 'Stale work', 'Duplicated, superseded, or unclear plans']
        ],
        proof: [
          ['visual-proof', 'Visual proof', 'Screenshots, responsive checks, and comparison evidence'],
          ['behavior-proof', 'Behavior proof', 'Forms, links, APIs, console, and trace evidence'],
          ['handoff-proof', 'Handoff proof', 'What changed, what remains, and where it lives']
        ]
      }
    },
    'site-mbsh': {
      title: 'MBSH Reunion',
      submodes: ['site', 'pages', 'meta', 'media', 'template', 'runs', 'proof', 'backend', 'admin', 'deploy'],
      objects: {
        site: [
          ['site-job', 'Site job', 'Current purpose, revenue path, readiness, and next proof'],
          ['site-brief', 'Site brief', 'Audience, promise, constraints, must-have sections']
        ],
        pages: [
          ['home', 'Home page', 'Hero, story, sponsors, RSVP funnel'],
          ['rsvp', 'RSVP page', 'Form, validation, persistence, email'],
          ['sponsors', 'Sponsors', 'Packages, payment path, proof'],
          ['admin', 'Admin pages', 'Review queue, exports, moderation']
        ],
        meta: [
          ['site-meta', 'Site metadata', 'SEO, social card, analytics, schemas, and deployment identity'],
          ['reunion-model', 'Revenue and proof', 'Sponsor packages, RSVP state, receipts, and trust signals']
        ],
        media: [
          ['story-stills', 'Story stills', 'Then/now imagery and rejected candidates'],
          ['brand-mark', '30 + 100 mark', 'Approved and rejected identity assets'],
          ['gallery', 'Gallery', 'Class images, rights, usage map']
        ],
        template: [
          ['chrome-template', 'Chrome template', 'Nav, header, footer, page skeleton, and shared CSS'],
          ['section-recipes', 'Section recipes', 'Hero, story, sponsor, RSVP, admin, and proof sections']
        ],
        runs: [
          ['build-run', 'Build run', 'Current edits, worker state, approvals, logs, and rollback'],
          ['review-run', 'Review run', 'Visual, links, console, a11y, and fulfillment pass']
        ],
        proof: [
          ['site-proof', 'Site proof', 'Screenshots, accessibility, links, API checks, and completion notes'],
          ['deploy-proof', 'Deploy proof', 'Staging URL, smoke tests, production approval, and rollback']
        ],
        backend: [
          ['rsvp-api', 'RSVP API', 'POST endpoint, database, email'],
          ['uploads', 'Uploads', 'Moderation, storage, security'],
          ['cron', 'Cron jobs', 'Reminders, cleanup, exports']
        ],
        admin: [
          ['admin-rsvps', 'RSVP admin', 'Filters, export, edit, proof'],
          ['admin-sponsors', 'Sponsor admin', 'Packages, status, assets'],
          ['admin-health', 'Health admin', 'Backend, deploy, auth, email']
        ],
        deploy: [
          ['staging', 'Staging', 'Preview deploy, smoke tests, proof'],
          ['production', 'Production', 'Hard-stop gate, DNS, rollback'],
          ['portability', 'Portability', 'Export pack and transfer notes']
        ]
      }
    },
    'site-pip': {
      title: 'Pip Knows',
      submodes: ['pages', 'media', 'plans'],
      objects: {
        pages: [['pip-home', 'Home', 'Promise, product, lead path'], ['pip-library', 'Library', 'Content and proof']],
        media: [['pip-brand', 'Brand assets', 'Voice, marks, visuals']],
        plans: [['pip-plan', 'Product plan', 'Revenue hypothesis and next run']]
      }
    },
    studio: {
      title: 'Studio System',
      submodes: ['shell', 'shay', 'capabilities', 'workers'],
      objects: {
        shell: [['workbench-shell', 'Workbench shell', 'This screen, production replacement path'], ['modals', 'Modal system', 'Admin and review dialogs']],
        shay: [['shay-interactions', 'Shay interactions', 'Show Me, Propose, Do It'], ['shay-templates', 'Shay templates', 'Response and plan card recipes']],
        capabilities: [['cap-store', 'Capability Store', 'Brains, tools, providers, permissions, cost'], ['research-tools', 'Research tools', 'Search, cite, compare, promote']],
        workers: [['worker-queue', 'Worker queue', 'Purpose, assignment, proof, consumer'], ['approvals', 'Approvals', 'Plan, deploy, cost, destructive gates']]
      }
    },
    platform: {
      title: 'Platform',
      submodes: ['ops', 'admin', 'portable'],
      objects: {
        ops: [['health', 'Health', 'Launchd, logs, services'], ['updates', 'Updates', 'Patch, theme, asset, dependency']],
        admin: [['keys', 'Keys and secrets', 'Vault, permissions, redaction'], ['domains', 'Domains', 'DNS, providers, ownership']],
        portable: [['exports', 'Exports', 'Standalone packs'], ['migration', 'Migration', 'Move sites cleanly']]
      }
    }
  };

  const modeCopy = {
    build: {
      label: 'Sites',
      title: 'Sites Workbench',
      job: 'site/page/meta/media/template/runs/proof',
      tools: {
        'Site assist': ['Live preview', 'Select object', 'Open compare', 'Trace parent'],
        'Page/media assist': ['Rewrite section', 'Swap slot', 'Tune layout', 'Save recipe'],
        'Proof assist': ['Screenshot', 'A11y scan', 'Link check', 'Fulfillment trace']
      }
    },
    plan: {
      label: 'Plan',
      title: 'Plan workbench',
      job: 'why/blockers/unlocks/assignment/proof',
      tools: {
        'Plan tools': ['Show why', 'Find blockers', 'Find duplicates', 'Mark stale'],
        'Run tools': ['Start run', 'Assign worker', 'Require proof', 'Create approval'],
        'Graph tools': ['Dependency graph', 'Unlock map', 'Parallel lanes', 'Risk view']
      }
    },
    components: {
      label: 'Components',
      title: 'Component workbench',
      job: 'component/variant/state/usage/promotion',
      tools: {
        'Component tools': ['Search library', 'Create variant', 'Promote component', 'Show usage'],
        'Proof tools': ['Responsive proof', 'Dependency check', 'Version pin', 'Retire old']
      }
    },
    media: {
      label: 'Media',
      title: 'Media Studio',
      job: 'prompt/reference/mode/results/usage/proof',
      tools: {
        'Prompt assist': ['Prompt helper', 'Style reference', 'Reference attach', 'Negative prompt'],
        'Generation setup': ['Image', 'Video', 'Blueprints', 'Upscale', 'Canvas', 'Draw'],
        'Library support': ['Filter results', 'Compare variants', 'Usage map', 'Replace selected']
      }
    },
    research: {
      label: 'Research',
      title: 'Research workbench',
      job: 'question/sources/claims/contradictions/promotion',
      tools: {
        'Research tools': ['Search web', 'Fetch source', 'Extract claims', 'Compare sources'],
        'Promotion tools': ['Create capture', 'Create task', 'Update capability', 'Log contradiction']
      }
    },
    deploy: {
      label: 'Deploy',
      title: 'Deploy workbench',
      job: 'environment/gates/smoke/rollback/approval',
      tools: {
        'Environment tools': ['Health check', 'Stage deploy', 'Smoke test', 'Rollback path'],
        'Admin tools': ['Provider auth', 'Domain status', 'Export pack', 'Update config']
      }
    }
  };

  const logs = {
    runs: [['RUN', 'Workbench rebuild: center stage is now the live bench, not a dashboard grid.', 'now', 'blue'], ['PLAN', 'Site scope owns pages, functions, assets, tasks, and proof.', '2m', 'gold'], ['PROOF', 'Need visual review after dynamic shelf pass.', '4m', 'green']],
    logs: [['SHAY', 'Captured critique: cards were placed where tools and live surfaces should be.', 'now', 'violet'], ['FAM', 'Visual rule: darker at native edges, translucent over workspace.', '1m', 'red'], ['BUILD', 'Tool pods are draggable and reorderable in the shelf.', '3m', 'blue']],
    trace: [['TRACE', 'scope -> submode -> selected object -> bench layout -> contextual tools -> proof.', 'now', 'cyan'], ['TRACE', 'Every object needs parent, purpose, execution role, tools, and proof.', '2m', 'gold']],
    approvals: [['GATE', 'Production Studio replacement still requires approval.', 'policy', 'red'], ['GATE', 'Canonical memory promotion remains review-first.', 'policy', 'gold']],
    proof: [['PROOF', 'Preview pane, chat panel, evidence panel, and tool shelf are present.', 'pending', 'green'], ['PROOF', 'Need drag/drop and collapse checks through Playwright.', 'pending', 'gold']]
  };

  const colors = { red: 'var(--red)', gold: 'var(--gold)', green: 'var(--green)', blue: 'var(--blue)', violet: 'var(--violet)', cyan: 'var(--cyan)' };

  function currentScope() {
    return scopes[state.scope] || scopes['all-sites'];
  }

  function currentObjects() {
    const scope = currentScope();
    const submode = scope.objects[state.submode] ? state.submode : Object.keys(scope.objects)[0];
    state.submode = submode;
    return scope.objects[submode];
  }

  function currentObject() {
    const objects = currentObjects();
    return objects.find(([id]) => id === state.selected) || objects[0];
  }

  function setScope(scopeId) {
    state.scope = scopeId;
    const scope = currentScope();
    state.submode = scope.submodes[0];
    state.selected = currentObjects()[0][0];
    render();
  }

  function setSubmode(submode) {
    state.submode = submode;
    state.selected = currentObjects()[0][0];
    render();
  }

  function setSelected(id) {
    state.selected = id;
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    render();
  }

  function render() {
    const scope = currentScope();
    const object = currentObject();
    const mode = modeCopy[state.mode];

    document.getElementById('scope-title').textContent = scope.title;
    document.getElementById('bench-title').textContent = mode.title;
    document.getElementById('crumb').textContent = `${scope.title} / ${titleCase(state.submode)} / ${object[1]}`;
    document.getElementById('tool-title').textContent = `${mode.title} support`;
    document.getElementById('status-scope').textContent = scope.title;
    document.getElementById('status-mode').textContent = mode.label || titleCase(state.mode);
    document.body.dataset.mode = state.mode;

    syncActive('.scope-button', 'scope', state.scope);
    syncActive('.mode-button', 'mode', state.mode);
    renderSubmodes(scope);
    renderObjects();
    renderBench(object);
    renderTools(mode.tools);
    renderConsole();
  }

  function renderSubmodes(scope) {
    document.getElementById('submode-strip').innerHTML = scope.submodes.map((submode) => (
      `<button class="submode-button ${submode === state.submode ? 'active' : ''}" type="button" data-submode="${submode}">${titleCase(submode)}</button>`
    )).join('');
  }

  function renderObjects() {
    document.getElementById('object-list').innerHTML = currentObjects().map(([id, title, description]) => (
      `<button class="object-card ${id === state.selected ? 'active' : ''}" type="button" data-object="${id}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </button>`
    )).join('');
  }

  function renderBench(object) {
    const [id, title, description] = object;
    const stage = document.getElementById('bench-stage');
    if (state.mode === 'build') {
      stage.innerHTML = buildPreviewBench(title, description);
    } else if (state.mode === 'plan') {
      stage.innerHTML = buildPlanBench(title, description);
    } else if (state.mode === 'media') {
      stage.innerHTML = buildMediaBench(title, description);
    } else if (state.mode === 'research') {
      stage.innerHTML = buildResearchBench(title, description);
    } else if (state.mode === 'deploy') {
      stage.innerHTML = buildDeployBench(title, description);
    } else {
      stage.innerHTML = buildComponentBench(title, description, id);
    }
  }

  function buildPreviewBench(title, description) {
    return `<div class="canvas-layer">
      <div class="site-work-surface">
        <div class="site-work-main">
          <div class="surface-ribbon">
            <span>Site</span><span>Page</span><span>Meta</span><span>Media</span><span>Template</span><span>Runs</span><span>Proof</span>
          </div>
          <div class="live-preview">
            <div class="preview-browser"><span class="window-dot"></span><span class="window-dot"></span><span class="window-dot"></span><span>${escapeHtml(title)} - selected job surface</span></div>
            <div class="preview-page">
              <div class="preview-ring"></div>
              <div class="preview-hero">
                <div class="tagline">Active site job</div>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(description)}. Work starts here: choose the site object, touch the page or function, attach media/template changes, then close with proof.</p>
                <div class="hero-actions"><span class="preview-chip">Edit job</span><span class="preview-chip">Bind media</span><span class="preview-chip">Prove change</span></div>
              </div>
              <div class="preview-slab"><strong>Job contract</strong><p>Parent: ${escapeHtml(currentScope().title)}. Selected lane: ${escapeHtml(titleCase(state.submode))}. Closure requires run output and proof, not just a prettier screen.</p></div>
            </div>
          </div>
        </div>
        <div class="site-job-stack">
          ${siteWorkSurface('Site', 'Purpose, offer, owner, status', state.submode === 'sites' || state.submode === 'site')}
          ${siteWorkSurface('Page', 'Route, section, function, selected slot', state.submode === 'pages')}
          ${siteWorkSurface('Meta', 'SEO, social, analytics, memory', state.submode === 'meta')}
          ${siteWorkSurface('Media', 'Assets, slots, rights, replacements', state.submode === 'media')}
          ${siteWorkSurface('Template', 'Chrome, recipes, shared CSS', state.submode === 'templates' || state.submode === 'template')}
          ${siteWorkSurface('Runs', 'Workers, logs, approvals, rollback', state.submode === 'runs')}
          ${siteWorkSurface('Proof', 'Screenshots, a11y, links, fulfillment', state.submode === 'proof')}
        </div>
      </div>
      ${objectPanel(title)}
      ${shayPanel(title)}
      ${evidencePanel()}
    </div>`;
  }

  function siteWorkSurface(label, copy, active) {
    return `<button class="job-surface ${active ? 'active' : ''}" type="button">
      <span>${escapeHtml(label)}</span>
      <small>${escapeHtml(copy)}</small>
    </button>`;
  }

  function buildPlanBench(title, description) {
    const data = state.planData;
    if (!data) {
      return `<div class="plan-board plan-board-loading">
        ${node('Loading registry', state.planDataError || 'Reading browser-safe plan state from data/workbench-plan-state.json.', 'Plan state')}
        ${node('Fallback object', description, 'Selected object')}
        ${node('Next best action', `Review ${title}, then decide: execute, split, merge, or retire.`, 'Action')}
      </div>`;
    }
    const p0 = data.tasks_by_priority?.P0 || [];
    const p1 = data.tasks_by_priority?.P1 || [];
    const p2 = data.tasks_by_priority?.P2 || [];
    return `<div class="plan-intel-surface">
      <section class="plan-spine">
        <div class="plan-spine-head">
          <div>
            <div class="eyebrow">Consolidated Plan State</div>
            <h2>Four active parents. Everything else is evidence, context, or task fuel.</h2>
          </div>
          <div class="plan-spine-metrics">
            ${metric('Parents', data.summary?.active_parent_count || 0)}
            ${metric('Tasks', data.summary?.task_count || 0)}
            ${metric('Proof', data.summary?.proof_count || 0)}
            ${metric('Runs', data.summary?.run_count || 0)}
          </div>
        </div>
        <div class="plan-parent-grid">
          ${(data.active_parents || []).map(planParent).join('')}
        </div>
      </section>

      <section class="plan-priority-lanes">
        ${priorityLane('P0', 'Do now', p0)}
        ${priorityLane('P1', 'Build next', p1)}
        ${priorityLane('P2', 'Only after proof', p2)}
      </section>

      <section class="plan-run-strip">
        <div>
          <div class="eyebrow">Current Run</div>
          <strong>${escapeHtml(data.current_run?.id || 'No active run')}</strong>
          <p>${escapeHtml(data.current_run?.current_step || 'No current run step recorded.')}</p>
        </div>
        <div class="plan-status-flags">
          ${flag('Drive sync', data.summary?.drive_sync_status || 'unknown')}
          ${flag('Workflow data', data.summary?.workflow_as_data_status || 'unknown')}
          ${flag('Visualizer', data.summary?.pipeline_visualizer_status || 'unknown')}
        </div>
      </section>
    </div>`;
  }

  function metric(label, value) {
    return `<span class="plan-metric"><b>${escapeHtml(value)}</b><small>${escapeHtml(label)}</small></span>`;
  }

  function flag(label, value) {
    return `<span class="plan-flag status-${escapeHtml(String(value).toLowerCase())}"><b>${escapeHtml(label)}</b><small>${escapeHtml(value)}</small></span>`;
  }

  function planParent(plan) {
    return `<article class="plan-parent">
      <div class="plan-parent-top">
        <span>${escapeHtml(plan.priority || 'P?')}</span>
        <small>${escapeHtml(plan.status || 'unknown')}</small>
      </div>
      <h3>${escapeHtml(plan.title)}</h3>
      <p>${escapeHtml(plan.current_workstream)}</p>
      <div class="plan-next"><b>Next</b><span>${escapeHtml(plan.next_action)}</span></div>
      <div class="plan-blocker"><b>Watch</b><span>${escapeHtml(plan.blocker)}</span></div>
    </article>`;
  }

  function priorityLane(priority, label, tasks) {
    return `<div class="priority-lane">
      <header><span>${escapeHtml(priority)}</span><b>${escapeHtml(label)}</b><small>${tasks.length} tasks</small></header>
      <div class="priority-task-list">
        ${tasks.map(priorityTask).join('') || '<p class="empty-lane">No tasks in this lane.</p>'}
      </div>
    </div>`;
  }

  function priorityTask(task) {
    return `<article class="priority-task">
      <span class="task-plan">${escapeHtml(task.plan_id)}</span>
      <strong>${escapeHtml(task.title)}</strong>
      <p>${escapeHtml(task.next_action)}</p>
    </article>`;
  }

  function buildComponentBench(title, description) {
    return `<div class="compare-grid">
      <div class="compare-pane"><header>Component canvas</header>${node(title, description, 'Selected component')}</div>
      <div class="compare-pane"><header>Usage proof</header>${node('Where used', 'Site, page, section, dependency, variant, and screenshot evidence.', 'Proof')}</div>
    </div>`;
  }

  function buildMediaBench(title, description) {
    return `<div class="media-studio">
      <section class="media-hero prompt-first">
        <div class="media-backdrop"></div>
        <div class="media-kicker">Media Studio / ${escapeHtml(title)}</div>
        <h2>Prompt the asset job.</h2>
        <p>${escapeHtml(description)}. Start with the asset's purpose, destination slot, reference, format, and proof. Library browsing and results only support that creation job.</p>
        <div class="prompt-console">
          <button class="prompt-icon" type="button" aria-label="Attach reference">+</button>
          <input type="text" value="" placeholder="Need a hero still for the RSVP page: warm reunion energy, usable behind text, rights clear..." aria-label="Media prompt">
          <button class="prompt-helper" type="button">Spark</button>
          <button class="prompt-generate" type="button">Generate</button>
        </div>
        <div class="creation-modes">
          ${mediaMode('Image', 'Still / hero / product')}
          ${mediaMode('Video', 'Loop / scene / motion')}
          ${mediaMode('Blueprints', 'Reusable prompt recipe')}
          ${mediaMode('Flow State', 'Multi-step generation')}
          ${mediaMode('Upscaler', 'Improve final asset')}
          ${mediaMode('Canvas', 'Edit and compose')}
          ${mediaMode('Draw', 'Manual markups')}
        </div>
      </section>

      <section class="media-support-grid">
        <div class="media-job-panel">
          <div class="eyebrow">Creation Contract</div>
          <h3>Prompt -> route -> result -> slot -> proof</h3>
          <div class="media-contract-list">
            <span>Destination: site/page/section/slot</span>
            <span>Reference: attached or none</span>
            <span>Route: capability evidence decides</span>
            <span>Proof: quality, rights, cost, usage</span>
          </div>
        </div>
        <div class="media-side-panel">
          <div class="eyebrow">Results Support</div>
          <div class="media-result-row"><b>Queued</b><span>3 prompt variants</span></div>
          <div class="media-result-row"><b>Ready</b><span>2 need review</span></div>
          <div class="media-result-row"><b>Rejected</b><span>1 logged with reason</span></div>
        </div>
        <div class="media-side-panel">
          <div class="eyebrow">Library Support</div>
          <div class="media-result-row"><b>Used</b><span>Mapped to slots</span></div>
          <div class="media-result-row"><b>Family</b><span>Variants and prompts</span></div>
          <div class="media-result-row"><b>Rights</b><span>Clear before promote</span></div>
        </div>
      </section>

      <section class="media-library-strip">
        ${asset('Recent result', 'Hero atmosphere')}
        ${asset('Blueprint', 'Multi-character scene')}
        ${asset('Video loop', 'Yearbook motion')}
        ${asset('Brand pack', 'Logo and favicon')}
        ${asset('Reference', 'Approved mascot pose')}
      </section>
    </div>`;
  }

  function mediaMode(label, hint) {
    return `<button class="creation-mode" type="button"><span>${escapeHtml(label)}</span><small>${escapeHtml(hint)}</small></button>`;
  }

  function buildResearchBench(title, description) {
    return `<div class="source-board">
      ${source('Question', `What does ${title} need to become executable?`)}
      ${source('Sources', 'Web, local files, screenshots, current registry, prior decisions.')}
      ${source('Promotion', 'Finding -> capture packet -> review -> canonical memory.')}
      ${source('Contradictions', description)}
      ${source('Tool needs', 'Search, fetch, cite, compare, extract, promote.')}
      ${source('Shay role', 'Explain evidence, propose next action, wait for approval.')}
    </div>`;
  }

  function buildDeployBench(title, description) {
    return `<div class="deploy-board">
      <div>${deploy('Local', 'Editable and reversible. Launchd owns Studio.')} ${deploy('Staging', 'Proof required before production.')} ${deploy('Production', 'Hard-stop approval, DNS, rollback, secrets.')}</div>
      <div>${deploy(title, description)} ${deploy('Portability', 'Export pack, manifest, asset rights, environment notes.')}</div>
    </div>`;
  }

  function objectPanel(title) {
    return `<aside class="edge-panel left">
      <div class="panel-title"><span>Object</span><span>${titleCase(state.submode)}</span></div>
      <div class="object-meta">
        <div class="meta-line"><b>${escapeHtml(title)}</b><br>Selected work object</div>
        <div class="meta-line"><b>Parent</b><br>${escapeHtml(currentScope().title)}</div>
        <div class="meta-line"><b>Execution role</b><br>Make the parent more complete, provable, or revenue-ready.</div>
      </div>
    </aside>`;
  }

  function shayPanel(title) {
    return `<aside class="edge-panel right">
      <div class="panel-title"><span>Shay</span><span>${escapeHtml(title)}</span></div>
      <div class="shay-thread">
        <div class="shay-line"><b>Show Me</b><br>I can explain what this object is for and what it unlocks.</div>
        <div class="shay-line"><b>Propose</b><br>I can draft a scoped change with proof requirements.</div>
        <div class="shay-line"><b>Do It</b><br>I can execute after approval and route tools as needed.</div>
      </div>
    </aside>`;
  }

  function evidencePanel() {
    return `<aside class="edge-panel bottom">
      <div class="evidence-row">
        <div class="evidence-pill">Preview</div>
        <div class="evidence-pill">Meta</div>
        <div class="evidence-pill">Chat</div>
        <div class="evidence-pill">Proof</div>
      </div>
    </aside>`;
  }

  function renderTools(toolGroups) {
    const orderedGroups = orderedToolGroups(toolGroups);
    document.getElementById('tool-pods').innerHTML = orderedGroups.map(([group, tools], index) => (
      `<section class="tool-pod" draggable="true" data-tool-group="${escapeHtml(group)}" data-pod="${index}">
        <header><div><span class="tool-rank">Support ${index + 1}</span><h3>${escapeHtml(group)}</h3></div><span class="drag-handle" aria-label="Drag to reorder">::</span></header>
        <div class="tool-chip-row">${tools.map((tool) => `<button class="tool-chip" type="button">${escapeHtml(tool)}</button>`).join('')}</div>
      </section>`
    )).join('');
  }

  function orderedToolGroups(toolGroups) {
    const entries = Object.entries(toolGroups);
    const order = state.toolOrder[state.mode] || entries.map(([group]) => group);
    return entries.slice().sort((a, b) => {
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }

  function rememberToolOrder() {
    state.toolOrder[state.mode] = Array.from(document.querySelectorAll('.tool-pod')).map((pod) => pod.dataset.toolGroup);
    writeToolOrder(state.toolOrder);
  }

  function readToolOrder() {
    try {
      const raw = localStorage.getItem(TOOL_ORDER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function writeToolOrder(order) {
    try {
      localStorage.setItem(TOOL_ORDER_STORAGE_KEY, JSON.stringify(order || {}));
    } catch (_) {}
  }

  function renderConsole() {
    const entries = dynamicConsoleEntries(state.console);
    document.getElementById('console-body').innerHTML = entries.map(([level, message, time, color]) => (
      `<div class="log-row level-${color || 'blue'}">
        <span class="log-level">${escapeHtml(level)}</span>
        <span class="log-message">${escapeHtml(message)}</span>
        <span class="log-time">${escapeHtml(time)}</span>
      </div>`
    )).join('');
    syncActive('.console-tab', 'console', state.console);
  }

  function dynamicConsoleEntries(consoleKey) {
    const data = state.planData;
    if (!data) return logs[consoleKey] || logs.runs;
    if (consoleKey === 'runs') {
      return [[
        'RUN',
        `${data.current_run?.id || 'No run'} - ${data.current_run?.current_step || 'No current step'}`,
        data.current_run?.status || 'state',
        'blue'
      ]];
    }
    if (consoleKey === 'trace') {
      return [
        ['TRACE', `Workflow-as-data: ${data.summary?.workflow_as_data_status || 'unknown'}`, 'open', 'gold'],
        ['TRACE', `Pipeline visualizer: ${data.summary?.pipeline_visualizer_status || 'unknown'}`, 'open', 'cyan'],
        ['TRACE', 'Drive sync: complete, no active task carried forward.', 'done', 'green']
      ];
    }
    if (consoleKey === 'proof') {
      return [
        ['PROOF', `${data.summary?.proof_count || 0} proof records attached to the consolidated substrate.`, 'now', 'green'],
        ['PROOF', `${data.summary?.task_count || 0} task records visible to Plan mode.`, 'now', 'blue']
      ];
    }
    return logs[consoleKey] || logs.runs;
  }

  function node(title, copy, label) {
    return `<section class="mini-node"><div class="eyebrow">${escapeHtml(label)}</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></section>`;
  }

  function asset(label, title) {
    return `<section class="asset-tile"><div class="eyebrow">${escapeHtml(label)}</div><strong>${escapeHtml(title)}</strong></section>`;
  }

  function source(title, copy) {
    return `<section class="source-card"><div class="eyebrow">Research</div><b>${escapeHtml(title)}</b><p>${escapeHtml(copy)}</p></section>`;
  }

  function deploy(title, copy) {
    return `<section class="deploy-step"><div class="eyebrow">Environment</div><b>${escapeHtml(title)}</b><p>${escapeHtml(copy)}</p></section>`;
  }

  function syncActive(selector, dataKey, value) {
    document.querySelectorAll(selector).forEach((button) => {
      button.classList.toggle('active', button.dataset[dataKey] === value);
    });
  }

  function openModal(kind) {
    const modal = document.getElementById('wb-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const title = document.getElementById('modal-title');
    const eyebrow = document.getElementById('modal-eyebrow');
    const body = document.getElementById('modal-body');
    eyebrow.textContent = 'Workbench';
    if (kind === 'capabilities') {
      title.textContent = 'Capability Store';
      body.innerHTML = `<div class="modal-grid">${source('Brains', 'Model, cost, permissions, evidence, current state.')}${source('Tools', 'Search, media, deploy, filesystem, browser, proof.')}${source('Recipes', 'Reusable tool chains by workspace and object type.')}${source('Gates', 'Cost, destructive actions, deploy, secrets, canonical memory.')}</div>`;
    } else {
      title.textContent = 'Admin, Updates, Environments';
      body.innerHTML = `<div class="modal-grid">${deploy('Theme updates', 'Token packs and brand assets should propagate through a controlled update path.')}${deploy('Asset updates', 'Replace selected slot, all uses, fork variant, or new family.')}${deploy('Admin pages', 'Keys, domains, providers, queues, workers, approvals, portability.')}${deploy('Portability', 'Every site needs export pack, manifest, environment notes, and asset rights.')}</div>`;
    }
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('wb-modal').classList.add('hidden');
    document.getElementById('modal-backdrop').classList.add('hidden');
  }

  function titleCase(value) {
    return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.scope) setScope(target.dataset.scope);
    if (target.dataset.submode) setSubmode(target.dataset.submode);
    if (target.dataset.object) setSelected(target.dataset.object);
    if (target.dataset.mode) setMode(target.dataset.mode);
    if (target.dataset.console) {
      state.console = target.dataset.console;
      renderConsole();
    }
    if (target.dataset.action === 'toggle-nav') document.getElementById('wb-shell').classList.toggle('nav-collapsed');
    if (target.dataset.action === 'toggle-tools') document.getElementById('wb-shell').classList.toggle('tools-collapsed');
    if (target.dataset.action === 'toggle-console') document.getElementById('wb-shell').classList.toggle('console-collapsed');
    if (target.dataset.action === 'cycle-theme') {
      state.themeIndex = (state.themeIndex + 1) % themes.length;
      document.body.dataset.theme = themes[state.themeIndex];
    }
    if (target.dataset.action === 'open-capabilities') openModal('capabilities');
    if (target.dataset.action === 'open-admin') openModal('admin');
    if (target.dataset.action === 'close-modal') closeModal();
    if (target.dataset.action === 'focus-shay') {
      setMode('build');
      state.console = 'trace';
      render();
    }
  });

  let draggingPod = null;
  document.addEventListener('dragstart', (event) => {
    const pod = event.target.closest('.tool-pod');
    if (!pod) return;
    draggingPod = pod;
    pod.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragend', () => {
    if (draggingPod) draggingPod.classList.remove('dragging');
    rememberToolOrder();
    draggingPod = null;
  });

  document.addEventListener('dragover', (event) => {
    const pod = event.target.closest('.tool-pod');
    const shelf = document.getElementById('tool-pods');
    if (!pod || !draggingPod || pod === draggingPod) return;
    event.preventDefault();
    const rect = pod.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    shelf.insertBefore(draggingPod, after ? pod.nextSibling : pod);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  async function loadPlanData() {
    try {
      const response = await fetch('data/workbench-plan-state.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Plan state ${response.status}`);
      state.planData = await response.json();
      state.planDataError = null;
      render();
    } catch (error) {
      state.planDataError = error.message || 'Plan state unavailable';
      render();
    }
  }

  render();
  loadPlanData();
})();
