ALTER POLICY "profiles read" ON public.profiles TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "comments read" ON public.comments TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "stories read" ON public.stories TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "posts read" ON public.posts TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE SELECT ON public.profiles, public.comments, public.stories, public.posts FROM anon;
GRANT SELECT ON public.profiles, public.comments, public.stories, public.posts TO authenticated;