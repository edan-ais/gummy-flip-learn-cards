
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  is_sample boolean not null default false,
  title text not null,
  color text not null default 'coral',
  created_at timestamptz not null default now()
);
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  owner_id uuid,
  is_sample boolean not null default false,
  title text not null,
  exam_date date,
  status text not null default 'ready',
  error text,
  created_at timestamptz not null default now()
);

create or replace function public.can_read_exam(_exam uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exams e where e.id = _exam and (e.is_sample or e.owner_id = auth.uid()))
$$;
create or replace function public.can_write_exam(_exam uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exams e where e.id = _exam and e.owner_id = auth.uid())
$$;
create or replace function public.can_write_course(_course uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses c where c.id = _course and c.owner_id = auth.uid())
$$;

grant select, insert, update, delete on public.courses, public.exams to authenticated;
grant all on public.courses, public.exams to service_role;
alter table public.courses enable row level security;
alter table public.exams enable row level security;
create policy "read courses" on public.courses for select to authenticated using (is_sample or owner_id = auth.uid());
create policy "insert courses" on public.courses for insert to authenticated with check (owner_id = auth.uid() and not is_sample);
create policy "update courses" on public.courses for update to authenticated using (owner_id = auth.uid());
create policy "delete courses" on public.courses for delete to authenticated using (owner_id = auth.uid());
create policy "read exams" on public.exams for select to authenticated using (is_sample or owner_id = auth.uid());
create policy "insert exams" on public.exams for insert to authenticated with check (owner_id = auth.uid() and not is_sample and public.can_write_course(course_id));
create policy "update exams" on public.exams for update to authenticated using (owner_id = auth.uid());
create policy "delete exams" on public.exams for delete to authenticated using (owner_id = auth.uid());

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  position int not null default 0,
  title text not null,
  summary text not null default ''
);
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  name text not null,
  mime text not null default 'text/plain',
  storage_path text,
  extracted_text text not null default '',
  created_at timestamptz not null default now()
);
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  position int not null default 0,
  q text not null,
  a text not null,
  source text not null default ''
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  position int not null default 0,
  q text not null,
  a text not null
);
create table public.podcasts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  position int not null default 0,
  title text not null,
  detail text not null default '',
  script text not null default '',
  audio_urls text[] not null default '{}',
  storage_paths text[] not null default '{}',
  status text not null default 'empty'
);
create index on public.sections(exam_id);
create index on public.cards(exam_id);
create index on public.questions(exam_id);
create index on public.materials(exam_id);
create index on public.podcasts(exam_id);

grant select, insert, update, delete on public.sections, public.materials, public.cards, public.questions, public.podcasts to authenticated;
grant all on public.sections, public.materials, public.cards, public.questions, public.podcasts to service_role;
alter table public.sections enable row level security;
alter table public.materials enable row level security;
alter table public.cards enable row level security;
alter table public.questions enable row level security;
alter table public.podcasts enable row level security;
create policy "read" on public.sections for select to authenticated using (public.can_read_exam(exam_id));
create policy "write" on public.sections for all to authenticated using (public.can_write_exam(exam_id)) with check (public.can_write_exam(exam_id));
create policy "read" on public.materials for select to authenticated using (public.can_read_exam(exam_id));
create policy "write" on public.materials for all to authenticated using (public.can_write_exam(exam_id)) with check (public.can_write_exam(exam_id));
create policy "read" on public.cards for select to authenticated using (public.can_read_exam(exam_id));
create policy "write" on public.cards for all to authenticated using (public.can_write_exam(exam_id)) with check (public.can_write_exam(exam_id));
create policy "read" on public.questions for select to authenticated using (public.can_read_exam(exam_id));
create policy "write" on public.questions for all to authenticated using (public.can_write_exam(exam_id)) with check (public.can_write_exam(exam_id));
create policy "read" on public.podcasts for select to authenticated using (public.can_read_exam(exam_id));
create policy "write" on public.podcasts for all to authenticated using (public.can_write_exam(exam_id)) with check (public.can_write_exam(exam_id));

create table public.review_state (
  user_id uuid not null,
  item_id uuid not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  kind text not null default 'card',
  ease real not null default 2.5,
  interval_days real not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create table public.study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  kind text not null,
  value text,
  created_at timestamptz not null default now()
);
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_ids uuid[] not null,
  results jsonb not null default '{}'::jsonb,
  finished boolean not null default false,
  retake_of uuid,
  created_at timestamptz not null default now()
);
create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  body text not null,
  source text not null default 'typed',
  created_at timestamptz not null default now()
);
create index on public.study_events(user_id, created_at);
grant select, insert, update, delete on public.review_state, public.study_events, public.exam_attempts, public.personal_notes to authenticated;
grant all on public.review_state, public.study_events, public.exam_attempts, public.personal_notes to service_role;
alter table public.review_state enable row level security;
alter table public.study_events enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.personal_notes enable row level security;
create policy "own" on public.review_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_exam(exam_id));
create policy "own" on public.study_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_exam(exam_id));
create policy "own" on public.exam_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_exam(exam_id));
create policy "own" on public.personal_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_exam(exam_id));
