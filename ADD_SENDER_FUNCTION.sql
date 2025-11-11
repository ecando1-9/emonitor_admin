-- ===================================================
-- ADD SENDER POOL MANAGEMENT RPC FUNCTIONS
-- Date: 2025-11-12
-- ===================================================

-- Add email to sender pool (admin only)
CREATE OR REPLACE FUNCTION public.add_sender_secure(
  smtp_email_addr text,
  smtp_server text,
  smtp_port_num int,
  smtp_password_val text,
  admin_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_role text;
  sender_id uuid;
BEGIN
  -- Get the admin ID if not provided
  IF admin_id IS NULL THEN
    admin_id := auth.uid();
  END IF;

  -- Check if user is admin
  admin_role := public.get_admin_role(admin_id);
  
  IF admin_role NOT IN ('SuperAdmin', 'SupportAdmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only SuperAdmin and SupportAdmin can add senders';
  END IF;

  -- Insert into sender_pool
  INSERT INTO public.sender_pool (smtp_email, smtp_server, smtp_port, smtp_password, is_active)
  VALUES (smtp_email_addr, smtp_server, smtp_port_num, smtp_password_val, true)
  RETURNING id INTO sender_id;

  -- Log the action
  INSERT INTO public.audit_logs (action, details, admin_id)
  VALUES (
    'SENDER_ADDED',
    jsonb_build_object(
      'email', smtp_email_addr,
      'server', smtp_server,
      'port', smtp_port_num,
      'admin_role', admin_role
    ),
    admin_id
  );

  RETURN json_build_object(
    'success', true,
    'sender_id', sender_id,
    'email', smtp_email_addr
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_sender_secure(text, text, int, text, uuid) TO authenticated;

-- Toggle sender status (admin only)
CREATE OR REPLACE FUNCTION public.toggle_sender_status(
  sender_id uuid,
  is_active_val boolean,
  admin_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
  sender_email text;
BEGIN
  -- Get the admin ID if not provided
  IF admin_id IS NULL THEN
    admin_id := auth.uid();
  END IF;

  -- Check if user is admin
  admin_role := public.get_admin_role(admin_id);
  
  IF admin_role NOT IN ('SuperAdmin', 'SupportAdmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only SuperAdmin and SupportAdmin can manage senders';
  END IF;

  -- Get sender email
  SELECT smtp_email INTO sender_email
  FROM public.sender_pool
  WHERE id = sender_id;

  IF sender_email IS NULL THEN
    RAISE EXCEPTION 'Sender not found';
  END IF;

  -- Update sender status
  UPDATE public.sender_pool
  SET is_active = is_active_val
  WHERE id = sender_id;

  -- Log the action
  INSERT INTO public.audit_logs (action, details, admin_id)
  VALUES (
    'SENDER_STATUS_CHANGED',
    jsonb_build_object(
      'sender_id', sender_id,
      'email', sender_email,
      'is_active', is_active_val,
      'admin_role', admin_role
    ),
    admin_id
  );

  RETURN json_build_object(
    'success', true,
    'sender_id', sender_id,
    'is_active', is_active_val
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_sender_status(uuid, boolean, uuid) TO authenticated;
