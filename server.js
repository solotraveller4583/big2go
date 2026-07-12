'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8093);
const PUBLIC_DIR = __dirname;
const ROOM_TTL_MS = 1000 * 60 * 60 * 3;
const RECONNECT_WARNING_MS = 1000 * 30;
const RECONNECT_TIMEOUT_MS = 1000 * 60;
const MAX_PLAYERS = 4;
const STARTING_COINS = 100;
const ENTRY_FEE_COINS = 10;
const rooms = new Map();
const activeSessions = new Map();

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS = [
  { key: 'D', symbol: '♦', name: 'diamonds', color: 'red' },
  { key: 'C', symbol: '♣', name: 'clubs', color: 'black' },
  { key: 'H', symbol: '♥', name: 'hearts', color: 'red' },
  { key: 'S', symbol: '♠', name: 'spades', color: 'black' }
];
const FIVE_KIND_ORDER = { straight: 1, flush: 2, 'full-house': 3, 'four-kind': 4, 'straight-flush': 5 };
const STRAIGHT_RULES = Object.freeze({
  TRADITIONAL: 'traditional',
  ALTERNATIVE: 'alternative'
});
const DEFAULT_STRAIGHT_RULE = STRAIGHT_RULES.ALTERNATIVE;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
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
    if (String(id).startsWith(RANKS[r])) {
      const suitKey = String(id).slice(RANKS[r].length);
      const suitIndex = SUITS.findIndex(suit => suit.key === suitKey);
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
    const j = crypto.randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => a.rankIndex - b.rankIndex || a.suitIndex - b.suitIndex);
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
    { ranks: [0, 1, 2, 11, 12], highRankIndex: 2 }, // A-2-3-4-5 ranks by 5
    { ranks: [0, 1, 2, 3, 12], highRankIndex: 3 }  // 2-3-4-5-6 ranks by 6
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
    return { kind: 'four-kind', count: 5, cards: sortCards([...quad, kicker]), score: [4, rankEntries[0][0], Math.max(...quad.map(card => card.suitIndex)), kicker.rankIndex, kicker.suitIndex] };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    const tripleEntry = rankEntries.find(([, group]) => group.length === 3);
    const pairEntry = rankEntries.find(([, group]) => group.length === 2);
    const triple = tripleEntry[1].slice(0, 3);
    const pair = pairEntry[1].slice(0, 2);
    return { kind: 'full-house', count: 5, cards: sortCards([...triple, ...pair]), score: [3, tripleEntry[0], Math.max(...triple.map(card => card.suitIndex)), pairEntry[0], Math.max(...pair.map(card => card.suitIndex))] };
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

function playBeats(candidate, current) {
  if (!current || !current.play) return true;
  if (candidate.count !== current.play.count) return false;
  return compareScores(candidate.score, current.play.score) > 0;
}

function dealCards(playerCount) {
  const deck = shuffle(createDeck());
  return Array.from({ length: playerCount }, (_, index) => sortCards(deck.slice(index * 13, index * 13 + 13)));
}

function dealPrivateRoomCards(playerCount) {
  const deck = shuffle(createDeck());
  return Array.from({ length: playerCount }, (_, index) => sortCards(deck.slice(index * 13, index * 13 + 13)));
}

function sanitizeName(name, fallback) {
  const cleaned = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 18);
  return cleaned || fallback;
}

function serializePlay(play) {
  if (!play) return null;
  return {
    kind: play.kind,
    count: play.count,
    cards: play.cards.map(card => ({ ...card })),
    score: play.score.slice()
  };
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) code += alphabet[crypto.randomInt(alphabet.length)];
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate room code');
}

function sanitizeChatText(text) {
  return String(text || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

const ALLOWED_REACTIONS = new Set(['😂', '👏', '🔥', '😮', '🎉', '💪', '😎', '🙌']);

function sanitizeReaction(emoji) {
  const text = String(emoji || '').trim();
  return ALLOWED_REACTIONS.has(text) ? text : '';
}

function ensureReactionQueue(room) {
  if (!room.reactionQueues) room.reactionQueues = new Map();
  return room.reactionQueues;
}

function queueReaction(room, reaction) {
  const queues = ensureReactionQueue(room);
  for (const player of room.players) {
    const list = queues.get(player.id) || [];
    list.push(reaction);
    queues.set(player.id, list.slice(-20));
  }
}

function takeReactions(room, playerId) {
  const queues = ensureReactionQueue(room);
  const pending = queues.get(playerId) || [];
  queues.set(playerId, []);
  return pending;
}

function broadcastReaction(room, reaction) {
  for (const client of room.clients) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ type: 'room:reaction', reaction }));
    }
  }
}

function addRoomReaction(room, playerId, emoji) {
  const player = room.players.find(entry => entry.id === playerId);
  if (!player || player.connected === false) return { ok: false, error: 'Player not in room' };
  const reactionEmoji = sanitizeReaction(emoji);
  if (!reactionEmoji) return { ok: false, error: 'Invalid reaction' };
  const now = Date.now();
  if (player.lastReactionAt && now - player.lastReactionAt < 700) {
    return { ok: false, error: 'Please wait before sending another reaction' };
  }
  player.lastReactionAt = now;
  const reaction = {
    id: crypto.randomUUID(),
    playerId,
    name: player.name,
    emoji: reactionEmoji,
    at: now
  };
  queueReaction(room, reaction);
  broadcastReaction(room, reaction);
  room.updatedAt = now;
  return { ok: true, reaction };
}

function publicChat(room) {
  return (room.chat || []).slice(-30).map(message => ({ ...message }));
}

function publicVoice(room) {
  return room.players.map(player => ({
    id: player.id,
    name: player.name,
    muted: player.voiceMuted !== false,
    speaking: Boolean(player.voiceSpeaking),
    enabled: Boolean(player.voiceEnabled),
    listening: Boolean(player.voiceEnabled) && player.voiceMuted !== false,
    connected: player.connected !== false
  }));
}

function appendRoomNotice(room, text) {
  room.notice = text;
  if (room.game?.logs) room.game.logs.unshift(text);
  room.chat = [...(room.chat || []), {
    id: crypto.randomUUID(),
    playerId: 'system',
    name: 'Table',
    text,
    system: true,
    at: Date.now()
  }].slice(-30);
}

function transferHostIfNeeded(room, now = Date.now()) {
  const host = room.players.find(player => player.id === room.hostId);
  if (!host || host.connected !== false || !host.disconnectedAt || now - host.disconnectedAt < RECONNECT_TIMEOUT_MS) return false;
  const nextHost = room.players.find(player => player.connected !== false);
  if (!nextHost || nextHost.id === room.hostId) return false;
  room.hostId = nextHost.id;
  appendRoomNotice(room, `${host.name} timed out. ${nextHost.name} is now room owner.`);
  return true;
}

function processRoomTimeouts(room, now = Date.now()) {
  for (const player of room.players) {
    if (player.connected === false && player.disconnectedAt && !player.timedOut && now - player.disconnectedAt >= RECONNECT_TIMEOUT_MS) {
      player.timedOut = true;
      appendRoomNotice(room, `${player.name} has timed out. Game is paused until they return.`);
    }
  }
  transferHostIfNeeded(room, now);
  return room;
}

function publicRoom(room) {
  processRoomTimeouts(room);
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.game ? 'playing' : room.players.filter(player => player.connected !== false).length >= 2 ? 'ready' : 'waiting',
    playerCount: room.players.filter(player => player.connected !== false).length,
    maxPlayers: room.maxPlayers,
    rules: normalizeRuleConfig(room.rules),
    notice: room.notice || '',
    entryFee: ENTRY_FEE_COINS,
    prizePool: room.game?.prizePool || 0,
    reconnectWarningMs: RECONNECT_WARNING_MS,
    reconnectTimeoutMs: RECONNECT_TIMEOUT_MS,
    players: room.players.map(player => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      connected: player.connected !== false,
      disconnectedAt: player.disconnectedAt || null,
      timedOut: Boolean(player.timedOut),
      coins: Number.isFinite(player.coins) ? player.coins : STARTING_COINS
    }))
  };
}

function publicGameState(room, playerId) {
  if (!room.game) return null;
  const playerIndex = room.game.players.findIndex(player => player.id === playerId);
  if (playerIndex < 0) return null;
  const own = room.game.players[playerIndex];
  return {
    status: room.game.status,
    playerId,
    playerIndex,
    currentPlayer: room.game.currentPlayer,
    startingPlayer: room.game.startingPlayer,
    firstTrick: room.game.firstTrick,
    round: room.game.round,
    trick: {
      play: serializePlay(room.game.trick.play),
      leader: room.game.trick.leader,
      passes: room.game.trick.passes
    },
    players: room.game.players.map(player => ({
      id: player.id,
      name: player.name,
      index: player.index,
      finished: player.finished,
      handCount: player.hand.length,
      connected: room.players.find(roomPlayer => roomPlayer.id === player.id)?.connected !== false,
      coins: Number.isFinite(player.coins) ? player.coins : (room.players.find(roomPlayer => roomPlayer.id === player.id)?.coins ?? STARTING_COINS)
    })),
    hand: own.hand.map(card => ({ ...card })),
    logs: room.game.logs.slice(0, 8),
    entryFee: room.game.entryFee || ENTRY_FEE_COINS,
    prizePool: room.game.prizePool || 0,
    winnerIndex: room.game.winnerIndex,
    gameOver: room.game.status === 'finished'
  };
}

function buildActiveSession(room, playerId) {
  processRoomTimeouts(room);
  const roomPlayer = room.players.find(player => player.id === playerId);
  if (!roomPlayer) return null;
  const game = publicGameState(room, playerId);
  const playerIndex = game?.playerIndex ?? room.players.findIndex(player => player.id === playerId);
  return {
    code: room.code,
    roomId: room.code,
    playerId,
    playerName: roomPlayer.name,
    playerIndex,
    seat: playerIndex >= 0 ? playerIndex + 1 : null,
    hostId: room.hostId,
    status: room.game?.status || publicRoom(room).status,
    roomStatus: publicRoom(room).status,
    connected: roomPlayer.connected !== false,
    disconnectedAt: roomPlayer.disconnectedAt || null,
    timedOut: Boolean(roomPlayer.timedOut),
    currentPlayer: game?.currentPlayer ?? null,
    currentTurn: game ? game.players[game.currentPlayer]?.name || null : null,
    hand: game?.hand || [],
    handCount: game?.hand?.length ?? 0,
    coins: Number.isFinite(roomPlayer.coins) ? roomPlayer.coins : STARTING_COINS,
    prizePool: room.game?.prizePool || 0,
    entryFee: ENTRY_FEE_COINS,
    players: publicRoom(room).players,
    game,
    room: publicRoom(room),
    updatedAt: Date.now()
  };
}

function rememberActiveSession(room, playerId) {
  const session = buildActiveSession(room, playerId);
  if (session && session.status !== 'finished') activeSessions.set(playerId, session);
  else activeSessions.delete(playerId);
  return session;
}

function rememberRoomSessions(room) {
  for (const player of room.players) rememberActiveSession(room, player.id);
}

function forgetActiveSession(playerId) {
  activeSessions.delete(playerId);
}

function activeSessionForPlayer(playerId) {
  const saved = activeSessions.get(String(playerId || ''));
  if (!saved) return null;
  const room = rooms.get(saved.code);
  if (!room) {
    activeSessions.delete(saved.playerId);
    return null;
  }
  return rememberActiveSession(room, saved.playerId);
}

function privateRoomState(room, playerId) {
  processRoomTimeouts(room);
  const state = { room: publicRoom(room), game: publicGameState(room, playerId), chat: publicChat(room), voice: publicVoice(room), voiceSignals: takeVoiceSignals(room, playerId), reactions: takeReactions(room, playerId) };
  state.session = rememberActiveSession(room, playerId);
  return state;
}

function roomForPlayer(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (!room.players.some(player => player.id === playerId)) return { error: 'Player not in room' };
  return { room };
}

function ensureRoomSignalQueue(room) {
  if (!room.voiceSignals) room.voiceSignals = new Map();
  return room.voiceSignals;
}

function queueVoiceSignal(room, targetId, from, signal) {
  const queue = ensureRoomSignalQueue(room);
  const list = queue.get(targetId) || [];
  list.push({ from, signal, at: Date.now() });
  queue.set(targetId, list.slice(-40));
}

function takeVoiceSignals(room, playerId) {
  const queue = ensureRoomSignalQueue(room);
  const pending = queue.get(playerId) || [];
  queue.set(playerId, []);
  return pending;
}

function relayVoiceSignal(room, fromId, targetId, signal) {
  if (!targetId || !signal || typeof signal !== 'object') return { ok: false, error: 'Invalid voice signal' };
  if (!room.players.some(player => player.id === targetId)) return { ok: false, error: 'Invalid voice target' };
  queueVoiceSignal(room, targetId, fromId, signal);
  for (const client of room.clients) {
    if (client.readyState === client.OPEN && client.playerId === targetId) {
      client.send(JSON.stringify({ type: 'voice:signal', from: fromId, signal }));
    }
  }
  room.updatedAt = Date.now();
  return { ok: true };
}

function voiceIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
  const turnUrl = String(process.env.TURN_URL || '').trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: String(process.env.TURN_USERNAME || ''),
      credential: String(process.env.TURN_CREDENTIAL || '')
    });
  } else {
    servers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    });
  }
  return servers;
}

function updateVoiceState(room, playerId, voice = {}) {
  const player = room.players.find(entry => entry.id === playerId);
  if (!player || player.connected === false) return { ok: false, error: 'Player not in room' };
  player.voiceEnabled = Boolean(voice.enabled);
  player.voiceMuted = voice.muted !== false;
  player.voiceSpeaking = Boolean(voice.speaking) && player.voiceEnabled && !player.voiceMuted;
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return { ok: true };
}

function addRoomChatMessage(room, playerId, text) {
  const player = room.players.find(entry => entry.id === playerId);
  if (!player || player.connected === false) return { ok: false, error: 'Player not in room' };
  const messageText = sanitizeChatText(text);
  if (!messageText) return { ok: false, error: 'Message is empty' };
  const now = Date.now();
  if (player.lastChatAt && now - player.lastChatAt < 900) return { ok: false, error: 'Please wait before sending another message' };
  player.lastChatAt = now;
  const message = {
    id: crypto.randomUUID(),
    playerId,
    name: player.name,
    text: messageText,
    at: now
  };
  room.chat = [...(room.chat || []), message].slice(-30);
  room.updatedAt = now;
  return { ok: true, message };
}

function applyRoomAction(code, playerId, action) {
  const lookup = roomForPlayer(code, playerId);
  if (lookup.error) return { ok: false, error: lookup.error };
  const { room } = lookup;
  try {
    if (action.type === 'room:start') startRoomGame(room.code, playerId);
    else if (action.type === 'room:rejoin') {
      const result = rejoinRoom(room.code, playerId);
      if (!result.ok) return result;
    }
    else if (action.type === 'room:leave') {
      const result = leaveRoom(room.code, playerId);
      if (!result.ok) return result;
    } else if (action.type === 'room:chat') {
      const result = addRoomChatMessage(room, playerId, action.text);
      if (!result.ok) return result;
    } else if (action.type === 'room:reaction') {
      const result = addRoomReaction(room, playerId, action.emoji);
      if (!result.ok) return result;
    } else if (action.type === 'voice:state') {
      const result = updateVoiceState(room, playerId, action.voice || action);
      if (!result.ok) return result;
    } else if (action.type === 'voice:signal') {
      const result = relayVoiceSignal(room, playerId, action.targetId, action.signal);
      if (!result.ok) return result;
    } else if (action.type === 'game:play') {
      const result = applyRoomPlay(room.code, playerId, action.cards);
      if (!result.ok) return result;
    } else if (action.type === 'game:pass') {
      const result = applyRoomPass(room.code, playerId);
      if (!result.ok) return result;
    } else {
      return { ok: false, error: 'Unknown room action' };
    }
    return { ok: true, ...privateRoomState(room, playerId) };
  } catch (error) {
    return { ok: false, error: error.message || 'Room action failed' };
  }
}

function sendPrivate(socket, room, type = 'room:update') {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify({ type, ...privateRoomState(room, socket.playerId) }));
}

function broadcast(room) {
  for (const client of room.clients) sendPrivate(client, room, room.game ? 'game:update' : 'room:update');
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const noClients = room.clients.size === 0;
    const expired = now - room.updatedAt > ROOM_TTL_MS;
    if (noClients && expired) {
      rooms.delete(code);
      for (const player of room.players) forgetActiveSession(player.id);
    }
  }
}

function normalizeRuleConfig(options = {}) {
  return {
    straightRule: options.straightRule === STRAIGHT_RULES.TRADITIONAL
      ? STRAIGHT_RULES.TRADITIONAL
      : STRAIGHT_RULES.ALTERNATIVE
  };
}

function createRoom(name = 'Host', options = {}) {
  const code = generateCode();
  const hostId = crypto.randomUUID();
  const room = {
    code,
    hostId,
    maxPlayers: MAX_PLAYERS,
    rules: normalizeRuleConfig(options),
    players: [{ id: hostId, name: sanitizeName(name, 'Host'), ready: true, connected: true, disconnectedAt: null, timedOut: false, coins: STARTING_COINS, voiceEnabled: false, voiceMuted: true, voiceSpeaking: false }],
    clients: new Set(),
    game: null,
    chat: [],
    notice: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  rooms.set(code, room);
  rememberActiveSession(room, hostId);
  return { room, playerId: hostId };
}

function findReconnectPlayer(room, name, playerId = '') {
  const requestedId = String(playerId || '').trim();
  if (requestedId) {
    const byId = room.players.find(player => player.id === requestedId);
    if (byId) return byId;
  }
  const sanitizedName = sanitizeName(name, '').toLowerCase();
  if (!sanitizedName) return null;
  return room.players.find(player =>
    player.connected === false &&
    sanitizeName(player.name, '').toLowerCase() === sanitizedName
  ) || null;
}

function joinRoom(code, name = 'Friend', options = {}) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const room = rooms.get(normalizedCode);
  if (!room) return { error: 'Room not found' };
  if (room.game) {
    const reconnectPlayer = findReconnectPlayer(room, name, options.playerId);
    if (!reconnectPlayer) {
      return { error: 'Game in progress. Tap Rejoin if you were already in this room, or enter the same name you used before.' };
    }
    const result = rejoinRoom(normalizedCode, reconnectPlayer.id);
    if (!result.ok) return { error: result.error || 'Could not rejoin room' };
    return { rejoined: true, playerId: reconnectPlayer.id, ...result };
  }
  if (room.players.filter(player => player.connected !== false).length >= room.maxPlayers) return { error: 'Room is full' };
  const playerId = crypto.randomUUID();
  room.players.push({ id: playerId, name: sanitizeName(name, `Player ${room.players.length + 1}`), ready: true, connected: true, disconnectedAt: null, timedOut: false, coins: STARTING_COINS, voiceEnabled: false, voiceMuted: true, voiceSpeaking: false });
  appendRoomNotice(room, `${room.players[room.players.length - 1].name} joined the room.`);
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return { room, playerId };
}

function markPlayerDisconnected(room, playerId, { manual = false } = {}) {
  const player = room.players.find(entry => entry.id === playerId);
  if (!player) return { ok: false, error: 'Player not in room' };
  if (player.connected === false) return { ok: true, room };
  player.connected = false;
  player.disconnectedAt = Date.now();
  player.timedOut = false;
  player.voiceEnabled = false;
  player.voiceMuted = true;
  player.voiceSpeaking = false;
  const message = manual
    ? `🔴 ${player.name} left the room. Waiting for player to reconnect...`
    : `🔴 ${player.name} disconnected. Waiting for player to reconnect...`;
  appendRoomNotice(room, message);
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return { ok: true, room };
}

function rejoinRoom(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { ok: false, error: 'Room not found' };
  const player = room.players.find(entry => entry.id === playerId);
  if (!player) return { ok: false, error: 'Player not in room' };
  const wasDisconnected = player.connected === false;
  player.connected = true;
  player.disconnectedAt = null;
  player.timedOut = false;
  player.voiceEnabled = false;
  player.voiceMuted = true;
  player.voiceSpeaking = false;
  if (!room.hostId || !room.players.some(entry => entry.id === room.hostId && entry.connected !== false)) {
    room.hostId = player.id;
  }
  if (wasDisconnected) appendRoomNotice(room, `🟢 ${player.name} rejoined the game.`);
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return { ok: true, ...privateRoomState(room, playerId) };
}

function leaveRoom(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { ok: false, error: 'Room not found' };
  return markPlayerDisconnected(room, playerId, { manual: true });
}

function findStartingPlayer(players) {
  for (const player of players) {
    if (player.hand.some(card => card.rankIndex === 0 && card.suitKey === 'D')) return player.index;
  }
  return 0;
}

function startRoomGame(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) throw new Error('Room not found');
  if (room.hostId !== playerId) throw new Error('Only the host can start the game');
  const activePlayers = room.players.filter(player => player.connected !== false);
  if (activePlayers.length < 2) throw new Error('Need at least 2 players');
  for (const player of activePlayers) {
    if (!Number.isFinite(player.coins)) player.coins = STARTING_COINS;
    if (player.coins < ENTRY_FEE_COINS) throw new Error(`${player.name} needs ${ENTRY_FEE_COINS} virtual coins to start`);
  }
  for (const player of activePlayers) player.coins -= ENTRY_FEE_COINS;
  const prizePool = activePlayers.length * ENTRY_FEE_COINS;

  const hands = dealPrivateRoomCards(activePlayers.length);
  const gamePlayers = activePlayers.map((player, index) => ({
    id: player.id,
    name: player.name,
    index,
    finished: false,
    coins: player.coins,
    hand: hands[index]
  }));
  const startingPlayer = findStartingPlayer(gamePlayers);
  room.notice = '';
  room.game = {
    status: 'playing',
    players: gamePlayers,
    currentPlayer: startingPlayer,
    startingPlayer,
    trick: { play: null, leader: startingPlayer, passes: 0 },
    firstTrick: true,
    round: 1,
    logs: [`🪙 Each player added ${ENTRY_FEE_COINS} virtual coins. Prize Pool: ${prizePool}.`, `${gamePlayers[startingPlayer].name} holds the 3♦ and starts the live game.`],
    entryFee: ENTRY_FEE_COINS,
    prizePool,
    paidOut: false,
    winnerIndex: null
  };
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return room.game;
}

function getRoomGamePlayer(room, playerId) {
  if (!room.game || room.game.status !== 'playing') return null;
  return room.game.players.find(player => player.id === playerId) || null;
}

function nextActivePlayer(game, index) {
  return (index + 1) % game.players.length;
}

function finishIfNeeded(room, player) {
  if (player.hand.length > 0) return false;
  player.finished = true;
  room.game.status = 'finished';
  room.game.winnerIndex = player.index;
  const prize = room.game.prizePool || 0;
  if (!room.game.paidOut) {
    player.coins = (Number.isFinite(player.coins) ? player.coins : STARTING_COINS) + prize;
    const roomPlayer = room.players.find(entry => entry.id === player.id);
    if (roomPlayer) roomPlayer.coins = player.coins;
    room.game.paidOut = true;
  }
  room.game.logs.unshift(`🎉 ${player.name} wins ${prize} virtual gold coins!`);
  return true;
}

function applyRoomPlay(code, playerId, cardIds) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room || !room.game) return { ok: false, error: 'Game not started' };
  const player = getRoomGamePlayer(room, playerId);
  if (!player) return { ok: false, error: 'Player not in game' };
  const roomPlayer = room.players.find(entry => entry.id === playerId);
  if (roomPlayer?.connected === false) return { ok: false, error: 'Rejoin the room before playing' };
  if (room.game.currentPlayer !== player.index) return { ok: false, error: 'Not your turn' };

  const requested = Array.isArray(cardIds) ? cardIds.map(String) : [];
  const handMap = new Map(player.hand.map(card => [card.id, card]));
  const selected = requested.map(id => handMap.get(id)).filter(Boolean);
  if (selected.length !== requested.length || new Set(requested).size !== requested.length) return { ok: false, error: 'Those cards are not in your hand' };

  const play = buildPlay(selected, room.rules || normalizeRuleConfig());
  if (!play) return { ok: false, error: 'That is not a valid Big Two hand' };
  if (!playBeats(play, room.game.trick)) return { ok: false, error: 'You must beat the current play' };

  const ids = new Set(selected.map(card => card.id));
  player.hand = player.hand.filter(card => !ids.has(card.id));
  room.game.trick = { play, leader: player.index, passes: 0 };
  room.game.firstTrick = false;
  room.game.round += 1;
  room.game.logs.unshift(`${player.name} played ${play.cards.map(card => card.short).join(' ')}.`);
  if (player.hand.length === 1) room.game.logs.unshift(`⚠️ ${player.name} is on their LAST CARD!`);
  if (!finishIfNeeded(room, player)) room.game.currentPlayer = nextActivePlayer(room.game, player.index);
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return { ok: true, game: room.game };
}

function applyRoomPass(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room || !room.game) return { ok: false, error: 'Game not started' };
  const player = getRoomGamePlayer(room, playerId);
  if (!player) return { ok: false, error: 'Player not in game' };
  const roomPlayer = room.players.find(entry => entry.id === playerId);
  if (roomPlayer?.connected === false) return { ok: false, error: 'Rejoin the room before playing' };
  if (room.game.currentPlayer !== player.index) return { ok: false, error: 'Not your turn' };
  if (!room.game.trick.play) return { ok: false, error: 'You lead this trick, so play cards instead of passing' };

  room.game.trick.passes += 1;
  room.game.logs.unshift(`${player.name} passed.`);
  if (room.game.trick.passes >= room.game.players.length - 1) {
    const leader = room.game.trick.leader;
    room.game.currentPlayer = leader;
    room.game.trick = { play: null, leader, passes: 0 };
    room.game.round += 1;
    room.game.logs.unshift(`${room.game.players[leader].name} claims the trick and leads next.`);
  } else {
    room.game.currentPlayer = nextActivePlayer(room.game, player.index);
  }
  room.updatedAt = Date.now();
  rememberRoomSessions(room);
  broadcast(room);
  return { ok: true, game: room.game };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      fs.createReadStream(path.join(PUBLIC_DIR, 'index.html')).pipe(res.writeHead(200, { 'Content-Type': MIME['.html'] }));
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath).toLowerCase();
    const cacheControl = ext === '.html' || baseName === 'sw.js' || ext === '.js' || ext === '.css'
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=3600';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function createHttpServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/rooms') {
      cleanupRooms();
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const { room, playerId } = createRoom(parsed.name, { straightRule: parsed.straightRule });
          return json(res, 201, { room: publicRoom(room), playerId });
        } catch (_) {
          return json(res, 400, { error: 'Invalid create room request' });
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rooms/join') {
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const result = joinRoom(parsed.code, parsed.name, { playerId: parsed.playerId });
          if (result.error) {
            const status = result.error === 'Room not found' ? 404 : 409;
            return json(res, status, { error: result.error });
          }
          if (result.rejoined) return json(res, 200, result);
          return json(res, 200, { room: publicRoom(result.room), playerId: result.playerId });
        } catch (_) {
          return json(res, 400, { error: 'Invalid join request' });
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rooms/rejoin') {
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const result = rejoinRoom(parsed.code, parsed.playerId);
          if (!result.ok) return json(res, 404, { error: result.error || 'Could not rejoin room' });
          return json(res, 200, result);
        } catch (_) {
          return json(res, 400, { error: 'Invalid rejoin request' });
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/rooms/session')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const playerId = url.searchParams.get('playerId');
      const session = activeSessionForPlayer(playerId);
      if (!session) return json(res, 404, { error: 'No active game session' });
      const room = rooms.get(session.code);
      return json(res, 200, { session, ...privateRoomState(room, playerId) });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/rooms/state')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const code = url.searchParams.get('code');
      const playerId = url.searchParams.get('playerId');
      const lookup = roomForPlayer(code, playerId);
      if (lookup.error) return json(res, 404, { error: lookup.error });
      return json(res, 200, privateRoomState(lookup.room, playerId));
    }

    if (req.method === 'POST' && req.url === '/api/rooms/action') {
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 4096) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const result = applyRoomAction(parsed.code, parsed.playerId, parsed);
          if (!result.ok) return json(res, 400, { error: result.error || 'Room action failed' });
          return json(res, 200, result);
        } catch (_) {
          return json(res, 400, { error: 'Invalid room action' });
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/voice/ice') {
      return json(res, 200, { iceServers: voiceIceServers() });
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      return json(res, 200, { ok: true, rooms: rooms.size });
    }

    serveStatic(req, res);
  });

  const wss = new WebSocketServer({ server, path: '/rooms' });
  wss.on('connection', (socket, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    const playerId = String(url.searchParams.get('playerId') || '');
    const room = rooms.get(code);
    if (!room || !room.players.some(player => player.id === playerId)) {
      socket.send(JSON.stringify({ type: 'room:error', error: 'Room not found or player not registered' }));
      socket.close(1008, 'Invalid room');
      return;
    }

    socket.playerId = playerId;
    room.clients.add(socket);
    rejoinRoom(code, playerId);
    room.updatedAt = Date.now();
    sendPrivate(socket, room, room.game ? 'game:update' : 'room:update');
    broadcast(room);

    socket.on('message', raw => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'room:ping') socket.send(JSON.stringify({ type: 'room:pong', at: Date.now() }));
        if (message.type === 'voice:signal') {
          const targetId = String(message.targetId || '');
          const signal = message.signal && typeof message.signal === 'object' ? message.signal : null;
          if (!targetId || !signal || !room.players.some(player => player.id === targetId)) {
            socket.send(JSON.stringify({ type: 'room:error', error: 'Invalid voice signal' }));
            return;
          }
          relayVoiceSignal(room, playerId, targetId, signal);
          return;
        }
        if (message.type === 'room:start' || message.type === 'room:leave' || message.type === 'room:rejoin' || message.type === 'room:chat' || message.type === 'room:reaction' || message.type === 'voice:state' || message.type === 'game:play' || message.type === 'game:pass') {
          const result = applyRoomAction(code, playerId, message);
          if (!result.ok) socket.send(JSON.stringify({ type: 'room:error', error: result.error }));
        }
      } catch (error) {
        socket.send(JSON.stringify({ type: 'room:error', error: error.message || 'Room action failed' }));
      }
    });

    socket.on('close', () => {
      room.clients.delete(socket);
      const player = room.players.find(entry => entry.id === socket.playerId);
      const stillConnectedElsewhere = [...room.clients].some(client => client.playerId === socket.playerId && client.readyState === client.OPEN);
      if (player && !stillConnectedElsewhere) {
        markPlayerDisconnected(room, socket.playerId, { manual: false });
        return;
      }
      room.updatedAt = Date.now();
      broadcast(room);
    });
  });

  return server;
}

if (require.main === module) {
  const server = createHttpServer();
  server.listen(PORT, () => {
    console.log(`Big2Go server listening on http://127.0.0.1:${PORT}`);
  });
}

module.exports = {
  rooms,
  activeSessions,
  activeSessionForPlayer,
  STARTING_COINS,
  ENTRY_FEE_COINS,
  createRoom,
  joinRoom,
  findReconnectPlayer,
  relayVoiceSignal,
  voiceIceServers,
  rejoinRoom,
  markPlayerDisconnected,
  leaveRoom,
  publicRoom,
  privateRoomState,
  publicVoice,
  updateVoiceState,
  startRoomGame,
  applyRoomPlay,
  applyRoomPass,
  applyRoomAction,
  addRoomReaction,
  sanitizeReaction,
  createHttpServer,
  dealCards,
  cardFromId,
  buildPlay,
  playBeats
};
