# Qualtrics Feed Component

A drop-in JavaScript snippet that renders a scrollable, Twitter-like social media feed inside a single Qualtrics survey question. Tracks dwell time per post and logs engagement (likes, retweets, bookmarks) to Qualtrics embedded data fields.

## What It Does

- Renders 30 posts in a dark-mode Twitter-style scrollable feed, organized into two named pools (`listA` = distressing, `listB` = supportive) for mix-and-match study designs
- Sorts posts by condition (negative-first, positive-first, random, engagement, custom order, or pool-quota sampling)
- Tracks how long each participant looks at each post (dwell time via IntersectionObserver)
- Records like/retweet/bookmark clicks with timestamps
- Saves all data to Qualtrics embedded data fields so it appears in your CSV export

## Files

| File | Purpose |
|------|---------|
| `feed-component.js` | The main script — paste this into Qualtrics |
| `test.html` | Local test harness — open in browser to test without Qualtrics |
| `example-posts.json` | Sample post data (same data is embedded in feed-component.js) |
| `README.md` | This file |

---

## Step-by-Step Qualtrics Setup

### Step 1: Create Embedded Data Fields

1. Open your survey in Qualtrics
2. Go to **Survey Flow** (left sidebar)
3. Click **Add a New Element Here** → **Embedded Data**
4. **Drag this element to the very top** of the survey flow (above all blocks)
5. Add these four fields by typing each name and clicking "Add":
   - `condition` — set the value to `A`, `B`, or `C` (or leave blank to set via URL)
   - `participant_id` — leave blank (will be set via URL from Prolific/MTurk)
   - `dwell_data` — leave blank (the script writes to this)
   - `engagement_data` — leave blank (the script writes to this)
6. Click **Save Flow**

**It should look like this in Survey Flow:**
```
Embedded Data
  condition = (value or blank)
  participant_id = (blank)
  dwell_data = (blank)
  engagement_data = (blank)

Block 1: Pre-Survey Questions
Block 2: Feed Task          ← the feed goes here
Block 3: Post-Survey Questions
```

### Step 2: Set Up Condition Assignment

**Recommended setup — one public link, Qualtrics randomizes each participant.**

You distribute a single survey URL. Qualtrics's Survey Flow Randomizer assigns each participant to condition A, B, or C the moment they open the link — no URL parameters, no per-condition links to manage.

1. Open **Survey Flow** (left sidebar)
2. Below the Embedded Data element you created in Step 1, click **Add a New Element Here** → **Randomizer**
3. Click on the Randomizer to expand it. Set:
   - **"Randomly present X of the following Y elements"** → set X = 1
   - Tick **"Evenly Present Elements"** so the distribution stays balanced across participants
4. Inside the Randomizer, click **Add a New Element Here** → **Embedded Data** three times (once per condition):
   - First element: set `condition = A`
   - Second element: set `condition = B`
   - Third element: set `condition = C`
5. Click **Save Flow**

Survey Flow should look like this:
```
Embedded Data: condition, participant_id, dwell_data, engagement_data
Randomizer (Evenly present 1 of 3)
  ├─ Embedded Data: condition = A
  ├─ Embedded Data: condition = B
  └─ Embedded Data: condition = C

Block 1: Pre-Survey Questions
Block 2: Feed Task
Block 3: Post-Survey Questions
```

`participant_id` does NOT need to be passed in the URL — the JavaScript auto-generates a unique random ID per response and writes it back to the embedded data field, so dwell tracking and the seeded post-shuffle still work correctly. (If you also pass `?participant_id=...` in the URL, that value wins.)

**Alternative — pass condition via URL (Prolific/MTurk panels):**

If a panel platform handles randomization for you, you can override the Survey Flow Randomizer by passing parameters directly:
```
https://youruniversity.qualtrics.com/jfe/form/SV_xxxxx?condition=A&participant_id=P123
```
Qualtrics auto-binds matching URL parameters to embedded data fields, so a URL value will override whatever the Randomizer would have set.

### Step 3: Create the Feed Question

1. Create a new **Block** for the feed task (e.g., "Block 2: Feed Task")
2. Add a new question → choose **Text / Graphic** type
3. Click on the question text area
4. Click the **HTML View** button (the `<>` icon in the rich text toolbar) to switch to HTML source mode
5. Delete any default text
6. Paste this single line:
   ```html
   <div id="feed-host"></div>
   ```
7. Click **HTML View** again to return to normal view
8. You should see an empty div — that's correct

### Step 4: Add the JavaScript

1. Click on the question you just created
2. Click the **gear icon** (⚙) on the left side of the question → **Add JavaScript**
3. You'll see a code editor with some default template code
4. **Delete everything** in the editor
5. **Copy the entire contents** of `feed-component.js` and **paste it** into the editor
6. Click **Save**

### Step 5: Customize Your Posts (Optional)

The script contains 30 sample posts about international student visa issues, pre-organized into two pools (`listA` = 14 distressing posts, `listB` = 14 supportive posts; 2 neutral posts not assigned to any pool). To use your own posts:

1. In the JavaScript editor, find the `FEED_POSTS` array near the top
2. Replace it with your own posts, following this format:
   ```javascript
   {
     id: "post_01",           // unique ID
     author: "Display Name",  // author display name
     handle: "@username",     // @handle
     avatar_color: "#1DA1F2", // color for avatar circle
     text: "The post text content goes here.",
     timestamp: "2h",         // relative time
     likes: 1843,             // number of likes
     retweets: 612,           // number of retweets
     replies: 289,            // number of replies
     category: "news",        // your categorization
     topic: "visa_policy",    // your topic tag
     sentiment: -0.5          // score from -1 (negative) to +1 (positive)
   }
   ```

### Step 6: Customize Conditions (Optional)

Find the `conditionSortMap` in the `FEED_CONFIG` section:

```javascript
conditionSortMap: {
  "A": "custom_order",     // Condition A: custom order defined in customOrderings.A
  "B": "custom_order",     // Condition B: custom order defined in customOrderings.B
  "C": "random",           // Condition C: random (control)
  "default": "random"      // Fallback
}
```

Available sort modes:
- `"default"` — array order as-is
- `"random"` — seeded shuffle (same participant always sees same order)
- `"custom_order"` — explicit post ID list per condition (see below; supports pool refs)
- `"pool_quota"` — random-sample N posts from each named pool, then shuffle (see below)
- `"sentiment_high"` — most positive sentiment first
- `"sentiment_low"` — most negative sentiment first
- `"engagement"` — most liked/retweeted first

#### Custom orderings (per condition)

Use `"custom_order"` when you want the researcher to control the exact post
sequence per condition. Edit the `customOrderings` block in `FEED_CONFIG`:

```javascript
customOrderings: {
  "A": [
    "post_04", "post_18", "post_06", "post_01", "post_09",
    "post_20", "post_11", "post_15", "post_08", "post_17",
    "post_02", "post_05", "post_13", "post_07", "post_19",
    "post_14", "post_10", "post_03", "post_16", "post_12"
  ],
  "B": [
    "post_12", "post_16", "post_03", "post_14", "post_10",
    // ... etc
  ]
}
```

Rules:
- List post IDs in the exact order you want them to appear (top of feed first).
- Any post IDs not listed in `customOrderings[condition]` will be appended at
  the end of the feed in their original order — nothing gets silently dropped
  (use `numTweets` below to cap the total length).
- IDs that don't exist in `FEED_POSTS` are ignored.
- If a condition has no custom ordering defined, it falls back to the original
  `FEED_POSTS` order.

#### Pools (named subsets you can mix)

Define `pools` if you want to organize posts into named lists and reference
them positionally (e.g. "the 2nd post in list A"):

```javascript
pools: {
  listA: ["post_01", "post_02", "post_03", "post_04"],
  listB: ["post_05", "post_06", "post_07", "post_08"]
}
```

Then in `customOrderings`, use entries like `"listA_2"` (= 2nd post in pool
`listA`) alongside direct post IDs:

```javascript
customOrderings: {
  "A": ["listA_1", "listB_3", "listA_2", "listB_1"]
}
```

The prefix only counts as a pool ref if it matches a configured pool name —
existing IDs like `post_01` still resolve directly.

#### Pool quotas (random sampling)

To draw N random posts from each pool instead of listing them explicitly,
set the condition's sort mode to `"pool_quota"` and add a `poolQuotas` entry:

```javascript
conditionSortMap: { "A": "pool_quota" },
poolQuotas: {
  "A": { listA: 2, listB: 3 }   // 2 random from listA + 3 random from listB
}
```

The combined set is then shuffled. Sampling is seeded by `participant_id`,
so the same participant always sees the same draw on reload.

#### Limit total posts

```javascript
numTweets: 10   // 0 = no cap (default). Applies AFTER sorting/sampling.
```

Useful when `customOrderings` lists a long preferred order but you only want
to render the first N to participants.

#### Show / hide individual UI elements

Each piece of the post UI can be toggled independently:

| Flag | Default | Effect |
|------|---------|--------|
| `showAvatar` | `true` | Colored avatar circle |
| `showHandle` | `true` | `@username` next to author name |
| `showTimestamp` | `true` | `2h` / `4h` relative time |
| `showReplyButton` | `true` | Reply icon (and click logging) |
| `showRetweetButton` | `true` | Retweet icon |
| `showLikeButton` | `true` | Like icon |
| `showBookmarkButton` | `true` | Bookmark icon — set `false` to remove |
| `showReplyCount` | `true` | Number next to reply icon |
| `showRetweetCount` | `true` | Number next to retweet icon |
| `showLikeCount` | `true` | Number next to like icon |

Hidden buttons can't be clicked, so engagement isn't logged for them.

### Step 7: Preview and Test

1. Click **Preview** in Qualtrics
2. Add URL parameters to test conditions:
   ```
   ?condition=A&participant_id=test001
   ```
3. You should see a dark-mode Twitter-style feed with scrollable posts
4. Scroll through, click some likes/retweets/bookmarks
5. Proceed to the next page (this triggers data save)
6. Check your test response in **Data & Analysis** to verify `dwell_data` and `engagement_data` fields contain JSON

### Step 8: Connect to Prolific/MTurk

Your distribution URL should pass condition and participant ID:

**Prolific:**
```
https://youruniversity.qualtrics.com/jfe/form/SV_xxxxx?participant_id={{%PROLIFIC_PID%}}&condition={{%CONDITION%}}
```

**MTurk:**
```
https://youruniversity.qualtrics.com/jfe/form/SV_xxxxx?participant_id=${workerId}&condition=A
```

For MTurk with multiple conditions, create separate HITs with different `condition` values in the URL.

---

## Understanding the Output Data

### dwell_data field

After a participant completes the feed page, the `dwell_data` field contains a JSON string like:

```json
{
  "condition": "A",
  "sortMode": "sentiment_low",
  "participantId": "P123",
  "feedDurationMs": 45230,
  "scrollDepthPct": 87,
  "posts": {
    "post_04": { "ms": 6230, "pos": 0, "v1s": true, "v3s": true, "v5s": true },
    "post_06": { "ms": 3100, "pos": 1, "v1s": true, "v3s": true, "v5s": false },
    "post_01": { "ms": 890,  "pos": 2, "v1s": false, "v3s": false, "v5s": false },
    ...
  }
}
```

| Field | Meaning |
|-------|---------|
| `ms` | Total milliseconds the post was visible in the viewport |
| `pos` | Position in the feed (0 = top) |
| `v1s` | Did the participant look at this post for at least 1 second? |
| `v3s` | At least 3 seconds? |
| `v5s` | At least 5 seconds? |
| `feedDurationMs` | Total time spent on the feed page |
| `scrollDepthPct` | How far they scrolled (0-100%) |

### engagement_data field

```json
{
  "participantId": "P123",
  "condition": "A",
  "actions": [
    { "postId": "post_04", "action": "like", "active": true, "timestamp": 3200 },
    { "postId": "post_10", "action": "retweet", "active": true, "timestamp": 8900 },
    { "postId": "post_04", "action": "like", "active": false, "timestamp": 12100 }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `action` | "like", "retweet", or "bookmark" |
| `active` | true = toggled on, false = toggled off (un-liked) |
| `timestamp` | Milliseconds since the feed page loaded |

---

## Local Testing (Without Qualtrics)

1. Open `test.html` in a web browser (Chrome recommended)
2. Use the dropdown to switch conditions (A/B/C)
3. Click "Reload Feed" to re-render with the new condition
4. Scroll through the feed, click likes/bookmarks
5. Click "Simulate Page Submit" to see the data that would be saved
6. The debug panel shows real-time dwell tracking and engagement events

---

## Troubleshooting

**Feed doesn't appear in Qualtrics preview:**
- Make sure JavaScript is added via the gear icon → Add JavaScript (not in the HTML view)
- Check browser console (F12) for errors
- Ensure the question type is "Text / Graphic"

**Embedded data fields are empty after submission:**
- Verify field names match exactly: `dwell_data`, `engagement_data`, `condition`, `participant_id`
- Embedded Data element must be at the top of Survey Flow
- Make sure participant clicks "Next" (not just closes the browser)

**Posts appear in wrong order:**
- Check that the `condition` embedded data field is being set correctly
- Preview with `?condition=A` in the URL to test

**Feed looks broken on mobile:**
- The feed is responsive but works best on desktop
- For mobile studies, test on various screen sizes using browser dev tools
