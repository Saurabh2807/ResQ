-- =========================================================================
-- ResQ Supabase Backend Architecture - schema.sql (Updated)
-- Description: Complete PostgreSQL database schema, security rules, triggers,
--              storage, and realtime configuration.
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. CUSTOM ENUMS DEFINITIONS
-- =========================================================================

-- UI/Application Preference Mode (Note: NOT a user role/permission indicator)
CREATE TYPE public.user_mode AS ENUM ('need_help', 'can_help');

-- Categories of emergency resources
CREATE TYPE public.resource_category AS ENUM ('Blood', 'Transport', 'Medicine', 'Food', 'Shelter');

-- Types of resource posts (need help vs offer help)
CREATE TYPE public.resource_type AS ENUM ('need', 'offer');

-- Current status of the resource listing
CREATE TYPE public.resource_status AS ENUM ('active', 'fulfilled', 'cancelled');

-- Notification types
CREATE TYPE public.notification_type AS ENUM ('new_message', 'new_resource_match', 'help_request_response', 'emergency_alert');

-- =========================================================================
-- 2. TABLES SCHEMAS
-- =========================================================================

-- A. PROFILES TABLE
-- Stores profile details, linked directly to Supabase Auth users.
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL DEFAULT 'Anonymous',
    email text UNIQUE,
    phone_number text,
    profile_photo text, -- Path/URL of user profile photo
    current_mode public.user_mode NOT NULL DEFAULT 'need_help',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Documentation check rule:
COMMENT ON COLUMN public.profiles.current_mode IS 'current_mode is only a UI/application preference and not a user identity or permission system.';

-- B. RESOURCES TABLE
-- Stores emergency resources posted by users.
CREATE TABLE public.resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category public.resource_category NOT NULL,
    resource_type public.resource_type NOT NULL,
    title text NOT NULL,
    description text,
    location text NOT NULL, -- Text location (e.g. Arera Colony, Bhopal)
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    contact_number text NOT NULL, -- Direct resource specific contact number
    urgency_level text NOT NULL DEFAULT 'standard', -- 'urgent' or 'standard'
    status public.resource_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- C. CHATS TABLE
-- Stores one-to-one conversation channels between users.
CREATE TABLE public.chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_2 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- Ensure participants are unique individuals
    CONSTRAINT chats_participants_distinct CHECK (participant_1 <> participant_2)
);

-- Index to prevent duplicate threads between the same participants for the same resource.
-- Handles swapped positions (A, B, Res) vs (B, A, Res) dynamically.
CREATE UNIQUE INDEX chats_participants_resource_idx ON public.chats (
    least(participant_1, participant_2),
    greatest(participant_1, participant_2),
    coalesce(resource_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- D. MESSAGES TABLE
-- Stores messages belonging to chat channels.
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- E. NOTIFICATIONS TABLE
-- Stores notifications generated for users.
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb, -- Context metadata (e.g., chat_id, resource_id)
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 3. PROFILE VISIBILITY OPTION B (VIEW FOR SAFE ACCESS)
-- =========================================================================

-- View for safe public profiles. Excludes private fields (email and phone_number).
-- Accessible to all authenticated users.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id, 
    full_name, 
    profile_photo, 
    current_mode, 
    created_at
FROM public.profiles;

-- Adjust permissions on view
REVOKE ALL ON public.public_profiles FROM public, anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- A. PROFILES RLS Policies
-- Only owners can select their own full profile record (including email/phone)
CREATE POLICY "Profiles select own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Only owners can update their own profile details
CREATE POLICY "Profiles update own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Authenticated users can insert their own profiles (for completeness & future compatibility)
CREATE POLICY "Profiles insert authenticated" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- B. RESOURCES RLS Policies
-- Authenticated users can view active resources, or users can view their own posts regardless of status
CREATE POLICY "Resources select authenticated" ON public.resources
    FOR SELECT TO authenticated
    USING (status = 'active' OR auth.uid() = user_id);

-- Authenticated users can insert their own resources
CREATE POLICY "Resources insert authenticated" ON public.resources
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Resource owners can update their own resource postings
CREATE POLICY "Resources update own" ON public.resources
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Resource owners can delete their own resource postings
CREATE POLICY "Resources delete own" ON public.resources
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- C. CHATS RLS Policies
-- Chats can only be selected by either participant_1 or participant_2
CREATE POLICY "Chats select participants" ON public.chats
    FOR SELECT TO authenticated
    USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Chats can be created by authenticated users if they are part of it
CREATE POLICY "Chats insert participants" ON public.chats
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- D. MESSAGES RLS Policies
-- Messages can be selected if the user is a participant in the message's chat
CREATE POLICY "Messages select participants" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
              AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())
        )
    );

-- Messages can be sent by a participant if sender matches auth.uid()
CREATE POLICY "Messages insert sender" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
              AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())
        )
    );

-- Messages can be updated (e.g. marked as read) by the chat participants
CREATE POLICY "Messages update participants" ON public.messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
              AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
              AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())
        )
    );

-- E. NOTIFICATIONS RLS Policies
-- Notifications can only be viewed by the user they belong to
CREATE POLICY "Notifications select owner" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Notifications can only be marked as read (updated) by the owner
CREATE POLICY "Notifications update owner" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can insert their own notifications
CREATE POLICY "Notifications insert authenticated" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 5. AUTOMATIC PROFILE GENERATION TRIGGER
-- =========================================================================

-- Trigger function to automatically create public.profiles entries upon auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone_number, current_mode, profile_photo)
    VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Anonymous'),
        new.email,
        coalesce(new.raw_user_meta_data->>'phone_number', ''),
        'need_help',
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 6. STORAGE BUCKETS SETUP & STORAGE RLS POLICIES
-- =========================================================================

-- Populate storage buckets for profile photos and future resource images
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('resource-images', 'resource-images', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars RLS: Public read access
CREATE POLICY "Avatars read public" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'avatars');

-- Avatars RLS: Owner write access (requires structure like avatars/userId/photo.png)
CREATE POLICY "Avatars write owner" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Resource Images RLS: Authenticated read access
CREATE POLICY "Resource images read authenticated" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'resource-images');

-- Resource Images RLS: Owner write access (requires structure like resource-images/userId/image.jpg)
CREATE POLICY "Resource images write owner" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'resource-images' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'resource-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================================
-- 7. REALTIME SYSTEM CONFIGURATION
-- =========================================================================

-- Expose desired tables to the supabase_realtime publication for reactive clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========================================================================
-- 8. GLOBAL RESOURCE NOTIFICATION TRIGGER
-- =========================================================================

-- Trigger function to automatically create public.notifications entries for all users
-- whenever a new resource is inserted into public.resources.
CREATE OR REPLACE FUNCTION public.notify_new_resource()
RETURNS trigger AS $$
DECLARE
    profile_rec RECORD;
    user_name text;
    resource_type_str text;
BEGIN
    -- Get the full name of the user who posted the resource
    SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
    IF user_name IS NULL OR user_name = '' THEN
        user_name := 'Anonymous';
    END IF;

    -- Determine the resource type string (Request or Offer)
    IF NEW.resource_type = 'need' THEN
        resource_type_str := 'Request';
    ELSE
        resource_type_str := 'Offer';
    END IF;

    -- Loop through all profiles and insert a notification for each
    FOR profile_rec IN SELECT id FROM public.profiles LOOP
        INSERT INTO public.notifications (user_id, type, title, content, is_read, metadata)
        VALUES (
            profile_rec.id,
            'new_resource_match',
            user_name || ' posted a new ' || NEW.category || ' ' || resource_type_str,
            COALESCE(NEW.description, ''),
            false,
            jsonb_build_object('resource_id', NEW.id, 'posted_by', NEW.user_id)
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on insert into resources
CREATE OR REPLACE TRIGGER on_resource_created
    AFTER INSERT ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_resource();
