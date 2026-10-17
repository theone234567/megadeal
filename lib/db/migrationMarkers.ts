/**
 * One marker per file in supabase/migrations: something that file creates.
 * Its test fails when a migration is added without one.
 */
export const MIGRATION_MARKERS: { file: string; sql: string }[] = [
  { file: "20261006000000_initial_schema.sql", sql: "to_regclass('public.merchants') is not null" },
  { file: "20261007000000_business_slug_id.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'merchants' and column_name = 'slug_id')" },
  { file: "20261008000000_data_layer.sql", sql: "to_regclass('public.site_settings') is not null" },
  { file: "20261009000000_clean_slugs.sql", sql: "to_regclass('public.slug_redirects') is not null" },
  { file: "20261010000000_slug_priority.sql", sql: "to_regprocedure('public.free_merchant_slug(text,uuid,integer)') is not null" },
  { file: "20261011000000_unsubscribe_links.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_signups' and column_name = 'old_unsubscribe_token_hashes')" },
  { file: "20261012000000_function_grants.sql", sql: "not has_function_privilege('anon', 'public.free_merchant_slug(text,uuid,integer)', 'execute')" },
  { file: "20261013000000_slug_apostrophes.sql", sql: "public.slugify('Joe''s') = 'joes'" },
  { file: "20261014000000_hidden_address.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'merchants' and column_name = 'hide_address')" },
  { file: "20261015000000_visit_type.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'merchants' and column_name = 'visit_type')" },
  { file: "20261016000000_security_tokens.sql", sql: "to_regclass('public.rate_limits') is not null" },
  { file: "20261017000000_deal_provenance.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'deals' and column_name = 'content_updated_at')" },
  { file: "20261018000000_deal_gallery.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'deals' and column_name = 'gallery')" },
  { file: "20261019000000_booking_contact.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'deals' and column_name = 'contact_override')" },
  { file: "20261020000000_deal_codes.sql", sql: "to_regclass('public.deal_codes') is not null" },
  { file: "20261021000000_deal_events.sql", sql: "to_regclass('public.deal_events') is not null" },
  { file: "20261022000000_credit_rescale.sql", sql: "to_regclass('public.credit_rescale_log') is not null" },
  { file: "20261023000000_test_businesses.sql", sql: "exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'merchants' and column_name = 'is_test')" },
  { file: "20261024000000_mark_test_businesses.sql", sql: "to_regclass('public.test_business_marks') is not null" },
];
