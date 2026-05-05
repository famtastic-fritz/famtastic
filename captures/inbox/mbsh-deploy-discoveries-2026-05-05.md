# MBSH Deploy Discoveries — 2026-05-05

## Decision: persistent staging and production environments

We decided that MBSH should keep persistent staging and production Netlify environments. Staging deploys the `staging` branch to `mbsh-reunion-staging`; production deploys the `main` branch to the public production Netlify project and custom domain. Promotion should happen by branch flow and Netlify deploy history, not by deleting staging or changing DNS for frontend rollbacks.

## Decision: Site Studio owns service capability relationships

Site Studio is the service owner for provider relationships such as Netlify, Resend, database, DNS, and cPanel. MBSH is a generated site that consumes Site Studio provisioned capabilities through generated config. This prevents every site from becoming its own provider-owner integration problem.

## Learning: Netlify project names can mislead deploy reasoning

The production project was named `loquacious-valkyrie-37d5f8`, while the staging project was named `mbsh-reunion-staging`. The production project was already GitHub-linked to `famtastic-fritz/mbsh-reunion` on `main`; the staging project was initially unlinked and later connected to the same repo on `staging`. Deploy verification must key off site id, repo path, repo branch, and latest deploy commit, not project name alone.

## Vendor fact: cPanel addon domain repaired API DNS and vhost routing in this GoDaddy-hosted account

`api.mbsh96reunion.com` initially did not resolve and forced backend smoke to fall back to `https://FAMTASTICINC.COM`. Creating the cPanel addon/vhost for `api.mbsh96reunion.com` mapped it to `/home/nineoo/public_html` and caused GoDaddy authoritative DNS to return `107.180.51.234`. The repair required both DNS and Apache vhost routing; an A record alone would have hit the wrong vhost.

## Vendor fact: this cPanel account does not expose AutoSSL

cPanel returned `You do not have the feature "autossl"` for AutoSSL checks. The working path was Let's Encrypt HTTP-01 through temporary challenge files uploaded by cPanel Fileman, followed by cPanel `SSL/install_ssl` for `api.mbsh96reunion.com`.

## Bug pattern: platform smoke runner failed only after canonical DNS succeeded

When smoke no longer fell back to `https://FAMTASTICINC.COM`, `platform/capabilities/smoke/test-endpoints.sh` hit `CURL_SSL_ARGS[@]: unbound variable` on macOS Bash with `set -u`. The fix was to initialize the array with a harmless curl arg (`-q`) and override to `-k` only for the fallback host.

## Gap: API certificate renewal is not automated

The manually issued Let's Encrypt certificate for `api.mbsh96reunion.com` expires on `2026-08-03`. Site Studio needs a certificate-renewal capability for cPanel-backed APIs or a documented renewal runbook that can be executed before expiry.

## Gap: session management is separate from capture extraction

The capture system now has source adapters, capture packets, promotion proposals, canonical memory entries, and telemetry. What is missing is a source-independent session manager that groups captures, commits, proofs, tasks, plans, site tags, project tags, deploy runs, and human approvals under a single session id. Without that layer, the same work can be captured but not reliably reconstructed as one operational session.

## Gap: deploy environments need structured project linkage

The deploy strategy is now clear for MBSH, but Site Studio needs a reusable environment model with fields for local repo path, remote repo, local branch, staging Netlify project id, production Netlify project id, custom domain, API origin, latest deploy commit, and promotion state. This should become platform data rather than prose per site.

## Future task: domain purchase and option research

Domain purchase, registrar choice, DNS hosting, and naming strategy need a separate platform/domain workflow. That task should compare provider options and decide when Site Studio should buy, connect, transfer, or only document a domain.
