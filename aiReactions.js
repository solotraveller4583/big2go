/* Big2Go — single-player AI emoji reactions (presentation only) */

(function () {
  const AI_EMOTIONS = [
    { emoji: '😂', text: 'Laugh', tags: ['positive', 'funny'] },
    { emoji: '👏', text: 'Nice move', tags: ['positive', 'friendly'] },
    { emoji: '🔥', text: 'Good play', tags: ['positive', 'aggressive'] },
    { emoji: '😮', text: 'Wow', tags: ['positive', 'friendly'] },
    { emoji: '😍', text: 'Amazing', tags: ['positive', 'friendly'] },
    { emoji: '👍', text: 'Respect', tags: ['positive', 'friendly'] },
    { emoji: '🤩', text: 'Impressive', tags: ['positive', 'friendly'] },
    { emoji: '😎', text: 'Cool', tags: ['positive', 'aggressive'] },
    { emoji: '🎉', text: 'Celebration', tags: ['positive', 'friendly'] },
    { emoji: '⏰', text: 'Hurry up', tags: ['waiting'] },
    { emoji: '👀', text: 'Watching', tags: ['waiting'] },
    { emoji: '🤔', text: 'Thinking', tags: ['waiting'] },
    { emoji: '⌛', text: 'Waiting', tags: ['waiting'] },
    { emoji: '😴', text: 'Slow move', tags: ['waiting', 'funny'] },
    { emoji: '🙄', text: 'Still waiting', tags: ['waiting', 'funny'] },
    { emoji: '😏', text: 'My turn', tags: ['competitive', 'aggressive'] },
    { emoji: '💪', text: 'Strong', tags: ['competitive', 'aggressive'] },
    { emoji: '😈', text: 'Challenge', tags: ['competitive', 'aggressive'] },
    { emoji: '🧐', text: 'Interesting', tags: ['competitive'] },
    { emoji: '😤', text: 'Almost got you', tags: ['competitive', 'aggressive'] },
    { emoji: '😱', text: 'Oh no', tags: ['bad_luck'] },
    { emoji: '😭', text: 'Sad', tags: ['bad_luck', 'friendly'] },
    { emoji: '😵', text: 'Confused', tags: ['bad_luck', 'funny'] },
    { emoji: '😅', text: 'Close one', tags: ['bad_luck', 'funny'] },
    { emoji: '🤦', text: 'Mistake', tags: ['bad_luck', 'funny'] }
  ];

  const EVENT_EMOJIS = {
    player_slow: ['⏰', '👀', '🤔', '⌛'],
    ai_strong_play: ['🔥', '😎', '😈', '💪'],
    ai_lose_round: ['😭', '😱', '😅', '🤦'],
    ai_win_round: ['🎉', '😎', '🔥'],
    ai_win: ['🎉', '😎', '🔥'],
    ai_lose: ['😭', '😱', '😅', '🤦']
  };

  const EVENT_PROB = {
    player_slow: 0.55,
    ai_strong_play: 0.3,
    ai_lose_round: 0.4,
    ai_win_round: 0.5,
    ai_win: 0.5,
    ai_lose: 0.4,
    player_strong_play: 0.3
  };

  const AI_PERSONALITY = {
    Brownie: { prefer: ['aggressive', 'competitive'] },
    Bunny: { prefer: ['friendly', 'positive'] },
    Cookie: { prefer: ['funny', 'waiting'] }
  };

  const MAX_REACTIONS_PER_ROUND = 3;
  const COOLDOWN_MS = 5000;
  const HUMAN_IDLE_MS = 5000;
  const MAX_IDLE_PULSES = 3;

  const reactionState = {
    lastReactAt: 0,
    round: 0,
    countThisRound: 0,
    idleTimer: null,
    idleTurnKey: null,
    idlePulse: 0
  };

  function emotionByEmoji(emoji) {
    return AI_EMOTIONS.find(entry => entry.emoji === emoji) || { emoji, text: '', tags: ['positive'] };
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
      reactionState.countThisRound = 0;
    }
  }

  function canReact(gameState) {
    if (!gameState || gameState.liveRoom || gameState.gameOver) return false;
    syncRound(gameState.round);
    if (reactionState.countThisRound >= MAX_REACTIONS_PER_ROUND) return false;
    if (Date.now() - reactionState.lastReactAt < COOLDOWN_MS) return false;
    return true;
  }

  function chooseRandomAIReaction(event, playerIndex, gameState) {
    const emojiChoices = EVENT_EMOJIS[event];
    let pool = emojiChoices
      ? emojiChoices.map(emotionByEmoji)
      : AI_EMOTIONS.slice();

    const name = gameState?.players?.[playerIndex]?.name;
    const personality = name ? AI_PERSONALITY[name] : null;
    if (personality?.prefer?.length) {
      const preferred = pool.filter(entry => entry.tags.some(tag => personality.prefer.includes(tag)));
      if (preferred.length) pool = preferred;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showAIReactionBubble(playerIndex, emoji, text) {
    const row = document.querySelector(`#opponent-area .opponent-row[data-player-index="${playerIndex}"]`)
      || document.querySelector(`.opponent-row[data-player-index="${playerIndex}"]`);
    if (!row) return false;

    row.querySelectorAll('.ai-reaction-bubble').forEach(node => node.remove());

    const bubble = document.createElement('div');
    bubble.className = 'ai-reaction-bubble';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'ai-reaction-emoji';
    emojiSpan.textContent = emoji;
    bubble.appendChild(emojiSpan);

    if (text) {
      const label = document.createElement('small');
      label.textContent = text;
      bubble.appendChild(label);
    }

    row.appendChild(bubble);
    requestAnimationFrame(() => bubble.classList.add('show'));
    window.setTimeout(() => {
      bubble.classList.remove('show');
      window.setTimeout(() => bubble.remove(), 320);
    }, 2500);
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

  function triggerAIReaction(playerIndex, event, gameState) {
    if (!gameState || gameState.liveRoom) return false;
    if (playerIndex == null || playerIndex === gameState.humanIndex) return false;
    syncRound(gameState.round);
    if (!canReact(gameState)) return false;

    const probability = EVENT_PROB[event] ?? 0.2;
    if (Math.random() > probability) return false;

    const pick = chooseRandomAIReaction(event, playerIndex, gameState);
    if (!showAIReactionBubble(playerIndex, pick.emoji, pick.text)) return false;

    reactionState.lastReactAt = Date.now();
    reactionState.countThisRound += 1;
    return true;
  }

  function clearHumanIdleTimer(resetTurnKey) {
    if (reactionState.idleTimer) {
      clearTimeout(reactionState.idleTimer);
      reactionState.idleTimer = null;
    }
    reactionState.idlePulse = 0;
    if (resetTurnKey) reactionState.idleTurnKey = null;
  }

  function scheduleIdlePulse(gameState, turnKey) {
    reactionState.idleTimer = window.setTimeout(() => {
      reactionState.idleTimer = null;
      if (!gameState || gameState.liveRoom || gameState.gameOver) return;
      if (gameState.currentPlayer !== gameState.humanIndex) return;
      if (reactionState.idleTurnKey !== turnKey) return;

      const aiIndex = pickRandomAiIndex(gameState);
      if (aiIndex != null) triggerAIReaction(aiIndex, 'player_slow', gameState);

      reactionState.idlePulse += 1;
      if (reactionState.idlePulse < MAX_IDLE_PULSES && gameState.currentPlayer === gameState.humanIndex) {
        scheduleIdlePulse(gameState, turnKey);
      }
    }, HUMAN_IDLE_MS);
  }

  function onHumanTurnStart(gameState) {
    if (!gameState || gameState.liveRoom || gameState.gameOver) return;
    if (gameState.currentPlayer !== gameState.humanIndex) return;

    const turnKey = `${gameState.round}:${gameState.currentPlayer}`;
    if (reactionState.idleTurnKey === turnKey) return;

    clearHumanIdleTimer(false);
    reactionState.idleTurnKey = turnKey;
    reactionState.idlePulse = 0;
    scheduleIdlePulse(gameState, turnKey);
  }

  function resetAIReactions(round) {
    reactionState.lastReactAt = 0;
    reactionState.round = Number(round) || 0;
    reactionState.countThisRound = 0;
    clearHumanIdleTimer(true);
    document.querySelectorAll('.ai-reaction-bubble').forEach(node => node.remove());
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
    AI_EMOTIONS,
    chooseRandomAIReaction,
    canReact,
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
    pickRandomAiIndex
  };
})();
