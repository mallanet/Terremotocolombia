# Money donations (Stripe Checkout)

This document belongs in `docs/architecture.md`, next to the other
integration modules. It is separate because that file is over the
repository's line ceiling and the gate refuses to grow it. Read the two
together.

## What it does

`POST /api/donaciones/checkout` takes an amount in cents and an interval
(`once` or `monthly`), and returns the URL of a Stripe Checkout session.
The browser goes there to enter a card. When the payment completes,
Stripe returns the browser to `/apoyanos/gracias`.

The public form is `/apoyanos`. It asks for two things only: how often,
and how much.

## What it does NOT do

- **It stores nothing.** A person who gives money leaves no row in our
  database. Stripe records the transaction, because Stripe collects it.
  Copying the name, the email, or the amount here would build a donor
  file we have no use for.
- **It creates no product or price in Stripe up front.** The session
  carries an inline `price_data`, so the amount is the one the person
  chose — monthly amounts included. Nobody has to create a price in the
  dashboard for each possible figure.
- **It confirms no payment.** `/apoyanos/gracias` thanks the person and
  says the receipt comes by email. It does not read `session_id`, and it
  does not claim the charge went through. Confirming a charge is a
  webhook's job, and this deployment has no webhook yet.

## The two rules that hold its security

1. **The secret key never leaves the Worker.** The browser only ever sees
   the session URL.
2. **`success_url` and `cancel_url` come from the CORS allowlist**, never
   from the request body. Accepting a redirect target from the client and
   handing it to Stripe is a textbook open redirect: an attacker could
   send a person to their own page from a link that starts on our domain.

Being a public mutation, the endpoint carries Turnstile (`requireHuman`)
and rate limiting (`donations:checkout`, 10 per window). It publishes no
`@swagger` block, for the same reason `/api/needs` does not: it opens a
paid session with a service credential, and we do not publish that
contract on `/api/docs` as an abuse surface.

## Configuration

| Variable | Meaning |
| --- | --- |
| `ENABLE_STRIPE_DONATIONS` | `false` by default. Off means the endpoint returns `503` |
| `STRIPE_SECRET_KEY` | `sk_live_…` in production, `sk_test_…` for a rehearsal. Doppler, never a file |

With the flag off, the composition root wires a disabled gateway, the
endpoint returns `503`, and the form says so on screen. The variables are
validated in `modules/donations/donations-env.ts` rather than in
`config/env.ts`, because that file sits over the comment ceiling and the
gate refuses new lines there. The contract is the same: Zod, and a loud
failure.

Two manual steps stay with a human, as always:

1. Put `STRIPE_SECRET_KEY` and `ENABLE_STRIPE_DONATIONS=true` in Doppler
   (`prd`, or `stg` for a rehearsal).
2. Run `deploy-backend.yml` by hand. Until that runs, `/apoyanos` shows
   the form, the request fails with `503`, and the message on screen
   tells the person to use the direct payment links instead.

Add the same two lines to `.env.example` when a hook stops blocking that
file:

```bash
ENABLE_STRIPE_DONATIONS=false
STRIPE_SECRET_KEY=CHANGE_ME_STRIPE_SECRET_KEY
```

## Testing it without charging a real card

Use a `sk_test_…` key in `stg`. Stripe's test card is
`4242 4242 4242 4242`, with any future expiry date and any CVC. A test
key charges nothing and shows the whole flow, redirect to
`/apoyanos/gracias` included.
