-- LGPD/GDPR: users have the right to delete their own event data (Art. 18 LGPD).
-- These tables had SELECT + INSERT policies but no DELETE policy.

CREATE POLICY "Users can delete own chart_preview_calc_events"
  ON public.chart_preview_calc_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own engagement events"
  ON public.user_engagement_events FOR DELETE
  USING (auth.uid() = user_id);

-- Explicit deny-all UPDATE for interpretation_ai_cache (immutable cache records).
-- Prevents accidental future code from updating cache without a policy.
CREATE POLICY "interpretation_ai_cache rows are immutable"
  ON public.interpretation_ai_cache FOR UPDATE
  USING (false)
  WITH CHECK (false);
