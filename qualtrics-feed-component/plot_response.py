"""
Plot Feed Response Data
Visualizes dwell time and engagement from a single Qualtrics feed response.
"""

import json
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# ---- Paste your response data here ----
dwell_raw = '{"condition":"C","sortMode":"random","participantId":"advisor_testA","feedDurationMs":8266,"scrollDepthPct":1,"posts":{"post_19":{"ms":8240,"pos":0,"v1s":true,"v3s":true,"v5s":true},"post_20":{"ms":8240,"pos":1,"v1s":true,"v3s":true,"v5s":true},"post_11":{"ms":8240,"pos":2,"v1s":true,"v3s":true,"v5s":true},"post_09":{"ms":7248,"pos":3,"v1s":true,"v3s":true,"v5s":true},"post_16":{"ms":0,"pos":4,"v1s":false,"v3s":false,"v5s":false},"post_03":{"ms":0,"pos":5,"v1s":false,"v3s":false,"v5s":false},"post_10":{"ms":0,"pos":6,"v1s":false,"v3s":false,"v5s":false},"post_17":{"ms":0,"pos":7,"v1s":false,"v3s":false,"v5s":false},"post_01":{"ms":0,"pos":8,"v1s":false,"v3s":false,"v5s":false},"post_15":{"ms":0,"pos":9,"v1s":false,"v3s":false,"v5s":false},"post_12":{"ms":0,"pos":10,"v1s":false,"v3s":false,"v5s":false},"post_07":{"ms":0,"pos":11,"v1s":false,"v3s":false,"v5s":false},"post_14":{"ms":0,"pos":12,"v1s":false,"v3s":false,"v5s":false},"post_18":{"ms":0,"pos":13,"v1s":false,"v3s":false,"v5s":false},"post_05":{"ms":0,"pos":14,"v1s":false,"v3s":false,"v5s":false},"post_08":{"ms":0,"pos":15,"v1s":false,"v3s":false,"v5s":false},"post_04":{"ms":0,"pos":16,"v1s":false,"v3s":false,"v5s":false},"post_13":{"ms":0,"pos":17,"v1s":false,"v3s":false,"v5s":false},"post_02":{"ms":0,"pos":18,"v1s":false,"v3s":false,"v5s":false},"post_06":{"ms":0,"pos":19,"v1s":false,"v3s":false,"v5s":false}}}'

engagement_raw = '{"participantId":"advisor_testA","condition":"C","actions":[{"postId":"post_19","action":"retweet","active":true,"timestamp":1545},{"postId":"post_20","action":"retweet","active":true,"timestamp":5694},{"postId":"post_20","action":"like","active":true,"timestamp":6177},{"postId":"post_11","action":"like","active":true,"timestamp":7294}]}'

# Post metadata for labels
POST_AUTHORS = {
    "post_01": "Sarah Mitchell",
    "post_02": "ME Policy Center",
    "post_03": "Dr. James Hartley",
    "post_04": "Elif Demir",
    "post_05": "CNN Breaking News",
    "post_06": "Ahmed Al-Rashid",
    "post_07": "Imm. Law Updates",
    "post_08": "Campus Reform Now",
    "post_09": "Zeynep Kaya",
    "post_10": "Senator Lisa Park",
    "post_11": "David Chen",
    "post_12": "Turkish American Assoc.",
    "post_13": "Mike Brennan",
    "post_14": "Dr. Fatima Hassan",
    "post_15": "University Watch",
    "post_16": "Murat Yilmaz",
    "post_17": "State Dept Watcher",
    "post_18": "Jessica Torres",
    "post_19": "Global Higher Ed",
    "post_20": "Ayşe Erdoğan",
}

POST_SENTIMENT = {
    "post_01": -0.6, "post_02": -0.4, "post_03": 0.7, "post_04": -0.9,
    "post_05": -0.5, "post_06": -0.8, "post_07": 0.1, "post_08": -0.3,
    "post_09": -0.4, "post_10": 0.6, "post_11": -0.5, "post_12": 0.8,
    "post_13": -0.7, "post_14": 0.5, "post_15": -0.6, "post_16": 0.8,
    "post_17": -0.3, "post_18": -0.8, "post_19": 0.0, "post_20": -0.6,
}

# ---- Parse ----
dwell = json.loads(dwell_raw)
engagement = json.loads(engagement_raw)

posts = dwell["posts"]
actions = engagement["actions"]

# Sort by feed position
sorted_posts = sorted(posts.items(), key=lambda x: x[1]["pos"])
post_ids = [p[0] for p in sorted_posts]
positions = [p[1]["pos"] for p in sorted_posts]
dwell_ms = [p[1]["ms"] for p in sorted_posts]
dwell_s = [ms / 1000 for ms in dwell_ms]
labels = [f"{POST_AUTHORS.get(pid, pid)}" for pid in post_ids]

# Engagement markers
liked_posts = set()
retweeted_posts = set()
bookmarked_posts = set()
for a in actions:
    if a["active"]:
        if a["action"] == "like": liked_posts.add(a["postId"])
        elif a["action"] == "retweet": retweeted_posts.add(a["postId"])
        elif a["action"] == "bookmark": bookmarked_posts.add(a["postId"])

# Sentiment colors
sentiments = [POST_SENTIMENT.get(pid, 0) for pid in post_ids]
colors = []
for s in sentiments:
    if s >= 0.3:
        colors.append("#00BA7C")   # positive = green
    elif s <= -0.3:
        colors.append("#F91880")   # negative = pink
    else:
        colors.append("#1D9BF0")   # neutral = blue

# ============================================================
# PLOT 1: Dwell Time by Feed Position
# ============================================================
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle(
    f"Feed Response Analysis — Participant: {dwell['participantId']}  |  "
    f"Condition: {dwell['condition']}  |  Sort: {dwell['sortMode']}  |  "
    f"Duration: {dwell['feedDurationMs']/1000:.1f}s  |  Scroll: {dwell['scrollDepthPct']}%",
    fontsize=13, fontweight="bold", y=0.98
)
fig.patch.set_facecolor("#0D1117")

for ax in axes.flat:
    ax.set_facecolor("#161B22")
    ax.tick_params(colors="#8B949E")
    ax.xaxis.label.set_color("#C9D1D9")
    ax.yaxis.label.set_color("#C9D1D9")
    ax.title.set_color("#E6EDF3")
    for spine in ax.spines.values():
        spine.set_color("#30363D")

# --- Plot 1: Horizontal bar chart of dwell times ---
ax1 = axes[0, 0]
y_pos = np.arange(len(post_ids))
bars = ax1.barh(y_pos, dwell_s, color=colors, alpha=0.85, height=0.7)

# Add engagement markers
for i, pid in enumerate(post_ids):
    markers = []
    if pid in liked_posts: markers.append("♥")
    if pid in retweeted_posts: markers.append("⟲")
    if pid in bookmarked_posts: markers.append("★")
    if markers:
        ax1.text(dwell_s[i] + 0.15, i, " ".join(markers), va="center",
                fontsize=12, color="#E6EDF3")

ax1.set_yticks(y_pos)
ax1.set_yticklabels(labels, fontsize=9, color="#C9D1D9")
ax1.invert_yaxis()
ax1.set_xlabel("Dwell Time (seconds)")
ax1.set_title("Dwell Time per Post (feed order, top = first seen)")
ax1.axvline(x=1, color="#30363D", linestyle="--", alpha=0.5, label="1s threshold")
ax1.axvline(x=3, color="#30363D", linestyle="--", alpha=0.5, label="3s threshold")

# --- Plot 2: Dwell time decay curve ---
ax2 = axes[0, 1]
viewed_positions = [i for i, d in enumerate(dwell_s) if d > 0]
viewed_dwells = [dwell_s[i] for i in viewed_positions]

ax2.plot(range(len(dwell_s)), dwell_s, "o-", color="#1D9BF0", markersize=6, alpha=0.8)
ax2.fill_between(range(len(dwell_s)), dwell_s, alpha=0.15, color="#1D9BF0")
ax2.set_xlabel("Feed Position (0 = top)")
ax2.set_ylabel("Dwell Time (seconds)")
ax2.set_title("Attention Decay Over Feed Position")
ax2.axhline(y=1, color="#F0883E", linestyle="--", alpha=0.4, label="1s")
ax2.axhline(y=3, color="#F0883E", linestyle="--", alpha=0.4, label="3s")
ax2.legend(fontsize=9, facecolor="#161B22", edgecolor="#30363D", labelcolor="#C9D1D9")

# --- Plot 3: Engagement timeline ---
ax3 = axes[1, 0]
action_colors = {"like": "#F91880", "retweet": "#00BA7C", "bookmark": "#1D9BF0"}
action_markers = {"like": "♥", "retweet": "⟲", "bookmark": "★"}

for a in actions:
    if a["active"]:
        t = a["timestamp"] / 1000
        color = action_colors.get(a["action"], "#71767B")
        label_text = f'{POST_AUTHORS.get(a["postId"], a["postId"])}'
        ax3.scatter(t, a["action"], color=color, s=200, zorder=5)
        ax3.annotate(label_text, (t, a["action"]), textcoords="offset points",
                    xytext=(10, 0), fontsize=9, color="#C9D1D9", va="center")

ax3.set_xlabel("Time Since Feed Loaded (seconds)")
ax3.set_title("Engagement Actions Over Time")
ax3.set_xlim(-0.5, dwell["feedDurationMs"] / 1000 + 1)

# --- Plot 4: Sentiment vs Dwell ---
ax4 = axes[1, 1]
viewed_mask = [d > 0 for d in dwell_s]
viewed_sentiments = [sentiments[i] for i in range(len(sentiments)) if viewed_mask[i]]
viewed_dwells_filtered = [dwell_s[i] for i in range(len(dwell_s)) if viewed_mask[i]]
viewed_colors = [colors[i] for i in range(len(colors)) if viewed_mask[i]]
viewed_labels = [labels[i] for i in range(len(labels)) if viewed_mask[i]]

if viewed_sentiments:
    ax4.scatter(viewed_sentiments, viewed_dwells_filtered, c=viewed_colors, s=120, alpha=0.85, zorder=5)
    for i, lbl in enumerate(viewed_labels):
        ax4.annotate(lbl, (viewed_sentiments[i], viewed_dwells_filtered[i]),
                    textcoords="offset points", xytext=(8, 4), fontsize=8, color="#8B949E")

ax4.axvline(x=0, color="#30363D", linestyle="-", alpha=0.3)
ax4.set_xlabel("Post Sentiment (-1 = negative, +1 = positive)")
ax4.set_ylabel("Dwell Time (seconds)")
ax4.set_title("Sentiment vs. Dwell Time (viewed posts only)")

# Legend for sentiment colors
legend_patches = [
    mpatches.Patch(color="#F91880", label="Negative (≤-0.3)"),
    mpatches.Patch(color="#1D9BF0", label="Neutral"),
    mpatches.Patch(color="#00BA7C", label="Positive (≥0.3)"),
]
ax4.legend(handles=legend_patches, fontsize=9, facecolor="#161B22",
          edgecolor="#30363D", labelcolor="#C9D1D9", loc="upper right")

plt.tight_layout(rect=[0, 0, 1, 0.96])
output_path = "feed_analysis.png"
plt.savefig(output_path, dpi=150, facecolor="#0D1117", bbox_inches="tight")
print(f"Saved to {output_path}")
plt.show()
