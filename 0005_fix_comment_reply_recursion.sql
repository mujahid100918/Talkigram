CREATE OR REPLACE FUNCTION public.comment_parent_ok(_parent uuid, _post uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _parent IS NULL OR EXISTS (SELECT 1 FROM public.comments WHERE id = _parent AND post_id = _post)
$$;
REVOKE EXECUTE ON FUNCTION public.comment_parent_ok(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comment_parent_ok(uuid, uuid) TO authenticated;
DROP POLICY IF EXISTS "comments insert own" ON public.comments;
CREATE POLICY "comments insert own" ON public.comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id) AND public.comment_parent_ok(parent_id, post_id));