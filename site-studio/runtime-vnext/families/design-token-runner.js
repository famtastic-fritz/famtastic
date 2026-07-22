'use strict';
const fs = require('fs');
const path = require('path');

const PALETTES = {
  professional: { primary: '#1e3a5f', secondary: '#2c5282', accent: '#c9a227', text: '#1a202c', bg: '#ffffff', surface: '#f7fafc' },
  corporate: { primary: '#1e3a5f', secondary: '#2c5282', accent: '#c9a227', text: '#1a202c', bg: '#ffffff', surface: '#f7fafc' },
  trust: { primary: '#1e3a5f', secondary: '#2c5282', accent: '#c9a227', text: '#1a202c', bg: '#ffffff', surface: '#f7fafc' },
  energetic: { primary: '#1a1a2e', secondary: '#16213e', accent: '#e94560', text: '#2d3748', bg: '#ffffff', surface: '#edf2f7' },
  bold: { primary: '#1a1a2e', secondary: '#16213e', accent: '#e94560', text: '#2d3748', bg: '#ffffff', surface: '#edf2f7' },
  modern: { primary: '#1a1a2e', secondary: '#16213e', accent: '#e94560', text: '#2d3748', bg: '#ffffff', surface: '#edf2f7' },
  natural: { primary: '#2d6a4f', secondary: '#40916c', accent: '#52b788', text: '#1b4332', bg: '#f9f4ef', surface: '#d8f3dc' },
  organic: { primary: '#2d6a4f', secondary: '#40916c', accent: '#52b788', text: '#1b4332', bg: '#f9f4ef', surface: '#d8f3dc' },
  wellness: { primary: '#2d6a4f', secondary: '#40916c', accent: '#52b788', text: '#1b4332', bg: '#f9f4ef', surface: '#d8f3dc' },
  luxury: { primary: '#111111', secondary: '#333333', accent: '#d4af37', text: '#111111', bg: '#fafafa', surface: '#f0ebe3' },
  premium: { primary: '#111111', secondary: '#333333', accent: '#d4af37', text: '#111111', bg: '#fafafa', surface: '#f0ebe3' },
  elegant: { primary: '#111111', secondary: '#333333', accent: '#d4af37', text: '#111111', bg: '#fafafa', surface: '#f0ebe3' },
};

const DEFAULT_PALETTE = PALETTES.professional;

class DesignTokenRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const brand = b.brand || {};
    const mood = (brand.mood || 'professional').toLowerCase();
    const brandColors = brand.colors || {};
    const typoHint = (brand.typography || '').toLowerCase();

    // Pick palette
    let palette = { ...DEFAULT_PALETTE };
    for (const [key, p] of Object.entries(PALETTES)) {
      if (mood.includes(key)) { palette = { ...p }; break; }
    }
    // Override with explicit brand colors
    if (brandColors.primary) palette.primary = brandColors.primary;
    if (brandColors.secondary) palette.secondary = brandColors.secondary;
    if (brandColors.accent) palette.accent = brandColors.accent;

    // Typography
    let headingFont = 'Inter, system-ui, sans-serif';
    let bodyFont = 'system-ui, -apple-system, sans-serif';
    if (typoHint.includes('serif') || typoHint.includes('classic')) {
      headingFont = 'Georgia, serif';
      bodyFont = 'Garamond, Georgia, serif';
    }

    const colors = {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      text: palette.text,
      bg: palette.bg,
      surface: palette.surface,
    };

    const typography = {
      heading_font: headingFont,
      body_font: bodyFont,
      base_size: '16px',
      scale: 1.25,
    };

    const spacing = {
      xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '48px', '2xl': '80px',
    };

    const css_output = [
      ':root {',
      `  --color-primary: ${colors.primary};`,
      `  --color-secondary: ${colors.secondary};`,
      `  --color-accent: ${colors.accent};`,
      `  --color-text: ${colors.text};`,
      `  --color-bg: ${colors.bg};`,
      `  --color-surface: ${colors.surface};`,
      `  --font-heading: ${typography.heading_font};`,
      `  --font-body: ${typography.body_font};`,
      `  --size-base: ${typography.base_size};`,
      `  --space-xs: ${spacing.xs};`,
      `  --space-sm: ${spacing.sm};`,
      `  --space-md: ${spacing.md};`,
      `  --space-lg: ${spacing.lg};`,
      `  --space-xl: ${spacing.xl};`,
      `  --space-2xl: ${spacing['2xl']};`,
      '}',
    ].join('\n');

    // Write tokens CSS
    const tokenPath = path.join(runContext.workspace_root, 'staging', 'css', 'tokens.css');
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    fs.writeFileSync(tokenPath, css_output, 'utf8');

    return {
      result: { colors, typography, spacing, css_output },
      sideEffects: [{ path: 'css/tokens.css', kind: 'write' }],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { DesignTokenRunner };
