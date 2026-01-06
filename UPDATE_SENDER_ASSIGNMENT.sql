CREATE OR REPLACE FUNCTION update_sender_assignment_secure(
    target_user_id UUID,
    new_sender_id UUID,
    admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role TEXT;
    v_old_sender_id UUID;
    v_new_sender_email TEXT;
BEGIN
    -- 1. Verify Admin
    SELECT role INTO v_admin_role FROM admin_roles WHERE user_id = admin_id AND is_active = true;
    IF v_admin_role IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- 2. Validate New Sender (and get email for response)
    SELECT smtp_email INTO v_new_sender_email 
    FROM sender_pool 
    WHERE id = new_sender_id;

    IF v_new_sender_email IS NULL THEN
        RAISE EXCEPTION 'Sender not found in pool';
    END IF;

    -- 3. Update Assignment
    -- Check if assignment exists
    SELECT sender_id INTO v_old_sender_id FROM sender_assignments WHERE user_id = target_user_id;

    IF v_old_sender_id IS NOT NULL THEN
        -- Assignment exists. If sender is different, update.
        IF v_old_sender_id IS DISTINCT FROM new_sender_id THEN
            UPDATE sender_assignments
            SET 
                sender_id = new_sender_id,
                assigned_at = NOW()
            WHERE user_id = target_user_id;

            -- Update counts
            UPDATE sender_pool SET assigned_count = assigned_count - 1 WHERE id = v_old_sender_id;
            UPDATE sender_pool SET assigned_count = assigned_count + 1 WHERE id = new_sender_id;
        END IF;
    ELSE
         -- Insert if not exists
         INSERT INTO sender_assignments (user_id, sender_id, assigned_at)
         VALUES (target_user_id, new_sender_id, NOW());
         
         UPDATE sender_pool SET assigned_count = assigned_count + 1 WHERE id = new_sender_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'new_sender_id', new_sender_id,
        'new_sender_email', v_new_sender_email
    );
END;
$$;
