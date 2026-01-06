-- ========================================
-- FIX PLAN ANALYTICS FUNCTION
-- ========================================

-- Drop the existing function to ensure we can recreate it with the correct return type
DROP FUNCTION IF EXISTS public.get_plan_analytics();

-- Rereate the function with the exact structure expected by the frontend
CREATE OR REPLACE FUNCTION public.get_plan_analytics()
RETURNS TABLE (
  plan_id text,
  plan_name text,
  price integer,
  features text[],
  subscriber_count bigint,
  trialing_count bigint,
  active_count bigint,
  estimated_monthly_revenue numeric,
  promotions_used jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as plan_id,
    p.name as plan_name,
    p.price,
    p.features::text[] as features,
    
    -- Count total subscribers for this plan
    (SELECT COUNT(*) FROM public.subscriptions s WHERE s.plan_id = p.id) as subscriber_count,
    
    -- Count trialing subscribers
    (SELECT COUNT(*) FROM public.subscriptions s WHERE s.plan_id = p.id AND s.status = 'trialing') as trialing_count,
    
    -- Count active subscribers
    (SELECT COUNT(*) FROM public.subscriptions s WHERE s.plan_id = p.id AND s.status = 'active') as active_count,
    
    -- Calculate generic estimated revenue (active_count * price)
    -- This is an estimate; real revenue logic might be more complex
    (
      (SELECT COUNT(*) FROM public.subscriptions s WHERE s.plan_id = p.id AND s.status = 'active') * p.price
    )::numeric as estimated_monthly_revenue,

    -- Aggregate promotions targeting this plan
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', pr.code,
            'type', pr.promo_type,
            'value', COALESCE(pr.discount_value, 0)
          )
        )
        FROM public.promotions pr
        WHERE pr.target_plans @> ARRAY[p.id]::text[]
        AND pr.is_active = true
      ),
      '[]'::jsonb
    ) as promotions_used

  FROM public.plans p
  ORDER BY p.price DESC;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.get_plan_analytics() TO authenticated;
