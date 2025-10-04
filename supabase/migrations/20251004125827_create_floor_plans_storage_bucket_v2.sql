/*
  # Create Floor Plans Storage Bucket

  ## Overview
  This migration creates a storage bucket for floor plan images and sets up appropriate access policies.

  ## Changes
  1. Create Storage Bucket
    - `floor-plans` bucket for storing floor plan images
    - Public access for viewing
    - Authenticated users can upload

  2. Security Policies
    - Anyone can view floor plan images (public read)
    - Authenticated users can upload to their own project folders
    - Users can only delete their own uploaded images
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own floor plans" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public can view floor plans"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'floor-plans');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload floor plans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'floor-plans'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow users to update their own floor plans
CREATE POLICY "Users can update own floor plans"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'floor-plans'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'floor-plans'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own floor plans
CREATE POLICY "Users can delete own floor plans"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'floor-plans'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);
