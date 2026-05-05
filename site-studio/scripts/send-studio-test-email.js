#!/usr/bin/env node
// Send a Site Studio notification test email through the Studio Resend config.
'use strict';

const { getStudioEmailConfig, readStudioConfig, sendStudioEmail } = require('../lib/studio-mailer');

async function main() {
  const args = process.argv.slice(2);
  let to = '';
  let subject = 'FAMtastic Site Studio notification test';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--to') to = args[++i] || '';
    else if (arg === '--subject') subject = args[++i] || subject;
    else if (!arg.startsWith('--') && !to) to = arg;
  }

  const config = readStudioConfig();
  const email = getStudioEmailConfig(config);
  to = to || email.test_recipient || (config.email && config.email.user);
  if (!to) {
    console.error('Usage: send-studio-test-email.js <recipient-email>');
    process.exit(1);
  }

  const result = await sendStudioEmail({
    to,
    subject,
    text: 'FAMtastic Site Studio can send notifications through Resend.',
    html: [
      '<p>FAMtastic Site Studio can send notifications through Resend.</p>',
      '<p>This verifies the Studio-owned notification sender, not an MBSH-owned sender.</p>',
    ].join('\n'),
    tags: [{ name: 'source', value: 'site-studio' }, { name: 'kind', value: 'test' }],
  });

  console.log(JSON.stringify({
    ok: true,
    id: result.id || null,
    from: `${email.from_name} <${email.from_email}>`,
    to,
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
