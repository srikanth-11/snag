-- Per-finding actionable fix suggestion.
alter table findings add column if not exists suggestion text;
