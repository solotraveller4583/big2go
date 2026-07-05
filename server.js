'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8093);
const PUBLIC_DIR = __dirname;
const ROOM_TTL_MS = 1000 * 60 * 60 * 3;
const MAX_PLAYERS = 4;
const rooms = new Map();

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS = [
  { key: 'D', symbol: '♦', name: 'diamonds', color: 'red' },
  { key: 'C', symbol: '♣', name: 'clubs', color: 'black' },
  { key: 'H', symbol: '♥', name: 'hearts', color: 'red' },
  { key: 'S', symbol: '♠', name: 'spades', color: 'black' }
];
const FIVE_KIND_ORDER = { straight: 1, flush: 2, 'full-house': 3, 'four-kind': 4, 'straight-flush': 5 };

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
  if (isStraight) {
    const high = highestCard(sorted);
    return { kind: 'straight', count: 5, cards: sorted, score: [1, high.rankIndex, high.suitIndex] };
  }
  return null;
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

function playBeats(candidate, current) {
  if (!current || !current.play) return true;
  if (candidate.count !== current.play.count) return false;
  return compareScores(candidate.score, current.play.score) > 0;
}

function dealCards(playerCount) {
  const deck = shuffle(createDeck());
  const hands = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, index) => hands[index % playerCount].push(card));
  return hands.map(sortCards);
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

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.game ? 'playing' : room.players.filter(player => player.connected !== false).length >= 2 ? 'ready' : 'waiting',
    playerCount: room.players.filter(player => player.connected !== false).length,
    maxPlayers: room.maxPlayers,
    notice: room.notice || '',
    players: room.players.map(player => ({ id: player.id, name: player.name, ready: player.ready, connected: player.connected !== false }))
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
      connected: room.players.find(roomPlayer => roomPlayer.id === player.id)?.connected !== false
    })),
    hand: own.hand.map(card => ({ ...card })),
    logs: room.game.logs.slice(0, 8),
    winnerIndex: room.game.winnerIndex,
    gameOver: room.game.status === 'finished'
  };
}

function privateRoomState(room, playerId) {
  return { room: publicRoom(room), game: publicGameState(room, playerId) };
}

function roomForPlayer(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (!room.players.some(player => player.id === playerId)) return { error: 'Player not in room' };
  return { room };
}

function applyRoomAction(code, playerId, action) {
  const lookup = roomForPlayer(code, playerId);
  if (lookup.error) return { ok: false, error: lookup.error };
  const { room } = lookup;
  try {
    if (action.type === 'room:start') startRoomGame(room.code, playerId);
    else if (action.type === 'room:leave') {
      const result = leaveRoom(room.code, playerId);
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
    if (noClients && expired) rooms.delete(code);
  }
}

function createRoom(name = 'Host') {
  const code = generateCode();
  const hostId = crypto.randomUUID();
  const room = {
    code,
    hostId,
    maxPlayers: MAX_PLAYERS,
    players: [{ id: hostId, name: sanitizeName(name, 'Host'), ready: true, connected: true }],
    clients: new Set(),
    game: null,
    notice: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  rooms.set(code, room);
  return { room, playerId: hostId };
}

function joinRoom(code, name = 'Friend') {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (room.game) return { error: 'Game already started' };
  if (room.players.filter(player => player.connected !== false).length >= room.maxPlayers) return { error: 'Room is full' };
  const playerId = crypto.randomUUID();
  room.players.push({ id: playerId, name: sanitizeName(name, `Player ${room.players.length + 1}`), ready: true, connected: true });
  room.notice = `${room.players[room.players.length - 1].name} joined the room.`;
  room.updatedAt = Date.now();
  broadcast(room);
  return { room, playerId };
}

function leaveRoom(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { ok: false, error: 'Room not found' };
  const player = room.players.find(entry => entry.id === playerId);
  if (!player) return { ok: false, error: 'Player not in room' };
  if (player.connected === false) return { ok: true, room };
  player.connected = false;
  room.notice = `${player.name} left the room.`;
  if (room.game && room.game.status === 'playing') {
    room.game.logs.unshift(room.notice);
  }
  room.updatedAt = Date.now();
  broadcast(room);
  return { ok: true, room };
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

  const hands = dealPrivateRoomCards(activePlayers.length);
  const gamePlayers = activePlayers.map((player, index) => ({
    id: player.id,
    name: player.name,
    index,
    finished: false,
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
    logs: [`${gamePlayers[startingPlayer].name} holds the 3♦ and starts the live game.`],
    winnerIndex: null
  };
  room.updatedAt = Date.now();
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
  room.game.logs.unshift(`${player.name} wins the live room!`);
  return true;
}

function applyRoomPlay(code, playerId, cardIds) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room || !room.game) return { ok: false, error: 'Game not started' };
  const player = getRoomGamePlayer(room, playerId);
  if (!player) return { ok: false, error: 'Player not in game' };
  if (room.game.currentPlayer !== player.index) return { ok: false, error: 'Not your turn' };

  const requested = Array.isArray(cardIds) ? cardIds.map(String) : [];
  const handMap = new Map(player.hand.map(card => [card.id, card]));
  const selected = requested.map(id => handMap.get(id)).filter(Boolean);
  if (selected.length !== requested.length || new Set(requested).size !== requested.length) return { ok: false, error: 'Those cards are not in your hand' };

  const play = buildPlay(selected);
  if (!play) return { ok: false, error: 'That is not a valid Big Two hand' };
  if (!playBeats(play, room.game.trick)) return { ok: false, error: 'You must beat the current play' };

  const ids = new Set(selected.map(card => card.id));
  player.hand = player.hand.filter(card => !ids.has(card.id));
  room.game.trick = { play, leader: player.index, passes: 0 };
  room.game.firstTrick = false;
  room.game.round += 1;
  room.game.logs.unshift(`${player.name} played ${play.cards.map(card => card.short).join(' ')}.`);
  if (!finishIfNeeded(room, player)) room.game.currentPlayer = nextActivePlayer(room.game, player.index);
  room.updatedAt = Date.now();
  broadcast(room);
  return { ok: true, game: room.game };
}

function applyRoomPass(code, playerId) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room || !room.game) return { ok: false, error: 'Game not started' };
  const player = getRoomGamePlayer(room, playerId);
  if (!player) return { ok: false, error: 'Player not in game' };
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
          const { room, playerId } = createRoom(parsed.name);
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
          const result = joinRoom(parsed.code, parsed.name);
          if (result.error) return json(res, 404, { error: result.error });
          return json(res, 200, { room: publicRoom(result.room), playerId: result.playerId });
        } catch (_) {
          return json(res, 400, { error: 'Invalid join request' });
        }
      });
      return;
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
    room.updatedAt = Date.now();
    sendPrivate(socket, room, room.game ? 'game:update' : 'room:update');
    broadcast(room);

    socket.on('message', raw => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'room:ping') socket.send(JSON.stringify({ type: 'room:pong', at: Date.now() }));
        if (message.type === 'room:start' || message.type === 'room:leave' || message.type === 'game:play' || message.type === 'game:pass') {
          const result = applyRoomAction(code, playerId, message);
          if (!result.ok) socket.send(JSON.stringify({ type: 'room:error', error: result.error }));
        }
      } catch (error) {
        socket.send(JSON.stringify({ type: 'room:error', error: error.message || 'Room action failed' }));
      }
    });

    socket.on('close', () => {
      room.clients.delete(socket);
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
  createRoom,
  joinRoom,
  leaveRoom,
  publicRoom,
  privateRoomState,
  startRoomGame,
  applyRoomPlay,
  applyRoomPass,
  applyRoomAction,
  createHttpServer,
  cardFromId,
  buildPlay,
  playBeats
};
