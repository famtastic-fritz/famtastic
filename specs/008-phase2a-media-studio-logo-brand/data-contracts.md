# Phase 2A Data Contracts

## BrandProject
id, name, status, brief, created_at, updated_at, approved_brand_kit_id

## LogoInput
id, project_id, type(old_logo|liked_concept|rendition|reference), file_path, notes, tags, source

## PromptVersion
id, project_id, prompt, negative_prompt, provider, model, seed, variables, research_refs, estimated_cost, status

## MediaVariant
id, project_id, prompt_version_id, file_path, source, provider, model, cost, status(raw|promising|rejected|refine|approved), notes, score

## CritiqueRecord
id, variant_id, rubric_scores, notes, reviewer, decision, next_action

## UsageTest
id, variant_id, context(nav|favicon|social|dark|light|merch|motion), result, screenshot_path, notes

## BrandKit
id, project_id, logo_files, colors, typography, motion_rules, DESIGN_md_path, exports, usage_rules, approved_by

## PostEvalRecord
Existing shared post-eval schema; include skill/process/media_recipe/component_opportunity outputs.
