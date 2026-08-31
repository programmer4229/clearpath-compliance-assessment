-- Demo reviewers so the review-portal role switcher has something to pick from.
insert into reviewers (name, email) values
  ('Alex Chen', 'alex.chen@clearpath.example'),
  ('Jordan Lee', 'jordan.lee@clearpath.example')
on conflict (email) do nothing;
