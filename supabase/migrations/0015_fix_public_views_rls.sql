-- Fixes a real bug: public_advocate_profiles and advocate_network_stats were
-- both created with security_invoker = true in earlier migrations. For a
-- view whose entire purpose is to expose a *curated, safe* cross-section of
-- an otherwise owner-only-RLS table, that's backwards — security_invoker
-- means the view inherits the CALLER's RLS on the underlying table, and
-- advocate_profiles' own policy is "you may only read your own row." So
-- these views could structurally never return any row but your own,
-- regardless of profile_visibility or who's asking — search/discover and
-- viewing another advocate's follower/connection counts were broken for
-- everyone, always, by construction.
--
-- The fix: security_invoker = false (the default). Both views are owned by
-- a role that bypasses RLS on the base tables, so they can see every row —
-- and the view's own WHERE clause / aggregation is what stays the actual
-- security boundary:
--   - public_advocate_profiles already omits every sensitive column
--     (bar registration number, verification notes, etc.) and filters to
--     profile_visibility in ('public', 'connections_only').
--   - advocate_network_stats only ever exposes counts, never raw rows —
--     safe to compute across all of follows/connections regardless of who's
--     asking.

alter view public.public_advocate_profiles set (security_invoker = false);
alter view public.advocate_network_stats set (security_invoker = false);
