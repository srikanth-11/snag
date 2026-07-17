-- Richer findings: category (accessibility/error/network/visual/ux/performance),
-- a docs link (axe/WCAG rule help), and the affected element selector.
alter table findings add column if not exists category text;
alter table findings add column if not exists docs_url text;
alter table findings add column if not exists selector text;
