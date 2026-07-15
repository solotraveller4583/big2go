/* Big2Go — AI character pool (data + selection; add characters here only) */

(function () {
  const TABLE_SLOTS = ['left', 'center', 'right'];

  const LEGACY_CHARACTER_IDS = {
    brownie: 'bruno',
    bunny: 'luna',
    sally: 'kiro',
    cookie: 'kiro',
    mochi: 'bao',
    panda: 'tora',
    boba: 'bao',
    pip: 'pico'
  };

  const AI_CHARACTER_POOL = [
    {
      id: 'bruno',
      name: 'Bruno',
      personality: 'aggressive',
      playingStyle: 'aggressive',
      avatar: {
        src: 'assets/characters/bruno.svg',
        fallback: 'B'
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
      },
      rival: {
        defeatPlayer: [
          'Better luck next time 😏',
          'Too easy for me 🔥',
          'Train harder and come back 💪',
          'That table was mine from the start',
          'Come back when your hand is stronger 😎',
          'I barely had to try that round 😏',
          'Big Two legend? Not yet 🔥',
          'Study my moves and try again 📚'
        ],
        defeatedByPlayer: [
          "Next time I won't lose 🔥",
          'You got lucky this round 😤',
          'Rematch — I want a rematch!',
          'I was holding back... maybe 😏',
          'You caught me off guard this time',
          'Fine. Round two. Right now 💪',
          "That win won't repeat twice 😤",
          "Don't get used to beating Bruno 🔥"
        ]
      },
      farewell: {
        humanWon: ['You got me this time 😏', 'Respect — you earned that win', 'See you at the next table 💪'],
        humanLost: ['Better luck next round 😏', 'Train up and come back 🔥', 'The table remembers']
      }
    },
    {
      id: 'luna',
      name: 'Luna',
      personality: 'friendly',
      playingStyle: 'friendly',
      avatar: {
        src: 'assets/characters/luna.svg',
        fallback: 'L'
      },
      reactions: {
        player_slow: [
          'Take your time 😊',
          'I am ready ✨',
          'No rush! 💫',
          'Still here with you 🌙',
          'Thinking hard? 🤔'
        ],
        ai_strong_play: [
          'Hope you like this 😊',
          'Can you beat this? 😏',
          'Nice combo coming! ✨',
          'Your turn, friend'
        ],
        ai_win_round: ['Yay! 🎉', 'Got it 😊', 'Lucky moon ✨'],
        ai_lose_round: ['Good job! 👏', 'Wow 😮', 'So close 😅'],
        ai_win: ['We did it! 🎉', 'Happy win 😊', 'Great game 🌙'],
        ai_lose: ['Congrats! 👏', 'Well done 😊', 'You earned it 🎉'],
        player_strong_play: ['Interesting move 🤔', 'Nice play! 👏', 'Impressive 😮']
      },
      rival: {
        defeatPlayer: [
          'Good game — you played well 😊',
          'Maybe next round? ✨',
          'I had fun anyway 🌙',
          'You kept me on my toes 👏',
          'So close — want another try?',
          'That was a lovely match ✨',
          'Your moves were really sharp today 😊',
          'Same time tomorrow for a rematch? 🌙'
        ],
        defeatedByPlayer: [
          'Wow, you are amazing 👏',
          'I will practice more for next time ✨',
          'You totally deserved that win',
          'I am cheering for you now 🌙',
          'That was beautiful play 😊',
          'You made that look easy',
          'Okay wow — teach me your secrets ✨',
          'Best match I have had in ages 👏'
        ]
      },
      farewell: {
        humanWon: ['That was fun! See you again ✨', 'You played beautifully 🌙', 'Same time tomorrow?'],
        humanLost: ['Good game — you kept it close', 'I had fun anyway 🌙', 'Want another round? ✨']
      }
    },
    {
      id: 'kiro',
      name: 'Kiro',
      personality: 'smart',
      playingStyle: 'smart',
      avatar: {
        src: 'assets/characters/kiro.svg',
        fallback: 'K'
      },
      reactions: {
        player_slow: [
          'Running the numbers... 📊',
          "Don't keep us waiting 😜",
          'My cards are ready 😎',
          'Tick tock... ⏰',
          'Still calculating 📊',
          'Hello? 👀'
        ],
        ai_strong_play: [
          'Fresh play! 🔥',
          'Try this 😜',
          'Sharp read 💪',
          'Crunch time 🔥'
        ],
        ai_win_round: ['Clean read 📊', 'Sweet! 🎉', 'Gotcha 😎'],
        ai_lose_round: ['Oops 😅', 'Miscalculated 😱', 'That hurt'],
        ai_win: ['Kiro wins! 🎉', 'Calculated victory 😎', 'Data wins 🔥'],
        ai_lose: ['You outplayed me 😭', 'Sharp defeat', 'GG 😅'],
        player_strong_play: ['Spicy move 🌶️', 'Tasty play 😋', 'Oh wow 😮']
      },
      rival: {
        defeatPlayer: [
          'Calculated win — clean 📊',
          'The odds favored me this round',
          'Crunch time complete 😎',
          'Probability says I win again next time 📈',
          'That plan worked perfectly',
          'Data does not lie — Kiro wins 🤓',
          'Another clean read of the table 😎',
          'Victory, well earned'
        ],
        defeatedByPlayer: [
          'My strategy needs a patch 🤓',
          'Well played — I underestimated you',
          'Next match I am updating my playbook 🔥',
          'Your reads were sharper than mine 📊',
          'I miscalculated one turn — impressive',
          'Running simulations for our rematch now 🤓',
          'That loss goes in my learning log 📚',
          'You cracked my game plan this round 🔥'
        ]
      },
      farewell: {
        humanWon: ['That loss goes in my learning log 📚', 'Well played — updating my playbook', 'Sharp reads this round 🤓'],
        humanLost: ['Probability favored me today 📊', 'Crunch time complete', 'Rematch after more data? 📈']
      }
    },
    {
      id: 'pico',
      name: 'Pico',
      personality: 'energetic',
      playingStyle: 'aggressive',
      avatar: {
        src: 'assets/characters/pico.svg',
        fallback: 'P'
      },
      reactions: {
        player_slow: [
          'Go go go! ⚡',
          'My wings are ready ⚡',
          'Too slow! 😤',
          'Zoom zoom — your turn ⏰',
          'I am bouncing here',
          'Hurry hurry! 🔥'
        ],
        ai_strong_play: [
          'Speed attack! ⚡',
          'Fast combo 🔥',
          'Beat this burst',
          'Tiny but mighty 💪',
          'Zoom play!'
        ],
        ai_win_round: ['Quick win ⚡', 'Zoom! 🔥', 'Too fast', 'Speed champion 🎉'],
        ai_lose_round: ['You got me 😤', 'Lucky burst 😅', 'Wow 😮', 'Strong! 👏'],
        ai_win: ['Pico wins! ⚡', 'Champion speed 🎉', 'Fastest hands 🔥'],
        ai_lose: ['You win 😭', 'Good speed 👏', 'Rematch!'],
        player_strong_play: ['Big energy 🔥', 'Whoa 😮', 'Fast hands 👏', 'Strong play 💪']
      },
      rival: {
        defeatPlayer: [
          'Too fast for you ⚡',
          'Zoom zoom victory 🔥',
          'Train your reflexes 💪',
          'Speed champion again 🎉',
          'That table was mine',
          'Come back faster 😏',
          'Pico wins again ⚡',
          'Blink and you miss it 🔥'
        ],
        defeatedByPlayer: [
          'You outran my plays 😤',
          'Fine — rematch now',
          'That win was fast 🔥',
          'I was one beat late ⚡',
          'Respect the comeback 👏',
          'Next round I hatch a plan',
          'You clipped my speed today 😭',
          'Okay okay — you win 💪'
        ]
      },
      farewell: {
        humanWon: ['Fast win — respect ⚡', 'You played perfectly 👏', 'Rematch at full speed 🔥'],
        humanLost: ['Pico zooms away with the win', 'Speed wins again 🔥', 'Race you again? ⚡']
      }
    },
    {
      id: 'bao',
      name: 'Bao',
      personality: 'playful',
      playingStyle: 'funny',
      avatar: {
        src: 'assets/characters/bao.svg',
        fallback: 'B'
      },
      reactions: {
        player_slow: [
          'Still steaming... 🥟',
          'Stir stir... still thinking? 😜',
          'Getting warm ☕',
          'Hello? 👀',
          'Sip while you decide 😏',
          'Bao patience running low 😂'
        ],
        ai_strong_play: [
          'Chewy combo! 🥟',
          'Slurp this play 😎',
          'Bubble power 💥',
          'Try beating Bao 🔥',
          'Fresh serve incoming ✨'
        ],
        ai_win_round: ['Soft win 🥟', 'Chewy! 😎', 'Bubble burst 🎉', 'Tasty trick ✨'],
        ai_lose_round: ['You popped me 😅', 'Spicy counter 🌶️', 'Okay wow 😮', 'Fair play 👏'],
        ai_win: ['Bao wins! 🥟', 'Full plate victory 😎', 'Cheers 🔥'],
        ai_lose: ['You ate my win 😭', 'Well played', 'Rematch? 😤'],
        player_strong_play: ['Spicy hand 🌶️', 'Big energy 🔥', 'That hits 👏', 'Bubble trouble 😮']
      },
      rival: {
        defeatPlayer: [
          'Bottoms up — I win 🥟',
          'Chewy victory lap 😎',
          'That round had extra flavor ✨',
          'Come back with stronger tea 🔥',
          'Bao always bounces back',
          'Sip on that defeat 😏',
          'Champion again 🎉',
          'Order a rematch to go 🥟'
        ],
        defeatedByPlayer: [
          'You spilled my strategy 😭',
          'That play was extra sweet 👏',
          'I need a refill rematch',
          'You cracked the combo this time 🔥',
          'Okay main character 😤',
          'Bubble burst... respect ✨',
          'Next round I am extra bold 😎',
          'Chewy defeat tastes bitter 🥟'
        ]
      },
      farewell: {
        humanWon: ['You earned the last bite 🥟', 'Sweet win — respect 👏', 'Same table next round? ✨'],
        humanLost: ['Full plate of victory 🥟', 'Fun match 😎', 'Rematch on the house? 🔥']
      }
    },
    {
      id: 'tora',
      name: 'Tora',
      personality: 'calm',
      playingStyle: 'smart',
      avatar: {
        src: 'assets/characters/tora.svg',
        fallback: 'T'
      },
      reactions: {
        player_slow: [
          'Zen mode...',
          'No hurry ☁️',
          'Take your time 🌿',
          'Still calm and ready',
          'I wait peacefully 😌',
          'Slow is smooth'
        ],
        ai_strong_play: [
          'Calculated play',
          'Balanced move ☁️',
          'Try this read 📊',
          'Steady hand',
          'Your turn 😌'
        ],
        ai_win_round: ['Clean trick', 'Balanced win ☁️', 'Smooth 😌', 'As planned 📊'],
        ai_lose_round: ['Sharp play 👏', 'Good read 😮', 'Respect', 'Well done 🌿'],
        ai_win: ['Tora wins', 'Calm champion ☁️', 'Peace and victory'],
        ai_lose: ['Well played 👏', 'You earned it', 'Good game 😌'],
        player_strong_play: ['Strong read 🤔', 'Interesting line 👏', 'Bold but smart 📊', 'Nice tempo']
      },
      rival: {
        defeatPlayer: [
          'Calm win for Tora',
          'The table needed balance ☁️',
          'Study the trick flow 📊',
          'Patience pays 🌿',
          'Return when centered 😌',
          'Smooth finish',
          'That read was clean 📊',
          'Zen victory ☁️'
        ],
        defeatedByPlayer: [
          'You broke my calm 😤',
          'Impressive focus 👏',
          'I misplayed one turn',
          'Rematch after meditation? ☁️',
          'Your reads were sharper 📊',
          'Tora respects that win',
          'I will train more 😌',
          'Well earned champion'
        ]
      },
      farewell: {
        humanWon: ['Strong mind, strong win', 'Respect your focus 👏', 'Until next calm battle ☁️'],
        humanLost: ['Balance favored me today', 'Good game 😌', 'Same table soon? 🌿']
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

  function resolveCharacterId(id) {
    if (!id) return null;
    const key = String(id).toLowerCase();
    return LEGACY_CHARACTER_IDS[key] || key;
  }

  function getById(id) {
    if (!id) return null;
    return byId.get(resolveCharacterId(id)) || null;
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

  const rivalLineBags = new Map();

  function pickRivalLine(lines, bagKey) {
    if (!Array.isArray(lines) || !lines.length) return '';

    let bag = rivalLineBags.get(bagKey);
    if (!bag || !bag.remaining.length) {
      let pool = [...lines];
      if (bag?.last && pool.length > 1) {
        pool = pool.filter(line => line !== bag.last);
      }
      bag = { remaining: shuffle(pool), last: bag?.last ?? null };
      rivalLineBags.set(bagKey, bag);
    }

    const pick = bag.remaining.shift();
    bag.last = pick;
    return pick || lines[0];
  }

  function resolveRivalPlayer(gameState, winner) {
    if (!gameState?.players?.length || !winner) return null;
    if (!winner.isHuman) return winner;

    let rivalPlayer = null;
    let fewestCards = Infinity;
    gameState.players.forEach((player, index) => {
      if (index === gameState.humanIndex || !player || player.isHuman) return;
      const count = Array.isArray(player.hand) ? player.hand.length : Infinity;
      if (count < fewestCards) {
        fewestCards = count;
        rivalPlayer = player;
      }
    });
    return rivalPlayer || gameState.players.find((player, index) => index !== gameState.humanIndex && player && !player.isHuman) || null;
  }

  function getSessionFarewells(gameState, lastWinner) {
    if (!gameState?.players?.length) return [];
    const humanWon = Boolean(lastWinner?.isHuman);
    return gameState.players
      .filter(player => player && !player.isHuman)
      .map(player => {
        const character = getForPlayer(player);
        if (!character) return null;
        const pool = humanWon ? character.farewell?.humanWon : character.farewell?.humanLost;
        const fallback = humanWon ? character.rival?.defeatedByPlayer : character.rival?.defeatPlayer;
        const message = pickRivalLine(pool, `${character.id}:farewell:${humanWon}`)
          || pickRivalLine(fallback, `${character.id}:farewell-fallback:${humanWon}`)
          || (humanWon ? 'Great game!' : 'See you again!');
        return { character, player, message };
      })
      .filter(Boolean);
  }

  function getRivalVictoryCopy(winner, gameState) {
    if (!gameState || gameState.liveRoom || !winner) return null;
    const rivalPlayer = resolveRivalPlayer(gameState, winner);
    const character = getForPlayer(rivalPlayer);
    if (!character) return null;

    const playerWon = Boolean(winner.isHuman);
    const scenario = playerWon ? 'defeatedByPlayer' : 'defeatPlayer';
    const lines = character.rival?.[scenario];
    const bagKey = `${character.id}:${scenario}`;
    const quote = pickRivalLine(lines, bagKey)
      || pickRivalLine(character.reactions?.[playerWon ? 'ai_lose' : 'ai_win'], `${character.id}:reaction-${scenario}`)
      || (playerWon ? 'Good game!' : 'Better luck next time!');

    return {
      character,
      rivalPlayer,
      title: playerWon ? `You defeated ${character.name}!` : `${character.name} defeated you!`,
      speakerLabel: `${character.name} says:`,
      quote,
      rematchLabel: 'Rematch?'
    };
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

  const HUMAN_LAST_CARD_VOICES = {
    male: {
      id: 'player-male',
      doorbell: 'player-bruno',
      label: 'Ding-dong!'
    },
    female: {
      id: 'player-female',
      doorbell: 'player-luna',
      label: 'Chime-chime!'
    }
  };

  const AI_LAST_CARD_VOICES = {
    bruno: { doorbell: 'bruno', label: 'Gong-gong!' },
    luna: { doorbell: 'luna', label: 'Ring-ring-ring!' },
    kiro: { doorbell: 'kiro', label: 'Westminster!' },
    pico: { doorbell: 'pico', label: 'Pip-pip-ding!' },
    bao: { doorbell: 'bao', label: 'Bubble-ding!' },
    tora: { doorbell: 'tora', label: 'Low bell!' }
  };

  function getLastCardVoiceProfile(player, options = {}) {
    if (!player) return HUMAN_LAST_CARD_VOICES.male;
    if (player.isHuman) {
      const gender = options.gender === 'female' ? 'female' : 'male';
      return HUMAN_LAST_CARD_VOICES[gender];
    }
    const character = getForPlayer(player);
    const voice = character ? AI_LAST_CARD_VOICES[character.id] : null;
    if (voice) return { id: character.id, ...voice };
    return {
      id: character?.id || player.characterId || player.name || 'ai',
      doorbell: 'default',
      label: 'Ding-dong!'
    };
  }

  window.Big2GoAICharacters = {
    pool: AI_CHARACTER_POOL,
    getById,
    getByName,
    getForPlayer,
    pickRandom,
    getTableSlot,
    getRivalVictoryCopy,
    getSessionFarewells,
    renderAvatar,
    getLastCardVoiceProfile
  };
})();
