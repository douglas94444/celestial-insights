-- Trigger: validate that both charts in a synastry belong to the creating user.
-- Prevents user A from referencing user B's chart UUID even if they guessed it.
CREATE OR REPLACE FUNCTION public.validate_synastry_chart_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c1_owner uuid;
  c2_owner uuid;
BEGIN
  SELECT user_id INTO c1_owner FROM public.charts WHERE id = NEW.chart1_id;
  SELECT user_id INTO c2_owner FROM public.charts WHERE id = NEW.chart2_id;

  IF c1_owner IS NULL OR c2_owner IS NULL THEN
    RAISE EXCEPTION 'Um ou ambos os mapas não existem.'
      USING ERRCODE = 'P0001';
  END IF;

  IF c1_owner != NEW.user_id OR c2_owner != NEW.user_id THEN
    RAISE EXCEPTION 'Ambos os mapas devem pertencer ao utilizador que cria a sinastria.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_synastry_chart_ownership
  BEFORE INSERT OR UPDATE ON public.synastries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_synastry_chart_ownership();
