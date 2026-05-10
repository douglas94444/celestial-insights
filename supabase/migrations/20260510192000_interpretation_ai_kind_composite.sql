DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'interpretation_ai_kind'
      AND e.enumlabel = 'composite'
  ) THEN
    ALTER TYPE public.interpretation_ai_kind ADD VALUE 'composite';
  END IF;
END $$;
