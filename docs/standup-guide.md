# Standup guide

> **The standup already happened in this repository.** terremotocolombia.co
> runs in production now. This guide stays as a reference, for the next
> Mallanet deployment. **Do not run this guide against this repository.**
> Reconfiguring the identity or regenerating secrets here breaks the site
> that serves live traffic.
>
> Also note: this guide's deploy step assumes a VPS with Docker Compose.
> terremotocolombia.co runs on **Cloudflare Workers**. See
> [`../CLAUDE.md`](../CLAUDE.md) → "Where this actually runs".
>
> Status per skill: [`../CLAUDE.md`](../CLAUDE.md) → "Launch checklist
> status".

This guide takes you, step by step, from "I forked this template" to "I run
a real disaster-response site on my own domain." If you use a code agent
(Claude Code or another agent compatible with `.claude/skills/`), ask it
directly to run each skill named below. Each skill has its own `SKILL.md`
file with full technical detail. This guide gives the human-readable
version: the reasons and the order.

## Quickstart (30 minutes, if you already have everything ready)

Before you start, gather these items:

- your organization's name
- the event or disaster name
- the map center (latitude/longitude) and zoom level
- a contact email address
- three domains or subdomains (site, API, admin), with DNS access
- the real emergency numbers for your region
- a freshly provisioned Ubuntu VPS, with SSH access

1. **Set the identity** (about 5 minutes): edit
   `config/deployment.config.json` with your data. Ask your agent to run
   the skill `disaster-configure`, or follow step 1 in the full guide
   below, by hand.
2. **Apply your brand** (about 5 minutes): colors and logo, with the skill
   `disaster-brand` (step 2 below).
3. **Generate secrets** (about 2 minutes): the skill
   `disaster-secrets-bootstrap` generates strong passwords and keys, and
   builds your production `.env` file.
   *(In this repository: done. The secrets live in Doppler, not in `.env`.
   Regenerating them now would invalidate sessions and break hashes
   already written.)*
4. **Deploy to the VPS** (about 15 minutes, including DNS propagation): the
   skill `disaster-deploy-vps` provisions the server, starts Docker
   Compose plus Caddy with TLS, and runs smoke checks.
5. **Audit before you publish** (about 3 minutes of scanning, plus a
   mandatory human review with no fixed time limit): run the skill
   `disaster-content-audit` **before** you make your fork public or share
   the repository link with anyone outside your trusted team.

If you are missing anything from the list above, especially the real
emergency numbers or DNS access, resolve it before you start. Several
steps depend on having it ready.

## Step-by-step guide

### 0. Before you touch anything

> **This step does NOT apply to `mallanet/Terremotocolombia`.** That
> repository is public on purpose, and it serves a live site. **Do not
> change its visibility on your own.** Making it private would break
> public links, and it would fix nothing. The steps below apply to a new
> deployment, not to this one.

Fork this repository to your own GitHub account or organization, **as
private** — do not publish it yet. Everything that follows happens in that
private fork. Only at the end, after `disaster-content-audit`, do you
decide to make it public.

### 1. `disaster-configure` — deployment identity

Fill in `config/deployment.config.json` with:

- your organization's name
- the product or site name
- the disaster or event name
- the disaster type
- a region label
- the map center and initial zoom level
- the language
- a contact email address
- the three domains

This file is the source of truth. The rest of the site reads it at
runtime.

Also, by hand (the config loader cannot reach these files):

- `frontend/public/manifest.webmanifest` — the PWA name and description.
- `frontend/lib/event-data.ts` — the real event metadata and the
  localities at risk. Replace the example data.
- `frontend/lib/emergency-contacts.ts` — **the real emergency numbers for
  your region** (fire department, ambulance, civil protection). No skill
  can guess these for you. Have them ready before you start.

Verify: `cd frontend && npm run build` passes, and the map points to your
region. Check `config/deployment.config.json` → `mapCenter`.

### 2. `disaster-brand` — your visual brand

With the identity in place, apply your color palette and logo across:

- `docs/DESIGN.md` (design tokens)
- `frontend/app/globals.css` (CSS variables)
- `manifest.webmanifest` (`theme_color`)
- the icon and hero SVG files
- the social preview images (Open Graph and Twitter)

If you do not have your own logo, the default "map pin" motif stays, with
only your colors applied.

This skill refuses to run if step 1 is not finished. It detects remaining
`example.org` values. This check stops you from rebranding a site that
still says "Organización Ejemplo" — the template's actual placeholder
name, unchanged by the documentation-language switch.

### 3. `disaster-secrets-bootstrap` — production secrets

Generate each required secret (`JWT_SECRET`, `IP_SALT`,
`PATIENT_DOCUMENT_HASH_SECRET`, and Postgres, Valkey, and superadmin
passwords) with `openssl rand`. Build your real `.env` or `.prod.env`
file. Combine these secrets with the domains and contact email you set in
step 1.

You never commit `.env`. This repository's `.gitignore` already excludes
it. This skill does not finish while any required variable still holds a
`CHANGE_ME` value or an example value. It also does not tell you to move
to step 4.

### 4. `disaster-deploy-vps` — the server

With a clean Ubuntu VPS and SSH access:

1. Create a deploy user. Harden SSH (no root login, no password login).
   Set up a firewall (UFW: only ports 22, 80, and 443 open). Install
   fail2ban.
2. Install Docker.
3. Clone your fork. Copy your `.env` or `.prod.env` file to the server
   through a secure channel — never through git.
4. Create the DNS A records for your three domains, pointing to the VPS
   IP address. Wait for them to propagate.
5. Run `docker compose -f docker-compose.prod.yml --env-file .prod.env up
   -d --build`. This starts Postgres, Valkey, migrations, the backend,
   the worker, the frontend, the admin panel, and Caddy. Caddy issues
   automatic TLS through Let's Encrypt.
6. Run smoke checks:
   - all services show `healthy` or `running`
   - all three domains respond over HTTPS
   - the map loads, centered on your region
   - a test report, with fictitious data, sends and appears
   - the admin panel authenticates with your superadmin account

### 5. `disaster-content-audit` — always before you publish

**This step is a gate, not a formality.** Complete it before your fork
goes public, and before you share the link with anyone outside your team:

1. Run `scripts/content-audit/run.sh`.
2. Review each hit by hand. An automated scan cannot tell a documented
   placeholder from real data.
3. Confirm that your fork's git history carries no commits or objects
   from an earlier repository with real data.
4. Confirm that no binary file (photos, screenshots) carries EXIF or GPS
   metadata.

This step's verdict is **never** "it is clean" or "it is safe to
publish." At most, it says: *"no known-pattern findings; this does not
confirm the repository is clean."* An automated scan searches for known
patterns. It cannot prove the absence of something that does not match
those patterns. This is why the final step is always the same. **A team
member reviews the full diff or file tree by hand, before the push to
public.** This step has no exception. It applies every time the
repository is about to change visibility, not only the first time.

## Origin

This template began from the citizen response to the 2026 Venezuela
earthquake. The project team generalized it so any community can stand up
its own instance for the next disaster, with no identity or data carried
over from the original deployment.
