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
