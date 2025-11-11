-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_roles (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL UNIQUE,
	role text NOT NULL CHECK (role = ANY (ARRAY['SuperAdmin'::text, 'SupportAdmin'::text, 'ReadOnly'::text])),
	created_at timestamp with time zone DEFAULT now(),
	created_by uuid,
	is_active boolean DEFAULT true,
	CONSTRAINT admin_roles_pkey PRIMARY KEY (id),
	CONSTRAINT admin_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
	CONSTRAINT admin_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_logs (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	user_id uuid,
	device_hash text,
	action text NOT NULL,
	details jsonb,
	admin_id uuid,
	created_at timestamp with time zone DEFAULT now(),
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
	CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
	CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.blocked_ips (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	ip_address text NOT NULL UNIQUE,
	reason text NOT NULL,
	blocked_at timestamp with time zone DEFAULT now(),
	blocked_by uuid,
	expires_at timestamp with time zone,
	CONSTRAINT blocked_ips_pkey PRIMARY KEY (id),
	CONSTRAINT blocked_ips_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id)
);
CREATE TABLE public.devices (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	device_hash text NOT NULL UNIQUE,
	trial_count integer DEFAULT 0,
	first_seen timestamp with time zone DEFAULT now(),
	last_seen timestamp with time zone DEFAULT now(),
	last_user_id uuid,
	is_blocked boolean DEFAULT false,
	blocked_reason text,
	updated_at timestamp with time zone DEFAULT now(),
	CONSTRAINT devices_pkey PRIMARY KEY (id),
	CONSTRAINT devices_last_user_id_fkey FOREIGN KEY (last_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.promotions (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	name text NOT NULL,
	promo_type text NOT NULL CHECK (promo_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'trial_days'::text])),
	discount_value numeric,
	trial_days integer,
	start_date timestamp with time zone NOT NULL,
	end_date timestamp with time zone NOT NULL,
	target_plans ARRAY,
	display_text text,
	is_active boolean DEFAULT true,
	created_by uuid,
	created_at timestamp with time zone DEFAULT now(),
	CONSTRAINT promotions_pkey PRIMARY KEY (id),
	CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.sender_assignments (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL UNIQUE,
	smtp_email text NOT NULL,
	smtp_server text NOT NULL,
	smtp_port integer NOT NULL,
	smtp_password text NOT NULL,
	assigned_at timestamp with time zone DEFAULT now(),
	CONSTRAINT sender_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT sender_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.sender_pool (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	smtp_email text NOT NULL UNIQUE,
	smtp_server text NOT NULL,
	smtp_port integer NOT NULL DEFAULT 587,
	smtp_password text NOT NULL,
	assigned_count integer DEFAULT 0,
	max_users integer DEFAULT 100,
	is_active boolean DEFAULT true,
	last_test timestamp with time zone,
	created_at timestamp with time zone DEFAULT now(),
	CONSTRAINT sender_pool_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL,
	status text NOT NULL CHECK (status = ANY (ARRAY['trialing'::text, 'active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
	trial_ends_at timestamp with time zone,
	subscription_ends_at timestamp with time zone,
	plan_type text CHECK (plan_type = ANY (ARRAY['basic'::text, 'premium'::text, 'enterprise'::text])),
	device_hash text,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
	CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
