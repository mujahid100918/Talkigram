CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like','comment','reply','follow','friend_request','friend_accept','share','mention','reel_like','reel_comment')),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, actor_id, type, post_id, comment_id)
);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications delete own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o uuid; k text;
BEGIN
  SELECT user_id, kind INTO o, k FROM posts WHERE id = NEW.post_id;
  IF o IS NULL OR o = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO notifications (user_id, actor_id, type, post_id)
  VALUES (o, NEW.user_id, CASE WHEN k = 'reel' THEN 'reel_like' ELSE 'like' END, NEW.post_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.notify_like();

CREATE OR REPLACE FUNCTION public.notify_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o uuid; k text; p uuid; t uuid; m record;
BEGIN
  SELECT user_id, kind INTO o, k FROM posts WHERE id = NEW.post_id;
  IF NEW.parent_id IS NULL THEN
    IF o IS NOT NULL AND o <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (o, NEW.user_id, CASE WHEN k = 'reel' THEN 'reel_comment' ELSE 'comment' END, NEW.post_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    SELECT user_id INTO p FROM comments WHERE id = NEW.parent_id;
    IF p IS NOT NULL AND p <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (p, NEW.user_id, 'reply', NEW.post_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  FOR m IN SELECT DISTINCT (regexp_matches(NEW.body, '@([A-Za-z0-9_]+)', 'g'))[1] AS uname LOOP
    SELECT id INTO t FROM profiles WHERE username = m.uname;
    IF t IS NOT NULL AND t <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (t, NEW.user_id, 'mention', NEW.post_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

CREATE OR REPLACE FUNCTION public.notify_post_mention() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t uuid; m record;
BEGIN
  IF NEW.caption IS NULL THEN RETURN NEW; END IF;
  FOR m IN SELECT DISTINCT (regexp_matches(NEW.caption, '@([A-Za-z0-9_]+)', 'g'))[1] AS uname LOOP
    SELECT id INTO t FROM profiles WHERE username = m.uname;
    IF t IS NOT NULL AND t <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id)
      VALUES (t, NEW.user_id, 'mention', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_post_mention AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_post_mention();

CREATE OR REPLACE FUNCTION public.notify_follow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

CREATE OR REPLACE FUNCTION public.notify_friendship() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (NEW.recipient_id, NEW.requester_id, 'friend_request')
    ON CONFLICT DO NOTHING;
  ELSIF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (NEW.requester_id, NEW.recipient_id, 'friend_accept')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_friendship AFTER INSERT OR UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.notify_friendship();

CREATE OR REPLACE FUNCTION public.notify_share() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o uuid;
BEGIN
  SELECT user_id INTO o FROM posts WHERE id = NEW.post_id;
  IF o IS NULL OR o = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO notifications (user_id, actor_id, type, post_id)
  VALUES (o, NEW.user_id, 'share', NEW.post_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_share AFTER INSERT ON public.shares FOR EACH ROW EXECUTE FUNCTION public.notify_share();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;