-- Post-hunt AI enrichment: a narrative summary of the run, and a concrete
-- root-cause fix for the most serious findings. Both are best-effort; the app
-- degrades gracefully if this migration hasn't been run yet.
alter table jobs add column if not exists summary text;
alter table findings add column if not exists fix text;
