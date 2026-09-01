-- ClearPath Compliance Review Portal — schema (v1)
-- Applies cleanly to a fresh Postgres database (local dev or Supabase).

create extension if not exists "pgcrypto";

create type product_type as enum (
  'personal_loan', 'credit_card', 'mortgage_prequalification', 'general_marketing'
);
create type submission_status as enum (
  'new',                -- unclaimed, awaiting a reviewer
  'in_review',           -- claimed by a reviewer
  'changes_requested',   -- sent back to submitter, waiting on them
  'resubmitted',         -- submitter revised, back with the same reviewer
  'approved',            -- terminal
  'rejected'              -- terminal
);
create type checklist_result as enum ('pass', 'fail', 'not_applicable');
create type decision_type as enum ('approved', 'changes_requested', 'rejected');
create type attachment_type as enum ('image', 'pdf');
create type account_type as enum ('employee', 'affiliate');

-- Authentication accounts — every person who can sign in to the portal, and
-- the single identity source for both submitting and reviewing (see
-- submissions/review_decisions below — this used to be two separate tables,
-- submitters and reviewers, before login existed).
--
-- account_type distinguishes ClearPath employees from affiliate partners.
-- Employees choose is_marketer / is_reviewer at signup (at least one, both
-- allowed). Affiliates are always is_marketer = true, is_reviewer = false —
-- they submit content, they don't review it.
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  account_type account_type not null,
  affiliate_company text,
  is_marketer boolean not null default false,
  is_reviewer boolean not null default false,
  created_at timestamptz not null default now()
);
create index on users (email);

create table checklist_criteria (
  id text primary key,          -- short stable slug, e.g. 'apr_disclosure'
  sort_order int not null,
  title text not null,
  description text not null,
  regulation_reference text     -- e.g. 'Reg Z / TILA'
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  product_type product_type not null,
  body_text text,
  submitter_id uuid not null references users(id),
  status submission_status not null default 'new',
  assigned_reviewer_id uuid references users(id),
  parent_submission_id uuid references submissions(id),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on submissions (status);
create index on submissions (submitter_id);
create index on submissions (assigned_reviewer_id);
create index on submissions (parent_submission_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  type attachment_type not null,
  storage_url text not null,
  filename text not null,
  created_at timestamptz not null default now()
);

create table checklist_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  criterion_id text not null references checklist_criteria(id),
  result checklist_result not null,
  note text,
  created_at timestamptz not null default now(),
  unique (submission_id, criterion_id)
);

-- Append-only: every decision ever made, on any submission/version — the audit trail.
create table review_decisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_id uuid not null references users(id),
  decision decision_type not null,
  feedback text,
  created_at timestamptz not null default now()
);
create index on review_decisions (submission_id);

with seed as (
  select * from (values
    ('apr_disclosure', 1, 'Rate/APR Disclosure', 'If a rate or payment is advertised, is the APR disclosed with required prominence and proximity?', 'Reg Z / TILA'),
    ('no_guaranteed_approval', 2, 'No Guaranteed-Approval Claims', 'Does the content avoid implying guaranteed approval, "no credit check," or otherwise overstating approval certainty?', 'UDAAP'),
    ('prequalification_disclaimer', 3, 'Prequalification Disclaimer', 'If referencing prequalification/preapproval, is there a clear "not a commitment to lend" disclaimer distinguishing it from final approval?', 'Reg B / UDAAP'),
    ('non_discriminatory_language', 4, 'Non-Discriminatory Language', 'Is the content free of language or targeting that could be construed as discriminatory on a prohibited basis?', 'ECOA'),
    ('licensing_disclosures', 5, 'Required Licensing Disclosures', 'For mortgage content, are the NMLS ID and Equal Housing Lender disclosure present?', 'SAFE Act / Fair Housing'),
    ('affiliate_endorsement_disclosure', 6, 'Affiliate Endorsement Disclosure', 'If submitted by an affiliate, is the material connection/compensation relationship clearly disclosed?', 'FTC Endorsement Guides'),
    ('accurate_product_representation', 7, 'Accurate Product Representation', 'Are stated rates, fees, terms, or benefits accurate and consistent with current approved product terms?', 'Internal / UDAAP'),
    ('no_confidential_info', 8, 'No Confidential/Proprietary Information', 'Does the content avoid unreleased terms, internal data, or proprietary information?', 'Internal')
  ) as t(id, sort_order, title, description, regulation_reference)
)
insert into checklist_criteria select * from seed
on conflict (id) do nothing;
