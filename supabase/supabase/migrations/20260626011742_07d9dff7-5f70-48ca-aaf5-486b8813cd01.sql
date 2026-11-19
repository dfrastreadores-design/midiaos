
CREATE OR REPLACE FUNCTION public.admin_cron_runs(_limit int DEFAULT 50)
RETURNS TABLE(jobid bigint, jobname text, status text, return_message text, start_time timestamptz, end_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT d.jobid, j.jobname, d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d
    LEFT JOIN cron.job j ON j.jobid = d.jobid
    ORDER BY d.start_time DESC
    LIMIT _limit;
EXCEPTION WHEN undefined_table THEN
  RETURN;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_cron_runs(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_runs(int) TO authenticated, service_role;
