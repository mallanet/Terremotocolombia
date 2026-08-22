# Multi-Incident Platform Diagram Pack

**Related plan:** [Multi-Incident Platform Migration](./2026-08-12-001-refactor-multi-incident-platform-plan.md)

**Phase 0 note (2026-08-22):** current Colombia `origin/main` is `83b7c16`. Live modules now also include reconstruction campaign and official deceased lists. Draw them with the other domain modules when a later diagram refresh happens. The topology, trust, cache, and autonomy diagrams remain the target architecture.

These diagrams describe the target system before implementation. They distinguish the deployed Colombia system, the migration platform work, and the new tenant/signal control plane.

| Label | Meaning |
|---|---|
| Current | Exists in the Colombia repository today, although it can require migration hardening |
| Migration | Planned by U0-U22, U27 (family reunification), U34 (Upstash cache foundation), and U35 (volunteer coordination intelligence; post-foundation and not a U21 cutover gate) |
| New | Planned by U23-U26 and U28-U33 — extracted to `docs/plans/2026-08-14-001-feat-platform-operability-plan.md`, gated on the base plan's cutover (U21/U22) and a named second-incident driver |
| External | A system outside Mallanet's trust boundary |

Cloudflare Workers and the Compose/BullMQ stack are alternative deployment paths. A production request does not pass through both.

## 1. Complete component topology

```mermaid
flowchart TB
  citizen["Citizen browser"]
  incidentAdmin["Incident administrator"]
  platformOperator["Platform operator"]

  subgraph edge["Cloudflare edge"]
    dns["Current: DNS, CDN, WAF"]
    publicWeb["Current: public Next.js frontend"]
    adminWeb["Current: single-tenant admin, no organization scoping yet"]
    worker["Current: Worker fetch, queue, scheduled handlers"]
    authority["Migration: trusted authority canonicalizer"]
    edgeCache["Migration: Cloudflare CDN and Cache API for approved public JSON"]
    mediaCache["Current and migration: R2 plus Cloudflare media cache"]
    rateLimit["Migration: global and tenant rate limits"]
    runtimeBootstrap["New: signed/versioned deployment bootstrap"]
  end

  subgraph api["Application runtime"]
    requestContext["Current: request correlation"]
    tenantResolver["Migration: deployment to TenantScope resolver"]
    auth["Current and migration: session, capability, Turnstile, edit-token guards"]
    moduleGate["Migration: per-incident module gate"]
    domainModules["Current and migration: reports, needs, collection centers, missing, hospitals, patients, pets, volunteers, psychology"]
    scopedRepos["Migration: explicit scoped repositories"]
    providerRegistry["Migration: provider adapter registry"]
  end

  subgraph control["New platform control plane"]
    operatorCli["New: protected operator CLI or runner"]
    manifest["New: desired-state manifest and immutable revisions"]
    planner["New: read-only planner and drift detector"]
    provisioner["New: resumable provisioning reconciler"]
    readiness["New: preview readiness suite"]
    activation["New: separate activation approval and edge commit"]
    opsConsole["New: separate Mallanet operations console"]
    channelProvisioner["New: channel provisioning and verification"]
  end

  subgraph records["Domain-owned records with shared value contracts"]
    provenance["New: shared provenance envelope in domain-owned storage"]
    taxonomies["New: versioned concept schemes and mappings"]
    identity["Current plus migration: PRNs, evidence links, decisions, reversible clusters"]
    relationships["New: incident-scoped reviewed relationship assertions"]
    projections["New: purpose-specific staff, partner, family, and public projections"]
  end

  subgraph signals["New hazard signal intelligence"]
    sourceAdapters["New: versioned hazard-source adapters"]
    observationStore["New: immutable normalized observations"]
    correlator["New: deterministic event correlator"]
    hazardEvents["New: canonical hazard events and revisions"]
    policy["New: monitored-area candidate policy"]
    review["New: candidate review and decisions"]
  end

  subgraph async["Asynchronous execution"]
    cron["Current: Cron dispatcher"]
    cfQueues["Current: Cloudflare Queues"]
    consumers["Migration: versioned consumers and durable DLQ receipts"]
    bullmq["Current Compose alternative: BullMQ workers"]
  end

  subgraph coordination["Migration and new: volunteer coordination intelligence"]
    offerNeed["Structured volunteer offers and need requirements"]
    eligibility["Deterministic scope, policy, safety, geo, time, capacity eligibility"]
    ranker["Explainable ranker and bounded team/route optimizer"]
    questions["Approved dynamic-question registry"]
    assignment["Proposal, reservation, two-sided acceptance, assignment ledger"]
    moderation["Moderation, welfare escalation, appeals, kill switches"]
  end

  subgraph data["State and configuration"]
    neon[("Current and migration: Neon Postgres")]
    r2[("Current: Cloudflare R2 media")]
    valkey[("Current Compose: Valkey for BullMQ and local rate-limit compatibility, not Upstash cache")]
    upstash[("Migration: Upstash shared derived-data cache, per environment, disposable")]
    config["Migration and new: deployments, modules, catalogs, provider references"]
    ledgers["New: provisioning, candidate, activation, and release ledgers"]
  end

  subgraph external["External systems"]
    usgs["External: USGS realtime and FDSN"]
    otherSources["External: additional approved hazard sources"]
    responseGrid["External: ResponseGrid"]
    geoMail["External: geocoding and email"]
    psychology["External: psychology callback provider"]
    secrets["External: approved secret manager"]
    cloudflareApi["External: Cloudflare control plane and DNS"]
  end

  subgraph operations["Operations and release safety"]
    telemetry["Current and migration: structured logs, metrics, client errors"]
    alerts["Migration and new: security, source-health, queue, provisioning alerts"]
    release["Migration: immutable artifact promotion and rollback"]
  end

  citizen --> dns --> publicWeb --> runtimeBootstrap --> worker
  incidentAdmin --> dns --> adminWeb --> worker
  worker --> authority --> tenantResolver --> requestContext --> auth
  tenantResolver --> config
  tenantResolver --> rateLimit
  auth -->|"approved anonymous public read"| edgeCache
  auth --> moduleGate --> domainModules
  domainModules -->|"cache policy and scoped key"| upstash
  upstash -->|"miss or rejected envelope"| scopedRepos
  domainModules --> scopedRepos --> neon
  edgeCache -->|"miss"| moduleGate
  domainModules -->|"tenant-safe media authority"| mediaCache --> r2
  domainModules --> providerRegistry
  domainModules --> provenance
  domainModules --> taxonomies
  domainModules --> identity
  identity --> relationships --> projections
  provenance --> projections
  taxonomies --> relationships
  provenance --> neon
  taxonomies --> neon
  identity --> neon
  relationships --> neon
  providerRegistry --> responseGrid
  providerRegistry --> geoMail
  providerRegistry --> psychology

  platformOperator --> operatorCli --> manifest --> planner --> provisioner
  platformOperator --> opsConsole --> planner
  planner --> config
  planner -->|"read-only observe"| cloudflareApi
  planner --> secrets
  provisioner --> config
  provisioner -->|"preview only, no public routing"| cloudflareApi
  provisioner --> ledgers
  provisioner --> readiness --> activation
  activation -->|"public routing commit"| cloudflareApi
  provisioner --> channelProvisioner --> providerRegistry

  usgs --> sourceAdapters
  otherSources --> sourceAdapters
  sourceAdapters --> observationStore --> correlator --> hazardEvents --> policy --> review
  observationStore --> neon
  observationStore --> provenance
  hazardEvents --> neon
  review --> ledgers
  review -->|"approved preview request"| provisioner

  cron --> sourceAdapters
  cfQueues --> consumers --> scopedRepos
  bullmq --> consumers
  bullmq --> valkey
  sourceAdapters --> cfQueues

  domainModules --> offerNeed --> eligibility --> ranker --> assignment
  questions --> offerNeed
  assignment --> consumers
  assignment --> channelProvisioner
  assignment --> moderation
  moderation --> opsConsole
  eligibility --> taxonomies
  assignment --> neon

  worker --> telemetry
  consumers --> telemetry
  sourceAdapters --> telemetry
  provisioner --> telemetry
  telemetry --> alerts
  release --> publicWeb
  release --> adminWeb
  release --> worker
```

## 2. Entity ownership and trust boundaries

The physical hazard event is global evidence. An incident candidate is an organization-scoped proposal. A response incident is tenant-owned. A deployment binds trusted public authority to an approved collection of incidents with one deterministic default; every ordinary data call still carries exactly one trusted scope.

```mermaid
erDiagram
  ORGANIZATION ||--o{ INCIDENT : operates
  ORGANIZATION ||--o{ MEMBERSHIP : authorizes
  ORGANIZATION ||--o{ MONITORING_PROFILE : configures
  ORGANIZATION ||--o{ INCIDENT_CANDIDATE : reviews

  DEPLOYMENT ||--o{ DEPLOYMENT_INCIDENT : presents
  INCIDENT ||--o{ DEPLOYMENT_INCIDENT : exposed_through
  INCIDENT ||--o{ INCIDENT_MODULE : enables
  INCIDENT ||--o{ PROVIDER_CONFIGURATION : references
  INCIDENT ||--o{ CATALOG_REVISION : localizes
  INCIDENT ||--o{ TENANT_RECORD : owns
  INCIDENT ||--o{ API_KEY : pins

  CONFIGURATION_REVISION ||--o{ PROVISIONING_RUN : drives
  PROVISIONING_RUN ||--o{ PROVISIONING_STEP : checkpoints
  PROVISIONING_RUN ||--o{ PROVISIONED_RESOURCE : owns
  INCIDENT ||--o{ CONFIGURATION_REVISION : versions

  SIGNAL_SOURCE ||--o{ INGESTION_RUN : executes
  SIGNAL_SOURCE ||--o{ SOURCE_OBSERVATION : emits
  INGESTION_RUN ||--o{ SOURCE_OBSERVATION : records
  HAZARD_EVENT ||--o{ EVENT_OBSERVATION : correlates
  SOURCE_OBSERVATION ||--o{ EVENT_OBSERVATION : contributes
  MONITORING_PROFILE ||--o{ INCIDENT_CANDIDATE : evaluates
  HAZARD_EVENT ||--o{ INCIDENT_CANDIDATE : triggers
  INCIDENT_CANDIDATE ||--o{ CANDIDATE_DECISION : audits
  INCIDENT_CANDIDATE o|--o| INCIDENT : may_create
  HAZARD_EVENT ||--o{ INCIDENT_HAZARD_EVENT : links
  INCIDENT ||--o{ INCIDENT_HAZARD_EVENT : documents

  ORGANIZATION {
    uuid id PK
    text stable_key UK
    text lifecycle_state
  }
  INCIDENT {
    uuid id PK
    uuid organization_id FK
    text stable_key
    text lifecycle_state
    text hazard_type
    integer state_version
  }
  DEPLOYMENT {
    uuid id PK
    uuid organization_id FK
    text canonical_hostname UK
    text lifecycle_state
    bigint cache_epoch
  }
  DEPLOYMENT_INCIDENT {
    uuid deployment_id FK
    uuid incident_id FK
    boolean is_default
  }
  CONFIGURATION_REVISION {
    uuid id PK
    uuid incident_id FK
    text manifest_digest UK
    text schema_version
  }
  PROVISIONING_RUN {
    uuid id PK
    uuid configuration_revision_id FK
    text plan_digest
    text lifecycle_state
  }
  SIGNAL_SOURCE {
    uuid id PK
    text provider_key UK
    text hazard_type
    text source_version
    text circuit_state
  }
  SOURCE_OBSERVATION {
    uuid id PK
    uuid source_id FK
    text provider_event_id
    text provider_revision
    text normalized_checksum
    datetime occurred_at
  }
  HAZARD_EVENT {
    uuid id PK
    text hazard_type
    text correlation_generation
    datetime occurred_at
  }
  MONITORING_PROFILE {
    uuid id PK
    uuid organization_id FK
    text geometry_revision
    text policy_version
  }
  INCIDENT_CANDIDATE {
    uuid id PK
    uuid organization_id FK
    uuid hazard_event_id FK
    text lifecycle_state
    text evidence_digest
    integer state_version
  }
  CANDIDATE_DECISION {
    uuid id PK
    uuid candidate_id FK
    uuid actor_id FK
    text transition
    text reason
    text evidence_digest
  }
```

## 3. Evidence, identity, relationship, and taxonomy model

The model borrows the useful separation of sources, derivation activities, and conclusions from provenance systems, and the stable concept/mapping semantics of knowledge-organization systems. It stays relational. Family Search identity resolution and family/household relationships are separate graphs, and neither is a public projection by default.

```mermaid
flowchart LR
  subgraph inputs["Source evidence"]
    source["Domain-owned source evidence with shared provenance envelope"]
    activity["Domain-owned activity record: import, OCR, normalization, matcher, review"]
    actor["Attributed human, partner, or software actor"]
  end

  subgraph domains["Typed domain records and claims"]
    records["Person-shaped source records with stable PRNs"]
    claims["Typed person, status, location, report, or hazard claims"]
    decisions["Append-only reviewed conclusions and reasons"]
  end

  subgraph identityGraph["Same-person identity graph"]
    links["Evidence-bearing proposed or decided person links"]
    clusters["Confirmed-link connected components, reversible"]
    golden["Computed per-field person projection with provenance"]
  end

  subgraph relationshipGraph["Operational relationship graph"]
    concepts["Versioned relationship concepts and endpoint roles"]
    assertions["Incident-scoped assertions with sources and review state"]
    traversal["Bounded Postgres traversal and optional materialized read projection"]
  end

  subgraph taxonomy["Versioned concept schemes"]
    schemes["Stable concepts, localized labels, definitions, scope notes"]
    semantic["Direct broader, narrower, and related links"]
    mappings["Exact, close, broad, narrow, or related external mappings"]
  end

  subgraph views["Purpose-limited outputs"]
    staff["Authorized staff view"]
    partner["Agreement-bound partner export"]
    family["Minimal family-facing lookup"]
    public["Minimal approved public projection"]
  end

  source --> claims
  source --> records
  activity --> claims
  actor --> activity
  claims --> decisions
  records --> links --> clusters --> golden
  decisions --> links
  clusters --> assertions
  records --> assertions
  concepts --> assertions --> traversal
  schemes --> concepts
  schemes --> semantic
  schemes --> mappings
  golden --> staff
  traversal --> staff
  golden --> partner
  golden --> family
  golden --> public
  decisions --> staff
```

The arrows do not grant publication rights. Every output applies incident scope, purpose, consent or other approved legal basis, source restrictions, field allowlists, and retention state. Conflicting claims remain visible to authorized staff; accepted conclusions change a projection, not the historical evidence. The provenance envelope is shared code; storage remains domain-owned.

## 4. Family reunification identity, relationship, case, and privacy boundaries

```mermaid
flowchart TB
  subgraph tenant["One trusted TenantScope: organization plus incident"]
    missing["Missing-person source record"]
    patient["Hospital-patient source record"]
    unidentified["Reviewed unidentified-person record"]
    importRow["Patient import row with bounded raw retention"]

    prn["Scoped person_records and stable PRN registry"]
    matcher["Incident-scoped deterministic matcher"]
    proposal["Proposed evidence-minimal person_link"]
    identityReview["Human identity review"]
    confirmed["Confirmed identity links"]
    cluster["Computed reversible identity cluster"]
    staffProjection["Staff golden projection with per-field provenance"]

    relationship["PRN-to-PRN relationship assertion"]
    relationshipReview["Separate relationship review"]
    tracing["Tracing request and participants"]
    reunification["Reunification case"]
    disclosure["Separate contact and disclosure decision"]
    handoff["Separate official handoff decision"]
    outcome["Separate reunion or unresolved outcome"]

    authorization["Versioned processing and publication authorization"]
    publication["Expiring field allowlist and mediated contact"]
    publicView["Minimal public missing-person projection"]

    privacyOp["Checkpointed data-subject or privacy operation"]
    deindex["First: deindex and purge public caches"]
    tombstone["Then: source tombstone and raw-data policy"]
    recompute["Then: link and cluster recompute"]
    reproject["Then: relationship and case reprojection"]
    verify["Finally: verify retained evidence and disclosures"]

    missing --> prn
    patient --> prn
    unidentified --> prn
    importRow --> patient
    prn --> matcher --> proposal --> identityReview --> confirmed --> cluster --> staffProjection

    prn --> relationship --> relationshipReview
    relationshipReview -."read projection only".-> cluster
    tracing --> reunification
    cluster --> reunification
    relationshipReview --> reunification
    reunification --> disclosure --> handoff --> outcome

    authorization --> publication --> publicView
    cluster -."approved fields only".-> publication
    disclosure -."mediated route only".-> publication

    privacyOp --> deindex --> tombstone --> recompute --> reproject --> verify
  end

  otherTenant["Any other incident scope"]
  denied["Hard deny: no lookup, match, edge, cache, or Queue effect"]
  otherTenant --> denied
```

There is intentionally no arrow from a relationship assertion to the matcher or an identity merge. Identity, relationship, current status/location, disclosure, official handoff, and reunion are different decisions. Every family node is tenant-scoped; only concept definitions can be shared, and records pin the concept-scheme revision they used.

## 5. Multi-source detection and correlation pipeline

```mermaid
flowchart LR
  subgraph sources["Approved signal sources"]
    realtime["USGS realtime GeoJSON"]
    fdsn["USGS FDSN reconciliation"]
    additional["Additional approved source"]
    manual["Verified operator observation"]
  end

  adapters["Versioned source adapters"]
  networkGuard{"HTTPS, host, size, type, redirect, timeout valid?"}
  runtimeSchema{"Runtime schema and provenance valid?"}
  quarantine[("Quarantine metadata and redacted failure receipt")]
  observations[("Immutable idempotent observations and revisions")]
  health["Source freshness, latency, schema drift, cursor and circuit health"]
  correlate["Deterministic correlation by aliases, hazard, time, distance, geometry, region"]
  event[("Canonical hazard event and adopted correlation generation")]
  profiles["Organization monitoring profiles and versioned policy"]
  candidate[("Organization-scoped incident candidate")]
  review["Capability-gated human review"]
  suppress["Reject, suppress, merge, split, or request evidence"]
  provision["Signed and expiring preview-provisioning request"]
  replay["Isolated replay and outcome comparison"]
  catalog["Compatibility projection to existing earthquakes API"]

  realtime --> adapters
  fdsn --> adapters
  additional --> adapters
  manual --> adapters
  adapters --> networkGuard
  networkGuard -- "No" --> quarantine
  networkGuard -- "Yes" --> runtimeSchema
  runtimeSchema -- "No" --> quarantine
  runtimeSchema -- "Yes" --> observations
  observations --> health
  observations --> correlate --> event --> profiles --> candidate --> review
  observations --> catalog
  review -- "Approve preview" --> provision
  review -- "Reject or reshape" --> suppress
  quarantine --> replay
  observations --> replay
  replay -->|"approved adopted generation only"| correlate
```

Detection never changes public routing. Provider revisions and withdrawals append evidence and recompute candidates. Silence or outage never means that an event ended.

## 6. Tenant and incident provisioning lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft: manual request or approved candidate
  Draft --> Validating: dry-run
  Validating --> Draft: correction required
  Validating --> Provisioning: approved plan digest
  Provisioning --> WaitingExternal: DNS, domain, Access, or secret action required
  WaitingExternal --> Provisioning: observed state verified
  Provisioning --> Preview: draft resources and immutable artifacts ready
  Provisioning --> Failed: step failed
  Failed --> Provisioning: resume checkpoint
  Failed --> Draft: approved compensation
  Preview --> Provisioning: corrected configuration revision
  Preview --> Ready: readiness evidence approved
  Ready --> Active: separate activation approval
  Ready --> Draft: launch canceled
  Active --> Paused: operator pause or safety trip
  Paused --> Active: recovery gates pass
  Active --> Closed: response operations end
  Paused --> Closed: response operations end
  Closed --> Archived: retention and archive gates pass
  Archived --> [*]
```

Only `Ready → Active` can attach public authority. Queue/Cron producers and outbound notifications stay off until their post-routing activation gates. Validating and WaitingExternal are provisioning-run/step states (U23's `provisioning_runs`/`provisioning_steps`), not additional values of the incident `lifecycle_state` enum fixed by R24 (`draft | provisioning | preview | ready | active | paused | closed | archived | failed`).

## 7. Candidate approval, preview, and activation sequence

```mermaid
sequenceDiagram
  autonumber
  participant S as Signal adapters
  participant E as Correlator and policy
  participant D as Neon records
  participant R as Hazard reviewer
  participant P as Provisioning reconciler
  participant B as Immutable build system
  participant T as Readiness tests
  participant A as Activation approver
  participant C as Cloudflare and DNS

  S->>E: Append validated observation revision
  E->>D: Store correlation generation and candidate evidence
  E-->>R: Review-required candidate with reasons
  R->>E: Approve exact candidate and event revisions
  E->>D: Store signed, expiring provisioning request

  P->>D: Claim idempotent provisioning run
  P->>D: Create draft incident, config, modules, catalogs, invitation
  P->>C: Reserve or verify preview authority and resource names
  C-->>P: Ready or waiting_external
  P->>B: Build pinned frontend, admin, and backend-compatible artifacts
  B-->>P: Build IDs and configuration digests
  P->>T: Run contracts, isolation, cache, auth, provider, queue, offline, and rollback tests
  T-->>P: Immutable readiness record
  P->>D: Mark incident ready

  A->>P: Approve exact readiness, manifest, artifacts, and rollback target
  P->>C: Prepare route with no public traffic
  P->>C: Commit hostname and cache epoch
  P->>T: Run public authority and existing-incident smokes
  P->>D: Mark active and record release
  P-->>A: Enable writes, producers, schedules, then notifications in bounded gates

  alt Any activation gate fails
    P->>C: Restore previous route and cache epoch
    P->>D: Mark paused or failed and retain checkpoints
    P-->>A: Report exact failed and compensated steps
  end
```

Provider secret values never enter Postgres, manifests, diagrams, logs, or readiness records. Only secret references and versions are recorded.

## 8. Zero-planned-downtime compatibility boundaries

```mermaid
flowchart LR
  subgraph clients["Retained clients and browser state"]
    stableClient["Stored stable frontend and admin artifacts"]
    candidateClient["Candidate frontend and admin artifacts"]
    previousBrowser["Previous service worker, caches, IndexedDB, localStorage"]
    candidateBrowser["Versioned candidate browser protocols"]
  end

  subgraph runtime["Independently promoted runtime"]
    stableApi["Recorded stable backend"]
    candidateApi["Candidate backend: upload, 0%, canary, 100%"]
    compatibleConsumer["Backward-compatible async consumer at 100% first"]
    newProducer["New producer enabled later"]
  end

  subgraph state["Expand-first shared state"]
    additiveDb[("Additive schema and dual writes")]
    legacyProtocol[("Legacy reads and decoders")]
    newProtocol[("Scoped fields and versioned protocols")]
    cacheEpochs[("Current and previous tenant cache epochs")]
  end

  subgraph gates["Zero-tolerance release gates"]
    matrix["Stored-artifact old/new compatibility matrix"]
    isolation["Two-tenant negative isolation suite"]
    asyncProof["Queue and Cron consumer-first proof"]
    canary["Immutable-SHA and service-config canary"]
    rollback["Traffic and artifact rollback"]
  end

  stableClient --> stableApi
  stableClient --> candidateApi
  candidateClient --> stableApi
  candidateClient --> candidateApi
  previousBrowser --> stableApi
  previousBrowser --> candidateApi
  candidateBrowser --> stableApi
  candidateBrowser --> candidateApi

  stableApi --> additiveDb
  candidateApi --> additiveDb
  stableApi --> legacyProtocol
  candidateApi --> legacyProtocol
  candidateApi --> newProtocol
  compatibleConsumer --> legacyProtocol
  compatibleConsumer --> newProtocol
  newProducer --> compatibleConsumer
  stableApi --> cacheEpochs
  candidateApi --> cacheEpochs

  matrix --> canary
  isolation --> canary
  asyncProof --> canary
  canary --> candidateApi
  canary -- "stop threshold" --> rollback --> stableApi
  rollback --> cacheEpochs
```

The database expands before candidate code. Consumers reach 100% before new producers. An HTTP canary does not prove Queue/Cron behavior. Rollback changes traffic and artifacts, not additive schema. Wrong-tenant, data-loss, and authorization signals have a zero-error threshold.

## 9. Capability rollout ladder

```mermaid
flowchart LR
  A["Current USGS catalog"] --> B["USGS adapter dual-write"]
  B --> C["Shadow observations and source health"]
  C --> D["Replay and compatibility parity"]
  D --> E["Shadow correlation"]
  E --> F["Review-only candidates"]
  F --> G["Approved preview provisioning"]
  G --> H["Manual two-phase activation"]
  H --> I["Additional approved sources"]
  I --> J["Multi-source policy tuning"]
```

Each arrow is a promotion gate. Stop until the previous stage has parity, source-health, replay, isolation, and rollback evidence.

## 10. Runtime public deployment and communications launch

```mermaid
flowchart LR
  subgraph domains["Approved public domains"]
    colombia["terremotocolombia.co"]
    venezuela["Example Venezuela response domain"]
  end

  artifact["One immutable public frontend artifact"]
  hostAuthority["Exact-host deployment authority"]
  bootstrap["Signed/versioned public bootstrap"]
  assignment["Deployment-to-incident assignments"]
  frontendContext["Request-scoped deployment and incident context"]
  scopedApi["Server-resolved TenantScope APIs"]
  aggregateApi["Explicit privacy-reviewed aggregate APIs"]

  subgraph channels["Incident communication resources"]
    registry["Channel registry and immutable revisions"]
    adapters["Email, SMS, WhatsApp Business, webhook adapters"]
    externalStep["Manual group/community/social step: waiting_external"]
    verify["Ownership, consent, template, moderator, health verification"]
    activate["Ordered activation: public links, inbound, transactional, broadcast"]
  end

  colombia --> artifact
  venezuela --> artifact
  artifact --> hostAuthority --> bootstrap
  hostAuthority --> assignment
  bootstrap --> frontendContext
  assignment --> frontendContext
  frontendContext --> scopedApi
  frontendContext --> aggregateApi

  assignment --> registry
  registry --> adapters --> verify
  registry --> externalStep --> verify
  verify --> activate
```

The domain selects a deployment, not a database tenant supplied by the browser. A deployment can present several approved incidents, but ordinary data calls still carry one trusted scope. Channels use the same desired-state/checkpoint model whether a provider API performs the work or a human must create and verify the resource.

## 11. Administrative surfaces and authority boundaries

```mermaid
flowchart TB
  globalIdentity["Global login identity"]
  orgMembershipA["Organization A membership"]
  orgMembershipB["Organization B membership"]
  platformAssignment["Separate platform-operator assignment"]

  subgraph tenantAdmin["Per-organization response admin authority"]
    orgGovernance["Organization governance and recovery"]
    deploymentRequests["Deployment and channel change requests"]
    incidentDirectory["Authorized incident directory"]
    incidentCommand["Incident command and readiness"]
    modules["Module workspaces"]
    family["No-store family/case workspace"]
  end

  subgraph platformOps["Separate Mallanet operations authority"]
    portfolio["Suppressed portfolio and health views"]
    planner["Desired-state plan and drift"]
    release["Provision, release, activate, rollback"]
    approvals["Privileged approvals"]
    supportBroker["Support access broker"]
  end

  authz["Server evaluator: AuthContext plus capability plus target scope"]
  scopedRepos["Scoped repositories and domain state machines"]
  ledgers["Operation, approval, audit, and provenance records"]
  supportSession["Short-lived exact-scope support session"]

  globalIdentity --> orgMembershipA --> tenantAdmin
  globalIdentity --> orgMembershipB
  globalIdentity --> platformAssignment --> platformOps
  tenantAdmin --> authz --> scopedRepos
  platformOps --> planner --> ledgers
  platformOps --> release --> ledgers
  platformOps --> approvals --> ledgers
  platformOps --> supportBroker --> supportSession --> authz
  scopedRepos --> ledgers
```

Platform, organization, deployment, incident, and module/case are fixed scope types, but deployment and incident are organization-owned peers rather than a simple hierarchy. Platform sessions and organization sessions never union. Mallanet operators can manage lifecycle metadata and safe health projections; tenant operational data requires organization membership or an approved support session.

## 12. Readiness, approval, and public activation sequence

```mermaid
sequenceDiagram
  autonumber
  participant O as Organization administrator
  participant P as Platform provisioner
  participant L as Planner and operation ledger
  participant D as Deployment operator
  participant R as Readiness suite
  participant I as Incident commander
  participant A as Distinct activation approver
  participant E as Edge and release controller
  participant C as Channel controller

  O->>P: Request exact organization, deployment, incident, and channel revision
  P->>L: Create read-only plan against observed state
  L-->>D: Approved immutable preview plan
  D->>E: Deploy pinned preview artifacts and bootstrap
  D->>C: Provision channels with outbound disabled
  E-->>L: Record resource, artifact, and config digests
  C-->>L: Record verified and waiting-external steps
  D->>R: Run isolation, contracts, modules, providers, queues, browser, and rollback checks
  R-->>L: Store immutable readiness result
  I->>L: Sign operational staffing, contacts, procedures, and module readiness
  A->>L: Verify distinct actors and exact unchanged evidence
  A->>E: Approve hostname and deployment mapping
  E->>E: Commit route and rotate cache epoch
  E->>R: Verify authority and all existing incidents
  R-->>L: Record activation verification
  E->>E: Enable writes and scoped producers
  E->>C: Enable inbound then transactional channels
  C->>C: Enable broadcast only under its own approval

  alt Evidence or observed state changed
    L-->>A: Approval is stale
    A-->>D: Return to plan, preview, or readiness
  else A gate fails
    E->>E: Restore same-authority route/config generation or issue a fresh reassignment epoch
    C->>C: Stop new channel producers
    E->>L: Record compensation and ready or paused state
  end
```

Organization readiness is necessary but does not grant infrastructure authority. The executor cannot satisfy an approval that requires another actor. Approval pins immutable evidence, not a mutable incident name.

## 13. Support-session lifecycle

```mermaid
stateDiagram-v2
  [*] --> Requested: exact organization, optional incident, purpose, capabilities, TTL
  Requested --> Denied: policy or approver rejection
  Requested --> ApprovedReadOnly: organization or policy approval
  ApprovedReadOnly --> ActiveReadOnly: one-time audience-bound exchange
  ApprovedReadOnly --> Revoked: organization or platform revokes
  ApprovedReadOnly --> Expired: approval TTL reached
  ActiveReadOnly --> ElevationRequested: exact bounded write is necessary
  ElevationRequested --> ActiveReadOnly: rejected or canceled
  ElevationRequested --> ActiveElevated: independent approval and shorter TTL
  ActiveReadOnly --> Revoked: organization or platform revokes
  ActiveElevated --> Revoked: organization or platform revokes
  ActiveReadOnly --> Expired: TTL reached
  ActiveElevated --> Expired: session or elevation TTL reached
  Denied --> [*]
  Revoked --> [*]
  Expired --> [*]
```

The engineer remains the actor and never impersonates an organization user. Every request checks exact scope, allowlisted capability, audience, expiry, and revocation. Membership, grants, API keys, secrets, exports, deployment/hostname actions, sensitive disclosure, and further support grants are denied by default. Break glass is a separate, stronger, notified, time-bounded procedure with mandatory review.

## 14. Cache hierarchy, trust, and no-store lane

The cache path begins only after trusted authority resolution and credential/audience classification. Upstash stores small disposable public or approved aggregate projections. It never stores photos, person/case/contact data, authorization state, queues, rate-limit truth, or operation ledgers.

```mermaid
flowchart LR
  request["HTTP request"] --> resolver["Trusted exact-host resolver"]
  resolver --> scope["Immutable TenantScope plus deployment/config epoch"]
  scope --> classify["Credential, audience, module, and cache-policy classifier"]

  classify -->|"sensitive, authenticated, admin, support, mutation"| noStore["No-store lane"]
  noStore --> repo["Scoped repository"]

  classify -->|"approved anonymous projection"| l0["L0 request memo"]
  l0 --> l1["L1 bounded process cache"]
  l1 --> l2["L2 Upstash REST, per environment"]
  l2 -->|"miss, stale-invalid, corrupt, timeout"| repo
  repo --> pg[("Authoritative Postgres")]
  repo --> projection["Redacted versioned DTO projection"]
  projection --> l2

  projection --> l3["L3 Cloudflare CDN/Cache API"]
  l3 --> browser["Browser: TanStack, Next, service worker"]

  media["Media authority"] --> r2[("R2 objects")]
  r2 --> mediaCdn["Cloudflare media cache"]

  queues["Cloudflare Queues / BullMQ"] --> queueState[("Queue state, not cache")]
  limits["EDGE_RATE_LIMITER / Valkey"] --> limitState[("Rate-limit state, not cache")]

  scope --> key["Canonical key and envelope builder"]
  key --> l0
  key --> l1
  key --> l2
  key --> l3
```

## 15. Authoritative write, invalidation, privacy purge, and reassignment

Normal writes succeed independently of cache availability. Security- or privacy-critical transitions are stricter: they advance authoritative reachability first and do not complete until every public path is verified.

```mermaid
sequenceDiagram
  autonumber
  participant W as Scoped write service
  participant P as Postgres
  participant O as Cache-effect outbox
  participant U as Upstash
  participant C as Cloudflare CDN/Cache API
  participant V as Verification probes
  participant A as Activation/privacy operation

  W->>P: Commit domain mutation and cache-effect row atomically
  P-->>W: Return committed authoritative result
  W-->>W: Respond without waiting for cache fill
  O->>P: Claim effect idempotently
  O->>U: Delete exact keys or abandon old generation
  O->>C: Purge exact scoped public keys
  O->>P: Record attempts, lag, and result

  alt Ordinary data update
    O-->>W: Retry asynchronously within the registered stale bound
  else Privacy suppression or authority reassignment
    A->>P: Quarantine route or suppress projection, then commit fresh epoch/revision
    P-->>A: Old generation is no longer addressable
    A->>O: Require L2 and CDN purge checkpoint
    O->>U: Purge known old keys and let TTL reclaim abandoned keys
    O->>C: Purge bootstrap, HTML, API, and owned cache keys
    A->>V: Probe old and new host/scope from independent paths
    V-->>A: Scope, epoch, and no-stale verification
    A->>P: Mark privacy operation complete or activate new authority
  end

  alt Purge or verification fails
    A->>P: Keep operation blocked and hostname quarantined
    A-->>A: Retry or restore same-authority mapping with a compatible generation
  end
```

A cross-tenant hostname rollback or reassignment always issues a new epoch. It never restores an old authority epoch, even if the old Upstash keys still exist and are waiting for TTL expiry.

## 16. Volunteer-to-need intelligence and safe dispatch

The intelligence layer is deliberately split. Models can structure language and reduce uncertainty; hard policy decides who is eligible; the assignment ledger controls real-world commitments.

```mermaid
flowchart LR
  subgraph scope["Hard boundary: one Organization + Incident"]
    volunteer["Volunteer signup"] --> offer["Versioned offer\ncapabilities, pickup truck, 100-mile radius/corridor, payload, availability"]
    requester["Help request"] --> need["Versioned need\nrequired equipment, quantity, urgency, place/privacy, time, risk"]

    offer --> extract["AI-assisted extraction\nproposed fields + confidence"]
    need --> extract
    extract --> confirm["Participant confirms or corrects"]
    confirm --> missing{Material fact missing?}
    missing -- yes --> registry["Highest-value approved question\nlocalized, minimal, rate-limited"]
    registry --> confirm
    missing -- no --> candidate["Partitioned candidate retrieval\nincident + taxonomy + geography + time"]

    candidate --> hard["Deterministic hard filters\nscope, consent, safety, credentials, capacity, availability"]
    policy["Versioned jurisdiction/incident policy pack"] --> hard
    hard -- denied --> reason["Stable deny/review reason"]
    hard -- eligible --> rank["Explainable score\nurgency, fit, travel, aging, workload, fairness"]
    rank --> optimize["Optional bounded optimizer\nteams, task splits, route stops"]
    optimize --> proposal["Candidate proposal"]
    proposal --> reserve["Atomic expiring capacity reservation"]
    reserve --> consent["Two-sided acceptance"]
    consent --> disclose["Policy-gated staged location/contact disclosure"]
    disclose --> assigned["Assignment + check-ins + welfare timers"]
    assigned --> outcome{Physical-world outcome}
    outcome -->|complete with evidence| complete["Completed"]
    outcome -->|decline, expiry, no-show| replan["Release capacity and replan"]
    outcome -->|harm, conflict, overdue| casework["Moderation/welfare case\nintervene, appeal, kill switch"]
    replan --> candidate
  end

  ai["Model / embedding / route provider"] -. "advisory only" .-> extract
  ai -. "advisory only" .-> rank
  ai -. "cannot override" .-> hard
  otherIncident["Other incident"] -- "hard deny" --> hard
```

## 17. Per-category autonomy ladder and rollback

Autonomy is not a platform-wide switch. Each cell is an incident + jurisdiction + task/risk category + action policy with its own evidence and rollback target.

```mermaid
stateDiagram-v2
  [*] --> Shadow
  Shadow: Compute only; no participant effect
  Shadow --> Recommend: replay + safety + quality gates
  Recommend: Operator sees ranked candidates and reasons
  Recommend --> Ask: approved question registry + consent gates
  Ask: System can ask one bounded clarifying question
  Ask --> Invite: channel consent + rate/frequency gates
  Invite: System can send a consent-based proposal
  Invite --> Reserve: concurrency + cancellation + support gates
  Reserve: System can place an expiring capacity hold
  Reserve --> Dispatch: low-risk policy + duty-of-care approval + two approvers
  Dispatch: System can assign/replan inside approved limits

  Shadow --> Paused
  Recommend --> Paused
  Ask --> Paused
  Invite --> Paused
  Reserve --> Paused
  Dispatch --> Paused
  Paused: Stop new automated effects; preserve accepted work and welfare monitoring
  Paused --> Shadow: corrected policy/model + replay + approval
```

Every promotion pins source build, schema, model/prompt, taxonomy, policy, communication template, metric window, approvers, blast radius, and rollback target. High-risk categories remain in human review even when a low-risk category reaches dispatch.
