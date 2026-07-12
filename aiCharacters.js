/* Big2Go — AI character pool (data + selection; add characters here only) */

(function () {
  const TABLE_SLOTS = ['left', 'center', 'right'];

  const AI_CHARACTER_POOL = [
    {
      id: 'brownie',
      name: 'Brownie',
      personality: 'aggressive',
      playingStyle: 'aggressive',
      avatar: {
        src: 'assets/characters/brownie.svg',
        fallback: '🐻'
      },
      reactions: {
        player_slow: [
          'Hurry up! 😆',
          'Your turn already! ⏰',
          "I'm waiting... 👀",
          'Come on, show me your move 🔥',
          'Thinking too long? 😂',
          "Let's go! ⚡"
        ],
        ai_strong_play: [
          'How about this? 🔥',
          'Beat that! 😈',
          'Strong hand 💪',
          'Your move now 😎'
        ],
        ai_win_round: ['Told you 😎', 'Mine! 🎉', 'Too easy 🔥'],
        ai_lose_round: ['Lucky break 😤', 'Nice one 😅', 'You got me 🤦'],
        ai_win: ['Victory! 🎉', 'Champion 😎', 'GG 🔥'],
        ai_lose: ['Well played 👏', 'You win 😭', 'Rematch? 😤'],
        player_strong_play: ['Bold move 🤔', 'Interesting... 🧐', 'Show me more 🔥']
      }
    },
    {
      id: 'bunny',
      name: 'Bunny',
      personality: 'friendly',
      playingStyle: 'friendly',
      avatar: {
        src: 'assets/characters/bunny.svg',
        fallback: '🐰'
      },
      reactions: {
        player_slow: [
          'Take your time 😊',
          'I am ready 🐰',
          'No rush! 💫',
          'Still here with you 🌸',
          'Thinking hard? 🤔'
        ],
        ai_strong_play: [
          'Hope you like this 😊',
          'Can you beat this? 😏',
          'Nice combo coming! ✨',
          'Your turn friend 🐰'
        ],
        ai_win_round: ['Yay! 🎉', 'Got it 😊', 'Lucky bunny 🐰'],
        ai_lose_round: ['Good job! 👏', 'Wow 😮', 'So close 😅'],
        ai_win: ['We did it! 🎉', 'Happy win 😊', 'Great game 🌸'],
        ai_lose: ['Congrats! 👏', 'Well done 😊', 'You earned it 🎉'],
        player_strong_play: ['Interesting move 🤔', 'Nice play! 👏', 'Impressive 😮']
      }
    },
    {
      id: 'sally',
      name: 'Sally',
      personality: 'funny',
      playingStyle: 'funny',
      avatar: {
        src: 'assets/characters/sally.svg',
        fallback: '🎭'
      },
      reactions: {
        player_slow: [
          'Did you fall asleep? 😴',
          'Hello? Earth to human 🌍',
          'My popcorn is ready 🍿',
          'Still thinking? Bold strategy 😂',
          'Tick tock, comedy hour ⏰'
        ],
        ai_strong_play: [
          'Ta-da! 🎉',
          'Did NOT see that coming 😜',
          'Hold my cards 🃏',
          'Your move, superstar ✨'
        ],
        ai_win_round: ['Mic drop 🎤', 'Chef kiss 💋', 'Too funny 😂'],
        ai_lose_round: ['Okay wow 😅', 'You got jokes too 😆', 'Plot twist! 🎬'],
        ai_win: ['Standing ovation 👏', 'Encore! 🎭', 'What a show 🎉'],
        ai_lose: ['You win this episode 📺', 'Fair play comedian 😄', 'Rematch soon? 🍿'],
        player_strong_play: ['Oh snap 😮', 'Big energy 🔥', 'Respect the bit 👏']
      }
    },
    {
      id: 'cookie',
      name: 'Cookie',
      personality: 'smart',
      playingStyle: 'smart',
      avatar: {
        src: 'assets/characters/cookie.svg',
        fallback: '🍪'
      },
      reactions: {
        player_slow: [
          'Waiting here 🍪',
          "Don't keep us waiting 😜",
          'My cards are ready 😎',
          'Tick tock... ⏰',
          'Still snacking 🍪',
          'Hello? 👀'
        ],
        ai_strong_play: [
          'Fresh play! 🍪',
          'Try this 😜',
          'Cookie power 💪',
          'Crunch time 🔥'
        ],
        ai_win_round: ['Nom nom win 🍪', 'Sweet! 🎉', 'Gotcha 😎'],
        ai_lose_round: ['Oops 😅', 'Crumbled 😱', 'That hurt 🍪'],
        ai_win: ['Cookie wins! 🎉', 'Delicious victory 😎', 'Munch time 🔥'],
        ai_lose: ['You ate me up 😭', 'Crispy defeat 🍪', 'GG 😅'],
        player_strong_play: ['Spicy move 🌶️', 'Tasty play 😋', 'Oh wow 😮']
      }
    }
  ];

  const byId = new Map(AI_CHARACTER_POOL.map(character => [character.id, character]));
  const byName = new Map(AI_CHARACTER_POOL.map(character => [character.name.toLowerCase(), character]));

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function getById(id) {
    if (!id) return null;
    return byId.get(String(id).toLowerCase()) || null;
  }

  function getByName(name) {
    if (!name) return null;
    return byName.get(String(name).trim().toLowerCase()) || null;
  }

  function getForPlayer(player) {
    if (!player || player.isHuman) return null;
    return getById(player.characterId) || getByName(player.name) || null;
  }

  function pickRandom(count) {
    const needed = Math.max(0, Number(count) || 0);
    if (!needed) return [];
    const pool = shuffle([...AI_CHARACTER_POOL]);
    return pool.slice(0, Math.min(needed, pool.length));
  }

  function getTableSlot(gameState, playerIndex) {
    if (!gameState?.players?.length) return 'center';
    const aiIndices = gameState.players
      .map((player, index) => ({ player, index }))
      .filter(({ player, index }) => index !== gameState.humanIndex && player && !player.isHuman)
      .map(({ index }) => index);
    const position = aiIndices.indexOf(playerIndex);
    return TABLE_SLOTS[position] || 'center';
  }

  function renderAvatar(container, characterOrPlayer, options = {}) {
    if (!container) return false;
    const character = characterOrPlayer?.avatar
      ? characterOrPlayer
      : getForPlayer(characterOrPlayer);
    const className = options.className || 'character-avatar';
    const imgClassName = options.imgClassName || `${className}-img`;

    container.innerHTML = '';
    container.classList.add(className);

    const fallback = character?.avatar?.fallback || character?.name?.charAt(0)?.toUpperCase() || '?';
    const src = character?.avatar?.src || '';
    const alt = character?.name ? `${character.name} avatar` : 'AI avatar';

    if (src) {
      const img = document.createElement('img');
      img.className = imgClassName;
      img.src = src;
      img.alt = alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        container.textContent = fallback;
        container.classList.add(`${className}--fallback`);
      }, { once: true });
      container.appendChild(img);
      return true;
    }

    container.textContent = fallback;
    container.classList.add(`${className}--fallback`);
    return true;
  }

  window.Big2GoAICharacters = {
    pool: AI_CHARACTER_POOL,
    getById,
    getByName,
    getForPlayer,
    pickRandom,
    getTableSlot,
    renderAvatar
  };
})();
