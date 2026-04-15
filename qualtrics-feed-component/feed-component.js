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
// CONFIGURATION
// Edit this section for your study. Everything researchers need to
// customize lives here — posts are defined further down.
// ============================================================

var FEED_CONFIG = {

  // ---------- Study identification ----------
  studyName: "Turkish Student Feed Experiment",
  version: "2.0",

  // ---------- Condition sorting ----------
  // How posts are ordered per condition. The "condition" value comes from
  // Qualtrics embedded data (set via URL param or Survey Flow randomizer).
  //
  // Available sort modes:
  //   "default"         use FEED_POSTS order as-is
  //   "random"          seeded Fisher-Yates (same participant gets same order)
  //   "custom_order"    explicit post ID list from customOrderings below
  //   "sentiment_high"  most positive sentiment first
  //   "sentiment_low"   most negative sentiment first
  //   "engagement"      highest total engagement (likes+retweets+replies) first
  //
  conditionSortMap: {
    "A": "custom_order",   // Condition A: custom order defined in customOrderings.A
    "B": "custom_order",   // Condition B: custom order defined in customOrderings.B
    "C": "random",         // Condition C: random order (control)
    "default": "random"    // Fallback if condition is not set
  },

  // Custom per-condition post orderings.
  // List the post IDs in the exact order they should appear in the feed.
  // Any post IDs in FEED_POSTS that are NOT in this list will be appended
  // at the end in their original order.
  //
  // TODO: Replace these placeholder orderings with the ones from your advisor.
  // Just list post IDs (see FEED_POSTS below for available IDs).
  customOrderings: {
    "A": [
      // PLACEHOLDER — replace with advisor's ordering for Condition A
      "post_04", "post_18", "post_06", "post_01", "post_09",
      "post_20", "post_11", "post_15", "post_08", "post_17",
      "post_02", "post_05", "post_13", "post_07", "post_19",
      "post_14", "post_10", "post_03", "post_16", "post_12"
    ],
    "B": [
      // PLACEHOLDER — replace with advisor's ordering for Condition B
      "post_12", "post_16", "post_03", "post_14", "post_10",
      "post_19", "post_07", "post_17", "post_02", "post_05",
      "post_15", "post_08", "post_13", "post_11", "post_20",
      "post_09", "post_01", "post_06", "post_18", "post_04"
    ]
  },

  // ---------- Qualtrics integration ----------
  // Embedded data field names (must be created in Survey Flow)
  embeddedFields: {
    condition: "condition",            // reads condition assignment from this field
    participantId: "participant_id",   // reads participant ID from this field
    dwellData: "dwell_data",           // writes per-post dwell times here
    engagementData: "engagement_data"  // writes like/retweet/bookmark actions here
  },

  // ---------- Feed appearance ----------
  theme: "dark",                    // "dark" only for now (light coming later)
  feedHeight: "600px",              // height of the scrollable feed container
  maxWidth: "600px",                // max width of the feed on desktop

  // Header
  showHeader: true,
  headerTitle: "Home",
  showTabs: true,
  tabs: ["For you", "Following"],
  activeTabIndex: 0,

  // Post display
  showEngagementCounts: true,       // show like/retweet/reply counts
  useRelativeCounts: true,          // "1.2K" instead of "1243"
  showEndMessage: true,
  endMessageText: "You've reached the end of your feed.",

  // ---------- Feed behavior ----------
  requireFullScroll: false,         // gate Next button until reaching the bottom
  minTimeSeconds: 0,                // minimum time before Next is enabled (0 = no gate)

  // ---------- Dwell tracking ----------
  dwellThresholds: {
    short: 1000,                    // 1 second
    medium: 3000,                   // 3 seconds
    long: 5000                      // 5 seconds
  },
  intersectionThreshold: 0.5,       // 0-1, how much of a post must be visible to count

  // ---------- Debug ----------
  debug: false                      // console.log events as they fire
};


// ============================================================
// POSTS DATA
// 25 tweets relevant to Turkish students. Mix of English (majority)
// and Turkish, with varied sentiment. Based on real themes but all
// accounts and quotes are fictional. Feel free to edit or replace.
// ============================================================

var FEED_POSTS = [
  {
    id: "post_01",
    author: "Emre Aydın",
    handle: "@emre_phd_bogazici",
    avatar_color: "#1DA1F2",
    text: "Boğaziçi mezunuyum, MIT'e kabul aldım ama vize randevusu 8 ay sonraya verildi. Hocalarım programa başlayamazsam pozisyonun kaybolacağını söyledi. Ne yapacağımı bilmiyorum.",
    timestamp: "2h",
    likes: 3241,
    retweets: 1876,
    replies: 523,
    category: "personal_experience",
    topic: "visa_delay",
    sentiment: -0.8
  },
  {
    id: "post_02",
    author: "Fulbright Türkiye",
    handle: "@fulbright_tr",
    avatar_color: "#E0245E",
    text: "REMINDER: The 2026-2027 Fulbright Program application deadline for Turkish citizens has been extended to May 30. Despite current uncertainty, we remain committed to supporting Turkish scholars pursuing graduate education in the US.",
    timestamp: "4h",
    likes: 5621,
    retweets: 3204,
    replies: 287,
    category: "official",
    topic: "scholarship",
    sentiment: 0.4
  },
  {
    id: "post_03",
    author: "Dr. Ayşe Kılıç",
    handle: "@aysekilic_prof",
    avatar_color: "#17BF63",
    text: "To my Turkish students asking about US PhD programs: don't give up. I went through the same visa uncertainty in 2003. I'm now a tenured professor at Stanford. The path is harder than it should be, but it exists. DM me — I'm happy to review your SOPs.",
    timestamp: "5h",
    likes: 18920,
    retweets: 7102,
    replies: 892,
    category: "support",
    topic: "mentorship",
    sentiment: 0.8
  },
  {
    id: "post_04",
    author: "Zeynep Demir",
    handle: "@zeynep_in_istanbul",
    avatar_color: "#F45D22",
    text: "3 yıl TOEFL'a çalıştım, GRE'den 329 aldım, tam burs kabul aldım. Şimdi konsolosluk randevum iptal edildi ve yeni randevu tarihi gösterilmiyor. Tüm hayallerim askıya alındı. Babam \"gitme Türkiye'de oku\" diyor ama burada benim alanımda program yok.",
    timestamp: "3h",
    likes: 8934,
    retweets: 3891,
    replies: 1205,
    category: "personal_experience",
    topic: "visa_delay",
    sentiment: -0.9
  },
  {
    id: "post_05",
    author: "Hurriyet Daily News",
    handle: "@hdailynews",
    avatar_color: "#E0245E",
    text: "Visa refusal rates for Turkish nationals applying for US F-1 student visas have reached 38%, up from 19% two years ago, according to newly released State Department data. Analysts link the increase to \"enhanced vetting\" tied to regional geopolitical tensions.",
    timestamp: "6h",
    likes: 12450,
    retweets: 6789,
    replies: 2341,
    category: "news",
    topic: "visa_statistics",
    sentiment: -0.6
  },
  {
    id: "post_06",
    author: "Mehmet from Ankara",
    handle: "@mehmetthink",
    avatar_color: "#FFAD1F",
    text: "Interview experience at the US Embassy Ankara last week: waited 4 hours, interviewed for 90 seconds, handed a slip saying \"administrative processing\" with no timeline. Cornell orientation starts in 6 weeks. I've already paid the deposit. Somebody please tell me this is normal.",
    timestamp: "7h",
    likes: 6721,
    retweets: 2890,
    replies: 1534,
    category: "personal_experience",
    topic: "visa_interview",
    sentiment: -0.7
  },
  {
    id: "post_07",
    author: "EducationUSA Türkiye",
    handle: "@eduusa_turkey",
    avatar_color: "#794BC4",
    text: "IMPORTANT: If your F-1 visa is in administrative processing, here's what you can do: (1) Stay in touch with your university DSO, (2) Provide any additional documents requested, (3) Most cases resolve within 60 days. Don't panic — we're here to help. Free advising sessions Fri at 14:00.",
    timestamp: "8h",
    likes: 9234,
    retweets: 4521,
    replies: 412,
    category: "official",
    topic: "advice",
    sentiment: 0.5
  },
  {
    id: "post_08",
    author: "TRT World",
    handle: "@trtworld",
    avatar_color: "#E0245E",
    text: "BREAKING: US State Department announces new guidance affecting student visa interviews from 12 countries including Turkey. New screening procedures expected to add 60-90 days to processing times. Full statement expected later today.",
    timestamp: "1h",
    likes: 15230,
    retweets: 8764,
    replies: 3421,
    category: "news",
    topic: "policy_change",
    sentiment: -0.5
  },
  {
    id: "post_09",
    author: "Can Özdemir",
    handle: "@can_ozdemir_eng",
    avatar_color: "#1DA1F2",
    text: "Plot twist: after 3 months of \"administrative processing\" and nearly losing my CMU offer, my visa came through yesterday. To everyone waiting — it DOES happen. Hold on. I know it's brutal. I cried more times than I can count. But keep going.",
    timestamp: "9h",
    likes: 22340,
    retweets: 9876,
    replies: 1234,
    category: "personal_experience",
    topic: "visa_success",
    sentiment: 0.9
  },
  {
    id: "post_10",
    author: "Prof. Orhan Yılmaz",
    handle: "@orhanyilmaz_metu",
    avatar_color: "#17BF63",
    text: "METU's engineering graduate programs are currently accepting late applications from students whose US plans have been disrupted. We have funding. We have world-class research groups. You don't have to put your life on hold. Türkiye'nin sana ihtiyacı var.",
    timestamp: "10h",
    likes: 14567,
    retweets: 5432,
    replies: 687,
    category: "institutional_response",
    topic: "alternative_options",
    sentiment: 0.7
  },
  {
    id: "post_11",
    author: "David Karlsson",
    handle: "@karlsson_journalist",
    avatar_color: "#FFAD1F",
    text: "Thread 🧵: I spent a week at the US Consulate General in Istanbul interviewing Turkish students affected by the new visa restrictions. The stories are devastating. Here are 10 things every Turkish student applying to US universities needs to know right now. 1/10",
    timestamp: "11h",
    likes: 7823,
    retweets: 4521,
    replies: 987,
    category: "journalism",
    topic: "investigation",
    sentiment: -0.4
  },
  {
    id: "post_12",
    author: "Turkish Student Association",
    handle: "@tsa_usa",
    avatar_color: "#794BC4",
    text: "WE'RE HERE FOR YOU 🇹🇷 Free legal consultations, peer support groups, and emergency housing for Turkish students affected by visa delays. 47 American-Turkish lawyers are volunteering their time. DM us or email help@tsa-usa.org. You are not alone in this.",
    timestamp: "12h",
    likes: 11234,
    retweets: 8901,
    replies: 423,
    category: "support",
    topic: "community",
    sentiment: 0.9
  },
  {
    id: "post_13",
    author: "Kaan Akbaş",
    handle: "@kaanakbas_istanbul",
    avatar_color: "#E0245E",
    text: "Honest question: why are we still fighting so hard to study in a country that clearly doesn't want us? Germany offers free tuition, Canada has a faster visa track, UK has one-year masters. Maybe it's time Turkish students stop viewing the US as the only option.",
    timestamp: "5h",
    likes: 8901,
    retweets: 4532,
    replies: 2109,
    category: "opinion",
    topic: "alternatives",
    sentiment: -0.3
  },
  {
    id: "post_14",
    author: "Dr. Selin Arslan",
    handle: "@selinarslan_md",
    avatar_color: "#17BF63",
    text: "15 years ago I was a Turkish medical student worried about my US residency visa. Today I run a cardiology research lab at Johns Hopkins with 4 Turkish PhD students. Every one of them faced what you're facing now. Every one got through. Your story is not finished.",
    timestamp: "4h",
    likes: 45230,
    retweets: 18920,
    replies: 3421,
    category: "support",
    topic: "success_story",
    sentiment: 0.9
  },
  {
    id: "post_15",
    author: "Istanbul Study Abroad",
    handle: "@istanbul_abroad",
    avatar_color: "#FFAD1F",
    text: "UPDATE: 8 US universities have confirmed they will hold admission offers for Turkish students whose visas are delayed beyond the fall semester. These include UIUC, UT Austin, UPenn, Georgia Tech, and 4 others. We'll publish the full list once we get permission.",
    timestamp: "2h",
    likes: 6789,
    retweets: 5432,
    replies: 1098,
    category: "news",
    topic: "institutional_response",
    sentiment: 0.6
  },
  {
    id: "post_16",
    author: "Berk Yıldız",
    handle: "@berk_in_berlin",
    avatar_color: "#1DA1F2",
    text: "Switched my PhD application from Stanford to TU Berlin after my visa kept getting delayed. Germany: full funding, 3.5 years, same research quality, no visa drama, and they actually welcomed me. Sometimes the \"second choice\" turns out to be the right choice. No regrets.",
    timestamp: "6h",
    likes: 22340,
    retweets: 9876,
    replies: 1234,
    category: "personal_experience",
    topic: "alternatives",
    sentiment: 0.7
  },
  {
    id: "post_17",
    author: "US Embassy Ankara",
    handle: "@usembassyankara",
    avatar_color: "#794BC4",
    text: "We understand students are experiencing delays. The US remains committed to welcoming qualified international students. For the most current visa wait times, please visit travel.state.gov. Interview slots are released daily at 09:00 local time.",
    timestamp: "14h",
    likes: 4567,
    retweets: 3210,
    replies: 5876,
    category: "official",
    topic: "official_statement",
    sentiment: 0.0
  },
  {
    id: "post_18",
    author: "Elif Şahin",
    handle: "@elif_sahin_phd",
    avatar_color: "#E0245E",
    text: "Danışmanım \"6 ay bekleyelim\" diyor ama 6 ayım yok. Kira vereceğim, burs kaybettim, aileme yük oluyorum. Türk öğrenciler olarak sanki yanlış bir şey yapmış gibi hissettiriliyoruz ama tek suçumuz bir ülkede doğmak. Bu adil değil. #turkstudents #visaissues",
    timestamp: "8h",
    likes: 14567,
    retweets: 6789,
    replies: 2345,
    category: "personal_experience",
    topic: "emotional_impact",
    sentiment: -0.85
  },
  {
    id: "post_19",
    author: "Global Higher Ed Watch",
    handle: "@ghe_watch",
    avatar_color: "#17BF63",
    text: "New report: Turkish students contributed $1.2 billion to the US higher education economy in 2024. For every qualified Turkish student turned away, Canada, UK, and Germany gain a future researcher, doctor, or engineer. The question is: what is the US losing?",
    timestamp: "16h",
    likes: 8901,
    retweets: 5432,
    replies: 1098,
    category: "analysis",
    topic: "economic_impact",
    sentiment: 0.1
  },
  {
    id: "post_20",
    author: "Ayşe Karaoğlu",
    handle: "@ayse_in_america",
    avatar_color: "#F45D22",
    text: "I made it to the US two years ago. I tell my cousins in Istanbul that America was the land of opportunity. Now they text me asking if I'm safe. How did we get here? I just wanted to finish my degree and contribute. That's all any of us ever wanted.",
    timestamp: "3h",
    likes: 9876,
    retweets: 4321,
    replies: 1567,
    category: "personal_experience",
    topic: "disillusionment",
    sentiment: -0.5
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

  function debugLog() {
    if (FEED_CONFIG.debug && typeof console !== "undefined") {
      console.log.apply(console, ["[feed]"].concat(Array.prototype.slice.call(arguments)));
    }
  }

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

  function customOrderSort(posts, conditionKey) {
    var order = (FEED_CONFIG.customOrderings || {})[conditionKey];
    if (!order || !order.length) {
      debugLog("No customOrderings defined for condition", conditionKey, "falling back to original order.");
      return posts.slice();
    }
    var byId = {};
    posts.forEach(function(p) { byId[p.id] = p; });

    var ordered = [];
    var used = {};
    order.forEach(function(id) {
      if (byId[id]) {
        ordered.push(byId[id]);
        used[id] = true;
      }
    });
    // Append any posts not listed in the custom order, preserving original order
    posts.forEach(function(p) {
      if (!used[p.id]) ordered.push(p);
    });
    return ordered;
  }

  function sortPosts(posts, mode) {
    switch (mode) {
      case "random":
        return shuffleArray(posts, hashString(participantId));
      case "custom_order":
        return customOrderSort(posts, condition);
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
  debugLog("condition=" + condition, "sortMode=" + sortMode, "posts=" + sortedPosts.length);

  // ---- Format numbers ----
  function formatCount(n) {
    if (!FEED_CONFIG.useRelativeCounts) return String(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  // ---- Inject CSS ----
  var style = document.createElement("style");
  style.textContent = [
    ".feed-wrapper {",
    "  max-width: " + FEED_CONFIG.maxWidth + ";",
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
  if (FEED_CONFIG.showHeader) {
    var header = document.createElement("div");
    header.className = "feed-header";
    var tabsHtml = "";
    if (FEED_CONFIG.showTabs && FEED_CONFIG.tabs && FEED_CONFIG.tabs.length) {
      tabsHtml = '<div class="feed-header-tabs">';
      for (var t = 0; t < FEED_CONFIG.tabs.length; t++) {
        var isActive = (t === FEED_CONFIG.activeTabIndex) ? " active" : "";
        tabsHtml += '<div class="feed-header-tab' + isActive + '">' + FEED_CONFIG.tabs[t] + "</div>";
      }
      tabsHtml += "</div>";
    }
    header.innerHTML = '<div class="feed-header-title">' + FEED_CONFIG.headerTitle + "</div>" + tabsHtml;
    feedWrapper.appendChild(header);
  }

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

    var countsHtml = FEED_CONFIG.showEngagementCounts
      ? '<span class="feed-action-count">' + formatCount(post.replies) + '</span>'
      : '<span class="feed-action-count"></span>';
    var retweetCountHtml = FEED_CONFIG.showEngagementCounts
      ? '<span class="feed-action-count">' + formatCount(post.retweets) + '</span>'
      : '<span class="feed-action-count"></span>';
    var likeCountHtml = FEED_CONFIG.showEngagementCounts
      ? '<span class="feed-action-count">' + formatCount(post.likes) + '</span>'
      : '<span class="feed-action-count"></span>';

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
      '      <button class="feed-action-btn reply" data-action="reply" data-post-id="' + post.id + '">' + ICONS.reply + countsHtml + '</button>',
      '      <button class="feed-action-btn retweet" data-action="retweet" data-post-id="' + post.id + '">' + ICONS.retweet + retweetCountHtml + '</button>',
      '      <button class="feed-action-btn like" data-action="like" data-post-id="' + post.id + '">' + ICONS.like + likeCountHtml + '</button>',
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
    debugLog("engagement", action, postId, !isActive);
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
    threshold: FEED_CONFIG.intersectionThreshold
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
