import { useEffect, useState } from "react";
import { api, StudySummary } from "../lib/api";

export function Dashboard() {
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listStudies()
      .then(setStudies)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>YourFeed Platform — Studies</h1>
      {error && <div style={{ color: "#F91880" }}>Error: {error}</div>}
      {studies.length === 0 && !error && <p>No studies yet. Run the seed script.</p>}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #30363d" }}>
            <th style={{ padding: "10px 12px" }}>Name</th>
            <th style={{ padding: "10px 12px" }}>Conditions</th>
            <th style={{ padding: "10px 12px" }}>Posts</th>
            <th style={{ padding: "10px 12px" }}>Participants</th>
            <th style={{ padding: "10px 12px" }}>Feed URL</th>
            <th style={{ padding: "10px 12px" }}>Export</th>
          </tr>
        </thead>
        <tbody>
          {studies.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #21262d" }}>
              <td style={{ padding: "10px 12px" }}>{s.name}</td>
              <td style={{ padding: "10px 12px" }}>{s.condition_count}</td>
              <td style={{ padding: "10px 12px" }}>{s.post_count}</td>
              <td style={{ padding: "10px 12px" }}>{s.participant_count}</td>
              <td style={{ padding: "10px 12px" }}>
                <a href={`/feed/${s.id}?participant_id=test001`}>Open feed</a>
              </td>
              <td style={{ padding: "10px 12px" }}>
                <a href={`/api/studies/${s.id}/export/events.csv`}>events.csv</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
