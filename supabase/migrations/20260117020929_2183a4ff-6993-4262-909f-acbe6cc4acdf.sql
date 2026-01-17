-- Create blocked_times table
CREATE TABLE public.blocked_times (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  reason text,
  is_full_day boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (
    is_full_day = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Enable RLS
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

-- Admins can manage all blocked times
CREATE POLICY "Admins can manage blocked times"
ON public.blocked_times
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view blocked times (for availability check)
CREATE POLICY "Authenticated users can view blocked times"
ON public.blocked_times
FOR SELECT
TO authenticated
USING (true);