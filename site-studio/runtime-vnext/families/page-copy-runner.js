'use strict';

class PageCopyRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const pm = request.pageManifest || {};
    const biz = b.business || {};
    const pos = b.positioning || {};
    const ci = b.content_inputs || {};

    const primary_cta = { text: pos.primary_cta || 'Get Started', href: '#contact' };
    const headline = (biz.name || 'Welcome') + ' — ' + (pos.primary_goal || 'Professional Services');
    const subheadline = pos.desired_outcome || '';

    const sectionMap = {
      hero: { heading: biz.name || 'Welcome', body: (pos.problem || '') + (pos.desired_outcome ? '. ' + pos.desired_outcome : ''), cta: primary_cta },
      services: { heading: 'Our Services', items: (ci.services || []).map(s => ({ name: s.name, description: s.description })) },
      'services-grid': { heading: 'Our Services', items: (ci.services || []).map(s => ({ name: s.name, description: s.description })) },
      'services-overview': { heading: 'What We Offer', items: (ci.services || []).slice(0, 3).map(s => ({ name: s.name, description: s.description })) },
      'services-intro': { heading: 'Full Service Offerings', intro: ci.about || '' },
      about: { heading: 'About Us', text: ci.about || '', differentiators: ci.differentiators || [] },
      'about-snippet': { heading: 'About ' + (biz.name || 'Us'), text: (ci.about || '').substring(0, 200) },
      'about-story': { heading: 'Our Story', text: ci.about || '', differentiators: ci.differentiators || [] },
      testimonials: { heading: 'What Clients Say', items: ci.testimonials || [] },
      cta: { heading: 'Ready to Get Started?', cta: pos.primary_cta || 'Get Started', secondary_cta: pos.secondary_cta },
      'cta-banner': { heading: 'Ready to Get Started?', cta: pos.primary_cta || 'Get Started' },
      'contact-form': { heading: 'Contact Us', fields: ['name', 'email', 'message'] },
      contact: { heading: 'Contact Us', fields: ['name', 'email', 'message'] },
      footer: { company: biz.name || '', contact: biz.public_contact || '', hours: biz.hours || '' },
      team: { heading: 'Our Team', text: 'Serving ' + (biz.location || 'your area') + ' with expertise and care.' },
      values: { heading: 'Our Values', items: ci.differentiators || [] },
      location: { heading: 'Find Us', address: biz.location || '', hours: biz.hours || '' },
      hours: { heading: 'Hours of Operation', text: biz.hours || '' },
    };

    const sections = (pm.required_sections || []).map((sectionId) => {
      const content = sectionMap[sectionId] || { heading: sectionId.replace(/-/g, ' '), text: biz.name || '' };
      return { id: sectionId, type: sectionId, content };
    });

    const meta_title = ((biz.name || '') + ' | ' + (pos.primary_goal || 'Services') + ' | ' + (biz.location || '')).substring(0, 60);
    const meta_description = (ci.about || pos.desired_outcome || '').substring(0, 155);

    return {
      result: {
        page_id: pm.page_id || 'home',
        headline,
        subheadline,
        primary_cta,
        sections,
        meta_title,
        meta_description,
      },
      sideEffects: [],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { PageCopyRunner };
