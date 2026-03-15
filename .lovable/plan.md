

# Add FIFO Configuration Columns to onboarding_data

Add four nullable text columns to `onboarding_data` for FIFO shift/sleep persistence:

## Migration SQL

```sql
ALTER TABLE public.onboarding_data
  ADD COLUMN fifo_shift_start text DEFAULT NULL,
  ADD COLUMN fifo_shift_end text DEFAULT NULL,
  ADD COLUMN fifo_on_site_wake_time text DEFAULT NULL,
  ADD COLUMN fifo_on_site_bedtime text DEFAULT NULL;
```

No code changes needed — these columns will be available via the auto-generated types after the migration runs.

