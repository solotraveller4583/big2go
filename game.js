(() => {
  'use strict';

  const SAVE_KEY = 'big2go-save-v1';
  const COIN_KEY = 'big2go-virtual-coins-v1';
  const COIN_PEAK_KEY = 'big2go-virtual-coins-peak-v1';
  const AI_COINS_KEY = 'big2go-ai-coins-v1';
  const PLAYER_PROFILE_KEY = 'big2go-player-profile-v1';
  const DEFAULT_PLAYER_NAME = '';
  const MAX_PLAYER_NAME_LENGTH = 16;
  const AI_PROFILE_KEY = 'big2go-ai-profile-v1';
  const SOUND_SETTINGS_KEY = 'big2go-sound-settings-v1';
  const STARTING_COINS = 100;
  const STARTING_LEVEL = 1;
  const MAX_LEVEL = 30;
  const HINT_LIMIT = 3;
  const BRAIN_BONUS_ZERO_HINTS = 30;
  const BRAIN_BONUS_ONE_HINT_LEFT = 10;
  const LEGEND_MODE_TOTAL_WINS = 300;
  // Wins required to advance from level N → N+1 (29 steps total).
  const LEVEL_UP_WINS = [
    3, 3, 4, 5, 5, 6, 7, 8, 10,
    10, 12, 15, 9, 9, 9, 9, 9, 8, 9,
    20, 18, 17, 16, 15, 14, 13, 12, 13, 12
  ];
  const LEVEL_WIN_THRESHOLDS = (() => {
    const thresholds = { 1: 0 };
    let cumulative = 0;
    LEVEL_UP_WINS.forEach((stepWins, index) => {
      cumulative += stepWins;
      thresholds[index + 2] = cumulative;
    });
    thresholds[MAX_LEVEL] = LEGEND_MODE_TOTAL_WINS;
    return thresholds;
  })();
  const LEVEL_TIERS = [
    { min: 1, max: 10, emoji: '🥉', title: 'Rookie Challenger', skill: 'rookie' },
    { min: 11, max: 20, emoji: '🥈', title: 'Battle Strategist', skill: 'strategist' },
    { min: 21, max: 29, emoji: '🥇', title: 'Big2Go Master', skill: 'master' },
    { min: 30, max: 30, emoji: '👑', title: 'Legend Mode', skill: 'legend' }
  ];
  const ENTRY_FEE_COINS = 10;
  const ROOM_SESSION_KEY = 'big2go-room-session-v1';
  const RULES_HTML = `
    <ul>
      <li><strong>Card order:</strong> 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2. In Big Two, 2 is the highest rank.</li>
      <li><strong>Suit order:</strong> diamonds, clubs, hearts, spades.</li>
      <li><strong>Opening player:</strong> whoever holds <strong>3♦</strong> starts the game, then may play any valid opening hand.</li>
      <li><strong>Match the count:</strong> beat a single with a single, a pair with a pair, a triple with a triple.</li>
      <li><strong>Five-card plays:</strong> straight, flush, full house, four of a kind, and straight flush.</li>
      <li><strong>Passing:</strong> if you cannot beat the current trick, pass. The last player to win the trick leads the next one.</li>
      <li><strong>Goal:</strong> empty your hand before the AI players do.</li>
    </ul>`;

  function t(key, vars = {}) {
    return window.Big2GoI18n?.t(key, vars) ?? key;
  }

  function g(key, vars = {}) {
    return window.Big2GoAIDialogue?.getGameLine?.(key, vars) ?? key;
  }

  const COIN_ICON_HTML = '<span class="gold-coin-icon" aria-hidden="true"></span>';

  function coinIcon() {
    return COIN_ICON_HTML;
  }

  function withCoinIcon(text) {
    return String(text).replace(/\{\{coin\}\}|🪙/g, COIN_ICON_HTML);
  }

  function coinLabel(amount, prefix = '') {
    return `${prefix}${coinIcon()} ${amount}`;
  }

  function getRulesHtml() {
    return window.Big2GoI18n?.getRulesHtml() || RULES_HTML;
  }

  const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const SUITS = [
    { key: 'D', symbol: '♦', name: 'diamonds', color: 'red' },
    { key: 'C', symbol: '♣', name: 'clubs', color: 'black' },
    { key: 'H', symbol: '♥', name: 'hearts', color: 'red' },
    { key: 'S', symbol: '♠', name: 'spades', color: 'black' }
  ];
  const FIVE_KIND_ORDER = { 'straight': 1, 'flush': 2, 'full-house': 3, 'four-kind': 4, 'straight-flush': 5 };
  const STRAIGHT_RULES = Object.freeze({
    TRADITIONAL: 'traditional',
    ALTERNATIVE: 'alternative'
  });
  const DEFAULT_STRAIGHT_RULE = STRAIGHT_RULES.ALTERNATIVE;
  const ORACLE = {
    single: ['Small spark, big nerve.', 'The alley hushes for a beat.', 'A neat little slash through the night.'],
    pair: ['Two cards, one rhythm.', 'The crowd hears the bass line.', 'A tidy little power chord.'],
    triple: ['Three-card thunder!', 'That move rattled the lanterns.', 'Triple pressure — nice.'],
    straight: ['The Big2Go path starts to snake forward.', 'Five in a row, smooth as silk.', 'A sleek line through the crowd.'],
    flush: ['All one suit — very stylish.', 'The lights lean in to watch.', 'A polished color wave.'],
    'full-house': ['Full house! The crowd loses its mind.', 'That is a heavyweight combo.', 'That trick just got dramatic.'],
    'four-kind': ['Four of a kind! Massive flex.', 'That was a thunder clap.', 'The lane is on fire.'],
    'straight-flush': ['Straight flush! Fireworks now!', 'That is a headline move.', 'Absolute festival chaos.']
  };
  const OPENING_LINE = '♦ 3 Holder Starts';
  const ALLOWED_REACTIONS = new Set(['😂', '👏', '🔥', '😮', '🎉', '💪', '😎', '🙌']);

  const state = {
    settings: { players: 4, straightRule: DEFAULT_STRAIGHT_RULE },
    players: [],
    humanIndex: 0,
    currentPlayer: 0,
    startingPlayer: 0,
    trick: { play: null, leader: 0, passes: 0 },
    firstTrick: true,
    selected: new Set(),
    logs: [],
    round: 1,
    sparks: 0,
    heat: 0,
    coins: { balance: STARTING_COINS, prizePool: 0, entryPaid: false, paidOut: false, lastTurn: '' },
    sound: true,
    soundVolume: 0.72,
    voiceVolume: 0.9,
    gameOver: false,
    busy: false,
    sortMode: 'rank',
    aiTimer: null,
    confettiLayer: null,
    roomSocket: null,
    roomPollTimer: null,
    voicePollTimer: null,
    lastRoomNotice: '',
    chat: [],
    chatExpanded: false,
    lastChatSentAt: 0,
    lastReactionSentAt: 0,
    seenReactionIds: new Set(),
    liveRoom: null,
    liveRoomPlayers: [],
    liveRoomCardSyncKey: null,
    playSession: {
      gamesPlayed: 0,
      wins: 0,
      coinsEarned: 0,
      bestCombo: '',
      bestComboScore: 0,
      lastWinner: null,
      farewellSnapshot: []
    },
    lastMatchStory: null,
    pendingVictoryReveal: null,
    hintsUsed: 0,
    hintPendingAction: null,
    levelUpFxTimers: [],
    voice: {
      enabled: false,
      micMuted: true,
      speakerMuted: false,
      mutedPlayers: new Set(),
      volumes: new Map(),
      statuses: [],
      stream: null,
      peers: new Map(),
      analyser: null,
      speaking: false,
      speakingTimer: null,
      lastStateSentAt: 0,
      permissionAsked: false,
      pushToTalk: false,
      holdingToTalk: false,
      mixerOpen: false,
      pendingAudioPlay: false,
      remoteUnlockBound: false
    },
    lastLocalReactionEcho: { emoji: '', at: 0 }
  };

  const audio = {
    context: null,
    master: null,
    levelUpMaster: null,
    lastCardMaster: null,
    landingMusicMaster: null,
    landingMusicActive: false,
    victoryMusicMaster: null,
    victoryMusicActive: false,
    victoryTimer: null,
    levelUpTimer: null,
    contextStateHooked: false,
    pendingLastCardDoorbell: null
  };

  const LEVEL_UP_MASTER_GAIN = 0.96;
  const LAST_CARD_MASTER_GAIN = 0.98;
  const LAST_CARD_SOUND_DELAY = 0.08;
  const LAST_CARD_GAIN_BOOST = 4.2;
  const LANDING_MUSIC_GAIN = 0.3;
  const VICTORY_MUSIC_GAIN = 0.78;
  const LANDING_MUSIC = {
    bpm: 102,
    bar: 0,
    beat: 0,
    timer: null,
    chords: [
      { bass: 73.42, arp: [293.66, 349.23, 440, 523.25] },
      { bass: 58.27, arp: [233.08, 293.66, 349.23, 440] },
      { bass: 43.65, arp: [174.61, 220, 261.63, 329.63] },
      { bass: 32.7, arp: [130.81, 164.81, 196, 261.63] },
      { bass: 73.42, arp: [293.66, 392, 440, 587.33] },
      { bass: 55, arp: [220, 277.18, 329.63, 440] },
      { bass: 41.2, arp: [164.81, 207.65, 261.63, 329.63] },
      { bass: 65.41, arp: [130.81, 196, 261.63, 392] }
    ]
  };
  const VICTORY_MUSIC = {
    bpm: 148,
    step: 0,
    timer: null,
    melody: [
      523.25, null, 659.25, null, 783.99, null, 659.25, 523.25,
      587.33, null, 698.46, null, 880, null, 698.46, 587.33,
      659.25, null, 783.99, null, 1046.5, null, 783.99, 659.25,
      523.25, 659.25, 783.99, 1046.5, 1318.51, 1174.66, 1046.5, 783.99
    ],
    bassByBar: [
      [65.41, 65.41, 49, 49, 65.41, 65.41, 49, 49],
      [73.42, 73.42, 55, 55, 73.42, 73.42, 55, 55],
      [82.41, 82.41, 61.74, 61.74, 82.41, 82.41, 61.74, 61.74],
      [65.41, 49, 43.65, 49, 65.41, 49, 43.65, 65.41]
    ]
  };

  const LEVEL_FANFARE_SCALES = {
    rookie: [392, 440, 494, 523.25, 587.33, 659.25],
    strategist: [523.25, 587.33, 659.25, 698.46, 783.99, 880],
    master: [659.25, 783.99, 880, 987.77, 1046.5, 1174.66],
    legend: [783.99, 987.77, 1174.66, 1318.51, 1567.98, 1975.53]
  };

  const LEVEL_CONFETTI_PALETTES = {
    rookie: ['#ffd24a', '#ff2d95', '#00e5ff', '#ff8a00', '#ff47d4'],
    strategist: ['#ffd24a', '#ff9f43', '#ff2d95', '#ffb347', '#00e5ff'],
    master: ['#ff6bcb', '#b59cff', '#ffd24a', '#ff8ad8', '#00e5ff'],
    legend: ['#ffd700', '#fff4b0', '#ff9f1c', '#ff2d95', '#ffffff']
  };

  const CARNIVAL_CELEBRATION_HUES = [42, 320, 280, 15, 195, 330];

  const DEFEAT_RIVAL_THEMES = {
    bruno: { accent: '#ff8a00', secondary: '#ff2d95', tertiary: '#ffd24a', emoji: '🔥', chase: 1.9, frame: 'flare', vibe: '🔥' },
    luna: { accent: '#ff47d4', secondary: '#b347ff', tertiary: '#00e5ff', emoji: '🌙', chase: 2.2, frame: 'moon', vibe: '✨' },
    kiro: { accent: '#00e5ff', secondary: '#4d9fff', tertiary: '#b347ff', emoji: '📊', chase: 1.7, frame: 'pulse', vibe: '🧠' },
    pico: { accent: '#ffd24a', secondary: '#00e5ff', tertiary: '#ff4757', emoji: '⚡', chase: 1.5, frame: 'bolt', vibe: '⚡' },
    bao: { accent: '#ffb347', secondary: '#ff4757', tertiary: '#ffd24a', emoji: '🥟', chase: 2.0, frame: 'steam', vibe: '🥟' },
    tora: { accent: '#7dd3fc', secondary: '#b347ff', tertiary: '#ffd24a', emoji: '☁️', chase: 2.4, frame: 'cloud', vibe: '☁️' },
    default: { accent: '#00e5ff', secondary: '#ff2d95', tertiary: '#ffd24a', emoji: '🎭', chase: 2.0, frame: 'pulse', vibe: '🎭' }
  };

  const LEVEL_JOURNEY_THEMES = [
    { id: 'gold-rush', emoji: '🎠', chapterKey: 'levelUp.chapter.goldRush', accent: '#ffd24a', secondary: '#ff8a00', tertiary: '#ff2d95', chase: 2.1, motion: 'gallop' },
    { id: 'neon-pulse', emoji: '✨', chapterKey: 'levelUp.chapter.neonPulse', accent: '#ff2d95', secondary: '#ff47d4', tertiary: '#00e5ff', chase: 1.7, motion: 'pulse' },
    { id: 'cyber-wave', emoji: '⚡', chapterKey: 'levelUp.chapter.cyberWave', accent: '#00e5ff', secondary: '#4d9fff', tertiary: '#b347ff', chase: 2.5, motion: 'wave' },
    { id: 'ruby-flame', emoji: '🔥', chapterKey: 'levelUp.chapter.rubyFlame', accent: '#ff4757', secondary: '#ff8a00', tertiary: '#ffd24a', chase: 1.9, motion: 'flare' },
    { id: 'jade-luck', emoji: '🍀', chapterKey: 'levelUp.chapter.jadeLuck', accent: '#2ee59d', secondary: '#00e5ff', tertiary: '#ffd24a', chase: 2.3, motion: 'spark' },
    { id: 'violet-crown', emoji: '👑', chapterKey: 'levelUp.chapter.violetCrown', accent: '#b347ff', secondary: '#ff2d95', tertiary: '#ffd24a', chase: 1.5, motion: 'royal' }
  ];

  const LEVEL_TIER_PATH = {
    rookie: { color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.45)' },
    strategist: { color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.45)' },
    master: { color: '#ffd24a', glow: 'rgba(255, 210, 74, 0.5)' },
    legend: { color: '#ff2d95', glow: 'rgba(255, 45, 149, 0.45)' }
  };

  const els = {
    home: document.querySelector('#home-screen'),
    game: document.querySelector('#game-screen'),
    sessionComplete: document.querySelector('#session-complete-screen'),
    sessionSummary: document.querySelector('#session-summary'),
    sessionFarewells: document.querySelector('#session-farewells'),
    sessionPlayAgain: document.querySelector('#session-play-again'),
    sessionBackHome: document.querySelector('#session-back-home'),
    resultStory: document.querySelector('#game-result-story-screen'),
    resultStoryHeadline: document.querySelector('#result-story-headline'),
    resultStoryHero: document.querySelector('#result-story-hero'),
    resultStoryPlayers: document.querySelector('#result-story-players'),
    resultStoryStats: document.querySelector('#result-story-stats'),
    resultStoryFarewells: document.querySelector('#result-story-farewells'),
    resultStoryNeonChase: document.querySelector('#result-story-neon-chase'),
    resultStoryFxLayer: document.querySelector('#result-story-fx-layer'),
    resultStoryHome: document.querySelector('#result-story-home'),
    resultStoryPlayAgain: document.querySelector('#result-story-play-again'),
    levelUp: document.querySelector('#level-up-screen'),
    levelUpEyebrow: document.querySelector('#level-up-eyebrow'),
    levelUpTitle: document.querySelector('#level-up-title'),
    levelUpMessage: document.querySelector('#level-up-message'),
    levelUpAvatar: document.querySelector('#level-up-avatar'),
    levelUpFrom: document.querySelector('#level-up-from'),
    levelUpTo: document.querySelector('#level-up-to'),
    levelUpQuote: document.querySelector('#level-up-quote'),
    levelUpJourneyStrip: document.querySelector('#level-up-journey-strip'),
    levelUpChapter: document.querySelector('#level-up-chapter'),
    levelUpJourneyIcon: document.querySelector('#level-up-journey-icon'),
    levelUpNeonChase: document.querySelector('#level-up-neon-chase'),
    levelUpFxLayer: document.querySelector('#level-up-fx-layer'),
    levelUpMarqueeTrack: document.querySelector('#level-up-marquee-track'),
    levelUpContinue: document.querySelector('#level-up-continue'),
    profileScreen: document.querySelector('#profile-screen'),
    profileTitle: document.querySelector('#profile-title'),
    profileClose: document.querySelector('#profile-close'),
    profileHero: document.querySelector('#profile-hero'),
    profileStats: document.querySelector('#profile-stats'),
    profileRankPath: document.querySelector('#profile-rank-path'),
    profileRivalsTitle: document.querySelector('#profile-rivals-title'),
    profileRivalsGrid: document.querySelector('#profile-rivals-grid'),
    roomScreen: document.querySelector('#room-screen'),
    roomClose: document.querySelector('#room-close'),
    exitConfirmDialog: document.querySelector('#exit-confirm-dialog'),
    playerCount: document.querySelector('#player-count'),
    start: document.querySelector('#start-button'),
    continue: document.querySelector('#continue-button'),
    privateRoom: document.querySelector('#private-room-button'),
    rules: document.querySelector('#demo-button'),
    demo: document.querySelector('#demo-button'),
    playDemoDialog: document.querySelector('#play-demo-dialog'),
    playDemoScreen: document.querySelector('#play-demo-screen'),
    playDemoToggle: document.querySelector('#play-demo-toggle'),
    playDemoBarFill: document.querySelector('#play-demo-bar-fill'),
    playDemoTime: document.querySelector('#play-demo-time'),
    playDemoSteps: document.querySelector('#play-demo-steps'),
    playDemoRecDot: document.querySelector('#play-demo-rec-dot'),
    playDemoRulesButton: document.querySelector('#play-demo-rules-button'),
    playDemoStartButton: document.querySelector('#play-demo-start-button'),
    share: document.querySelector('#share-button'),
    profileButton: document.querySelector('#profile-button'),
    playerProfileAvatar: document.querySelector('#player-profile-avatar'),
    playerNameLabel: document.querySelector('#player-name-label'),
    playerLevelLabel: document.querySelector('#player-level-label'),
    playerNameInput: document.querySelector('#player-name-input'),
    playerSetupAvatarMale: document.querySelector('#player-setup-avatar-male'),
    playerSetupAvatarFemale: document.querySelector('#player-setup-avatar-female'),
    back: document.querySelector('#back-button'),
    sound: document.querySelector('#sound-button'),
    play: document.querySelector('#play-button'),
    pass: document.querySelector('#pass-button'),
    hint: document.querySelector('#hint-button'),
    sort: document.querySelector('#sort-button'),
    restart: document.querySelector('#restart-button'),
    hand: document.querySelector('#hand'),
    opponents: document.querySelector('#opponent-area'),
    trickPlay: document.querySelector('#trick-play'),
    trickMeta: document.querySelector('#trick-meta'),
    trickHelp: document.querySelector('#trick-help'),
    turnLabel: document.querySelector('#turn-label'),
    tableSubtitle: document.querySelector('#table-subtitle'),
    playerLeftCount: document.querySelector('#player-left-count'),
    trickCount: document.querySelector('#trick-count'),
    roundCount: document.querySelector('#round-count'),
    sparkCount: document.querySelector('#spark-count'),
    coinBalance: document.querySelector('#coin-balance'),
    prizePoolValue: document.querySelector('#prize-pool-value'),
    coinFxLayer: document.querySelector('#coin-fx-layer'),
    selectedCount: document.querySelector('#selected-count'),
    logList: document.querySelector('#log-list'),
    helpDialog: document.querySelector('#help-dialog'),
    helpTitle: document.querySelector('#help-title'),
    helpText: document.querySelector('#help-text'),
    helpMenu: document.querySelector('#help-dialog-menu'),
    helpConfirm: document.querySelector('#help-confirm-button'),
    helpDismiss: document.querySelector('#help-dismiss-button'),
    heatText: document.querySelector('#heat-text'),
    heatValue: document.querySelector('#heat-value'),
    heatFill: document.querySelector('#heat-fill'),
    chatPanel: document.querySelector('#room-chat-panel'),
    chatToggle: document.querySelector('#room-chat-toggle'),
    chatPreview: document.querySelector('#room-chat-preview'),
    chatMessages: document.querySelector('#room-chat-messages'),
    chatCount: document.querySelector('#room-chat-count'),
    chatForm: document.querySelector('#room-chat-form'),
    chatInput: document.querySelector('#room-chat-input'),
    chatSend: document.querySelector('#room-chat-send'),
    voicePanel: document.querySelector('#voice-panel'),
    voiceMic: document.querySelector('#voice-mic-button'),
    voiceSpeaker: document.querySelector('#voice-speaker-button'),
    voiceMuteAll: document.querySelector('#voice-mute-all-button'),
    voicePtt: document.querySelector('#voice-ptt-button'),
    voiceMixer: document.querySelector('#voice-mixer'),
    voiceSpeakingBanner: document.querySelector('#voice-speaking-banner'),
    voiceStatus: document.querySelector('#voice-status'),
    remoteAudio: document.querySelector('#remote-audio'),
    roomRecovery: document.querySelector('#room-recovery-card'),
    roomRecoverySummary: document.querySelector('#room-recovery-summary'),
    roomRecoveryPlayers: document.querySelector('#room-recovery-players'),
    roomRejoin: document.querySelector('#room-rejoin-button'),
    roomExitSession: document.querySelector('#room-exit-session-button')
  };

  function makeCard(rankIndex, suitIndex) {
    const rank = RANKS[rankIndex];
    const suit = SUITS[suitIndex];
    return {
      id: `${rank}${suit.key}`,
      rankIndex,
      suitIndex,
      rank,
      suitKey: suit.key,
      suitSymbol: suit.symbol,
      suitName: suit.name,
      color: suit.color,
      short: `${rank}${suit.symbol}`,
      label: `${rank} of ${suit.name}`
    };
  }

  function cardFromId(id) {
    for (let r = 0; r < RANKS.length; r++) {
      if (id.startsWith(RANKS[r])) {
        const suitKey = id.slice(RANKS[r].length);
        const suitIndex = SUITS.findIndex(s => s.key === suitKey);
        if (suitIndex >= 0) return makeCard(r, suitIndex);
      }
    }
    return null;
  }

  function createDeck() {
    const deck = [];
    for (let r = 0; r < RANKS.length; r++) {
      for (let s = 0; s < SUITS.length; s++) deck.push(makeCard(r, s));
    }
    return deck;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function sortCards(cards) {
    return [...cards].sort((a, b) => a.rankIndex - b.rankIndex || a.suitIndex - b.suitIndex);
  }

  function sortBySuit(cards) {
    return [...cards].sort((a, b) => a.suitIndex - b.suitIndex || a.rankIndex - b.rankIndex);
  }

  function sortForCombos(cards) {
    const rankCounts = new Map();
    const suitCounts = new Map();
    cards.forEach(card => {
      rankCounts.set(card.rankIndex, (rankCounts.get(card.rankIndex) || 0) + 1);
      suitCounts.set(card.suitIndex, (suitCounts.get(card.suitIndex) || 0) + 1);
    });
    return [...cards].sort((a, b) => {
      const rankGroupDiff = (rankCounts.get(b.rankIndex) || 0) - (rankCounts.get(a.rankIndex) || 0);
      if (rankGroupDiff) return rankGroupDiff;
      const suitGroupDiff = (suitCounts.get(b.suitIndex) || 0) - (suitCounts.get(a.suitIndex) || 0);
      if (suitGroupDiff) return suitGroupDiff;
      return a.rankIndex - b.rankIndex || a.suitIndex - b.suitIndex;
    });
  }

  function sortedHumanHand(cards) {
    if (state.sortMode === 'suit') return sortBySuit(cards);
    if (state.sortMode === 'combo') return sortForCombos(cards);
    return sortCards(cards);
  }

  function sortModeLabel() {
    return state.sortMode === 'suit' ? 'Suit/Flush' : state.sortMode === 'combo' ? 'Combo' : 'Rank';
  }

  function loadSoundSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SOUND_SETTINGS_KEY) || 'null') || {};
      state.soundVolume = Math.max(0, Math.min(1, Number(saved.soundVolume) || state.soundVolume || .72));
      state.voiceVolume = Math.max(0, Math.min(1, Number(saved.voiceVolume) || state.voiceVolume || .9));
    } catch (_) {}
  }

  function saveSoundSettings() {
    try { localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify({ soundVolume: state.soundVolume, voiceVolume: state.voiceVolume })); } catch (_) {}
    if (audio.master) audio.master.gain.value = Math.max(0, Math.min(1, state.soundVolume)) * 0.24;
    if (audio.levelUpMaster) {
      audio.levelUpMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume)) * LEVEL_UP_MASTER_GAIN;
    }
    if (audio.lastCardMaster) {
      audio.lastCardMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume)) * LAST_CARD_MASTER_GAIN;
    }
    if (audio.landingMusicMaster) {
      audio.landingMusicMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume)) * LANDING_MUSIC_GAIN;
    }
    if (audio.victoryMusicMaster) {
      audio.victoryMusicMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume)) * VICTORY_MUSIC_GAIN;
    }
    state.voice.peers?.forEach(entry => { if (entry.audio) entry.audio.volume = state.voiceVolume; });
  }

  function nextSortMode() {
    state.sortMode = state.sortMode === 'rank' ? 'suit' : state.sortMode === 'suit' ? 'combo' : 'rank';
    return state.sortMode;
  }

  function compareScores(a, b) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const av = a[i] ?? -1;
      const bv = b[i] ?? -1;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  function highestCard(cards) {
    return sortCards(cards).slice().sort((a, b) => b.rankIndex - a.rankIndex || b.suitIndex - a.suitIndex)[0];
  }

  function groupByRank(cards) {
    const groups = new Map();
    for (const card of cards) {
      if (!groups.has(card.rankIndex)) groups.set(card.rankIndex, []);
      groups.get(card.rankIndex).push(card);
    }
    for (const group of groups.values()) group.sort((a, b) => a.suitIndex - b.suitIndex);
    return groups;
  }

  function groupBySuit(cards) {
    const groups = new Map();
    for (const card of cards) {
      if (!groups.has(card.suitIndex)) groups.set(card.suitIndex, []);
      groups.get(card.suitIndex).push(card);
    }
    for (const group of groups.values()) group.sort((a, b) => a.rankIndex - b.rankIndex || a.suitIndex - b.suitIndex);
    return groups;
  }

  function playKey(cards) {
    return sortCards(cards).map(c => c.id).join('|');
  }

  function describeCards(cards) {
    return sortCards(cards).map(c => c.short).join(' ');
  }

  function describePlay(play) {
    const cards = play.cards;
    const cardList = describeCards(cards);
    if (cards.length === 1) return g('play.single', { card: cards[0].short });
    if (cards.length === 2) return g('play.pair', { cards: cardList });
    if (cards.length === 3) return g('play.triple', { cards: cardList });
    const name = {
      'straight': g('play.straight'),
      'flush': g('play.flush'),
      'full-house': g('play.fullHouse'),
      'four-kind': g('play.fourKind'),
      'straight-flush': g('play.straightFlush')
    }[play.kind] || g('play.fiveCard');
    return `${name}: ${cardList}`;
  }

  function buildPlay(cards, options = {}) {
    const sorted = sortCards(cards);
    const count = sorted.length;
    if (![1, 2, 3, 5].includes(count)) return null;

    if (count === 1) {
      const card = sorted[0];
      return { kind: 'single', count, cards: sorted, score: [1, card.rankIndex, card.suitIndex] };
    }

    if (count === 2 || count === 3) {
      const sameRank = sorted.every(card => card.rankIndex === sorted[0].rankIndex);
      if (!sameRank) return null;
      return { kind: count === 2 ? 'pair' : 'triple', count, cards: sorted, score: [count, sorted[0].rankIndex, Math.max(...sorted.map(card => card.suitIndex))] };
    }

    return buildFiveCardPlay(sorted, options);
  }

  function straightInfo(cards, options = {}) {
    const sorted = sortCards(cards);
    const uniqueRanks = [...new Set(sorted.map(card => card.rankIndex))];
    if (uniqueRanks.length !== 5) return null;

    const traditionalHigh = uniqueRanks.every((rank, index, arr) => index === 0 || rank === arr[index - 1] + 1) && uniqueRanks[4] < 12
      ? uniqueRanks[4]
      : null;
    if (traditionalHigh !== null) {
      const highCard = sorted.find(card => card.rankIndex === traditionalHigh);
      return { highRankIndex: traditionalHigh, highSuitIndex: highCard.suitIndex, highCard };
    }

    const rule = options.straightRule || DEFAULT_STRAIGHT_RULE;
    if (rule !== STRAIGHT_RULES.ALTERNATIVE) return null;

    const lowTwoStraights = [
      { ranks: [0, 1, 2, 11, 12], highRankIndex: 2 },
      { ranks: [0, 1, 2, 3, 12], highRankIndex: 3 }
    ];
    for (const candidate of lowTwoStraights) {
      if (candidate.ranks.every(rank => uniqueRanks.includes(rank))) {
        const highCard = sorted.find(card => card.rankIndex === candidate.highRankIndex);
        return { highRankIndex: candidate.highRankIndex, highSuitIndex: highCard.suitIndex, highCard };
      }
    }

    return null;
  }

  function buildFiveCardPlay(cards, options = {}) {
    const sorted = sortCards(cards);
    const rankGroups = groupByRank(sorted);
    const suitGroups = groupBySuit(sorted);
    const counts = [...rankGroups.values()].map(group => group.length).sort((a, b) => b - a);
    const rankEntries = [...rankGroups.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);

    const isFlush = suitGroups.size === 1;
    const straight = straightInfo(sorted, options);

    if (straight && isFlush) {
      return { kind: 'straight-flush', count: 5, cards: sorted, score: [5, straight.highRankIndex, straight.highSuitIndex] };
    }

    if (counts[0] === 4) {
      const quad = rankEntries[0][1].slice(0, 4);
      const kicker = rankEntries[1][1][0];
      return {
        kind: 'four-kind',
        count: 5,
        cards: sortCards([...quad, kicker]),
        score: [4, rankEntries[0][0], Math.max(...quad.map(card => card.suitIndex)), kicker.rankIndex, kicker.suitIndex]
      };
    }

    if (counts[0] === 3 && counts[1] === 2) {
      const tripleEntry = rankEntries.find(([, group]) => group.length === 3);
      const pairEntry = rankEntries.find(([, group]) => group.length === 2);
      const triple = tripleEntry[1].slice(0, 3);
      const pair = pairEntry[1].slice(0, 2);
      return {
        kind: 'full-house',
        count: 5,
        cards: sortCards([...triple, ...pair]),
        score: [3, tripleEntry[0], Math.max(...triple.map(card => card.suitIndex)), pairEntry[0], Math.max(...pair.map(card => card.suitIndex))]
      };
    }

    if (isFlush) {
      const best = sortCards(sorted).slice().sort((a, b) => b.rankIndex - a.rankIndex || b.suitIndex - a.suitIndex);
      return { kind: 'flush', count: 5, cards: sortCards(best), score: [2, ...best.flatMap(card => [card.rankIndex, card.suitIndex])] };
    }

    if (straight) {
      return { kind: 'straight', count: 5, cards: sorted, score: [1, straight.highRankIndex, straight.highSuitIndex] };
    }

    return null;
  }

  function playBeats(candidate, current) {
    if (!current || !current.play) return true;
    if (candidate.count !== current.play.count) return false;
    return compareScores(candidate.score, current.play.score) > 0;
  }

  function getHumanPlayer() {
    return state.players[state.humanIndex];
  }

  function updateContinueButton() {
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY));
    els.continue.classList.remove('hidden');
    els.continue.setAttribute('aria-label', hasSave ? 'Continue saved game' : 'Start and save a game to continue later');
  }

  function cancelAiTimer() {
    if (state.aiTimer) {
      clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }
  }

  function showHomeScreen() {
    showLandingScreen();
  }

  function showGameScreen() {
    stopLandingMusic();
    stopVictoryMusic();
    hideAllScreens();
    els.game?.classList.remove('hidden');
    document.body.classList.toggle('live-room-active', Boolean(state.liveRoom?.code));
  }

  function hideAllScreens() {
    els.home?.classList.add('hidden');
    els.game?.classList.add('hidden');
    els.sessionComplete?.classList.add('hidden');
    els.resultStory?.classList.add('hidden');
    els.resultStory?.classList.remove('is-revealing');
    els.levelUp?.classList.add('hidden');
    els.profileScreen?.classList.add('hidden');
    els.roomScreen?.classList.add('hidden');
    document.body.classList.remove('live-room-active', 'result-story-active', 'session-complete-active', 'level-up-active', 'profile-active', 'room-lobby-active');
    els.voicePanel?.classList.add('hidden');
  }

  function showLandingScreen() {
    hideAllScreens();
    els.home?.classList.remove('hidden');
    updateContinueButton();
    renderCoinHud();
    renderPlayerProfileHud();
    renderRoomRecovery();
    window.scrollTo(0, 0);
    startLandingMusic();
  }

  function captureMatchStory(winner, coinPrize = 0, brainBonus = null) {
    const bonus = brainBonus || buildBrainBonusMeta();
    const winnerIndex = state.players.indexOf(winner);
    return {
      winnerName: winner?.isHuman ? getResolvedPlayerName() : (winner?.name || 'Player'),
      humanWon: Boolean(winner?.isHuman),
      coinPrize: Math.max(0, Number(coinPrize) || 0),
      brainBonus: Math.max(0, Number(bonus.amount) || 0),
      hintsUsed: bonus.hintsUsed,
      hintsRemaining: bonus.hintsRemaining,
      brainBonusMessageKey: bonus.messageKey,
      coinsBalance: state.liveRoom?.code ? getWalletDisplayBalance() : state.coins.balance,
      sparks: state.sparks,
      round: state.round,
      playerCount: state.players.length,
      bestCombo: state.playSession.bestCombo || 'Opening spark',
      players: state.players.map((player, index) => ({
        name: player.isHuman ? getResolvedPlayerName() : (player.name || `Player ${index + 1}`),
        isHuman: Boolean(player.isHuman),
        finished: Boolean(player.finished) || index === winnerIndex,
        cardsLeft: Array.isArray(player.hand) ? player.hand.length : 0,
        coins: playerCoins(player, index),
        characterId: player.characterId || null,
        level: getProfileLevelForPlayer(player),
        won: index === winnerIndex
      })),
      farewells: window.Big2GoAICharacters?.getSessionFarewells?.(state, winner) || []
    };
  }

  function showResultStoryScreen() {
    stopLandingMusic();
    hideAllScreens();
    els.resultStory?.classList.remove('hidden');
    els.resultStory?.classList.add('is-revealing');
    document.body.classList.add('result-story-active');
    window.scrollTo(0, 0);
  }

  function createResultStoryFxRoll(story = {}) {
    const rivalSum = (story.players || []).reduce((sum, player) => sum + String(player.name || '').split('').reduce((inner, char) => inner + char.charCodeAt(0), 0), 0);
    const nonce = (Date.now() ^ Math.floor(performance.now() * 1000) ^ (Math.random() * 0x7fffffff)) >>> 0;
    const seed = (nonce * 2654435761 + rivalSum * 131709 + (story.sparks || 0) * 9973 + (story.round || 1) * 7919) >>> 0;
    return { seed, nonce };
  }

  function applyResultStoryFxTheme(screen, roll, humanWon) {
    if (!screen || !roll) return;
    const rng = mulberry32(roll.seed);
    const accent = hslFromSeed(roll.seed, humanWon ? 8 : 24, humanWon ? 78 : 72, humanWon ? 62 : 56);
    const secondary = hslFromSeed(roll.seed, humanWon ? 96 : 120, humanWon ? 82 : 70, humanWon ? 58 : 52);
    const tertiary = hslFromSeed(roll.seed, humanWon ? 180 : 200, humanWon ? 76 : 68, humanWon ? 60 : 54);
    screen.style.setProperty('--result-accent', accent);
    screen.style.setProperty('--result-secondary', secondary);
    screen.style.setProperty('--result-tertiary', tertiary);
    screen.style.setProperty('--result-rays-speed', `${(12 + rng() * 18).toFixed(2)}s`);
    screen.style.setProperty('--result-glow-speed', `${(2.8 + rng() * 3.4).toFixed(2)}s`);
    screen.style.setProperty('--result-frame-speed', `${(3.6 + rng() * 4.8).toFixed(2)}s`);
    screen.dataset.resultFxSeed = String(roll.seed);
  }

  function spawnResultStoryProceduralFx(layer, roll, humanWon) {
    if (!layer || !roll) return;
    layer.innerHTML = '';
    const rng = mulberry32(roll.seed ^ 0x85ebca6b);
    const symbolPool = humanWon
      ? ['🎉', '✨', '★', '🪙', '♦', '2', '👑', '💫', '🔥', '⚡', '🎴', 'A', '🌟', '♠', '♥', 'K']
      : ['☁️', '💨', '♠', '♥', '♦', '♣', '🌧', '💫', '⚡', '…', '—', '↯', '💥', '🌙', '✧', '✦'];
    const palette = [
      hslFromSeed(roll.seed, 0),
      hslFromSeed(roll.seed, 40),
      hslFromSeed(roll.seed, 80),
      hslFromSeed(roll.seed, 120)
    ];
    const count = Math.floor(9 + rng() * 11);

    for (let i = 0; i < count; i += 1) {
      const rollKind = rng();
      const color = palette[Math.floor(rng() * palette.length)];
      if (rollKind < 0.62) {
        const bit = document.createElement('span');
        bit.className = rollKind < 0.18 ? 'vfx-bit vfx-bit--spark' : 'vfx-bit';
        if (rollKind >= 0.18) bit.textContent = symbolPool[Math.floor(rng() * symbolPool.length)];
        bit.style.setProperty('--fx-x', `${2 + rng() * 96}%`);
        bit.style.setProperty('--fx-delay', `${(rng() * 2.6).toFixed(2)}s`);
        bit.style.setProperty('--fx-drift', `${((rng() - 0.5) * (70 + rng() * 90)).toFixed(1)}px`);
        bit.style.setProperty('--fx-duration', `${(2.2 + rng() * 2.8).toFixed(2)}s`);
        bit.style.setProperty('--fx-color', color);
        bit.style.setProperty('--fx-scale', `${(0.75 + rng() * 0.85).toFixed(2)}`);
        layer.appendChild(bit);
        continue;
      }
      if (rollKind < 0.86) {
        const streak = document.createElement('span');
        streak.className = 'vfx-streak';
        streak.style.setProperty('--fx-x', `${rng() * 100}%`);
        streak.style.setProperty('--fx-y', `${rng() * 100}%`);
        streak.style.setProperty('--fx-rotate', `${Math.floor(rng() * 360)}deg`);
        streak.style.setProperty('--fx-delay', `${(rng() * 2.2).toFixed(2)}s`);
        streak.style.setProperty('--fx-duration', `${(1.4 + rng() * 2.2).toFixed(2)}s`);
        streak.style.setProperty('--fx-color', color);
        streak.style.setProperty('--fx-length', `${(28 + rng() * 72).toFixed(0)}px`);
        layer.appendChild(streak);
        continue;
      }
      const orb = document.createElement('span');
      orb.className = 'vfx-orb';
      orb.style.setProperty('--fx-x', `${10 + rng() * 80}%`);
      orb.style.setProperty('--fx-y', `${8 + rng() * 72}%`);
      orb.style.setProperty('--fx-delay', `${(rng() * 1.8).toFixed(2)}s`);
      orb.style.setProperty('--fx-duration', `${(2.6 + rng() * 2.4).toFixed(2)}s`);
      orb.style.setProperty('--fx-color', color);
      orb.style.setProperty('--fx-size', `${(10 + rng() * 26).toFixed(0)}px`);
      layer.appendChild(orb);
    }

    const burstCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < burstCount; i += 1) {
      const burst = document.createElement('span');
      burst.className = humanWon ? 'vfx-burst vfx-burst--win' : 'vfx-burst vfx-burst--defeat';
      burst.style.setProperty('--burst-x', `${20 + rng() * 60}%`);
      burst.style.setProperty('--burst-y', `${24 + rng() * 42}%`);
      burst.style.setProperty('--burst-delay', `${(i * 0.28 + rng() * 0.4).toFixed(2)}s`);
      burst.style.setProperty('--burst-color', palette[Math.floor(rng() * palette.length)]);
      burst.style.setProperty('--burst-scale', `${(6 + rng() * 8).toFixed(2)}`);
      layer.appendChild(burst);
    }
  }

  function buildResultStoryNeonChase(container, humanWon, bulbCount = 24) {
    if (!container) return;
    container.innerHTML = '';
    const theme = humanWon
      ? { accent: 'var(--result-accent)', secondary: 'var(--result-secondary)', tertiary: 'var(--result-tertiary)', chase: 1.8 }
      : { accent: 'var(--result-accent)', secondary: 'var(--result-secondary)', tertiary: 'var(--result-tertiary)', chase: 2.1 };
    const colors = [theme.accent, theme.secondary, theme.tertiary];
    for (let i = 0; i < bulbCount; i += 1) {
      const bulb = document.createElement('span');
      bulb.className = 'result-story-neon-bulb';
      const t = i / bulbCount;
      if (t < 0.25) {
        bulb.style.left = `${2 + (t / 0.25) * 96}%`;
        bulb.style.top = '0%';
      } else if (t < 0.5) {
        bulb.style.left = '100%';
        bulb.style.top = `${2 + ((t - 0.25) / 0.25) * 96}%`;
      } else if (t < 0.75) {
        bulb.style.left = `${98 - ((t - 0.5) / 0.25) * 96}%`;
        bulb.style.top = '100%';
      } else {
        bulb.style.left = '0%';
        bulb.style.top = `${98 - ((t - 0.75) / 0.25) * 96}%`;
      }
      bulb.style.setProperty('--bulb-i', String(i));
      bulb.style.setProperty('--bulb-count', String(bulbCount));
      bulb.style.setProperty('--bulb-color', colors[i % colors.length]);
      bulb.style.animationDuration = `${theme.chase + (i % 5) * 0.04}s`;
      container.appendChild(bulb);
    }
  }

  function renderResultStoryWinnerStrip(winner) {
    if (!els.resultStoryHero || !winner) return;
    els.resultStoryHero.innerHTML = `
      <div class="result-story-winner-strip">
        <div class="result-story-winner-strip__avatar-wrap">
          <div class="result-story-winner-strip__avatar"></div>
          <span class="result-story-winner-strip__crown" aria-hidden="true">🏆</span>
        </div>
        <div class="result-story-winner-strip__copy">
          <strong>${winner.name}</strong>
          <span class="result-story-winner-strip__badge">${t('result.winner')}</span>
        </div>
      </div>`;
    const avatarNode = els.resultStoryHero.querySelector('.result-story-winner-strip__avatar');
    if (!avatarNode) return;
    if (winner.isHuman) {
      renderPlayerProfileAvatar(avatarNode, { extraClass: 'result-story-winner-strip__avatar' });
    } else {
      window.Big2GoAICharacters?.renderAvatar(avatarNode, { characterId: winner.characterId, name: winner.name }, {
        className: 'character-avatar',
        imgClassName: 'character-avatar-img'
      });
    }
  }

  function buildResultStoryRewards(story) {
    const humanProfile = loadPlayerProfile();
    const humanTier = getLevelTier(humanProfile.level);
    const bonusVars = {
      amount: story.brainBonus,
      full: BRAIN_BONUS_ZERO_HINTS,
      partial: BRAIN_BONUS_ONE_HINT_LEFT,
      limit: HINT_LIMIT
    };
    const prizeParts = [];
    if (story.humanWon && story.coinPrize > 0) prizeParts.push(`${coinIcon()} +${story.coinPrize}`);
    if (story.brainBonus > 0) prizeParts.push(`🧠 +${story.brainBonus}`);

    return `
      ${prizeParts.length ? `<div class="result-story-rewards__prize">${prizeParts.join('<span class="result-story-rewards__dot">·</span>')}</div>` : ''}
      <div class="result-story-rewards__chips">
        <span class="result-story-chip"><span class="result-story-chip__icon" aria-hidden="true">🪙</span><span class="result-story-chip__label">${t('result.yourCoins')}</span><strong>${story.coinsBalance}</strong></span>
        <span class="result-story-chip"><span class="result-story-chip__icon" aria-hidden="true">${humanTier.emoji}</span><span class="result-story-chip__label">${t('result.yourRank')}</span><strong>Lv ${humanTier.level}</strong></span>
        <span class="result-story-chip"><span class="result-story-chip__icon" aria-hidden="true">✨</span><span class="result-story-chip__label">${t('result.sparks')}</span><strong>${story.sparks}</strong></span>
      </div>
      ${story.brainBonus > 0
        ? `<p class="result-story-rewards__note">${t(story.brainBonusMessageKey || 'brainBonus.full', bonusVars)}</p>`
        : ''}`;
  }

  function renderGameResultStory(story) {
    if (!story) return;
    const humanWon = Boolean(story.humanWon);
    els.resultStory?.classList.toggle('result-story-screen--win', humanWon);
    els.resultStory?.classList.toggle('result-story-screen--loss', !humanWon);

    const fxRoll = createResultStoryFxRoll(story);
    applyResultStoryFxTheme(els.resultStory, fxRoll, humanWon);
    buildResultStoryNeonChase(els.resultStoryNeonChase, humanWon, 20 + (fxRoll.seed % 12));
    spawnResultStoryProceduralFx(els.resultStoryFxLayer, fxRoll, humanWon);

    const winner = story.players.find(player => player.won) || story.players[0];
    if (els.resultStoryHeadline) {
      els.resultStoryHeadline.textContent = humanWon
        ? t('result.youWon')
        : t('result.theyWon', { name: story.winnerName });
    }

    renderResultStoryWinnerStrip(winner);

    if (els.resultStoryStats) {
      els.resultStoryStats.innerHTML = buildResultStoryRewards(story);
    }

    if (els.resultStoryPlayers) {
      const others = story.players.filter(player => !player.won);
      els.resultStoryPlayers.innerHTML = others.length
        ? `<span class="result-story-opponents__label">${t('result.table')}</span>
           <div class="result-story-opponents__row">
             ${others.map(player => {
               const tier = getLevelTier(player.level || STARTING_LEVEL);
               const status = player.finished || player.cardsLeft === 0
                 ? t('result.out')
                 : t('result.cardsLeft', { count: player.cardsLeft });
               return `<div class="result-story-opponent${player.isHuman ? ' result-story-opponent--human' : ''}">
                 <div class="result-story-opponent__avatar" data-player="${player.name}"></div>
                 <strong>${player.name}</strong>
                 <span>${status}</span>
                 <small>${tier.emoji} Lv ${player.level || STARTING_LEVEL}</small>
               </div>`;
             }).join('')}
           </div>`
        : '';
      els.resultStoryPlayers.querySelectorAll('.result-story-opponent__avatar').forEach(node => {
        const player = others.find(entry => entry.name === node.dataset.player);
        if (!player) return;
        if (player.isHuman) {
          renderPlayerProfileAvatar(node, { extraClass: 'result-story-opponent__avatar' });
        } else {
          window.Big2GoAICharacters?.renderAvatar(node, { characterId: player.characterId, name: player.name }, {
            className: 'character-avatar',
            imgClassName: 'character-avatar-img'
          });
        }
      });
    }

    if (els.resultStoryFarewells) {
      const farewells = story.farewells?.length ? story.farewells : [];
      const highlight = farewells.find(entry => entry.character?.id === winner?.characterId)
        || farewells[0];
      if (!highlight) {
        els.resultStoryFarewells.innerHTML = `<p class="result-story-quote-empty">${g('victory.seeYou')}</p>`;
        return;
      }
      const name = highlight.character?.name || highlight.player?.name || 'Rival';
      const message = highlight.message || g('victory.goodGame');
      els.resultStoryFarewells.innerHTML = `
        <div class="result-story-quote-strip">
          <div class="result-story-quote-strip__avatar"></div>
          <div class="result-story-quote-strip__copy">
            <strong>${t('result.tableSays', { name })}</strong>
            <p>"${message}"</p>
          </div>
        </div>`;
      const avatarNode = els.resultStoryFarewells.querySelector('.result-story-quote-strip__avatar');
      if (avatarNode) {
        window.Big2GoAICharacters?.renderAvatar(avatarNode, highlight.character || highlight.player, {
          className: 'character-avatar',
          imgClassName: 'character-avatar-img'
        });
      }
    }
  }

  function finalizeFinishedMatch() {
    document.querySelector('#victory-overlay')?.remove();
    cancelAiTimer();
    state.busy = false;
    persistPlayerWallet();
    if (state.liveRoom?.code) {
      saveRoomSession();
      leaveCurrentRoom();
    }
    clearSave();
    resetFinishedMatchState();
  }

  function goBackToHomeFromVictory() {
    stopVictoryMusic();
    state.pendingVictoryReveal = null;
    dismissLevelUpScreen();
    finalizeFinishedMatch();
    resetPlaySession();
    state.lastMatchStory = null;
    showLandingScreen();
    playUiSound('click');
  }

  function showGameResultStoryFromVictory() {
    stopVictoryMusic();
    state.pendingVictoryReveal = null;
    dismissLevelUpScreen();
    if (!state.lastMatchStory) {
      const prize = state.playSession.coinsEarned || state.coins.prizePool || 0;
      state.lastMatchStory = captureMatchStory(state.playSession.lastWinner, prize);
    }
    renderGameResultStory(state.lastMatchStory);
    finalizeFinishedMatch();
    showResultStoryScreen();
    playUiSound('win');
  }

  function buildAiPlayer(character) {
    return {
      name: character.name,
      characterId: character.id,
      personality: character.personality,
      playingStyle: character.playingStyle,
      isHuman: false,
      finished: false,
      coins: getAiCoinBalance(character.id),
      hand: []
    };
  }

  function hydrateAiPlayer(player) {
    if (!player || player.isHuman) return player;
    const character = window.Big2GoAICharacters?.getById(player.characterId)
      || window.Big2GoAICharacters?.getByName(player.name);
    if (!character) return player;
    return {
      ...player,
      name: character.name,
      characterId: character.id,
      personality: character.personality,
      playingStyle: character.playingStyle
    };
  }

  function renderOpponentAvatar(container, player) {
    if (!container) return;
    if (player.isHuman) {
      renderPlayerProfileAvatar(container, { className: 'character-avatar', imgClassName: 'opponent-avatar-img' });
      return;
    }
    if (window.Big2GoAICharacters?.renderAvatar(container, player, {
      className: 'character-avatar',
      imgClassName: 'opponent-avatar-img'
    })) return;
    container.textContent = (player.name?.charAt(0) || 'P').toUpperCase();
  }

  function setPlayers(count) {
    state.settings.players = count;
    const aiCast = window.Big2GoAICharacters?.pickRandom(Math.max(0, count - 1)) || [];
    state.players = [];
    for (let i = 0; i < count; i += 1) {
      if (i === 0) {
        state.players.push({
          name: getResolvedPlayerName(),
          isHuman: true,
          finished: false,
          coins: state.coins.balance,
          hand: []
        });
        continue;
      }
      const character = aiCast[i - 1];
      state.players.push(character ? buildAiPlayer(character) : {
        name: `AI ${i}`,
        isHuman: false,
        finished: false,
        coins: STARTING_COINS,
        hand: []
      });
    }
  }

  function dealCards(playerCount) {
    const deck = shuffle(createDeck());
    return Array.from({ length: playerCount }, (_, index) => sortCards(deck.slice(index * 13, index * 13 + 13)));
  }

  function findStartingPlayer() {
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[i].hand.some(card => card.rankIndex === 0 && card.suitKey === 'D')) return i;
    }
    return 0;
  }

  function logState(message) {
    state.logs.unshift(message);
    state.logs = state.logs.slice(0, 8);
    renderLogs();
  }

  function saveGame() {
    if (state.liveRoom || state.gameOver) return;
    try {
      const payload = {
        version: 2,
        settings: state.settings,
        humanIndex: state.humanIndex,
        currentPlayer: state.currentPlayer,
        startingPlayer: state.startingPlayer,
        trick: {
          play: state.trick.play ? {
            kind: state.trick.play.kind,
            count: state.trick.play.count,
            cards: state.trick.play.cards.map(card => card.id),
            score: state.trick.play.score
          } : null,
          leader: state.trick.leader,
          passes: state.trick.passes
        },
        firstTrick: state.firstTrick,
        round: state.round,
        sparks: state.sparks,
        heat: state.heat,
        coins: state.coins,
        sound: state.sound,
        soundVolume: state.soundVolume,
        voiceVolume: state.voiceVolume,
        players: state.players.map((player, index) => ({
          name: player.name,
          characterId: player.characterId || null,
          personality: player.personality || null,
          playingStyle: player.playingStyle || null,
          isHuman: player.isHuman,
          finished: player.finished,
          coins: player.isHuman ? state.coins.balance : playerCoins(player, index),
          hand: player.hand.map(card => card.id)
        })),
        logs: state.logs.slice(0, 8),
        hintsUsed: Number(state.hintsUsed) || 0
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      if (!state.liveRoom?.code) saveCoinBalance();
      updateContinueButton();
    } catch (_) {
      // ignore storage failures
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {
      // ignore
    }
    updateContinueButton();
  }

  function restoreGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 2 || !Array.isArray(saved.players)) throw new Error('Invalid save');

      state.settings = { players: 4, straightRule: DEFAULT_STRAIGHT_RULE, ...(saved.settings || {}) };
      state.humanIndex = Number(saved.humanIndex) || 0;
      state.currentPlayer = Number(saved.currentPlayer) || 0;
      state.startingPlayer = Number(saved.startingPlayer) || 0;
      state.trick = {
        play: saved.trick?.play ? {
          kind: saved.trick.play.kind,
          count: saved.trick.play.count,
          cards: saved.trick.play.cards.map(cardFromId).filter(Boolean),
          score: saved.trick.play.score
        } : null,
        leader: Number(saved.trick?.leader) || 0,
        passes: Number(saved.trick?.passes) || 0
      };
      state.firstTrick = Boolean(saved.firstTrick);
      state.round = Number(saved.round) || 1;
      state.sparks = Number(saved.sparks) || 0;
      state.heat = Number(saved.heat) || 0;
      state.coins = { ...state.coins, ...(saved.coins || {}), balance: loadCoinBalance() };
      const savedBalance = Number(saved.coins?.balance);
      if (Number.isFinite(savedBalance) && savedBalance > state.coins.balance) {
        state.coins.balance = savedBalance;
        saveCoinBalance();
      }
      state.sound = saved.sound !== false;
      state.soundVolume = Number.isFinite(Number(saved.soundVolume)) ? Number(saved.soundVolume) : state.soundVolume;
      state.voiceVolume = Number.isFinite(Number(saved.voiceVolume)) ? Number(saved.voiceVolume) : state.voiceVolume;
      saveSoundSettings();
      state.players = saved.players.map((player, index) => hydrateAiPlayer({
        name: player.isHuman ? getResolvedPlayerName() : (player.name || `AI ${index}`),
        characterId: player.characterId || null,
        personality: player.personality || null,
        playingStyle: player.playingStyle || null,
        isHuman: Boolean(player.isHuman),
        finished: Boolean(player.finished),
        coins: Number.isFinite(player.coins)
          ? player.coins
          : (player.characterId ? getAiCoinBalance(player.characterId) : STARTING_COINS),
        hand: (player.hand || []).map(cardFromId).filter(Boolean)
      }));
      state.players.forEach((player) => {
        if (!player.isHuman && player.characterId && Number.isFinite(player.coins)) {
          setAiCoinBalance(player.characterId, player.coins);
        }
      });
      state.logs = Array.isArray(saved.logs) ? saved.logs.slice(0, 8) : [];
      state.hintsUsed = Math.max(0, Math.min(HINT_LIMIT, Number(saved.hintsUsed) || 0));
      state.selected = new Set();
      state.gameOver = false;
      state.busy = false;
      state.lastCardNotified = new Set();
      state.lastHandCounts = {};
      state.lastCardFlashIndex = null;
      seedLastCardNotifiedFromHands();
      els.playerCount.value = String(state.settings.players || 4);
      els.sound.textContent = state.sound ? '🔊' : '🔇';
      showGameScreen();
      logState(g('log.restore'));
      window.Big2GoAIReactions?.resetAIReactions(state.round);
      render();
      scheduleAiTurn();
      return true;
    } catch (_) {
      clearSave();
      return false;
    }
  }

  function updateHeat(delta, note) {
    state.heat = Math.max(0, Math.min(100, state.heat + delta));
    els.heatFill.style.width = `${state.heat}%`;
    els.heatValue.textContent = `${state.heat}%`;
    els.heatText.textContent = note || (state.heat >= 80 ? t('game.heatHigh') : state.heat >= 50 ? t('game.heatMid') : t('game.heatLow'));
  }

  function renderConfetti(intensity = 12, palette = null) {
    if (!state.confettiLayer) {
      state.confettiLayer = document.createElement('div');
      state.confettiLayer.className = 'confetti-layer';
      document.body.appendChild(state.confettiLayer);
    }
    const colors = palette || ['#45d6ff', '#ff5fb8', '#63f0b0', '#ffd86b', '#7a59ff'];
    for (let i = 0; i < intensity; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.setProperty('--x', `${10 + Math.random() * 80}vw`);
      bit.style.setProperty('--y', `${15 + Math.random() * 35}vh`);
      bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
      bit.style.setProperty('--dy', `${120 + Math.random() * 260}px`);
      bit.style.setProperty('--d', `${700 + Math.random() * 800}ms`);
      bit.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
      state.confettiLayer.appendChild(bit);
      setTimeout(() => bit.remove(), 1600);
    }
  }

  function sparkle(amount = 1) {
    state.sparks += amount;
    els.sparkCount.textContent = String(state.sparks);
    if (amount >= 2) renderConfetti(8 + amount * 4);
  }

  function readStoredCoinBalance(key, fallback = STARTING_COINS) {
    try {
      const saved = Number(JSON.parse(localStorage.getItem(key) || 'null')?.balance);
      return Number.isFinite(saved) ? Math.max(0, saved) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function loadCoinBalance() {
    const saved = readStoredCoinBalance(COIN_KEY);
    const peak = readStoredCoinBalance(COIN_PEAK_KEY, saved);
    const balance = Math.max(saved, peak);
    if (balance > saved) {
      try {
        localStorage.setItem(COIN_KEY, JSON.stringify({ balance, updatedAt: Date.now(), repairedFromPeak: true }));
      } catch (_) {}
    }
    return balance;
  }

  function persistCoinBalance(balance) {
    const value = Math.max(0, Math.round(Number(balance) || 0));
    const peak = readStoredCoinBalance(COIN_PEAK_KEY, value);
    const nextPeak = Math.max(value, peak);
    try {
      localStorage.setItem(COIN_KEY, JSON.stringify({ balance: value, updatedAt: Date.now() }));
      localStorage.setItem(COIN_PEAK_KEY, JSON.stringify({ balance: nextPeak, updatedAt: Date.now() }));
    } catch (_) {}
  }

  function saveCoinBalance() {
    if (state.liveRoom?.code) return;
    persistCoinBalance(state.coins.balance);
  }

  function getWalletDisplayBalance() {
    if (state.liveRoom?.code) {
      const human = getHumanPlayer();
      if (human && Number.isFinite(human.coins)) return human.coins;
    }
    return state.coins.balance;
  }

  function syncLiveRoomCoinBalance(value) {
    const human = getHumanPlayer();
    if (human) human.coins = Math.max(0, Number(value) || 0);
    renderCoinHud();
  }

  function loadAiCoinLedger() {
    try {
      const raw = JSON.parse(localStorage.getItem(AI_COINS_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function saveAiCoinLedger(ledger) {
    try { localStorage.setItem(AI_COINS_KEY, JSON.stringify(ledger)); } catch (_) {}
  }

  function getAiCoinBalance(characterId) {
    if (!characterId) return STARTING_COINS;
    const ledger = loadAiCoinLedger();
    const value = ledger[characterId];
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : STARTING_COINS;
  }

  function setAiCoinBalance(characterId, amount) {
    if (!characterId) return;
    const ledger = loadAiCoinLedger();
    ledger[characterId] = Math.max(0, Math.round(Number(amount) || 0));
    saveAiCoinLedger(ledger);
  }

  function defaultProfileRecord() {
    return { level: STARTING_LEVEL, totalWins: 0, gender: 'male', displayName: DEFAULT_PLAYER_NAME };
  }

  const PLAYER_PROFILE_AVATARS = {
    male: {
      src: './assets/player/player-male.svg',
      alt: 'Cute male player icon'
    },
    female: {
      src: './assets/player/player-female.svg',
      alt: 'Cute female player icon'
    }
  };

  function normalizePlayerName(name) {
    let cleaned = String(name || '').trim().replace(/\s+/g, ' ');
    if (!cleaned || /^player$/i.test(cleaned)) return '';
    cleaned = cleaned.replace(/^player(?=[\p{L}\p{N}])/iu, '');
    return cleaned.slice(0, MAX_PLAYER_NAME_LENGTH);
  }

  function getPlayerDisplayName(profile = loadPlayerProfile()) {
    return normalizePlayerName(profile?.displayName);
  }

  function getResolvedPlayerName(profile = loadPlayerProfile()) {
    return getPlayerDisplayName(profile) || 'You';
  }

  function normalizePlayerGender(gender) {
    return gender === 'female' ? 'female' : 'male';
  }

  function getPlayerProfileMeta(profile = loadPlayerProfile()) {
    const gender = normalizePlayerGender(profile?.gender);
    return { gender, ...(PLAYER_PROFILE_AVATARS[gender] || PLAYER_PROFILE_AVATARS.male) };
  }

  function renderPlayerProfileAvatar(container, options = {}) {
    if (!container) return;
    const meta = getPlayerProfileMeta();
    const className = options.className || 'player-profile-avatar';
    const imgClassName = options.imgClassName || 'player-profile-avatar-img';
    const classes = [
      options.keepProfileShell ? 'profile-avatar' : '',
      className,
      `player-profile-avatar--${meta.gender}`,
      options.extraClass || ''
    ].filter(Boolean);
    container.innerHTML = '';
    container.className = classes.join(' ');
    const img = document.createElement('img');
    img.className = imgClassName;
    img.src = meta.src;
    img.alt = meta.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    container.appendChild(img);
  }

  function setPlayerGender(gender) {
    const profile = loadPlayerProfile();
    profile.gender = normalizePlayerGender(gender);
    savePlayerProfile(profile);
    renderPlayerProfileHud();
    syncLandingPlayerSetup();
  }

  function computeProfileLevel(totalWins) {
    const wins = Math.max(0, Number(totalWins) || 0);
    let level = STARTING_LEVEL;
    for (let nextLevel = STARTING_LEVEL + 1; nextLevel <= MAX_LEVEL; nextLevel += 1) {
      if (wins >= (LEVEL_WIN_THRESHOLDS[nextLevel] || 0)) {
        level = nextLevel;
      } else {
        break;
      }
    }
    return level;
  }

  function getLevelTier(level) {
    const lv = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(level) || STARTING_LEVEL));
    const tier = LEVEL_TIERS.find(entry => lv >= entry.min && lv <= entry.max) || LEVEL_TIERS[0];
    return { ...tier, level: lv, title: t(`tier.${tier.skill}`) };
  }

  function crossedSkillTier(previousLevel, newLevel) {
    return getLevelTier(previousLevel).skill !== getLevelTier(newLevel).skill;
  }

  function getAiSkillTier(level) {
    return getLevelTier(level).skill;
  }

  function getHumanProgressLevel() {
    return loadPlayerProfile().level;
  }

  function getSkillMaturity(level) {
    const lv = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(level) || STARTING_LEVEL));
    return (lv - STARTING_LEVEL) / Math.max(1, MAX_LEVEL - STARTING_LEVEL);
  }

  function getTableSkillLevel(player) {
    if (state.liveRoom?.code) return getProfileLevelForPlayer(player);
    const humanLevel = getHumanProgressLevel();
    const rivalLevel = player?.characterId ? loadAiProfile(player.characterId).level : STARTING_LEVEL;
    return Math.min(MAX_LEVEL, Math.max(humanLevel, Math.round(humanLevel * 0.75 + rivalLevel * 0.25)));
  }

  function getTableSkillTier(player) {
    return getAiSkillTier(getTableSkillLevel(player));
  }

  function getProfileProgress(totalWins) {
    const wins = Math.max(0, Number(totalWins) || 0);
    const level = computeProfileLevel(wins);
    if (level >= MAX_LEVEL) {
      return {
        current: wins,
        target: LEGEND_MODE_TOTAL_WINS,
        maxed: true,
        winsNeeded: 0
      };
    }
    const floor = LEVEL_WIN_THRESHOLDS[level] || 0;
    const ceiling = LEVEL_WIN_THRESHOLDS[level + 1] || floor;
    const span = Math.max(1, ceiling - floor);
    return {
      current: wins - floor,
      target: span,
      maxed: false,
      winsNeeded: Math.max(0, ceiling - wins)
    };
  }

  function loadPlayerProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(PLAYER_PROFILE_KEY) || 'null');
      const profile = raw && typeof raw === 'object' ? raw : defaultProfileRecord();
      profile.totalWins = Math.max(0, Number(profile.totalWins) || 0);
      profile.level = computeProfileLevel(profile.totalWins);
      profile.gender = normalizePlayerGender(profile.gender);
      profile.displayName = normalizePlayerName(profile.displayName);
      return profile;
    } catch (_) {
      return defaultProfileRecord();
    }
  }

  function savePlayerProfile(profile) {
    try {
      localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify({
        level: computeProfileLevel(profile.totalWins),
        totalWins: Math.max(0, Number(profile.totalWins) || 0),
        gender: normalizePlayerGender(profile.gender),
        displayName: normalizePlayerName(profile.displayName),
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }

  function loadAiProfileLedger() {
    try {
      const raw = JSON.parse(localStorage.getItem(AI_PROFILE_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function saveAiProfileLedger(ledger) {
    try { localStorage.setItem(AI_PROFILE_KEY, JSON.stringify(ledger)); } catch (_) {}
  }

  function loadAiProfile(characterId) {
    if (!characterId) return defaultProfileRecord();
    const ledger = loadAiProfileLedger();
    const raw = ledger[characterId];
    const profile = raw && typeof raw === 'object' ? raw : defaultProfileRecord();
    profile.totalWins = Math.max(0, Number(profile.totalWins) || 0);
    profile.level = computeProfileLevel(profile.totalWins);
    return profile;
  }

  function saveAiProfile(characterId, profile) {
    if (!characterId) return;
    const ledger = loadAiProfileLedger();
    ledger[characterId] = {
      level: computeProfileLevel(profile.totalWins),
      totalWins: Math.max(0, Number(profile.totalWins) || 0),
      updatedAt: Date.now()
    };
    saveAiProfileLedger(ledger);
  }

  function getProfileLevelForPlayer(player) {
    if (!player) return STARTING_LEVEL;
    if (player.isHuman) return loadPlayerProfile().level;
    if (player.characterId) return loadAiProfile(player.characterId).level;
    return STARTING_LEVEL;
  }

  function recordProfileWin(winner) {
    if (!winner) return null;
    if (winner.isHuman) {
      const profile = loadPlayerProfile();
      const previousLevel = profile.level;
      profile.totalWins += 1;
      profile.level = computeProfileLevel(profile.totalWins);
      savePlayerProfile(profile);
      renderPlayerProfileHud();
      return profile.level > previousLevel
        ? {
            kind: 'human',
            level: profile.level,
            previousLevel,
            name: getResolvedPlayerName(),
            totalWins: profile.totalWins,
            tier: getLevelTier(profile.level),
            previousTier: getLevelTier(previousLevel),
            skillUpgraded: crossedSkillTier(previousLevel, profile.level)
          }
        : null;
    }
    if (state.liveRoom?.code) return null;
    if (winner.characterId) {
      const profile = loadAiProfile(winner.characterId);
      const previousLevel = profile.level;
      profile.totalWins += 1;
      profile.level = computeProfileLevel(profile.totalWins);
      saveAiProfile(winner.characterId, profile);
      return profile.level > previousLevel
        ? {
            kind: 'ai',
            level: profile.level,
            previousLevel,
            name: winner.name,
            characterId: winner.characterId,
            totalWins: profile.totalWins,
            tier: getLevelTier(profile.level),
            previousTier: getLevelTier(previousLevel),
            skillUpgraded: crossedSkillTier(previousLevel, profile.level)
          }
        : null;
    }
    return null;
  }

  function renderPlayerProfileHud() {
    const profile = loadPlayerProfile();
    if (els.playerProfileAvatar) {
      renderPlayerProfileAvatar(els.playerProfileAvatar, { keepProfileShell: true });
    }
    if (els.playerNameLabel) {
      const displayName = getPlayerDisplayName(profile);
      els.playerNameLabel.textContent = displayName || t('landing.yourNameDefault');
    }
    if (els.playerLevelLabel) {
      const tier = getLevelTier(profile.level);
      els.playerLevelLabel.textContent = `Lv ${tier.level} ${tier.emoji}`;
      els.playerLevelLabel.title = tier.title;
    }
  }

  function renderLandingSetupAvatarPreview(container, gender) {
    if (!container) return;
    const key = normalizePlayerGender(gender);
    const meta = PLAYER_PROFILE_AVATARS[key] || PLAYER_PROFILE_AVATARS.male;
    container.innerHTML = '';
    container.className = `player-setup-avatar-preview player-profile-avatar player-profile-avatar--${key}`;
    const img = document.createElement('img');
    img.className = 'player-profile-avatar-img';
    img.src = meta.src;
    img.alt = meta.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    container.appendChild(img);
  }

  function syncLandingPlayerSetup() {
    const profile = loadPlayerProfile();
    const gender = normalizePlayerGender(profile.gender);
    if (els.playerNameInput) {
      els.playerNameInput.value = getPlayerDisplayName(profile);
    }
    renderLandingSetupAvatarPreview(els.playerSetupAvatarMale, 'male');
    renderLandingSetupAvatarPreview(els.playerSetupAvatarFemale, 'female');
    document.querySelectorAll('.player-setup-avatar-option[data-profile-gender]').forEach(button => {
      const active = button.dataset.profileGender === gender;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncPlayerSetupFromLanding() {
    if (!els.playerNameInput) return;
    const profile = loadPlayerProfile();
    profile.displayName = normalizePlayerName(els.playerNameInput.value);
    savePlayerProfile(profile);
    renderPlayerProfileHud();
  }

  function wireLandingPlayerSetup() {
    syncLandingPlayerSetup();
    els.playerNameInput?.addEventListener('input', () => {
      const profile = loadPlayerProfile();
      profile.displayName = normalizePlayerName(els.playerNameInput.value);
      savePlayerProfile(profile);
      renderPlayerProfileHud();
    });
    els.playerNameInput?.addEventListener('blur', () => {
      if (els.playerNameInput) {
        els.playerNameInput.value = getPlayerDisplayName();
      }
    });
    document.querySelectorAll('.player-setup-avatar-option[data-profile-gender]').forEach(button => {
      button.addEventListener('click', () => {
        setPlayerGender(button.dataset.profileGender || 'male');
      });
    });
  }

  function bindLandingPlayActions() {
    els.home?.addEventListener('click', (event) => {
      if (!isLandingScreenVisible()) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest('#start-button')) {
        event.preventDefault();
        syncPlayerSetupFromLanding();
        newGame();
        return;
      }

      const continueButton = target.closest('#continue-button');
      if (continueButton && !continueButton.classList.contains('hidden')) {
        event.preventDefault();
        unlockAudioFromGesture();
        syncPlayerSetupFromLanding();
        if (!restoreGame()) newGame();
      }
    });
  }

  function renderProfileRankPath(profile) {
    const level = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(profile?.level) || STARTING_LEVEL));
    const tier = getLevelTier(level);
    const fill = getRankJourneyFill(level);
    const tierSpan = tier.max - tier.min + 1;
    const tierStep = Math.max(1, level - tier.min + 1);
    const stops = LEVEL_TIERS.map(entry => {
      const stopState = getTierStopState(entry, level, false, level);
      const pathStyle = LEVEL_TIER_PATH[entry.skill] || LEVEL_TIER_PATH.rookie;
      const shortLabel = t(`levelUp.tierStop.${entry.skill}`);
      return `<div class="level-up-rank-stop level-up-rank-stop--${stopState}" data-tier="${entry.skill}" style="--tier-color:${pathStyle.color};--tier-glow:${pathStyle.glow}">
        <span class="level-up-rank-node" aria-hidden="true">${entry.emoji}</span>
        <strong>${shortLabel}</strong>
        <small>Lv ${entry.min}${entry.max === entry.min ? '' : `–${entry.max}`}</small>
      </div>`;
    }).join('');
    return `
      <div class="level-up-rank-path" aria-label="${t('levelUp.journeyPath')}">
        <div class="level-up-rank-path-head">
          <p class="level-up-rank-path-label">${t('levelUp.journeyPath')}</p>
          <span class="level-up-rank-path-step">${t('levelUp.tierProgress', { current: level, step: tierStep, steps: tierSpan })}</span>
        </div>
        <div class="level-up-rank-rail" aria-hidden="true">
          <span class="level-up-rank-fill" style="width:${fill}%"></span>
          <span class="level-up-rank-pin" style="left:${fill}%">Lv ${level}</span>
        </div>
        <div class="level-up-rank-stops">${stops}</div>
      </div>`;
  }

  function applyProfileTheme(tier) {
    if (!els.profileScreen) return;
    const pathStyle = LEVEL_TIER_PATH[tier.skill] || LEVEL_TIER_PATH.rookie;
    els.profileScreen.style.setProperty('--profile-accent', pathStyle.color);
    els.profileScreen.style.setProperty('--profile-glow', pathStyle.glow);
    els.profileScreen.dataset.tier = tier.skill;
    els.profileScreen.classList.remove('profile-screen--rookie', 'profile-screen--strategist', 'profile-screen--master', 'profile-screen--legend');
    els.profileScreen.classList.add(`profile-screen--${tier.skill}`);
  }

  function bindProfileGenderToggle() {
    document.querySelectorAll('#profile-screen .profile-gender-btn[data-profile-gender]').forEach(button => {
      button.addEventListener('click', () => {
        const gender = button.dataset.profileGender || 'male';
        setPlayerGender(gender);
        renderProfileScreen();
      });
    });
  }

  function renderProfileScreen() {
    const profile = loadPlayerProfile();
    const meta = getPlayerProfileMeta(profile);
    const progress = getProfileProgress(profile.totalWins);
    const tier = getLevelTier(profile.level);
    applyProfileTheme(tier);

    if (els.profileTitle) els.profileTitle.textContent = t('profile.title');
    if (els.profileRivalsTitle) els.profileRivalsTitle.textContent = t('profile.rivalsTitle');

    if (els.profileHero) {
      els.profileHero.innerHTML = `
        <div class="profile-hero-avatar" id="profile-screen-avatar"></div>
        <div class="profile-hero-copy">
          <h1 class="profile-name">${getResolvedPlayerName(profile)}</h1>
          <p class="profile-tier"><span>Lv ${tier.level}</span> ${tier.emoji} ${tier.title}</p>
        </div>
        <div class="profile-gender-toggle" role="group" aria-label="${t('profile.chooseIcon')}">
          <button type="button" class="profile-gender-btn${meta.gender === 'male' ? ' is-active' : ''}" data-profile-gender="male">${t('landing.spade')}</button>
          <button type="button" class="profile-gender-btn${meta.gender === 'female' ? ' is-active' : ''}" data-profile-gender="female">${t('landing.heart')}</button>
        </div>`;
      const avatarEl = document.querySelector('#profile-screen-avatar');
      if (avatarEl) renderPlayerProfileAvatar(avatarEl, { extraClass: 'profile-hero-avatar' });
    }

    if (els.profileStats) {
      const nextLabel = progress.maxed
        ? t('levelUp.legendMax')
        : t('profile.winsProgress', { current: progress.current, target: progress.target });
      const progressPct = progress.maxed ? 100 : Math.round((progress.current / Math.max(1, progress.target)) * 100);
      els.profileStats.innerHTML = `
        <div class="profile-stat">
          <small>${t('profile.totalWins')}</small>
          <strong>${profile.totalWins}</strong>
        </div>
        <div class="profile-stat profile-stat--progress">
          <small>${t('profile.nextLevel')}</small>
          <strong>${nextLabel}</strong>
          <div class="profile-xp-bar" aria-hidden="true"><span style="width:${progressPct}%"></span></div>
        </div>`;
    }

    if (els.profileRankPath) {
      els.profileRankPath.innerHTML = renderProfileRankPath(profile);
    }

    if (els.profileRivalsGrid) {
      els.profileRivalsGrid.innerHTML = '';
      (window.Big2GoAICharacters?.pool || []).forEach((character, index) => {
        const rivalProfile = loadAiProfile(character.id);
        const rivalTier = getLevelTier(rivalProfile.level);
        const rivalProgress = getProfileProgress(rivalProfile.totalWins);
        const rivalTheme = DEFEAT_RIVAL_THEMES[character.id] || DEFEAT_RIVAL_THEMES.default;
        const tierStyle = LEVEL_TIER_PATH[rivalTier.skill] || LEVEL_TIER_PATH.rookie;
        const progressPct = rivalProgress.maxed
          ? 100
          : Math.round((rivalProgress.current / Math.max(1, rivalProgress.target)) * 100);
        const metaLabel = rivalProgress.maxed
          ? t('profile.rivalMax')
          : t('profile.rivalShort', { current: rivalProgress.current, target: rivalProgress.target });
        const card = document.createElement('article');
        card.className = `profile-rival-card profile-rival-card--${character.id} profile-rival-card--${rivalTheme.frame}`;
        card.dataset.tier = rivalTier.skill;
        card.style.setProperty('--rival-accent', rivalTheme.accent);
        card.style.setProperty('--rival-secondary', rivalTheme.secondary);
        card.style.setProperty('--rival-tertiary', rivalTheme.tertiary);
        card.style.setProperty('--rival-tier-color', tierStyle.color);
        card.style.setProperty('--rival-xp', String(progressPct));
        card.style.setProperty('--rival-float-delay', `${index * 0.35}s`);
        card.innerHTML = `
          <div class="profile-rival-collectible">
            <span class="profile-rival-spark profile-rival-spark--a" aria-hidden="true">${rivalTheme.vibe}</span>
            <span class="profile-rival-spark profile-rival-spark--b" aria-hidden="true">${rivalTheme.emoji}</span>
            <div class="profile-rival-xp-ring" aria-hidden="true"></div>
            <div class="profile-rival-portrait">
              <div class="profile-rival-avatar-shell"></div>
              <div class="profile-rival-lv-plaque" aria-label="${t('profile.rivalLevel', { level: rivalTier.level })}">
                <span class="profile-rival-lv-plaque__tag">LV</span>
                <strong class="profile-rival-lv-plaque__num">${rivalTier.level}</strong>
                <span class="profile-rival-lv-plaque__tier" aria-hidden="true">${rivalTier.emoji}</span>
              </div>
            </div>
          </div>
          <div class="profile-rival-foot">
            <strong class="profile-rival-name">${character.name}</strong>
            <span class="profile-rival-tier-label">${rivalTier.emoji} ${t(`levelUp.tierStop.${rivalTier.skill}`)}</span>
            <div class="profile-rival-xp" aria-hidden="true"><span style="width:${progressPct}%"></span></div>
            <small class="profile-rival-meta">${metaLabel}</small>
          </div>`;
        els.profileRivalsGrid.appendChild(card);
        const avatarShell = card.querySelector('.profile-rival-avatar-shell');
        window.Big2GoAICharacters?.renderAvatar?.(avatarShell, character, {
          className: 'profile-rival-avatar',
          imgClassName: 'profile-rival-avatar-img'
        });
      });
    }

    bindProfileGenderToggle();
  }

  function showProfileScreen() {
    playUiSound('click');
    renderProfileScreen();
    hideAllScreens();
    els.profileScreen?.classList.remove('hidden');
    document.body.classList.add('profile-active');
    window.scrollTo(0, 0);
  }

  function hideProfileScreen() {
    els.profileScreen?.classList.add('hidden');
    document.body.classList.remove('profile-active');
    showLandingScreen();
  }

  function showPlayerProfilePanel() {
    showProfileScreen();
  }

  function shuffleCharacters(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function assembleSoloAiCast(count) {
    const needed = Math.max(0, count - 1);
    const pool = window.Big2GoAICharacters?.pool || [];
    if (!needed || !pool.length) return [];

    const cast = [];
    const used = new Set();
    const joinLogs = [];
    const affordable = shuffleCharacters(pool.filter(character => getAiCoinBalance(character.id) >= ENTRY_FEE_COINS));

    affordable.forEach((character) => {
      if (cast.length >= needed) return;
      used.add(character.id);
      cast.push(character);
    });

    while (cast.length < needed) {
      const replacements = shuffleCharacters(pool.filter(character => !used.has(character.id)));
      if (!replacements.length) break;
      const character = replacements[0];
      setAiCoinBalance(character.id, STARTING_COINS);
      joinLogs.push(g('log.aiJoin', { name: character.name, coins: STARTING_COINS }));
      used.add(character.id);
      cast.push(character);
    }

    state.aiJoinLogs = joinLogs;
    return cast;
  }

  function collectAiEntryFees() {
    state.players.forEach((player) => {
      if (player.isHuman || !player.characterId) return;
      const balance = getAiCoinBalance(player.characterId);
      const after = Math.max(0, balance - ENTRY_FEE_COINS);
      setAiCoinBalance(player.characterId, after);
      player.coins = after;
    });
  }

  function renderCoinHud() {
    const displayBalance = getWalletDisplayBalance();
    if (els.coinBalance) els.coinBalance.textContent = String(Math.max(0, Math.round(displayBalance || 0)));
    if (els.prizePoolValue) els.prizePoolValue.textContent = String(Math.max(0, Math.round(state.coins.prizePool || 0)));
  }

  function setCoinBalance(value) {
    state.coins.balance = Math.max(0, Number(value) || 0);
    const human = getHumanPlayer();
    if (human && !state.liveRoom?.code) human.coins = state.coins.balance;
    saveCoinBalance();
    renderCoinHud();
  }

  function playerCoins(player, index) {
    if (index === state.humanIndex) return state.coins.balance;
    return Number.isFinite(player.coins) ? player.coins : STARTING_COINS;
  }

  function coinPoint(selector, fallbackX, fallbackY) {
    const rect = document.querySelector(selector)?.getBoundingClientRect?.();
    return rect && rect.width ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: fallbackX, y: fallbackY };
  }

  function animateCoins(kind = 'entry', amount = ENTRY_FEE_COINS) {
    if (!els.coinFxLayer) return;
    const from = kind === 'win' ? coinPoint('#prize-pool', innerWidth / 2, innerHeight * .42) : coinPoint('#coin-wallet', innerWidth * .82, 52);
    const to = kind === 'win' ? coinPoint('#coin-wallet', innerWidth * .82, 52) : coinPoint('#prize-pool', innerWidth / 2, innerHeight * .42);
    const count = Math.min(14, Math.max(5, amount));
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('span');
      coin.className = `coin-bit${i % 5 === 0 ? ' spark' : ''}`;
      coin.style.setProperty('--x', `${from.x + (Math.random() - .5) * 30}px`);
      coin.style.setProperty('--y', `${from.y + (Math.random() - .5) * 24}px`);
      coin.style.setProperty('--tx', `${to.x + (Math.random() - .5) * 60}px`);
      coin.style.setProperty('--ty', `${to.y + (Math.random() - .5) * 42}px`);
      coin.style.setProperty('--d', `${720 + Math.random() * 420}ms`);
      coin.style.setProperty('--s', `${18 + Math.random() * 10}px`);
      els.coinFxLayer.appendChild(coin);
      setTimeout(() => coin.remove(), 1300);
    }
    playUiSound(kind === 'win' ? 'coinWin' : 'coin');
  }

  function showCoinPop(text) {
    const pop = document.createElement('div');
    pop.className = 'coin-pop';
    pop.innerHTML = withCoinIcon(text);
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1250);
  }

  function paySinglePlayerEntry(playerCount) {
    if (state.coins.balance < ENTRY_FEE_COINS) {
      showOracle('Need more virtual coins', `You need ${coinIcon()} ${ENTRY_FEE_COINS} entertainment coins to start. Daily free coins are a good next retention feature.`);
      return false;
    }
    setCoinBalance(state.coins.balance - ENTRY_FEE_COINS);
    state.coins.prizePool = playerCount * ENTRY_FEE_COINS;
    state.coins.entryPaid = true;
    state.coins.paidOut = false;
    animateCoins('entry', ENTRY_FEE_COINS);
    showCoinPop(`Entry fee: {{coin}} ${ENTRY_FEE_COINS}`);
    renderCoinHud();
    return true;
  }

  function paySinglePlayerPrize(winner) {
    if (state.liveRoom || state.coins.paidOut) return state.coins.prizePool || 0;
    state.coins.paidOut = true;
    const prize = state.coins.prizePool || 0;
    if (winner?.isHuman) {
      setCoinBalance(state.coins.balance + prize);
      animateCoins('win', Math.max(ENTRY_FEE_COINS, prize));
      showCoinPop(`+{{coin}} ${prize}`);
    } else if (winner?.characterId) {
      const nextBalance = getAiCoinBalance(winner.characterId) + prize;
      setAiCoinBalance(winner.characterId, nextBalance);
      winner.coins = nextBalance;
      animateCoins('entry', ENTRY_FEE_COINS);
      showCoinPop(`Good Game! -{{coin}} ${ENTRY_FEE_COINS}`);
    } else {
      animateCoins('entry', ENTRY_FEE_COINS);
      showCoinPop(`Good Game! -{{coin}} ${ENTRY_FEE_COINS}`);
    }
    return prize;
  }

  function getBrainBonusCoins(hintsUsed) {
    const used = Math.max(0, Math.min(HINT_LIMIT, Number(hintsUsed) || 0));
    if (used === 0) return BRAIN_BONUS_ZERO_HINTS;
    if (used === HINT_LIMIT - 1) return BRAIN_BONUS_ONE_HINT_LEFT;
    return 0;
  }

  function buildBrainBonusMeta(hintsUsed = state.hintsUsed) {
    const used = Math.max(0, Math.min(HINT_LIMIT, Number(hintsUsed) || 0));
    const remaining = Math.max(0, HINT_LIMIT - used);
    const amount = getBrainBonusCoins(used);
    let messageKey = 'brainBonus.missed';
    if (amount === BRAIN_BONUS_ZERO_HINTS) messageKey = 'brainBonus.full';
    else if (amount === BRAIN_BONUS_ONE_HINT_LEFT) messageKey = 'brainBonus.partial';
    return { amount, hintsUsed: used, hintsRemaining: remaining, messageKey };
  }

  function awardBrainBonusCoins() {
    if (state.liveRoom?.code) return buildBrainBonusMeta(0);
    const meta = buildBrainBonusMeta();
    if (meta.amount > 0) {
      setCoinBalance(state.coins.balance + meta.amount);
      animateCoins('win', meta.amount);
      showCoinPop(`+{{coin}} ${meta.amount}`);
      renderCoinHud();
    }
    return meta;
  }

  function buildBrainBonusRewardHtml(brainBonus, { showTeaserWhenEmpty = false } = {}) {
    const amount = Math.max(0, Number(brainBonus?.amount) || 0);
    const messageKey = brainBonus?.messageKey || 'brainBonus.missed';
    const lines = [];
    if (amount > 0) {
      lines.push(`<div class="reward-line reward-line--brain">${coinIcon()} +${amount} ${t('brainBonus.title')}</div>`);
      lines.push(`<div class="reward-line reward-line--note reward-line--brain-copy">${t(messageKey, { amount, full: BRAIN_BONUS_ZERO_HINTS, partial: BRAIN_BONUS_ONE_HINT_LEFT, limit: HINT_LIMIT })}</div>`);
    } else if (showTeaserWhenEmpty) {
      lines.push(`<div class="reward-line reward-line--note reward-line--brain-teaser">${t('brainBonus.teaser', { full: BRAIN_BONUS_ZERO_HINTS, partial: BRAIN_BONUS_ONE_HINT_LEFT, limit: HINT_LIMIT })}</div>`);
    }
    return lines.join('');
  }

  function normalizeReactionEmoji(emoji) {
    const text = String(emoji || '').trim();
    return ALLOWED_REACTIONS.has(text) ? text : '';
  }

  function displayReactionFloat(emoji) {
    const floater = document.createElement('div');
    floater.className = 'reaction-float';
    floater.textContent = emoji;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1150);
  }

  function showReactionOnRow(row, emoji, name) {
    if (!row || !emoji) return;
    row.querySelector('.opponent-reaction-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'opponent-reaction-pop';
    pop.setAttribute('aria-label', `${name || 'Player'} reacted with ${emoji}`);
    pop.textContent = emoji;
    row.appendChild(pop);
    pop.classList.add('show');
    setTimeout(() => {
      pop.classList.remove('show');
      setTimeout(() => pop.remove(), 280);
    }, 1400);
  }

  function displayTableReactionBubble(reaction) {
    let playerIndex = Number.isFinite(reaction?.playerIndex) ? reaction.playerIndex : null;
    if (playerIndex == null && reaction?.playerId) {
      playerIndex = state.players.findIndex(player => player.id === reaction.playerId);
    }
    if (playerIndex == null || playerIndex < 0) playerIndex = state.humanIndex;
    const isSelf = playerIndex === state.humanIndex || reaction?.playerId === state.liveRoom?.playerId;
    const player = state.players[playerIndex];
    const name = isSelf ? 'You' : (reaction?.name || player?.name || 'Player');
    const row = document.querySelector(`.opponent-row[data-player-index="${playerIndex}"]`);
    if (row) {
      showReactionOnRow(row, reaction.emoji, name);
      return;
    }
    window.Big2GoAIReactions?.showPlayerEmojiBubble?.(playerIndex, name, reaction.emoji, state);
  }

  function rememberReaction(reaction) {
    if (!reaction?.id || !reaction?.emoji) return false;
    if (state.seenReactionIds.has(reaction.id)) return false;
    state.seenReactionIds.add(reaction.id);
    if (state.seenReactionIds.size > 120) {
      state.seenReactionIds = new Set([...state.seenReactionIds].slice(-60));
    }
    return true;
  }

  function processReaction(reaction) {
    const isOwnLiveReaction = Boolean(
      state.liveRoom?.playerId
      && reaction?.playerId === state.liveRoom.playerId
    );
    const now = Date.now();
    if (
      isOwnLiveReaction
      && reaction?.emoji
      && reaction.emoji === state.lastLocalReactionEcho.emoji
      && now - state.lastLocalReactionEcho.at < 1200
      && reaction.id
      && !String(reaction.id).startsWith('pending-')
    ) {
      rememberReaction(reaction);
      return;
    }
    if (!rememberReaction(reaction)) return;
    displayReactionFloat(reaction.emoji);
    displayTableReactionBubble(reaction);
    playUiSound('emoji');
  }

  function processReactions(reactions) {
    if (!Array.isArray(reactions)) return;
    reactions.forEach(processReaction);
  }

  function sendSoloPlayerReaction(emoji) {
    processReaction({
      id: `solo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId: 'local-human',
      name: getResolvedPlayerName(),
      emoji,
      playerIndex: state.humanIndex
    });
    window.Big2GoAIReactions?.onHumanEmojiReaction?.(emoji, state);
  }

  async function sendLiveRoomReaction(emoji) {
    if (!state.liveRoom?.code) return;
    const now = Date.now();
    if (now - state.lastReactionSentAt < 450) return;
    state.lastReactionSentAt = now;
    state.lastLocalReactionEcho = { emoji, at: now };
    processReaction({
      id: `pending-${state.liveRoom.playerId}-${now}`,
      playerId: state.liveRoom.playerId,
      name: getResolvedPlayerName(),
      emoji,
      playerIndex: state.humanIndex
    });
    const payload = {
      type: 'room:reaction',
      emoji,
      code: state.liveRoom.code,
      playerId: state.liveRoom.playerId
    };
    if (state.roomSocket?.readyState === WebSocket.OPEN) {
      state.roomSocket.send(JSON.stringify(payload));
      return;
    }
    const result = await sendLiveRoomMessage({ type: 'room:reaction', emoji });
    if (result?.reactions) processReactions(result.reactions);
  }

  function sendPlayerReaction(emoji) {
    const normalized = normalizeReactionEmoji(emoji);
    if (!normalized) return;
    unlockAudioFromGesture();
    resumePendingRemoteAudio();
    if (state.liveRoom?.code) {
      sendLiveRoomReaction(normalized);
      return;
    }
    sendSoloPlayerReaction(normalized);
  }

  function showReaction(emoji) {
    sendPlayerReaction(emoji);
  }

  function playShuffleSound() {
    if (!state.sound) return;
    if (!unlockAudioFromGesture()) return;
    for (let i = 0; i < 11; i += 1) {
      playNoise(
        0.024 + Math.random() * 0.014,
        0.016 + Math.random() * 0.01,
        i * 0.028,
        2600 - i * 110 + Math.random() * 80
      );
    }
    playTone(220, 0.07, 'triangle', 0.022, 0.32);
    playTone(329.63, 0.09, 'sine', 0.018, 0.38);
  }

  function getAudioContext() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!audio.context) {
      audio.context = new Ctor();
      audio.master = audio.context.createGain();
      audio.master.gain.value = Math.max(0, Math.min(1, state.soundVolume || .72)) * 0.24;
      audio.master.connect(audio.context.destination);
      hookAudioContextState();
    }
    return audio.context;
  }

  function hookAudioContextState() {
    const ctx = audio.context;
    if (!ctx || audio.contextStateHooked) return;
    audio.contextStateHooked = true;
    ctx.addEventListener('statechange', () => {
      if (ctx.state !== 'running' || !state.sound) return;
      flushPendingLastCardSound();
      if (isLandingScreenVisible() && !audio.landingMusicActive) beginLandingMusicLoop();
    });
  }

  function primeAudioContextFromGesture(ctx) {
    if (!ctx) return;
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (_) {}
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      amp.gain.value = 0.00001;
      osc.connect(amp);
      amp.connect(ctx.destination);
      const start = ctx.currentTime;
      osc.start(start);
      osc.stop(start + 0.02);
    } catch (_) {}
  }

  function unlockAudioFromGesture() {
    if (!state.sound) return null;
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      primeAudioContextFromGesture(ctx);
      const resumeTask = ctx.resume();
      if (resumeTask && typeof resumeTask.catch === 'function') resumeTask.catch(() => {});
    }
    return ctx;
  }

  async function unlockAudio() {
    const ctx = unlockAudioFromGesture();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }
    return ctx;
  }

  function isAudioContextRunning() {
    return Boolean(audio.context && audio.context.state === 'running');
  }

  function beginLandingMusicLoop() {
    if (audio.landingMusicActive || !state.sound || !isLandingScreenVisible() || !isAudioContextRunning()) return;
    stopLandingMusic();
    audio.landingMusicActive = true;
    document.body.classList.add('landing-music-active');
    tickLandingMusicBeat();
    const beatMs = Math.round(60000 / LANDING_MUSIC.bpm);
    LANDING_MUSIC.timer = setInterval(tickLandingMusicBeat, beatMs);
  }

  function primeLandingMusicFromGesture() {
    if (!state.sound || !isLandingScreenVisible()) return;
    if (!unlockAudioFromGesture()) return;
    if (isAudioContextRunning()) {
      beginLandingMusicLoop();
      return;
    }
    const ctx = audio.context;
    if (ctx?.state === 'suspended') {
      ctx.resume().then(() => {
        if (isAudioContextRunning() && isLandingScreenVisible()) beginLandingMusicLoop();
      }).catch(() => {});
    }
  }

  function ensureLandingMusicPlaying() {
    if (!state.sound || !isLandingScreenVisible()) return;
    if (audio.landingMusicActive && isAudioContextRunning()) return;
    if (audio.landingMusicActive && !isAudioContextRunning()) stopLandingMusic();
    primeLandingMusicFromGesture();
  }

  function getLandingMusicMaster() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!audio.landingMusicMaster) {
      audio.landingMusicMaster = ctx.createGain();
      audio.landingMusicMaster.connect(ctx.destination);
    }
    audio.landingMusicMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume || 0.72)) * LANDING_MUSIC_GAIN;
    return audio.landingMusicMaster;
  }

  function stopLandingMusic() {
    if (LANDING_MUSIC.timer) {
      clearInterval(LANDING_MUSIC.timer);
      LANDING_MUSIC.timer = null;
    }
    audio.landingMusicActive = false;
    LANDING_MUSIC.bar = 0;
    LANDING_MUSIC.beat = 0;
    document.body.classList.remove('landing-music-active');
  }

  function isLandingScreenVisible() {
    return Boolean(els.home && !els.home.classList.contains('hidden'));
  }

  function tickLandingMusicBeat() {
    if (!audio.landingMusicActive || !state.sound || !isLandingScreenVisible() || !isAudioContextRunning()) {
      stopLandingMusic();
      return;
    }
    const bus = getLandingMusicMaster();
    if (!bus) return;

    const chord = LANDING_MUSIC.chords[LANDING_MUSIC.bar % LANDING_MUSIC.chords.length];
    const beat = LANDING_MUSIC.beat % 4;
    const arpIndex = (LANDING_MUSIC.bar * 4 + beat) % chord.arp.length;
    const arpNote = chord.arp[arpIndex];

    if (beat === 0) {
      playTone(chord.bass, 0.34, 'sine', 0.1, 0, 0, bus);
      playTone(chord.bass * 2, 0.16, 'triangle', 0.04, 0.03, 0, bus);
      playChord(chord.arp.slice(0, 3), 0.62, 'sine', 0.034, 0, bus);
      playNoise(0.05, 0.02, 0, 7600, bus);
    } else if (beat === 2) {
      playTone(chord.bass, 0.22, 'sine', 0.075, 0, 0, bus);
    }

    playTone(arpNote, 0.16, 'triangle', 0.05, 0.03, 0, bus);
    playTone(arpNote * 2, 0.09, 'square', 0.014, 0.03, 0, bus);

    if (beat === 1 || beat === 3) {
      playNoise(0.04, 0.024, 0, 5400, bus);
    }

    if (beat === 2 && LANDING_MUSIC.bar % 2 === 1) {
      playTone(chord.arp[2], 0.18, 'square', 0.03, 0.05, 0, bus);
      playTone((chord.arp[3] || chord.arp[0] * 2), 0.16, 'triangle', 0.038, 0.2, 0, bus);
    }

    if (LANDING_MUSIC.bar % 4 === 3 && beat === 3) {
      playChord([chord.arp[0], chord.arp[2], (chord.arp[3] || chord.arp[1] * 2)], 0.28, 'triangle', 0.026, 0.08, bus);
    }

    LANDING_MUSIC.beat += 1;
    if (LANDING_MUSIC.beat >= 4) {
      LANDING_MUSIC.beat = 0;
      LANDING_MUSIC.bar += 1;
    }
  }

  function startLandingMusic() {
    if (!state.sound || audio.landingMusicActive || !isLandingScreenVisible()) return;
    if (isAudioContextRunning()) {
      beginLandingMusicLoop();
      return;
    }
    unlockAudio().then(ctx => {
      if (!ctx || !isLandingScreenVisible()) return;
      beginLandingMusicLoop();
    });
  }

  function isVictoryOverlayVisible() {
    return Boolean(document.querySelector('#victory-overlay'));
  }

  function getVictoryMusicMaster() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!audio.victoryMusicMaster) {
      audio.victoryMusicMaster = ctx.createGain();
      audio.victoryMusicMaster.connect(ctx.destination);
    }
    audio.victoryMusicMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume || 0.72)) * VICTORY_MUSIC_GAIN;
    return audio.victoryMusicMaster;
  }

  function stopVictoryMusic() {
    if (VICTORY_MUSIC.timer) {
      clearInterval(VICTORY_MUSIC.timer);
      VICTORY_MUSIC.timer = null;
    }
    if (audio.victoryTimer) {
      clearTimeout(audio.victoryTimer);
      audio.victoryTimer = null;
    }
    audio.victoryMusicActive = false;
    VICTORY_MUSIC.step = 0;
  }

  function playVictoryOpeningFanfare(bus) {
    for (let i = 0; i < 10; i += 1) {
      playNoise(0.035, 0.018 + i * 0.004, i * 0.035, 500 + i * 220, bus);
    }
    playChord([392, 523.25, 659.25], 0.22, 'sawtooth', 0.1, 0.34, bus);
    playChord([523.25, 659.25, 783.99], 0.34, 'sawtooth', 0.11, 0.46, bus);
    playChord([659.25, 783.99, 1046.5], 0.48, 'sawtooth', 0.1, 0.58, bus);
    [1046.5, 1174.66, 1318.51, 1567.98].forEach((freq, index) => {
      playTone(freq, 0.09, 'square', 0.068, 0.72 + index * 0.06, 0, bus);
    });
    playTone(196, 0.2, 'sawtooth', 0.09, 0.36, -120, bus);
    playTone(98, 0.28, 'sawtooth', 0.08, 0.5, -80, bus);
    playNoise(0.12, 0.08, 0.62, 1200, bus);
    playNoise(0.06, 0.05, 0.7, 5200, bus);
  }

  function tickVictoryMusicStep() {
    if (!audio.victoryMusicActive || !state.sound || !isVictoryOverlayVisible() || !isAudioContextRunning()) {
      stopVictoryMusic();
      return;
    }
    const bus = getVictoryMusicMaster();
    if (!bus) return;

    const step = VICTORY_MUSIC.step % VICTORY_MUSIC.melody.length;
    const beat8 = step % 8;
    const bar = Math.floor(step / 8) % VICTORY_MUSIC.bassByBar.length;
    const root = VICTORY_MUSIC.bassByBar[bar][beat8];
    const melodyNote = VICTORY_MUSIC.melody[step];

    if (beat8 === 0 || beat8 === 4) {
      playTone(root, 0.13, 'sawtooth', 0.088, 0, -80, bus);
    }
    if (beat8 === 2 || beat8 === 6) {
      playTone(root * 1.5, 0.09, 'sawtooth', 0.062, 0, 60, bus);
    }

    if (beat8 === 4) {
      playNoise(0.07, 0.058, 0, 1400, bus);
      playNoise(0.03, 0.038, 0.015, 4800, bus);
    }

    if (melodyNote) {
      playTone(melodyNote, 0.1, 'sawtooth', 0.074, 0, 0, bus);
      playTone(melodyNote / 2, 0.07, 'square', 0.038, 0.008, 0, bus);
    }

    if (beat8 === 7) {
      playTone(1567.98, 0.12, 'square', 0.05, 0, 0, bus);
      playTone(2093, 0.1, 'square', 0.04, 0.04, 0, bus);
    }

    if (step >= VICTORY_MUSIC.melody.length - 4) {
      playTone(VICTORY_MUSIC.melody[step] || 1046.5, 0.08, 'square', 0.045, 0.02, 120, bus);
    }

    VICTORY_MUSIC.step += 1;
  }

  function beginVictoryMusicLoop() {
    if (audio.victoryMusicActive || !state.sound || !isVictoryOverlayVisible() || !isAudioContextRunning()) return;
    stopVictoryMusic();
    const bus = getVictoryMusicMaster();
    if (!bus) return;
    audio.victoryMusicActive = true;
    playVictoryOpeningFanfare(bus);
    const stepMs = Math.round(60000 / (VICTORY_MUSIC.bpm * 2));
    audio.victoryTimer = setTimeout(() => {
      audio.victoryTimer = null;
      if (!audio.victoryMusicActive || !isVictoryOverlayVisible()) return;
      tickVictoryMusicStep();
      VICTORY_MUSIC.timer = setInterval(tickVictoryMusicStep, stepMs);
    }, 1050);
  }

  function playVictoryCelebrationMusic() {
    if (!state.sound || !isVictoryOverlayVisible()) return;
    unlockAudioFromGesture();
    if (isAudioContextRunning()) {
      beginVictoryMusicLoop();
      return;
    }
    unlockAudio().then(ctx => {
      if (!ctx || !isVictoryOverlayVisible()) return;
      beginVictoryMusicLoop();
    });
  }

  function getLevelUpAudioMaster() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!audio.levelUpMaster) {
      audio.levelUpMaster = ctx.createGain();
      audio.levelUpMaster.connect(ctx.destination);
    }
    audio.levelUpMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume || 0.72)) * LEVEL_UP_MASTER_GAIN;
    return audio.levelUpMaster;
  }

  function getLastCardAudioMaster() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!audio.lastCardMaster) {
      audio.lastCardMaster = ctx.createGain();
      audio.lastCardMaster.connect(ctx.destination);
    }
    audio.lastCardMaster.gain.value = Math.max(0, Math.min(1, state.soundVolume || 0.72)) * LAST_CARD_MASTER_GAIN;
    return audio.lastCardMaster;
  }

  function playToneSweep(freqStart, freqEnd, duration, type = 'sine', gain = 0.035, when = 0, output = null) {
    const ctx = getAudioContext();
    if (!ctx || !state.sound) return;
    const bus = output || audio.master;
    if (!bus) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    const safeEnd = Math.max(40, freqEnd);
    const safeStart = Math.max(40, freqStart);
    osc.frequency.setValueAtTime(safeStart, start);
    osc.frequency.exponentialRampToValueAtTime(safeEnd, start + Math.max(0.03, duration));
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function playTone(freq, duration, type = 'sine', gain = 0.04, when = 0, detune = 0, output = null) {
    const ctx = getAudioContext();
    if (!ctx || !state.sound) return;
    const bus = output || audio.master;
    if (!bus) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (detune) osc.detune.setValueAtTime(detune, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function playChord(freqs, duration, type = 'triangle', gain = 0.035, when = 0, output = null) {
    freqs.forEach(freq => playTone(freq, duration, type, gain, when, 0, output));
  }

  function playNoise(duration = 0.08, gain = 0.025, when = 0, filterFreq = 1200, output = null) {
    const ctx = getAudioContext();
    if (!ctx || !state.sound) return;
    const bus = output || audio.master;
    if (!bus) return;
    const start = ctx.currentTime + when;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, start);
    filter.Q.setValueAtTime(6, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(bus);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function playSoundSteps(steps, output = null, baseWhen = 0) {
    const bus = output || audio.master;
    if (!bus || !getAudioContext() || !state.sound) return;
    steps.forEach(step => {
      const when = baseWhen + (step.w || 0);
      const gain = step.g || 0.03;
      if (step.noise) playNoise(step.d, gain, when, step.ff || 1200, bus);
      else if (step.chord) playChord(step.chord, step.d, step.type || 'sine', gain, when, bus);
      else if (step.sweep || (step.f0 && step.f1)) {
        playToneSweep(step.f0, step.f1, step.d, step.type || 'sine', gain, when, bus);
      } else playTone(step.f, step.d, step.type || 'sine', gain, when, step.detune || 0, bus);
    });
  }

  function playUiSound(kind) {
    if (!state.sound) return;
    if (!unlockAudioFromGesture()) return;
    const sequences = {
        shuffle: [
          { noise: true, d: .028, w: 0, g: .024, ff: 2800 },
          { noise: true, d: .026, w: .024, g: .022, ff: 2500 },
          { noise: true, d: .024, w: .048, g: .021, ff: 2300 },
          { noise: true, d: .026, w: .072, g: .023, ff: 2100 },
          { noise: true, d: .024, w: .096, g: .02, ff: 1900 },
          { f: 220, d: .07, w: .28, type: 'triangle', g: .02 },
          { f: 329.63, d: .09, w: .34, type: 'sine', g: .018 }
        ],
        click: [
          { noise: true, d: .014, w: 0, g: .012, ff: 3400 },
          { f: 680, d: .028, w: 0, type: 'square', g: .024 },
          { f: 920, d: .034, w: .016, type: 'sine', g: .02 }
        ],
        tap: [
          { noise: true, d: .014, w: 0, g: .012, ff: 3400 },
          { f: 680, d: .028, w: 0, type: 'square', g: .024 },
          { f: 920, d: .034, w: .016, type: 'sine', g: .02 }
        ],
        cardPlace: [
          { noise: true, d: .045, w: 0, g: .038, ff: 1900 },
          { f: 196, d: .055, w: .008, type: 'triangle', g: .042 },
          { f: 392, d: .07, w: .03, type: 'sine', g: .032 },
          { noise: true, d: .03, w: .045, g: .014, ff: 820 }
        ],
        play: [
          { noise: true, d: .045, w: 0, g: .038, ff: 1900 },
          { f: 196, d: .055, w: .008, type: 'triangle', g: .042 },
          { f: 392, d: .07, w: .03, type: 'sine', g: .032 },
          { noise: true, d: .03, w: .045, g: .014, ff: 820 }
        ],
        emoji: [
          { f: 587.33, d: .05, w: 0, type: 'sine', g: .03 },
          { f: 880, d: .07, w: .04, type: 'triangle', g: .034 },
          { f: 1174.66, d: .09, w: .09, type: 'sine', g: .028 },
          { noise: true, d: .022, w: .02, g: .012, ff: 4200 }
        ],
        start: [
          { f: 196, d: .07, w: 0, type: 'triangle', g: .032 },
          { f: 261.63, d: .08, w: .06, type: 'triangle', g: .034 },
          { f: 329.63, d: .09, w: .12, type: 'sine', g: .035 },
          { chord: [392, 523.25, 659.25], d: .18, w: .2, type: 'triangle', g: .018 }
        ],
        pass: [
          { noise: true, d: .05, w: 0, g: .014, ff: 650 },
          { f: 246.94, d: .08, w: .01, type: 'sine', g: .026 },
          { f: 196, d: .12, w: .08, type: 'triangle', g: .024 }
        ],
        error: [
          { f: 220, d: .09, w: 0, type: 'sawtooth', g: .026 },
          { f: 185, d: .12, w: .07, type: 'sawtooth', g: .022 },
          { noise: true, d: .05, w: .03, g: .012, ff: 420 }
        ],
        ai: [
          { noise: true, d: .038, w: 0, g: .028, ff: 1700 },
          { f: 311.13, d: .05, w: .012, type: 'triangle', g: .028 },
          { f: 466.16, d: .06, w: .04, type: 'sine', g: .024 }
        ],
        coin: [
          { noise: true, d: .02, w: 0, g: .014, ff: 3800 },
          { f: 988, d: .05, w: .01, type: 'triangle', g: .032 },
          { f: 1318.51, d: .07, w: .045, type: 'sine', g: .03 },
          { f: 1567.98, d: .08, w: .1, type: 'triangle', g: .022 }
        ],
        coinWin: [
          { noise: true, d: .03, w: 0, g: .018, ff: 4200 },
          { f: 784, d: .07, w: .02, type: 'triangle', g: .046 },
          { f: 988, d: .08, w: .08, type: 'triangle', g: .048 },
          { f: 1318.51, d: .11, w: .16, type: 'sine', g: .034 },
          { chord: [988, 1174.66, 1567.98], d: .2, w: .24, type: 'sine', g: .016 }
        ],
        turn: [
          { f: 523.25, d: .06, w: 0, type: 'sine', g: .022 },
          { f: 784, d: .08, w: .07, type: 'triangle', g: .022 }
        ],
        lastCardPing: [
          { f: 987.77, d: .04, w: 0, type: 'triangle', g: .026 },
          { f: 1318.51, d: .05, w: .02, type: 'sine', g: .022 }
        ],
        lastCardVoice: [
          { f: 440, d: .07, w: 0, type: 'triangle', g: .03 },
          { f: 554.37, d: .08, w: .05, type: 'triangle', g: .028 },
          { f: 659.25, d: .09, w: .1, type: 'sine', g: .026 },
          { f: 880, d: .11, w: .18, type: 'triangle', g: .024 },
          { f: 1046.5, d: .13, w: .28, type: 'sine', g: .02 }
        ],
        win: [
          { noise: true, d: .1, w: 0, g: .028, ff: 2800 },
          { f: 523.25, d: .12, w: .02, type: 'triangle', g: .038 },
          { f: 659.25, d: .12, w: .12, type: 'triangle', g: .038 },
          { f: 783.99, d: .14, w: .22, type: 'triangle', g: .04 },
          { f: 1046.5, d: .16, w: .34, type: 'sine', g: .032 },
          { chord: [659.25, 783.99, 1046.5, 1318.51], d: .36, w: .48, type: 'sine', g: .02 }
        ],
        defeat: [
          { f: 392, d: .09, w: 0, type: 'sine', g: .028 },
          { f: 311.13, d: .1, w: .07, type: 'triangle', g: .026 },
          { f: 246.94, d: .12, w: .16, type: 'sine', g: .024 },
          { noise: true, d: .04, w: .18, g: .01, ff: 520 },
          { f: 440, d: .12, w: .34, type: 'triangle', g: .032 },
          { f: 554.37, d: .14, w: .44, type: 'sine', g: .028 }
        ]
      };
    const plan = sequences[kind] || sequences.click;
    playSoundSteps(plan);
  }

  function comboScore(play) {
    if (!play) return 0;
    const kindWeight = {
      single: 1,
      pair: 2,
      triple: 3,
      straight: 4,
      flush: 5,
      'full-house': 6,
      'four-kind': 7,
      'straight-flush': 8
    };
    const base = kindWeight[play.kind] || 1;
    const cardScore = Array.isArray(play.score) ? play.score.reduce((sum, value) => sum + value, 0) : 0;
    return base * 1000 + cardScore;
  }

  function resetPlaySession() {
    state.playSession = {
      gamesPlayed: 0,
      wins: 0,
      coinsEarned: 0,
      bestCombo: '',
      bestComboScore: 0,
      lastWinner: null,
      farewellSnapshot: []
    };
  }

  function recordSessionCombo(play) {
    if (!play || state.liveRoom?.code) return;
    const score = comboScore(play);
    const label = describePlay(play);
    if (score > state.playSession.bestComboScore) {
      state.playSession.bestComboScore = score;
      state.playSession.bestCombo = label;
    }
  }

  function recordSessionMatchResult(winner, coinPrize = 0, brainBonus = 0) {
    state.playSession.gamesPlayed += 1;
    state.playSession.lastWinner = winner || null;
    if (winner?.isHuman) {
      state.playSession.wins += 1;
      state.playSession.coinsEarned += Math.max(0, Number(coinPrize) || 0);
    }
    if (brainBonus > 0) {
      state.playSession.coinsEarned += Math.max(0, Number(brainBonus) || 0);
    }
    state.playSession.farewellSnapshot = window.Big2GoAICharacters?.getSessionFarewells?.(state, winner) || [];
  }

  function dismissSessionCompleteScreen() {
    els.sessionComplete?.classList.add('hidden');
  }

  function renderSessionSummary() {
    if (!els.sessionSummary) return;
    const summary = state.playSession;
    const bestCombo = summary.bestCombo || 'Opening spark';
    els.sessionSummary.innerHTML = `
      <div class="session-summary-item">
        <small>Games Played</small>
        <strong>${summary.gamesPlayed}</strong>
      </div>
      <div class="session-summary-item">
        <small>Wins</small>
        <strong>${summary.wins}</strong>
      </div>
      <div class="session-summary-item">
        <small>Coins Earned</small>
        <strong>${coinIcon()} ${summary.coinsEarned}</strong>
      </div>
      <div class="session-summary-item session-summary-item--wide">
        <small>Best Moment / Combo</small>
        <strong>${bestCombo}</strong>
      </div>`;
  }

  function renderSessionFarewells() {
    if (!els.sessionFarewells) return;
    els.sessionFarewells.innerHTML = '';
    const farewells = state.playSession.farewellSnapshot?.length
      ? state.playSession.farewellSnapshot
      : (window.Big2GoAICharacters?.getSessionFarewells?.(state, state.playSession.lastWinner) || []);
    if (!farewells.length) {
      const empty = document.createElement('p');
      empty.className = 'session-thanks';
      empty.textContent = g('victory.seeYou');
      els.sessionFarewells.appendChild(empty);
      return;
    }
    farewells.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'session-farewell';
      const avatar = document.createElement('div');
      avatar.className = 'session-farewell-avatar';
      window.Big2GoAICharacters?.renderAvatar(avatar, entry.character || entry.player, {
        className: 'character-avatar',
        imgClassName: 'character-avatar-img'
      });
      const copy = document.createElement('div');
      copy.className = 'session-farewell-copy';
      const name = document.createElement('strong');
      name.textContent = entry.character?.name || entry.player?.name || 'Rival';
      const message = document.createElement('p');
      message.textContent = `"${entry.message || g('victory.goodGame')}"`;
      copy.append(name, message);
      row.append(avatar, copy);
      els.sessionFarewells.appendChild(row);
    });
  }

  function showSessionCompleteScreen() {
    stopLandingMusic();
    document.querySelector('#victory-overlay')?.remove();
    hideAllScreens();
    els.sessionComplete?.classList.remove('hidden');
    document.body.classList.add('session-complete-active');
    renderSessionSummary();
    renderSessionFarewells();
    playUiSound('win');
  }

  function showExitConfirmDialog() {
    return new Promise(resolve => {
      const dialog = els.exitConfirmDialog;
      if (!dialog) {
        resolve(window.confirm('Are you sure you want to exit Big2Go?'));
        return;
      }
      const onClose = () => {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'exit');
      };
      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  function performFullExit() {
    document.querySelector('#victory-overlay')?.remove();
    cancelAiTimer();
    state.busy = false;
    persistPlayerWallet();
    if (state.liveRoom?.code) {
      saveRoomSession();
      leaveCurrentRoom();
    }
    resetFinishedMatchState();
    resetPlaySession();
    state.lastMatchStory = null;
    clearSave();
    showLandingScreen();
  }

  async function exitGame() {
    const confirmed = await showExitConfirmDialog();
    if (!confirmed) return;
    performFullExit();
  }

  function persistPlayerWallet() {
    if (state.liveRoom?.code) return getWalletDisplayBalance();
    persistCoinBalance(state.coins.balance);
    return state.coins.balance;
  }

  function resetFinishedMatchState() {
    state.coins.prizePool = 0;
    state.coins.entryPaid = false;
    state.coins.paidOut = false;
    state.gameOver = false;
    state.players = [];
    state.selected = new Set();
    state.logs = [];
  }

  function dismissLevelUpScreen() {
    clearLevelUpCelebration();
    els.levelUp?.classList.add('hidden');
    document.body.classList.remove('level-up-active');
  }

  function clearLevelUpCelebration() {
    if (audio.levelUpTimer) {
      clearTimeout(audio.levelUpTimer);
      audio.levelUpTimer = null;
    }
    state.levelUpFxTimers.forEach(timer => clearTimeout(timer));
    state.levelUpFxTimers = [];
    if (els.levelUp) {
      els.levelUp.classList.remove(
        'is-celebrating',
        'is-revealing',
        'is-revealed',
        'level-up-screen--tier-promo',
        'level-up-screen--legend',
        'level-up-motion-gallop',
        'level-up-motion-pulse',
        'level-up-motion-wave',
        'level-up-motion-flare',
        'level-up-motion-spark',
        'level-up-motion-royal'
      );
      els.levelUp.removeAttribute('data-level');
      els.levelUp.removeAttribute('data-tier');
      els.levelUp.removeAttribute('data-journey-theme');
      els.levelUp.style.removeProperty('--level-up-hue');
      els.levelUp.style.removeProperty('--journey-accent');
      els.levelUp.style.removeProperty('--journey-secondary');
      els.levelUp.style.removeProperty('--journey-tertiary');
      els.levelUp.style.removeProperty('--neon-chase-speed');
    }
    if (els.levelUpNeonChase) els.levelUpNeonChase.innerHTML = '';
    if (els.levelUpFxLayer) els.levelUpFxLayer.innerHTML = '';
    if (els.levelUpMarqueeTrack) els.levelUpMarqueeTrack.innerHTML = '';
    if (els.levelUpTo) els.levelUpTo.classList.remove('is-bursting');
    if (els.levelUpChapter) {
      els.levelUpChapter.textContent = '';
      els.levelUpChapter.classList.add('hidden');
    }
  }

  function buildLevelUpMarquee(levelUp, theme, copy) {
    if (!els.levelUpMarqueeTrack) return;
    const tier = levelUp.tier || getLevelTier(levelUp.level);
    const items = [
      `★ ${t('levelUp.eyebrow')} ★`,
      `${theme.emoji} Lv ${levelUp.level}`,
      tier.emoji + ' ' + tier.title,
      copy.title,
      '✨ Big2Go ✨',
      `${theme.emoji} ${copy.eyebrow}`
    ];
    const segment = items.map(item => `<span class="level-up-marquee__item">${item}</span>`).join('');
    els.levelUpMarqueeTrack.innerHTML = segment + segment;
  }

  function spawnLevelUpShockwave() {
    if (!els.levelUpFxLayer) return;
    const wave = document.createElement('div');
    wave.className = 'level-up-shockwave';
    els.levelUpFxLayer.appendChild(wave);
    scheduleLevelUpFx(() => wave.remove(), 1300);
  }

  function spawnLevelUpAmbientBits(theme) {
    if (!els.levelUpFxLayer) return;
    const symbols = ['★', '✨', '♠', '♥', '♦', '♣', 'Lv', '↑', theme?.emoji || '🎠'];
    for (let i = 0; i < 12; i += 1) {
      const bit = document.createElement('span');
      bit.className = 'level-up-ambient-bit';
      bit.textContent = symbols[i % symbols.length];
      bit.style.setProperty('--ab-x', `${4 + Math.random() * 92}%`);
      bit.style.setProperty('--ab-delay', `${Math.random() * 3}s`);
      bit.style.setProperty('--ab-drift', `${(Math.random() - 0.5) * 80}px`);
      bit.style.setProperty('--ab-duration', `${3.2 + Math.random() * 2.4}s`);
      if (theme?.accent) bit.style.setProperty('--ab-color', theme.accent);
      els.levelUpFxLayer.appendChild(bit);
    }
    for (let i = 0; i < 2; i += 1) {
      const spot = document.createElement('span');
      spot.className = 'level-up-spotlight';
      spot.style.setProperty('--spot-x', `${22 + i * 36}%`);
      spot.style.setProperty('--spot-delay', `${i * 0.5}s`);
      els.levelUpFxLayer.appendChild(spot);
    }
  }

  function triggerLevelBurst() {
    if (!els.levelUpTo) return;
    els.levelUpTo.classList.remove('is-bursting');
    void els.levelUpTo.offsetWidth;
    els.levelUpTo.classList.add('is-bursting');
  }

  function getRankJourneyFill(level) {
    const lv = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(level) || STARTING_LEVEL));
    return Math.min(100, Math.max(4, ((lv - 1) / (MAX_LEVEL - 1)) * 100));
  }

  function getTierStopState(tierEntry, level, tierPromo, previousLevel) {
    if (level > tierEntry.max) return 'completed';
    if (level >= tierEntry.min && level <= tierEntry.max) {
      if (tierPromo && previousLevel < tierEntry.min) return 'unlocked';
      return 'current';
    }
    return 'locked';
  }

  function renderRankJourneyPath(levelUp, tier, tierPromo) {
    const level = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(levelUp?.level) || STARTING_LEVEL));
    const previousLevel = Math.max(STARTING_LEVEL, Number(levelUp?.previousLevel) || level - 1);
    const fill = getRankJourneyFill(level);
    const tierSpan = tier.max - tier.min + 1;
    const tierStep = Math.max(1, level - tier.min + 1);
    const stops = LEVEL_TIERS.map(entry => {
      const state = getTierStopState(entry, level, tierPromo, previousLevel);
      const pathStyle = LEVEL_TIER_PATH[entry.skill] || LEVEL_TIER_PATH.rookie;
      const shortLabel = t(`levelUp.tierStop.${entry.skill}`);
      return `<div class="level-up-rank-stop level-up-rank-stop--${state}" data-tier="${entry.skill}" style="--tier-color:${pathStyle.color};--tier-glow:${pathStyle.glow}">
        <span class="level-up-rank-node" aria-hidden="true">${entry.emoji}</span>
        <strong>${shortLabel}</strong>
        <small>Lv ${entry.min}${entry.max === entry.min ? '' : `–${entry.max}`}</small>
      </div>`;
    }).join('');
    return `
      <div class="level-up-rank-path" aria-label="${t('levelUp.journeyPath')}">
        <div class="level-up-rank-path-head">
          <p class="level-up-rank-path-label">${t('levelUp.journeyPath')}</p>
          <span class="level-up-rank-path-step">${t('levelUp.tierProgress', { current: level, step: tierStep, steps: tierSpan })}</span>
        </div>
        <div class="level-up-rank-rail" aria-hidden="true">
          <span class="level-up-rank-fill" style="width:${fill}%"></span>
          <span class="level-up-rank-pin" style="left:${fill}%">Lv ${level}</span>
        </div>
        <div class="level-up-rank-stops">${stops}</div>
        ${tierPromo ? `<p class="level-up-rank-unlock">${t('levelUp.rankUnlocked')}</p>` : ''}
      </div>`;
  }

  function applyLevelUpChapter(theme, level) {
    if (!els.levelUpChapter) return;
    const chapter = theme?.chapterKey ? t(theme.chapterKey) : '';
    els.levelUpChapter.textContent = chapter ? `${theme.emoji} ${chapter} · Lv ${level}` : '';
    els.levelUpChapter.classList.toggle('hidden', !chapter);
  }

  function getLevelJourneyTheme(levelUp) {
    const level = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(levelUp?.level) || STARTING_LEVEL));
    const tierPromo = crossedSkillTier(levelUp?.previousLevel || level - 1, level);
    if (level >= MAX_LEVEL) {
      return { ...LEVEL_JOURNEY_THEMES[0], id: 'legend-crown', chapterKey: 'levelUp.chapter.legendCrown', emoji: '🏆', accent: '#ffd700', secondary: '#fff4b0', tertiary: '#ff2d95', chase: 1.2, motion: 'royal' };
    }
    if (tierPromo) {
      const promoThemes = ['violet-crown', 'ruby-flame', 'cyber-wave', 'gold-rush'];
      const promoId = promoThemes[Math.floor(level / 8) % promoThemes.length];
      const base = LEVEL_JOURNEY_THEMES.find(entry => entry.id === promoId) || LEVEL_JOURNEY_THEMES[0];
      return { ...base, chase: Math.max(1.2, base.chase - 0.3) };
    }
    return LEVEL_JOURNEY_THEMES[(level - 1) % LEVEL_JOURNEY_THEMES.length];
  }

  function buildNeonChaseTrack(theme, level) {
    if (!els.levelUpNeonChase) return;
    els.levelUpNeonChase.innerHTML = '';
    const bulbCount = 28 + (level % 5) * 2;
    const colors = [theme.accent, theme.secondary, theme.tertiary];
    for (let i = 0; i < bulbCount; i += 1) {
      const bulb = document.createElement('span');
      bulb.className = 'level-up-neon-bulb';
      const t = i / bulbCount;
      if (t < 0.25) {
        const p = t / 0.25;
        bulb.style.left = `${2 + p * 96}%`;
        bulb.style.top = '0%';
      } else if (t < 0.5) {
        const p = (t - 0.25) / 0.25;
        bulb.style.left = '100%';
        bulb.style.top = `${2 + p * 96}%`;
      } else if (t < 0.75) {
        const p = (t - 0.5) / 0.25;
        bulb.style.left = `${98 - p * 96}%`;
        bulb.style.top = '100%';
      } else {
        const p = (t - 0.75) / 0.25;
        bulb.style.left = '0%';
        bulb.style.top = `${98 - p * 96}%`;
      }
      bulb.style.setProperty('--bulb-i', String(i));
      bulb.style.setProperty('--bulb-count', String(bulbCount));
      bulb.style.setProperty('--bulb-color', colors[i % colors.length]);
      bulb.style.animationDuration = `${theme.chase}s`;
      els.levelUpNeonChase.appendChild(bulb);
    }
  }

  function applyLevelUpJourneyTheme(levelUp) {
    const theme = getLevelJourneyTheme(levelUp);
    const level = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(levelUp?.level) || STARTING_LEVEL));
    if (!els.levelUp) return theme;
    els.levelUp.dataset.journeyTheme = theme.id;
    els.levelUp.style.setProperty('--journey-accent', theme.accent);
    els.levelUp.style.setProperty('--journey-secondary', theme.secondary);
    els.levelUp.style.setProperty('--journey-tertiary', theme.tertiary);
    els.levelUp.style.setProperty('--neon-chase-speed', `${theme.chase}s`);
    els.levelUp.classList.add(`level-up-motion-${theme.motion}`);
    if (els.levelUpJourneyIcon) els.levelUpJourneyIcon.textContent = theme.emoji;
    applyLevelUpChapter(theme, level);
    buildNeonChaseTrack(theme, level);
    return theme;
  }

  function getLevelCelebrationStyle(levelUp) {
    const level = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(levelUp?.level) || STARTING_LEVEL));
    const tier = levelUp?.tier || getLevelTier(level);
    const tierPromo = crossedSkillTier(levelUp?.previousLevel || level - 1, level);
    return {
      level,
      tier,
      tierPromo,
      palette: LEVEL_CONFETTI_PALETTES[tier.skill] || LEVEL_CONFETTI_PALETTES.rookie,
      confettiIntensity: Math.min(88, 24 + level * 2 + (tierPromo ? 14 : 0)),
      burstCount: Math.min(14, 5 + Math.floor(level / 2) + (tierPromo ? 3 : 0)),
      ringCount: tier.skill === 'legend' ? 4 : tier.skill === 'master' ? 3 : tier.skill === 'strategist' ? 2 : 1,
      hue: CARNIVAL_CELEBRATION_HUES[level % CARNIVAL_CELEBRATION_HUES.length]
    };
  }

  function buildLevelMelody(level) {
    const tier = getLevelTier(level);
    const scale = LEVEL_FANFARE_SCALES[tier.skill] || LEVEL_FANFARE_SCALES.rookie;
    const noteCount = Math.min(10, 3 + Math.floor(level / 3) + (tier.skill === 'legend' ? 2 : 0));
    const melody = [];
    for (let i = 0; i < noteCount; i += 1) {
      const scaleIndex = (i * ((level % 4) + 1) + (level % scale.length)) % scale.length;
      const wave = i % 3 === 0 ? 'triangle' : 'sine';
      melody.push({
        freq: scale[scaleIndex],
        duration: 0.12 + (i % 4) * 0.03 + (tier.skill === 'master' ? 0.03 : 0),
        wave,
        gain: 0.11 + Math.min(0.07, level * 0.0025),
        wait: i * (tier.skill === 'legend' ? 0.1 : 0.11)
      });
    }
    return melody;
  }

  function playLevelUpFanfare(levelUp) {
    if (!state.sound) return;
    if (!unlockAudioFromGesture()) return;
    const level = Math.max(STARTING_LEVEL, Math.min(MAX_LEVEL, Number(levelUp?.level) || STARTING_LEVEL));
    const tier = getLevelTier(level);
    const tierPromo = crossedSkillTier(levelUp?.previousLevel || level - 1, level);
    const loudBus = getLevelUpAudioMaster();
    if (!loudBus) return;
    const scale = LEVEL_FANFARE_SCALES[tier.skill] || LEVEL_FANFARE_SCALES.rookie;
    const root = scale[0] / 2;

    playTone(root, 0.22, 'sine', 0.16, 0, 0, loudBus);
    playTone(root * 2, 0.18, 'triangle', 0.12, 0.04, 0, loudBus);
    playNoise(0.14, 0.08, 0.02, 1800, loudBus);

    const melody = buildLevelMelody(level);
    melody.forEach(note => playTone(note.freq, note.duration, note.wave, note.gain, note.wait + 0.08, 0, loudBus));

    const tail = (melody[melody.length - 1]?.wait || 0) + 0.08;
    playChord([scale[0], scale[2], scale[Math.min(4, scale.length - 1)]], 0.42, 'triangle', 0.09, tail + 0.06, loudBus);

    if (tierPromo) {
      playChord([scale[0], scale[2], scale[Math.min(4, scale.length - 1)]], 0.48, 'sine', 0.1, tail + 0.22, loudBus);
      playNoise(0.18, 0.09, tail + 0.18, 3200 + level * 20, loudBus);
    }

    if (level === MAX_LEVEL) {
      const legendScale = LEVEL_FANFARE_SCALES.legend;
      playChord(legendScale.slice(0, 3), 0.58, 'triangle', 0.12, tail + 0.5, loudBus);
      playChord(legendScale.slice(2, 5), 0.66, 'sine', 0.1, tail + 0.82, loudBus);
      playTone(legendScale[5] || 1975.53, 0.28, 'sine', 0.14, tail + 1.12, 0, loudBus);
      playNoise(0.22, 0.1, tail + 0.48, 4200, loudBus);
    } else if (levelUp?.kind === 'human') {
      playTone(1046.5 + level, 0.14, 'sine', 0.1, tail + 0.34, 0, loudBus);
    }
  }

  function scheduleLevelUpFx(callback, delay) {
    const timer = setTimeout(callback, delay);
    state.levelUpFxTimers.push(timer);
    return timer;
  }

  function spawnLevelUpBurst(style) {
    if (!els.levelUpFxLayer) return;
    const burst = document.createElement('div');
    burst.className = 'level-up-burst';
    burst.style.setProperty('--burst-hue', `${style.hue}deg`);
    burst.style.setProperty('--burst-size', `${120 + style.level * 6}px`);
    els.levelUpFxLayer.appendChild(burst);
    scheduleLevelUpFx(() => burst.remove(), 1200);
  }

  function spawnLevelUpRing(style, index = 0) {
    if (!els.levelUpFxLayer) return;
    const ring = document.createElement('div');
    ring.className = 'level-up-ring';
    ring.style.setProperty('--ring-hue', `${(style.hue + index * 28) % 360}deg`);
    ring.style.setProperty('--ring-delay', `${index * 0.12}s`);
    els.levelUpFxLayer.appendChild(ring);
    scheduleLevelUpFx(() => ring.remove(), 1400 + index * 120);
  }

  function spawnLevelUpSpark(style) {
    if (!els.levelUpFxLayer) return;
    const spark = document.createElement('span');
    spark.className = 'level-up-spark';
    spark.style.setProperty('--sx', `${8 + Math.random() * 84}%`);
    spark.style.setProperty('--sy', `${10 + Math.random() * 72}%`);
    spark.style.setProperty('--spark-hue', `${CARNIVAL_CELEBRATION_HUES[Math.floor(Math.random() * CARNIVAL_CELEBRATION_HUES.length)]}deg`);
    spark.style.setProperty('--spark-dx', `${(Math.random() - 0.5) * 180}px`);
    spark.style.setProperty('--spark-dy', `${(Math.random() - 0.5) * 180}px`);
    els.levelUpFxLayer.appendChild(spark);
    scheduleLevelUpFx(() => spark.remove(), 900 + Math.random() * 500);
  }

  function spawnLevelUpEmoji(style) {
    if (!els.levelUpFxLayer || !style.tierPromo) return;
    const emoji = document.createElement('span');
    emoji.className = 'level-up-emoji-burst';
    emoji.textContent = style.tier.emoji;
    emoji.style.setProperty('--ex', `${15 + Math.random() * 70}%`);
    emoji.style.setProperty('--ey', `${12 + Math.random() * 58}%`);
    els.levelUpFxLayer.appendChild(emoji);
    scheduleLevelUpFx(() => emoji.remove(), 1400);
  }

  function playLevelUpCelebration(levelUp) {
    const style = getLevelCelebrationStyle(levelUp);
    if (!els.levelUp) return;
    clearLevelUpCelebration();
    const theme = applyLevelUpJourneyTheme(levelUp);
    const copy = getLevelUpCopy(levelUp);
    buildLevelUpMarquee(levelUp, theme, copy);

    els.levelUp.dataset.level = String(style.level);
    els.levelUp.dataset.tier = style.tier.skill;
    els.levelUp.style.setProperty('--level-up-hue', `${style.hue}deg`);
    els.levelUp.classList.add('is-celebrating', 'is-revealing');
    if (style.tierPromo) els.levelUp.classList.add('level-up-screen--tier-promo');
    if (style.level >= MAX_LEVEL) els.levelUp.classList.add('level-up-screen--legend');

    spawnLevelUpShockwave();
    spawnLevelUpAmbientBits(theme);
    scheduleLevelUpFx(() => triggerLevelBurst(), 280);
    scheduleLevelUpFx(() => els.levelUpTo?.classList.remove('is-bursting'), 1050);
    scheduleLevelUpFx(() => els.levelUp?.classList.add('is-revealed'), 1100);

    playLevelUpFanfare(levelUp);
    renderConfetti(style.confettiIntensity, style.palette);

    for (let i = 0; i < style.ringCount; i += 1) {
      scheduleLevelUpFx(() => spawnLevelUpRing(style, i), i * 140);
    }
    for (let i = 0; i < style.burstCount; i += 1) {
      scheduleLevelUpFx(() => spawnLevelUpBurst(style), 80 + i * 90);
    }
    for (let i = 0; i < style.burstCount * 2; i += 1) {
      scheduleLevelUpFx(() => spawnLevelUpSpark(style), 40 + i * 55);
    }
    for (let i = 0; i < (style.tierPromo ? 6 : 2); i += 1) {
      scheduleLevelUpFx(() => spawnLevelUpEmoji(style), 180 + i * 160);
    }

    scheduleLevelUpFx(() => {
      renderConfetti(Math.floor(style.confettiIntensity * 0.45), style.palette);
    }, 520);

    audio.levelUpTimer = scheduleLevelUpFx(() => {
      els.levelUp?.classList.remove('is-celebrating');
      audio.levelUpTimer = null;
    }, style.level >= MAX_LEVEL ? 2200 : 1600);
  }

  function getSkillUpgradeCopy(tier) {
    return g(`skill.${tier.skill}`);
  }

  function getLevelUpCopy(levelUp) {
    const tier = levelUp.tier || getLevelTier(levelUp.level);
    const previousTier = levelUp.previousTier || getLevelTier(levelUp.previousLevel);
    const tierChanged = previousTier.skill !== tier.skill;
    const isHuman = levelUp.kind === 'human';
    const isFirstPromotion = levelUp.previousLevel === 1 && levelUp.level === 2;
    const tierLabel = `${tier.emoji} ${tier.title}`;
    const vars = { name: levelUp.name, level: levelUp.level, tierLabel };

    if (isHuman && tier.skill === 'legend' && tierChanged) {
      return {
        eyebrow: g('levelUp.humanLegend.eyebrow'),
        title: g('levelUp.humanLegend.title'),
        message: g('levelUp.humanLegend.message'),
        quote: g('levelUp.humanLegend.quote'),
        milestone: true,
        tierLabel,
        skillNote: ''
      };
    }
    if (isHuman && tierChanged) {
      return {
        eyebrow: g('levelUp.humanTierChange.eyebrow'),
        title: g('levelUp.humanTierChange.title'),
        message: g('levelUp.humanTierChange.message', vars),
        quote: g('levelUp.humanTierChange.quote'),
        milestone: true,
        tierLabel,
        skillNote: ''
      };
    }
    if (isHuman && isFirstPromotion) {
      return {
        eyebrow: g('levelUp.humanFirstPromotion.eyebrow'),
        title: g('levelUp.humanFirstPromotion.title'),
        message: g('levelUp.humanFirstPromotion.message'),
        quote: g('levelUp.humanFirstPromotion.quote'),
        milestone: true,
        tierLabel,
        skillNote: ''
      };
    }
    if (isHuman) {
      return {
        eyebrow: g('levelUp.humanDefault.eyebrow'),
        title: g('levelUp.humanDefault.title'),
        message: g('levelUp.humanDefault.message', vars),
        quote: g('levelUp.humanDefault.quote'),
        milestone: false,
        tierLabel,
        skillNote: ''
      };
    }
    if (levelUp.skillUpgraded && tier.skill === 'legend') {
      return {
        eyebrow: g('levelUp.rivalLegendSkill.eyebrow'),
        title: g('levelUp.rivalLegendSkill.title', vars),
        message: g('levelUp.rivalLegendSkill.message', vars),
        quote: g('levelUp.rivalLegendSkill.quote'),
        milestone: true,
        tierLabel,
        skillNote: getSkillUpgradeCopy(tier)
      };
    }
    if (levelUp.skillUpgraded) {
      return {
        eyebrow: g('levelUp.rivalSkillUpgraded.eyebrow'),
        title: g('levelUp.rivalSkillUpgraded.title', vars),
        message: g('levelUp.rivalSkillUpgraded.message', vars),
        quote: g('levelUp.rivalSkillUpgraded.quote'),
        milestone: true,
        tierLabel,
        skillNote: getSkillUpgradeCopy(tier)
      };
    }
    if (isFirstPromotion) {
      return {
        eyebrow: g('levelUp.rivalFirstPromotion.eyebrow'),
        title: g('levelUp.rivalFirstPromotion.title', vars),
        message: g('levelUp.rivalFirstPromotion.message', vars),
        quote: g('levelUp.rivalFirstPromotion.quote'),
        milestone: true,
        tierLabel,
        skillNote: ''
      };
    }
    return {
      eyebrow: g('levelUp.rivalDefault.eyebrow'),
      title: g('levelUp.rivalDefault.title', vars),
      message: g('levelUp.rivalDefault.message', vars),
      quote: g('levelUp.rivalDefault.quote'),
      milestone: false,
      tierLabel,
      skillNote: ''
    };
  }

  function renderLevelUpScreen(levelUp) {
    if (!levelUp) return;
    const copy = getLevelUpCopy(levelUp);
    const progress = getProfileProgress(levelUp.totalWins || 0);
    const tier = levelUp.tier || getLevelTier(levelUp.level);
    const winsToNext = progress.maxed ? 0 : progress.winsNeeded;
    const subject = levelUp.kind === 'human' ? t('levelUp.yourWins') : t('levelUp.rivalWins', { name: levelUp.name });
    const nextLabel = progress.maxed
      ? t('levelUp.legendMax')
      : t('levelUp.winsToNext', { count: winsToNext });

    if (els.levelUpEyebrow) els.levelUpEyebrow.textContent = copy.eyebrow;
    if (els.levelUpTitle) els.levelUpTitle.textContent = copy.title;
    if (els.levelUpMessage) els.levelUpMessage.textContent = copy.message;
    if (els.levelUpFrom) els.levelUpFrom.textContent = `Lv ${levelUp.previousLevel}`;
    if (els.levelUpTo) els.levelUpTo.textContent = `Lv ${levelUp.level}`;

    if (els.levelUpQuote) {
      const showQuote = Boolean(copy.quote && (copy.milestone || levelUp.level >= MAX_LEVEL - 2));
      els.levelUpQuote.textContent = copy.quote || '';
      els.levelUpQuote.classList.toggle('hidden', !showQuote);
    }

    if (els.levelUpAvatar) {
      els.levelUpAvatar.innerHTML = '';
      if (levelUp.kind === 'human') {
        renderPlayerProfileAvatar(els.levelUpAvatar, { extraClass: 'level-up-player-avatar' });
      } else {
        const character = window.Big2GoAICharacters?.getById?.(levelUp.characterId)
          || { characterId: levelUp.characterId, name: levelUp.name };
        window.Big2GoAICharacters?.renderAvatar(els.levelUpAvatar, character, {
          className: 'character-avatar',
          imgClassName: 'character-avatar-img'
        });
      }
    }

    if (els.levelUpJourneyStrip) {
      const tierPromo = crossedSkillTier(levelUp.previousLevel || levelUp.level - 1, levelUp.level);
      const skillChip = copy.skillNote
        ? `<span class="level-up-chip level-up-chip--skill">⚡ ${copy.skillNote}</span>`
        : '';
      els.levelUpJourneyStrip.innerHTML = `
        ${renderRankJourneyPath(levelUp, tier, tierPromo)}
        ${skillChip ? `<div class="level-up-journey-top">${skillChip}</div>` : ''}
        <div class="level-up-journey-stats">
          <div class="level-up-journey-stat">
            <small>${subject}</small>
            <strong>${levelUp.totalWins || 0}</strong>
          </div>
          <div class="level-up-journey-stat">
            <small>${t('levelUp.nextStop')}</small>
            <strong>${nextLabel}</strong>
          </div>
        </div>`;
    }
  }

  function showLevelUpScreen(levelUp) {
    stopLandingMusic();
    hideAllScreens();
    renderLevelUpScreen(levelUp);
    els.levelUp?.classList.remove('hidden');
    els.levelUp?.classList.add('is-revealing');
    document.body.classList.add('level-up-active');
    window.scrollTo(0, 0);
    playLevelUpCelebration(levelUp);
  }

  function continueFromLevelUp() {
    const pending = state.pendingVictoryReveal;
    dismissLevelUpScreen();
    state.pendingVictoryReveal = null;
    if (!pending) return;
    showGameScreen();
    if (pending.winner?.isHuman) renderConfetti(56);
    showVictoryCelebration(pending.winner, pending.coinPrize, null, pending.brainBonus || null);
    render();
    playUiSound('click');
  }

  function getDefeatRivalTheme(characterId) {
    return DEFEAT_RIVAL_THEMES[characterId] || DEFEAT_RIVAL_THEMES.default;
  }

  function buildVictoryNeonChase(container, theme, bulbCount = 26) {
    if (!container) return;
    container.innerHTML = '';
    const colors = [theme.accent, theme.secondary, theme.tertiary || theme.secondary];
    for (let i = 0; i < bulbCount; i += 1) {
      const bulb = document.createElement('span');
      bulb.className = 'victory-neon-bulb';
      const t = i / bulbCount;
      if (t < 0.25) {
        bulb.style.left = `${2 + (t / 0.25) * 96}%`;
        bulb.style.top = '0%';
      } else if (t < 0.5) {
        bulb.style.left = '100%';
        bulb.style.top = `${2 + ((t - 0.25) / 0.25) * 96}%`;
      } else if (t < 0.75) {
        bulb.style.left = `${98 - ((t - 0.5) / 0.25) * 96}%`;
        bulb.style.top = '100%';
      } else {
        bulb.style.left = '0%';
        bulb.style.top = `${98 - ((t - 0.75) / 0.25) * 96}%`;
      }
      bulb.style.setProperty('--bulb-i', String(i));
      bulb.style.setProperty('--bulb-count', String(bulbCount));
      bulb.style.setProperty('--bulb-color', colors[i % colors.length]);
      bulb.style.animationDuration = `${theme.chase || 2}s`;
      container.appendChild(bulb);
    }
  }

  function createVictoryFxRoll(rivalId = '') {
    const rivalSum = String(rivalId).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const nonce = (Date.now() ^ Math.floor(performance.now() * 1000) ^ (Math.random() * 0x7fffffff)) >>> 0;
    const seed = (nonce * 2654435761 + rivalSum * 131709 + (state.sparks || 0) * 9973 + (state.round || 1) * 7919) >>> 0;
    return { seed, nonce };
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6D2B79F5) >>> 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hslFromSeed(seed, offset = 0, saturation = 68, lightness = 58) {
    const hue = ((seed + offset) * 137.508) % 360;
    return `hsl(${hue.toFixed(1)} ${saturation}% ${lightness}%)`;
  }

  function applyVictoryFxTheme(overlay, roll, { isWin, theme }) {
    if (!overlay || !roll) return;
    const rng = mulberry32(roll.seed);
    const accent = isWin ? hslFromSeed(roll.seed, 8, 78, 62) : (theme?.accent || hslFromSeed(roll.seed, 24, 72, 56));
    const secondary = isWin ? hslFromSeed(roll.seed, 96, 82, 58) : (theme?.secondary || hslFromSeed(roll.seed, 120, 70, 52));
    const tertiary = isWin ? hslFromSeed(roll.seed, 180, 76, 60) : (theme?.tertiary || hslFromSeed(roll.seed, 200, 68, 54));
    overlay.style.setProperty('--vfx-accent', accent);
    overlay.style.setProperty('--vfx-secondary', secondary);
    overlay.style.setProperty('--vfx-tertiary', tertiary);
    overlay.style.setProperty('--vfx-rays-speed', `${(12 + rng() * 18).toFixed(2)}s`);
    overlay.style.setProperty('--vfx-glow-speed', `${(2.8 + rng() * 3.4).toFixed(2)}s`);
    overlay.style.setProperty('--vfx-frame-speed', `${(3.6 + rng() * 4.8).toFixed(2)}s`);
    overlay.style.setProperty('--vfx-shimmer-angle', `${Math.floor(rng() * 360)}deg`);
    overlay.dataset.vfxSeed = String(roll.seed);
  }

  function spawnProceduralFx(layer, roll, { isWin, theme }) {
    if (!layer || !roll) return;
    const rng = mulberry32(roll.seed ^ 0x9e3779b9);
    const symbolPool = isWin
      ? ['🎉', '✨', '★', '🪙', '♦', '2', '👑', '💫', '🔥', '⚡', '🎴', 'A', '🌟', '♠', '♥', 'K', 'Q', 'J', '7', '10']
      : ['☁️', '💨', '♠', '♥', '♦', '♣', '🌧', '💫', '⚡', '…', '—', '↯', '💥', '🌙', '✧', '🎭', '✦', '·', '2', 'A'];
    const palette = isWin
      ? [hslFromSeed(roll.seed, 0), hslFromSeed(roll.seed, 40), hslFromSeed(roll.seed, 80), hslFromSeed(roll.seed, 120)]
      : [theme?.accent || hslFromSeed(roll.seed, 0), theme?.secondary || hslFromSeed(roll.seed, 60), theme?.tertiary || hslFromSeed(roll.seed, 120), hslFromSeed(roll.seed, 180)];
    const count = Math.floor(11 + rng() * 13);

    for (let i = 0; i < count; i += 1) {
      const rollKind = rng();
      const color = palette[Math.floor(rng() * palette.length)];
      if (rollKind < 0.62) {
        const bit = document.createElement('span');
        bit.className = rollKind < 0.18 ? 'vfx-bit vfx-bit--spark' : 'vfx-bit';
        if (rollKind >= 0.18) bit.textContent = symbolPool[Math.floor(rng() * symbolPool.length)];
        bit.style.setProperty('--fx-x', `${2 + rng() * 96}%`);
        bit.style.setProperty('--fx-delay', `${(rng() * 2.6).toFixed(2)}s`);
        bit.style.setProperty('--fx-drift', `${((rng() - 0.5) * (70 + rng() * 90)).toFixed(1)}px`);
        bit.style.setProperty('--fx-duration', `${(2.2 + rng() * 2.8).toFixed(2)}s`);
        bit.style.setProperty('--fx-color', color);
        bit.style.setProperty('--fx-scale', `${(0.75 + rng() * 0.85).toFixed(2)}`);
        layer.appendChild(bit);
        continue;
      }
      if (rollKind < 0.86) {
        const streak = document.createElement('span');
        streak.className = 'vfx-streak';
        streak.style.setProperty('--fx-x', `${rng() * 100}%`);
        streak.style.setProperty('--fx-y', `${rng() * 100}%`);
        streak.style.setProperty('--fx-rotate', `${Math.floor(rng() * 360)}deg`);
        streak.style.setProperty('--fx-delay', `${(rng() * 2.2).toFixed(2)}s`);
        streak.style.setProperty('--fx-duration', `${(1.4 + rng() * 2.2).toFixed(2)}s`);
        streak.style.setProperty('--fx-color', color);
        streak.style.setProperty('--fx-length', `${(28 + rng() * 72).toFixed(0)}px`);
        layer.appendChild(streak);
        continue;
      }
      const orb = document.createElement('span');
      orb.className = 'vfx-orb';
      orb.style.setProperty('--fx-x', `${10 + rng() * 80}%`);
      orb.style.setProperty('--fx-y', `${8 + rng() * 72}%`);
      orb.style.setProperty('--fx-delay', `${(rng() * 1.8).toFixed(2)}s`);
      orb.style.setProperty('--fx-duration', `${(2.6 + rng() * 2.4).toFixed(2)}s`);
      orb.style.setProperty('--fx-color', color);
      orb.style.setProperty('--fx-size', `${(10 + rng() * 26).toFixed(0)}px`);
      layer.appendChild(orb);
    }

    const burstCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < burstCount; i += 1) {
      const burst = document.createElement('span');
      burst.className = isWin ? 'vfx-burst vfx-burst--win' : 'vfx-burst vfx-burst--defeat';
      burst.style.setProperty('--burst-x', `${20 + rng() * 60}%`);
      burst.style.setProperty('--burst-y', `${24 + rng() * 42}%`);
      burst.style.setProperty('--burst-delay', `${(i * 0.28 + rng() * 0.4).toFixed(2)}s`);
      burst.style.setProperty('--burst-color', palette[Math.floor(rng() * palette.length)]);
      burst.style.setProperty('--burst-scale', `${(6 + rng() * 8).toFixed(2)}`);
      layer.appendChild(burst);
    }

    if (!isWin) {
      const spotCount = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < spotCount; i += 1) {
        const spot = document.createElement('span');
        spot.className = 'defeat-spotlight';
        spot.style.setProperty('--spot-x', `${12 + rng() * 76}%`);
        spot.style.setProperty('--spot-delay', `${(i * 0.45 + rng() * 0.35).toFixed(2)}s`);
        layer.appendChild(spot);
      }
    }
  }

  function spawnDefeatShockwave(layer) {
    if (!layer) return;
    const wave = document.createElement('div');
    wave.className = 'defeat-shockwave';
    layer.appendChild(wave);
    setTimeout(() => wave.remove(), 1400);
  }

  function buildCompactRivalStrip(rivalCopy, isDefeat) {
    const strip = document.createElement('div');
    strip.className = `victory-rival-strip${isDefeat ? ' victory-rival-strip--defeat victory-stagger-3' : ' victory-rival-strip--win victory-stagger-3'}`;
    strip.innerHTML = `
      <div class="victory-rival-strip__avatar" aria-hidden="true"></div>
      <div class="victory-rival-strip__copy">
        <strong>${rivalCopy.speakerLabel}</strong>
        <p>"${rivalCopy.quote}"</p>
      </div>`;
    const avatar = strip.querySelector('.victory-rival-strip__avatar');
    window.Big2GoAICharacters?.renderAvatar(avatar, rivalCopy.character, {
      className: 'character-avatar',
      imgClassName: 'character-avatar-img'
    });
    return strip;
  }

  function buildVictorySummary({ isWin, coinPrize, brainBonus, sparks, isLiveRoom }) {
    const wrap = document.createElement('div');
    wrap.className = `victory-summary victory-stagger-4${isWin ? ' victory-summary--win' : ' victory-summary--defeat'}`;
    const brainAmount = !isLiveRoom ? Math.max(0, Number(brainBonus?.amount) || 0) : 0;
    const bonusVars = {
      amount: brainAmount,
      full: BRAIN_BONUS_ZERO_HINTS,
      partial: BRAIN_BONUS_ONE_HINT_LEFT,
      limit: HINT_LIMIT
    };

    if (isWin) {
      const total = coinPrize + brainAmount;
      wrap.innerHTML = `
        <div class="victory-summary__total">${!isLiveRoom && total > 0 ? `${coinIcon()} +${total}` : `✨ ${sparks}`}</div>
        ${!isLiveRoom && total > 0 ? `
        <div class="victory-summary__chips">
          ${coinPrize > 0 ? `<span class="victory-chip">${coinIcon()} +${coinPrize}</span>` : ''}
          ${brainAmount > 0 ? `<span class="victory-chip victory-chip--brain">🧠 +${brainAmount}</span>` : ''}
          <span class="victory-chip">✨ ${sparks}</span>
        </div>` : `<div class="victory-summary__chips"><span class="victory-chip">✨ ${sparks}</span></div>`}
        ${brainAmount > 0 ? `<p class="victory-summary__note">${t(brainBonus.messageKey || 'brainBonus.full', bonusVars)}</p>` : ''}`;
      return wrap;
    }

    const chips = [`<span class="victory-chip">✨ ${sparks}</span>`];
    if (!isLiveRoom) {
      chips.unshift(`<span class="victory-chip">${coinIcon()} -${ENTRY_FEE_COINS}</span>`);
      if (brainAmount > 0) chips.splice(1, 0, `<span class="victory-chip victory-chip--brain">🧠 +${brainAmount}</span>`);
    }
    wrap.innerHTML = `
      <div class="victory-summary__chips">${chips.join('')}</div>
      ${brainAmount > 0
        ? `<p class="victory-summary__note">${t(brainBonus.messageKey || 'brainBonus.full', bonusVars)}</p>`
        : (!isLiveRoom ? `<p class="victory-summary__note victory-summary__note--teaser">${t('brainBonus.teaser', bonusVars)}</p>` : '')}`;
    return wrap;
  }

  function buildDefeatRivalHero(rivalCopy, defeatTheme) {
    const hero = document.createElement('div');
    hero.className = 'victory-defeat-hero victory-stagger-3';

    const rings = document.createElement('div');
    rings.className = 'victory-hero-rings';
    rings.setAttribute('aria-hidden', 'true');
    rings.innerHTML = '<span></span><span></span><span></span>';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'victory-hero-avatar';
    window.Big2GoAICharacters?.renderAvatar(avatarWrap, rivalCopy.character, {
      className: 'character-avatar',
      imgClassName: 'character-avatar-img'
    });

    if (defeatTheme?.emoji) {
      const crown = document.createElement('span');
      crown.className = 'victory-hero-crown';
      crown.textContent = defeatTheme.emoji;
      crown.setAttribute('aria-hidden', 'true');
      avatarWrap.appendChild(crown);
    }

    hero.appendChild(rings);
    hero.appendChild(avatarWrap);

    const bubble = document.createElement('div');
    bubble.className = 'victory-rival-bubble';

    const rivalSpeaker = document.createElement('strong');
    rivalSpeaker.className = 'victory-rival-speaker';
    rivalSpeaker.textContent = rivalCopy.speakerLabel;

    const rivalQuote = document.createElement('p');
    rivalQuote.className = 'victory-rival-quote';
    rivalQuote.textContent = `"${rivalCopy.quote}"`;

    bubble.appendChild(rivalSpeaker);
    bubble.appendChild(rivalQuote);
    hero.appendChild(bubble);
    return hero;
  }

  function showVictoryCelebration(winner, coinPrize = state.coins.prizePool || 0, levelUp = null, brainBonusMeta = null) {
    const existing = document.querySelector('#victory-overlay');
    if (existing) existing.remove();
    const brainBonus = brainBonusMeta || buildBrainBonusMeta();
    const isLiveRoom = Boolean(state.liveRoom?.code && state.liveRoom?.playerId);
    const isRoomHost = Boolean(isLiveRoom && state.liveRoom.hostId === state.liveRoom.playerId);
    const rivalCopy = !isLiveRoom ? window.Big2GoAICharacters?.getRivalVictoryCopy?.(winner, state) : null;
    const isDefeat = Boolean(rivalCopy && !winner.isHuman);
    const isWin = Boolean(winner.isHuman);
    const defeatTheme = isDefeat ? getDefeatRivalTheme(rivalCopy?.character?.id) : null;

    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.className = `victory-overlay${isDefeat ? ' victory-overlay--defeat is-revealing' : ''}${isWin ? ' victory-overlay--win is-revealing' : ''}`;
    if (isDefeat && rivalCopy?.character?.id) overlay.dataset.rival = rivalCopy.character.id;
    if (defeatTheme) {
      overlay.style.setProperty('--defeat-accent', defeatTheme.accent);
      overlay.style.setProperty('--defeat-secondary', defeatTheme.secondary);
      overlay.style.setProperty('--defeat-tertiary', defeatTheme.tertiary || defeatTheme.secondary);
      overlay.style.setProperty('--neon-chase-speed', `${defeatTheme.chase}s`);
    }

    const bg = document.createElement('div');
    bg.className = 'victory-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = isDefeat
      ? `<div class="victory-bg-vignette"></div>
         <div class="victory-bg-glow"></div>
         <div class="victory-bg-rays"></div>`
      : '<div class="victory-bg-glow"></div><div class="victory-bg-rays"></div>';

    const fxLayer = document.createElement('div');
    fxLayer.className = 'victory-fx-layer';
    fxLayer.setAttribute('aria-hidden', 'true');
    const rivalId = rivalCopy?.character?.id || '';
    const fxRoll = createVictoryFxRoll(rivalId);
    applyVictoryFxTheme(overlay, fxRoll, { isWin, theme: defeatTheme });
    spawnProceduralFx(fxLayer, fxRoll, { isWin, theme: defeatTheme });

    const stage = document.createElement('div');
    stage.className = 'victory-stage';

    const neonFrame = document.createElement('div');
    neonFrame.className = 'victory-neon-frame';

    const neonChase = document.createElement('div');
    neonChase.className = 'victory-neon-chase';
    neonChase.setAttribute('aria-hidden', 'true');
    if (isDefeat && defeatTheme) buildVictoryNeonChase(neonChase, defeatTheme, 24 + (fxRoll.seed % 14));
    else if (isWin) buildVictoryNeonChase(neonChase, { accent: '#ffd24a', secondary: '#ff8a00', tertiary: '#ff2d95', chase: 1.8 + (fxRoll.seed % 10) / 10 }, 18 + (fxRoll.seed % 12));

    const neonGlow = document.createElement('div');
    neonGlow.className = 'victory-neon-frame__glow';
    neonGlow.setAttribute('aria-hidden', 'true');

    const card = document.createElement('div');
    card.className = `victory-card victory-card--compact${isDefeat ? ' victory-card--defeat' : ''}${isWin ? ' victory-card--win' : ''}`;

    if (isDefeat) {
      const shimmer = document.createElement('div');
      shimmer.className = 'victory-card-shimmer';
      shimmer.setAttribute('aria-hidden', 'true');
      card.appendChild(shimmer);
    }

    const badge = document.createElement('div');
    badge.className = `victory-badge${isDefeat ? ' victory-badge--defeat victory-stagger-1' : ''}${isWin ? ' victory-badge--win' : ''}`;
    badge.textContent = rivalCopy
      ? (winner.isHuman ? t('victory.badgeWin') : t('victory.badgeDefeat'))
      : (winner.isHuman ? 'Big2Go Champion' : 'Big2Go Match Over');

    const title = document.createElement('h2');
    title.className = `victory-title${isDefeat ? ' victory-stagger-2' : ''}`;
    title.textContent = rivalCopy
      ? rivalCopy.title
      : (winner.isHuman ? '🎉 YOU WIN!' : `${winner.name} wins`);

    const message = document.createElement('p');
    message.className = 'victory-message';
    if (rivalCopy) {
      message.hidden = true;
    } else {
      message.textContent = winner.isHuman
        ? 'You emptied your hand first. The lanterns burst and the crowd cheers your name.'
        : `${winner.name} emptied their hand first. Tap New Game to try again.`;
    }

    const summary = buildVictorySummary({
      isWin,
      coinPrize,
      brainBonus,
      sparks: state.sparks,
      isLiveRoom
    });

    const actions = document.createElement('div');
    actions.className = `victory-actions victory-actions--compact${isDefeat ? ' victory-actions--defeat victory-stagger-5' : ' victory-stagger-5'}`;

    const newButton = document.createElement('button');
    newButton.className = `primary${isDefeat ? ' victory-rematch-btn' : ''}`;
    newButton.innerHTML = isDefeat && !isLiveRoom
      ? `<span class="victory-rematch-btn__shine" aria-hidden="true"></span><span class="victory-rematch-btn__label">${t('defeat.rematchNow')}</span>`
      : '';
    if (!isDefeat || isLiveRoom) {
      newButton.textContent = isLiveRoom
        ? (isRoomHost ? 'Start Room Rematch' : 'Waiting for Host')
        : (rivalCopy?.rematchLabel || 'New Game');
    }
    newButton.disabled = Boolean(isLiveRoom && !isRoomHost);
    newButton.addEventListener('click', async () => {
      if (isLiveRoom) {
        newButton.disabled = true;
        newButton.textContent = 'Starting…';
        const sent = await sendLiveRoomMessage({ type: 'room:start' });
        if (sent) overlay.remove();
        return;
      }
      overlay.remove();
      newGame();
    });

    const shareButton = document.createElement('button');
    shareButton.className = 'secondary';
    shareButton.textContent = winner.isHuman ? t('victory.shareWin') : t('defeat.backMenu');
    shareButton.addEventListener('click', () => {
      if (winner.isHuman) {
        shareGame();
        return;
      }
      goBackToHomeFromVictory();
    });

    const endButton = document.createElement('button');
    endButton.type = 'button';
    endButton.className = 'secondary';
    endButton.textContent = t('defeat.backHome');
    endButton.addEventListener('click', () => goBackToHomeFromVictory());

    const exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.className = 'secondary';
    exitButton.textContent = t('defeat.exitGame');
    exitButton.addEventListener('click', () => showGameResultStoryFromVictory());

    actions.appendChild(newButton);
    actions.appendChild(shareButton);
    actions.appendChild(endButton);
    actions.appendChild(exitButton);

    card.appendChild(badge);
    card.appendChild(title);
    if (!rivalCopy) card.appendChild(message);
    if (rivalCopy) card.appendChild(buildCompactRivalStrip(rivalCopy, isDefeat));
    card.appendChild(summary);
    card.appendChild(actions);

    neonFrame.appendChild(neonChase);
    neonFrame.appendChild(neonGlow);
    neonFrame.appendChild(card);
    stage.appendChild(neonFrame);
    overlay.appendChild(bg);
    overlay.appendChild(fxLayer);
    overlay.appendChild(stage);
    document.body.appendChild(overlay);

    if (isDefeat) {
      playUiSound('defeat');
      requestAnimationFrame(() => spawnDefeatShockwave(fxLayer));
    } else if (winner?.isHuman && !state.liveRoom?.code) playVictoryCelebrationMusic();
  }

  function announceVictory(winner) {
    state.gameOver = true;
    state.busy = false;
    cancelAiTimer();
    window.Big2GoAIReactions?.clearHumanIdleTimer(true);
    clearSelection();
    clearSave();
    const coinPrize = state.liveRoom ? (state.coins.prizePool || 0) : paySinglePlayerPrize(winner);
    const brainBonus = awardBrainBonusCoins();
    recordSessionMatchResult(winner, coinPrize, brainBonus.amount);
    const levelUp = recordProfileWin(winner);
    state.lastMatchStory = captureMatchStory(winner, coinPrize, brainBonus);
    if (!state.liveRoom?.code) saveCoinBalance();
    if (!(winner.isHuman && !state.liveRoom?.code)) {
      playUiSound(winner.isHuman ? 'win' : 'pass');
    }
    window.Big2GoAIReactions?.onVictory(winner, state);
    if (levelUp) {
      state.pendingVictoryReveal = { winner, coinPrize, brainBonus };
      showLevelUpScreen(levelUp);
    } else {
      renderConfetti(winner.isHuman ? 56 : 42);
      showVictoryCelebration(winner, coinPrize, null, brainBonus);
    }
    render();
  }

  function resetHelpDialogChrome() {
    state.hintPendingAction = null;
    els.helpDismiss?.classList.add('hidden');
    els.helpMenu?.classList.remove('help-dialog-actions--hint');
    if (els.helpConfirm) {
      els.helpConfirm.textContent = t('help.gotIt');
      els.helpConfirm.dataset.i18n = 'help.gotIt';
    }
  }

  function configureHintDialog(action) {
    state.hintPendingAction = action;
    els.helpDismiss?.classList.remove('hidden');
    els.helpMenu?.classList.add('help-dialog-actions--hint');
    if (els.helpConfirm) {
      els.helpConfirm.textContent = action === 'pass' ? t('hint.passConfirm') : t('hint.playConfirm');
      els.helpConfirm.dataset.i18n = action === 'pass' ? 'hint.passConfirm' : 'hint.playConfirm';
    }
  }

  function executeHintAction(action) {
    if (!action || !canHumanAct()) return;
    if (action === 'pass') {
      humanPass();
      return;
    }
    if (action === 'play') {
      humanPlay();
    }
  }

  function showHelp(title, text, options = {}) {
    resetHelpDialogChrome();
    els.helpTitle.textContent = title;
    const html = String(text || '');
    els.helpText.innerHTML = /<\/?[a-z][\s\S]*>/i.test(html) ? html : `<p>${html}</p>`;
    els.helpText.className = options.variant === 'hint'
      ? 'help-copy oracle-hint-copy'
      : options.variant === 'settings'
        ? 'help-copy settings-copy'
        : 'help-copy';
    els.helpDialog.classList.remove('help-dialog--hint', 'help-dialog--settings');
    if (options.variant === 'hint') els.helpDialog.classList.add('help-dialog--hint');
    if (options.variant === 'settings') els.helpDialog.classList.add('help-dialog--settings');
    if (options.variant === 'hint' && options.hintAction) configureHintDialog(options.hintAction);
    els.helpDialog.showModal();
  }

  const playDemo = {
    sceneIndex: 0,
    playing: false,
    timer: null,
    progressTimer: null,
    sceneStartedAt: 0,
    elapsedBeforeScene: 0,
    totalDuration: 0
  };

  function buildDemoCard(rank, suitKey, extraClass = '') {
    const suit = SUITS.find(entry => entry.key === suitKey) || SUITS[0];
    return `<div class="demo-card demo-card--${suit.color}${extraClass ? ` ${extraClass}` : ''}"><strong>${rank}</strong><span>${suit.symbol}</span></div>`;
  }

  function getPlayDemoScenes() {
    if (window.Big2GoPlayDemo?.buildPlayDemoScenes) {
      return window.Big2GoPlayDemo.buildPlayDemoScenes(buildDemoCard);
    }
    return [];
  }

  function formatDemoTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function renderPlayDemoSteps(scenes) {
    if (!els.playDemoSteps) return;
    els.playDemoSteps.innerHTML = scenes.map((scene, index) => `
      <button type="button" class="play-demo-step${index === playDemo.sceneIndex ? ' is-active' : ''}" data-demo-step="${index}" aria-label="${scene.title}" aria-selected="${index === playDemo.sceneIndex ? 'true' : 'false'}"></button>
    `).join('');
    els.playDemoSteps.querySelectorAll('[data-demo-step]').forEach(button => {
      button.addEventListener('click', () => {
        jumpPlayDemoScene(Number(button.dataset.demoStep) || 0);
      });
    });
  }

  function renderPlayDemoScene(index) {
    const scenes = getPlayDemoScenes();
    const scene = scenes[index];
    if (!scene || !els.playDemoScreen) return;
    playDemo.sceneIndex = index;
    playDemo.sceneStartedAt = Date.now();
    els.playDemoScreen.innerHTML = scene.html;
    renderPlayDemoSteps(scenes);
    updatePlayDemoToggle();
  }

  function updatePlayDemoProgress() {
    const scenes = getPlayDemoScenes();
    const scene = scenes[playDemo.sceneIndex];
    if (!scene) return;
    const sceneElapsed = playDemo.playing ? Math.min(scene.duration, Date.now() - playDemo.sceneStartedAt) : 0;
    const totalElapsed = playDemo.elapsedBeforeScene + sceneElapsed;
    if (els.playDemoBarFill) els.playDemoBarFill.style.width = `${Math.min(100, (totalElapsed / playDemo.totalDuration) * 100)}%`;
    if (els.playDemoTime) els.playDemoTime.textContent = formatDemoTime(totalElapsed);
  }

  function updatePlayDemoToggle() {
    if (!els.playDemoToggle) return;
    const playing = playDemo.playing;
    els.playDemoToggle.textContent = playing ? '⏸' : '▶';
    els.playDemoToggle.setAttribute('aria-label', playing ? t('demo.pause') : t('demo.play'));
    els.playDemoRecDot?.classList.toggle('is-paused', !playing);
  }

  function stopPlayDemo() {
    playDemo.playing = false;
    if (playDemo.timer) {
      clearTimeout(playDemo.timer);
      playDemo.timer = null;
    }
    if (playDemo.progressTimer) {
      clearInterval(playDemo.progressTimer);
      playDemo.progressTimer = null;
    }
    updatePlayDemoToggle();
  }

  function schedulePlayDemoAdvance() {
    const scenes = getPlayDemoScenes();
    const scene = scenes[playDemo.sceneIndex];
    if (!scene) return;
    if (playDemo.timer) clearTimeout(playDemo.timer);
    playDemo.timer = setTimeout(() => {
      const nextIndex = (playDemo.sceneIndex + 1) % scenes.length;
      if (nextIndex === 0) playDemo.elapsedBeforeScene = 0;
      else playDemo.elapsedBeforeScene += scene.duration;
      renderPlayDemoScene(nextIndex);
      if (playDemo.playing) schedulePlayDemoAdvance();
    }, scene.duration);
  }

  function startPlayDemoPlayback() {
    const scenes = getPlayDemoScenes();
    playDemo.totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    playDemo.playing = true;
    playDemo.sceneStartedAt = Date.now();
    updatePlayDemoToggle();
    if (playDemo.progressTimer) clearInterval(playDemo.progressTimer);
    playDemo.progressTimer = setInterval(updatePlayDemoProgress, 120);
    schedulePlayDemoAdvance();
    updatePlayDemoProgress();
  }

  function pausePlayDemoPlayback() {
    const scenes = getPlayDemoScenes();
    const scene = scenes[playDemo.sceneIndex];
    if (scene) {
      playDemo.elapsedBeforeScene += Math.min(scene.duration, Date.now() - playDemo.sceneStartedAt);
    }
    stopPlayDemo();
    updatePlayDemoProgress();
  }

  function jumpPlayDemoScene(index) {
    const scenes = getPlayDemoScenes();
    const safeIndex = Math.max(0, Math.min(scenes.length - 1, index));
    playDemo.elapsedBeforeScene = scenes.slice(0, safeIndex).reduce((sum, scene) => sum + scene.duration, 0);
    renderPlayDemoScene(safeIndex);
    if (playDemo.playing) schedulePlayDemoAdvance();
    updatePlayDemoProgress();
  }

  function resetPlayDemo() {
    stopPlayDemo();
    playDemo.sceneIndex = 0;
    playDemo.elapsedBeforeScene = 0;
    renderPlayDemoScene(0);
    if (els.playDemoBarFill) els.playDemoBarFill.style.width = '0%';
    if (els.playDemoTime) els.playDemoTime.textContent = '0:00';
  }

  function bindPlayDemoEvents() {
    if (!els.playDemoDialog || els.playDemoDialog.dataset.bound === 'true') return;
    els.playDemoDialog.dataset.bound = 'true';
    els.playDemoToggle?.addEventListener('click', () => {
      if (playDemo.playing) pausePlayDemoPlayback();
      else startPlayDemoPlayback();
    });
    els.playDemoRulesButton?.addEventListener('click', () => {
      els.playDemoDialog.close();
      showHelp(t('help.title'), getRulesHtml());
    });
    els.playDemoStartButton?.addEventListener('click', () => {
      els.playDemoDialog.close();
      els.start?.focus();
      els.start?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    els.playDemoDialog.addEventListener('close', stopPlayDemo);
  }

  function showPlayDemo() {
    if (!els.playDemoDialog) {
      showHelp(t('help.title'), getRulesHtml());
      return;
    }
    bindPlayDemoEvents();
    resetPlayDemo();
    window.Big2GoI18n?.apply(els.playDemoDialog);
    els.playDemoDialog.showModal();
    startPlayDemoPlayback();
    playUiSound('click');
  }

  function showOracle(title, message, options = {}) {
    showHelp(title, message, options);
  }

  function showSettingsPanel() {
    ensureLandingMusicPlaying();
    showHelp(t('settings.title'), `
      <div class="settings-modal">
        <section class="settings-audio-block">
          <div class="settings-section-head">
            <span class="settings-section-icon" aria-hidden="true">🔊</span>
            <strong>${t('settings.audio')}</strong>
          </div>
          <div class="settings-slider-row">
            <label>${t('settings.soundVolume')} <strong id="sound-volume-label">${Math.round(state.soundVolume * 100)}%</strong></label>
            <input id="sound-volume-range" type="range" min="0" max="100" value="${Math.round(state.soundVolume * 100)}" />
          </div>
          <div class="settings-slider-row">
            <label>${t('settings.voiceVolume')} <strong id="voice-volume-label">${Math.round(state.voiceVolume * 100)}%</strong></label>
            <input id="voice-volume-range" type="range" min="0" max="100" value="${Math.round(state.voiceVolume * 100)}" />
          </div>
          <p class="settings-note">${t('settings.note')}</p>
        </section>
        <section class="settings-language-block">
          <div class="settings-section-head">
            <span class="settings-section-icon" aria-hidden="true">🌐</span>
            <strong>${t('settings.language')}</strong>
          </div>
          <div class="language-options settings-language-list" id="settings-language-options">
            ${window.Big2GoI18n?.buildLanguageOptionsMarkup() || ''}
          </div>
        </section>
      </div>`, { variant: 'settings' });
    setTimeout(() => {
      const soundRange = document.querySelector('#sound-volume-range');
      const voiceRange = document.querySelector('#voice-volume-range');
      soundRange?.addEventListener('input', () => {
        state.soundVolume = Number(soundRange.value) / 100;
        document.querySelector('#sound-volume-label').textContent = `${soundRange.value}%`;
        saveSoundSettings();
        unlockAudioFromGesture();
        ensureLandingMusicPlaying();
      });
      voiceRange?.addEventListener('input', () => { state.voiceVolume = Number(voiceRange.value) / 100; document.querySelector('#voice-volume-label').textContent = `${voiceRange.value}%`; saveSoundSettings(); });
      window.Big2GoI18n?.bindLanguageButtons(document.querySelector('#settings-language-options'));
    }, 0);
  }

  function createPlayers(count, aiCast = null) {
    const cast = aiCast || window.Big2GoAICharacters?.pickRandom(Math.max(0, count - 1)) || [];
    state.players = [];
    for (let i = 0; i < count; i += 1) {
      if (i === 0) {
        state.players.push({
          name: getResolvedPlayerName(),
          isHuman: true,
          finished: false,
          coins: state.coins.balance,
          hand: []
        });
        continue;
      }
      const character = cast[i - 1];
      state.players.push(character ? buildAiPlayer(character) : {
        name: `AI ${i}`,
        isHuman: false,
        finished: false,
        coins: STARTING_COINS,
        hand: []
      });
    }
  }

  function newGame() {
    unlockAudioFromGesture();
    window.Big2GoAIDialogue?.clearBags?.();
    syncPlayerSetupFromLanding();
    const count = Number(els.playerCount.value) || 4;
    disableVoiceChat();
    state.liveRoom = null;
    stopRoomPolling();
    cancelAiTimer();
    stopVictoryMusic();
    document.querySelector('#victory-overlay')?.remove();
    const aiCast = assembleSoloAiCast(count);
    createPlayers(count, aiCast);
    if (!paySinglePlayerEntry(count)) return;
    collectAiEntryFees();
    const hands = dealCards(count);
    state.players.forEach((player, index) => {
      player.hand = hands[index];
      player.finished = false;
      if (player.isHuman) player.coins = state.coins.balance;
    });
    (state.aiJoinLogs || []).forEach(message => logState(message));
    state.aiJoinLogs = [];
    state.humanIndex = 0;
    state.startingPlayer = findStartingPlayer();
    state.currentPlayer = state.startingPlayer;
    state.trick = { play: null, leader: state.startingPlayer, passes: 0 };
    state.firstTrick = true;
    state.selected = new Set();
    state.logs = [];
    state.round = 1;
    state.sparks = 0;
    state.heat = 0;
    state.sound = true;
    state.gameOver = false;
    state.busy = false;
    state.dealAnimationShown = false;
    state.lastShuffleKey = `solo:${state.round}:${Date.now()}`;
    state.lastCardNotified = new Set();
    state.lastHandCounts = {};
    state.liveRoomCardSyncKey = null;
    state.lastCardFlashIndex = null;
    state.hintsUsed = 0;
    seedLastCardNotifiedFromHands();
    els.sound.textContent = '🔊';
    showGameScreen();
    updateHeat(10, 'The opening player can lead any valid Big Two hand.');
    logState(g('log.tableBegins', { name: state.players[state.startingPlayer].name }));
    window.Big2GoAIReactions?.resetAIReactions(state.round);
    render();
    saveGame();
    playShuffleSound();
    playUiSound('start');
    scheduleAiTurn();
  }

  function nextActivePlayer(index) {
    return (index + 1) % state.players.length;
  }

  function cardsLeft(player) {
    return player.hand.length;
  }

  function playerLastCardKey(player, index) {
    return player?.id || String(index);
  }

  function seedLastCardNotifiedFromHands() {
    state.lastCardNotified = new Set();
    state.players.forEach((player, index) => {
      if (!player.finished && player.hand.length === 1) {
        state.lastCardNotified.add(playerLastCardKey(player, index));
      }
    });
  }

  function queueLastCardFlash(playerIndex) {
    if (!Number.isFinite(playerIndex) || playerIndex < 0) return;
    state.lastCardFlashIndex = playerIndex;
  }

  function applyPendingLastCardFlash() {
    const playerIndex = state.lastCardFlashIndex;
    if (playerIndex == null) return;
    state.lastCardFlashIndex = null;
    const row = document.querySelector(`.opponent-row[data-player-index="${playerIndex}"]`);
    if (row) {
      row.classList.add('last-card-flash');
      window.setTimeout(() => row.classList.remove('last-card-flash'), 3200);
      return;
    }
    const player = state.players[playerIndex];
    if (player?.isHuman) {
      const handCard = document.querySelector('.hand-card');
      if (!handCard) return;
      handCard.classList.add('last-card-flash');
      window.setTimeout(() => handCard.classList.remove('last-card-flash'), 3200);
    }
  }

  function mountLastCardCallout(row) {
    if (!row) return;
    const callout = document.createElement('div');
    callout.className = 'last-card-callout';
    callout.setAttribute('aria-label', t('game.lastCard'));
    callout.textContent = t('game.lastCard');
    row.appendChild(callout);
  }

  const LAST_CARD_DOORBELLS = {
    'player-bruno': [
      { noise: true, d: 0.022, w: 0, g: 0.09, ff: 3000 },
      { f: 659.25, d: 0.24, type: 'sine', g: 0.17, w: 0.02 },
      { f: 523.25, d: 0.3, type: 'sine', g: 0.16, w: 0.3 }
    ],
    'player-luna': [
      { noise: true, d: 0.02, w: 0, g: 0.08, ff: 3400 },
      { f: 880, d: 0.13, type: 'triangle', g: 0.15, w: 0.02 },
      { f: 1046.5, d: 0.13, type: 'triangle', g: 0.15, w: 0.16 },
      { f: 1318.51, d: 0.2, type: 'sine', g: 0.16, w: 0.32 }
    ],
    bruno: [
      { noise: true, d: 0.03, w: 0, g: 0.07, ff: 500 },
      { f: 196, d: 0.38, type: 'sine', g: 0.18, w: 0.03 },
      { f: 146.83, d: 0.42, type: 'triangle', g: 0.15, w: 0.42 }
    ],
    luna: [
      { noise: true, d: 0.018, w: 0, g: 0.08, ff: 3600 },
      { f: 1174.66, d: 0.09, type: 'sine', g: 0.15, w: 0.02 },
      { f: 1174.66, d: 0.09, type: 'sine', g: 0.14, w: 0.14 },
      { f: 1046.5, d: 0.16, type: 'triangle', g: 0.15, w: 0.26 }
    ],
    kiro: [
      { noise: true, d: 0.02, w: 0, g: 0.08, ff: 3100 },
      { f: 392, d: 0.11, type: 'sine', g: 0.14, w: 0.02 },
      { f: 493.88, d: 0.11, type: 'sine', g: 0.14, w: 0.13 },
      { f: 587.33, d: 0.11, type: 'sine', g: 0.14, w: 0.24 },
      { f: 493.88, d: 0.18, type: 'triangle', g: 0.13, w: 0.38 }
    ],
    pico: [
      { noise: true, d: 0.018, w: 0, g: 0.08, ff: 4000 },
      { f: 1567.98, d: 0.06, type: 'sine', g: 0.14, w: 0.02 },
      { f: 1760, d: 0.06, type: 'sine', g: 0.14, w: 0.1 },
      { f: 1975.53, d: 0.06, type: 'sine', g: 0.14, w: 0.18 },
      { f: 2093, d: 0.12, type: 'triangle', g: 0.15, w: 0.28 }
    ],
    bao: [
      { noise: true, d: 0.02, w: 0, g: 0.08, ff: 2800 },
      { sweep: true, f0: 440, f1: 880, d: 0.09, type: 'sine', g: 0.15, w: 0.02 },
      { sweep: true, f0: 880, f1: 523.25, d: 0.11, type: 'triangle', g: 0.14, w: 0.14 },
      { f: 659.25, d: 0.18, type: 'sine', g: 0.15, w: 0.28 }
    ],
    tora: [
      { noise: true, d: 0.025, w: 0, g: 0.07, ff: 900 },
      { f: 329.63, d: 0.28, type: 'sine', g: 0.16, w: 0.03 },
      { f: 293.66, d: 0.34, type: 'triangle', g: 0.15, w: 0.36 }
    ],
    default: [
      { noise: true, d: 0.02, w: 0, g: 0.08, ff: 3000 },
      { f: 523.25, d: 0.16, type: 'sine', g: 0.15, w: 0.02 },
      { f: 392, d: 0.22, type: 'sine', g: 0.14, w: 0.2 }
    ]
  };

  function resolveLastCardVoiceProfile(playerIndex) {
    const player = Number.isFinite(playerIndex) ? state.players[playerIndex] : null;
    const gender = getPlayerProfileMeta().gender;
    return window.Big2GoAICharacters?.getLastCardVoiceProfile?.(player, { gender }) || {
      id: 'default',
      doorbell: 'default',
      label: 'Ding-dong!'
    };
  }

  function flushPendingLastCardSound() {
    const doorbellId = audio.pendingLastCardDoorbell;
    if (!doorbellId || !state.sound) return;
    if (!isAudioContextRunning()) return;
    audio.pendingLastCardDoorbell = null;
    deliverLastCardDoorbell(doorbellId);
  }

  function playLastCardDoorbellSteps(doorbellId, output = null) {
    const bus = output || getLastCardAudioMaster() || audio.master;
    if (!bus) return;
    const steps = LAST_CARD_DOORBELLS[doorbellId] || LAST_CARD_DOORBELLS.default;
    const boosted = steps.map(step => ({ ...step, g: (step.g || 0.03) * LAST_CARD_GAIN_BOOST }));
    playSoundSteps(boosted, bus, LAST_CARD_SOUND_DELAY);
  }

  function deliverLastCardDoorbell(doorbellId) {
    const ctx = getAudioContext();
    const bus = getLastCardAudioMaster() || audio.master;
    if (!ctx || !bus || ctx.state !== 'running') return false;
    playNoise(0.028, 0.1, 0, 3200, bus);
    playLastCardDoorbellSteps(doorbellId, bus);
    return true;
  }

  function playLastCardVoice(playerIndex) {
    if (!state.sound) return;
    const profile = resolveLastCardVoiceProfile(playerIndex);
    const doorbellId = profile.doorbell || 'default';

    audio.pendingLastCardDoorbell = doorbellId;

    const tryPlay = () => {
      unlockAudioFromGesture();
      const ctx = getAudioContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        return false;
      }
      if (ctx.state !== 'running') return false;
      if (!deliverLastCardDoorbell(doorbellId)) return false;
      audio.pendingLastCardDoorbell = null;
      return true;
    };

    if (tryPlay()) return;

    unlockAudio().then(() => tryPlay());
    [60, 140, 280, 520].forEach(delay => window.setTimeout(() => tryPlay(), delay));
    window.setTimeout(() => {
      if (!audio.pendingLastCardDoorbell) return;
      playUiSound('lastCardPing');
    }, 360);
  }

  function scheduleLastCardVoice(playerIndex) {
    window.setTimeout(() => playLastCardVoice(playerIndex), 110);
  }

  function announceLastCard(playerIndex) {
    const player = state.players[playerIndex];
    if (!player || player.finished || player.hand.length !== 1) return;
    state.lastCardNotified = state.lastCardNotified || new Set();
    const key = playerLastCardKey(player, playerIndex);
    if (state.lastCardNotified.has(key)) return;
    state.lastCardNotified.add(key);
    const profile = resolveLastCardVoiceProfile(playerIndex);
    const doorbellLabel = profile?.label || 'Ding-dong!';
    const note = player.isHuman
      ? `You are on your LAST CARD — ${doorbellLabel}`
      : `LAST CARD — ${doorbellLabel}`;
    logState(g('log.warn', { note }));
    updateHeat(12, player.isHuman ? `Last card — ${doorbellLabel}` : `Last card — ${doorbellLabel}`);
    scheduleLastCardVoice(playerIndex);
    queueLastCardFlash(playerIndex);
  }

  function syncLiveLastCardFromGame(game) {
    if (!game?.players?.length) return;
    state.lastHandCounts = state.lastHandCounts || {};
    const seedBaseline = Object.keys(state.lastHandCounts).length === 0;
    game.players.forEach((player, index) => {
      const count = index === game.playerIndex
        ? (game.hand?.length || 0)
        : (Number(player.handCount) || 0);
      const key = player.id || String(index);
      const prev = state.lastHandCounts[key];
      if (!seedBaseline && count === 1 && prev !== 1 && !player.finished) {
        announceLastCard(index);
      }
      state.lastHandCounts[key] = count;
    });
  }

  function renderLastCardBadge(container, label, extraClass = '') {
    const badge = document.createElement('span');
    badge.className = `last-card-badge${extraClass ? ` ${extraClass}` : ''}`;
    badge.textContent = label;
    badge.setAttribute('aria-label', 'One card left');
    container.appendChild(badge);
    return badge;
  }

  function selectionFeedback() {
    const cards = selectedCards();
    if (!cards.length) {
      if (state.trick.play) return g('selection.beatOrPass', { play: describePlay(state.trick.play) });
      return state.firstTrick ? g('selection.openingTurn') : g('selection.freeTurn');
    }
    const result = validateHumanPlay(cards);
    if (result.ok) return g('selection.canPlay', { play: describePlay(result.play) });
    return result.reason;
  }

  function updateStatus() {
    const human = getHumanPlayer();
    const current = state.players[state.currentPlayer];
    if (!human || !current) {
      renderCoinHud();
      return;
    }
    const requirement = state.trick.play
      ? t('game.beatPlay', { play: describePlay(state.trick.play) })
      : (state.firstTrick ? t('game.openingHand') : t('game.youLead'));
    els.playerLeftCount.textContent = String(cardsLeft(human));
    els.roundCount.textContent = String(state.round);
    els.trickCount.textContent = state.trick.play ? String(state.trick.play.count) : t('game.open');
    els.turnLabel.textContent = state.gameOver
      ? t('game.gameOver')
      : (current.isHuman ? t('game.yourTurn') : t('game.playerTurn', { name: current.name }));
    els.tableSubtitle.textContent = state.gameOver
      ? t('game.matchFinished')
      : t('game.statusLine', { requirement, round: state.round, sparks: state.sparks });
    const roomIdEl = document.querySelector('#table-room-id');
    if (roomIdEl) roomIdEl.textContent = state.liveRoom?.code ? `ROOM ${state.liveRoom.code}` : '';
    els.trickHelp.textContent = selectionFeedback();
    renderCoinHud();
  }

  function renderOpponents() {
    els.opponents.innerHTML = '';
    state.players.forEach((player, index) => {
      const isSelf = index === state.humanIndex;
      if (isSelf && !state.liveRoom?.code) return;
      const handCount = player.hand.length;
      const isLastCard = !player.finished && handCount === 1;
      const row = document.createElement('div');
      row.className = `opponent-row${isSelf ? ' self' : ''}${index === state.currentPlayer && !state.gameOver ? ' current' : ''}${player.finished ? ' finished' : ''}${player.connected === false ? ' disconnected' : ''}${isLastCard ? ' last-card' : ''}`;
      row.dataset.playerIndex = String(index);
      if (player.characterId) row.dataset.characterId = player.characterId;
      const avatar = document.createElement('div');
      avatar.className = 'opponent-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      renderOpponentAvatar(avatar, player);
      const stack = document.createElement('div');
      stack.className = 'opponent-stack';
      const nameRow = document.createElement('div');
      nameRow.className = 'opponent-name-row';
      const name = document.createElement('div');
      name.className = 'opponent-name';
      name.textContent = player.name || (isSelf ? getResolvedPlayerName() : 'Player');
      nameRow.appendChild(name);
      if (!state.liveRoom?.code) {
        const level = document.createElement('span');
        level.className = 'opponent-level';
        const playerLevel = getProfileLevelForPlayer(player);
        const playerTier = getLevelTier(playerLevel);
        level.textContent = `${playerTier.emoji}Lv${playerLevel}`;
        level.title = `${playerTier.title} · Lv ${playerLevel}`;
        nameRow.appendChild(level);
      }
      const stats = document.createElement('div');
      stats.className = 'opponent-stats';
      const coins = document.createElement('span');
      coins.className = 'opponent-coins';
      coins.innerHTML = `${coinIcon()} ${playerCoins(player, index)}`;
      const cards = document.createElement('span');
      cards.className = 'opponent-cards';
      if (isLastCard) {
        cards.hidden = true;
      } else {
        cards.textContent = player.finished ? t('game.out') : t('game.cards', { count: player.hand.length });
      }
      const online = document.createElement('span');
      online.className = 'opponent-online';
      online.setAttribute('aria-label', player.connected === false ? t('game.offline') : t('game.online'));
      stats.appendChild(coins);
      stats.appendChild(cards);
      stack.appendChild(nameRow);
      stack.appendChild(stats);
      if (isLastCard) mountLastCardCallout(row);
      row.appendChild(avatar);
      row.appendChild(stack);
      row.appendChild(online);
      els.opponents.appendChild(row);
    });
  }

  function renderTrick() {
    els.trickPlay.innerHTML = '';
    if (!state.trick.play) {
      els.trickPlay.classList.add('empty');
      els.trickPlay.textContent = state.firstTrick ? t('game.trickEmptyOpening') : t('game.trickEmptyOpen');
      els.trickMeta.textContent = '';
      return;
    }
    els.trickPlay.classList.remove('empty');
    state.trick.play.cards.forEach(card => {
      const tile = renderCardTile(card, false);
      tile.disabled = true;
      els.trickPlay.appendChild(tile);
    });
    els.trickMeta.textContent = g('log.trickMeta', {
      play: describePlay(state.trick.play),
      name: state.players[state.trick.leader].name,
      passes: state.trick.passes
    });
  }

  function renderLogs() {
    els.logList.innerHTML = '';
    const entries = state.logs.length ? state.logs : [t('game.logEmpty')];
    entries.slice(0, 6).forEach(message => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = withCoinIcon(message);
      els.logList.appendChild(entry);
    });
  }

  function applyChatPayload(chat) {
    state.chat = Array.isArray(chat) ? chat.slice(-30) : [];
    renderChat();
  }

  function renderChat() {
    if (!els.chatPanel || !els.chatMessages) return;
    const isLive = Boolean(state.liveRoom?.code);
    els.chatPanel.classList.toggle('hidden', !isLive);
    if (!isLive) {
      state.chatExpanded = false;
      els.chatPanel?.classList.remove('expanded');
      return;
    }
    els.chatPanel.classList.toggle('expanded', state.chatExpanded);
    els.chatToggle?.setAttribute('aria-expanded', state.chatExpanded ? 'true' : 'false');
    if (els.chatPreview) {
      const latest = state.chat[state.chat.length - 1];
      els.chatPreview.textContent = latest ? `${latest.name || 'Player'}: ${latest.text || ''}` : 'Tap to open';
    }
    els.chatMessages.innerHTML = '';
    const messages = state.chat.slice(-12);
    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Say hi or use a quick chat.';
      els.chatMessages.appendChild(empty);
    } else {
      messages.forEach(message => {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.dataset.mine = message.playerId === state.liveRoom?.playerId ? 'true' : 'false';
        const name = document.createElement('strong');
        name.textContent = message.playerId === state.liveRoom?.playerId ? 'You' : message.name || 'Player';
        const text = document.createElement('span');
        text.textContent = message.text || '';
        bubble.append(name, text);
        els.chatMessages.appendChild(bubble);
      });
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }
    if (els.chatCount) els.chatCount.textContent = String(state.chat.length);
  }

  function voiceStatusFor(playerId) {
    const status = state.voice.statuses.find(entry => entry.id === playerId) || {};
    const mutedByMe = state.voice.mutedPlayers.has(playerId);
    return {
      enabled: Boolean(status.enabled),
      muted: mutedByMe || status.muted !== false || !status.enabled,
      speaking: Boolean(status.speaking) && !mutedByMe && status.muted === false,
      listening: Boolean(status.enabled) && status.muted !== false,
      volume: state.voice.volumes.get(playerId) ?? 1
    };
  }

  function speakingPlayers() {
    return state.voice.statuses.filter(entry => entry.id !== state.liveRoom?.playerId && entry.speaking && entry.muted === false && !state.voice.mutedPlayers.has(entry.id));
  }

  function setVoiceVolume(playerId, value) {
    const volume = Math.max(0, Math.min(1, Number(value) || 0));
    state.voice.volumes.set(playerId, volume);
    const entry = state.voice.peers.get(playerId);
    if (entry?.audio) entry.audio.volume = volume;
    renderVoiceMixer();
  }

  function updateRemoteAudioMute() {
    state.voice.peers.forEach((entry, playerId) => {
      if (entry.audio) {
        entry.audio.muted = state.voice.speakerMuted || state.voice.mutedPlayers.has(playerId);
        const volume = state.voice.volumes.get(playerId);
        entry.audio.volume = Math.max(0, Math.min(1, volume ?? state.voiceVolume ?? 0.9));
      }
    });
  }

  function renderVoiceMixer() {
    if (!els.voiceMixer) return;
    els.voiceMixer.classList.toggle('open', state.voice.mixerOpen);
    els.voiceMixer.innerHTML = '';
    if (!state.voice.mixerOpen) return;
    const peers = state.players.filter(player => player.id && player.id !== state.liveRoom?.playerId);
    if (!peers.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Friends will appear here when they join voice.';
      els.voiceMixer.appendChild(empty);
      return;
    }
    peers.forEach(player => {
      const status = voiceStatusFor(player.id);
      const row = document.createElement('label');
      row.className = `voice-mixer-row${status.muted ? ' muted' : ''}${status.speaking ? ' speaking' : ''}`;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = status.muted ? '🔇' : '🔊';
      toggle.setAttribute('aria-label', `${status.muted ? 'Unmute' : 'Mute'} ${player.name}`);
      toggle.addEventListener('click', event => {
        event.preventDefault();
        toggleMutePlayer(player.id);
      });
      const name = document.createElement('span');
      name.textContent = `${player.name} ${Math.round((state.voice.volumes.get(player.id) ?? 1) * 100)}%`;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '100';
      range.value = String(Math.round((state.voice.volumes.get(player.id) ?? 1) * 100));
      range.addEventListener('input', () => setVoiceVolume(player.id, Number(range.value) / 100));
      row.append(toggle, name, range);
      els.voiceMixer.appendChild(row);
    });
  }

  function updateSpeakingBanner() {
    if (!els.voiceSpeakingBanner) return;
    const active = speakingPlayers();
    els.voiceSpeakingBanner.classList.toggle('show', active.length > 0);
    els.voiceSpeakingBanner.textContent = active.length ? `🔥 ${active.map(player => player.name).join(', ')} ${active.length === 1 ? 'is' : 'are'} speaking...` : '';
  }

  function updateVoicePanel() {
    const isLive = Boolean(state.liveRoom?.code);
    document.body.classList.toggle('live-room-active', isLive);
    els.voicePanel?.classList.toggle('hidden', !isLive);
    if (!isLive) return;
    els.voiceMic?.classList.toggle('muted', state.voice.micMuted || !state.voice.enabled);
    els.voiceMic?.classList.remove('speaking');
    els.voiceMic?.setAttribute('aria-pressed', state.voice.enabled && !state.voice.micMuted ? 'true' : 'false');
    if (els.voiceMic) els.voiceMic.setAttribute('aria-label', state.voice.micMuted ? 'Turn voice on' : 'Turn voice off');
    els.voiceSpeaker?.classList.toggle('muted', state.voice.speakerMuted);
    els.voiceSpeaker?.setAttribute('aria-pressed', state.voice.speakerMuted ? 'false' : 'true');
    if (els.voiceSpeaker) els.voiceSpeaker.textContent = state.voice.speakerMuted ? '🔇' : '🔊';
    state.voice.pushToTalk = false;
    state.voice.mixerOpen = false;
    updateRemoteAudioMute();
  }

  function sendVoiceState({ force = false } = {}) {
    if (!state.liveRoom?.code) return;
    const now = Date.now();
    if (!force && now - state.voice.lastStateSentAt < 450) return;
    state.voice.lastStateSentAt = now;
    const payload = { type: 'voice:state', voice: { enabled: state.voice.enabled, muted: state.voice.micMuted, speaking: state.voice.speaking } };
    if (state.roomSocket?.readyState === WebSocket.OPEN) state.roomSocket.send(JSON.stringify(payload));
    else sendLiveRoomMessage(payload).catch?.(() => {});
  }

  function applyVoicePayload(voice) {
    const previous = new Map((state.voice.statuses || []).map(entry => [entry.id, Boolean(entry.enabled)]));
    state.voice.statuses = Array.isArray(voice) ? voice : [];
    state.voice.statuses.forEach(entry => {
      if (entry?.id && entry.enabled && !previous.get(entry.id)) {
        callVoicePeer(entry.id).catch(() => {});
      }
    });
    syncVoiceConnections().catch(() => {});
    updateVoicePanel();
    renderOpponents();
    renderVoiceMixer();
    resumePendingRemoteAudio();
  }

  function restoreVoiceInRoom() {
    if (!state.liveRoom?.code) return;
    updateVoicePanel();
    syncVoiceConnections().catch(() => {});
    if (state.voice.enabled) return;
    if (!state.voice.permissionAsked) {
      setTimeout(promptVoicePermission, 350);
      return;
    }
    if (shouldRestoreVoiceAfterReconnect()) {
      setTimeout(() => enableVoiceChat({ muted: false }).catch(() => {}), 450);
    }
  }

  const VOICE_ENABLED_KEY = 'big2go-voice-enabled-v1';
  let voiceIceServersPromise = null;

  async function fetchVoiceIceServers() {
    if (state.voice.iceServers?.length) return state.voice.iceServers;
    if (!voiceIceServersPromise) {
      voiceIceServersPromise = fetch('/api/voice/ice', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(response => response.json().catch(() => ({})))
        .then(payload => {
          const servers = Array.isArray(payload?.iceServers) ? payload.iceServers : [];
          state.voice.iceServers = servers.length ? servers : [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ];
          return state.voice.iceServers;
        })
        .catch(() => {
          state.voice.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ];
          return state.voice.iceServers;
        });
    }
    return voiceIceServersPromise;
  }

  function voicePeerIds() {
    const ids = new Set();
    state.voice.statuses.forEach(entry => { if (entry?.id) ids.add(entry.id); });
    state.liveRoomPlayers.forEach(player => { if (player?.id) ids.add(player.id); });
    state.players.forEach(player => { if (player?.id) ids.add(player.id); });
    const saved = getRoomSession();
    (saved?.players || saved?.room?.players || []).forEach(player => { if (player?.id) ids.add(player.id); });
    ids.delete(state.liveRoom?.playerId);
    return [...ids];
  }

  function serializeSessionDescription(description) {
    if (!description) return null;
    return { type: description.type, sdp: description.sdp };
  }

  function serializeIceCandidate(candidate) {
    if (!candidate) return null;
    return {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment
    };
  }

  async function addRemoteIceCandidate(pc, candidate) {
    if (!candidate || !pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (_) {}
  }

  function shouldInitiateVoiceCall(playerId) {
    const mine = String(state.liveRoom?.playerId || '');
    const theirs = String(playerId || '');
    return Boolean(mine && theirs && mine < theirs);
  }

  function rememberVoiceEnabled(enabled) {
    try {
      if (enabled) localStorage.setItem(VOICE_ENABLED_KEY, '1');
      else localStorage.removeItem(VOICE_ENABLED_KEY);
    } catch (_) {}
  }

  function shouldRestoreVoiceAfterReconnect() {
    try { return localStorage.getItem(VOICE_ENABLED_KEY) === '1'; } catch (_) { return false; }
  }

  async function playRemoteAudio(audioEl) {
    if (!audioEl) return;
    audioEl.setAttribute('playsinline', '');
    audioEl.setAttribute('webkit-playsinline', '');
    audioEl.autoplay = true;
    try {
      await audioEl.play();
      state.voice.pendingAudioPlay = false;
    } catch (_) {
      state.voice.pendingAudioPlay = true;
    }
  }

  function bindRemoteAudioUnlock() {
    if (state.voice.remoteUnlockBound) return;
    state.voice.remoteUnlockBound = true;
    const unlock = () => {
      unlockAudioFromGesture();
      resumePendingRemoteAudio();
    };
    ['pointerdown', 'touchstart', 'click'].forEach(type => {
      document.addEventListener(type, unlock, { passive: true, capture: true });
    });
  }

  async function resumePendingRemoteAudio() {
    await unlockAudio().catch(() => {});
    const peers = [...state.voice.peers.values()];
    await Promise.all(peers.map(entry => playRemoteAudio(entry.audio)));
    if (peers.some(entry => entry.audio && entry.audio.paused)) {
      state.voice.pendingAudioPlay = true;
    } else {
      state.voice.pendingAudioPlay = false;
    }
  }

  function attachRemoteAudioStream(entry, stream, playerId) {
    if (!entry || !stream) return;
    if (!entry.audio) {
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.dataset.voicePeer = playerId;
      entry.audio = audioEl;
      (els.remoteAudio || document.body).appendChild(audioEl);
    }
    if (entry.audio.srcObject !== stream) entry.audio.srcObject = stream;
    updateRemoteAudioMute();
    playRemoteAudio(entry.audio);
  }

  function sendVoiceSignal(targetId, signal) {
    if (!targetId || !signal || !state.liveRoom?.code || !state.liveRoom?.playerId) return;
    const payload = { type: 'voice:signal', targetId, signal };
    if (state.roomSocket?.readyState === WebSocket.OPEN) {
      state.roomSocket.send(JSON.stringify(payload));
    }
    fetch('/api/rooms/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ...payload, code: state.liveRoom.code, playerId: state.liveRoom.playerId })
    }).catch(() => {});
  }

  function processVoiceSignals(signals) {
    if (!Array.isArray(signals) || !signals.length) return;
    signals.forEach(entry => {
      if (!entry?.from || !entry?.signal) return;
      handleVoiceSignal(entry.from, entry.signal)
        .then(() => resumePendingRemoteAudio())
        .catch(() => {});
    });
  }

  function attachLocalVoiceTracks(pc) {
    const audioTransceiver = pc.getTransceivers().find(entry =>
      entry.receiver?.track?.kind === 'audio' || entry.sender?.track?.kind === 'audio'
    );
    if (state.voice.stream) {
      const track = state.voice.stream.getAudioTracks()[0];
      if (!track) return;
      if (audioTransceiver?.sender) {
        audioTransceiver.direction = 'sendrecv';
        audioTransceiver.sender.replaceTrack(track).catch(() => pc.addTrack(track, state.voice.stream));
      } else {
        pc.addTrack(track, state.voice.stream);
      }
      return;
    }
    if (!audioTransceiver) pc.addTransceiver('audio', { direction: 'recvonly' });
  }

  async function createVoicePeer(playerId) {
    if (state.voice.peers.has(playerId)) return state.voice.peers.get(playerId);
    const iceServers = await fetchVoiceIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    const entry = { pc, audio: null, pendingCandidates: [], remoteReady: false };
    state.voice.peers.set(playerId, entry);
    attachLocalVoiceTracks(pc);
    pc.onicecandidate = event => {
      if (event.candidate) sendVoiceSignal(playerId, { candidate: serializeIceCandidate(event.candidate) });
    };
    pc.ontrack = event => {
      const stream = event.streams?.[0] || (event.track ? new MediaStream([event.track]) : null);
      if (!stream) return;
      attachRemoteAudioStream(entry, stream, playerId);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        closeVoicePeer(playerId);
        if (state.voice.enabled && shouldInitiateVoiceCall(playerId)) callVoicePeer(playerId).catch(() => {});
        return;
      }
      if (['closed', 'disconnected'].includes(pc.connectionState)) closeVoicePeer(playerId);
    };
    return entry;
  }

  function closeVoicePeer(playerId) {
    const entry = state.voice.peers.get(playerId);
    if (!entry) return;
    try { entry.pc.close(); } catch (_) {}
    entry.audio?.remove();
    state.voice.peers.delete(playerId);
  }

  async function refreshVoicePeers() {
    await syncVoiceConnections();
  }

  async function renegotiateAllVoicePeers() {
    if (!state.liveRoom?.code || !state.voice.enabled || !('RTCPeerConnection' in window)) return;
    try { await ensureVoiceStream(); } catch (_) { return; }
    for (const playerId of voicePeerIds()) {
      const entry = await createVoicePeer(playerId).catch(() => null);
      if (!entry?.pc) continue;
      attachLocalVoiceTracks(entry.pc);
      const { pc } = entry;
      if (!['stable', 'have-local-offer'].includes(pc.signalingState)) continue;
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        sendVoiceSignal(playerId, { description: serializeSessionDescription(pc.localDescription) });
      } catch (_) {}
    }
  }

  async function syncVoiceConnections() {
    if (!state.liveRoom?.code || !('RTCPeerConnection' in window)) return;
    await fetchVoiceIceServers().catch(() => {});
    const peers = voicePeerIds();
    for (const id of peers) {
      if (!state.voice.peers.has(id)) await createVoicePeer(id).catch(() => {});
    }
    if (!state.voice.enabled) return;
    for (const id of peers) {
      const entry = state.voice.peers.get(id);
      if (!entry?.pc) continue;
      const connectionState = entry.pc.connectionState;
      const missingRemoteAudio = !entry.audio;
      if (!missingRemoteAudio && connectionState !== 'failed' && connectionState !== 'disconnected' && connectionState !== 'new') continue;
      if (shouldInitiateVoiceCall(id)) {
        await callVoicePeer(id).catch(() => {});
        continue;
      }
      if (missingRemoteAudio && entry.pc.signalingState === 'stable') {
        try {
          attachLocalVoiceTracks(entry.pc);
          const offer = await entry.pc.createOffer({ offerToReceiveAudio: true });
          await entry.pc.setLocalDescription(offer);
          sendVoiceSignal(id, { description: serializeSessionDescription(entry.pc.localDescription) });
        } catch (_) {}
      }
    }
  }

  async function callVoicePeer(playerId) {
    if (!state.liveRoom?.code || !('RTCPeerConnection' in window)) return;
    if (!shouldInitiateVoiceCall(playerId)) return;
    if (state.voice.enabled && !state.voice.stream) {
      try { await ensureVoiceStream(); } catch (_) { return; }
    }
    const entry = await createVoicePeer(playerId);
    const { pc } = entry;
    if (pc.signalingState !== 'stable') return;
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    sendVoiceSignal(playerId, { description: serializeSessionDescription(pc.localDescription) });
  }

  async function flushPendingCandidates(entry) {
    if (!entry?.pc || !entry.pendingCandidates?.length) return;
    const pending = entry.pendingCandidates.splice(0);
    for (const candidate of pending) await addRemoteIceCandidate(entry.pc, candidate);
  }

  async function handleVoiceSignal(from, signal) {
    if (!from || from === state.liveRoom?.playerId || !('RTCPeerConnection' in window)) return;
    const entry = await createVoicePeer(from);
    const { pc } = entry;
    if (signal.description) {
      const description = signal.description;
      if (description.type === 'offer') {
        if (pc.signalingState === 'have-local-offer') {
          if (shouldInitiateVoiceCall(from)) return;
          try { await pc.setLocalDescription({ type: 'rollback' }); } catch (_) {}
        } else if (pc.signalingState !== 'stable') {
          return;
        }
        await pc.setRemoteDescription(description);
        entry.remoteReady = true;
        await flushPendingCandidates(entry);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendVoiceSignal(from, { description: serializeSessionDescription(pc.localDescription) });
      } else if (description.type === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(description);
          entry.remoteReady = true;
          await flushPendingCandidates(entry);
        }
      } else {
        await pc.setRemoteDescription(description);
        entry.remoteReady = true;
        await flushPendingCandidates(entry);
      }
    }
    if (signal.candidate) {
      if (pc.remoteDescription) await addRemoteIceCandidate(pc, signal.candidate);
      else entry.pendingCandidates.push(signal.candidate);
    }
  }

  function startSpeakingMeter(stream) {
    if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    state.voice.analyser = { ctx, analyser, data: new Uint8Array(analyser.fftSize) };
    const tick = () => {
      if (!state.voice.analyser) return;
      const meter = state.voice.analyser;
      meter.analyser.getByteTimeDomainData(meter.data);
      let sum = 0;
      for (const value of meter.data) {
        const centered = value - 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / meter.data.length);
      const speaking = state.voice.enabled && !state.voice.micMuted && rms > 9;
      if (speaking !== state.voice.speaking) {
        state.voice.speaking = speaking;
        updateVoicePanel();
        sendVoiceState({ force: true });
      }
      state.voice.speakingTimer = requestAnimationFrame(tick);
    };
    tick();
  }

  async function ensureVoiceStream() {
    if (state.voice.stream) return state.voice.stream;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone is not available in this browser.');
    await unlockAudio();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      }
    });
    state.voice.stream = stream;
    startSpeakingMeter(stream);
    return stream;
  }

  function promptVoicePermission() {
    if (!state.liveRoom?.code || state.voice.permissionAsked || state.voice.enabled) return;
    state.voice.permissionAsked = true;
    showHelp('Big2Go needs microphone permission', '<ul><li>Allow voice chat with friends?</li><li>You can keep playing if you choose Not Now.</li><li>Voice uses echo cancellation and noise suppression for mobile play.</li></ul><div class="voice-permission-actions"><button type="button" id="voice-allow-button" class="primary">Allow</button><button type="button" id="voice-not-now-button" class="secondary">Not Now</button></div>');
    setTimeout(() => {
      document.querySelector('#voice-allow-button')?.addEventListener('click', () => {
        document.querySelector('#help-dialog')?.close?.();
        enableVoiceChat();
      });
      document.querySelector('#voice-not-now-button')?.addEventListener('click', () => {
        document.querySelector('#help-dialog')?.close?.();
        state.voice.micMuted = true;
        updateVoicePanel();
        sendVoiceState({ force: true });
      });
    }, 0);
  }

  async function enableVoiceChat({ muted = false } = {}) {
    if (!state.liveRoom?.code) return;
    try {
      await unlockAudio();
      await ensureVoiceStream();
      state.voice.enabled = true;
      state.voice.micMuted = Boolean(muted || state.voice.pushToTalk);
      state.voice.stream.getAudioTracks().forEach(track => { track.enabled = !state.voice.micMuted; });
      state.voice.peers.forEach(entry => attachLocalVoiceTracks(entry.pc));
      rememberVoiceEnabled(true);
      updateVoicePanel();
      sendVoiceState({ force: true });
      await syncVoiceConnections();
      await renegotiateAllVoicePeers();
      await resumePendingRemoteAudio();
    } catch (error) {
      showOracle('Voice unavailable', error.message || 'Allow microphone access to use room voice chat.');
      state.voice.enabled = false;
      state.voice.micMuted = true;
      rememberVoiceEnabled(false);
      updateVoicePanel();
    }
  }

  function disableVoiceChat() {
    rememberVoiceEnabled(false);
    state.voice.enabled = false;
    state.voice.micMuted = true;
    state.voice.speaking = false;
    if (state.voice.speakingTimer) cancelAnimationFrame(state.voice.speakingTimer);
    state.voice.speakingTimer = null;
    state.voice.analyser?.ctx?.close?.();
    state.voice.analyser = null;
    state.voice.stream?.getTracks().forEach(track => track.stop());
    state.voice.stream = null;
    state.voice.mixerOpen = false;
    [...state.voice.peers.keys()].forEach(closeVoicePeer);
    updateVoicePanel();
    sendVoiceState({ force: true });
  }

  async function toggleMic() {
    await unlockAudio();
    if (!state.voice.enabled) {
      await enableVoiceChat();
      await resumePendingRemoteAudio();
      return;
    }
    if (state.voice.pushToTalk && !state.voice.holdingToTalk) {
      state.voice.micMuted = true;
    } else {
      state.voice.micMuted = !state.voice.micMuted;
    }
    state.voice.stream?.getAudioTracks().forEach(track => { track.enabled = !state.voice.micMuted; });
    if (state.voice.micMuted) state.voice.speaking = false;
    updateVoicePanel();
    sendVoiceState({ force: true });
  }

  async function setPushToTalkHolding(active) {
    if (!state.voice.pushToTalk) return;
    state.voice.holdingToTalk = Boolean(active);
    if (!state.voice.enabled) await enableVoiceChat({ muted: !active });
    state.voice.micMuted = !active;
    state.voice.stream?.getAudioTracks().forEach(track => { track.enabled = active; });
    if (!active) state.voice.speaking = false;
    updateVoicePanel();
    sendVoiceState({ force: true });
  }

  function togglePushToTalk() {
    state.voice.pushToTalk = !state.voice.pushToTalk;
    state.voice.holdingToTalk = false;
    if (state.voice.enabled && state.voice.pushToTalk) {
      state.voice.micMuted = true;
      state.voice.stream?.getAudioTracks().forEach(track => { track.enabled = false; });
      state.voice.speaking = false;
      sendVoiceState({ force: true });
    }
    updateVoicePanel();
  }

  async function toggleSpeaker() {
    await unlockAudio();
    state.voice.speakerMuted = !state.voice.speakerMuted;
    updateVoicePanel();
    await resumePendingRemoteAudio();
  }

  function toggleMutePlayer(playerId) {
    if (!playerId) return;
    if (state.voice.mutedPlayers.has(playerId)) state.voice.mutedPlayers.delete(playerId);
    else state.voice.mutedPlayers.add(playerId);
    updateVoicePanel();
    renderOpponents();
  }

  function toggleVoiceMixer() {
    state.voice.mixerOpen = !state.voice.mixerOpen;
    updateVoicePanel();
  }

  function muteAllVoicePlayers() {
    voicePeerIds().forEach(id => state.voice.mutedPlayers.add(id));
    state.voice.mixerOpen = true;
    updateVoicePanel();
    renderOpponents();
  }

  async function sendRoomChat(text) {
    const message = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!message || !state.liveRoom?.code) return;
    const now = Date.now();
    if (now - state.lastChatSentAt < 900) {
      showOracle('Slow down', 'Please wait a moment before sending another chat message.');
      return;
    }
    state.lastChatSentAt = now;
    if (els.chatSend) els.chatSend.disabled = true;
    const result = await sendLiveRoomMessage({ type: 'room:chat', text: message });
    if (result?.chat) applyChatPayload(result.chat);
    if (result && els.chatInput) els.chatInput.value = '';
    if (result) setTimeout(() => fetchLiveRoomState().catch(() => {}), 120);
    if (els.chatSend) setTimeout(() => { els.chatSend.disabled = false; }, 900);
  }

  function renderCardTile(card, selectable = true) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `card-tile ${card.color}`;
    button.dataset.cardId = card.id;
    button.setAttribute('aria-label', card.label);

    const glow = document.createElement('div');
    glow.className = 'card-glow';

    const corner = document.createElement('div');
    corner.className = 'card-corner';
    const rank = document.createElement('span');
    rank.className = 'card-rank';
    rank.textContent = card.rank;
    const smallSuit = document.createElement('span');
    smallSuit.className = 'card-suit-small';
    smallSuit.textContent = card.suitSymbol;
    corner.appendChild(rank);
    corner.appendChild(smallSuit);

    const suit = document.createElement('div');
    suit.className = 'card-suit';
    suit.textContent = card.suitSymbol;

    button.appendChild(glow);
    button.appendChild(corner);
    button.appendChild(suit);

    if (!selectable) {
      button.classList.add('static');
      return button;
    }
    if (state.selected.has(card.id)) button.classList.add('selected');
    button.addEventListener('click', () => toggleSelection(card.id));
    return button;
  }

  function renderHand() {
    els.hand.innerHTML = '';
    const human = getHumanPlayer();
    if (!human) {
      els.selectedCount.textContent = t('game.selected', { count: 0 });
      document.querySelector('.hand-head h2')?.setAttribute('data-count', '0');
      return;
    }
    const shouldAnimateDeal = !state.dealAnimationShown;
    sortedHumanHand(human.hand).forEach((card, index) => {
      const tile = renderCardTile(card, true);
      if (shouldAnimateDeal) {
        tile.classList.add('deal-card-in');
        tile.style.setProperty('--deal-delay', `${Math.min(520, index * 32)}ms`);
      }
      els.hand.appendChild(tile);
    });
    if (shouldAnimateDeal) state.dealAnimationShown = true;
    els.selectedCount.textContent = t('game.selected', { count: state.selected.size });
    document.querySelector('.hand-head h2')?.setAttribute('data-count', String(human.hand.length));
    const handCard = document.querySelector('.hand-card');
    const handHead = document.querySelector('.hand-head');
    handHead?.querySelector('.last-card-badge--you')?.remove();
    if (!state.gameOver && human.hand.length === 1) {
      handCard?.classList.add('last-card');
      if (handHead) renderLastCardBadge(handHead, t('game.lastCard'), 'last-card-badge--you');
      announceLastCard(state.humanIndex);
    } else {
      handCard?.classList.remove('last-card');
    }
  }

  function render() {
    if (!state.players.length) {
      renderCoinHud();
      return;
    }
    renderOpponents();
    renderTrick();
    renderHand();
    renderChat();
    updateStatus();
    renderCoinHud();
    applyPendingLastCardFlash();
    els.sparkCount.textContent = String(state.sparks);
    els.roundCount.textContent = String(state.round);
    els.heatFill.style.width = `${state.heat}%`;
    els.heatValue.textContent = `${state.heat}%`;
    if (!state.gameOver) {
      const humanTurn = state.currentPlayer === state.humanIndex;
      const selected = selectedCards();
      const result = selected.length ? validateHumanPlay(selected) : null;
      els.play.textContent = result?.ok ? `Play ${describePlay(result.play)}` : 'Play Selected';
      els.play.disabled = !humanTurn || !canHumanAct() || !result?.ok;
      els.pass.disabled = !humanTurn || !state.trick.play;
      updateHintButton(humanTurn);
      els.sort.textContent = `Sort: ${sortModeLabel()}`;
      els.sort.disabled = !humanTurn;
      if (humanTurn && !state.liveRoom) {
        window.Big2GoAIReactions?.onHumanTurnStart(state);
      } else {
        window.Big2GoAIReactions?.clearHumanIdleTimer(true);
      }
    } else {
      els.play.disabled = true;
      els.pass.disabled = true;
      updateHintButton(false);
      els.sort.disabled = true;
    }
    saveGame();
  }

  function canHumanAct() {
    return !state.busy && !state.gameOver && state.currentPlayer === state.humanIndex;
  }

  function toggleSelection(cardId) {
    if (!canHumanAct()) return;
    if (state.selected.has(cardId)) state.selected.delete(cardId);
    else state.selected.add(cardId);
    playUiSound('click');
    render();
  }

  function clearSelection() {
    state.selected = new Set();
    render();
  }

  function selectedCards() {
    const handMap = new Map(getHumanPlayer().hand.map(card => [card.id, card]));
    return sortCards([...state.selected].map(id => handMap.get(id)).filter(Boolean));
  }

  function validateHumanPlay(cards) {
    const play = buildPlay(cards, state.settings);
    if (!play) return { ok: false, reason: g('play.invalidHand') };
    if (state.trick.play && !playBeats(play, state.trick)) {
      return { ok: false, reason: g('play.mustBeat', { play: describePlay(state.trick.play) }) };
    }
    return { ok: true, play };
  }

  function removeCardsFromHand(player, cards) {
    const ids = new Set(cards.map(card => card.id));
    player.hand = player.hand.filter(card => !ids.has(card.id));
  }

  function advanceTurnAfterPlay(playerIndex, play) {
    state.trick.play = play;
    state.trick.leader = playerIndex;
    state.trick.passes = 0;
    state.firstTrick = false;
    state.currentPlayer = nextActivePlayer(playerIndex);
    state.round += 1;
  }

  function finishIfNeeded(playerIndex) {
    const player = state.players[playerIndex];
    if (player.hand.length === 0) {
      player.finished = true;
      announceVictory(player);
      return true;
    }
    return false;
  }

  function playComment(play) {
    return window.Big2GoAIDialogue?.getOracleLine?.(play.kind)
      || (ORACLE[play.kind] || ORACLE.single)[Math.floor(Math.random() * 3)];
  }

  function applyPlay(playerIndex, cards, source = 'played') {
    const player = state.players[playerIndex];
    removeCardsFromHand(player, cards);
    const play = buildPlay(cards, state.settings);
    advanceTurnAfterPlay(playerIndex, play);
    const comment = playComment(play);
    const sourceLabel = source === 'played' ? g('play.sourcePlayed') : source;
    logState(g('log.played', {
      name: player.name,
      source: sourceLabel,
      play: describePlay(play),
      comment
    }));
    const heatBoost = {
      single: 6, pair: 9, triple: 12, straight: 16, flush: 18, 'full-house': 24, 'four-kind': 30, 'straight-flush': 38
    }[play.kind] || 6;
    updateHeat(Math.min(heatBoost, 40), comment);
    playUiSound(player.isHuman ? 'cardPlace' : 'ai');
    if (play.count === 5) {
      sparkle(2);
      renderConfetti(14 + heatBoost / 2);
    } else {
      sparkle(1);
    }
    if (player.hand.length === 2) updateHeat(7, g('log.twoCards', { name: player.name }));
    if (player.hand.length === 1) announceLastCard(playerIndex);
    if (finishIfNeeded(playerIndex)) return;
    if (!state.liveRoom && !player.isHuman) {
      window.Big2GoAIReactions?.onAiPlayComplete(playerIndex, play, state);
    }
    render();
    scheduleAiTurn();
  }

  function passTurn(playerIndex) {
    state.trick.passes += 1;
    state.heat = Math.max(0, state.heat - 8);
    logState(g('log.passed', { name: state.players[playerIndex].name }));
    playUiSound('pass');
    if (state.trick.passes >= state.players.length - 1) {
      const leader = state.trick.leader;
      if (!state.liveRoom) {
        window.Big2GoAIReactions?.onTrickWon(leader, state);
      }
      state.currentPlayer = leader;
      state.trick = { play: null, leader, passes: 0 };
      state.round += 1;
      logState(g('log.claimedTrick', { name: state.players[leader].name }));
      updateHeat(10, g('heat.freshTrick'));
      sparkle(1);
      clearSelection();
    } else {
      state.currentPlayer = nextActivePlayer(playerIndex);
    }
    render();
    scheduleAiTurn();
  }

  function combinations(cards, size) {
    const results = [];
    const combo = [];
    function backtrack(start) {
      if (combo.length === size) {
        results.push(combo.slice());
        return;
      }
      for (let i = start; i < cards.length; i++) {
        combo.push(cards[i]);
        backtrack(i + 1);
        combo.pop();
      }
    }
    backtrack(0);
    return results;
  }

  function getCandidates(hand) {
    const cards = sortCards(hand);
    const candidates = [];
    const seen = new Set();
    const add = combo => {
      const play = buildPlay(combo, state.settings);
      if (!play) return;
      const key = playKey(play.cards);
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push(play);
    };

    for (const card of cards) add([card]);

    const rankGroups = groupByRank(cards);
    for (const group of rankGroups.values()) {
      if (group.length >= 2) add(group.slice(0, 2));
      if (group.length >= 3) add(group.slice(0, 3));
    }

    for (const combo of combinations(cards, 5)) add(combo);
    return candidates;
  }

  function legalCandidates(hand) {
    const candidates = getCandidates(hand);
    if (!state.trick.play) {
      return candidates;
    }
    return candidates.filter(play => playBeats(play, state.trick));
  }

  function pickBigLead(candidates) {
    return candidates.slice().sort((a, b) => {
      const aKind = FIVE_KIND_ORDER[a.kind] || a.cards.length;
      const bKind = FIVE_KIND_ORDER[b.kind] || b.cards.length;
      if (aKind !== bKind) return bKind - aKind;
      if (a.cards.length !== b.cards.length) return b.cards.length - a.cards.length;
      return compareScores(b.score, a.score);
    })[0];
  }

  function maxRankInPlay(play) {
    return Math.max(...play.cards.map(card => card.rankIndex));
  }

  function leadSortWeight(play, { aggression = 0, handSize = 13 } = {}) {
    const maxRank = maxRankInPlay(play);
    const kindBonus = (FIVE_KIND_ORDER[play.kind] || 0) * 6;
    const countBonus = play.cards.length * (handSize >= 8 ? 18 : handSize >= 5 ? 12 : 4);
    let rankPenalty = 0;
    if (maxRank >= 12) rankPenalty += 900;
    else if (maxRank >= 11) rankPenalty += 420;
    else if (maxRank >= 10) rankPenalty += 180;
    else if (maxRank >= 9) rankPenalty += 70;
    rankPenalty *= (1 - aggression);
    return countBonus + kindBonus + play.score[1] + rankPenalty;
  }

  function pickSmartLead(candidates, handSize, skillTier, maturity = 0) {
    if (!candidates.length) return null;
    if (handSize <= 3) return pickStrongestMove(candidates);

    const aggression = skillTier === 'legend'
      ? 0.12 + maturity * 0.08
      : skillTier === 'master'
        ? 0.08 + maturity * 0.06
        : skillTier === 'strategist'
          ? 0.04 + maturity * 0.04
          : 0.02 + maturity * 0.02;
    const mistakeChance = skillTier === 'rookie'
      ? Math.max(0.04, 0.16 - maturity * 0.1)
      : skillTier === 'strategist'
        ? Math.max(0.02, 0.07 - maturity * 0.04)
        : skillTier === 'master'
          ? 0.03
          : 0;

    if (Math.random() < mistakeChance) return pickBigLead(candidates);

    return candidates.slice().sort((a, b) => {
      const aWeight = leadSortWeight(a, { aggression, handSize });
      const bWeight = leadSortWeight(b, { aggression, handSize });
      if (aWeight !== bWeight) return aWeight - bWeight;
      return compareScores(a.score, b.score);
    })[0];
  }

  function pickMinimalBeat(candidates) {
    if (!candidates.length) return null;
    return candidates.slice().sort((a, b) => compareScores(a.score, b.score))[0];
  }

  function pickSmartBeat(candidates, handSize, skillTier, maturity = 0) {
    if (!candidates.length) return null;
    if (handSize <= 3) return pickStrongestMove(candidates);

    const wasteChance = skillTier === 'rookie'
      ? Math.max(0.08, 0.3 - maturity * 0.16)
      : skillTier === 'strategist'
        ? Math.max(0.03, 0.12 - maturity * 0.05)
        : skillTier === 'master'
          ? 0.05
          : 0.02;

    if (Math.random() < wasteChance) return pickStrongestMove(candidates);
    return pickMinimalBeat(candidates);
  }

  function pickStrongestMove(candidates) {
    if (!candidates.length) return null;
    return candidates.reduce((best, play) => (
      !best || compareScores(play.score, best.score) > 0 ? play : best
    ), null);
  }

  function pickHintMove(hand) {
    const candidates = legalCandidates(hand);
    if (!candidates.length) return null;
    if (!state.trick.play) {
      const human = getHumanPlayer();
      const tier = getTableSkillTier(human);
      const maturity = getSkillMaturity(getTableSkillLevel(human));
      return pickSmartLead(candidates, hand.length, tier, maturity);
    }
    return pickMinimalBeat(candidates) || pickStrongestMove(candidates);
  }

  function pickAIMove(hand, playingStyle = 'smart', skillTier = 'rookie', maturity = 0) {
    const candidates = legalCandidates(hand);
    if (!candidates.length) return null;

    const funnyChance = skillTier === 'legend' || skillTier === 'master'
      ? 0
      : skillTier === 'strategist'
        ? Math.max(0.03, 0.1 - maturity * 0.05)
        : (playingStyle === 'funny' ? Math.max(0.08, 0.22 - maturity * 0.1) : Math.max(0.02, 0.08 - maturity * 0.04));
    if (playingStyle === 'funny' && Math.random() < funnyChance) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    const handSize = hand.length;
    if (!state.trick.play) return pickSmartLead(candidates, handSize, skillTier, maturity);
    return pickSmartBeat(candidates, handSize, skillTier, maturity);
  }

  function getHintsRemaining() {
    return Math.max(0, HINT_LIMIT - (Number(state.hintsUsed) || 0));
  }

  function updateHintButton(humanTurn) {
    if (!els.hint) return;
    const remaining = getHintsRemaining();
    els.hint.textContent = t('game.hintWithCount', { count: remaining });
    els.hint.disabled = !humanTurn || remaining <= 0;
  }

  function chooseHint() {
    playUiSound('click');
    if (!canHumanAct()) return;
    if (getHintsRemaining() <= 0) {
      showHelp(t('hint.limitTitle'), t('hint.limitMessage', { limit: HINT_LIMIT }));
      return;
    }
    state.hintsUsed += 1;
    updateHintButton(true);
    saveGame();
    const hand = getHumanPlayer().hand;
    const chosen = pickHintMove(hand);
    if (!chosen) {
      clearSelection();
      showOracle(t('hint.titlePass'), `
        <div class="oracle-hint-card oracle-hint-card--pass">
          <p class="oracle-hint-kicker">${t('hint.passKicker')}</p>
          <p class="oracle-hint-note">${t('hint.passNote')}</p>
        </div>`, { variant: 'hint', hintAction: 'pass' });
      return;
    }
    state.selected = new Set(chosen.cards.map(card => card.id));
    render();
    showOracle(t('hint.titlePlay'), `
      <div class="oracle-hint-card oracle-hint-card--play">
        <p class="oracle-hint-kicker">${t('hint.playKicker')}</p>
        <div class="oracle-hint-suggestion" aria-label="${describePlay(chosen)}">
          <span class="oracle-hint-suggestion-text">${describePlay(chosen)}</span>
        </div>
        <p class="oracle-hint-note">${t('hint.playNote')}</p>
      </div>`, { variant: 'hint', hintAction: 'play' });
  }

  function scheduleAiTurn() {
    cancelAiTimer();
    if (state.liveRoom || state.gameOver || state.busy || state.currentPlayer === state.humanIndex) return;
    state.aiTimer = setTimeout(() => {
      state.aiTimer = null;
      takeAiTurn();
    }, getAiThinkDelay(state.players[state.currentPlayer]));
  }

  function getAiThinkDelay(player) {
    const skillLevel = getTableSkillLevel(player);
    const skillTier = getAiSkillTier(skillLevel);
    if (skillTier === 'legend') return 320 + Math.random() * 180;
    if (skillTier === 'master') return 380 + Math.random() * 220;
    if (skillTier === 'strategist') return 440 + Math.random() * 260;
    return 520 + Math.random() * 360;
  }

  function takeAiTurn() {
    if (state.gameOver || state.busy || state.currentPlayer === state.humanIndex) return;
    const index = state.currentPlayer;
    const player = state.players[index];
    const skillLevel = getTableSkillLevel(player);
    const skillTier = getAiSkillTier(skillLevel);
    const maturity = getSkillMaturity(skillLevel);
    const move = pickAIMove(player.hand, player.playingStyle, skillTier, maturity);
    state.busy = true;
    render();
    setTimeout(() => {
      state.busy = false;
      if (!move) {
        passTurn(index);
        return;
      }
      applyPlay(index, move.cards, 'played');
    }, 360 + Math.random() * 200);
  }

  function sortHumanHand() {
    playUiSound('click');
    const human = getHumanPlayer();
    nextSortMode();
    human.hand = sortedHumanHand(human.hand);
    state.selected = new Set();
    render();
  }

  function saveRoomSession(room = null, game = null, session = null) {
    if (!state.liveRoom?.code || !state.liveRoom?.playerId) return;
    const previous = getRoomSession();
    const sourceRoom = room || session?.room || previous?.room || null;
    const sourceGame = game || session?.game || null;
    const players = Array.isArray(sourceRoom?.players) ? sourceRoom.players.map(player => ({
      id: player.id,
      name: player.name,
      connected: player.connected !== false,
      timedOut: Boolean(player.timedOut)
    })) : Array.isArray(session?.players) ? session.players : Array.isArray(previous?.players) ? previous.players : [];
    const playerIndex = sourceGame?.playerIndex ?? session?.playerIndex ?? state.liveRoom.playerIndex ?? state.humanIndex;
    const hand = Array.isArray(sourceGame?.hand) ? sourceGame.hand : Array.isArray(session?.hand) ? session.hand : [];
    const currentPlayer = sourceGame?.currentPlayer ?? session?.currentPlayer ?? state.currentPlayer;
    const currentTurn = sourceGame?.players?.[currentPlayer]?.name || session?.currentTurn || state.players[currentPlayer]?.name || '';
    try {
      localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify({
        code: state.liveRoom.code,
        roomId: state.liveRoom.code,
        playerId: state.liveRoom.playerId,
        playerName: session?.playerName || players.find(player => player.id === state.liveRoom.playerId)?.name || 'You',
        playerIndex,
        seat: Number.isFinite(playerIndex) ? playerIndex + 1 : session?.seat || null,
        hostId: state.liveRoom.hostId || sourceRoom?.hostId || session?.hostId || null,
        players,
        room: sourceRoom ? { code: sourceRoom.code, status: sourceRoom.status, hostId: sourceRoom.hostId, players } : session?.room || null,
        status: sourceGame?.status || session?.status || sourceRoom?.status || previous?.status || 'playing',
        roomStatus: sourceRoom?.status || session?.roomStatus || previous?.roomStatus || 'playing',
        connected: session?.connected ?? players.find(player => player.id === state.liveRoom.playerId)?.connected ?? true,
        disconnectedAt: session?.disconnectedAt || previous?.disconnectedAt || null,
        currentPlayer,
        currentTurn,
        hand,
        handCount: hand.length || session?.handCount || previous?.handCount || 0,
        game: sourceGame || session?.game || previous?.game || null,
        updatedAt: Date.now()
      }));
    } catch (_) {}
    renderRoomRecovery();
  }

  function getRoomSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(ROOM_SESSION_KEY) || 'null');
      if (saved?.code && saved?.playerId) return saved;
    } catch (_) {}
    return null;
  }

  function clearRoomSession() {
    try { localStorage.removeItem(ROOM_SESSION_KEY); } catch (_) {}
    renderRoomRecovery();
  }

  async function verifySavedRoomSession() {
    const saved = getRoomSession();
    if (!saved?.playerId || state.liveRoom?.code) {
      renderRoomRecovery();
      return null;
    }
    try {
      const response = await fetch(`/api/rooms/session?playerId=${encodeURIComponent(saved.playerId)}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        renderRoomRecovery();
        return null;
      }
      state.liveRoom = {
        code: payload.session?.code || payload.room?.code || saved.code,
        playerId: saved.playerId,
        playerIndex: payload.session?.playerIndex ?? payload.game?.playerIndex ?? saved.playerIndex ?? 0,
        hostId: payload.session?.hostId || payload.room?.hostId || saved.hostId
      };
      saveRoomSession(payload.room, payload.game, payload.session);
      state.liveRoom = null;
      renderRoomRecovery();
      return payload;
    } catch (_) {
      renderRoomRecovery();
      return null;
    }
  }

  function renderRoomRecovery() {
    const saved = getRoomSession();
    if (!els.roomRecovery) return;
    els.roomRecovery.classList.toggle('hidden', !saved || Boolean(state.liveRoom?.code));
    if (!saved || state.liveRoom?.code) return;
    if (els.roomRecoverySummary) {
      const seat = saved.seat || (Number.isFinite(saved.playerIndex) ? saved.playerIndex + 1 : '?');
      const status = saved.status || saved.roomStatus || 'Playing';
      const cards = saved.handCount ? ` · ${saved.handCount} cards` : '';
      const turn = saved.currentTurn ? ` · Turn: ${saved.currentTurn === saved.playerName ? 'You' : saved.currentTurn}` : '';
      els.roomRecoverySummary.textContent = `Big2Go Arena · Room ${saved.code} · Seat ${seat} · ${status}${cards}${turn}`;
    }
    if (els.roomRecoveryPlayers) {
      els.roomRecoveryPlayers.innerHTML = '';
      (saved.players || []).slice(0, 4).forEach(player => {
        const chip = document.createElement('span');
        const isYou = player.id === saved.playerId;
        const statusIcon = isYou || player.connected === false ? '🔴' : '🟢';
        chip.textContent = `${statusIcon} ${isYou ? 'You disconnected' : player.name}`;
        els.roomRecoveryPlayers.appendChild(chip);
      });
    }
  }

  async function rejoinSavedRoom() {
    const saved = getRoomSession();
    if (!saved) return;
    els.roomRejoin && (els.roomRejoin.disabled = true);
    try {
      const payload = await rejoinBackendRoom(saved.code, saved.playerId);
      applyRoomConnection(payload);
    } catch (error) {
      showOracle('Rejoin failed', `${error.message || 'The room could not be restored.'}<br><br>If the room expired, choose Exit Room and create a new room.`);
    } finally {
      els.roomRejoin && (els.roomRejoin.disabled = false);
      renderRoomRecovery();
    }
  }

  async function exitSavedRoom() {
    const saved = getRoomSession();
    if (!saved) return;
    if (!window.confirm('Exit room? Your saved multiplayer session for this room will be cleared.')) return;
    try {
      await fetch('/api/rooms/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ type: 'room:leave', code: saved.code, playerId: saved.playerId })
      });
    } catch (_) {}
    clearRoomSession();
  }

  function roomSocketUrl(code, playerId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/rooms?code=${encodeURIComponent(code)}&playerId=${encodeURIComponent(playerId)}`;
  }

  function setRoomStatus(message, tone = 'neutral') {
    const status = document.querySelector('#room-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  async function fetchLiveRoomState() {
    if (!state.liveRoom?.code || !state.liveRoom?.playerId) return null;
    const url = `/api/rooms/state?code=${encodeURIComponent(state.liveRoom.code)}&playerId=${encodeURIComponent(state.liveRoom.playerId)}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not sync room');
    if (payload.room) {
      renderRoomState(payload.room);
      saveRoomSession(payload.room, payload.game, payload.session);
    }
    if (payload.game) applyLiveGame(payload.game, payload.room);
    if (payload.chat) applyChatPayload(payload.chat);
    if (payload.reactions) processReactions(payload.reactions);
    if (payload.voice) applyVoicePayload(payload.voice);
    processVoiceSignals(payload.voiceSignals);
    resumePendingRemoteAudio();
    return payload;
  }

  function startVoiceSignalPolling() {
    if (state.voicePollTimer) clearInterval(state.voicePollTimer);
    state.voicePollTimer = setInterval(() => {
      if (!state.liveRoom?.code || !state.liveRoom?.playerId) return;
      const url = `/api/rooms/state?code=${encodeURIComponent(state.liveRoom.code)}&playerId=${encodeURIComponent(state.liveRoom.playerId)}`;
      fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(response => response.json().catch(() => ({})))
        .then(payload => {
          if (payload.voice) applyVoicePayload(payload.voice);
          processVoiceSignals(payload.voiceSignals);
        })
        .catch(() => {});
    }, 700);
  }

  function stopVoiceSignalPolling() {
    if (state.voicePollTimer) clearInterval(state.voicePollTimer);
    state.voicePollTimer = null;
  }

  function startRoomPolling() {
    if (state.roomPollTimer) clearInterval(state.roomPollTimer);
    state.roomPollTimer = setInterval(() => {
      fetchLiveRoomState().catch(() => {});
    }, 1200);
    fetchLiveRoomState().catch(() => {});
    startVoiceSignalPolling();
    bindRemoteAudioUnlock();
  }

  function stopRoomPolling() {
    if (state.roomPollTimer) clearInterval(state.roomPollTimer);
    state.roomPollTimer = null;
    stopVoiceSignalPolling();
  }

  function leaveCurrentRoom({ keepalive = false } = {}) {
    if (!state.liveRoom?.code || !state.liveRoom?.playerId) return;
    const payload = JSON.stringify({ type: 'room:leave', code: state.liveRoom.code, playerId: state.liveRoom.playerId });
    try {
      if (keepalive && navigator.sendBeacon) {
        navigator.sendBeacon('/api/rooms/action', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/rooms/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: payload,
          keepalive
        }).catch(() => {});
      }
    } catch (_) {}
    stopRoomPolling();
    disableVoiceChat();
    if (state.roomSocket) {
      state.roomSocket.close();
      state.roomSocket = null;
    }
    state.liveRoom = null;
    state.liveRoomPlayers = [];
    state.liveRoomCardSyncKey = null;
    document.body.classList.remove('live-room-active');
    updateVoicePanel();
    renderCoinHud();
  }

  async function sendLiveRoomMessage(message) {
    if (!state.liveRoom?.code || !state.liveRoom?.playerId) {
      showOracle('Room not ready', 'Reopen Private Room and join again to reconnect.');
      return false;
    }
    try {
      const response = await fetch('/api/rooms/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ...message, code: state.liveRoom.code, playerId: state.liveRoom.playerId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Room action failed');
      if (payload.room) {
        renderRoomState(payload.room);
        saveRoomSession(payload.room, payload.game, payload.session);
      }
      if (payload.game) applyLiveGame(payload.game, payload.room);
      if (payload.chat) applyChatPayload(payload.chat);
      if (payload.reactions) processReactions(payload.reactions);
      if (payload.voice) applyVoicePayload(payload.voice);
      processVoiceSignals(payload.voiceSignals);
      return payload;
    } catch (error) {
      if (state.roomSocket && state.roomSocket.readyState === WebSocket.OPEN) {
        state.roomSocket.send(JSON.stringify(message));
        return true;
      }
      state.busy = false;
      showOracle('Room sync problem', error.message || 'Please reconnect to the private room.');
      render();
      return false;
    }
  }

  function applyLiveGame(game, room) {
    if (!game) return;
    cancelAiTimer();
    document.querySelector('#help-dialog')?.close?.();
    state.liveRoom = {
      code: room?.code || state.liveRoom?.code,
      playerId: game.playerId,
      playerIndex: game.playerIndex,
      hostId: room?.hostId || state.liveRoom?.hostId
    };
    saveRoomSession(room, game);
    state.settings.players = game.players.length;
    state.settings.straightRule = room?.rules?.straightRule || state.settings.straightRule || DEFAULT_STRAIGHT_RULE;
    state.humanIndex = game.playerIndex;
    state.currentPlayer = game.currentPlayer;
    state.startingPlayer = game.startingPlayer;
    state.firstTrick = Boolean(game.firstTrick);
    state.round = Number(game.round) || 1;
    state.trick = {
      play: game.trick?.play ? {
        kind: game.trick.play.kind,
        count: game.trick.play.count,
        cards: (game.trick.play.cards || []).map(card => cardFromId(card.id || card)).filter(Boolean),
        score: game.trick.play.score || []
      } : null,
      leader: Number(game.trick?.leader) || 0,
      passes: Number(game.trick?.passes) || 0
    };
    state.players = game.players.map((player, index) => ({
      id: player.id,
      name: index === game.playerIndex ? 'You' : player.name,
      isHuman: index === game.playerIndex,
      finished: Boolean(player.finished),
      connected: player.connected !== false,
      coins: Number.isFinite(player.coins) ? player.coins : STARTING_COINS,
      hand: index === game.playerIndex
        ? (game.hand || []).map(card => cardFromId(card.id || card)).filter(Boolean)
        : Array.from({ length: Number(player.handCount) || 0 }, () => ({ id: 'hidden' }))
    }));
    state.logs = Array.isArray(game.logs) ? game.logs.slice(0, 8) : [];
    state.coins.prizePool = game.prizePool || 0;
    const ownRoomPlayer = room?.players?.find?.(player => player.id === game.playerId);
    const ownGamePlayer = game.players?.find?.(player => player.id === game.playerId);
    if (Number.isFinite(ownGamePlayer?.coins)) syncLiveRoomCoinBalance(ownGamePlayer.coins);
    else if (Number.isFinite(ownRoomPlayer?.coins)) syncLiveRoomCoinBalance(ownRoomPlayer.coins);
    if (!state.gameOver && !game.gameOver && game.currentPlayer === game.playerIndex && state.coins.lastTurn !== `${game.round}:${game.currentPlayer}`) {
      state.coins.lastTurn = `${game.round}:${game.currentPlayer}`;
      playUiSound('turn');
    }
    const shuffleKey = `${room?.code || 'room'}:${game.round}:${game.startingPlayer}`;
    const cardSyncKey = shuffleKey;
    if (state.liveRoomCardSyncKey !== cardSyncKey) {
      state.liveRoomCardSyncKey = cardSyncKey;
      state.lastHandCounts = {};
      state.lastCardNotified = new Set();
    }
    if (game.round === 1 && game.firstTrick && !game.trick?.play && shuffleKey !== state.lastShuffleKey) {
      state.lastShuffleKey = shuffleKey;
      state.hintsUsed = 0;
      state.dealAnimationShown = false;
      playShuffleSound();
    }
    state.selected = new Set([...state.selected].filter(id => getHumanPlayer()?.hand.some(card => card.id === id)));
    state.gameOver = Boolean(game.gameOver);
    state.busy = false;
    syncLiveLastCardFromGame(game);
    els.playerCount.value = String(game.players.length);
    showGameScreen();
    if (state.liveRoom?.code) restoreVoiceInRoom();
    if (!game.gameOver) document.querySelector('#victory-overlay')?.remove();
    render();
    if (game.gameOver && !document.querySelector('#victory-overlay')) {
      const winner = state.players[game.winnerIndex];
      if (winner?.isHuman) animateCoins('win', Math.max(ENTRY_FEE_COINS, game.prizePool || 0));
      if (winner) announceVictory(winner);
    }
  }

  function renderRoomState(room) {
    const codeEl = document.querySelector('#room-code-display');
    const countEl = document.querySelector('#room-player-count');
    const roleEl = document.querySelector('#room-role');
    const playersEl = document.querySelector('#room-player-list');
    const startEl = document.querySelector('#room-start-button');
    const copyEl = document.querySelector('#room-copy-button');
    const shareEl = document.querySelector('#room-share-button');
    const myPlayerId = state.liveRoom?.playerId;
    if (room?.rules?.straightRule) state.settings.straightRule = room.rules.straightRule;
    if (state.liveRoom && room.hostId) state.liveRoom.hostId = room.hostId;
    const isHost = Boolean(myPlayerId && room.hostId === myPlayerId);
    const hasCode = Boolean(room.code && room.code !== '-----');
    if (room?.players) state.liveRoomPlayers = room.players.slice();
    if (codeEl) codeEl.textContent = room.code;
    if (countEl) countEl.textContent = String(room.playerCount || 0);
    if (roleEl) {
      roleEl.textContent = isHost
        ? t('room.roleHost')
        : myPlayerId
          ? t('room.roleFriend')
          : t('room.roleDefault');
    }
    if (copyEl) copyEl.disabled = !hasCode;
    if (shareEl) shareEl.disabled = !hasCode;
    if (playersEl) {
      playersEl.innerHTML = '';
      room.players.forEach((player) => {
        const item = document.createElement('li');
        const displayName = player.id === myPlayerId ? t('room.you') : player.name;
        const hostMark = player.id === room.hostId ? ' ★' : '';
        const offlineMark = player.connected === false ? ' · …' : '';
        item.textContent = `${displayName}${hostMark}${offlineMark}`;
        item.title = player.id === room.hostId ? t('room.host') : displayName;
        if (player.connected === false) item.dataset.left = 'true';
        playersEl.appendChild(item);
      });
    }
    if (startEl) {
      startEl.hidden = Boolean(myPlayerId && !isHost);
      startEl.disabled = !isHost || room.status === 'playing';
      startEl.textContent = room.status === 'playing'
        ? t('room.gameStarted')
        : room.playerCount >= 2
          ? t('room.startGame')
          : t('room.syncStart');
    }
    if (room.notice && room.notice !== state.lastRoomNotice) {
      state.lastRoomNotice = room.notice;
      if (/left|disconnected|timed out/i.test(room.notice)) showOracle('Player disconnected', room.notice);
      if (/rejoined/i.test(room.notice)) showOracle('Player rejoined', room.notice);
    }
    const hasDisconnected = room.players?.some(player => player.connected === false);
    const status = hasDisconnected
      ? 'Waiting for player to reconnect… game state is saved.'
      : room.notice && /left|disconnected|timed out/i.test(room.notice)
      ? room.notice
      : room.status === 'playing'
      ? 'Live game started — play from the table.'
      : room.playerCount >= 2
        ? isHost ? 'Ready — you can start now.' : 'Ready — waiting for host to start.'
        : isHost ? 'Share the code. Start unlocks when 1 friend joins.' : 'Enter a room code from your friend.';
    setRoomStatus(status, room.playerCount >= 2 ? 'ready' : 'waiting');
    if (state.liveRoom?.code) syncVoiceConnections().catch(() => {});
    if (room.status === 'playing' && state.liveRoom?.code && state.liveRoom?.playerId && els.game?.classList.contains('hidden')) {
      fetchLiveRoomState()
        .then(payload => {
          if (payload?.game) applyLiveGame(payload.game, payload.room || room);
          if (payload?.chat) applyChatPayload(payload.chat);
          if (payload?.voice) applyVoicePayload(payload.voice);
        })
        .catch(() => {});
    }
  }

  function connectRoomSocket(code, playerId) {
    if (state.roomSocket) state.roomSocket.close();
    if (!('WebSocket' in window)) {
      setRoomStatus('Realtime unavailable. Backup sync is on.', 'waiting');
      startRoomPolling();
      return;
    }
    const socket = new WebSocket(roomSocketUrl(code, playerId));
    state.roomSocket = socket;
    socket.addEventListener('open', () => {
      setRoomStatus('Realtime room connected. Backup sync is on.', 'ready');
      startRoomPolling();
      if (state.voice.enabled) syncVoiceConnections().catch(() => {});
      else if (shouldRestoreVoiceAfterReconnect()) enableVoiceChat({ muted: false }).catch(() => {});
      else syncVoiceConnections().catch(() => {});
    });
    socket.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'room:update' || message.type === 'game:update') {
          if (message.room) {
            renderRoomState(message.room);
            saveRoomSession(message.room, message.game, message.session);
          }
          if (message.game) applyLiveGame(message.game, message.room);
          if (message.chat) applyChatPayload(message.chat);
          if (message.reactions) processReactions(message.reactions);
          if (message.voice) applyVoicePayload(message.voice);
          processVoiceSignals(message.voiceSignals);
        }
        if (message.type === 'room:reaction') {
          processReaction(message.reaction);
        }
        if (message.type === 'voice:signal') {
          handleVoiceSignal(message.from, message.signal)
            .then(() => resumePendingRemoteAudio())
            .catch(() => {});
        }
        if (message.type === 'room:error') {
          state.busy = false;
          setRoomStatus(message.error || 'Room connection error.', 'error');
          if (!document.querySelector('#help-dialog')?.open) showOracle('Room action failed', message.error || 'Room connection error.');
          render();
        }
      } catch (_) {
        // Ignore malformed realtime messages.
      }
    });
    socket.addEventListener('close', () => {
      if (state.roomSocket === socket) {
        setRoomStatus('Realtime paused. Backup sync is still on.', 'waiting');
        startRoomPolling();
      }
    });
    socket.addEventListener('error', () => {
      setRoomStatus('Realtime issue. Backup sync is still on.', 'waiting');
      startRoomPolling();
    });
  }

  async function createBackendRoom(name) {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, straightRule: state.settings.straightRule })
    });
    if (!response.ok) throw new Error('Could not create room');
    return response.json();
  }

  async function rejoinBackendRoom(code, playerId) {
    const response = await fetch('/api/rooms/rejoin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ code, playerId })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not rejoin room');
    return payload;
  }

  function applyRoomConnection(payload, controls = {}) {
    const room = payload.room;
    const playerId = payload.playerId || payload.session?.playerId;
    if (!room?.code || !playerId) throw new Error('Invalid room response');
    state.liveRoom = {
      code: room.code,
      playerId,
      playerIndex: payload.game?.playerIndex ?? payload.session?.playerIndex ?? Math.max(0, (room.playerCount || 1) - 1),
      hostId: room.hostId
    };
    state.pendingRoomInvite = null;
    if (room?.players) state.liveRoomPlayers = room.players.slice();
    saveRoomSession(room, payload.game, payload.session);
    renderRoomState(room);
    if (payload.game) applyLiveGame(payload.game, room);
    if (payload.chat) applyChatPayload(payload.chat);
    if (payload.reactions) processReactions(payload.reactions);
    if (payload.voice) applyVoicePayload(payload.voice);
    processVoiceSignals(payload.voiceSignals);
    connectRoomSocket(room.code, playerId);
    startRoomPolling();
    controls.input?.removeAttribute('readonly');
    const shareButton = document.querySelector('#room-share-button');
    if (shareButton) shareButton.disabled = false;
    playUiSound('start');
    restoreVoiceInRoom();
  }

  async function joinBackendRoom(code, name, playerId = null) {
    const body = { code, name };
    if (playerId) body.playerId = playerId;
    const response = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not join room');
    return payload;
  }

  const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;

  function normalizeRoomCode(raw) {
    if (raw == null || typeof raw === 'object') return '';
    return String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  }

  function isValidRoomCode(raw) {
    const code = normalizeRoomCode(raw);
    return ROOM_CODE_RE.test(code);
  }

  function buildRoomInviteUrl(code) {
    const normalized = normalizeRoomCode(code);
    if (!ROOM_CODE_RE.test(normalized)) return window.location.origin + window.location.pathname;
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('room', normalized);
    return url.toString();
  }

  function parseRoomInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const code = normalizeRoomCode(params.get('room') || params.get('join') || '');
    return isValidRoomCode(code) ? code : null;
  }

  function clearRoomInviteFromUrl() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('room') && !url.searchParams.has('join')) return;
    url.searchParams.delete('room');
    url.searchParams.delete('join');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next);
  }

  function handleRoomInviteLink() {
    const params = new URLSearchParams(window.location.search);
    const rawInvite = params.get('room') || params.get('join') || '';
    const code = parseRoomInviteFromUrl();
    if (rawInvite) clearRoomInviteFromUrl();
    if (state.liveRoom?.code) return;
    if (rawInvite && !code) {
      showPrivateRoom();
      setTimeout(() => setRoomStatus('That invite link looks invalid. Ask your friend for a new link or enter their room code.', 'error'), 0);
      return;
    }
    if (!code) return;
    state.pendingRoomInvite = code;
    showPrivateRoom(code);
  }

  async function joinRoomFromModal(code, name, controls = {}) {
    const joinButton = controls.joinButton;
    const input = controls.input;
    const normalizedCode = normalizeRoomCode(code);
    if (!isValidRoomCode(normalizedCode)) {
      setRoomStatus('Enter a valid 5-character room code from your friend.', 'error');
      return false;
    }
    const saved = getRoomSession();
    const savedPlayerId = saved?.code === normalizedCode ? saved.playerId : null;
    if (joinButton) joinButton.disabled = true;
    setRoomStatus(savedPlayerId ? 'Rejoining your seat…' : 'Joining room…', 'waiting');
    try {
      if (savedPlayerId) {
        try {
          const payload = await rejoinBackendRoom(normalizedCode, savedPlayerId);
          applyRoomConnection(payload, controls);
          return true;
        } catch (rejoinError) {
          setRoomStatus('Saved seat unavailable. Trying to reconnect by name…', 'waiting');
        }
      }
      const payload = await joinBackendRoom(normalizedCode, name, savedPlayerId);
      applyRoomConnection(payload, controls);
      return true;
    } catch (error) {
      if (joinButton) joinButton.disabled = false;
      setRoomStatus(error.message || 'Could not join that room.', 'error');
      return false;
    }
  }
  function attachRoomModalEvents() {
    const inviteCode = state.pendingRoomInvite || null;
    const saved = getRoomSession();
    const savedCode = saved?.code && isValidRoomCode(saved.code) ? saved.code : null;
    const reconnectMode = Boolean(savedCode && !state.liveRoom?.code);
    const createButton = document.querySelector('#room-create-button');
    const joinButton = document.querySelector('#room-join-button');
    const copyButton = document.querySelector('#room-copy-button');
    const shareButton = document.querySelector('#room-share-button');
    const startButton = document.querySelector('#room-start-button');
    const input = document.querySelector('#room-code-input');
    const nameInput = document.querySelector('#room-name-input');

    const playerName = () => String(nameInput?.value || saved?.playerName || '').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Player';

    if (reconnectMode && input) {
      input.value = savedCode;
      if (nameInput && saved?.playerName) nameInput.value = saved.playerName;
      if (joinButton) joinButton.textContent = 'Rejoin Room';
      setRoomStatus(`Welcome back to room ${savedCode}. Tap Rejoin Room to restore your seat and cards.`, 'ready');
      nameInput?.focus();
    } else if (inviteCode && input) {
      input.value = inviteCode;
      input.setAttribute('readonly', 'readonly');
      setRoomStatus(`You were invited to room ${inviteCode}. Enter your name and tap Join.`, 'ready');
      nameInput?.focus();
    }

    nameInput?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const code = String(input?.value || inviteCode || '').trim();
      if (!code) return;
      event.preventDefault();
      joinButton?.click();
    });

    input?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      joinButton?.click();
    });

    createButton.onclick = async () => {
      createButton.disabled = true;
      setRoomStatus('Creating private room…', 'waiting');
      try {
        const payload = await createBackendRoom(playerName());
        state.liveRoom = { code: payload.room.code, playerId: payload.playerId, playerIndex: 0, hostId: payload.room.hostId };
        saveRoomSession(payload.room, payload.game, payload.session);
        renderRoomState(payload.room);
        connectRoomSocket(payload.room.code, payload.playerId);
        startRoomPolling();
        if (shareButton) shareButton.disabled = false;
        playUiSound('start');
      } catch (error) {
        createButton.disabled = false;
        setRoomStatus('Room backend is not online yet. Deploy the Node/WebSocket service to enable live rooms.', 'error');
      }
    };

    joinButton.onclick = async () => {
      const code = String(input?.value || inviteCode || savedCode || '').trim();
      await joinRoomFromModal(code, playerName(), { joinButton, input });
    };

    startButton.onclick = async () => {
      startButton.disabled = true;
      setRoomStatus('Syncing room and starting…', 'waiting');
      await fetchLiveRoomState().catch(() => null);
      const started = await sendLiveRoomMessage({ type: 'room:start' });
      if (!started) startButton.disabled = false;
    };

    copyButton.onclick = async () => {
      const code = document.querySelector('#room-code-display')?.textContent?.trim();
      if (!code || code === '-----') return;
      try {
        await navigator.clipboard.writeText(code);
        setRoomStatus('Code copied. Send it to your friend.', 'ready');
      } catch (_) {
        setRoomStatus(`Code: ${code}`, 'ready');
      }
    };

    shareButton.onclick = async () => {
      const code = document.querySelector('#room-code-display')?.textContent?.trim();
      if (!code || code === '-----') return;
      const inviteUrl = buildRoomInviteUrl(code);
      const text = `Join my Big2Go private room (${code}). Tap the link, enter your name, and tap Join.`;
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Join my Big2Go room', text, url: inviteUrl });
        } else {
          await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
        }
        setRoomStatus('Invite link shared. Friends can tap it to join automatically.', 'ready');
      } catch (_) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          setRoomStatus('Invite link copied. Send it to your friend.', 'ready');
        } catch (copyError) {
          setRoomStatus(`Share this link: ${inviteUrl}`, 'ready');
        }
      }
    };
  }

  function setRoomLobbyTab(tab) {
    const mode = tab === 'join' ? 'join' : 'create';
    document.querySelector('#room-panel-create')?.classList.toggle('hidden', mode !== 'create');
    document.querySelector('#room-panel-join')?.classList.toggle('hidden', mode !== 'join');
    document.querySelectorAll('[data-room-tab]').forEach(button => {
      const active = button.dataset.roomTab === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function hideRoomScreen() {
    els.roomScreen?.classList.add('hidden');
    document.body.classList.remove('room-lobby-active');
    showLandingScreen();
  }

  function showPrivateRoom(inviteCode = null) {
    playUiSound('click');
    state.pendingRoomInvite = isValidRoomCode(inviteCode) ? normalizeRoomCode(inviteCode) : null;

    const saved = getRoomSession();
    const savedCode = saved?.code && isValidRoomCode(saved.code) ? saved.code : null;
    const reconnectMode = Boolean(savedCode && !state.liveRoom?.code && !state.pendingRoomInvite);
    const invited = Boolean(state.pendingRoomInvite);

    const codeDisplay = document.querySelector('#room-code-display');
    const nameInput = document.querySelector('#room-name-input');
    const codeInput = document.querySelector('#room-code-input');
    const joinButton = document.querySelector('#room-join-button');
    const startButton = document.querySelector('#room-start-button');
    const copyButton = document.querySelector('#room-copy-button');
    const shareButton = document.querySelector('#room-share-button');
    const playersEl = document.querySelector('#room-player-list');
    const countEl = document.querySelector('#room-player-count');

    if (codeDisplay) {
      codeDisplay.textContent = invited
        ? state.pendingRoomInvite
        : reconnectMode
          ? savedCode
          : state.liveRoom?.code || '-----';
    }
    if (nameInput) {
      nameInput.value = reconnectMode && saved?.playerName
        ? saved.playerName
        : getPlayerDisplayName();
    }
    if (codeInput) {
      codeInput.value = invited ? state.pendingRoomInvite : reconnectMode ? savedCode : '';
      if (invited) codeInput.setAttribute('readonly', 'readonly');
      else codeInput.removeAttribute('readonly');
    }
    if (joinButton) {
      joinButton.textContent = reconnectMode
        ? t('room.rejoin')
        : invited
          ? t('room.joinRoom')
          : t('room.join');
    }
    if (playersEl) playersEl.innerHTML = '';
    if (countEl) countEl.textContent = '0';
    if (startButton) {
      startButton.disabled = true;
      startButton.hidden = false;
      startButton.textContent = t('room.startGame');
    }
    if (copyButton) copyButton.disabled = !state.liveRoom?.code;
    if (shareButton) shareButton.disabled = !state.liveRoom?.code;

    setRoomLobbyTab(invited || reconnectMode ? 'join' : 'create');
    setRoomStatus(
      reconnectMode
        ? t('room.statusRejoin')
        : invited
          ? t('room.statusInvite')
          : t('room.statusDefault'),
      reconnectMode || invited ? 'ready' : 'neutral'
    );

    hideAllScreens();
    els.roomScreen?.classList.remove('hidden');
    document.body.classList.add('room-lobby-active');
    window.scrollTo(0, 0);
    window.Big2GoI18n?.apply?.(els.roomScreen);
    attachRoomModalEvents();
  }

  function shareGame() {
    const data = {
      title: 'Big2Go',
      text: 'I am playing Big2Go — a fast Big Two card game where the 3♦ starts the action.',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        navigator.share(data);
        return;
      }
      navigator.clipboard.writeText(`${data.text} ${data.url}`);
      showOracle('Link copied', 'The Big2Go link was copied to your clipboard. Paste it into chats to invite friends.');
    } catch (_) {
      showOracle('Share this game', `${data.text}<br><br>${data.url}`);
    }
  }

  function finishGameIfEnded() {
    const winner = state.players.find(player => player.hand.length === 0);
    if (!winner) return false;
    winner.finished = true;
    announceVictory(winner);
    return true;
  }

  function humanPlay() {
    if (!canHumanAct()) return;
    window.Big2GoAIReactions?.clearHumanIdleTimer(true);
    const cards = selectedCards();
    const result = validateHumanPlay(cards);
    if (!result.ok) {
      showOracle('Not a legal play', result.reason);
      playUiSound('error');
      return;
    }
    if (state.liveRoom) {
      state.busy = true;
      sendLiveRoomMessage({ type: 'game:play', cards: cards.map(card => card.id) });
      clearSelection();
      return;
    }
    state.busy = true;
    render();
    setTimeout(() => {
      state.busy = false;
      removeCardsFromHand(getHumanPlayer(), cards);
      const play = buildPlay(cards, state.settings);
      recordSessionCombo(play);
      const comment = playComment(play);
      logState(g('log.youPlayed', { play: describePlay(play), comment }));
      advanceTurnAfterPlay(state.humanIndex, play);
      playUiSound('cardPlace');
      const heatBoost = {
        single: 6, pair: 9, triple: 12, straight: 16, flush: 18, 'full-house': 24, 'four-kind': 30, 'straight-flush': 38
      }[play.kind] || 6;
      updateHeat(Math.min(heatBoost, 40), comment);
      if (play.count === 5) {
        sparkle(3);
        renderConfetti(18 + heatBoost / 2);
      } else {
        sparkle(1);
      }
      clearSelection();
      if (getHumanPlayer().hand.length === 2) updateHeat(8, 'You are down to 2 cards.');
      if (getHumanPlayer().hand.length === 1) announceLastCard(state.humanIndex);
      if (finishIfNeeded(state.humanIndex)) {
        state.busy = false;
        return;
      }
      window.Big2GoAIReactions?.onPlayerPlayComplete(play, state);
      render();
      scheduleAiTurn();
    }, 140);
  }

  function humanPass() {
    if (!canHumanAct() || !state.trick.play) return;
    window.Big2GoAIReactions?.clearHumanIdleTimer(true);
    clearSelection();
    playUiSound('pass');
    if (state.liveRoom) {
      state.busy = true;
      sendLiveRoomMessage({ type: 'game:pass' });
      render();
      return;
    }
    passTurn(state.humanIndex);
  }

  function playSelectedCards() {
    humanPlay();
  }

  function updatePlayerChoiceUI() {
    const selected = String(els.playerCount.value || '4');
    document.querySelectorAll('[data-player-choice]').forEach(button => {
      const active = button.dataset.playerChoice === selected;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindLandingAudioUnlock() {
    const unlockLandingAudio = () => {
      if (!isLandingScreenVisible()) return;
      unlockAudioFromGesture();
      ensureLandingMusicPlaying();
    };
    ['pointerdown', 'touchstart', 'touchend', 'click'].forEach(type => {
      document.addEventListener(type, unlockLandingAudio, { passive: true, capture: true });
    });
  }

  function bindEvents() {
    bindLandingAudioUnlock();
    bindRemoteAudioUnlock();
    bindLandingPlayActions();
    wireLandingPlayerSetup();
    els.game?.addEventListener('pointerdown', () => {
      if (!els.game?.classList.contains('hidden')) unlockAudioFromGesture();
    }, { passive: true, capture: true });
    els.demo?.addEventListener('click', showPlayDemo);
    els.privateRoom?.addEventListener('click', () => showPrivateRoom());
    els.roomClose?.addEventListener('click', hideRoomScreen);
    document.querySelectorAll('[data-room-tab]').forEach(button => {
      button.addEventListener('click', () => setRoomLobbyTab(button.dataset.roomTab));
    });
    els.roomRejoin?.addEventListener('click', rejoinSavedRoom);
    els.roomExitSession?.addEventListener('click', exitSavedRoom);
    els.share.addEventListener('click', shareGame);
    els.chatToggle?.addEventListener('click', () => {
      state.chatExpanded = !state.chatExpanded;
      renderChat();
    });
    document.querySelectorAll('[data-reaction]').forEach(button => {
      button.addEventListener('click', () => sendPlayerReaction(button.dataset.reaction || '👏'));
    });
    els.chatForm?.addEventListener('submit', event => {
      event.preventDefault();
      sendRoomChat(els.chatInput?.value || '');
    });
    els.voiceMic?.addEventListener('click', toggleMic);
    els.voiceMic?.addEventListener('pointerdown', event => {
      if (!state.voice.pushToTalk) return;
      event.preventDefault();
      setPushToTalkHolding(true);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      els.voiceMic?.addEventListener(type, () => setPushToTalkHolding(false));
    });
    els.voiceSpeaker?.addEventListener('click', toggleSpeaker);
    els.voiceMuteAll?.addEventListener('click', muteAllVoicePlayers);
    els.voiceMuteAll?.addEventListener('dblclick', toggleVoiceMixer);
    els.voicePtt?.addEventListener('click', togglePushToTalk);
    document.querySelectorAll('[data-chat-quick]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.chatKey;
        const text = key ? t(key) : (button.dataset.chatQuick || button.textContent || '');
        sendRoomChat(text);
      });
    });
    document.querySelector('#profile-button')?.addEventListener('click', showPlayerProfilePanel);
    els.profileClose?.addEventListener('click', hideProfileScreen);
    document.querySelectorAll('[data-home-tab]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-home-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
        const tab = button.dataset.homeTab;
        if (tab === 'profile') {
          showPlayerProfilePanel();
          return;
        }
        const copy = {
          play: ['Play', '<p>Choose your table and tap <strong>PLAY NOW</strong> to start a fast Big Two match.</p>'],
          rank: ['Rank Ladder', '<div class="rank-modal"><div class="modal-row"><strong>Bronze III</strong><span>145 / 250 RP</span></div><div class="modal-row"><strong>Next Rank</strong><span>Bronze II</span></div><div class="modal-row"><strong>Reward</strong><span>Gold Trim Card Back</span></div></div>'],
          rewards: ['Rewards', '<div class="reward-modal"><div class="modal-row"><strong>Daily Chest</strong><span>Ready</span></div><div class="modal-row"><strong>Win Chest</strong><span>2 / 5 wins</span></div><div class="modal-row"><strong>Today\'s Goal</strong><span>Win 1 match</span></div></div>']
        }[tab] || ['Big2Go', '<p>Play fast Big Two battles and climb the table.</p>'];
        showHelp(copy[0], copy[1]);
      });
    });
    document.querySelector('#settings-button')?.addEventListener('click', () => {
      unlockAudioFromGesture();
      ensureLandingMusicPlaying();
      showSettingsPanel();
    });
    document.querySelector('#leaderboard-button')?.addEventListener('click', () => showHelp('Leaderboard', '<ul><li><strong>You</strong> are the table challenger.</li><li>Win by clearing every card first.</li><li>Online ranking can be added after launch.</li></ul>'));
    document.querySelector('#bonus-button')?.addEventListener('click', () => showHelp('Daily Bonus', '<ul><li>Come back and play a fresh Big2Go table.</li><li>Daily rewards can be connected later.</li></ul>'));
    document.querySelector('#achievements-button')?.addEventListener('click', () => showHelp('Goals', '<ul><li>Win with singles, pairs, and 5-card combos.</li><li>Try to beat the AI with fewer passes.</li></ul>'));
    els.back.addEventListener('click', () => exitGame());
    els.sessionPlayAgain?.addEventListener('click', () => {
      dismissSessionCompleteScreen();
      resetPlaySession();
      document.querySelector('#victory-overlay')?.remove();
      newGame();
    });
    els.sessionBackHome?.addEventListener('click', () => {
      dismissSessionCompleteScreen();
      resetPlaySession();
      showLandingScreen();
    });
    els.resultStoryHome?.addEventListener('click', () => {
      resetPlaySession();
      state.lastMatchStory = null;
      showLandingScreen();
      playUiSound('click');
    });
    els.resultStoryPlayAgain?.addEventListener('click', () => {
      state.lastMatchStory = null;
      newGame();
    });
    els.levelUpContinue?.addEventListener('click', () => continueFromLevelUp());
    els.sound.addEventListener('click', () => {
      state.sound = !state.sound;
      els.sound.textContent = state.sound ? '🔊' : '🔇';
      if (!state.sound) stopLandingMusic();
      else if (isLandingScreenVisible()) ensureLandingMusicPlaying();
      playUiSound('click');
      saveGame();
    });
    els.play.addEventListener('click', playSelectedCards);
    els.pass.addEventListener('click', humanPass);
    els.hint.addEventListener('click', chooseHint);
    els.helpDialog?.addEventListener('close', () => {
      const confirmed = els.helpDialog.returnValue === 'ok';
      const action = state.hintPendingAction;
      resetHelpDialogChrome();
      if (confirmed && action) {
        requestAnimationFrame(() => executeHintAction(action));
      }
    });
    els.sort.addEventListener('click', sortHumanHand);
    els.restart.addEventListener('click', () => {
      if (state.liveRoom?.code) {
        sendLiveRoomMessage({ type: 'room:start' });
      } else {
        newGame();
      }
    });
    els.playerCount.addEventListener('change', () => {
      updatePlayerChoiceUI();
      updateContinueButton();
    });
    document.querySelectorAll('[data-player-choice]').forEach(button => {
      button.addEventListener('click', () => {
        els.playerCount.value = button.dataset.playerChoice || '4';
        updatePlayerChoiceUI();
        updateContinueButton();
        playUiSound('click');
      });
    });
    window.addEventListener('beforeunload', () => saveRoomSession());
    window.addEventListener('focus', () => {
      if (state.liveRoom?.code) fetchLiveRoomState().catch(() => {});
      else renderRoomRecovery();
    });
    window.addEventListener('pageshow', () => {
      if (state.liveRoom?.code) fetchLiveRoomState().catch(() => {});
      else verifySavedRoomSession().catch(() => {});
    });
  }

  function installReconnectTestMode() {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocal) return;
    window.big2goReconnectTestMode = {
      getSavedSession: getRoomSession,
      getLiveRoom: () => state.liveRoom ? { ...state.liveRoom } : null,
      clearSavedSession: clearRoomSession,
      showResumeCard: () => {
        renderRoomRecovery();
        return getRoomSession();
      },
      verifySavedSession: verifySavedRoomSession,
      rejoinSavedRoom,
      async createStartedRoomForPlayerB() {
        const post = async (path, body) => {
          const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body || {})
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `Request failed: ${path}`);
          return payload;
        };
        const created = await post('/api/rooms', { name: 'Player A' });
        const joined = await post('/api/rooms/join', { code: created.room.code, name: 'Player B' });
        await post('/api/rooms/action', { type: 'room:start', code: created.room.code, playerId: created.playerId });
        const statePayload = await fetch(`/api/rooms/state?code=${encodeURIComponent(created.room.code)}&playerId=${encodeURIComponent(joined.playerId)}`, { cache: 'no-store' }).then(response => response.json());
        state.liveRoom = { code: created.room.code, playerId: joined.playerId, playerIndex: statePayload.game?.playerIndex ?? 1, hostId: created.playerId };
        if (statePayload.game) applyLiveGame(statePayload.game, statePayload.room);
        connectRoomSocket(created.room.code, joined.playerId);
        startRoomPolling();
        saveRoomSession(statePayload.room, statePayload.game, statePayload.session);
        return { code: created.room.code, hostId: created.playerId, playerId: joined.playerId, session: getRoomSession() };
      },
      async simulateAccidentalReopen() {
        saveRoomSession();
        if (state.roomSocket) {
          state.roomSocket.close();
          state.roomSocket = null;
        }
        stopRoomPolling();
        state.liveRoom = null;
        disableVoiceChat();
        state.liveRoom = null;
        showHomeScreen();
        await verifySavedRoomSession();
        showHomeScreen();
        renderRoomRecovery();
        return getRoomSession();
      },
      async simulateBackToResume() {
        saveRoomSession();
        leaveCurrentRoom();
        cancelAiTimer();
        state.busy = false;
        showHomeScreen();
        updateContinueButton();
        await new Promise(resolve => setTimeout(resolve, 0));
        renderRoomRecovery();
        return getRoomSession();
      }
    };
  }

  function applyInterfaceI18n() {
    window.Big2GoI18n?.apply(document);
    if (els.helpText && !els.helpDialog?.open) {
      els.helpText.innerHTML = getRulesHtml();
      els.helpTitle.textContent = t('help.title');
    }
    renderPlayerProfileHud();
    if (state.players?.length) {
      updateStatus();
      renderTrick();
      renderOpponents();
      renderLogs();
      renderHand();
    } else {
      if (els.turnLabel) els.turnLabel.textContent = t('game.ready');
      if (els.heatText) els.heatText.textContent = t('game.heatLow');
      renderLogs();
    }
    renderRoomRecovery();
    if (els.playDemoDialog?.open) {
      renderPlayDemoScene(playDemo.sceneIndex);
      updatePlayDemoToggle();
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('./sw.js')
      .then(registration => registration.update().catch(() => {}))
      .catch(() => {
        // Optional offline support.
      });
  }

  function init() {
    loadSoundSettings();
    saveSoundSettings();
    state.coins.balance = loadCoinBalance();
    renderCoinHud();
    bindEvents();
    installReconnectTestMode();
    registerServiceWorker();
    window.addEventListener('big2go:languagechange', () => {
      applyInterfaceI18n();
      window.Big2GoAIDialogue?.clearBags?.();
    });
    window.addEventListener('pagehide', () => {
      if (!state.liveRoom?.code) saveCoinBalance();
    });
    updateContinueButton();
    updatePlayerChoiceUI();
    els.heatValue.textContent = '0%';
    els.heatFill.style.width = '0%';
    applyInterfaceI18n();
    syncLandingPlayerSetup();
    showHomeScreen();
    verifySavedRoomSession()
      .catch(() => {})
      .finally(() => {
        if (!state.liveRoom?.code) handleRoomInviteLink();
      });
    if (localStorage.getItem(SAVE_KEY)) els.continue.classList.remove('hidden');
  }

  init();
})();
