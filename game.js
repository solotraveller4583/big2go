(() => {
  'use strict';

  const SAVE_KEY = 'big2go-save-v1';
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
  const AI_NAMES = ['Lantern Bot', 'Drum Bot', 'Smoke Bot'];
  const FIVE_KIND_ORDER = { 'straight': 1, 'flush': 2, 'full-house': 3, 'four-kind': 4, 'straight-flush': 5 };
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
  const OPENING_LINE = '3♦ holder starts — play any valid opening hand.';

  const state = {
    settings: { players: 4 },
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
    sound: true,
    gameOver: false,
    busy: false,
    sortMode: 'rank',
    aiTimer: null,
    confettiLayer: null,
    roomSocket: null,
    roomPollTimer: null,
    liveRoom: null
  };

  const audio = {
    context: null,
    master: null,
    victoryTimer: null
  };

  const els = {
    home: document.querySelector('#home-screen'),
    game: document.querySelector('#game-screen'),
    playerCount: document.querySelector('#player-count'),
    start: document.querySelector('#start-button'),
    continue: document.querySelector('#continue-button'),
    privateRoom: document.querySelector('#private-room-button'),
    rules: document.querySelector('#rules-button'),
    share: document.querySelector('#share-button'),
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
    selectedCount: document.querySelector('#selected-count'),
    logList: document.querySelector('#log-list'),
    helpDialog: document.querySelector('#help-dialog'),
    helpTitle: document.querySelector('#help-title'),
    helpText: document.querySelector('#help-text'),
    heatText: document.querySelector('#heat-text'),
    heatValue: document.querySelector('#heat-value'),
    heatFill: document.querySelector('#heat-fill')
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

  function buildPlay(cards) {
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

    return buildFiveCardPlay(sorted);
  }

  function buildFiveCardPlay(cards) {
    const sorted = sortCards(cards);
    const rankGroups = groupByRank(sorted);
    const suitGroups = groupBySuit(sorted);
    const uniqueRanks = [...new Set(sorted.map(card => card.rankIndex))];
    const counts = [...rankGroups.values()].map(group => group.length).sort((a, b) => b - a);
    const rankEntries = [...rankGroups.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);

    const isFlush = suitGroups.size === 1;
    const isStraight = uniqueRanks.length === 5 && uniqueRanks.every((rank, index, arr) => index === 0 || (rank === arr[index - 1] + 1 && rank < 12));

    if (isStraight && isFlush) {
      const high = highestCard(sorted);
      return { kind: 'straight-flush', count: 5, cards: sorted, score: [5, high.rankIndex, high.suitIndex] };
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

    if (isStraight) {
      const high = highestCard(sorted);
      return { kind: 'straight', count: 5, cards: sorted, score: [1, high.rankIndex, high.suitIndex] };
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
    els.home.classList.remove('hidden');
    els.game.classList.add('hidden');
  }

  function showGameScreen() {
    els.home.classList.add('hidden');
    els.game.classList.remove('hidden');
  }

  function setPlayers(count) {
    state.settings.players = count;
    state.players = [];
    for (let i = 0; i < count; i++) {
      state.players.push({
        name: i === 0 ? 'You' : AI_NAMES[i - 1] || `Bot ${i}`,
        isHuman: i === 0,
        finished: false,
        hand: []
      });
    }
  }

  function dealCards(playerCount) {
    const deck = shuffle(createDeck());
    const hands = Array.from({ length: playerCount }, () => []);
    deck.forEach((card, index) => hands[index % playerCount].push(card));
    return hands.map(sortCards);
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
        sound: state.sound,
        players: state.players.map(player => ({
          name: player.name,
          isHuman: player.isHuman,
          finished: player.finished,
          hand: player.hand.map(card => card.id)
        })),
        logs: state.logs.slice(0, 8)
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
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

      state.settings = saved.settings || { players: 4 };
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
      state.sound = saved.sound !== false;
      state.players = saved.players.map((player, index) => ({
        name: player.name || (index === 0 ? 'You' : AI_NAMES[index - 1] || `Bot ${index}`),
        isHuman: Boolean(player.isHuman),
        finished: Boolean(player.finished),
        hand: (player.hand || []).map(cardFromId).filter(Boolean)
      }));
      state.logs = Array.isArray(saved.logs) ? saved.logs.slice(0, 8) : [];
      state.selected = new Set();
      state.gameOver = false;
      state.busy = false;
      els.playerCount.value = String(state.settings.players || 4);
      els.sound.textContent = state.sound ? '🔊' : '🔇';
      showGameScreen();
      logState('The table returns from save. Pick up where you left off.');
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

  function getAudioContext() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!audio.context) {
      audio.context = new Ctor();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.05;
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
        start: [
          { f: 196, d: .07, w: 0, type: 'triangle', g: .032 },
          { f: 261.63, d: .08, w: .06, type: 'triangle', g: .034 },
          { f: 329.63, d: .09, w: .12, type: 'sine', g: .035 },
          { chord: [392, 523.25, 659.25], d: .18, w: .2, type: 'triangle', g: .018 }
        ],
        tap: [
          { f: 720, d: .035, w: 0, type: 'square', g: .018 },
          { f: 960, d: .04, w: .035, type: 'sine', g: .018 }
        ],
        play: [
          { noise: true, d: .06, w: 0, g: .018, ff: 1800 },
          { f: 392, d: .06, w: .02, type: 'triangle', g: .032 },
          { f: 587.33, d: .07, w: .08, type: 'triangle', g: .032 },
          { f: 783.99, d: .13, w: .15, type: 'sine', g: .035 },
          { chord: [523.25, 659.25, 783.99], d: .16, w: .22, type: 'triangle', g: .016 }
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
          { f: 329.63, d: .045, w: 0, type: 'triangle', g: .02 },
          { f: 440, d: .05, w: .05, type: 'triangle', g: .02 },
          { noise: true, d: .035, w: .02, g: .01, ff: 1400 }
        ],
        win: [
          { noise: true, d: .14, w: 0, g: .024, ff: 2600 },
          { f: 523.25, d: .12, w: .02, type: 'triangle', g: .034 },
          { f: 659.25, d: .12, w: .13, type: 'triangle', g: .034 },
          { f: 783.99, d: .16, w: .25, type: 'triangle', g: .036 },
          { chord: [659.25, 783.99, 1046.5], d: .32, w: .42, type: 'sine', g: .018 }
        ]
      };
      const plan = sequences[kind] || sequences.tap;
      plan.forEach(step => {
        if (step.noise) playNoise(step.d, step.g, step.w, step.ff);
        else if (step.chord) playChord(step.chord, step.d, step.type, step.g, step.w);
        else playTone(step.f, step.d, step.type, step.g, step.w);
      });
    });
  }

  function showVictoryCelebration(winner) {
    const existing = document.querySelector('#victory-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.className = 'victory-overlay';

    const card = document.createElement('div');
    card.className = 'victory-card';

    const badge = document.createElement('div');
    badge.className = 'victory-badge';
    badge.textContent = winner.isHuman ? 'Big2Go Champion' : 'Big2Go Match Over';

    const title = document.createElement('h2');
    title.className = 'victory-title';
    title.textContent = winner.isHuman ? 'You win!' : `${winner.name} wins`;

    const message = document.createElement('p');
    message.className = 'victory-message';
    message.textContent = winner.isHuman
      ? 'You emptied your hand first. The lanterns burst and the crowd cheers your name.'
      : `${winner.name} emptied their hand first. Tap New Game to try again.`;

    const stats = document.createElement('div');
    stats.className = 'victory-stats';
    stats.innerHTML = `<span>+24 RP</span><span>${state.sparks} sparks</span><span>${state.players.length} players</span>`;

    const rewards = document.createElement('div');
    rewards.className = 'victory-rewards';
    rewards.innerHTML = winner.isHuman
      ? `<div class="reward-line">🏆 Bronze III progress +24 rank points</div><div class="reward-line">🎁 Win Chest progress +1 / 5</div><div class="reward-line">⭐ Daily goal updated: Clear one table</div>`
      : `<div class="reward-line">🏆 Rematch to recover rank momentum</div><div class="reward-line">🎁 Chest progress is waiting for your next win</div>`;

    const actions = document.createElement('div');
    actions.className = 'victory-actions';

    const newButton = document.createElement('button');
    newButton.className = 'primary';
    newButton.textContent = 'New Game';
    newButton.addEventListener('click', () => {
      overlay.remove();
      newGame();
    });

    const shareButton = document.createElement('button');
    shareButton.className = 'secondary';
    shareButton.textContent = 'Share Win';
    shareButton.addEventListener('click', shareGame);

    actions.appendChild(newButton);
    actions.appendChild(shareButton);
    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(stats);
    card.appendChild(rewards);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function announceVictory(winner) {
    state.gameOver = true;
    state.busy = false;
    cancelAiTimer();
    clearSelection();
    clearSave();
    renderConfetti(winner.isHuman ? 56 : 42);
    playUiSound('win');
    showVictoryCelebration(winner);
    render();
  }

  function showHelp(title, text) {
    els.helpTitle.textContent = title;
    els.helpText.innerHTML = text.includes('<ul>') ? text : `<p>${text}</p>`;
    els.helpDialog.showModal();
  }

  function showOracle(title, message) {
    showHelp(title, message);
  }

  function createPlayers(count) {
    state.players = [];
    for (let i = 0; i < count; i++) {
      state.players.push({
        name: i === 0 ? 'You' : AI_NAMES[i - 1] || `Bot ${i}`,
        isHuman: i === 0,
        finished: false,
        hand: []
      });
    }
  }

  function newGame() {
    const count = Number(els.playerCount.value) || 4;
    state.liveRoom = null;
    stopRoomPolling();
    cancelAiTimer();
    document.querySelector('#victory-overlay')?.remove();
    createPlayers(count);
    const hands = dealCards(count);
    state.players.forEach((player, index) => {
      player.hand = hands[index];
      player.finished = false;
    });
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
    els.sound.textContent = '🔊';
    showGameScreen();
    updateHeat(10, 'The opening player can lead any valid Big Two hand.');
    logState(`The table begins. ${state.players[state.startingPlayer].name} holds the 3♦ and starts the game.`);
    render();
    saveGame();
    playUiSound('start');
    scheduleAiTurn();
  }

  function nextActivePlayer(index) {
    return (index + 1) % state.players.length;
  }

  function cardsLeft(player) {
    return player.hand.length;
  }

  function selectionFeedback() {
    const cards = selectedCards();
    if (!cards.length) {
      if (state.trick.play) return `Select cards to beat ${describePlay(state.trick.play)}, or pass.`;
      return state.firstTrick ? 'You hold 3♦. Lead any valid opening hand.' : 'You lead. Play any valid combo.';
    }
    const result = validateHumanPlay(cards);
    if (result.ok) return `${describePlay(result.play)} · can play`;
    return result.reason;
  }

  function updateStatus() {
    const human = getHumanPlayer();
    const current = state.players[state.currentPlayer];
    const requirement = state.trick.play
      ? `Beat ${describePlay(state.trick.play)}`
      : (state.firstTrick ? 'Opening hand' : 'You lead');
    els.playerLeftCount.textContent = String(cardsLeft(human));
    els.roundCount.textContent = String(state.round);
    els.trickCount.textContent = state.trick.play ? String(state.trick.play.count) : 'Open';
    els.turnLabel.textContent = state.gameOver ? 'Game over' : `${current.isHuman ? 'Your' : current.name + '\'s'} turn`;
    els.tableSubtitle.textContent = state.gameOver ? 'Match finished.' : `${requirement} · Round ${state.round} · Sparks ${state.sparks}`;
    els.trickHelp.textContent = selectionFeedback();
  }

  function renderOpponents() {
    els.opponents.innerHTML = '';
    state.players.forEach((player, index) => {
      if (index === state.humanIndex) return;
      const row = document.createElement('div');
      row.className = `opponent-row${index === state.currentPlayer && !state.gameOver ? ' current' : ''}${player.finished ? ' finished' : ''}`;
      const text = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'opponent-name';
      name.textContent = player.name;
      const meta = document.createElement('div');
      meta.className = 'opponent-meta';
      meta.textContent = player.finished ? 'Finished' : `${player.hand.length} cards left`;
      text.appendChild(name);
      text.appendChild(meta);
      const badge = document.createElement('div');
      badge.className = 'opponent-badge';
      badge.textContent = player.finished ? '✓' : String(player.hand.length);
      row.appendChild(text);
      row.appendChild(badge);
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
    for (const card of state.trick.play.cards) {
      const tile = renderCardTile(card, false);
      tile.disabled = true;
      els.trickPlay.appendChild(tile);
    }
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
    sortedHumanHand(human.hand).forEach((card, index) => {
      const tile = renderCardTile(card, true);
      tile.style.zIndex = String(index + 1);
      els.hand.appendChild(tile);
    });
    els.selectedCount.textContent = `${state.selected.size} selected`;
  }

  function render() {
    renderOpponents();
    renderTrick();
    renderHand();
    updateStatus();
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
    playUiSound('tap');
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
    const play = buildPlay(cards);
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
    const play = buildPlay(cards);
    advanceTurnAfterPlay(playerIndex, play);
    const comment = playComment(play);
    logState(`${player.name} ${source} ${describePlay(play)}. ${comment}`);
    const heatBoost = {
      single: 6, pair: 9, triple: 12, straight: 16, flush: 18, 'full-house': 24, 'four-kind': 30, 'straight-flush': 38
    }[play.kind] || 6;
    updateHeat(Math.min(heatBoost, 40), comment);
    playUiSound(player.isHuman ? 'play' : 'ai');
    if (play.count === 5) {
      sparkle(2);
      renderConfetti(14 + heatBoost / 2);
    } else {
      sparkle(1);
    }
    if (player.hand.length <= 2) updateHeat(7, `${player.name} is down to ${player.hand.length} cards.`);
    if (finishIfNeeded(playerIndex)) return;
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
      const play = buildPlay(combo);
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

  function pickAIMove(hand) {
    const candidates = legalCandidates(hand);
    if (!candidates.length) return null;
    const leadMode = !state.trick.play;
    const handSize = hand.length;

    if (leadMode) {
      const moodRoll = Math.random();
      if (handSize <= 5 || moodRoll > 0.78) {
        return candidates.slice().sort((a, b) => {
          const aKind = FIVE_KIND_ORDER[a.kind] || a.cards.length;
          const bKind = FIVE_KIND_ORDER[b.kind] || b.cards.length;
          if (aKind !== bKind) return bKind - aKind;
          if (a.cards.length !== b.cards.length) return b.cards.length - a.cards.length;
          return compareScores(b.score, a.score);
        })[0];
      }

      return candidates.slice().sort((a, b) => {
        const aWeight = a.cards.length * 100 + (FIVE_KIND_ORDER[a.kind] || 0) * 10 + a.score[1];
        const bWeight = b.cards.length * 100 + (FIVE_KIND_ORDER[b.kind] || 0) * 10 + b.score[1];
        if (aWeight !== bWeight) return aWeight - bWeight;
        return compareScores(a.score, b.score);
      })[0];
    }

    const sorted = candidates.slice().sort((a, b) => {
      const aKind = FIVE_KIND_ORDER[a.kind] || a.cards.length;
      const bKind = FIVE_KIND_ORDER[b.kind] || b.cards.length;
      const aSizeBias = handSize <= 5 ? -a.cards.length * 3 : a.cards.length * 2;
      const bSizeBias = handSize <= 5 ? -b.cards.length * 3 : b.cards.length * 2;
      const aScore = aKind * 100 + aSizeBias + a.score[1];
      const bScore = bKind * 100 + bSizeBias + b.score[1];
      if (aScore !== bScore) return aScore - bScore;
      return compareScores(a.score, b.score);
    });
    return sorted[0];
  }

  function chooseHint() {
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
    const move = pickAIMove(player.hand);
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
    const human = getHumanPlayer();
    nextSortMode();
    human.hand = sortedHumanHand(human.hand);
    state.selected = new Set();
    render();
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
    if (payload.room) renderRoomState(payload.room);
    if (payload.game) applyLiveGame(payload.game, payload.room);
    return payload;
  }

  function startRoomPolling() {
    if (state.roomPollTimer) clearInterval(state.roomPollTimer);
    state.roomPollTimer = setInterval(() => {
      fetchLiveRoomState().catch(() => {});
    }, 1800);
    fetchLiveRoomState().catch(() => {});
  }

  function stopRoomPolling() {
    if (state.roomPollTimer) clearInterval(state.roomPollTimer);
    state.roomPollTimer = null;
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
      if (payload.room) renderRoomState(payload.room);
      if (payload.game) applyLiveGame(payload.game, payload.room);
      return true;
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
      playerIndex: game.playerIndex
    };
    state.settings.players = game.players.length;
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
      name: index === game.playerIndex ? 'You' : player.name,
      isHuman: index === game.playerIndex,
      finished: Boolean(player.finished),
      hand: index === game.playerIndex
        ? (game.hand || []).map(card => cardFromId(card.id || card)).filter(Boolean)
        : Array.from({ length: Number(player.handCount) || 0 }, () => ({ id: 'hidden' }))
    }));
    state.logs = Array.isArray(game.logs) ? game.logs.slice(0, 8) : [];
    state.selected = new Set([...state.selected].filter(id => getHumanPlayer()?.hand.some(card => card.id === id)));
    state.gameOver = Boolean(game.gameOver);
    state.busy = false;
    els.playerCount.value = String(game.players.length);
    showGameScreen();
    render();
    if (game.gameOver) {
      const winner = state.players[game.winnerIndex];
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
    const isHost = Boolean(myPlayerId && room.hostId === myPlayerId);
    const hasCode = Boolean(room.code && room.code !== '-----');
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
        item.textContent = `${index + 1}. ${displayName}${tags.length ? ` · ${tags.join(' · ')}` : ''}`;
        playersEl.appendChild(item);
      });
    }
    if (startEl) {
      startEl.hidden = Boolean(myPlayerId && !isHost);
      startEl.disabled = !isHost || room.playerCount < 2 || room.status === 'playing';
      startEl.textContent = room.status === 'playing' ? 'Game Started' : 'Start Game';
    }
    const status = room.status === 'playing'
      ? 'Live game started — play from the table.'
      : room.playerCount >= 2
        ? isHost ? 'Ready — you can start now.' : 'Ready — waiting for host to start.'
        : isHost ? 'Share the code. Start unlocks when 1 friend joins.' : 'Enter a room code from your friend.';
    setRoomStatus(status, room.playerCount >= 2 ? 'ready' : 'waiting');
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
    });
    socket.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'room:update' || message.type === 'game:update') {
          if (message.room) renderRoomState(message.room);
          if (message.game) applyLiveGame(message.game, message.room);
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
      body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Could not create room');
    return response.json();
  }

  async function joinBackendRoom(code, name) {
    const response = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ code, name })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not join room');
    return payload;
  }

  function attachRoomModalEvents() {
    const createButton = document.querySelector('#room-create-button');
    const joinButton = document.querySelector('#room-join-button');
    const copyButton = document.querySelector('#room-copy-button');
    const shareButton = document.querySelector('#room-share-button');
    const startButton = document.querySelector('#room-start-button');
    const input = document.querySelector('#room-code-input');
    const nameInput = document.querySelector('#room-name-input');

    const playerName = () => String(nameInput?.value || '').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Player';

    createButton?.addEventListener('click', async () => {
      createButton.disabled = true;
      setRoomStatus('Creating private room…', 'waiting');
      try {
        const payload = await createBackendRoom(playerName());
        state.liveRoom = { code: payload.room.code, playerId: payload.playerId, playerIndex: 0 };
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
      const code = String(input?.value || '').trim().toUpperCase();
      if (!code) {
        setRoomStatus('Enter your friend’s room code first.', 'error');
        return;
      }
      joinButton.disabled = true;
      setRoomStatus('Joining room…', 'waiting');
      try {
        const payload = await joinBackendRoom(code, playerName());
        state.liveRoom = { code: payload.room.code, playerId: payload.playerId, playerIndex: Math.max(0, payload.room.playerCount - 1) };
        renderRoomState(payload.room);
        connectRoomSocket(payload.room.code, payload.playerId);
        startRoomPolling();
        if (shareButton) shareButton.disabled = false;
        playUiSound('start');
      } catch (error) {
        joinButton.disabled = false;
        setRoomStatus(error.message || 'Could not join that room.', 'error');
      }
    });

    startButton?.addEventListener('click', () => {
      startButton.disabled = true;
      setRoomStatus('Starting live game for everyone…', 'waiting');
      sendLiveRoomMessage({ type: 'room:start' });
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
      const text = `Join my Big2Go private room. Code: ${code}`;
      try {
        if (navigator.share) await navigator.share({ title: 'Big2Go Room Code', text });
        else await navigator.clipboard.writeText(code);
        setRoomStatus('Room code shared/copied. Friend only needs to enter the code.', 'ready');
      } catch (_) {
        setRoomStatus(`Share this code: ${code}`, 'ready');
      }
    });
  }

  function showPrivateRoom() {
    showHelp('Private Room', `
      <div class="room-modal room-simple">
        <p class="room-copy">Create a room, send the code, then start as soon as 1 friend joins.</p>
        <div class="room-role-pill" id="room-role">Create or join a room</div>
        <label class="room-join-label" for="room-name-input">Your name</label>
        <input class="room-name-input" id="room-name-input" maxlength="18" autocomplete="nickname" placeholder="Your name" aria-label="Your player name" />
        <div class="room-code-card">
          <span>Room Code</span>
          <strong id="room-code-display">-----</strong>
        </div>
        <div class="room-actions">
          <button type="button" class="primary" id="room-create-button">Create Room</button>
          <button type="button" class="secondary" id="room-copy-button" disabled>Copy Code</button>
          <button type="button" class="secondary" id="room-share-button" disabled>Share</button>
        </div>
        <label class="room-join-label" for="room-code-input">Friend code</label>
        <div class="room-join-row">
          <input id="room-code-input" maxlength="5" inputmode="text" autocomplete="off" placeholder="ABCDE" aria-label="Enter room code" />
          <button type="button" class="secondary" id="room-join-button">Join</button>
        </div>
        <div class="room-live-row">
          <span>Players joined</span>
          <strong id="room-player-count">0</strong>
        </div>
        <button type="button" class="primary room-start" id="room-start-button" disabled>Start Game</button>
        <p id="room-status" class="room-status" data-tone="neutral">Create a room or enter your friend’s code.</p>
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
      const play = buildPlay(cards);
      const comment = playComment(play);
      logState(`You played ${describePlay(play)}. ${comment}`);
      advanceTurnAfterPlay(state.humanIndex, play);
      playUiSound('play');
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
      if (getHumanPlayer().hand.length <= 2) updateHeat(8, `You are down to ${getHumanPlayer().hand.length} cards.`);
      if (finishIfNeeded(state.humanIndex)) {
        state.busy = false;
        return;
      }
      render();
      scheduleAiTurn();
    }, 140);
  }

  function humanPass() {
    if (!canHumanAct() || !state.trick.play) return;
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
      if (!restoreGame()) newGame();
    });
    els.rules.addEventListener('click', () => showHelp('How to Play', RULES_HTML));
    els.privateRoom?.addEventListener('click', showPrivateRoom);
    els.share.addEventListener('click', shareGame);
    document.querySelector('#profile-button')?.addEventListener('click', () => showHelp('Player Profile', '<div class="profile-modal"><div class="modal-row"><strong>Guest Pro</strong><span>Level 8</span></div><div class="modal-row"><strong>League</strong><span>Bronze III</span></div><div class="modal-row"><strong>Best Streak</strong><span>3 wins</span></div><div class="modal-row"><strong>Card Back</strong><span>Neon Starter</span></div></div>'));
    document.querySelectorAll('[data-home-tab]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-home-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
        const tab = button.dataset.homeTab;
        const copy = {
          play: ['Play', '<p>Choose your table and tap <strong>PLAY NOW</strong> to start a fast Big Two match.</p>'],
          rank: ['Rank Ladder', '<div class="rank-modal"><div class="modal-row"><strong>Bronze III</strong><span>145 / 250 RP</span></div><div class="modal-row"><strong>Next Rank</strong><span>Bronze II</span></div><div class="modal-row"><strong>Reward</strong><span>Gold Trim Card Back</span></div></div>'],
          rewards: ['Rewards', '<div class="reward-modal"><div class="modal-row"><strong>Daily Chest</strong><span>Ready</span></div><div class="modal-row"><strong>Win Chest</strong><span>2 / 5 wins</span></div><div class="modal-row"><strong>Today\'s Goal</strong><span>Win 1 match</span></div></div>'],
          profile: ['Profile', '<div class="profile-modal"><div class="modal-row"><strong>Guest Pro</strong><span>Level 8</span></div><div class="modal-row"><strong>League</strong><span>Bronze III</span></div><div class="modal-row"><strong>Collection</strong><span>3 card backs</span></div></div>']
        }[tab] || ['Big2Go', '<p>Play fast Big Two battles and climb the table.</p>'];
        showHelp(copy[0], copy[1]);
      });
    });
    document.querySelector('#settings-button')?.addEventListener('click', () => showHelp('Big2Go Settings', '<ul><li><strong>Sound:</strong> use the sound button at the table.</li><li><strong>Players:</strong> choose 2, 3, or 4 players before Play Now.</li><li><strong>Progress:</strong> Continue returns to your saved table.</li></ul>'));
    document.querySelector('#leaderboard-button')?.addEventListener('click', () => showHelp('Leaderboard', '<ul><li><strong>You</strong> are the table challenger.</li><li>Win by clearing every card first.</li><li>Online ranking can be added after launch.</li></ul>'));
    document.querySelector('#bonus-button')?.addEventListener('click', () => showHelp('Daily Bonus', '<ul><li>Come back and play a fresh Big2Go table.</li><li>Daily rewards can be connected later.</li></ul>'));
    document.querySelector('#achievements-button')?.addEventListener('click', () => showHelp('Goals', '<ul><li>Win with singles, pairs, and 5-card combos.</li><li>Try to beat the AI with fewer passes.</li></ul>'));
    els.back.addEventListener('click', () => {
      cancelAiTimer();
      state.busy = false;
      showHomeScreen();
      updateContinueButton();
    });
    els.sound.addEventListener('click', () => {
      state.sound = !state.sound;
      els.sound.textContent = state.sound ? '🔊' : '🔇';
      playUiSound('tap');
      saveGame();
    });
    els.play.addEventListener('click', playSelectedCards);
    els.pass.addEventListener('click', humanPass);
    els.hint.addEventListener('click', chooseHint);
    els.sort.addEventListener('click', sortHumanHand);
    els.restart.addEventListener('click', newGame);
    els.playerCount.addEventListener('change', () => {
      updatePlayerChoiceUI();
      updateContinueButton();
    });
    document.querySelectorAll('[data-player-choice]').forEach(button => {
      button.addEventListener('click', () => {
        els.playerCount.value = button.dataset.playerChoice || '4';
        updatePlayerChoiceUI();
        updateContinueButton();
        playUiSound('tap');
      });
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Optional offline support.
    });
  }

  function init() {
    bindEvents();
    registerServiceWorker();
    updateContinueButton();
    updatePlayerChoiceUI();
    els.helpText.innerHTML = RULES_HTML;
    els.helpTitle.textContent = 'How to Play';
    els.turnLabel.textContent = 'Ready';
    els.heatText.textContent = 'The Big2Go crowd is waiting for a spark.';
    els.heatValue.textContent = '0%';
    els.heatFill.style.width = '0%';
    renderLogs();
    showHomeScreen();
    if (localStorage.getItem(SAVE_KEY)) els.continue.classList.remove('hidden');
  }

  init();
})();
