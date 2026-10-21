-- Private profile photos. Object names are <auth-user-id>/<uuid>.<extension>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'alefit-profile-avatars',
  'alefit-profile-avatars',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS alefit_profile_avatars_select_own ON storage.objects;
CREATE POLICY alefit_profile_avatars_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'alefit-profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'sub')
);

DROP POLICY IF EXISTS alefit_profile_avatars_insert_own ON storage.objects;
CREATE POLICY alefit_profile_avatars_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'alefit-profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'sub')
);

DROP POLICY IF EXISTS alefit_profile_avatars_delete_own ON storage.objects;
CREATE POLICY alefit_profile_avatars_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'alefit-profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'sub')
);
