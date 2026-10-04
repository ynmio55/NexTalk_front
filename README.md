# NexTalk Frontend

React/Vite frontend for the private NexTalk chat and voice server.

## Features

- Register/login
- Private invite code
- Real text channels from the backend
- Persistent message history
- Realtime multi-user chat
- Online/offline member presence
- Voice rooms with WebRTC
- Mute, deafen and leave voice
- Automatic WebSocket reconnect
- STUN + optional TURN support
- Production Docker/Nginx build

## Local development

Copy:

    cp .env.example .env

For local text chat only, VITE_API_URL=http://localhost:8080 is enough.

For voice across different networks, configure TURN values too.

Install and run:

    npm install
    npm run dev

## Production build

    npm install
    npm run build

The static build is created in dist/.

## Required production URLs

Recommended:

- App: https://nextalk.miosmooth.com
- API/WebSocket: https://api.nextalk.miosmooth.com
- TURN: turn:turn.nextalk.miosmooth.com:3478

Microphone access requires HTTPS in normal browsers (localhost is the development exception).
