(() => {
  'use strict';

  const SAVE_KEY = 'big2go-save-v1';
  const COIN_KEY = 'big2go-virtual-coins-v1';
  const COIN_PEAK_KEY = 'big2go-virtual-coins-peak-v1';
  const AI_COINS_KEY = 'big2go-ai-coins-v1';
  const PLAYER_PROFILE_KEY = 'big2go-player-profile-v1';
  const AI_PROFILE_KEY = 'big2go-ai-profile-v1';
  const SOUND_SETTINGS_KEY = 'big2go-sound-settings-v1';
  const STARTING_COINS = 100;
  const STARTING_LEVEL = 1;
  const WINS_PER_LEVEL = 20;
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
      mixerOpen: false
    }
  };

  const audio = {
    context: null,
    master: null,
    victoryTimer: null
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
    resultStoryPlayers: document.querySelector('#result-story-players'),
    resultStoryStats: document.querySelector('#result-story-stats'),
    resultStoryFarewells: document.querySelector('#result-story-farewells'),
    resultStoryHome: document.querySelector('#result-story-home'),
    resultStoryPlayAgain: document.querySelector('#result-story-play-again'),
    exitConfirmDialog: document.querySelector('#exit-confirm-dialog'),
    playerCount: document.querySelector('#player-count'),
    start: document.querySelector('#start-button'),
    continue: document.querySelector('#continue-button'),
    privateRoom: document.querySelector('#private-room-button'),
    rules: document.querySelector('#rules-button'),
    share: document.querySelector('#share-button'),
    profileButton: document.querySelector('#profile-button'),
    playerLevelLabel: document.querySelector('#player-level-label'),
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
    if (cards.length === 1) return `Single ${cards[0].short}`;
    if (cards.length === 2) return `Pair ${describeCards(cards)}`;
    if (cards.length === 3) return `Triple ${describeCards(cards)}`;
    const name = {
      'straight': 'Straight',
      'flush': 'Flush',
      'full-house': 'Full house',
      'four-kind': 'Four of a kind',
      'straight-flush': 'Straight flush'
    }[play.kind] || 'Five-card hand';
    return `${name}: ${describeCards(cards)}`;
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
    hideAllScreens();
    els.game?.classList.remove('hidden');
    document.body.classList.toggle('live-room-active', Boolean(state.liveRoom?.code));
  }

  function hideAllScreens() {
    els.home?.classList.add('hidden');
    els.game?.classList.add('hidden');
    els.sessionComplete?.classList.add('hidden');
    els.resultStory?.classList.add('hidden');
    document.body.classList.remove('live-room-active', 'result-story-active', 'session-complete-active');
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
  }

  function showResultStoryScreen() {
    hideAllScreens();
    els.resultStory?.classList.remove('hidden');
    document.body.classList.add('result-story-active');
    window.scrollTo(0, 0);
  }

  function captureMatchStory(winner, coinPrize = 0) {
    const winnerIndex = state.players.indexOf(winner);
    return {
      winnerName: winner?.isHuman ? 'You' : (winner?.name || 'Player'),
      humanWon: Boolean(winner?.isHuman),
      coinPrize: Math.max(0, Number(coinPrize) || 0),
      coinsBalance: state.liveRoom?.code ? getWalletDisplayBalance() : state.coins.balance,
      sparks: state.sparks,
      round: state.round,
      playerCount: state.players.length,
      bestCombo: state.playSession.bestCombo || 'Opening spark',
      players: state.players.map((player, index) => ({
        name: player.isHuman ? 'You' : (player.name || `Player ${index + 1}`),
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

  function renderGameResultStory(story) {
    if (!story) return;
    if (els.resultStoryHeadline) {
      els.resultStoryHeadline.textContent = story.humanWon
        ? `You won the table! +🪙 ${story.coinPrize}`
        : `${story.winnerName} won this round`;
    }
    if (els.resultStoryStats) {
      const humanProfile = loadPlayerProfile();
      const humanProgress = getProfileProgress(humanProfile.totalWins);
      els.resultStoryStats.innerHTML = `
        <div class="result-story-stat"><small>Your Level</small><strong>Lv ${humanProfile.level}</strong></div>
        <div class="result-story-stat"><small>Level Progress</small><strong>${humanProgress.current} / ${humanProgress.target}</strong></div>
        <div class="result-story-stat"><small>Your Coins</small><strong>🪙 ${story.coinsBalance}</strong></div>
        <div class="result-story-stat result-story-stat--wide"><small>Best Combo</small><strong>${story.bestCombo}</strong></div>`;
    }
    if (els.resultStoryPlayers) {
      els.resultStoryPlayers.innerHTML = '';
      story.players.forEach(player => {
        const row = document.createElement('article');
        row.className = `result-story-player${player.won ? ' won' : ''}${player.isHuman ? ' human' : ''}`;
        const avatar = document.createElement('div');
        avatar.className = 'result-story-player-avatar';
        if (player.isHuman) {
          avatar.textContent = 'Y';
        } else {
          window.Big2GoAICharacters?.renderAvatar(avatar, { characterId: player.characterId, name: player.name }, {
            className: 'character-avatar',
            imgClassName: 'character-avatar-img'
          });
        }
        const copy = document.createElement('div');
        copy.className = 'result-story-player-copy';
        const status = player.won ? 'Winner' : (player.finished || player.cardsLeft === 0 ? 'Out' : `${player.cardsLeft} cards left`);
        copy.innerHTML = `
          <strong>${player.name} · Lv ${player.level || STARTING_LEVEL}</strong>
          <span>${status}</span>
          <small>🪙 ${player.coins}</small>`;
        const badge = document.createElement('span');
        badge.className = 'result-story-player-badge';
        badge.textContent = player.won ? '🏆' : (player.finished || player.cardsLeft === 0 ? '✓' : '…');
        row.append(avatar, copy, badge);
        els.resultStoryPlayers.appendChild(row);
      });
    }
    if (els.resultStoryFarewells) {
      els.resultStoryFarewells.innerHTML = '';
      const farewells = story.farewells?.length ? story.farewells : [];
      if (!farewells.length) {
        const empty = document.createElement('p');
        empty.className = 'result-story-empty';
        empty.textContent = 'The rivals are already planning the rematch.';
        els.resultStoryFarewells.appendChild(empty);
        return;
      }
      farewells.forEach(entry => {
        const row = document.createElement('div');
        row.className = 'result-story-farewell';
        const avatar = document.createElement('div');
        avatar.className = 'result-story-farewell-avatar';
        window.Big2GoAICharacters?.renderAvatar(avatar, entry.character || entry.player, {
          className: 'character-avatar',
          imgClassName: 'character-avatar-img'
        });
        const copy = document.createElement('div');
        copy.className = 'result-story-farewell-copy';
        copy.innerHTML = `<strong>${entry.character?.name || entry.player?.name || 'Rival'}</strong><p>"${entry.message || 'Great game!'}"</p>`;
        row.append(avatar, copy);
        els.resultStoryFarewells.appendChild(row);
      });
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
    finalizeFinishedMatch();
    resetPlaySession();
    state.lastMatchStory = null;
    showLandingScreen();
    playUiSound('click');
  }

  function showGameResultStoryFromVictory() {
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
      container.textContent = 'Y';
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
          name: 'You',
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
        logs: state.logs.slice(0, 8)
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
        name: player.name || (index === 0 ? 'You' : `AI ${index}`),
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
      state.selected = new Set();
      state.gameOver = false;
      state.busy = false;
      state.lastCardNotified = new Set();
      state.lastHandCounts = {};
      seedLastCardNotifiedFromHands();
      els.playerCount.value = String(state.settings.players || 4);
      els.sound.textContent = state.sound ? '🔊' : '🔇';
      showGameScreen();
      logState('The table returns from save. Pick up where you left off.');
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
    els.heatText.textContent = note || (state.heat >= 80 ? 'The Big2Go crowd is roaring.' : state.heat >= 50 ? 'The Big2Go crowd is leaning in.' : 'The Big2Go crowd is waiting for a spark.');
  }

  function renderConfetti(intensity = 12) {
    if (!state.confettiLayer) {
      state.confettiLayer = document.createElement('div');
      state.confettiLayer.className = 'confetti-layer';
      document.body.appendChild(state.confettiLayer);
    }
    const colors = ['#45d6ff', '#ff5fb8', '#63f0b0', '#ffd86b', '#7a59ff'];
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
    return { level: STARTING_LEVEL, totalWins: 0 };
  }

  function computeProfileLevel(totalWins) {
    return Math.floor(Math.max(0, Number(totalWins) || 0) / WINS_PER_LEVEL) + STARTING_LEVEL;
  }

  function getProfileProgress(totalWins) {
    const wins = Math.max(0, Number(totalWins) || 0);
    return { current: wins % WINS_PER_LEVEL, target: WINS_PER_LEVEL };
  }

  function loadPlayerProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(PLAYER_PROFILE_KEY) || 'null');
      const profile = raw && typeof raw === 'object' ? raw : defaultProfileRecord();
      profile.totalWins = Math.max(0, Number(profile.totalWins) || 0);
      profile.level = computeProfileLevel(profile.totalWins);
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
    if (!winner || state.liveRoom?.code) return null;
    if (winner.isHuman) {
      const profile = loadPlayerProfile();
      const previousLevel = profile.level;
      profile.totalWins += 1;
      profile.level = computeProfileLevel(profile.totalWins);
      savePlayerProfile(profile);
      renderPlayerProfileHud();
      return profile.level > previousLevel
        ? { kind: 'human', level: profile.level, name: 'You' }
        : null;
    }
    if (winner.characterId) {
      const profile = loadAiProfile(winner.characterId);
      const previousLevel = profile.level;
      profile.totalWins += 1;
      profile.level = computeProfileLevel(profile.totalWins);
      saveAiProfile(winner.characterId, profile);
      return profile.level > previousLevel
        ? { kind: 'ai', level: profile.level, name: winner.name, characterId: winner.characterId }
        : null;
    }
    return null;
  }

  function renderPlayerProfileHud() {
    const profile = loadPlayerProfile();
    if (els.playerLevelLabel) {
      els.playerLevelLabel.textContent = `Lv ${profile.level}`;
    }
  }

  function buildPlayerProfileHtml() {
    const profile = loadPlayerProfile();
    const progress = getProfileProgress(profile.totalWins);
    const rivals = (window.Big2GoAICharacters?.pool || []).map(character => {
      const rivalProfile = loadAiProfile(character.id);
      const rivalProgress = getProfileProgress(rivalProfile.totalWins);
      return `
        <div class="modal-row profile-rival-row">
          <strong>${character.name}</strong>
          <span>Lv ${rivalProfile.level} · ${rivalProfile.totalWins} wins · ${rivalProgress.current}/${rivalProgress.target}</span>
        </div>`;
    }).join('');
    return `
      <div class="profile-modal">
        <div class="modal-row"><strong>You</strong><span>Level ${profile.level}</span></div>
        <div class="modal-row"><strong>Total Wins</strong><span>${profile.totalWins}</span></div>
        <div class="modal-row"><strong>Next Level</strong><span>${progress.current} / ${progress.target} wins</span></div>
        <p class="profile-note">Every ${WINS_PER_LEVEL} wins levels you up.</p>
        ${rivals ? `<div class="profile-rivals"><h3>Rival Levels</h3>${rivals}</div>` : ''}
      </div>`;
  }

  function showPlayerProfilePanel() {
    showHelp('Player Profile', buildPlayerProfileHtml());
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
      joinLogs.push(`${character.name} joins the table with 🪙 ${STARTING_COINS} coins.`);
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
    pop.textContent = text;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1250);
  }

  function paySinglePlayerEntry(playerCount) {
    if (state.coins.balance < ENTRY_FEE_COINS) {
      showOracle('Need more virtual coins', `You need 🪙 ${ENTRY_FEE_COINS} entertainment coins to start. Daily free coins are a good next retention feature.`);
      return false;
    }
    setCoinBalance(state.coins.balance - ENTRY_FEE_COINS);
    state.coins.prizePool = playerCount * ENTRY_FEE_COINS;
    state.coins.entryPaid = true;
    state.coins.paidOut = false;
    animateCoins('entry', ENTRY_FEE_COINS);
    showCoinPop(`Entry fee: 🪙 ${ENTRY_FEE_COINS}`);
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
      showCoinPop(`+🪙 ${prize}`);
    } else if (winner?.characterId) {
      const nextBalance = getAiCoinBalance(winner.characterId) + prize;
      setAiCoinBalance(winner.characterId, nextBalance);
      winner.coins = nextBalance;
      animateCoins('entry', ENTRY_FEE_COINS);
      showCoinPop(`Good Game! -🪙 ${ENTRY_FEE_COINS}`);
    } else {
      animateCoins('entry', ENTRY_FEE_COINS);
      showCoinPop(`Good Game! -🪙 ${ENTRY_FEE_COINS}`);
    }
    return prize;
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
    requestAnimationFrame(() => pop.classList.add('show'));
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
      name: 'You',
      emoji,
      playerIndex: state.humanIndex
    });
    window.Big2GoAIReactions?.onHumanEmojiReaction?.(emoji, state);
  }

  async function sendLiveRoomReaction(emoji) {
    if (!state.liveRoom?.code) return;
    const now = Date.now();
    if (now - state.lastReactionSentAt < 700) return;
    state.lastReactionSentAt = now;
    const result = await sendLiveRoomMessage({ type: 'room:reaction', emoji });
    if (result?.reactions) processReactions(result.reactions);
  }

  function sendPlayerReaction(emoji) {
    const normalized = normalizeReactionEmoji(emoji);
    if (!normalized) return;
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
    unlockAudio().then(ctx => {
      if (!ctx) return;
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
    });
  }

  function getAudioContext() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!audio.context) {
      audio.context = new Ctor();
      audio.master = audio.context.createGain();
      audio.master.gain.value = Math.max(0, Math.min(1, state.soundVolume || .72)) * 0.24;
      audio.master.connect(audio.context.destination);
    }
    return audio.context;
  }

  async function unlockAudio() {
    if (!state.sound) return null;
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }
    return ctx;
  }

  function playTone(freq, duration, type = 'sine', gain = 0.04, when = 0, detune = 0) {
    const ctx = getAudioContext();
    if (!ctx || !state.sound) return;
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
    amp.connect(audio.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function playChord(freqs, duration, type = 'triangle', gain = 0.035, when = 0) {
    freqs.forEach(freq => playTone(freq, duration, type, gain, when));
  }

  function playNoise(duration = 0.08, gain = 0.025, when = 0, filterFreq = 1200) {
    const ctx = getAudioContext();
    if (!ctx || !state.sound) return;
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
    amp.connect(audio.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function playUiSound(kind) {
    if (!state.sound) return;
    unlockAudio().then(ctx => {
      if (!ctx) return;
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
        win: [
          { noise: true, d: .1, w: 0, g: .028, ff: 2800 },
          { f: 523.25, d: .12, w: .02, type: 'triangle', g: .038 },
          { f: 659.25, d: .12, w: .12, type: 'triangle', g: .038 },
          { f: 783.99, d: .14, w: .22, type: 'triangle', g: .04 },
          { f: 1046.5, d: .16, w: .34, type: 'sine', g: .032 },
          { chord: [659.25, 783.99, 1046.5, 1318.51], d: .36, w: .48, type: 'sine', g: .02 }
        ]
      };
      const plan = sequences[kind] || sequences.click;
      plan.forEach(step => {
        if (step.noise) playNoise(step.d, step.g, step.w, step.ff);
        else if (step.chord) playChord(step.chord, step.d, step.type, step.g, step.w);
        else playTone(step.f, step.d, step.type, step.g, step.w);
      });
    });
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

  function recordSessionMatchResult(winner, coinPrize = 0) {
    state.playSession.gamesPlayed += 1;
    state.playSession.lastWinner = winner || null;
    if (winner?.isHuman) {
      state.playSession.wins += 1;
      state.playSession.coinsEarned += Math.max(0, Number(coinPrize) || 0);
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
        <strong>🪙 ${summary.coinsEarned}</strong>
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
      empty.textContent = 'The table is quiet — see you at the next match.';
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
      message.textContent = `"${entry.message || 'Great game!'}"`;
      copy.append(name, message);
      row.append(avatar, copy);
      els.sessionFarewells.appendChild(row);
    });
  }

  function showSessionCompleteScreen() {
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

  function showVictoryCelebration(winner, coinPrize = state.coins.prizePool || 0, levelUp = null) {
    const existing = document.querySelector('#victory-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.className = 'victory-overlay';

    const card = document.createElement('div');
    card.className = 'victory-card';

    const isLiveRoom = Boolean(state.liveRoom?.code && state.liveRoom?.playerId);
    const isRoomHost = Boolean(isLiveRoom && state.liveRoom.hostId === state.liveRoom.playerId);
    const rivalCopy = !isLiveRoom ? window.Big2GoAICharacters?.getRivalVictoryCopy?.(winner, state) : null;

    const badge = document.createElement('div');
    badge.className = 'victory-badge';
    badge.textContent = rivalCopy
      ? (winner.isHuman ? 'Victory' : 'Defeat')
      : (winner.isHuman ? 'Big2Go Champion' : 'Big2Go Match Over');

    const title = document.createElement('h2');
    title.className = 'victory-title';
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

    let rivalPanel = null;
    if (rivalCopy) {
      rivalPanel = document.createElement('div');
      rivalPanel.className = `victory-rival victory-rival--${rivalCopy.character.id}`;

      const rivalHead = document.createElement('div');
      rivalHead.className = 'victory-rival-head';

      const rivalAvatar = document.createElement('div');
      rivalAvatar.className = 'victory-rival-avatar character-avatar';
      rivalAvatar.setAttribute('aria-hidden', 'true');
      window.Big2GoAICharacters?.renderAvatar(rivalAvatar, rivalCopy.character, {
        className: 'character-avatar',
        imgClassName: 'character-avatar-img'
      });

      const rivalSpeaker = document.createElement('strong');
      rivalSpeaker.className = 'victory-rival-speaker';
      rivalSpeaker.textContent = rivalCopy.speakerLabel;

      rivalHead.appendChild(rivalAvatar);
      rivalHead.appendChild(rivalSpeaker);

      const rivalQuote = document.createElement('p');
      rivalQuote.className = 'victory-rival-quote';
      rivalQuote.textContent = `"${rivalCopy.quote}"`;

      rivalPanel.appendChild(rivalHead);
      rivalPanel.appendChild(rivalQuote);
    }

    const stats = document.createElement('div');
    stats.className = 'victory-stats';
    stats.innerHTML = `<span>+🪙 ${coinPrize}</span><span>${state.sparks} sparks</span><span>${state.players.length} players</span>`;

    const rewards = document.createElement('div');
    rewards.className = 'victory-rewards';
    rewards.innerHTML = winner.isHuman
      ? `<div class="reward-line">🪙 +${coinPrize} virtual gold coins</div><div class="reward-line">✨ Arcade tokens only — no cash value</div>`
      : `<div class="reward-line">Good Game! -🪙 ${ENTRY_FEE_COINS}</div><div class="reward-line">These are entertainment coins only — rematch anytime</div>`;

    let levelUpPanel = null;
    if (levelUp) {
      levelUpPanel = document.createElement('div');
      levelUpPanel.className = 'victory-level-up';
      levelUpPanel.textContent = levelUp.kind === 'human'
        ? `⬆️ Level Up! You reached Level ${levelUp.level}`
        : `⬆️ ${levelUp.name} reached Level ${levelUp.level}`;
    }

    const actions = document.createElement('div');
    actions.className = 'victory-actions';

    const newButton = document.createElement('button');
    newButton.className = 'primary';
    newButton.textContent = isLiveRoom
      ? (isRoomHost ? 'Start Room Rematch' : 'Waiting for Host')
      : (rivalCopy?.rematchLabel || 'New Game');
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
    shareButton.textContent = winner.isHuman ? 'Share Win' : 'Back to Menu';
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
    endButton.textContent = '🏠 Back to Home';
    endButton.addEventListener('click', () => goBackToHomeFromVictory());

    const exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.className = 'secondary';
    exitButton.textContent = '🚪 Exit Game';
    exitButton.addEventListener('click', () => showGameResultStoryFromVictory());

    actions.classList.add('victory-actions--quad');
    actions.appendChild(newButton);
    actions.appendChild(shareButton);
    actions.appendChild(endButton);
    actions.appendChild(exitButton);
    card.appendChild(badge);
    card.appendChild(title);
    if (!rivalCopy) card.appendChild(message);
    if (rivalPanel) card.appendChild(rivalPanel);
    card.appendChild(stats);
    card.appendChild(rewards);
    if (levelUpPanel) card.appendChild(levelUpPanel);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function announceVictory(winner) {
    state.gameOver = true;
    state.busy = false;
    cancelAiTimer();
    window.Big2GoAIReactions?.clearHumanIdleTimer(true);
    clearSelection();
    clearSave();
    const coinPrize = state.liveRoom ? (state.coins.prizePool || 0) : paySinglePlayerPrize(winner);
    recordSessionMatchResult(winner, coinPrize);
    const levelUp = recordProfileWin(winner);
    state.lastMatchStory = captureMatchStory(winner, coinPrize);
    if (!state.liveRoom?.code) saveCoinBalance();
    renderConfetti(winner.isHuman ? 56 : 42);
    playUiSound(winner.isHuman ? 'win' : 'pass');
    window.Big2GoAIReactions?.onVictory(winner, state);
    showVictoryCelebration(winner, coinPrize, levelUp);
    render();
  }

  function showHelp(title, text) {
    els.helpTitle.textContent = title;
    const html = String(text || '');
    els.helpText.innerHTML = /<\/?[a-z][\s\S]*>/i.test(html) ? html : `<p>${html}</p>`;
    els.helpDialog.showModal();
  }

  function showOracle(title, message) {
    showHelp(title, message);
  }

  function showSettingsPanel() {
    showHelp('Big2Go Settings', `
      <div class="settings-modal">
        <label>Sound Volume <strong id="sound-volume-label">${Math.round(state.soundVolume * 100)}%</strong></label>
        <input id="sound-volume-range" type="range" min="0" max="100" value="${Math.round(state.soundVolume * 100)}" />
        <label>Voice Chat Volume <strong id="voice-volume-label">${Math.round(state.voiceVolume * 100)}%</strong></label>
        <input id="voice-volume-range" type="range" min="0" max="100" value="${Math.round(state.voiceVolume * 100)}" />
        <p class="settings-note">Gameplay sounds are clearer on mobile speaker. Voice chat stays separate.</p>
      </div>`);
    setTimeout(() => {
      const soundRange = document.querySelector('#sound-volume-range');
      const voiceRange = document.querySelector('#voice-volume-range');
      soundRange?.addEventListener('input', () => { state.soundVolume = Number(soundRange.value) / 100; document.querySelector('#sound-volume-label').textContent = `${soundRange.value}%`; saveSoundSettings(); });
      voiceRange?.addEventListener('input', () => { state.voiceVolume = Number(voiceRange.value) / 100; document.querySelector('#voice-volume-label').textContent = `${voiceRange.value}%`; saveSoundSettings(); });
    }, 0);
  }

  function createPlayers(count, aiCast = null) {
    const cast = aiCast || window.Big2GoAICharacters?.pickRandom(Math.max(0, count - 1)) || [];
    state.players = [];
    for (let i = 0; i < count; i += 1) {
      if (i === 0) {
        state.players.push({
          name: 'You',
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
    unlockAudio();
    const count = Number(els.playerCount.value) || 4;
    disableVoiceChat();
    state.liveRoom = null;
    stopRoomPolling();
    cancelAiTimer();
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
    seedLastCardNotifiedFromHands();
    els.sound.textContent = '🔊';
    showGameScreen();
    updateHeat(10, 'The opening player can lead any valid Big Two hand.');
    logState(`The table begins. ${state.players[state.startingPlayer].name} holds the 3♦ and starts the game.`);
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

  function announceLastCard(playerIndex) {
    const player = state.players[playerIndex];
    if (!player || player.finished || player.hand.length !== 1) return;
    state.lastCardNotified = state.lastCardNotified || new Set();
    const key = playerLastCardKey(player, playerIndex);
    if (state.lastCardNotified.has(key)) return;
    state.lastCardNotified.add(key);
    const note = player.isHuman
      ? 'You are on your LAST CARD — be careful!'
      : `${player.name} is on their LAST CARD!`;
    logState(`⚠️ ${note}`);
    updateHeat(12, player.isHuman ? 'Last card — finish strong!' : `${player.name} has 1 card left — watch out!`);
    playUiSound('turn');
  }

  function syncLiveLastCardFromGame(game) {
    if (!game?.players?.length) return;
    state.lastHandCounts = state.lastHandCounts || {};
    state.lastCardNotified = state.lastCardNotified || new Set();
    game.players.forEach((player, index) => {
      const count = index === game.playerIndex
        ? (game.hand?.length || 0)
        : (Number(player.handCount) || 0);
      const key = player.id || String(index);
      const prev = state.lastHandCounts[key];
      if (count === 1 && prev !== 1 && !player.finished) {
        state.lastCardNotified.add(key);
        const label = index === game.playerIndex ? 'You' : player.name;
        updateHeat(12, `${label} ${index === game.playerIndex ? 'have' : 'has'} 1 card left — watch out!`);
        playUiSound('turn');
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
      if (state.trick.play) return `Beat ${describePlay(state.trick.play)} or pass`;
      return state.firstTrick ? 'Your Turn · Play 3♦ opening' : 'Your Turn · Play any combo';
    }
    const result = validateHumanPlay(cards);
    if (result.ok) return `${describePlay(result.play)} · can play`;
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
      ? `Beat ${describePlay(state.trick.play)}`
      : (state.firstTrick ? 'Opening hand' : 'You lead');
    els.playerLeftCount.textContent = String(cardsLeft(human));
    els.roundCount.textContent = String(state.round);
    els.trickCount.textContent = state.trick.play ? String(state.trick.play.count) : 'Open';
    els.turnLabel.textContent = state.gameOver ? 'Game over' : `${current.isHuman ? 'Your' : current.name + '\'s'} turn`;
    els.tableSubtitle.textContent = state.gameOver ? 'Match finished.' : `${requirement} · Round ${state.round} · Sparks ${state.sparks}`;
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
      const name = document.createElement('div');
      name.className = 'opponent-name';
      const playerLevel = !state.liveRoom?.code ? getProfileLevelForPlayer(player) : null;
      name.textContent = playerLevel
        ? `${isSelf ? 'You' : player.name} · Lv ${playerLevel}`
        : (isSelf ? 'You' : player.name);
      const stats = document.createElement('div');
      stats.className = 'opponent-stats';
      const coins = document.createElement('span');
      coins.className = 'opponent-coins';
      coins.textContent = `🪙 ${playerCoins(player, index)}`;
      const cards = document.createElement('span');
      cards.className = 'opponent-cards';
      cards.textContent = player.finished ? 'Out' : `${player.hand.length} cards`;
      const online = document.createElement('span');
      online.className = 'opponent-online';
      online.setAttribute('aria-label', player.connected === false ? 'Offline' : 'Online');
      stats.appendChild(coins);
      stats.appendChild(cards);
      stack.appendChild(name);
      stack.appendChild(stats);
      if (isLastCard) renderLastCardBadge(stack, '1 LEFT');
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
      els.trickPlay.textContent = state.firstTrick ? OPENING_LINE : 'The table is open — lead any legal hand.';
      els.trickMeta.textContent = '';
      return;
    }
    els.trickPlay.classList.remove('empty');
    state.trick.play.cards.forEach(card => {
      const tile = renderCardTile(card, false);
      tile.disabled = true;
      els.trickPlay.appendChild(tile);
    });
    els.trickMeta.textContent = `${describePlay(state.trick.play)} · Led by ${state.players[state.trick.leader].name} · ${state.trick.passes} passes`;
  }

  function renderLogs() {
    els.logList.innerHTML = '';
    const entries = state.logs.length ? state.logs : ['Tap cards to begin your first Big2Go move.'];
    entries.slice(0, 6).forEach(message => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = message;
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
        entry.audio.volume = state.voice.volumes.get(playerId) ?? 1;
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
    state.voice.statuses = Array.isArray(voice) ? voice : [];
    syncVoiceConnections().catch(() => {});
    updateVoicePanel();
    renderOpponents();
    renderVoiceMixer();
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
    try {
      await audioEl.play();
    } catch (_) {
      state.voice.pendingAudioPlay = true;
    }
  }

  async function resumePendingRemoteAudio() {
    if (!state.voice.pendingAudioPlay) return;
    state.voice.pendingAudioPlay = false;
    await Promise.all([...state.voice.peers.values()].map(entry => playRemoteAudio(entry.audio)));
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
      handleVoiceSignal(entry.from, entry.signal).catch(() => {});
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
      if (!entry.audio) {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.srcObject = stream;
        audioEl.volume = state.voice.volumes.get(playerId) ?? state.voiceVolume ?? 0.9;
        audioEl.muted = state.voice.speakerMuted || state.voice.mutedPlayers.has(playerId);
        entry.audio = audioEl;
        (els.remoteAudio || document.body).appendChild(audioEl);
      } else if (entry.audio.srcObject !== stream) {
        entry.audio.srcObject = stream;
      }
      playRemoteAudio(entry.audio);
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

  async function syncVoiceConnections() {
    if (!state.liveRoom?.code || !('RTCPeerConnection' in window)) return;
    await fetchVoiceIceServers().catch(() => {});
    const peers = voicePeerIds();
    for (const id of peers) {
      if (!state.voice.peers.has(id)) await createVoicePeer(id).catch(() => {});
    }
    if (!state.voice.enabled) return;
    for (const id of peers) {
      if (!shouldInitiateVoiceCall(id)) continue;
      const entry = state.voice.peers.get(id);
      const connectionState = entry?.pc?.connectionState;
      if (connectionState === 'connected' || connectionState === 'connecting') continue;
      await callVoicePeer(id).catch(() => {});
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
      els.selectedCount.textContent = '0 selected';
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
    els.selectedCount.textContent = `${state.selected.size} selected`;
    document.querySelector('.hand-head h2')?.setAttribute('data-count', String(human.hand.length));
    const handCard = document.querySelector('.hand-card');
    const handHead = document.querySelector('.hand-head');
    handHead?.querySelector('.last-card-badge--you')?.remove();
    if (!state.gameOver && human.hand.length === 1) {
      handCard?.classList.add('last-card');
      if (handHead) renderLastCardBadge(handHead, 'LAST CARD', 'last-card-badge--you');
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
      els.hint.disabled = !humanTurn;
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
      els.hint.disabled = true;
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
    if (!play) return { ok: false, reason: 'That selection is not a valid Big Two hand.' };
    if (state.trick.play && !playBeats(play, state.trick)) {
      return { ok: false, reason: `You must beat ${describePlay(state.trick.play)} with a stronger hand of the same size.` };
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
    const deck = ORACLE[play.kind] || ORACLE.single;
    return deck[Math.floor(Math.random() * deck.length)];
  }

  function applyPlay(playerIndex, cards, source = 'played') {
    const player = state.players[playerIndex];
    removeCardsFromHand(player, cards);
    const play = buildPlay(cards, state.settings);
    advanceTurnAfterPlay(playerIndex, play);
    const comment = playComment(play);
    logState(`${player.name} ${source} ${describePlay(play)}. ${comment}`);
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
    if (player.hand.length === 2) updateHeat(7, `${player.name} is down to 2 cards.`);
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
    logState(`${state.players[playerIndex].name} passed. The table keeps moving.`);
    playUiSound('pass');
    if (state.trick.passes >= state.players.length - 1) {
      const leader = state.trick.leader;
      if (!state.liveRoom) {
        window.Big2GoAIReactions?.onTrickWon(leader, state);
      }
      state.currentPlayer = leader;
      state.trick = { play: null, leader, passes: 0 };
      state.round += 1;
      logState(`${state.players[leader].name} claimed the trick and opens a fresh table line.`);
      updateHeat(10, 'A fresh trick means a fresh crowd cheer.');
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

  function pickSmallLead(candidates) {
    return candidates.slice().sort((a, b) => {
      const aWeight = a.cards.length * 100 + (FIVE_KIND_ORDER[a.kind] || 0) * 10 + a.score[1];
      const bWeight = b.cards.length * 100 + (FIVE_KIND_ORDER[b.kind] || 0) * 10 + b.score[1];
      if (aWeight !== bWeight) return aWeight - bWeight;
      return compareScores(a.score, b.score);
    })[0];
  }

  function pickBeatMove(candidates, handSize, playingStyle) {
    const sorted = candidates.slice().sort((a, b) => {
      const aKind = FIVE_KIND_ORDER[a.kind] || a.cards.length;
      const bKind = FIVE_KIND_ORDER[b.kind] || b.cards.length;
      let aSizeBias;
      let bSizeBias;

      if (playingStyle === 'aggressive' || (playingStyle === 'funny' && Math.random() < 0.35)) {
        aSizeBias = handSize <= 5 ? -a.cards.length * 4 : a.cards.length;
        bSizeBias = handSize <= 5 ? -b.cards.length * 4 : b.cards.length;
      } else if (playingStyle === 'smart' || playingStyle === 'friendly') {
        aSizeBias = a.cards.length * 3 + aKind;
        bSizeBias = b.cards.length * 3 + bKind;
      } else {
        aSizeBias = handSize <= 5 ? -a.cards.length * 3 : a.cards.length * 2;
        bSizeBias = handSize <= 5 ? -b.cards.length * 3 : b.cards.length * 2;
      }

      const aScore = aKind * 100 + aSizeBias + a.score[1];
      const bScore = bKind * 100 + bSizeBias + b.score[1];
      if (aScore !== bScore) return aScore - bScore;
      return compareScores(a.score, b.score);
    });
    return sorted[0];
  }

  function pickAIMove(hand, playingStyle = 'smart') {
    const candidates = legalCandidates(hand);
    if (!candidates.length) return null;

    if (playingStyle === 'funny' && Math.random() < 0.24) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    const leadMode = !state.trick.play;
    const handSize = hand.length;
    const style = playingStyle || 'smart';

    if (leadMode) {
      const moodRoll = Math.random();
      const bigThreshold = style === 'aggressive'
        ? 0.5
        : style === 'friendly'
          ? 0.9
          : style === 'funny'
            ? 0.7
            : 0.78;
      if (handSize <= 5 || moodRoll > bigThreshold) {
        return pickBigLead(candidates);
      }
      return pickSmallLead(candidates);
    }

    return pickBeatMove(candidates, handSize, style);
  }

  function chooseHint() {
    playUiSound('click');
    const hand = getHumanPlayer().hand;
    const chosen = pickAIMove(hand);
    if (!chosen) {
      showOracle('Oracle says no', 'You cannot beat the current trick with your hand. Pass and wait for the table to reset.');
      return;
    }
    state.selected = new Set(chosen.cards.map(card => card.id));
    render();
    showOracle('Oracle hint', `Try ${describePlay(chosen)}.`);
  }

  function scheduleAiTurn() {
    cancelAiTimer();
    if (state.liveRoom || state.gameOver || state.busy || state.currentPlayer === state.humanIndex) return;
    state.aiTimer = setTimeout(() => {
      state.aiTimer = null;
      takeAiTurn();
    }, 520 + Math.random() * 360);
  }

  function takeAiTurn() {
    if (state.gameOver || state.busy || state.currentPlayer === state.humanIndex) return;
    const index = state.currentPlayer;
    const player = state.players[index];
    const move = pickAIMove(player.hand, player.playingStyle);
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
    }, 1800);
    fetchLiveRoomState().catch(() => {});
    startVoiceSignalPolling();
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
    if (game.round === 1 && game.firstTrick && !game.trick?.play && shuffleKey !== state.lastShuffleKey) {
      state.lastShuffleKey = shuffleKey;
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
    if (roleEl) roleEl.textContent = isHost ? 'You are Host' : myPlayerId ? 'You joined as Friend' : 'Create or join a room';
    if (copyEl) copyEl.disabled = !hasCode;
    if (shareEl) shareEl.disabled = !hasCode;
    if (playersEl) {
      playersEl.innerHTML = '';
      room.players.forEach((player, index) => {
        const item = document.createElement('li');
        const displayName = player.id === myPlayerId ? 'You' : player.name;
        const tags = [];
        if (player.id === room.hostId) tags.push('Host');
        if (player.connected === false) tags.push(player.timedOut ? 'Timed out' : 'Disconnected');
        else tags.push('Online');
        item.textContent = `${index + 1}. ${displayName} · 🪙 ${Number.isFinite(player.coins) ? player.coins : STARTING_COINS}${tags.length ? ` · ${tags.join(' · ')}` : ''}`;
        if (player.connected === false) item.dataset.left = 'true';
        playersEl.appendChild(item);
      });
    }
    if (startEl) {
      startEl.hidden = Boolean(myPlayerId && !isHost);
      startEl.disabled = !isHost || room.status === 'playing';
      startEl.textContent = room.status === 'playing' ? 'Game Started' : room.playerCount >= 2 ? 'Start Game' : 'Sync / Start';
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
          handleVoiceSignal(message.from, message.signal).catch(() => {});
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

    createButton?.addEventListener('click', async () => {
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
    });

    joinButton?.addEventListener('click', async () => {
      const code = String(input?.value || inviteCode || savedCode || '').trim();
      await joinRoomFromModal(code, playerName(), { joinButton, input });
    });

    startButton?.addEventListener('click', async () => {
      startButton.disabled = true;
      setRoomStatus('Syncing room and starting…', 'waiting');
      await fetchLiveRoomState().catch(() => null);
      const started = await sendLiveRoomMessage({ type: 'room:start' });
      if (!started) startButton.disabled = false;
    });

    copyButton?.addEventListener('click', async () => {
      const code = document.querySelector('#room-code-display')?.textContent?.trim();
      if (!code || code === '-----') return;
      try {
        await navigator.clipboard.writeText(code);
        setRoomStatus('Code copied. Send it to your friend.', 'ready');
      } catch (_) {
        setRoomStatus(`Code: ${code}`, 'ready');
      }
    });

    shareButton?.addEventListener('click', async () => {
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
    });
  }

  function showPrivateRoom(inviteCode = null) {
    state.pendingRoomInvite = isValidRoomCode(inviteCode) ? normalizeRoomCode(inviteCode) : null;

    const saved = getRoomSession();
    const savedCode = saved?.code && isValidRoomCode(saved.code) ? saved.code : null;
    const reconnectMode = Boolean(savedCode && !state.liveRoom?.code && !state.pendingRoomInvite);
    const invited = Boolean(state.pendingRoomInvite);
    const introCopy = reconnectMode
      ? `You have a saved seat in room <strong>${savedCode}</strong>. Tap <strong>Rejoin Room</strong> to pick up where you left off.`
      : invited
      ? `You were invited to room <strong>${state.pendingRoomInvite}</strong>. Enter your name below and tap <strong>Join</strong>.`
      : 'Create a room, send the invite link, then start as soon as 1 friend joins.';

    showHelp('Private Room', `
      <div class="room-modal room-simple${invited ? ' room-invite-mode' : ''}${reconnectMode ? ' room-reconnect-mode' : ''}">
        <p class="room-copy">${introCopy}</p>
        <div class="room-role-pill" id="room-role">${reconnectMode ? 'Reconnect' : invited ? 'Friend Invite' : 'Create or join a room'}</div>
        <label class="room-join-label" for="room-name-input">Your name</label>
        <input class="room-name-input" id="room-name-input" maxlength="18" autocomplete="nickname" placeholder="Your name" aria-label="Your player name" value="${reconnectMode && saved?.playerName ? saved.playerName.replace(/"/g, '&quot;') : ''}" />
        <div class="room-code-card">
          <span>Room Code</span>
          <strong id="room-code-display">${invited ? state.pendingRoomInvite : reconnectMode ? savedCode : '-----'}</strong>
        </div>
        <div class="room-actions"${invited || reconnectMode ? ' hidden' : ''}>
          <button type="button" class="primary" id="room-create-button">Create Room</button>
          <button type="button" class="secondary" id="room-copy-button" disabled>Copy Code</button>
          <button type="button" class="secondary" id="room-share-button" disabled>Share Link</button>
        </div>
        <label class="room-join-label" for="room-code-input">${reconnectMode ? 'Your room' : 'Friend code'}</label>
        <div class="room-join-row">
          <input id="room-code-input" maxlength="5" inputmode="text" autocomplete="off" placeholder="ABCDE" aria-label="Enter room code" value="${invited ? state.pendingRoomInvite : reconnectMode ? savedCode : ''}"${invited ? ' readonly' : ''} />
          <button type="button" class="primary" id="room-join-button">${reconnectMode ? 'Rejoin Room' : invited ? 'Join Room' : 'Join'}</button>
        </div>
        <div class="room-live-row">
          <span>Players joined</span>
          <strong id="room-player-count">0</strong>
        </div>
        <button type="button" class="primary room-start" id="room-start-button" disabled>Start Game</button>
        <p id="room-status" class="room-status" data-tone="neutral">${reconnectMode ? 'Tap Rejoin Room to restore your saved seat.' : invited ? 'Enter your name, then tap Join Room.' : 'Create a room or enter your friend’s code.'}</p>
        <ul id="room-player-list" class="room-player-list"></ul>
      </div>`);
    setTimeout(attachRoomModalEvents, 0);
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
      logState(`You played ${describePlay(play)}. ${comment}`);
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

  function bindEvents() {
    els.start.addEventListener('click', newGame);
    els.continue.addEventListener('click', () => {
      unlockAudio();
      if (!restoreGame()) newGame();
    });
    els.rules.addEventListener('click', () => showHelp('How to Play', RULES_HTML));
    els.privateRoom?.addEventListener('click', () => showPrivateRoom());
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
      button.addEventListener('click', () => sendRoomChat(button.dataset.chatQuick || button.textContent || ''));
    });
    document.querySelector('#profile-button')?.addEventListener('click', showPlayerProfilePanel);
    document.querySelectorAll('[data-home-tab]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-home-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
        const tab = button.dataset.homeTab;
        const copy = {
          play: ['Play', '<p>Choose your table and tap <strong>PLAY NOW</strong> to start a fast Big Two match.</p>'],
          rank: ['Rank Ladder', '<div class="rank-modal"><div class="modal-row"><strong>Bronze III</strong><span>145 / 250 RP</span></div><div class="modal-row"><strong>Next Rank</strong><span>Bronze II</span></div><div class="modal-row"><strong>Reward</strong><span>Gold Trim Card Back</span></div></div>'],
          rewards: ['Rewards', '<div class="reward-modal"><div class="modal-row"><strong>Daily Chest</strong><span>Ready</span></div><div class="modal-row"><strong>Win Chest</strong><span>2 / 5 wins</span></div><div class="modal-row"><strong>Today\'s Goal</strong><span>Win 1 match</span></div></div>'],
          profile: ['Profile', buildPlayerProfileHtml()]
        }[tab] || ['Big2Go', '<p>Play fast Big Two battles and climb the table.</p>'];
        showHelp(copy[0], copy[1]);
      });
    });
    document.querySelector('#settings-button')?.addEventListener('click', showSettingsPanel);
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
    els.sound.addEventListener('click', () => {
      state.sound = !state.sound;
      els.sound.textContent = state.sound ? '🔊' : '🔇';
      playUiSound('click');
      saveGame();
    });
    els.play.addEventListener('click', playSelectedCards);
    els.pass.addEventListener('click', humanPass);
    els.hint.addEventListener('click', chooseHint);
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
    window.addEventListener('pagehide', () => {
      if (!state.liveRoom?.code) saveCoinBalance();
    });
    updateContinueButton();
    updatePlayerChoiceUI();
    els.helpText.innerHTML = RULES_HTML;
    els.helpTitle.textContent = 'How to Play';
    els.turnLabel.textContent = 'Ready';
    els.heatText.textContent = 'The Big2Go crowd is waiting for a spark.';
    els.heatValue.textContent = '0%';
    els.heatFill.style.width = '0%';
    renderLogs();
    renderPlayerProfileHud();
    showHomeScreen();
    renderRoomRecovery();
    verifySavedRoomSession()
      .catch(() => {})
      .finally(() => {
        if (!state.liveRoom?.code) handleRoomInviteLink();
      });
    if (localStorage.getItem(SAVE_KEY)) els.continue.classList.remove('hidden');
  }

  init();
})();
