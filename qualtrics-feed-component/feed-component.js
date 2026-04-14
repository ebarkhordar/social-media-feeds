/**
 * Qualtrics Feed Component
 *
 * A drop-in JavaScript snippet that renders a scrollable Twitter-like feed
 * inside a single Qualtrics question. Tracks dwell time per post using
 * IntersectionObserver and logs engagement (likes, retweets, bookmarks)
 * to Qualtrics embedded data fields.
 *
 * Usage: Paste this entire script into the JavaScript editor of a Qualtrics
 * "Text / Graphic" question. See README.md for full setup instructions.
 */

// ============================================================
// CONFIGURATION — Edit this section for your study
// ============================================================

var FEED_CONFIG = {
  // How posts are sorted per condition. The "condition" value comes from
  // Qualtrics embedded data (set via URL param or Survey Flow randomizer).
  //
  // Built-in sort modes:
  //   "default"      — use the order from the posts array as-is
  //   "random"       — Fisher-Yates shuffle (seeded by participant ID for reproducibility)
  //   "sentiment_high" — most positive sentiment first
  //   "sentiment_low"  — most negative sentiment first
  //   "engagement"   — highest total engagement (likes+retweets+replies) first
  //
  conditionSortMap: {
    "A": "sentiment_low",    // Condition A: negative content at top
    "B": "sentiment_high",   // Condition B: positive content at top
    "C": "random",           // Condition C: random order (control)
    "default": "default"     // Fallback if condition is not set
  },

  // Qualtrics embedded data field names (must be created in Survey Flow)
  embeddedFields: {
    condition: "condition",           // reads condition assignment from this field
    participantId: "participant_id",  // reads participant ID from this field
    dwellData: "dwell_data",          // writes per-post dwell times here
    engagementData: "engagement_data" // writes like/retweet/bookmark actions here
  },

  // Feed behavior
  feedHeight: "600px",       // height of the scrollable feed container
  showEndMessage: true,      // show "You've reached the end" message
  endMessageText: "You've reached the end of your feed.",

  // Dwell tracking thresholds (milliseconds)
  dwellThresholds: {
    visible: 0,     // post entered viewport
    short: 1000,    // 1 second
    medium: 3000,   // 3 seconds
    long: 5000      // 5 seconds
  }
};


// ============================================================
// POSTS DATA — Replace with your actual posts or load from external source
// ============================================================

var FEED_POSTS = [
  {
    id: "post_01",
    author: "Sarah Mitchell",
    handle: "@sarahmit_dc",
    avatar_color: "#1DA1F2",
    text: "Just got an email from my university\u2019s international office. They\u2019re telling Turkish students on F-1 visas to \"stay informed\" about potential policy changes. Stay informed?? We need actual support, not vague emails.",
    timestamp: "2h",
    likes: 1843,
    retweets: 612,
    replies: 289,
    category: "personal_experience",
    topic: "visa_anxiety",
    sentiment: -0.6
  },
  {
    id: "post_02",
    author: "Middle East Policy Center",
    handle: "@MEPolicyCenter",
    avatar_color: "#794BC4",
    text: "BREAKING: New executive order could impact visa processing for students from 6 Middle Eastern countries. Universities scrambling to advise thousands of affected international students. Full analysis thread below.",
    timestamp: "4h",
    likes: 5621,
    retweets: 3204,
    replies: 876,
    category: "news",
    topic: "policy_change",
    sentiment: -0.4
  },
  {
    id: "post_03",
    author: "Dr. James Hartley",
    handle: "@profhartley",
    avatar_color: "#17BF63",
    text: "As a department chair, I want to be clear: our international students are valued members of our community. We are working with legal counsel to support every student affected by the new travel restrictions. You are not alone.",
    timestamp: "5h",
    likes: 12450,
    retweets: 4102,
    replies: 534,
    category: "institutional_response",
    topic: "support",
    sentiment: 0.7
  },
  {
    id: "post_04",
    author: "Elif Demir",
    handle: "@elif_studying_us",
    avatar_color: "#F45D22",
    text: "I\u2019m a Turkish PhD student in engineering. I went home for my grandmother\u2019s funeral and now I\u2019m stuck. My visa interview got \"administratively processed\" indefinitely. My advisor says my funding might not survive the delay. 4 years of research, gone?",
    timestamp: "6h",
    likes: 8934,
    retweets: 3891,
    replies: 1205,
    category: "personal_experience",
    topic: "visa_delay",
    sentiment: -0.9
  },
  {
    id: "post_05",
    author: "CNN Breaking News",
    handle: "@cabortnews",
    avatar_color: "#E0245E",
    text: "Israel launches new military operation in southern Gaza. International community calls for ceasefire. US State Department issues updated travel advisory for the region. How this affects broader Middle East policy \u2014 analysis at the link.",
    timestamp: "1h",
    likes: 15230,
    retweets: 8764,
    replies: 4521,
    category: "news",
    topic: "conflict_update",
    sentiment: -0.5
  },
  {
    id: "post_06",
    author: "Ahmed Al-Rashid",
    handle: "@ahmed_intl_student",
    avatar_color: "#FFAD1F",
    text: "My roommate is from Jordan. Brilliant computer science student. Full scholarship. Just got told his visa renewal is \"under review\" with no timeline. He hasn\u2019t slept in 3 days. This is what the news won\u2019t show you \u2014 real people, real lives being destroyed.",
    timestamp: "3h",
    likes: 6721,
    retweets: 2890,
    replies: 743,
    category: "personal_experience",
    topic: "visa_anxiety",
    sentiment: -0.8
  },
  {
    id: "post_07",
    author: "Immigration Law Updates",
    handle: "@imm_law_updates",
    avatar_color: "#794BC4",
    text: "Important clarification: Current F-1 visa holders inside the US are NOT immediately affected by the new order. However, those who travel abroad may face re-entry issues. We strongly advise against international travel until further guidance is issued.",
    timestamp: "7h",
    likes: 9234,
    retweets: 7102,
    replies: 1892,
    category: "legal_info",
    topic: "policy_change",
    sentiment: 0.1
  },
  {
    id: "post_08",
    author: "Campus Reform Now",
    handle: "@campusreformnow",
    avatar_color: "#E0245E",
    text: "Universities that received federal funding while allowing anti-Israel protests on campus may face consequences under new guidelines. Several schools already reviewing their policies on campus demonstrations.",
    timestamp: "8h",
    likes: 4532,
    retweets: 2341,
    replies: 1876,
    category: "news",
    topic: "campus_politics",
    sentiment: -0.3
  },
  {
    id: "post_09",
    author: "Zeynep Kaya",
    handle: "@zeynep_kaya_phd",
    avatar_color: "#1DA1F2",
    text: "Turkish student community at our university organized a support group for those dealing with visa uncertainty. 47 people showed up. 47. In a school of 200 international students. The anxiety is everywhere and nobody in admin seems to care.",
    timestamp: "9h",
    likes: 3456,
    retweets: 1567,
    replies: 423,
    category: "personal_experience",
    topic: "community_response",
    sentiment: -0.4
  },
  {
    id: "post_10",
    author: "Senator Lisa Park",
    handle: "@senatorpark",
    avatar_color: "#17BF63",
    text: "I introduced a bipartisan bill today to protect international students from visa disruptions caused by geopolitical conflicts they have no part in. These students came here to learn. They should not be collateral damage in foreign policy disputes.",
    timestamp: "10h",
    likes: 18920,
    retweets: 9234,
    replies: 2341,
    category: "political_response",
    topic: "policy_change",
    sentiment: 0.6
  },
  {
    id: "post_11",
    author: "David Chen",
    handle: "@dchen_journalist",
    avatar_color: "#FFAD1F",
    text: "Thread: I spent a week interviewing international students at 5 US universities. The pattern is consistent \u2014 Muslim and Middle Eastern students report being questioned more aggressively at visa renewals since the Gaza conflict escalated. Data in the thread. 1/12",
    timestamp: "11h",
    likes: 7823,
    retweets: 4521,
    replies: 987,
    category: "journalism",
    topic: "discrimination",
    sentiment: -0.5
  },
  {
    id: "post_12",
    author: "Turkish American Association",
    handle: "@turkamericanorg",
    avatar_color: "#794BC4",
    text: "We are providing free legal consultations for Turkish students facing visa issues in the US. If you or someone you know needs help, DM us or visit our website. Lawyers are volunteering their time. You have rights \u2014 use them.",
    timestamp: "12h",
    likes: 11234,
    retweets: 8901,
    replies: 654,
    category: "resource",
    topic: "support",
    sentiment: 0.8
  },
  {
    id: "post_13",
    author: "Mike Brennan",
    handle: "@mike_b_opinions",
    avatar_color: "#E0245E",
    text: "Unpopular opinion: if your home country\u2019s government supports Hamas, maybe the US should be more careful about who gets student visas. National security isn\u2019t xenophobia. It\u2019s common sense.",
    timestamp: "5h",
    likes: 3210,
    retweets: 1456,
    replies: 4532,
    category: "opinion",
    topic: "security_debate",
    sentiment: -0.7
  },
  {
    id: "post_14",
    author: "Dr. Fatima Hassan",
    handle: "@drfatimahassan",
    avatar_color: "#17BF63",
    text: "I came to the US on a student visa 15 years ago. Now I run a cancer research lab that has published 40+ papers and trained 12 PhD students. Every time someone says \"be more careful about who gets visas,\" remember: you might be blocking the person who cures your disease.",
    timestamp: "4h",
    likes: 45230,
    retweets: 18920,
    replies: 3421,
    category: "personal_experience",
    topic: "immigration_value",
    sentiment: 0.5
  },
  {
    id: "post_15",
    author: "University Watch",
    handle: "@uni_watch_alert",
    avatar_color: "#FFAD1F",
    text: "UPDATE: At least 3 major universities have paused acceptance of new international students from certain Middle Eastern countries pending \"policy review.\" Names not yet public. Sources say announcements coming this week.",
    timestamp: "2h",
    likes: 6789,
    retweets: 5432,
    replies: 2109,
    category: "news",
    topic: "policy_change",
    sentiment: -0.6
  },
  {
    id: "post_16",
    author: "Murat Yilmaz",
    handle: "@murat_y_istanbul",
    avatar_color: "#1DA1F2",
    text: "My American classmates have been incredible. They organized a letter to the dean, started a GoFundMe for students who can\u2019t afford immigration lawyers, and showed up to every protest. This isn\u2019t an \"international student\" problem. They see it as an American values problem.",
    timestamp: "6h",
    likes: 22340,
    retweets: 9876,
    replies: 1234,
    category: "personal_experience",
    topic: "solidarity",
    sentiment: 0.8
  },
  {
    id: "post_17",
    author: "State Dept Watcher",
    handle: "@statedeptwatcher",
    avatar_color: "#794BC4",
    text: "Visa refusal rates for Turkish nationals have increased 34% year-over-year according to newly released data. The State Department attributes this to \"enhanced vetting procedures\" but provides no specifics on what changed or why.",
    timestamp: "14h",
    likes: 4567,
    retweets: 3210,
    replies: 876,
    category: "data",
    topic: "policy_change",
    sentiment: -0.3
  },
  {
    id: "post_18",
    author: "Jessica Torres",
    handle: "@jtorres_prof",
    avatar_color: "#E0245E",
    text: "Just had a Turkish grad student break down crying in my office. She\u2019s 6 months from defending her dissertation and terrified she\u2019ll be forced to leave. I\u2019ve been a professor for 20 years and I have never felt this helpless. The system is failing these students.",
    timestamp: "8h",
    likes: 14567,
    retweets: 6789,
    replies: 2345,
    category: "personal_experience",
    topic: "emotional_impact",
    sentiment: -0.8
  },
  {
    id: "post_19",
    author: "Global Higher Ed",
    handle: "@globalhighered",
    avatar_color: "#17BF63",
    text: "New report: International students contribute $40.1 billion to the US economy annually. For every student turned away by visa restrictions, competitor countries \u2014 Canada, UK, Australia \u2014 gain. The US is not the only option anymore, and students know it.",
    timestamp: "16h",
    likes: 8901,
    retweets: 5432,
    replies: 1098,
    category: "analysis",
    topic: "economic_impact",
    sentiment: 0.0
  },
  {
    id: "post_20",
    author: "Ay\u015fe Erdo\u011fan",
    handle: "@ayse_in_america",
    avatar_color: "#F45D22",
    text: "I used to tell my cousins back in Turkey that America is the land of opportunity. Now they text me asking if I\u2019m safe. How did we get here? I just want to finish my degree and contribute to this country. That\u2019s all any of us want.",
    timestamp: "3h",
    likes: 9876,
    retweets: 4321,
    replies: 1567,
    category: "personal_experience",
    topic: "disillusionment",
    sentiment: -0.6
  }
];


// ============================================================
// CORE ENGINE — Do not edit below unless customizing behavior
// ============================================================

Qualtrics.SurveyEngine.addOnload(function() {
  var qEngine = this;
  var questionContainer = qEngine.getQuestionContainer();

  // ---- State ----
  var dwellState = {};       // { postId: { enterTime, totalMs, visible1s, visible3s, visible5s } }
  var engagementLog = [];    // [{ postId, action, timestamp }]
  var scrollDepthMax = 0;
  var feedStartTime = Date.now();

  // ---- Read embedded data ----
  var condition = Qualtrics.SurveyEngine.getEmbeddedData(FEED_CONFIG.embeddedFields.condition) || "default";
  var participantId = Qualtrics.SurveyEngine.getEmbeddedData(FEED_CONFIG.embeddedFields.participantId) || "unknown";

  // ---- Sorting ----
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function shuffleArray(arr, seed) {
    var shuffled = arr.slice();
    var s = seed;
    for (var i = shuffled.length - 1; i > 0; i--) {
      s++;
      var j = Math.floor(seededRandom(s) * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  }

  function sortPosts(posts, mode) {
    switch (mode) {
      case "random":
        return shuffleArray(posts, hashString(participantId));
      case "sentiment_high":
        return posts.slice().sort(function(a, b) { return (b.sentiment || 0) - (a.sentiment || 0); });
      case "sentiment_low":
        return posts.slice().sort(function(a, b) { return (a.sentiment || 0) - (b.sentiment || 0); });
      case "engagement":
        return posts.slice().sort(function(a, b) {
          var engA = (a.likes || 0) + (a.retweets || 0) + (a.replies || 0);
          var engB = (b.likes || 0) + (b.retweets || 0) + (b.replies || 0);
          return engB - engA;
        });
      case "default":
      default:
        return posts.slice();
    }
  }

  var sortMode = FEED_CONFIG.conditionSortMap[condition] || FEED_CONFIG.conditionSortMap["default"] || "default";
  var sortedPosts = sortPosts(FEED_POSTS, sortMode);

  // ---- Format numbers ----
  function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  // ---- Inject CSS ----
  var style = document.createElement("style");
  style.textContent = [
    ".feed-wrapper {",
    "  max-width: 600px;",
    "  margin: 0 auto;",
    "  border: 1px solid #2F3336;",
    "  border-radius: 16px;",
    "  overflow: hidden;",
    "  background: #000;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;",
    "  color: #E7E9EA;",
    "}",
    ".feed-header {",
    "  position: sticky; top: 0; z-index: 10;",
    "  background: rgba(0,0,0,0.85);",
    "  backdrop-filter: blur(12px);",
    "  -webkit-backdrop-filter: blur(12px);",
    "  border-bottom: 1px solid #2F3336;",
    "  padding: 12px 16px;",
    "}",
    ".feed-header-title {",
    "  font-size: 20px; font-weight: 700; color: #E7E9EA;",
    "}",
    ".feed-header-tabs {",
    "  display: flex; margin-top: 8px;",
    "}",
    ".feed-header-tab {",
    "  flex: 1; text-align: center; padding: 12px 0;",
    "  font-size: 15px; font-weight: 500; color: #71767B;",
    "  cursor: default; position: relative;",
    "}",
    ".feed-header-tab.active { color: #E7E9EA; font-weight: 700; }",
    ".feed-header-tab.active::after {",
    "  content: ''; position: absolute; bottom: 0; left: 50%;",
    "  transform: translateX(-50%); width: 56px; height: 4px;",
    "  background: #1D9BF0; border-radius: 2px;",
    "}",
    "",
    ".feed-container {",
    "  height: " + FEED_CONFIG.feedHeight + ";",
    "  overflow-y: auto;",
    "  scrollbar-width: thin;",
    "  scrollbar-color: #333 #000;",
    "}",
    ".feed-container::-webkit-scrollbar { width: 8px; }",
    ".feed-container::-webkit-scrollbar-track { background: #000; }",
    ".feed-container::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }",
    "",
    ".feed-post {",
    "  padding: 12px 16px;",
    "  border-bottom: 1px solid #2F3336;",
    "  cursor: default;",
    "  transition: background 0.15s;",
    "}",
    ".feed-post:hover { background: #080808; }",
    "",
    ".feed-post-header {",
    "  display: flex;",
    "  align-items: flex-start;",
    "  gap: 12px;",
    "}",
    ".feed-avatar {",
    "  width: 40px; height: 40px; border-radius: 50%;",
    "  display: flex; align-items: center; justify-content: center;",
    "  color: #fff; font-weight: 700; font-size: 15px;",
    "  flex-shrink: 0;",
    "  letter-spacing: 0.5px;",
    "}",
    ".feed-post-body { flex: 1; min-width: 0; }",
    ".feed-author-line {",
    "  display: flex; align-items: center; gap: 4px;",
    "  flex-wrap: wrap;",
    "}",
    ".feed-author-name {",
    "  font-weight: 700; font-size: 15px; color: #E7E9EA;",
    "}",
    ".feed-author-handle {",
    "  font-size: 15px; color: #71767B;",
    "}",
    ".feed-dot {",
    "  font-size: 15px; color: #71767B;",
    "}",
    ".feed-timestamp {",
    "  font-size: 15px; color: #71767B;",
    "}",
    "",
    ".feed-post-text {",
    "  font-size: 15px; line-height: 1.5;",
    "  margin: 4px 0 12px 0;",
    "  color: #E7E9EA;",
    "  word-wrap: break-word;",
    "}",
    "",
    ".feed-actions {",
    "  display: flex;",
    "  justify-content: space-between;",
    "  max-width: 425px;",
    "}",
    ".feed-action-btn {",
    "  display: flex; align-items: center; gap: 8px;",
    "  background: none; border: none; cursor: pointer;",
    "  color: #71767B; font-size: 13px;",
    "  padding: 6px 10px; border-radius: 50px;",
    "  transition: color 0.15s, background 0.15s;",
    "  font-family: inherit;",
    "  -webkit-user-select: none; user-select: none;",
    "}",
    ".feed-action-btn:hover { background: rgba(255,255,255,0.06); }",
    ".feed-action-btn.reply:hover { color: #1D9BF0; }",
    ".feed-action-btn.retweet:hover { color: #00BA7C; }",
    ".feed-action-btn.retweet.active { color: #00BA7C; }",
    ".feed-action-btn.like:hover { color: #F91880; }",
    ".feed-action-btn.like.active { color: #F91880; }",
    ".feed-action-btn.bookmark:hover { color: #1D9BF0; }",
    ".feed-action-btn.bookmark.active { color: #1D9BF0; }",
    ".feed-icon { font-size: 18px; line-height: 1; flex-shrink: 0; font-style: normal; }",
    ".feed-icon-retweet { font-size: 20px; }",
    ".feed-icon-heart { font-size: 18px; }",
    ".feed-icon-bookmark { font-size: 20px; }",
    ".feed-action-count { font-size: 13px; }",
    "",
    ".feed-end-msg {",
    "  text-align: center; padding: 40px 16px;",
    "  color: #71767B; font-size: 15px;",
    "  border-bottom: none;",
    "}",
    "",
    "/* Override Qualtrics styles */",
    ".QuestionBody { padding: 0 !important; }",
    ".QuestionText { display: none !important; }",
    ".feed-wrapper *, .feed-wrapper *::before, .feed-wrapper *::after { box-sizing: border-box; }",
    "",
    "/* Responsive */",
    "@media (max-width: 640px) {",
    "  .feed-wrapper { border-radius: 0; border-left: none; border-right: none; }",
    "  .feed-post { padding: 10px 14px; }",
    "  .feed-post-text { font-size: 14px; }",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  // ---- Icons (Unicode symbols — reliable across all browsers/environments) ----
  var ICONS = {
    reply: '<span class="feed-icon">&#x1F4AC;</span>',
    retweet: '<span class="feed-icon feed-icon-retweet">&#x21BB;</span>',
    retweetActive: '<span class="feed-icon feed-icon-retweet">&#x21BB;</span>',
    like: '<span class="feed-icon feed-icon-heart">&#x2661;</span>',
    likeFilled: '<span class="feed-icon feed-icon-heart">&#x2665;</span>',
    bookmark: '<span class="feed-icon feed-icon-bookmark">&#x2606;</span>',
    bookmarkFilled: '<span class="feed-icon feed-icon-bookmark">&#x2605;</span>'
  };

  // ---- Build feed HTML ----
  var feedWrapper = document.createElement("div");
  feedWrapper.className = "feed-wrapper";

  // Header
  var header = document.createElement("div");
  header.className = "feed-header";
  header.innerHTML = [
    '<div class="feed-header-title">Home</div>',
    '<div class="feed-header-tabs">',
    '  <div class="feed-header-tab active">For you</div>',
    '  <div class="feed-header-tab">Following</div>',
    '</div>'
  ].join("");
  feedWrapper.appendChild(header);

  var feedContainer = document.createElement("div");
  feedContainer.className = "feed-container";
  feedContainer.id = "feed-container";

  for (var i = 0; i < sortedPosts.length; i++) {
    var post = sortedPosts[i];
    var initials = post.author.split(" ").map(function(w) { return w[0]; }).join("").substring(0, 2);

    var postEl = document.createElement("div");
    postEl.className = "feed-post";
    postEl.setAttribute("data-post-id", post.id);
    postEl.setAttribute("data-post-index", String(i));

    postEl.innerHTML = [
      '<div class="feed-post-header">',
      '  <div class="feed-avatar" style="background:' + post.avatar_color + '">' + initials + '</div>',
      '  <div class="feed-post-body">',
      '    <div class="feed-author-line">',
      '      <span class="feed-author-name">' + post.author + '</span>',
      '      <span class="feed-author-handle">' + post.handle + '</span>',
      '      <span class="feed-dot">&middot;</span>',
      '      <span class="feed-timestamp">' + post.timestamp + '</span>',
      '    </div>',
      '    <div class="feed-post-text">' + post.text + '</div>',
      '    <div class="feed-actions">',
      '      <button class="feed-action-btn reply" data-action="reply" data-post-id="' + post.id + '">' + ICONS.reply + '<span class="feed-action-count">' + formatCount(post.replies) + '</span></button>',
      '      <button class="feed-action-btn retweet" data-action="retweet" data-post-id="' + post.id + '">' + ICONS.retweet + '<span class="feed-action-count">' + formatCount(post.retweets) + '</span></button>',
      '      <button class="feed-action-btn like" data-action="like" data-post-id="' + post.id + '">' + ICONS.like + '<span class="feed-action-count">' + formatCount(post.likes) + '</span></button>',
      '      <button class="feed-action-btn bookmark" data-action="bookmark" data-post-id="' + post.id + '">' + ICONS.bookmark + '<span class="feed-action-count"></span></button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("\n");

    feedContainer.appendChild(postEl);

    // Initialize dwell state
    dwellState[post.id] = {
      enterTime: null,
      totalMs: 0,
      visible1s: false,
      visible3s: false,
      visible5s: false,
      timers: {},
      position: i
    };
  }

  // End message
  if (FEED_CONFIG.showEndMessage) {
    var endMsg = document.createElement("div");
    endMsg.className = "feed-end-msg";
    endMsg.textContent = FEED_CONFIG.endMessageText;
    feedContainer.appendChild(endMsg);
  }

  feedWrapper.appendChild(feedContainer);

  // Insert into question
  questionContainer.innerHTML = "";
  questionContainer.appendChild(feedWrapper);

  // ---- Engagement handlers ----
  feedContainer.addEventListener("click", function(e) {
    var btn = e.target.closest(".feed-action-btn");
    if (!btn) return;

    var action = btn.getAttribute("data-action");
    var postId = btn.getAttribute("data-post-id");

    if (action === "reply") return; // replies do nothing in this simulation

    var isActive = btn.classList.contains("active");

    if (action === "like") {
      var countText = btn.querySelector(".feed-action-count").textContent;
      btn.classList.toggle("active");
      btn.innerHTML = (isActive ? ICONS.like : ICONS.likeFilled) + '<span class="feed-action-count">' + countText + '</span>';
    } else if (action === "retweet") {
      btn.classList.toggle("active");
    } else if (action === "bookmark") {
      btn.classList.toggle("active");
      btn.innerHTML = (isActive ? ICONS.bookmark : ICONS.bookmarkFilled) + '<span class="feed-action-count"></span>';
    }

    engagementLog.push({
      postId: postId,
      action: action,
      active: !isActive,
      timestamp: Date.now() - feedStartTime
    });
  });

  // ---- Dwell tracking with IntersectionObserver ----
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      var postId = entry.target.getAttribute("data-post-id");
      var state = dwellState[postId];
      if (!state) return;

      if (entry.isIntersecting) {
        // Post entered viewport
        state.enterTime = Date.now();

        // Set threshold timers
        if (!state.visible1s) {
          state.timers.t1 = setTimeout(function() { state.visible1s = true; }, FEED_CONFIG.dwellThresholds.short);
        }
        if (!state.visible3s) {
          state.timers.t3 = setTimeout(function() { state.visible3s = true; }, FEED_CONFIG.dwellThresholds.medium);
        }
        if (!state.visible5s) {
          state.timers.t5 = setTimeout(function() { state.visible5s = true; }, FEED_CONFIG.dwellThresholds.long);
        }
      } else {
        // Post left viewport — accumulate time
        if (state.enterTime) {
          state.totalMs += Date.now() - state.enterTime;
          state.enterTime = null;
        }
        // Clear pending timers
        clearTimeout(state.timers.t1);
        clearTimeout(state.timers.t3);
        clearTimeout(state.timers.t5);
      }
    });
  }, {
    root: feedContainer,
    threshold: 0.5  // post must be 50% visible
  });

  // Observe all posts
  var allPosts = feedContainer.querySelectorAll(".feed-post");
  for (var p = 0; p < allPosts.length; p++) {
    observer.observe(allPosts[p]);
  }

  // Track scroll depth
  feedContainer.addEventListener("scroll", function() {
    var depth = Math.round((feedContainer.scrollTop / (feedContainer.scrollHeight - feedContainer.clientHeight)) * 100);
    if (depth > scrollDepthMax) scrollDepthMax = depth;
  });

  // ---- Save data to Qualtrics on page submit ----
  qEngine.questionclick = function(event, element) {
    // This fires on any click within the question — we use pageSubmit below instead
  };

  // Use Qualtrics page submit event to save data
  Qualtrics.SurveyEngine.addOnPageSubmit(function() {
    // Finalize dwell times for posts still in viewport
    var now = Date.now();
    for (var pid in dwellState) {
      if (dwellState[pid].enterTime) {
        dwellState[pid].totalMs += now - dwellState[pid].enterTime;
        dwellState[pid].enterTime = null;
      }
    }

    // Build compact dwell data
    var dwellOutput = {};
    for (var pid in dwellState) {
      var s = dwellState[pid];
      dwellOutput[pid] = {
        ms: Math.round(s.totalMs),
        pos: s.position,
        v1s: s.visible1s,
        v3s: s.visible3s,
        v5s: s.visible5s
      };
    }

    var dwellJson = JSON.stringify({
      condition: condition,
      sortMode: sortMode,
      participantId: participantId,
      feedDurationMs: now - feedStartTime,
      scrollDepthPct: scrollDepthMax,
      posts: dwellOutput
    });

    var engagementJson = JSON.stringify({
      participantId: participantId,
      condition: condition,
      actions: engagementLog
    });

    // Write to Qualtrics embedded data
    Qualtrics.SurveyEngine.setEmbeddedData(FEED_CONFIG.embeddedFields.dwellData, dwellJson);
    Qualtrics.SurveyEngine.setEmbeddedData(FEED_CONFIG.embeddedFields.engagementData, engagementJson);
  });
});

// Ensure data is saved even if participant navigates away
Qualtrics.SurveyEngine.addOnUnload(function() {
  // Data should already be saved via onPageSubmit, but this is a safety net
});
