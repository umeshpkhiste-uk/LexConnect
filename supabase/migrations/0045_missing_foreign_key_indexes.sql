-- Indexes for foreign keys that had none (flagged by the performance
-- advisor). Without these, every lookup by the referencing column — e.g.
-- "messages sent by me", "conversations I'm in", "who reacted to this
-- comment" — falls back to a sequential scan once a table grows past a
-- trivial size, which is exactly the kind of query that gets *sometimes*
-- slow as data accumulates rather than reliably slow from day one.

create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_reply_to_id_idx on public.messages (reply_to_id);
create index if not exists conversations_participant_one_id_idx on public.conversations (participant_one_id);
create index if not exists conversations_participant_two_id_idx on public.conversations (participant_two_id);
create index if not exists comments_author_id_idx on public.comments (author_id);
create index if not exists comment_reactions_user_id_idx on public.comment_reactions (user_id);
create index if not exists reactions_user_id_idx on public.reactions (user_id);
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);
create index if not exists tasks_client_id_idx on public.tasks (client_id);
