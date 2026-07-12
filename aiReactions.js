/* Big2Go — single-player AI emoji reactions (presentation only) */

(function () {
  const GENERIC_LINES = {
    player_slow: ['⏰ Hurry up', '👀 Watching', '🤔 Thinking', '⌛ Waiting'],
    ai_strong_play: ['🔥 Good play', '😎 Cool', '😈 Challenge', '💪 Strong'],
    ai_lose_round: ['😭', '😱', '😅', '🤦'],
    ai_win_round: ['🎉', '😎', '🔥'],
    ai_win: ['🎉', '😎', '🔥'],
    ai_lose: ['😭', '😱', '😅', '🤦'],
    player_strong_play: ['🔥 Good play', '😮 Wow', '👏 Nice']
  };

  const EVENT_PROB = {
    player_slow: 0.88,
    ai_strong_play: 0.3,
    ai_lose_round: 0.4,
    ai_win_round: 0.5,
    ai_win: 0.5,
    ai_lose: 0.4,
    player_strong_play: 0.3
  };

  const COOLDOWN_MS = 5000;
  const IDLE_FIRST_MIN_MS = 3000;
  const IDLE_FIRST_MAX_MS = 5000;
  const IDLE_REPEAT_MIN_MS = 5000;
  const IDLE_REPEAT_MAX_MS = 8000;
  const MAX_EVENT_REACTIONS_PER_ROUND = 5;
  const BUBBLE_MS = 3200;

  const reactionState = {
    lastReactAt: 0,
    round: 0,
    eventCountThisRound: 0,
    idleTimer: null,
    idleTurnKey: null,
    lastIdleAi: null
  };

  function charactersApi() {
    return window.Big2GoAICharacters || null;
  }

  function randomBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function isStrongPlay(play) {
    if (!play) return false;
    if (play.count >= 5) return true;
    const strongKinds = new Set(['pair', 'triple', 'straight', 'flush', 'full-house', 'four-kind', 'straight-flush']);
    return strongKinds.has(play.kind);
  }

  function syncRound(round) {
    const next = Number(round) || 0;
    if (next !== reactionState.round) {
      reactionState.round = next;
      reactionState.eventCountThisRound = 0;
    }
  }

  function canReactForIdle(gameState) {
    if (!gameState || gameState.liveRoom || gameState.gameOver) return false;
    return Date.now() - reactionState.lastReactAt >= COOLDOWN_MS;
  }

  function canReactForEvent(gameState) {
    if (!gameState || gameState.liveRoom || gameState.gameOver) return false;
    syncRound(gameState.round);
    if (reactionState.eventCountThisRound >= MAX_EVENT_REACTIONS_PER_ROUND) return false;
    return Date.now() - reactionState.lastReactAt >= COOLDOWN_MS;
  }

  function getPlayerName(gameState, playerIndex) {
    return gameState?.players?.[playerIndex]?.name || 'AI';
  }

  function getCharacter(gameState, playerIndex) {
    const player = gameState?.players?.[playerIndex];
    return charactersApi()?.getForPlayer(player) || null;
  }

  function choosePersonalityLine(gameState, playerIndex, event) {
    const character = getCharacter(gameState, playerIndex);
    const pool = character?.reactions?.[event] || GENERIC_LINES[event] || GENERIC_LINES.player_slow;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getReactionLayer() {
    return document.getElementById('ai-reaction-layer')
      || document.querySelector('#game-screen .table-arena .ai-reaction-layer');
  }

  function ensureReactionLayer() {
    let layer = getReactionLayer();
    if (layer) return layer;
    const arena = document.querySelector('#game-screen .table-arena');
    if (!arena) return null;
    layer = document.createElement('div');
    layer.id = 'ai-reaction-layer';
    layer.className = 'ai-reaction-layer';
    layer.setAttribute('aria-live', 'polite');
    arena.appendChild(layer);
    return layer;
  }

  function dismissTableReactions() {
    document.querySelectorAll('.ai-table-reaction').forEach(node => {
      node.classList.remove('show');
      window.setTimeout(() => node.remove(), 280);
    });
  }

  function showAIReactionBubble(playerIndex, message, gameState) {
    const layer = ensureReactionLayer();
    if (!layer || !message) return false;

    const name = getPlayerName(gameState, playerIndex);
    const character = getCharacter(gameState, playerIndex);
    const slot = charactersApi()?.getTableSlot(gameState, playerIndex) || 'center';
    const characterId = character?.id || name.toLowerCase();

    layer.querySelectorAll(`.ai-table-reaction--${slot}`).forEach(node => node.remove());

    const bubble = document.createElement('div');
    bubble.className = `ai-table-reaction ai-table-reaction--${slot} ai-table-reaction--${characterId}`;
    bubble.setAttribute('role', 'status');

    const head = document.createElement('div');
    head.className = 'ai-table-reaction-head';

    const avatarEl = document.createElement('span');
    avatarEl.className = 'ai-table-reaction-avatar character-avatar';
    charactersApi()?.renderAvatar(avatarEl, character || { name, avatar: { fallback: name.charAt(0).toUpperCase() } }, {
      className: 'character-avatar',
      imgClassName: 'character-avatar-img'
    });

    const nameEl = document.createElement('strong');
    nameEl.className = 'ai-table-reaction-name';
    nameEl.textContent = name;

    head.appendChild(avatarEl);
    head.appendChild(nameEl);

    const msg = document.createElement('p');
    msg.className = 'ai-table-reaction-msg';
    msg.textContent = message;

    bubble.appendChild(head);
    bubble.appendChild(msg);
    layer.appendChild(bubble);

    requestAnimationFrame(() => bubble.classList.add('show'));
    window.setTimeout(() => {
      bubble.classList.remove('show');
      window.setTimeout(() => bubble.remove(), 340);
    }, BUBBLE_MS);
    return true;
  }

  function pickRandomAiIndex(gameState, excludeIndex) {
    if (!gameState?.players?.length) return null;
    const indices = gameState.players
      .map((player, index) => index)
      .filter(index => {
        if (index === gameState.humanIndex) return false;
        if (excludeIndex != null && index === excludeIndex) return false;
        const player = gameState.players[index];
        return player && !player.isHuman && !player.finished;
      });
    if (!indices.length) return null;
    return indices[Math.floor(Math.random() * indices.length)];
  }

  function pickIdleAiIndex(gameState) {
    const indices = gameState.players
      .map((player, index) => index)
      .filter(index => {
        if (index === gameState.humanIndex) return false;
        const player = gameState.players[index];
        return player && !player.isHuman && !player.finished;
      });
    if (!indices.length) return null;

    const personalityFirst = indices.filter(index => getCharacter(gameState, index));
    const pool = personalityFirst.length ? personalityFirst : indices;

    if (reactionState.lastIdleAi != null && pool.length > 1) {
      const rotated = pool.filter(index => index !== reactionState.lastIdleAi);
      if (rotated.length) {
        const pick = rotated[Math.floor(Math.random() * rotated.length)];
        reactionState.lastIdleAi = pick;
        return pick;
      }
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    reactionState.lastIdleAi = pick;
    return pick;
  }

  function triggerAIReaction(playerIndex, event, gameState, options = {}) {
    if (!gameState || gameState.liveRoom) return false;
    if (playerIndex == null || playerIndex === gameState.humanIndex) return false;

    const isIdle = event === 'player_slow';
    if (isIdle) {
      if (!canReactForIdle(gameState)) return false;
    } else {
      syncRound(gameState.round);
      if (!canReactForEvent(gameState)) return false;
    }

    const probability = options.probability ?? EVENT_PROB[event] ?? 0.25;
    if (Math.random() > probability) return false;

    const message = choosePersonalityLine(gameState, playerIndex, event);
    if (!showAIReactionBubble(playerIndex, message, gameState)) return false;

    reactionState.lastReactAt = Date.now();
    if (!isIdle) reactionState.eventCountThisRound += 1;
    return true;
  }

  function clearHumanIdleTimer(resetTurnKey) {
    if (reactionState.idleTimer) {
      clearTimeout(reactionState.idleTimer);
      reactionState.idleTimer = null;
    }
    reactionState.lastIdleAi = null;
    if (resetTurnKey) {
      reactionState.idleTurnKey = null;
      dismissTableReactions();
    }
  }

  function scheduleIdlePulse(gameState, turnKey, isFirst) {
    const delay = isFirst
      ? randomBetween(IDLE_FIRST_MIN_MS, IDLE_FIRST_MAX_MS)
      : randomBetween(IDLE_REPEAT_MIN_MS, IDLE_REPEAT_MAX_MS);

    reactionState.idleTimer = window.setTimeout(() => {
      reactionState.idleTimer = null;
      if (!gameState || gameState.liveRoom || gameState.gameOver) return;
      if (gameState.currentPlayer !== gameState.humanIndex) return;
      if (reactionState.idleTurnKey !== turnKey) return;

      const aiIndex = pickIdleAiIndex(gameState);
      if (aiIndex != null) triggerAIReaction(aiIndex, 'player_slow', gameState);

      if (gameState.currentPlayer === gameState.humanIndex && reactionState.idleTurnKey === turnKey) {
        scheduleIdlePulse(gameState, turnKey, false);
      }
    }, delay);
  }

  function onHumanTurnStart(gameState) {
    if (!gameState || gameState.liveRoom || gameState.gameOver) return;
    if (gameState.currentPlayer !== gameState.humanIndex) return;

    const turnKey = `${gameState.round}:${gameState.currentPlayer}`;
    if (reactionState.idleTurnKey === turnKey) return;

    clearHumanIdleTimer(false);
    reactionState.idleTurnKey = turnKey;
    scheduleIdlePulse(gameState, turnKey, true);
  }

  function resetAIReactions(round) {
    reactionState.lastReactAt = 0;
    reactionState.round = Number(round) || 0;
    reactionState.eventCountThisRound = 0;
    clearHumanIdleTimer(true);
    dismissTableReactions();
  }

  function onAiPlayComplete(playerIndex, play, gameState) {
    if (!isStrongPlay(play)) return false;
    return triggerAIReaction(playerIndex, 'ai_strong_play', gameState);
  }

  function onPlayerPlayComplete(play, gameState) {
    if (!isStrongPlay(play)) return false;
    const aiIndex = pickRandomAiIndex(gameState);
    if (aiIndex == null) return false;
    return triggerAIReaction(aiIndex, 'player_strong_play', gameState);
  }

  function onTrickWon(leaderIndex, gameState) {
    if (!gameState || gameState.liveRoom) return false;
    const leader = gameState.players[leaderIndex];
    if (!leader) return false;

    if (leader.isHuman) {
      const aiIndex = pickRandomAiIndex(gameState);
      return aiIndex != null && triggerAIReaction(aiIndex, 'ai_lose_round', gameState);
    }

    return triggerAIReaction(leaderIndex, 'ai_win_round', gameState);
  }

  function onVictory(winner, gameState) {
    clearHumanIdleTimer(true);
    if (!gameState || gameState.liveRoom || !winner) return false;

    if (winner.isHuman) {
      const aiIndex = pickRandomAiIndex(gameState);
      return aiIndex != null && triggerAIReaction(aiIndex, 'ai_lose', gameState);
    }

    const winnerIndex = gameState.players.indexOf(winner);
    const index = winnerIndex >= 0 ? winnerIndex : pickRandomAiIndex(gameState);
    return index != null && triggerAIReaction(index, 'ai_win', gameState);
  }

  window.Big2GoAIReactions = {
    canReactForIdle,
    canReactForEvent,
    triggerAIReaction,
    showAIReactionBubble,
    resetAIReactions,
    onHumanTurnStart,
    clearHumanIdleTimer,
    onAiPlayComplete,
    onPlayerPlayComplete,
    onTrickWon,
    onVictory,
    isStrongPlay,
    pickRandomAiIndex,
    choosePersonalityLine
  };
})();
