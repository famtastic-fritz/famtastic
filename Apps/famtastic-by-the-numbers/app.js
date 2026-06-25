const PYTHAGOREAN_MAP = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

const NUMBER_MEANINGS = {
  1: { title: 'Initiator', summary: 'You move first. You are meant to act, name things, and create momentum.', strengths: ['independence', 'leadership', 'will'], tensions: ['isolation', 'stubbornness'], guidance: ['start the thing', 'lead without hardening'] },
  2: { title: 'Harmonizer', summary: 'You read the room deeply and are built for connection, nuance, and cooperation.', strengths: ['sensitivity', 'partnership', 'diplomacy'], tensions: ['over-accommodation', 'hesitation'], guidance: ['tell the truth early', 'choose peace without self-erasure'] },
  3: { title: 'Expressor', summary: 'Your path is voice, creativity, feeling, and visible self-expression.', strengths: ['communication', 'joy', 'imagination'], tensions: ['scattered focus', 'avoidance'], guidance: ['ship the expression', 'turn emotion into form'] },
  4: { title: 'Builder', summary: 'You are here to make things real, stable, and useful.', strengths: ['discipline', 'structure', 'reliability'], tensions: ['rigidity', 'overwork'], guidance: ['build patiently', 'leave room for breath'] },
  5: { title: 'Catalyst', summary: 'You are built for movement, change, adaptation, and freedom.', strengths: ['versatility', 'curiosity', 'courage'], tensions: ['restlessness', 'impulse'], guidance: ['use freedom with intention', 'move without scattering'] },
  6: { title: 'Steward', summary: 'You carry responsibility, care, beauty, and repair.', strengths: ['nurture', 'service', 'devotion'], tensions: ['martyrdom', 'control'], guidance: ['care without carrying everybody', 'make home in yourself too'] },
  7: { title: 'Seeker', summary: 'You are built for inner work, truth seeking, pattern reading, and sacred depth.', strengths: ['insight', 'analysis', 'spiritual sensitivity'], tensions: ['withdrawal', 'distrust'], guidance: ['share what you know', 'let depth become clarity'] },
  8: { title: 'Executive force', summary: 'You are here to work with power, material results, and command.', strengths: ['authority', 'focus', 'execution'], tensions: ['hardness', 'control obsession'], guidance: ['use power cleanly', 'win without losing your soul'] },
  9: { title: 'Humanitarian', summary: 'You are built for breadth, compassion, closure, and meaning beyond self.', strengths: ['vision', 'empathy', 'wisdom'], tensions: ['drain', 'overextension'], guidance: ['serve with boundaries', 'let endings teach you'] },
  11: { title: 'Messenger', summary: 'You carry intensified intuition, nervous sensitivity, and illumination pressure.', strengths: ['vision', 'inspiration', 'higher sensitivity'], tensions: ['overwhelm', 'anxiety'], guidance: ['ground the insight', 'protect your instrument'] },
  22: { title: 'Master builder', summary: 'You are wired to turn vision into large real-world structure.', strengths: ['scale', 'strategy', 'manifestation'], tensions: ['pressure', 'collapse under burden'], guidance: ['build big slowly', 'respect your nervous system'] },
  33: { title: 'Teacher-healer', summary: 'You carry amplified care, guidance, and heart-led service.', strengths: ['compassion', 'uplift', 'devotional leadership'], tensions: ['self-sacrifice', 'emotional overload'], guidance: ['serve cleanly', 'teach from embodiment'] },
};

const PERSONAL_YEAR_COPY = {
  1: { focus: 'fresh start', opportunities: ['begin boldly', 'name a new direction'], cautions: ['forcing speed', 'ego collisions'], reflection: 'Where do I need to move first instead of waiting?' },
  2: { focus: 'relationship and patience', opportunities: ['build trust', 'listen beneath the words'], cautions: ['passivity', 'avoiding directness'], reflection: 'Where does slowness help me hear better?' },
  3: { focus: 'expression and visibility', opportunities: ['share your voice', 'make the work more alive'], cautions: ['scattering energy', 'performing instead of revealing'], reflection: 'What wants to be said honestly?' },
  4: { focus: 'structure and discipline', opportunities: ['stabilize foundations', 'commit to systems'], cautions: ['becoming brittle', 'mistaking grind for progress'], reflection: 'What structure would actually support me?' },
  5: { focus: 'change and movement', opportunities: ['pivot cleanly', 'try the new path'], cautions: ['chaotic decisions', 'burning bridges carelessly'], reflection: 'What freedom is real and what is just reaction?' },
  6: { focus: 'care and responsibility', opportunities: ['repair what matters', 'lead with devotion'], cautions: ['carrying too much', 'fixing people who did not ask'], reflection: 'What deserves care without consuming me?' },
  7: { focus: 'inner work and study', opportunities: ['go deeper', 'observe patterns'], cautions: ['isolation', 'paralysis through over-analysis'], reflection: 'What truth gets louder when I get quiet?' },
  8: { focus: 'power and results', opportunities: ['claim authority', 'push the material world forward'], cautions: ['hardness', 'power struggles'], reflection: 'How do I use power without becoming owned by it?' },
  9: { focus: 'closure and release', opportunities: ['finish well', 'see the larger lesson'], cautions: ['sentimental clinging', 'trying to rescue everything'], reflection: 'What ending is asking for grace?' },
  11: { focus: 'heightened intuition', opportunities: ['follow clean signals', 'name subtle truth'], cautions: ['overstimulation', 'romanticizing confusion'], reflection: 'What insight needs grounding?' },
  22: { focus: 'large-scale building', opportunities: ['organize the vision', 'make the impossible practical'], cautions: ['pressure implosion', 'skipping the foundations'], reflection: 'What giant thing becomes real if I respect the process?' },
  33: { focus: 'healing and service', opportunities: ['teach from lived truth', 'care with clarity'], cautions: ['martyr patterns', 'emotional flooding'], reflection: 'How do I serve without disappearing?' },
};

const form = document.getElementById('chartForm');
const resultsArea = document.getElementById('resultsArea');
const saveChartButton = document.getElementById('saveChart');
const shareChartButton = document.getElementById('shareChart');
const unlockPremiumButton = document.getElementById('unlockPremium');
const restorePremiumButton = document.getElementById('restorePremium');
const purchaseStatus = document.getElementById('purchaseStatus');
const premiumLocked = document.getElementById('premiumLocked');
const premiumExperience = document.getElementById('premiumExperience');

let runtimeConfig = {
  premium: {
    ctaLabel: 'Unlock premium for $22',
    headline: 'Unlock the deeper read',
    subhead: 'One-time activation. Durable unlock. Editable surfaces.',
    priceCents: 2200,
    currency: 'USD',
  },
};
let lastChart = null;
let premiumUnlocked = false;

function sanitizeName(name) {
  return (name || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function reduceNumber(value, preserveMasters = true, steps = []) {
  let current = value;
  while (current > 9) {
    if (preserveMasters && [11, 22, 33].includes(current)) return current;
    const digits = String(current).split('').map(Number);
    const next = digits.reduce((sum, n) => sum + n, 0);
    steps.push({ values: digits, subtotal: current, reducedTo: next });
    current = next;
  }
  return current;
}

function calculateLifePath(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const monthSteps = [];
  const daySteps = [];
  const yearSteps = [];
  const totalSteps = [];
  const monthReduced = reduceNumber(month, true, monthSteps);
  const dayReduced = reduceNumber(day, true, daySteps);
  const yearReduced = reduceNumber(String(year).split('').map(Number).reduce((sum, n) => sum + n, 0), true, yearSteps);
  const total = monthReduced + dayReduced + yearReduced;
  const finalValue = reduceNumber(total, true, totalSteps);
  return {
    rawTotal: total,
    reducedValue: finalValue,
    calculationSteps: [
      { label: 'Month', source: String(month), values: [month], subtotal: month, reducedTo: monthReduced, note: monthSteps.map(step => `${step.subtotal}→${step.reducedTo}`).join(', ') || null },
      { label: 'Day', source: String(day), values: [day], subtotal: day, reducedTo: dayReduced, note: daySteps.map(step => `${step.subtotal}→${step.reducedTo}`).join(', ') || null },
      { label: 'Year', source: String(year), values: String(year).split('').map(Number), subtotal: String(year).split('').map(Number).reduce((sum, n) => sum + n, 0), reducedTo: yearReduced, note: yearSteps.map(step => `${step.subtotal}→${step.reducedTo}`).join(', ') || null },
      { label: 'Total', source: `${monthReduced}+${dayReduced}+${yearReduced}`, values: [monthReduced, dayReduced, yearReduced], subtotal: total, reducedTo: finalValue, note: totalSteps.map(step => `${step.subtotal}→${step.reducedTo}`).join(', ') || null },
    ],
  };
}

function lettersToValues(name, mode = 'all') {
  const clean = sanitizeName(name);
  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  return clean.split('').filter(char => char !== ' ').filter(char => {
    if (mode === 'vowels') return vowels.has(char);
    if (mode === 'consonants') return !vowels.has(char);
    return true;
  }).map(char => ({ char, value: PYTHAGOREAN_MAP[char] || 0 }));
}

function calculateNameNumber(name, mode) {
  const values = lettersToValues(name, mode);
  const rawTotal = values.reduce((sum, entry) => sum + entry.value, 0);
  const reductionSteps = [];
  const reducedValue = reduceNumber(rawTotal, true, reductionSteps);
  return {
    rawTotal,
    reducedValue,
    letters: values,
    calculationSteps: [
      {
        label: 'Letter values',
        source: sanitizeName(name),
        values: values.map(entry => entry.value),
        subtotal: rawTotal,
        reducedTo: reducedValue,
        note: reductionSteps.map(step => `${step.subtotal}→${step.reducedTo}`).join(', ') || null,
      },
    ],
  };
}

function calculateBirthdayNumber(dateString) {
  const day = Number(dateString.split('-')[2]);
  return { rawTotal: day, reducedValue: reduceNumber(day, false, []), calculationSteps: [{ label: 'Birthday day', source: String(day), values: [day], subtotal: day, reducedTo: reduceNumber(day, false, []), note: null }] };
}

function calculatePersonalYear(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const currentYear = new Date().getFullYear();
  const monthReduced = reduceNumber(month, false, []);
  const dayReduced = reduceNumber(day, false, []);
  const currentYearReduced = reduceNumber(String(currentYear).split('').map(Number).reduce((sum, n) => sum + n, 0), false, []);
  const total = monthReduced + dayReduced + currentYearReduced;
  const finalValue = reduceNumber(total, true, []);
  return {
    rawTotal: total,
    reducedValue: finalValue,
    calculationSteps: [
      { label: 'Birth month', source: String(month), values: [month], subtotal: month, reducedTo: monthReduced, note: null },
      { label: 'Birth day', source: String(day), values: [day], subtotal: day, reducedTo: dayReduced, note: null },
      { label: 'Current year', source: String(currentYear), values: String(currentYear).split('').map(Number), subtotal: String(currentYear).split('').map(Number).reduce((sum, n) => sum + n, 0), reducedTo: currentYearReduced, note: null },
      { label: 'Total', source: `${monthReduced}+${dayReduced}+${currentYearReduced}`, values: [monthReduced, dayReduced, currentYearReduced], subtotal: total, reducedTo: finalValue, note: null },
    ],
  };
}

function buildNumberRecord(label, result) {
  const meaning = NUMBER_MEANINGS[result.reducedValue] || NUMBER_MEANINGS[reduceNumber(result.reducedValue, false, [])];
  return {
    label,
    rawTotal: result.rawTotal,
    reducedValue: result.reducedValue,
    isMaster: [11, 22, 33].includes(result.reducedValue),
    masterValue: [11, 22, 33].includes(result.reducedValue) ? result.reducedValue : null,
    summary: meaning.summary,
    strengths: meaning.strengths,
    tensions: meaning.tensions,
    guidance: meaning.guidance,
    calculationSteps: result.calculationSteps,
    title: meaning.title,
  };
}

function calculatePatternMap(name) {
  const values = lettersToValues(name, 'all');
  const counts = new Map();
  values.forEach(({ value }) => counts.set(value, (counts.get(value) || 0) + 1));
  const repeated = [...counts.entries()].filter(([, count]) => count > 1).map(([number, count]) => ({ number, count }));
  const missing = Array.from({ length: 9 }, (_, index) => index + 1).filter(num => !counts.has(num));
  let summary = 'Your name carries a mixed spread of values.';
  if (repeated.length) summary = `Repeated numbers suggest emphasized themes: ${repeated.map(item => `${item.number}×${item.count}`).join(', ')}.`;
  if (missing.length) summary += ` Missing numbers may mark growth edges: ${missing.join(', ')}.`;
  return { repeated, missing, summary };
}

function calculateCompatibility(primaryCoreNumbers, partnerCoreNumbers) {
  if (!partnerCoreNumbers) {
    return {
      supported: false,
      headline: 'Add a partner name and birth date to generate a compatibility read.',
      themes: [],
      strengths: [],
      friction: [],
      guidance: [],
      score: null,
    };
  }

  const primaryLifePath = primaryCoreNumbers.lifePath.reducedValue;
  const partnerLifePath = partnerCoreNumbers.lifePath.reducedValue;
  const primaryExpression = primaryCoreNumbers.expression.reducedValue;
  const partnerExpression = partnerCoreNumbers.expression.reducedValue;
  const primarySoulUrge = primaryCoreNumbers.soulUrge.reducedValue;
  const partnerSoulUrge = partnerCoreNumbers.soulUrge.reducedValue;
  const primaryPersonality = primaryCoreNumbers.personality.reducedValue;
  const partnerPersonality = partnerCoreNumbers.personality.reducedValue;

  let score = 0;
  const themes = [];
  const strengths = [];
  const friction = [];
  const guidance = [];

  if (primaryLifePath === partnerLifePath) {
    score += 3;
    themes.push(`Shared Life Path ${primaryLifePath}`);
    strengths.push('natural recognition of each other’s direction');
  } else {
    const diff = Math.abs(primaryLifePath - partnerLifePath);
    if ([1, 2].includes(diff)) {
      score += 2;
      themes.push(`Adjacent Life Paths ${primaryLifePath} and ${partnerLifePath}`);
      strengths.push('compatible pacing with enough difference to stay alive');
    } else {
      score -= 1;
      friction.push('different life pacing and mission pressure');
    }
  }

  if (primaryExpression === partnerExpression) {
    score += 2;
    strengths.push('similar communication style and outer expression');
  } else {
    friction.push('different expression styles can create tone mismatches');
  }

  if (primarySoulUrge === partnerSoulUrge) {
    score += 2;
    strengths.push('shared inner motivations and emotional hunger');
  } else {
    friction.push('different emotional needs underneath the surface');
  }

  if (primaryPersonality === partnerPersonality) {
    score += 1;
    strengths.push('similar first-impression energy');
  } else {
    friction.push('the way each person presents can trigger misreads');
  }

  themes.push(`Expression ${primaryExpression}/${partnerExpression}`);
  themes.push(`Soul Urge ${primarySoulUrge}/${partnerSoulUrge}`);

  if (score >= 5) {
    guidance.push('protect the bond from autopilot — chemistry still needs truth.');
    guidance.push('use the ease between you to build something real, not just feel seen.');
  } else if (score >= 2) {
    guidance.push('this pairing can work well if both people translate instead of assume.');
    guidance.push('say the quiet part sooner; hidden expectations become friction fast.');
  } else {
    guidance.push('treat differences as a language gap, not proof of incompatibility.');
    guidance.push('build explicit rituals for repair, pacing, and emotional translation.');
  }

  return {
    supported: true,
    headline: score >= 5
      ? 'This pairing has strong recognition points and real build potential.'
      : score >= 2
        ? 'This pairing has workable chemistry, but it needs conscious translation.'
        : 'This pairing can still work, but it will demand maturity, timing, and explicit communication.',
    themes,
    strengths,
    friction,
    guidance,
    score,
  };
}

function buildDailyGuidance(personalYearValue) {
  const today = new Date();
  const dayEnergy = reduceNumber(today.getDate() + personalYearValue, false, []);
  const meaning = NUMBER_MEANINGS[dayEnergy] || NUMBER_MEANINGS[reduceNumber(dayEnergy, false, [])];
  return {
    date: today.toISOString().slice(0, 10),
    energyNumber: dayEnergy,
    headline: `${meaning.title} day`,
    reflection: meaning.guidance[0],
    doMoreOf: meaning.strengths,
    watchFor: meaning.tensions,
  };
}

function buildPremiumExperience(chart) {
  const { lifePath, expression, soulUrge, personality, personalYear } = chart.chart.coreNumbers;
  const partnerName = chart.user.partnerName ? chart.user.partnerName : 'your partner';
  return {
    profile: {
      headline: `Your pattern deepens where Life Path ${lifePath.reducedValue} meets ${expression.title.toLowerCase()} expression.`,
      bullets: [
        `Gift stack: ${lifePath.strengths[0]}, ${expression.strengths[0]}, ${soulUrge.strengths[0]}.`,
        `Growth edge: when ${personality.tensions[0]} teams up with ${lifePath.tensions[0]}, you can hide power inside over-control.`,
        `Practical move: ${expression.guidance[0]}. Then ${soulUrge.guidance[0]}.`,
      ],
    },
    compatibility: chart.compatibility.supported ? {
      headline: `You and ${partnerName} need a deeper translation layer than the teaser can hold.`,
      bullets: [
        `Recognition point: ${chart.compatibility.strengths[0]}.`,
        `Main friction: ${chart.compatibility.friction[0]}.`,
        `Repair guidance: ${chart.compatibility.guidance[0]}. Add explicit check-ins when tension rises.`,
      ],
    } : {
      headline: 'Premium compatibility opens after you include partner details.',
      bullets: [
        'Add partner birth date to generate the deeper comparison.',
        'The premium layer expands beyond Life Path-only patterning.',
        'Expression, Soul Urge, and pacing notes belong here next.',
      ],
    },
    yearMap: {
      headline: `Personal Year ${personalYear.reducedValue} wants more than a teaser.`,
      bullets: [
        `Primary focus: ${PERSONAL_YEAR_COPY[personalYear.reducedValue]?.focus || 'pattern recognition'}.`,
        `Best move now: ${PERSONAL_YEAR_COPY[personalYear.reducedValue]?.opportunities?.[0] || 'move with clarity'}.`,
        `Watch for drift: ${PERSONAL_YEAR_COPY[personalYear.reducedValue]?.cautions?.[0] || 'avoid self-betrayal'}.`,
      ],
    },
  };
}

function renderBulletCard(targetId, payload) {
  document.getElementById(targetId).innerHTML = `
    <p><strong>${payload.headline}</strong></p>
    <ul>
      ${payload.bullets.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `;
}

function renderChart(chart) {
  resultsArea.classList.remove('hidden');
  document.getElementById('reportTitle').textContent = `${chart.user.fullName.split(' ')[0]}'s chart`;
  document.getElementById('reportSummary').textContent = chart.report.heroSummary;
  document.getElementById('coreNumbers').innerHTML = Object.values(chart.chart.coreNumbers).map(record => `
    <article class="number-card">
      <h3>${record.label}</h3>
      <div class="number-value">${record.reducedValue}</div>
      <strong>${record.title}</strong>
      <p>${record.summary}</p>
      <ul>
        <li><strong>Strengths:</strong> ${record.strengths.join(', ')}</li>
        <li><strong>Tensions:</strong> ${record.tensions.join(', ')}</li>
        <li><strong>Guidance:</strong> ${record.guidance.join(', ')}</li>
      </ul>
    </article>
  `).join('');

  document.getElementById('patternMap').innerHTML = `
    <article class="info-card">
      <h3>Dominant repeats</h3>
      <p>${chart.patterns.summary}</p>
      <ul>
        <li><strong>Repeated:</strong> ${chart.patterns.repeated.length ? chart.patterns.repeated.map(item => `${item.number}×${item.count}`).join(', ') : 'none'}</li>
        <li><strong>Missing:</strong> ${chart.patterns.missing.length ? chart.patterns.missing.join(', ') : 'none'}</li>
      </ul>
    </article>
  `;

  const cycle = chart.cycles.personalYear;
  const cycleCopy = PERSONAL_YEAR_COPY[cycle.reducedValue] || PERSONAL_YEAR_COPY[reduceNumber(cycle.reducedValue, false, [])];
  document.getElementById('cycleInsight').innerHTML = `
    <article class="info-card">
      <h3>Personal Year ${cycle.reducedValue}</h3>
      <p><strong>Focus:</strong> ${cycleCopy.focus}</p>
      <ul>
        <li><strong>Opportunities:</strong> ${cycleCopy.opportunities.join(', ')}</li>
        <li><strong>Cautions:</strong> ${cycleCopy.cautions.join(', ')}</li>
      </ul>
      <p><strong>Reflection:</strong> ${cycleCopy.reflection}</p>
    </article>
  `;

  document.getElementById('dailyGuidance').innerHTML = `
    <article class="info-card">
      <h3>${chart.dailyGuidance.headline}</h3>
      <p>${chart.dailyGuidance.reflection}</p>
      <ul>
        <li><strong>Do more of:</strong> ${chart.dailyGuidance.doMoreOf.join(', ')}</li>
        <li><strong>Watch for:</strong> ${chart.dailyGuidance.watchFor.join(', ')}</li>
      </ul>
    </article>
  `;

  document.getElementById('mathBreakdown').innerHTML = Object.values(chart.chart.coreNumbers).map(record => `
    <div class="math-item">
      <h3>${record.label}</h3>
      ${record.calculationSteps.map(step => `
        <p><strong>${step.label}:</strong> ${step.source} → [${step.values.join(', ')}] → ${step.subtotal} → ${step.reducedTo}${step.note ? ` (${step.note})` : ''}</p>
      `).join('')}
    </div>
  `).join('');

  document.getElementById('compatibilityResult').innerHTML = `
    <article class="info-card">
      <h3>${chart.compatibility.headline}</h3>
      <ul>
        <li><strong>Themes:</strong> ${chart.compatibility.themes.length ? chart.compatibility.themes.join(', ') : 'Add partner details to unlock this section.'}</li>
        <li><strong>Strengths:</strong> ${chart.compatibility.strengths.length ? chart.compatibility.strengths.join(', ') : 'n/a'}</li>
        <li><strong>Friction:</strong> ${chart.compatibility.friction.length ? chart.compatibility.friction.join(', ') : 'n/a'}</li>
        <li><strong>Guidance:</strong> ${chart.compatibility.guidance.length ? chart.compatibility.guidance.join(', ') : 'n/a'}</li>
      </ul>
    </article>
  `;

  renderPremiumState();
}

function renderPremiumState() {
  if (!lastChart) return;
  const premium = buildPremiumExperience(lastChart);
  renderBulletCard('premiumProfile', premium.profile);
  renderBulletCard('premiumCompatibility', premium.compatibility);
  renderBulletCard('premiumYearMap', premium.yearMap);

  premiumLocked.classList.toggle('hidden', premiumUnlocked);
  premiumExperience.classList.toggle('hidden', !premiumUnlocked);
}

function generateChart(fullName, birthDate, email, partnerName, partnerBirthDate) {
  const lifePath = buildNumberRecord('Life Path', calculateLifePath(birthDate));
  const expression = buildNumberRecord('Expression', calculateNameNumber(fullName, 'all'));
  const soulUrge = buildNumberRecord('Soul Urge', calculateNameNumber(fullName, 'vowels'));
  const personality = buildNumberRecord('Personality', calculateNameNumber(fullName, 'consonants'));
  const birthday = buildNumberRecord('Birthday', calculateBirthdayNumber(birthDate));
  const personalYear = buildNumberRecord('Personal Year', calculatePersonalYear(birthDate));

  const partnerCoreNumbers = partnerBirthDate && partnerName
    ? {
        lifePath: buildNumberRecord('Partner Life Path', calculateLifePath(partnerBirthDate)),
        expression: buildNumberRecord('Partner Expression', calculateNameNumber(partnerName, 'all')),
        soulUrge: buildNumberRecord('Partner Soul Urge', calculateNameNumber(partnerName, 'vowels')),
        personality: buildNumberRecord('Partner Personality', calculateNameNumber(partnerName, 'consonants')),
      }
    : null;
  const compatibility = calculateCompatibility({ lifePath, expression, soulUrge, personality }, partnerCoreNumbers);
  const patterns = calculatePatternMap(fullName);
  const dailyGuidance = buildDailyGuidance(personalYear.reducedValue);

  return {
    user: { fullName, birthDate, email, partnerName, partnerBirthDate },
    lineage: { systemId: 'pythagorean-western', systemLabel: 'Pythagorean / modern Western numerology', masterNumbers: [11, 22, 33], yHandlingRule: 'Y is treated as a consonant in V1.' },
    chart: { coreNumbers: { lifePath, expression, soulUrge, personality, birthday, personalYear } },
    patterns,
    cycles: { personalYear },
    compatibility,
    partnerChart: partnerCoreNumbers ? { coreNumbers: partnerCoreNumbers } : null,
    dailyGuidance,
    report: {
      heroTitle: `${fullName.split(' ')[0]}'s recognition read`,
      heroSummary: `Your chart points to a Life Path ${lifePath.reducedValue} with ${expression.title.toLowerCase()} energy in the way your name moves through the world. The point is not to box you in. The point is to show the pattern cleanly enough that you can work with yourself instead of against yourself.`,
    },
    trust: {
      disclaimerShort: 'Reflection tool only. Not medical, legal, or financial advice.',
      sourceTransparencyNote: 'V1 uses a named Pythagorean numerology system and shows the math directly.',
    },
    provenance: {
      generatedAt: new Date().toISOString(),
      formulaVersion: 'v1-pythagorean-2026-06-24',
    },
  };
}

function setStatus(message, kind = 'info') {
  purchaseStatus.textContent = message;
  purchaseStatus.className = `status-banner ${kind}`;
  purchaseStatus.classList.remove('hidden');
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return;
    runtimeConfig = await response.json();
    document.getElementById('premiumHeadline').textContent = runtimeConfig.premium.headline;
    document.getElementById('premiumSubhead').textContent = runtimeConfig.premium.subhead;
    unlockPremiumButton.textContent = runtimeConfig.premium.ctaLabel;
  } catch {
    // keep defaults
  }
}

async function checkPurchaseStatus(email) {
  if (!email) return;
  try {
    const response = await fetch(`/api/purchase/status?email=${encodeURIComponent(email)}`);
    if (!response.ok) return;
    const data = await response.json();
    premiumUnlocked = Boolean(data.unlocked);
    renderPremiumState();
    if (premiumUnlocked) {
      setStatus(`Premium already active for ${email}.`, 'success');
    }
  } catch {
    // non-blocking
  }
}

async function finalizePremiumCapture(paypalOrderId, emailOverride = '') {
  const email = emailOverride || lastChart?.user?.email || '';
  const captureResponse = await fetch('/api/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paypalOrderId }),
  });
  const captureData = await captureResponse.json();
  if (!captureResponse.ok) throw new Error(captureData.error || 'Failed to capture order');
  premiumUnlocked = true;
  pendingPayPalOrderId = null;
  try { localStorage.removeItem('famtastic-by-the-numbers:pending-order-id'); } catch {}
  renderPremiumState();
  setStatus(`Premium unlocked for ${email || 'this email'}. PayPal order: ${captureData.paypalOrderId}`, 'success');
  return captureData;
}

async function unlockPremium() {
  if (!lastChart) {
    setStatus('Generate the chart first so the premium purchase has the right context.', 'error');
    return;
  }
  const email = lastChart.user.email;
  if (!email) {
    setStatus('Email is required for premium unlock and restore.', 'error');
    return;
  }

  try {
    setStatus('Creating your PayPal order…', 'info');
    const createResponse = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        chartInput: lastChart.user,
      }),
    });
    const createData = await createResponse.json();
    if (!createResponse.ok) throw new Error(createData.error || 'Failed to create order');

    pendingPayPalOrderId = createData.paypalOrderId;
    try { localStorage.setItem('famtastic-by-the-numbers:pending-order-id', pendingPayPalOrderId); } catch {}

    const paymentMode = createData.paymentMode || runtimeConfig.paymentMode || 'configured';
    if (paymentMode !== 'mock' && createData.approvalUrl) {
      setStatus('Redirecting you to PayPal for approval…', 'info');
      window.location.assign(createData.approvalUrl);
      return;
    }

    setStatus(`Order created in ${paymentMode} mode. Capturing now…`, 'info');
    await finalizePremiumCapture(createData.paypalOrderId, email);
  } catch (error) {
    setStatus(error.message || 'Premium unlock failed.', 'error');
  }
}

async function restorePurchase() {
  const email = lastChart?.user?.email || String(new FormData(form).get('email') || '').trim();
  if (!email) {
    setStatus('Enter the email tied to your purchase, then try restore again.', 'error');
    return;
  }
  try {
    const response = await fetch('/api/purchase/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Restore failed');
    premiumUnlocked = true;
    renderPremiumState();
    setStatus(`Premium restored for ${email}.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Restore failed.', 'error');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(form);
  const fullName = String(formData.get('fullName') || '').trim();
  const birthDate = String(formData.get('birthDate') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const partnerName = String(formData.get('partnerName') || '').trim();
  const partnerBirthDate = String(formData.get('partnerBirthDate') || '').trim();
  if (!fullName || !birthDate || !email) return;
  lastChart = generateChart(fullName, birthDate, email, partnerName, partnerBirthDate);
  localStorage.setItem('famtastic-by-the-numbers:last-chart', JSON.stringify(lastChart));
  premiumUnlocked = false;
  renderChart(lastChart);
  checkPurchaseStatus(email);
});

saveChartButton.addEventListener('click', () => {
  if (!lastChart) return;
  localStorage.setItem('famtastic-by-the-numbers:last-chart', JSON.stringify(lastChart));
  alert('Chart saved locally on this device.');
});

shareChartButton.addEventListener('click', async () => {
  if (!lastChart) return;
  const { lifePath, expression, personalYear } = lastChart.chart.coreNumbers;
  const text = `FAMtastic By the Numbers\n${lastChart.user.fullName}\nLife Path: ${lifePath.reducedValue}\nExpression: ${expression.reducedValue}\nPersonal Year: ${personalYear.reducedValue}\n${lastChart.report.heroSummary}`;
  try {
    await navigator.clipboard.writeText(text);
    alert('Summary copied.');
  } catch {
    alert('Clipboard copy failed in this browser.');
  }
});

unlockPremiumButton.addEventListener('click', unlockPremium);
restorePremiumButton.addEventListener('click', restorePurchase);

async function handlePayPalReturn() {
  const params = new URLSearchParams(window.location.search);
  const paypalReturn = params.get('paypalReturn');
  const paypalCancel = params.get('paypalCancel');
  const token = params.get('token') || pendingPayPalOrderId || localStorage.getItem('famtastic-by-the-numbers:pending-order-id') || '';

  if (paypalCancel) {
    setStatus('PayPal approval was canceled before capture.', 'info');
    params.delete('paypalCancel');
    params.delete('token');
    params.delete('PayerID');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', next);
    return;
  }

  if (!paypalReturn || !token) return;
  if (!lastChart?.user?.email) {
    setStatus('Return from PayPal detected, but chart context is missing. Regenerate the chart, then restore if needed.', 'error');
    return;
  }
  try {
    setStatus('PayPal approval received. Finalizing your premium unlock…', 'info');
    await finalizePremiumCapture(token, lastChart.user.email);
    params.delete('paypalReturn');
    params.delete('token');
    params.delete('PayerID');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', next);
  } catch (error) {
    setStatus(error.message || 'PayPal return capture failed.', 'error');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadRuntimeConfig();
  const saved = localStorage.getItem('famtastic-by-the-numbers:last-chart');
  pendingPayPalOrderId = localStorage.getItem('famtastic-by-the-numbers:pending-order-id') || null;
  if (!saved) {
    await handlePayPalReturn();
    return;
  }
  try {
    lastChart = JSON.parse(saved);
    renderChart(lastChart);
    if (lastChart.user?.email) checkPurchaseStatus(lastChart.user.email);
    await handlePayPalReturn();
  } catch {
    localStorage.removeItem('famtastic-by-the-numbers:last-chart');
  }
});
