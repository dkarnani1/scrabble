-- 0005_rls.sql
-- Row Level Security policies for the participant-scoped tables. Writes happen via
-- service role from Server Actions; clients only get SELECT (and only on rows they
-- participate in).

-- ---- games --------------------------------------------------------------------------
create policy games_select_participant on public.games
  for select using (
    exists (
      select 1 from public.players p
      where p.game_id = games.id and p.user_id = auth.uid()
    )
  );

-- ---- players ------------------------------------------------------------------------
create policy players_select_participant on public.players
  for select using (
    exists (
      select 1 from public.players self
      where self.game_id = players.game_id and self.user_id = auth.uid()
    )
  );

-- ---- moves --------------------------------------------------------------------------
create policy moves_select_participant on public.moves
  for select using (
    exists (
      select 1 from public.players p
      where p.game_id = moves.game_id and p.user_id = auth.uid()
    )
  );

-- ---- invites ------------------------------------------------------------------------
-- Any authenticated user can resolve an invite by code (so the join-via-link flow works).
-- The code itself is high-entropy; brute-forcing one is impractical.
create policy invites_select_authenticated on public.invites
  for select using (auth.role() = 'authenticated');
