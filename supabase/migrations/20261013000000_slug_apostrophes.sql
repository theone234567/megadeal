-- Apostrophes vanish from page addresses instead of becoming a hyphen:
-- "Joe's Pizza" -> joes-pizza, not joe-s-pizza (8 Oct 2026, found on a
-- demo deal, "today's" -> today-s). Addresses already given don't change
-- (they're kept once given); this only shapes new ones.
create or replace function public.slugify(value text) returns text
language sql immutable as $$
  select trim(both '-' from left(trim(both '-' from regexp_replace(
    translate(lower(regexp_replace(coalesce(value, ''), '[''’‘ʼ`]', '', 'g')),
      'āēīōūàáâãäåèéêëìíîïòóôõöùúûüýÿñçœæ',
      'aeiouaaaaaaeeeeiiiiooooouuuuyyncoa'),
    '[^a-z0-9]+', '-', 'g')), 80));
$$;
