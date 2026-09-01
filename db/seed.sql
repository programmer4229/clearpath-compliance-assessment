-- Demo reviewers so the review-portal role switcher has something to pick from.
insert into reviewers (name, email) values
  ('Alex Chen', 'alex.chen@clearpath.example'),
  ('Jordan Lee', 'jordan.lee@clearpath.example')
on conflict (email) do nothing;

-- Demo login accounts for testing the auth system. All four use the
-- password "password123" (hashed below with a fixed salt — fine for
-- seed/demo data, never do this for real user passwords). One of each
-- account shape the signup form can produce:
--   marketer@clearpath.example   — employee, in-house marketer only
--   reviewer@clearpath.example   — employee, compliance reviewer only
--   both@clearpath.example       — employee, marketer AND reviewer
--   affiliate@partner.example    — affiliate partner
insert into users (name, email, password_hash, account_type, affiliate_company, is_marketer, is_reviewer) values
  ('Morgan Ito', 'marketer@clearpath.example', 'demoseed0000000000000000000000:1775ca29d7307139c111f7739b180e9639b46a965f4d741ec51cc378f9b180be4b0b50cb4431ba9ee8c3eb74c6a9b2df896fa3498e53abc504244654cb988e07', 'employee', null, true, false),
  ('Riley Sato', 'reviewer@clearpath.example', 'demoseed0000000000000000000000:1775ca29d7307139c111f7739b180e9639b46a965f4d741ec51cc378f9b180be4b0b50cb4431ba9ee8c3eb74c6a9b2df896fa3498e53abc504244654cb988e07', 'employee', null, false, true),
  ('Casey Park', 'both@clearpath.example', 'demoseed0000000000000000000000:1775ca29d7307139c111f7739b180e9639b46a965f4d741ec51cc378f9b180be4b0b50cb4431ba9ee8c3eb74c6a9b2df896fa3498e53abc504244654cb988e07', 'employee', null, true, true),
  ('Taylor Reyes', 'affiliate@partner.example', 'demoseed0000000000000000000000:1775ca29d7307139c111f7739b180e9639b46a965f4d741ec51cc378f9b180be4b0b50cb4431ba9ee8c3eb74c6a9b2df896fa3498e53abc504244654cb988e07', 'affiliate', 'Partner Lending Co.', true, false)
on conflict (email) do nothing;
