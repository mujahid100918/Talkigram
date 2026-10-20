ALTER POLICY "media read" ON storage.objects TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
ALTER POLICY "likes read" ON public.likes TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE SELECT ON public.likes FROM anon;