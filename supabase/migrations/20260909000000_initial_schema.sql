-- Create users table profile extension
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  free_credits integer default 1 not null,
  paid_credits integer default 0 not null,
  is_admin boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subjects table
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  course_code text not null,
  name text not null,
  program text not null,
  semester integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(course_code, program)
);

-- Create generated_papers table
create table public.generated_papers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete restrict not null,
  syllabus_text text not null,
  predicted_paper text not null, -- Markdown content of the predicted paper
  is_interactive boolean default false not null, -- True if unlocked with paid credit
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.generated_papers enable row level security;

-- Profiles: Users can read and update their own profile
create policy "Users can view own profile."
  on profiles for select
  using ( auth.uid() = id );
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Subjects: Everyone can read subjects
create policy "Anyone can view subjects."
  on subjects for select
  using ( true );

-- Generated Papers: Users can read and create their own papers
create policy "Users can view own papers."
  on generated_papers for select
  using ( auth.uid() = user_id );
create policy "Users can insert own papers."
  on generated_papers for insert
  with check ( auth.uid() = user_id );

-- Function to handle new user signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
