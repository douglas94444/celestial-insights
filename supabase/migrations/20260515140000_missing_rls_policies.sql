-- UPDATE policy for synastries: functional gap — users need to be able to update their own synastries
CREATE POLICY "Users can update their own synastries"
  ON public.synastries FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE policy for interpretation_ai_cache: LGPD compliance — users can delete their own cached AI content
CREATE POLICY "Users can delete their own interpretation_ai_cache"
  ON public.interpretation_ai_cache FOR DELETE
  USING (auth.uid() = user_id);
