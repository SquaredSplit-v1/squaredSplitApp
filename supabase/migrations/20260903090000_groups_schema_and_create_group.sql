-- Groups schema + creation RPC
--
-- The `groups` / `group_members` tables already exist on some environments
-- (created outside migrations), so everything here is idempotent: running it
-- on an up-to-date project is a no-op, and on a fresh project it creates the
-- tables the app expects (see lib/supabase/groups.ts).

-- ── Tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  emoji text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Reads: members of a group can see the group, its members and its expenses.
-- Writes go through the create_group / add_group_members RPCs (SECURITY
-- DEFINER) so non-members can never mutate a group.
--
-- Membership is checked through a SECURITY DEFINER helper: referencing
-- group_members directly inside its own policy would recurse infinitely.

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.is_group_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'groups_member_select'
  ) THEN
    CREATE POLICY "groups_member_select" ON public.groups
      FOR SELECT USING (public.is_group_member(id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_member_select'
  ) THEN
    CREATE POLICY "group_members_member_select" ON public.group_members
      FOR SELECT USING (
        user_id = auth.uid() OR public.is_group_member(group_id)
      );
  END IF;
END
$$;

-- ── create_group RPC ──────────────────────────────────────────────────────
-- Creates a group, adds the caller as the first member and every invited
-- member, then returns the new group row. SECURITY DEFINER so the client only
-- needs the authenticated role.
CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_emoji text DEFAULT NULL,
  p_member_ids uuid[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'SS101: not authenticated';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'SS102: group name is required';
  END IF;

  IF array_length(p_member_ids, 1) IS NULL OR array_length(p_member_ids, 1) < 1 THEN
    RAISE EXCEPTION 'SS103: at least 1 other member is required';
  END IF;

  INSERT INTO public.groups (name, emoji)
  VALUES (btrim(p_name), p_emoji)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, v_caller);

  INSERT INTO public.group_members (group_id, user_id)
  SELECT v_group_id, m FROM unnest(p_member_ids) AS m
  WHERE m <> v_caller
  ON CONFLICT DO NOTHING;

  RETURN json_build_object(
    'id', g.id,
    'name', g.name,
    'emoji', g.emoji,
    'created_at', g.created_at
  )
  FROM public.groups g
  WHERE g.id = v_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group(text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group(text, text, uuid[]) TO authenticated;

-- ── add_group_members RPC ─────────────────────────────────────────────────
-- Lets an existing member invite more people to a group.
CREATE OR REPLACE FUNCTION public.add_group_members(
  p_group_id uuid,
  p_member_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'SS104: you are not a member of this group';
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  SELECT p_group_id, m FROM unnest(p_member_ids) AS m
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.add_group_members(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, uuid[]) TO authenticated;
