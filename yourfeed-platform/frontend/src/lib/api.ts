export interface FeedPost {
  external_id: string;
  author: string;
  handle: string;
  avatar_color: string;
  text: string;
  timestamp_label: string;
  likes: number;
  retweets: number;
  replies: number;
  sentiment: number | null;
  position: number;
}

export interface SessionStartResponse {
  participant_id: string;
  study_id: string;
  study_name: string;
  condition_id: string;
  condition_label: string;
  condition_name: string;
  algorithm: string;
  skin: string;
  feed_height_px: number;
  redirect_url: string | null;
  posts: FeedPost[];
}

export interface StudySummary {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
  participant_count: number;
  condition_count: number;
  post_count: number;
}

export type EventType =
  | "dwell"
  | "like"
  | "retweet"
  | "bookmark"
  | "reply"
  | "link_click"
  | "scroll"
  | "session_start"
  | "session_end";

export interface EventPayload {
  event_type: EventType;
  client_timestamp_ms: number;
  post_external_id?: string;
  duration_ms?: number;
  position_in_feed?: number;
  payload?: Record<string, unknown>;
}

const API_BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  listStudies(): Promise<StudySummary[]> {
    return request("/api/studies");
  },

  startSession(
    studyId: string,
    participantExternalId: string,
    urlParams: Record<string, string>
  ): Promise<SessionStartResponse> {
    return request(`/api/studies/${studyId}/sessions`, {
      method: "POST",
      body: JSON.stringify({
        participant_external_id: participantExternalId,
        url_params: urlParams,
        user_agent: navigator.userAgent,
      }),
    });
  },

  endSession(studyId: string, participantId: string): Promise<{ ok: boolean; redirect_url: string | null }> {
    return request(`/api/studies/${studyId}/sessions/end`, {
      method: "POST",
      body: JSON.stringify({ participant_id: participantId }),
    });
  },

  sendEvents(participantId: string, events: EventPayload[]): Promise<{ received: number }> {
    return request(`/api/events`, {
      method: "POST",
      body: JSON.stringify({ participant_id: participantId, events }),
    });
  },
};
