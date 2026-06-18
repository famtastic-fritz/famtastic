// Skill registry: maps task.type -> handler module. The worker dispatches here.
import * as prospect from './prospect.js';
import * as analyze from './analyze.js';
import * as propose from './propose.js';
import * as build from './build.js';
import * as assemble from './assemble.js';
import * as generic from './generic.js';

const REGISTRY = {
  prospect: prospect.run,
  analyze: analyze.run,
  propose: propose.run,
  'build-frontend': build.run,
  'build-cms': build.run,
  'build-tutor': build.run,
  'build-3d': build.run,
  assemble: assemble.run,
  // lightweight high-throughput types
  triage: generic.run,
  classify: generic.run,
  summarize: generic.run,
  report: generic.run,
};

export function getSkill(type) {
  return REGISTRY[type] || generic.run;
}

export const KNOWN_TYPES = Object.keys(REGISTRY);
