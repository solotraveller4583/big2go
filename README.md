# Big2Go

Big2Go is a mobile-first Big Two card game built with plain HTML, CSS, and JavaScript.

## Run locally

```bash
npm install
npm start
```

Open:

```text
http://127.0.0.1:8093
```

## Private rooms

Private rooms use the Node/WebSocket backend in `server.js`.

Flow:

1. Tap **ROOM**.
2. Tap **Create Room**.
3. Big2Go creates a backend room and shows a short room code.
4. Tap **Share Code** or tell the code to a friend.
5. Friend taps **ROOM**, enters the code, and taps **Join**.
6. The room updates live when the second player joins.

The UI intentionally does not show invite URLs.

## Render deployment

This project now needs a Render **Web Service** for realtime rooms, not a Static Site.

Render settings:

- Environment: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

`render.yaml` is included for blueprint-style setup.
