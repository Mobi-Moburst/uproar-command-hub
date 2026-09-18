GRANT UPDATE ON public.pitch_followups TO authenticated;

CREATE POLICY "Senders can update their own scheduled follow-ups"
ON public.pitch_followups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pitch_sends s
    WHERE s.id = pitch_followups.send_id
      AND s.sender_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pitch_sends s
    WHERE s.id = pitch_followups.send_id
      AND s.sender_user_id = auth.uid()
  )
);