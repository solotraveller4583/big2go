/* Big2Go — single-player AI emoji reactions (presentation only) */

(function () {
  const AI_EMOTIONS = [
    { emoji: '😂', text: 'Laugh', tags: ['positive'] },
    { emoji: '👏', text: 'Nice move', tags: ['positive'] },
    { emoji: '🔥', text: 'Good play', tags: ['positive'] },
    { emoji: '😮', text: 'Wow', tags: ['positive'] },
    { emoji: '😍', text: 'Amazing', tags: ['positive'] },
    { emoji: '👍', text: 'Respect', tags: ['positive'] },
    { emoji: '🤩', text: 'Impressive', tags: ['positive'] },
    { emoji: '😎', text: 'Cool', tags: ['positive'] },
    { emoji: '🎉', text: 'Celebration', tags: ['positive'] },
    { emoji: '⏰', text: 'Hurry up', tags: ['waiting'] },
    { emoji: '👀', text: 'Watching', tags: ['waiting'] },
    { emoji: '🤔', text: 'Thinking', tags: ['waiting'] },
    { emoji: '⌛', text: 'Waiting', tags: ['waiting'] },
    { emoji: '😴', text: 'Slow move', tags: ['waiting'] },
    { emoji: '🙄', text: 'Still waiting', tags: ['waiting'] },
    { emoji: '😏', text: 'My turn', tags: ['competitive'] },
    { emoji: '💪', text: 'Challenge', tags: ['competitive'] },
    { emoji: '😈', text: 'Bring it', tags: ['competitive'] },
    { emoji: '🧐', text: 'Interesting', tags: ['competitive'] },
    { emoji: '😤', text: 'Almost got you', tags: ['competitive'] },
    { emoji: '😱', text: 'Oh no', tags: ['bad_luck'] },
    { emoji: '😭', text: 'Sad', tags: ['bad_luck'] },
    { emoji: '😵', text: 'Confused', tags: ['bad_luck'] },
    { emoji: '😅', text: 'Close one', tags: ['bad_luck'] },
    { emoji: '🤦', text: 'Mistake', tags: ['bad_luck'] }
  ];

  const EVENT_TAGS = {
    ai_strong_play: ['positive', 'competitive'],
    player_strong_play: ['positive', 'competitive'],
    ai_win: ['positive'],
    ai_lose: ['bad_luck'],
    player_slow: ['waiting'],
    ai_waiting: ['waiting']
  };

  const EVENT_PROB = {
    ai_strong_play: 0.25,
    player_strong_play: 0.3,
    ai_win: 0.6,
    ai_lose: 0.35,
    player_slow: 0.1,
    ai_waiting: 0.1
  };

  const MAX_REACTIONS_PER_ROUND = 3;
  const HUMAN_IDLE_MS = 18000;

  const reactionState = {
    lastReactAt: 0,
    cooldownMs: 7000,
    round: 0,
    countThisRound: 0,
    idleTimer: null,
    idleFiredForTurn: false
  };

  function isStrongPlay(play) {
    if (!play) return false;
    if (play.count >= 5) return true;
    const strongKinds = new Set(['triple', 'straight', 'flush', 'full-house', 'four-kind', 'straight-flush']);
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
    if (Date.now() - reactionState.lastReactAt < reactionState.cooldownMs) return false;
    return true;
  }

  function chooseRandomAIReaction(event) {
    const tags = EVENT_TAGS[event] || ['positive'];
    const pool = AI_EMOTIONS.filter(entry => entry.tags.some(tag => tags.includes(tag)));
    const choices = pool.length ? pool : AI_EMOTIONS;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function showAIReactionBubble(playerIndex, emoji, text) {
    const row = document.querySelector(`.opponent-row[data-player-index="${playerIndex}"]`);
    if (!row) return;
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
    const probability = EVENT_PROB[event] ?? 0.15;
    if (Math.random() > probability) return false;
    const pick = chooseRandomAIReaction(event);
    showAIReactionBubble(playerIndex, pick.emoji, pick.text);
    reactionState.lastReactAt = Date.now();
    reactionState.countThisRound += 1;
    reactionState.cooldownMs = 5000 + Math.random() * 5000;
    return true;
  }

  function clearHumanIdleTimer() {
    if (reactionState.idleTimer) {
      clearTimeout(reactionState.idleTimer);
      reactionState.idleTimer = null;
    }
  }

  function onHumanTurnStart(gameState) {
    clearHumanIdleTimer();
    if (!gameState || gameState.liveRoom || gameState.gameOver) return;
    if (gameState.currentPlayer !== gameState.humanIndex) return;
    reactionState.idleFiredForTurn = false;
    reactionState.idleTimer = window.setTimeout(() => {
      if (!gameState || gameState.liveRoom || gameState.gameOver) return;
      if (gameState.currentPlayer !== gameState.humanIndex) return;
      if (reactionState.idleFiredForTurn) return;
      reactionState.idleFiredForTurn = true;
      const aiIndex = pickRandomAiIndex(gameState);
      if (aiIndex != null) triggerAIReaction(aiIndex, 'player_slow', gameState);
    }, HUMAN_IDLE_MS);
  }

  function resetAIReactions(round) {
    reactionState.lastReactAt = 0;
    reactionState.round = Number(round) || 0;
    reactionState.countThisRound = 0;
    reactionState.cooldownMs = 5000 + Math.random() * 5000;
    reactionState.idleFiredForTurn = false;
    clearHumanIdleTimer();
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

  function onVictory(winner, gameState) {
    clearHumanIdleTimer();
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
    onVictory,
    isStrongPlay,
    pickRandomAiIndex
  };
})();
