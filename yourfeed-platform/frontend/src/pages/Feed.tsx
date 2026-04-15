import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, EventPayload, FeedPost, SessionStartResponse } from "../lib/api";
import { DwellTracker } from "../lib/dwellTracker";
import "../styles/feed.css";

type EngagementState = {
  liked: Set<string>;
  retweeted: Set<string>;
  bookmarked: Set<string>;
};

export function Feed() {
  const { studyId } = useParams<{ studyId: string }>();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<SessionStartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<EngagementState>({
    liked: new Set(),
    retweeted: new Set(),
    bookmarked: new Set(),
  });
  const [completed, setCompleted] = useState(false);

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<DwellTracker | null>(null);
  const sessionStartTime = useRef<number>(performance.now());
  const eventQueueRef = useRef<EventPayload[]>([]);

  // Boot session
  useEffect(() => {
    if (!studyId) return;
    const pid = searchParams.get("participant_id") || `anon_${crypto.randomUUID().slice(0, 8)}`;
    const urlParams: Record<string, string> = {};
    searchParams.forEach((v, k) => (urlParams[k] = v));

    api
      .startSession(studyId, pid, urlParams)
      .then((res) => {
        setSession(res);
        sessionStartTime.current = performance.now();
      })
      .catch((e: Error) => setError(e.message));
  }, [studyId, searchParams]);

  // Set up dwell tracker once the feed is rendered
  useEffect(() => {
    if (!session || !feedContainerRef.current) return;

    const tracker = new DwellTracker(feedContainerRef.current);
    trackerRef.current = tracker;

    const postEls = feedContainerRef.current.querySelectorAll<HTMLDivElement>(".feed-post");
    postEls.forEach((el, idx) => {
      const postId = el.getAttribute("data-post-id-raw");
      if (postId) tracker.register(el, postId, idx);
    });

    return () => {
      tracker.destroy();
    };
  }, [session]);

  // Periodic event flush
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      flushEvents(session.participant_id);
    }, 5000);
    return () => window.clearInterval(id);
  }, [session]);

  const logEvent = (e: EventPayload) => {
    eventQueueRef.current.push(e);
  };

  const flushEvents = async (participantId: string) => {
    if (eventQueueRef.current.length === 0) return;
    const batch = eventQueueRef.current;
    eventQueueRef.current = [];
    try {
      await api.sendEvents(participantId, batch);
    } catch (err) {
      // Re-queue on failure
      eventQueueRef.current = [...batch, ...eventQueueRef.current];
      console.warn("Event flush failed, will retry:", err);
    }
  };

  const toggleAction = (action: "like" | "retweet" | "bookmark", post: FeedPost) => {
    setEngagement((prev) => {
      const set = new Set(
        action === "like" ? prev.liked : action === "retweet" ? prev.retweeted : prev.bookmarked
      );
      const isActive = !set.has(post.external_id);
      if (isActive) set.add(post.external_id);
      else set.delete(post.external_id);

      logEvent({
        event_type: action,
        client_timestamp_ms: Math.round(performance.now() - sessionStartTime.current),
        post_external_id: post.external_id,
        position_in_feed: post.position,
        payload: { active: isActive },
      });

      return {
        liked: action === "like" ? set : prev.liked,
        retweeted: action === "retweet" ? set : prev.retweeted,
        bookmarked: action === "bookmark" ? set : prev.bookmarked,
      };
    });
  };

  const handleComplete = async () => {
    if (!session) return;

    // Flush dwell data as events
    const dwellRecords = trackerRef.current?.snapshot() || [];
    for (const r of dwellRecords) {
      logEvent({
        event_type: "dwell",
        client_timestamp_ms: Math.round(performance.now() - sessionStartTime.current),
        post_external_id: r.postId,
        position_in_feed: r.position,
        duration_ms: r.totalMs,
        payload: {
          visible_1s: r.visible1s,
          visible_3s: r.visible3s,
          visible_5s: r.visible5s,
        },
      });
    }

    await flushEvents(session.participant_id);
    await api.endSession(session.study_id, session.participant_id);
    setCompleted(true);

    if (session.redirect_url) {
      window.location.href = session.redirect_url;
    }
  };

  if (error) return <div className="feed-error">Error: {error}</div>;
  if (!session) return <div className="feed-loading">Loading feed…</div>;

  if (completed) {
    return (
      <div className="feed-completed">
        <h2>Thank you!</h2>
        <p>Your responses have been recorded.</p>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div className="feed-wrapper" style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="feed-header">
          <div className="feed-header-title">Home</div>
          <div className="feed-header-tabs">
            <div className="feed-header-tab active">For you</div>
            <div className="feed-header-tab">Following</div>
          </div>
        </div>

        <div
          ref={feedContainerRef}
          className="feed-container"
          style={{ height: `${session.feed_height_px}px` }}
        >
          {session.posts.map((post) => {
            const initials = post.author
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2);
            const liked = engagement.liked.has(post.external_id);
            const retweeted = engagement.retweeted.has(post.external_id);
            const bookmarked = engagement.bookmarked.has(post.external_id);

            return (
              <div
                key={post.external_id}
                className="feed-post"
                data-post-id-raw={post.external_id}
              >
                <div className="feed-post-header">
                  <div
                    className="feed-avatar"
                    style={{ background: post.avatar_color }}
                  >
                    {initials}
                  </div>
                  <div className="feed-post-body">
                    <div className="feed-author-line">
                      <span className="feed-author-name">{post.author}</span>
                      <span className="feed-author-handle">{post.handle}</span>
                      <span className="feed-dot">·</span>
                      <span className="feed-timestamp">{post.timestamp_label}</span>
                    </div>
                    <div className="feed-post-text">{post.text}</div>
                    <div className="feed-actions">
                      <button className="feed-action-btn reply" type="button">
                        <span className="feed-icon">💬</span>
                        <span className="feed-action-count">{formatCount(post.replies)}</span>
                      </button>
                      <button
                        className={`feed-action-btn retweet ${retweeted ? "active" : ""}`}
                        type="button"
                        onClick={() => toggleAction("retweet", post)}
                      >
                        <span className="feed-icon feed-icon-retweet">↻</span>
                        <span className="feed-action-count">{formatCount(post.retweets)}</span>
                      </button>
                      <button
                        className={`feed-action-btn like ${liked ? "active" : ""}`}
                        type="button"
                        onClick={() => toggleAction("like", post)}
                      >
                        <span className="feed-icon feed-icon-heart">{liked ? "♥" : "♡"}</span>
                        <span className="feed-action-count">{formatCount(post.likes)}</span>
                      </button>
                      <button
                        className={`feed-action-btn bookmark ${bookmarked ? "active" : ""}`}
                        type="button"
                        onClick={() => toggleAction("bookmark", post)}
                      >
                        <span className="feed-icon feed-icon-bookmark">
                          {bookmarked ? "★" : "☆"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="feed-end-msg">You've reached the end of your feed.</div>
        </div>

        <div className="feed-footer">
          <button className="feed-continue-btn" type="button" onClick={handleComplete}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
