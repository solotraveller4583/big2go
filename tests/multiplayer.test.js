'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const server = require('../server');

test('private room can start a shared multiplayer game and send private hands', () => {
  const { room, playerId: hostId } = server.createRoom();
  const joined = server.joinRoom(room.code, 'Friend');

  const game = server.startRoomGame(room.code, hostId);

  assert.equal(game.status, 'playing');
  assert.equal(game.players.length, 2);

  const hostView = server.privateRoomState(room, hostId);
  const friendView = server.privateRoomState(room, joined.playerId);

  assert.equal(hostView.game.status, 'playing');
  assert.equal(friendView.game.status, 'playing');
  assert.equal(hostView.game.players.length, 2);
  assert.equal(friendView.game.players.length, 2);
  assert.ok(hostView.game.hand.length > 0, 'host receives only their own hand');
  assert.ok(friendView.game.hand.length > 0, 'friend receives only their own hand');
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
