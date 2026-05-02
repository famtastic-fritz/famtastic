#!/usr/bin/env node
'use strict';

// scripts/drive-sync.js
// SHAY V2 (2026-05-02 iter 3): Drive sync with delete-before-upload.
//
// The bug this fixes: prior sync uploaded each file every push. Drive API
// treats every upload as a NEW file (because it generates a new doc ID), so
// duplicate Google Docs accumulated. The fix: before uploading, find any
// existing file in the target folder with the same name and trash it.
//
// Required env:
//   GDRIVE_SERVICE_ACCOUNT_JSON — full JSON credential
//   GDRIVE_FOLDER_ID            — Drive folder ID where files land
//
// Files synced (relative to repo root):
//   FAMTASTIC-STATE.md, CHANGELOG.md, CLAUDE.md, famtastic-dna.md,
//   FAMTASTIC-VISION.md, SITE-LEARNINGS.md,
//   .wolf/cerebrum.md, .wolf/anatomy.md, .wolf/buglog.json,
//   docs/famtastic-total-ask-plan.md, docs/shay-architecture-v2-proposal.md,
//   docs/captures/* (all .md)
//
// Usage:
//   node scripts/drive-sync.js                  # full sync
//   node scripts/drive-sync.js --dry-run        # show what would be uploaded/deleted
//   node scripts/drive-sync.js --diff           # diff Drive vs local, no changes

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const FILES = [
  'FAMTASTIC-STATE.md', 'CHANGELOG.md', 'CLAUDE.md', 'famtastic-dna.md',
  'FAMTASTIC-VISION.md', 'SITE-LEARNINGS.md',
  '.wolf/cerebrum.md', '.wolf/anatomy.md', '.wolf/buglog.json',
  'docs/famtastic-total-ask-plan.md', 'docs/shay-architecture-v2-proposal.md'
];

function listCaptures() {
  const dir = path.join(REPO_ROOT, 'docs/captures');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join('docs/captures', f));
}

function expandFiles() {
  return FILES.concat(listCaptures()).filter(f => fs.existsSync(path.join(REPO_ROOT, f)));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const diffOnly = args.includes('--diff');

  const credJson = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!credJson) { console.error('GDRIVE_SERVICE_ACCOUNT_JSON not set'); process.exit(1); }
  if (!folderId) { console.error('GDRIVE_FOLDER_ID not set'); process.exit(1); }

  let google;
  try { google = require('googleapis').google; }
  catch (e) {
    console.error('googleapis package not installed. Run: npm install --no-save googleapis@137');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credJson),
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  const drive = google.drive({ version: 'v3', auth });

  // List existing files in the target folder
  const existing = await listFolder(drive, folderId);
  const existingByName = new Map();
  for (const f of existing) {
    if (!existingByName.has(f.name)) existingByName.set(f.name, []);
    existingByName.get(f.name).push(f);
  }

  const filesToSync = expandFiles();
  console.log(`Drive sync: ${filesToSync.length} file(s) to consider, ${existing.length} existing in folder`);

  if (diffOnly) {
    const localNames = new Set(filesToSync.map(f => path.basename(f)));
    const driveNames = new Set(existing.map(f => f.name));
    const onlyInDrive = [...driveNames].filter(n => !localNames.has(n));
    const onlyLocal = [...localNames].filter(n => !driveNames.has(n));
    const inBoth = [...localNames].filter(n => driveNames.has(n));
    console.log('\nDrive-only (would be untouched):');
    onlyInDrive.forEach(n => console.log('  ' + n));
    console.log('\nLocal-only (would upload):');
    onlyLocal.forEach(n => console.log('  ' + n));
    console.log('\nIn both (would delete-and-replace):');
    inBoth.forEach(n => console.log('  ' + n));
    process.exit(0);
  }

  let uploaded = 0, deleted = 0, errored = 0;
  for (const rel of filesToSync) {
    const name = path.basename(rel);
    const abs = path.join(REPO_ROOT, rel);
    try {
      // Delete existing copies with this name
      const existingForName = existingByName.get(name) || [];
      for (const old of existingForName) {
        if (dryRun) {
          console.log(`  [dry-run] DELETE ${name} (id ${old.id})`);
        } else {
          await drive.files.update({ fileId: old.id, requestBody: { trashed: true } });
          deleted++;
        }
      }
      // Upload fresh copy
      if (dryRun) {
        console.log(`  [dry-run] UPLOAD ${rel}`);
      } else {
        await drive.files.create({
          requestBody: { name, parents: [folderId] },
          media: { mimeType: 'text/markdown', body: fs.createReadStream(abs) }
        });
        uploaded++;
      }
    } catch (err) {
      console.error(`  ERROR ${rel}: ${err.message}`);
      errored++;
    }
  }

  console.log(`\nDone. uploaded=${uploaded} deleted=${deleted} errored=${errored}${dryRun ? ' (dry-run)' : ''}`);
  process.exit(errored > 0 ? 1 : 0);
}

async function listFolder(drive, folderId) {
  const out = [];
  let pageToken = null;
  do {
    const r = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
      pageSize: 1000,
      pageToken: pageToken || undefined
    });
    out.push(...(r.data.files || []));
    pageToken = r.data.nextPageToken || null;
  } while (pageToken);
  return out;
}

main().catch(err => { console.error(err); process.exit(1); });
