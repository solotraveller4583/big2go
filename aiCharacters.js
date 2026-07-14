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
      },
      rival: {
        defeatPlayer: [
          'Better luck next time 😏',
          'Too easy for me 🔥',
          'Train harder and come back 💪',
          'That table was mine from the start 🐻',
          'Come back when your hand is stronger 😎',
          'I barely had to try that round 😏',
          'Big Two legend? Not yet 🔥',
          'Study my moves and try again 📚'
        ],
        defeatedByPlayer: [
          "Next time I won't lose 🔥",
          'You got lucky this round 😤',
          'Rematch — I want a rematch! 🐻',
          'I was holding back... maybe 😏',
          'You caught me off guard this time 🐻',
          'Fine. Round two. Right now 💪',
          "That win won't repeat twice 😤",
          "My claws slipped — don't get used to it 🔥"
        ]
      },
      farewell: {
        humanWon: ['You got me this time 😏', 'Respect — you earned that win 🐻', 'See you at the next table 💪'],
        humanLost: ['Better luck next round 😏', 'Train up and come back 🔥', 'The table remembers 🐻']
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
      },
      rival: {
        defeatPlayer: [
          'Good game — you played well 😊',
          'Maybe next round? 🐰',
          'I had fun anyway 🌸',
          'You kept me on my toes 👏',
          'So close — want another try? 🐰',
          'That was a lovely match ✨',
          'Your moves were really sharp today 😊',
          'Same time tomorrow for a rematch? 🌸'
        ],
        defeatedByPlayer: [
          'Wow, you are amazing 👏',
          'I will practice more for next time 🐰',
          'You totally deserved that win ✨',
          'I am cheering for you now 🌸',
          'That was beautiful play 😊',
          'You made that look easy 🐰',
          'Okay wow — teach me your secrets ✨',
          'Best match I have had in ages 👏'
        ]
      },
      farewell: {
        humanWon: ['That was fun! See you again 🐰', 'You played beautifully ✨', 'Same time tomorrow? 🌸'],
        humanLost: ['Good game — you kept it close 🐰', 'I had fun anyway 🌸', 'Want another round? ✨']
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
      },
      rival: {
        defeatPlayer: [
          'And the crowd goes wild 🎭',
          'That was my best episode yet 🍿',
          'Write that down — Sally wins 📺',
          'Somebody call the press — Sally wins again 🎤',
          'I should get my own TV show after that 🍿',
          'Plot twist: Sally always wins 😜',
          "That ending was chef's kiss 💋",
          'Credits roll — starring Sally 🎬'
        ],
        defeatedByPlayer: [
          'You stole the show this time 🎬',
          'Fine, you got the punchline 😂',
          'Encore rematch? I have new jokes 🍿',
          'Okay that twist got me good 😅',
          'You wrote a better ending than me 📺',
          'I demand a sequel immediately 🎭',
          'The audience picks you tonight 👏',
          'Save some spotlight for me next round 🍿'
        ]
      },
      farewell: {
        humanWon: ['Great game ❤️', 'You stole the show 🎭', 'Encore soon? 🍿'],
        humanLost: ['Same time next episode? 📺', 'The crowd wants a rematch 🎤', 'Save me a seat 🍿']
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
      },
      rival: {
        defeatPlayer: [
          'Calculated win — sweet 🍪',
          'The odds favored me this round 📊',
          'Crunch time complete 😎',
          'Probability says I win again next time 📈',
          'That plan baked perfectly 🍪',
          'Data does not lie — Cookie wins 🤓',
          'Another clean read of the table 😎',
          'Sweet victory, well earned 🍪'
        ],
        defeatedByPlayer: [
          'My strategy needs a patch 🤓',
          'Well played — I underestimated you 🍪',
          'Next match I am updating my playbook 🔥',
          'Your reads were sharper than mine 📊',
          'I miscalculated one turn — impressive 🍪',
          'Running simulations for our rematch now 🤓',
          'That loss goes in my learning log 📚',
          'You cracked my cookie code this round 🔥'
        ]
      },
      farewell: {
        humanWon: ['That loss goes in my learning log 📚', 'Well played — updating my playbook 🍪', 'Sharp reads this round 🤓'],
        humanLost: ['Probability favored me today 📊', 'Crunch time complete 🍪', 'Rematch after more data? 📈']
      }
    },
    {
      id: 'mochi',
      name: 'Mochi',
      personality: 'sweet',
      playingStyle: 'friendly',
      avatar: {
        src: 'assets/characters/mochi.svg',
        fallback: '🍡'
      },
      reactions: {
        player_slow: [
          'No rush, friend 🍡',
          'Take a breath 😊',
          'I am still here 💕',
          'Soft pause is okay ✨',
          'Thinking is cute too 🍡',
          'Whenever you are ready 🌸'
        ],
        ai_strong_play: [
          'Squishy power! 🍡',
          'Try this combo ✨',
          'Sweet move incoming 💕',
          'Can you beat mochi? 😊',
          'Bouncy play! 🎀'
        ],
        ai_win_round: ['Yay squish 🍡', 'Soft win ✨', 'So sweet 🎉', 'Mochi moment 💕'],
        ai_lose_round: ['Whoa nice 👏', 'You popped that 😮', 'Impressive 🌸', 'Okay wow 😅'],
        ai_win: ['Mochi wins! 🍡', 'Sweet victory ✨', 'Squish champion 💕'],
        ai_lose: ['You win! 👏', 'Soft clap for you 😊', 'Beautiful game 🍡'],
        player_strong_play: ['Pretty strong ✨', 'Nice and bold 👏', 'Love that play 💕', 'Sparkly move 🌸']
      },
      rival: {
        defeatPlayer: [
          'Soft win for mochi 🍡',
          'That round was sweet ✨',
          'Come back for dessert rematch 💕',
          'Squish victory! 🎀',
          'You fought well though 👏',
          'Mochi rolls on~ 🍡',
          'Gentle domination 😊',
          'Same table soon? 🌸'
        ],
        defeatedByPlayer: [
          'You popped my mochi 😭',
          'That was beautifully played ✨',
          'I need more practice 🍡',
          'You are too strong today 💪',
          'Soft defeat... respect 👏',
          'Rematch with extra sugar? 🍡',
          'Okay you win this squish 🌸',
          'I am cheering for you now 💕'
        ]
      },
      farewell: {
        humanWon: ['Sweet game — you earned it 🍡', 'Soft clap for the champ 👏', 'See you for dessert rematch ✨'],
        humanLost: ['Gentle win for me 🍡', 'That was fun 💕', 'Want another round? 🌸']
      }
    },
    {
      id: 'panda',
      name: 'Panda',
      personality: 'calm',
      playingStyle: 'smart',
      avatar: {
        src: 'assets/characters/panda.svg',
        fallback: '🐼'
      },
      reactions: {
        player_slow: [
          'Zen mode... 🐼',
          'No hurry ☁️',
          'Take your time 🌿',
          'Still bamboo calm 🎋',
          'I wait peacefully 😌',
          'Slow is smooth 🐼'
        ],
        ai_strong_play: [
          'Calculated play 🐼',
          'Balanced move ☁️',
          'Try this read 📊',
          'Steady hand 🎋',
          'Your turn 😌'
        ],
        ai_win_round: ['Clean trick 🐼', 'Balanced win ☁️', 'Smooth 😌', 'As planned 📊'],
        ai_lose_round: ['Sharp play 👏', 'Good read 😮', 'Respect 🐼', 'Well done 🌿'],
        ai_win: ['Panda wins 🐼', 'Calm champion ☁️', 'Peace and victory 🎋'],
        ai_lose: ['Well played 👏', 'You earned it 🐼', 'Good game 😌'],
        player_strong_play: ['Strong read 🤔', 'Interesting line 👏', 'Bold but smart 📊', 'Nice tempo 🐼']
      },
      rival: {
        defeatPlayer: [
          'Calm win for panda 🐼',
          'The table needed balance ☁️',
          'Study the trick flow 📊',
          'Bamboo patience pays 🎋',
          'Return when centered 😌',
          'Smooth finish 🐼',
          'That read was clean 📊',
          'Zen victory ☁️'
        ],
        defeatedByPlayer: [
          'You broke my calm 😤',
          'Impressive focus 👏',
          'I misplayed one turn 🐼',
          'Rematch after meditation? ☁️',
          'Your reads were sharper 📊',
          'Panda respects that win 🎋',
          'I will train more 😌',
          'Well earned champion 🐼'
        ]
      },
      farewell: {
        humanWon: ['Strong mind, strong win 🐼', 'Respect your focus 👏', 'Until next calm battle ☁️'],
        humanLost: ['Balance favored me today 🐼', 'Good game 😌', 'Same bamboo table soon? 🎋']
      }
    },
    {
      id: 'boba',
      name: 'Boba',
      personality: 'playful',
      playingStyle: 'funny',
      avatar: {
        src: 'assets/characters/boba.svg',
        fallback: '🧋'
      },
      reactions: {
        player_slow: [
          'My pearls are waiting 🧋',
          'Stir stir... still thinking? 😜',
          'Tea getting cold ☕',
          'Hello? 🧋👀',
          'Sip while you decide 😏',
          'Boba patience running low 😂'
        ],
        ai_strong_play: [
          'Chewy combo! 🧋',
          'Slurp this play 😎',
          'Bubble power 💥',
          'Try beating boba 🔥',
          'Fresh pour incoming ✨'
        ],
        ai_win_round: ['Slurp win 🧋', 'Chewy! 😎', 'Bubble burst 🎉', 'Tasty trick ✨'],
        ai_lose_round: ['You popped me 😅', 'Spicy counter 🌶️', 'Okay wow 😮', 'Fair sip 👏'],
        ai_win: ['Boba wins! 🧋', 'Full cup victory 😎', 'Cheers 🔥'],
        ai_lose: ['You drank my win 😭', 'Well played 🧋', 'Rematch? 😤'],
        player_strong_play: ['Spicy hand 🌶️', 'Big sip energy 🔥', 'That hits 👏', 'Bubble trouble 😮']
      },
      rival: {
        defeatPlayer: [
          'Bottoms up — I win 🧋',
          'Chewy victory lap 😎',
          'That round had extra pearls ✨',
          'Come back with stronger tea 🔥',
          'Boba always bounces back 🧋',
          'Sip on that defeat 😏',
          'Bubble champion again 🎉',
          'Order a rematch to go 🧋'
        ],
        defeatedByPlayer: [
          'You spilled my strategy 😭',
          'That play was extra sweet 👏',
          'I need a refill rematch 🧋',
          'You cracked the cup this time 🔥',
          'Okay main character 😤',
          'Bubble burst... respect ✨',
          'Next round I am extra ice 😎',
          'Chewy defeat tastes bitter 🧋'
        ]
      },
      farewell: {
        humanWon: ['You earned the last sip 🧋', 'Sweet win — respect 👏', 'Same shop next round? ✨'],
        humanLost: ['Cup runneth over with victory 🧋', 'Fun pour 😎', 'Rematch on the house? 🔥']
      }
    },
    {
      id: 'pip',
      name: 'Pip',
      personality: 'energetic',
      playingStyle: 'aggressive',
      avatar: {
        src: 'assets/characters/pip.svg',
        fallback: '🐥'
      },
      reactions: {
        player_slow: [
          'Peep peep hurry! 🐥',
          'My wings are ready ⚡',
          'Too slow! 😤',
          'Chirp chirp — your turn ⏰',
          'I am bouncing here 🐥',
          'Go go go! 🔥'
        ],
        ai_strong_play: [
          'Peck attack! 🐥',
          'Fast combo ⚡',
          'Beat this chirp 🔥',
          'Tiny but mighty 💪',
          'Zoom play! 🐥'
        ],
        ai_win_round: ['Peep win 🐥', 'Zoom! ⚡', 'Too fast 🔥', 'Chirp champion 🎉'],
        ai_lose_round: ['You got me 😤', 'Lucky peck 😅', 'Wow 😮', 'Strong! 👏'],
        ai_win: ['Pip wins! 🐥', 'Champion chirp 🎉', 'Fastest beak ⚡'],
        ai_lose: ['You win 😭', 'Good peck 👏', 'Rematch! 🐥'],
        player_strong_play: ['Big peck energy 🔥', 'Whoa 😮', 'Fast hands 👏', 'Strong chick 💪']
      },
      rival: {
        defeatPlayer: [
          'Too fast for you 🐥',
          'Peck peck victory ⚡',
          'Train your wings 💪',
          'Chirp chirp champion 🎉',
          'That table was mine 🔥',
          'Come back faster 😏',
          'Tiny legend wins again 🐥',
          'Zoom zoom defeat ⚡'
        ],
        defeatedByPlayer: [
          'You outran my pecks 😤',
          'Fine — rematch now 🐥',
          'That win was fast 🔥',
          'I was one chirp late ⚡',
          'Respect the comeback 👏',
          'Next round I hatch a plan 🐥',
          'You clipped my wings today 😭',
          'Peep... okay you win 💪'
        ]
      },
      farewell: {
        humanWon: ['Fast win — respect 🐥', 'You pecked perfectly 👏', 'Rematch at full speed ⚡'],
        humanLost: ['Pip zooms away with the win 🐥', 'Chirp chirp 🔥', 'Race you again? ⚡']
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
      doorbell: 'captain',
      label: 'Ding-dong!'
    },
    female: {
      id: 'player-female',
      doorbell: 'wonder',
      label: 'Chime-chime!'
    }
  };

  const AI_LAST_CARD_VOICES = {
    brownie: { doorbell: 'brownie', label: 'Gong-gong!' },
    bunny: { doorbell: 'bunny', label: 'Ring-ring-ring!' },
    sally: { doorbell: 'sally', label: 'Ding-ding-dong!' },
    cookie: { doorbell: 'cookie', label: 'Westminster!' },
    mochi: { doorbell: 'mochi', label: 'Bubble-ding!' },
    panda: { doorbell: 'panda', label: 'Low bell!' },
    boba: { doorbell: 'boba', label: 'Boing-ding!' },
    pip: { doorbell: 'pip', label: 'Pip-pip-ding!' }
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
