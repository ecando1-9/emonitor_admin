-- ==============================================================================
-- FIX: RESTORE EMAIL ASSIGNMENTS & ENSURE RLS VISIBILITY
-- ==============================================================================

-- 1. VERIFY & FIX RLS POLICIES
--    Sometimes policies get dropped or become invalid. We re-apply them to be sure.
ALTER TABLE public.sender_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view sender_assignments" ON public.sender_assignments;
CREATE POLICY "Admins can view sender_assignments" 
ON public.sender_assignments FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "Admins can view sender_pool" ON public.sender_pool;
CREATE POLICY "Admins can view sender_pool" 
ON public.sender_pool FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND is_active = true)
);

-- 2. AUTO-ASSIGN EMAILS TO USERS WHO ARE MISSING THEM
--    This fixes the "empty" rows for users who had signup errors or manual creation.

DO $$
DECLARE
  unassigned_user RECORD;
  available_sender RECORD;
BEGIN
  FOR unassigned_user IN 
    SELECT id, email FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM public.sender_assignments)
  LOOP
    -- Find a sender
    SELECT * FROM public.sender_pool
    WHERE is_active = true
    ORDER BY assigned_count ASC, id ASC
    LIMIT 1
    INTO available_sender;

    IF available_sender IS NOT NULL THEN
      -- Assign
      INSERT INTO public.sender_assignments(user_id, sender_id)
      VALUES (unassigned_user.id, available_sender.id);
      
      -- Update count
      UPDATE public.sender_pool
      SET assigned_count = assigned_count + 1
      WHERE id = available_sender.id;
      
      RAISE NOTICE 'Auto-assigned sender % to user %', available_sender.smtp_email, unassigned_user.email;
    END IF;
  END LOOP;
END;
$$;

-- 3. REFRESH COUNTS (Just in case)
UPDATE public.sender_pool sp
SET assigned_count = (
    SELECT count(*)
    FROM public.sender_assignments sa
    WHERE sa.sender_id = sp.id
);
