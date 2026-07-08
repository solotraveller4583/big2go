'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const server = require('../server');

test('private room can start a shared multiplayer game with custom names and 13-card hands', () => {
  const { room, playerId: hostId } = server.createRoom('Alex');
  const joined = server.joinRoom(room.code, 'Maya');

  const game = server.startRoomGame(room.code, hostId);

  assert.equal(game.status, 'playing');
  assert.equal(game.players.length, 2);

  const hostView = server.privateRoomState(room, hostId);
  const friendView = server.privateRoomState(room, joined.playerId);

  assert.equal(hostView.game.status, 'playing');
  assert.equal(friendView.game.status, 'playing');
  assert.equal(hostView.game.players.length, 2);
  assert.equal(friendView.game.players.length, 2);
  assert.equal(hostView.game.players[0].name, 'Alex');
  assert.equal(friendView.game.players[1].name, 'Maya');
  assert.equal(hostView.game.hand.length, 13, 'host receives 13 cards');
  assert.equal(friendView.game.hand.length, 13, 'friend receives 13 cards');
  assert.notDeepEqual(hostView.game.hand, friendView.game.hand, 'hands are private and different');
  assert.equal(hostView.game.players[0].handCount, hostView.game.hand.length);
  assert.equal(friendView.game.players[1].handCount, friendView.game.hand.length);
});

test('current player can play and next player can pass through shared state', () => {
  const { room, playerId: hostId } = server.createRoom();
  const joined = server.joinRoom(room.code, 'Friend');
  server.startRoomGame(room.code, hostId);

  const firstPlayer = room.game.players[room.game.currentPlayer];
  const firstCard = firstPlayer.hand[0].id;
  const playResult = server.applyRoomPlay(room.code, firstPlayer.id, [firstCard]);

  assert.equal(playResult.ok, true);
  assert.equal(room.game.trick.play.cards[0].id, firstCard);
  assert.equal(room.game.players.find(player => player.id === firstPlayer.id).hand.some(card => card.id === firstCard), false);

  const nextPlayer = room.game.players[room.game.currentPlayer];
  const passResult = server.applyRoomPass(room.code, nextPlayer.id);

  assert.equal(passResult.ok, true);
  assert.equal(room.game.trick.play, null, 'after the only other player passes, trick resets');
  assert.equal(room.game.currentPlayer, room.game.trick.leader);

  const hostView = server.privateRoomState(room, hostId);
  const friendView = server.privateRoomState(room, joined.playerId);
  assert.equal(hostView.game.round, room.game.round);
  assert.equal(friendView.game.round, room.game.round);
});

test('non-host cannot start and invalid plays are rejected', () => {
  const { room, playerId: hostId } = server.createRoom();
  const joined = server.joinRoom(room.code, 'Friend');

  assert.throws(() => server.startRoomGame(room.code, joined.playerId), /Only the host/);

  server.startRoomGame(room.code, hostId);
  const current = room.game.players[room.game.currentPlayer];
  const other = room.game.players.find(player => player.id !== current.id);

  assert.deepEqual(server.applyRoomPlay(room.code, other.id, [other.hand[0].id]), {
    ok: false,
    error: 'Not your turn'
  });
  assert.equal(room.game.currentPlayer, current.index);
});

test('HTTP fallback action and state endpoints keep players synced without WebSocket', async () => {
  const app = server.createHttpServer();
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = async (path, body) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || path);
    return payload;
  };
  const get = async path => {
    const response = await fetch(`${base}${path}`, { headers: { 'Accept': 'application/json' } });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || path);
    return payload;
  };

  try {
    const created = await post('/api/rooms', { name: 'Nok' });
    const joined = await post('/api/rooms/join', { code: created.room.code, name: 'Jack' });
    await post('/api/rooms/action', { type: 'room:start', code: created.room.code, playerId: created.playerId });

    const hostState = await get(`/api/rooms/state?code=${created.room.code}&playerId=${created.playerId}`);
    const current = hostState.game.players[hostState.game.currentPlayer];
    const currentPlayerId = current.id;
    const currentState = await get(`/api/rooms/state?code=${created.room.code}&playerId=${currentPlayerId}`);
    const playedCard = currentState.game.hand[0].id;

    await post('/api/rooms/action', { type: 'game:play', code: created.room.code, playerId: currentPlayerId, cards: [playedCard] });

    const hostAfter = await get(`/api/rooms/state?code=${created.room.code}&playerId=${created.playerId}`);
    const friendAfter = await get(`/api/rooms/state?code=${created.room.code}&playerId=${joined.playerId}`);
    assert.equal(hostAfter.game.trick.play.cards[0].id, playedCard);
    assert.equal(friendAfter.game.trick.play.cards[0].id, playedCard);
    assert.equal(hostAfter.game.currentPlayer, friendAfter.game.currentPlayer);
  } finally {
    await new Promise(resolve => app.close(resolve));
  }
});

test('private room can rematch in the same room after a winner', () => {
  const { room, playerId: hostId } = server.createRoom('Host');
  const joined = server.joinRoom(room.code, 'Friend');
  server.startRoomGame(room.code, hostId);

  const winner = room.game.players[room.game.currentPlayer];
  room.game.firstTrick = false;
  winner.hand = [winner.hand[0]];
  const result = server.applyRoomPlay(room.code, winner.id, [winner.hand[0].id]);
  assert.equal(result.ok, true);
  assert.equal(room.game.status, 'finished');

  const rematch = server.applyRoomAction(room.code, hostId, { type: 'room:start' });
  assert.equal(rematch.ok, true);
  assert.equal(rematch.room.code, room.code);
  assert.equal(rematch.game.status, 'playing');
  assert.equal(rematch.game.players.length, 2);
  assert.equal(rematch.game.players[0].id, hostId);
  assert.equal(rematch.game.players[1].id, joined.playerId);
  assert.equal(rematch.game.players[0].handCount, 13);
});

test('leaving a room marks the player as left and announces it', () => {
  const { room, playerId: hostId } = server.createRoom('Host');
  const joined = server.joinRoom(room.code, 'Lantern');

  const result = server.leaveRoom(room.code, joined.playerId);
  assert.equal(result.ok, true);

  const hostView = server.privateRoomState(room, hostId);
  const leftPlayer = hostView.room.players.find(player => player.id === joined.playerId);
  assert.equal(leftPlayer.connected, false);
  assert.match(hostView.room.notice, /Lantern left the room/);
});

test('private room chat sends sanitized messages to every player state', () => {
  const { room, playerId: hostId } = server.createRoom('Host');
  const joined = server.joinRoom(room.code, 'Maya');

  const result = server.applyRoomAction(room.code, joined.playerId, { type: 'room:chat', text: '  Nice move <script>  ' });

  assert.equal(result.ok, true);
  const resultMessage = result.chat.find(message => message.playerId === joined.playerId);
  assert.ok(resultMessage);
  assert.equal(resultMessage.playerId, joined.playerId);
  assert.equal(resultMessage.name, 'Maya');
  assert.equal(resultMessage.text, 'Nice move script');

  const hostView = server.privateRoomState(room, hostId);
  const friendView = server.privateRoomState(room, joined.playerId);
  assert.equal(hostView.chat.find(message => message.playerId === joined.playerId).text, 'Nice move script');
  assert.deepEqual(hostView.chat, friendView.chat);
});

test('HTTP room chat action and state endpoints sync chat without WebSocket', async () => {
  const app = server.createHttpServer();
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = async (path, body) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || path);
    return payload;
  };
  const get = async path => {
    const response = await fetch(`${base}${path}`, { headers: { 'Accept': 'application/json' } });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || path);
    return payload;
  };

  try {
    const created = await post('/api/rooms', { name: 'Host' });
    const joined = await post('/api/rooms/join', { code: created.room.code, name: 'Jack' });
    await post('/api/rooms/action', { type: 'room:chat', code: created.room.code, playerId: joined.playerId, text: 'Good game 🙌' });

    const hostState = await get(`/api/rooms/state?code=${created.room.code}&playerId=${created.playerId}`);
    const jackMessage = hostState.chat.find(message => message.playerId === joined.playerId);
    assert.ok(jackMessage);
    assert.equal(jackMessage.name, 'Jack');
    assert.equal(jackMessage.text, 'Good game 🙌');
  } finally {
    await new Promise(resolve => app.close(resolve));
  }
});

test('private room voice state syncs mute and speaking indicators', () => {
  const { room, playerId: hostId } = server.createRoom('Host');
  const joined = server.joinRoom(room.code, 'Maya');

  const speaking = server.applyRoomAction(room.code, joined.playerId, {
    type: 'voice:state',
    voice: { enabled: true, muted: false, speaking: true }
  });

  assert.equal(speaking.ok, true);
  const hostView = server.privateRoomState(room, hostId);
  const mayaVoice = hostView.voice.find(entry => entry.id === joined.playerId);
  assert.equal(mayaVoice.enabled, true);
  assert.equal(mayaVoice.muted, false);
  assert.equal(mayaVoice.speaking, true);

  const muted = server.applyRoomAction(room.code, joined.playerId, {
    type: 'voice:state',
    voice: { enabled: true, muted: true, speaking: true }
  });
  assert.equal(muted.ok, true);
  const mutedView = server.privateRoomState(room, hostId).voice.find(entry => entry.id === joined.playerId);
  assert.equal(mutedView.muted, true);
  assert.equal(mutedView.speaking, false);
});

test('disconnected player can rejoin same room with same hand and turn state', () => {
  const { room, playerId: hostId } = server.createRoom('Lantern');
  const joined = server.joinRoom(room.code, 'Drum');
  server.startRoomGame(room.code, hostId);

  const before = server.privateRoomState(room, joined.playerId);
  const beforeHand = before.game.hand.map(card => card.id).join('|');
  const beforeIndex = before.game.playerIndex;
  const beforeTurn = before.game.currentPlayer;

  const left = server.leaveRoom(room.code, joined.playerId);
  assert.equal(left.ok, true);
  assert.equal(server.privateRoomState(room, hostId).room.players.find(player => player.id === joined.playerId).connected, false);

  const rejoined = server.rejoinRoom(room.code, joined.playerId);
  assert.equal(rejoined.ok, true);
  assert.equal(rejoined.game.playerIndex, beforeIndex);
  assert.equal(rejoined.game.currentPlayer, beforeTurn);
  assert.equal(rejoined.game.hand.map(card => card.id).join('|'), beforeHand);
  assert.equal(rejoined.room.players.find(player => player.id === joined.playerId).connected, true);
  assert.match(rejoined.room.notice, /rejoined/);
});

test('room owner disconnect does not destroy room and transfers after timeout', () => {
  const { room, playerId: hostId } = server.createRoom('Host');
  const joined = server.joinRoom(room.code, 'Friend');
  server.startRoomGame(room.code, hostId);

  const disconnected = server.leaveRoom(room.code, hostId);
  assert.equal(disconnected.ok, true);
  assert.equal(room.hostId, hostId, 'owner is protected during reconnect grace period');
  room.players.find(player => player.id === hostId).disconnectedAt = Date.now() - 61_000;

  const friendView = server.privateRoomState(room, joined.playerId);
  assert.equal(friendView.room.hostId, joined.playerId);
  assert.equal(friendView.game.status, 'playing');
  assert.equal(friendView.game.hand.length, 13);
  assert.match(friendView.room.notice, /room owner|timed out|now room owner/i);
});

test('HTTP rejoin endpoint restores active game session', async () => {
  const app = server.createHttpServer();
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = async (path, body) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || path);
    return payload;
  };

  try {
    const created = await post('/api/rooms', { name: 'Lantern' });
    const joined = await post('/api/rooms/join', { code: created.room.code, name: 'Drum' });
    await post('/api/rooms/action', { type: 'room:start', code: created.room.code, playerId: created.playerId });
    const before = await fetch(`${base}/api/rooms/state?code=${created.room.code}&playerId=${joined.playerId}`).then(r => r.json());
    await post('/api/rooms/action', { type: 'room:leave', code: created.room.code, playerId: joined.playerId });
    const restored = await post('/api/rooms/rejoin', { code: created.room.code, playerId: joined.playerId });
    assert.equal(restored.room.players.find(player => player.id === joined.playerId).connected, true);
    assert.equal(restored.game.playerIndex, before.game.playerIndex);
    assert.deepEqual(restored.game.hand.map(card => card.id), before.game.hand.map(card => card.id));
  } finally {
    await new Promise(resolve => app.close(resolve));
  }
});

test('backend active session lookup lets Player B resume without entering room code', async () => {
  const app = server.createHttpServer();
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = async (path, body) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || path);
    return payload;
  };

  try {
    const created = await post('/api/rooms', { name: 'Player A' });
    const joined = await post('/api/rooms/join', { code: created.room.code, name: 'Player B' });
    await post('/api/rooms/action', { type: 'room:start', code: created.room.code, playerId: created.playerId });
    const before = await fetch(`${base}/api/rooms/state?code=${created.room.code}&playerId=${joined.playerId}`).then(r => r.json());
    await post('/api/rooms/action', { type: 'room:leave', code: created.room.code, playerId: joined.playerId });

    const sessionResponse = await fetch(`${base}/api/rooms/session?playerId=${joined.playerId}`);
    const sessionPayload = await sessionResponse.json();
    assert.equal(sessionResponse.ok, true, sessionPayload.error);
    assert.equal(sessionPayload.session.code, created.room.code);
    assert.equal(sessionPayload.session.playerId, joined.playerId);
    assert.equal(sessionPayload.session.seat, 2);
    assert.equal(sessionPayload.session.connected, false);
    assert.equal(sessionPayload.session.handCount, 13);
    assert.equal(sessionPayload.session.currentPlayer, before.game.currentPlayer);
    assert.deepEqual(sessionPayload.session.hand.map(card => card.id), before.game.hand.map(card => card.id));

    const restored = await post('/api/rooms/rejoin', { code: sessionPayload.session.code, playerId: joined.playerId });
    assert.equal(restored.game.playerIndex, before.game.playerIndex);
    assert.deepEqual(restored.game.hand.map(card => card.id), before.game.hand.map(card => card.id));
    assert.equal(restored.room.players.find(player => player.id === joined.playerId).connected, true);
  } finally {
    await new Promise(resolve => app.close(resolve));
  }
});
