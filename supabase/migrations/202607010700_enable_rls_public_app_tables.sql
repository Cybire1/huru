-- Enable Row Level Security for legacy/public app tables reported by Supabase.
-- This migration is defensive: every table/column check is conditional so it can
-- run against environments where some of these tables do not exist.

create or replace function pg_temp.has_public_table(p_table text)
returns boolean
language sql
stable
as $$
  select to_regclass(format('public.%I', p_table)) is not null;
$$;

create or replace function pg_temp.has_public_column(p_table text, p_column text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table
      and column_name = p_column
  );
$$;

create or replace function pg_temp.first_public_column(
  p_table text,
  p_candidates text[]
)
returns text
language plpgsql
stable
as $$
declare
  candidate text;
begin
  foreach candidate in array p_candidates loop
    if pg_temp.has_public_column(p_table, candidate) then
      return candidate;
    end if;
  end loop;

  return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'waitlist',
    'user_stats',
    'user_progress',
    'achievements',
    'analytics_events',
    'classes',
    'class_bookings',
    'class_donations',
    'users',
    'class_messages'
  ] loop
    if pg_temp.has_public_table(table_name) then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end;
$$;

-- Public write-only intake tables. Do not expose reads to anon/authenticated
-- clients; use service-role/admin paths to inspect submissions.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['waitlist', 'analytics_events'] loop
    if pg_temp.has_public_table(table_name) then
      execute format(
        'drop policy if exists %I on public.%I',
        table_name || '_insert_public',
        table_name
      );
      execute format(
        'create policy %I on public.%I for insert to anon, authenticated with check (true)',
        table_name || '_insert_public',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- Public read-only catalog tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['achievements', 'classes'] loop
    if pg_temp.has_public_table(table_name) then
      execute format(
        'drop policy if exists %I on public.%I',
        table_name || '_select_public',
        table_name
      );
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        table_name || '_select_public',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- User-owned tables. The migration supports common owner column names so it can
-- adapt to schemas that use user_id, auth_user_id, auth_id, auth_uid,
-- owner_id, profile_id, or student/member ids.
do $$
declare
  table_name text;
  owner_column text;
  owner_check text;
  owner_columns constant text[] := array[
    'user_id',
    'auth_user_id',
    'auth_id',
    'auth_uid',
    'owner_id',
    'profile_id',
    'student_id',
    'member_id'
  ];
begin
  foreach table_name in array array[
    'user_stats',
    'user_progress',
    'class_bookings',
    'class_donations'
  ] loop
    if pg_temp.has_public_table(table_name) then
      owner_column := pg_temp.first_public_column(table_name, owner_columns);

      if owner_column is not null then
        owner_check := format('%I::text = auth.uid()::text', owner_column);

        execute format(
          'drop policy if exists %I on public.%I',
          table_name || '_select_own',
          table_name
        );
        execute format(
          'create policy %I on public.%I for select to authenticated using (%s)',
          table_name || '_select_own',
          table_name,
          owner_check
        );

        execute format(
          'drop policy if exists %I on public.%I',
          table_name || '_insert_own',
          table_name
        );
        execute format(
          'create policy %I on public.%I for insert to authenticated with check (%s)',
          table_name || '_insert_own',
          table_name,
          owner_check
        );

        execute format(
          'drop policy if exists %I on public.%I',
          table_name || '_update_own',
          table_name
        );
        execute format(
          'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
          table_name || '_update_own',
          table_name,
          owner_check,
          owner_check
        );

        execute format(
          'drop policy if exists %I on public.%I',
          table_name || '_delete_own',
          table_name
        );
        execute format(
          'create policy %I on public.%I for delete to authenticated using (%s)',
          table_name || '_delete_own',
          table_name,
          owner_check
        );
      end if;
    end if;
  end loop;
end;
$$;

-- Profile table. Many Supabase apps use public.users(id) = auth.users.id; some
-- older tables only have an email field. Prefer uid columns, fall back to email.
do $$
declare
  owner_column text;
  owner_check text;
begin
  if pg_temp.has_public_table('users') then
    owner_column := pg_temp.first_public_column(
      'users',
      array[
        'id',
        'user_id',
        'auth_user_id',
        'auth_id',
        'auth_uid',
        'owner_id',
        'profile_id',
        'email'
      ]
    );

    if owner_column is not null then
      if owner_column = 'email' then
        owner_check := format('%I = auth.jwt() ->> ''email''', owner_column);
      else
        owner_check := format('%I::text = auth.uid()::text', owner_column);
      end if;

      execute 'drop policy if exists users_select_own on public.users';
      execute format(
        'create policy users_select_own on public.users for select to authenticated using (%s)',
        owner_check
      );

      execute 'drop policy if exists users_insert_own on public.users';
      execute format(
        'create policy users_insert_own on public.users for insert to authenticated with check (%s)',
        owner_check
      );

      execute 'drop policy if exists users_update_own on public.users';
      execute format(
        'create policy users_update_own on public.users for update to authenticated using (%s) with check (%s)',
        owner_check,
        owner_check
      );

      execute 'drop policy if exists users_delete_own on public.users';
      execute format(
        'create policy users_delete_own on public.users for delete to authenticated using (%s)',
        owner_check
      );
    end if;
  end if;
end;
$$;

-- Class messages are user-owned for writes, and readable by booked
-- participants when class_id exists on both messages and bookings.
do $$
declare
  message_owner_column text;
  booking_owner_column text;
begin
  if pg_temp.has_public_table('class_messages') then
    message_owner_column := pg_temp.first_public_column(
      'class_messages',
      array['user_id', 'sender_id', 'auth_user_id', 'owner_id']
    );

    if message_owner_column is not null then
      execute 'drop policy if exists class_messages_select_own on public.class_messages';
      execute format(
        'create policy class_messages_select_own on public.class_messages for select to authenticated using (%I::text = auth.uid()::text)',
        message_owner_column
      );

      execute 'drop policy if exists class_messages_insert_own on public.class_messages';
      execute format(
        'create policy class_messages_insert_own on public.class_messages for insert to authenticated with check (%I::text = auth.uid()::text)',
        message_owner_column
      );

      execute 'drop policy if exists class_messages_update_own on public.class_messages';
      execute format(
        'create policy class_messages_update_own on public.class_messages for update to authenticated using (%I::text = auth.uid()::text) with check (%I::text = auth.uid()::text)',
        message_owner_column,
        message_owner_column
      );

      execute 'drop policy if exists class_messages_delete_own on public.class_messages';
      execute format(
        'create policy class_messages_delete_own on public.class_messages for delete to authenticated using (%I::text = auth.uid()::text)',
        message_owner_column
      );
    end if;

    if pg_temp.has_public_column('class_messages', 'class_id')
      and pg_temp.has_public_table('class_bookings')
      and pg_temp.has_public_column('class_bookings', 'class_id')
    then
      booking_owner_column := pg_temp.first_public_column(
        'class_bookings',
        array['user_id', 'auth_user_id', 'owner_id', 'profile_id']
      );

      if booking_owner_column is not null then
        execute 'drop policy if exists class_messages_select_participants on public.class_messages';
        execute format(
          'create policy class_messages_select_participants on public.class_messages for select to authenticated using (exists (select 1 from public.class_bookings b where b.class_id::text = class_messages.class_id::text and b.%I::text = auth.uid()::text))',
          booking_owner_column
        );
      end if;
    end if;
  end if;
end;
$$;
