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
    status: room.players.length >= 2 ? 'ready' : 'waiting',
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    players: room.players.map(player => ({ id: player.id, name: player.name, ready: player.ready }))
  };
}

function broadcast(room) {
  const message = JSON.stringify({ type: 'room:update', room: publicRoom(room) });
  for (const client of room.clients) {
    if (client.readyState === client.OPEN) client.send(message);
  }
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const noClients = room.clients.size === 0;
    const expired = now - room.updatedAt > ROOM_TTL_MS;
    if (noClients && expired) rooms.delete(code);
  }
}

function createRoom() {
  const code = generateCode();
  const hostId = crypto.randomUUID();
  const room = {
    code,
    hostId,
    maxPlayers: MAX_PLAYERS,
    players: [{ id: hostId, name: 'Host', ready: true }],
    clients: new Set(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  rooms.set(code, room);
  return { room, playerId: hostId };
}

function joinRoom(code, name = 'Friend') {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };
  const playerId = crypto.randomUUID();
  room.players.push({ id: playerId, name: String(name || 'Friend').slice(0, 20), ready: true });
  room.updatedAt = Date.now();
  broadcast(room);
  return { room, playerId };
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
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/rooms') {
    cleanupRooms();
    const { room, playerId } = createRoom();
    return json(res, 201, { room: publicRoom(room), playerId });
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

  room.clients.add(socket);
  room.updatedAt = Date.now();
  socket.send(JSON.stringify({ type: 'room:update', room: publicRoom(room) }));
  broadcast(room);

  socket.on('message', raw => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === 'room:ping') socket.send(JSON.stringify({ type: 'room:pong', at: Date.now() }));
      if (message.type === 'room:start') broadcast(room);
    } catch (_) {
      // Ignore malformed client messages.
    }
  });

  socket.on('close', () => {
    room.clients.delete(socket);
    room.updatedAt = Date.now();
    broadcast(room);
  });
});

server.listen(PORT, () => {
  console.log(`Big2Go server listening on http://127.0.0.1:${PORT}`);
});
