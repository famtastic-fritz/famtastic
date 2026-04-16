'use strict';
/**
 * Client Interview System — Phase 3
 *
 * Captures structured client input before first build via a short Q&A session.
 * Answers are persisted to spec.json as interview_state during the session and
 * promoted to client_brief + interview_completed:true on completion.
 *
 * Modes:
 *   quick    — 5 high-signal questions (default)
 *   detailed — 10 questions with brand/tone depth
 *   skip     — immediate completion, empty brief
 */

// Revenue model options surfaced as suggestion chips in the Studio UI
const REVENUE_MODEL_OPTIONS = [
  { value: 'not_sure', label: "Not sure yet" },
  { value: 'reservations', label: "Reservations / ticket fees" },
  { value: 'lead_gen', label: "Lead generation for a business" },
  { value: 'rank_and_rent', label: "Rank and rent (lease to local business)" },
  { value: 'affiliate', label: "Affiliate / ad revenue" },
  { value: 'ecommerce', label: "E-commerce / products" },
  { value: 'stub', label: "I'll add monetization later" },
];

const QUICK_QUESTIONS = [
  {
    id: 'q_business',
    text: 'In one or two sentences, what does your business do and who do you serve?',
    field: 'business_description',
    required: true,
  },
  {
    id: 'q_revenue',
    text: "How do you want this site to make money? (It's fine if you don't know yet — pick the closest option or describe it)",
    field: 'revenue_model',
    required: false,
    suggestion_chips: REVENUE_MODEL_OPTIONS,
    follow_up_map: {
      rank_and_rent: 'What area and niche? (e.g. "plumber in Phoenix") — we will add a call tracking slot and lead form.',
      reservations: 'What platform do you use for reservations? (OpenTable, Eventbrite, custom, etc.) — we will add the right integration slot.',
      lead_gen: 'What business will receive these leads? What service? — we will wire the form to route leads to them.',
      ecommerce: 'What are you selling and what is your price range? — we will add the right cart/checkout integration.',
    },
  },
  {
    id: 'q_customer',
    text: 'Who is your ideal customer? (age, location, needs, lifestyle — be as specific as you can)',
    field: 'ideal_customer',
    required: true,
  },
  {
    id: 'q_differentiator',
    text: "What makes you different from your competitors? What's your unfair advantage?",
    field: 'differentiator',
    required: true,
  },
  {
    id: 'q_cta',
    text: "What's the single most important action you want a visitor to take on your site? (book, call, buy, etc.)",
    field: 'primary_cta',
    required: true,
  },
  {
    id: 'q_style',
    text: 'Any specific colors, vibe, or brands you love the look of? Any style or tone you definitely want to avoid?',
    field: 'style_notes',
    required: false,
  },
];

const DETAILED_QUESTIONS = [
  ...QUICK_QUESTIONS,
  {
    id: 'q_services',
    text: 'List your top 3–5 services or products with a one-line description of each.',
    field: 'services',
    required: true,
  },
  {
    id: 'q_proof',
    text: 'Do you have any testimonials, reviews, awards, or social proof you want featured?',
    field: 'social_proof',
    required: false,
  },
  {
    id: 'q_geography',
    text: 'What geographic area do you serve? (city, region, nationwide, online-only)',
    field: 'geography',
    required: false,
  },
  {
    id: 'q_urgency',
    text: 'Is there a seasonal hook, promotion, or time-sensitive offer happening right now?',
    field: 'urgency_hook',
    required: false,
  },
  {
    id: 'q_contact',
    text: 'How should people contact you? (phone, email, booking link, form — list what you want on the site)',
    field: 'contact_methods',
    required: true,
  },
];

/**
 * Start a new interview session.
 *
 * @param {string} mode - 'quick' | 'detailed' | 'skip'
 * @returns {{ state: object, firstQuestion: object|null }}
 */
function startInterview(mode = 'quick') {
  const validModes = ['quick', 'detailed', 'skip'];
  const resolvedMode = validModes.includes(mode) ? mode : 'quick';

  if (resolvedMode === 'skip') {
    return {
      state: {
        mode: 'skip',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        questions: [],
        answers: {},
        current_index: 0,
        completed: true,
      },
      firstQuestion: null,
    };
  }

  const questions = resolvedMode === 'detailed' ? DETAILED_QUESTIONS : QUICK_QUESTIONS;

  const state = {
    mode: resolvedMode,
    started_at: new Date().toISOString(),
    completed_at: null,
    questions: questions.map(q => q.id),
    answers: {},
    current_index: 0,
    completed: false,
  };

  return {
    state,
    firstQuestion: formatQuestion(questions[0], 0, questions.length),
  };
}

/**
 * Record an answer and advance to the next question.
 *
 * @param {object} state - current interview_state from spec.json
 * @param {string} questionId - the id of the question being answered
 * @param {string} answer - the user's answer text
 * @returns {{ state: object, nextQuestion: object|null, completed: boolean, client_brief: object|null }}
 */
function recordAnswer(state, questionId, answer) {
  if (state.completed) {
    return { state, nextQuestion: null, completed: true, client_brief: null };
  }

  const questions = state.mode === 'detailed' ? DETAILED_QUESTIONS : QUICK_QUESTIONS;

  // Validate the questionId matches what we expect
  const expectedId = state.questions[state.current_index];
  if (questionId !== expectedId) {
    throw new Error(`Question mismatch: expected "${expectedId}", got "${questionId}"`);
  }

  // Store the answer
  const updatedState = {
    ...state,
    answers: { ...state.answers, [questionId]: answer || '' },
    current_index: state.current_index + 1,
  };

  // Check if interview is complete
  if (updatedState.current_index >= questions.length) {
    updatedState.completed = true;
    updatedState.completed_at = new Date().toISOString();

    const brief = buildClientBrief(updatedState, questions);
    return { state: updatedState, nextQuestion: null, completed: true, client_brief: brief };
  }

  // Return the next question
  const nextQ = questions[updatedState.current_index];
  return {
    state: updatedState,
    nextQuestion: formatQuestion(nextQ, updatedState.current_index, questions.length),
    completed: false,
    client_brief: null,
  };
}

/**
 * Build a structured client_brief from completed interview answers.
 *
 * @param {object} state - completed interview state
 * @param {Array} questions - the question definitions used
 * @returns {object} client_brief
 */
function buildClientBrief(state, questions) {
  const brief = {
    generated_at: new Date().toISOString(),
    interview_mode: state.mode,
  };

  for (const q of questions) {
    const answer = state.answers[q.id];
    if (answer && answer.trim()) {
      brief[q.field] = answer.trim();
    }
  }

  // Normalize revenue_model: default to 'stub' if not answered
  if (!brief.revenue_model) {
    brief.revenue_model = 'stub';
    brief.revenue_ready = true; // architecture seeded, model not yet chosen
  } else {
    const model = brief.revenue_model.toLowerCase();
    // Map common natural language to canonical values
    if (model.includes('not sure') || model.includes('later') || model === 'stub') {
      brief.revenue_model = 'stub';
      brief.revenue_ready = true;
    } else {
      brief.revenue_ready = true;
    }
  }

  return brief;
}

/**
 * Derive build-time additions based on the revenue model.
 * Returns component hints and template instructions to inject into the build prompt.
 *
 * @param {string} revenueModel - canonical revenue model value
 * @returns {{ components: string[], prompt_additions: string[], schema_hints: string[] }}
 */
function getRevenueBuildHints(revenueModel) {
  const model = (revenueModel || 'stub').toLowerCase();

  if (model === 'rank_and_rent' || model === 'lead_gen') {
    return {
      components: ['lead-capture-form', 'call-tracking-slot'],
      prompt_additions: [
        'Include a prominent lead capture form with fields: name, phone, service needed.',
        'Add a call tracking number placeholder: <span class="call-tracking-number" data-field-id="cta-phone">[PHONE_NUMBER]</span>',
        'Include LocalBusiness schema markup in the <head> with placeholders for name, address, phone, and service area.',
        'CTA hierarchy: phone call > form submission > email. Put the phone number in the hero.',
      ],
      schema_hints: ['LocalBusiness', 'Service', 'ContactPoint'],
    };
  }

  if (model === 'reservations') {
    return {
      components: ['reservation-widget-slot', 'event-inquiry-form'],
      prompt_additions: [
        'Include a reservation/booking widget slot: <div class="reservation-widget" data-field-id="booking-widget">[BOOKING_WIDGET]</div>',
        'Add a private events inquiry form with fields: name, email, event date, party size, notes.',
        'Include Event schema markup where applicable.',
      ],
      schema_hints: ['FoodEstablishment', 'Event', 'Reservation'],
    };
  }

  if (model === 'ecommerce') {
    return {
      components: ['product-grid', 'cart-slot'],
      prompt_additions: [
        'Include a product showcase section with grid layout for products.',
        'Add a cart/checkout integration slot: <div class="cart-widget" data-field-id="checkout-widget">[CART_WIDGET]</div>',
        'Include Product schema markup with placeholders.',
      ],
      schema_hints: ['Product', 'Offer', 'ItemList'],
    };
  }

  if (model === 'affiliate') {
    return {
      components: ['comparison-table', 'review-section'],
      prompt_additions: [
        'Include a clear comparison or review section to support affiliate content.',
        'Add structured FAQ section for SEO visibility.',
        'Include AEO-optimized content structure: clear headings, FAQ schema.',
      ],
      schema_hints: ['FAQPage', 'Review', 'ItemList'],
    };
  }

  // stub / not_sure — seed the architecture without activating
  return {
    components: ['contact-form'],
    prompt_additions: [
      'Include a simple contact form (name, email, message) as the primary conversion point.',
      'Structure the site for easy monetization upgrade later — use data-field-id on all CTAs.',
    ],
    schema_hints: ['Organization', 'WebSite'],
  };
}

/**
 * Format a question definition for API response.
 */
function formatQuestion(q, index, total) {
  const formatted = {
    question_id: q.id,
    text: q.text,
    required: q.required,
    current: index + 1,
    total,
  };
  if (q.suggestion_chips) formatted.suggestion_chips = q.suggestion_chips;
  if (q.follow_up_map) formatted.follow_up_map = q.follow_up_map;
  return formatted;
}

/**
 * Get the current question without advancing state.
 * Used to resume a partial interview.
 */
function getCurrentQuestion(state) {
  if (state.completed) return null;

  const questions = state.mode === 'detailed' ? DETAILED_QUESTIONS : QUICK_QUESTIONS;
  const idx = state.current_index;

  if (idx >= questions.length) return null;

  return formatQuestion(questions[idx], idx, questions.length);
}

/**
 * Check whether an interview should fire for a given spec.
 * Returns false if already completed or if a build has already happened.
 */
function shouldInterview(spec) {
  if (!spec) return false;
  if (spec.interview_completed) return false;
  if (spec.state === 'built' || spec.state === 'deployed') return false;
  return true;
}

module.exports = {
  startInterview,
  recordAnswer,
  getRevenueBuildHints,
  REVENUE_MODEL_OPTIONS,
  buildClientBrief,
  getCurrentQuestion,
  shouldInterview,
  QUICK_QUESTIONS,
  DETAILED_QUESTIONS,
};
