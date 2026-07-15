/* Big2Go — language selection and UI translations */

(function () {
  'use strict';

  const LANGUAGE_KEY = 'big2go-language-v1';
  const DEFAULT_LOCALE = 'en';

  const LOCALES = [
    { id: 'en', flag: '🇺🇸', label: 'English' },
    { id: 'th', flag: '🇹🇭', label: 'ไทย' },
    { id: 'zh', flag: '🇨🇳', label: '中文' },
    { id: 'ja', flag: '🇯🇵', label: '日本語' },
    { id: 'ko', flag: '🇰🇷', label: '한국어' }
  ];

  const MESSAGES = {
    en: {
      'language.welcome': 'Welcome to Big2Go',
      'language.choose': 'Choose your language',
      'landing.heroKicker': 'Fast Big 2 battles',
      'landing.heroPromise': 'Choose a table and start playing in one tap.',
      'landing.yourName': 'Your name',
      'landing.namePlaceholder': 'Enter your name',
      'landing.spade': 'Spade',
      'landing.heart': 'Heart',
      'landing.playNow': 'PLAY NOW',
      'landing.ctaSub': '4-player quick table · 2-minute rounds',
      'landing.continueGame': 'Continue Game',
      'landing.resume': 'Resume Previous Game',
      'landing.recoveryDefault': 'You have an active Big2Go game.',
      'landing.rejoin': 'REJOIN GAME',
      'landing.exitGame': 'EXIT GAME',
      'landing.continue': 'CONTINUE',
      'landing.continueSub': 'Last Game',
      'landing.room': 'ROOM',
      'landing.roomSub': 'Create / Join',
      'landing.demo': 'DEMO',
      'landing.demoSub': 'How to Play',
      'landing.share': 'SHARE',
      'landing.shareSub': 'Invite Friends',
      'landing.matchMode': 'Match Mode',
      'landing.classic': 'Classic',
      'landing.fast': 'Fast',
      'landing.duel': 'Duel',
      'landing.players4': '4 players',
      'landing.players3': '3 players',
      'landing.players2': '2 players',
      'landing.privatePlay': 'private play',
      'landing.yourNameDefault': 'Your name',
      'landing.privacy': 'Privacy',
      'landing.terms': 'Terms',
      'game.ready': 'Ready',
      'game.yourTurn': 'YOUR TURN',
      'game.playerTurn': "{name}'s turn",
      'game.gameOver': 'Game over',
      'game.matchFinished': 'Match finished.',
      'game.beatPlay': 'Beat {play}',
      'game.openingHand': 'Opening hand',
      'game.youLead': 'You lead',
      'game.arena': 'Big2Go Arena',
      'game.statusLine': '{requirement} · Round {round} · Sparks {sparks}',
      'game.yourCards': 'Your cards',
      'game.trick': 'Trick',
      'game.round': 'Round',
      'game.sparks': 'Sparks',
      'game.open': 'Open',
      'game.yourCoins': 'Your Coins',
      'game.prizePool': 'Prize Pool',
      'game.lastPlay': 'Last Play',
      'game.currentTrick': 'The current trick',
      'game.selected': '{count} selected',
      'game.trickEmptyOpening': '♦ 3 Holder Starts',
      'game.trickEmptyOpen': 'The table is open — lead any legal hand.',
      'game.leadOpening': 'Lead the opening move with 3♦.',
      'game.yourHand': 'Your hand',
      'game.handHelp': 'Tap cards to lift them. Play a stronger combo or pass.',
      'game.tableFeed': 'Table Feed',
      'game.tableFeedSub': 'Recent moves and combo reactions.',
      'game.tableMomentum': 'Table Momentum',
      'game.heatLow': 'The Big2Go crowd is waiting for a spark.',
      'game.heatMid': 'The Big2Go crowd is leaning in.',
      'game.heatHigh': 'The Big2Go crowd is roaring.',
      'game.pass': 'Pass',
      'game.sort': 'Sort',
      'game.hint': 'Hint',
      'game.playSelected': 'Play Selected',
      'game.newGame': 'New Game',
      'game.out': 'Out',
      'game.cards': '{count} cards',
      'game.lastCard': 'LAST CARD',
      'game.online': 'Online',
      'game.offline': 'Offline',
      'game.logEmpty': 'Tap cards to begin your first Big2Go move.',
      'game.tableChat': 'Table Chat',
      'game.chatOpen': 'Tap to open',
      'game.chatPlaceholder': 'Say something…',
      'game.chatSend': 'Send',
      'game.chatNice': 'Nice move',
      'game.chatGood': 'Good game',
      'game.chatHurry': 'Hurry up',
      'session.complete': 'Session Complete',
      'session.thanks': 'Thanks for playing Big2Go. Hope you enjoyed the battle!',
      'session.playAgain': 'Play Again',
      'session.backHome': 'Back To Home',
      'result.eyebrow': 'Game Result Story',
      'result.headline': 'Match complete',
      'result.playAgain': 'Play Again',
      'result.home': 'Back to Home',
      'levelUp.eyebrow': 'Level Up',
      'levelUp.youWin': 'You Win!',
      'levelUp.message': 'You reached a new level at the Big2Go table.',
      'levelUp.previous': 'Previous',
      'levelUp.newLevel': 'New Level',
      'levelUp.continue': 'Continue',
      'levelUp.milestone': 'First Promotion',
      'levelUp.ribbon': 'YOU WIN',
      'exit.title': 'Are you sure you want to exit Big2Go?',
      'exit.stay': 'Stay',
      'exit.exit': 'Exit',
      'demo.title': 'Demo: How to Play Big Two',
      'demo.desc': 'Watch this quick clip if you are new. It shows deal, opening lead, beating tricks, passing, and winning.',
      'demo.readRules': 'Read full rules',
      'demo.playNow': 'Play now',
      'demo.close': 'Close',
      'demo.pause': 'Pause demo',
      'demo.play': 'Play demo',
      'demo.scenesNav': 'Demo scenes',
      'help.title': 'How to Play',
      'help.gotIt': 'Got it',
      'settings.title': 'Big2Go Settings',
      'settings.soundVolume': 'Sound Volume',
      'settings.voiceVolume': 'Voice Chat Volume',
      'settings.note': 'Gameplay sounds are clearer on mobile speaker. Voice chat stays separate.',
      'settings.language': 'Language',
      'tier.rookie': 'Rookie Challenger',
      'tier.strategist': 'Battle Strategist',
      'tier.master': 'Big2Go Master',
      'tier.legend': 'Legend Mode'
    },
    th: {
      'language.welcome': 'ยินดีต้อนรับสู่ Big2Go',
      'language.choose': 'เลือกภาษาของคุณ',
      'landing.heroKicker': 'ไพ่ Big 2 สุดเร็ว',
      'landing.heroPromise': 'เลือกโต๊ะแล้วเริ่มเล่นได้ในคลิกเดียว',
      'landing.yourName': 'ชื่อของคุณ',
      'landing.namePlaceholder': 'ใส่ชื่อของคุณ',
      'landing.spade': 'โพดำ',
      'landing.heart': 'โพแดง',
      'landing.playNow': 'เล่นเลย',
      'landing.ctaSub': 'โต๊ะ 4 คน · รอบละประมาณ 2 นาที',
      'landing.continueGame': 'เล่นต่อ',
      'landing.resume': 'กลับเข้าเกมก่อนหน้า',
      'landing.recoveryDefault': 'คุณมีเกม Big2Go ที่กำลังเล่นอยู่',
      'landing.rejoin': 'กลับเข้าเกม',
      'landing.exitGame': 'ออกจากเกม',
      'landing.continue': 'เล่นต่อ',
      'landing.continueSub': 'เกมล่าสุด',
      'landing.room': 'ห้อง',
      'landing.roomSub': 'สร้าง / เข้าร่วม',
      'landing.demo': 'สาธิต',
      'landing.demoSub': 'วิธีเล่น',
      'landing.share': 'แชร์',
      'landing.shareSub': 'ชวนเพื่อน',
      'landing.matchMode': 'โหมดแมตช์',
      'landing.classic': 'คลาสสิก',
      'landing.fast': 'เร็ว',
      'landing.duel': 'ดวล',
      'landing.players4': '4 คน',
      'landing.players3': '3 คน',
      'landing.players2': '2 คน',
      'landing.privatePlay': 'เล่นส่วนตัว',
      'landing.yourNameDefault': 'ชื่อของคุณ',
      'landing.privacy': 'ความเป็นส่วนตัว',
      'landing.terms': 'ข้อกำหนด',
      'game.ready': 'พร้อม',
      'game.yourTurn': 'ตาคุณ',
      'game.playerTurn': 'ตาของ {name}',
      'game.gameOver': 'จบเกม',
      'game.matchFinished': 'แมตช์จบแล้ว',
      'game.beatPlay': 'ชนะ {play}',
      'game.openingHand': 'ไม้เปิด',
      'game.youLead': 'คุณนำ',
      'game.arena': 'Big2Go Arena',
      'game.statusLine': '{requirement} · รอบ {round} · สปาร์ก {sparks}',
      'game.yourCards': 'ไพ่ของคุณ',
      'game.trick': 'ไม้',
      'game.round': 'รอบ',
      'game.sparks': 'สปาร์ก',
      'game.open': 'เปิด',
      'game.yourCoins': 'เหรียญของคุณ',
      'game.prizePool': 'เงินรางวัล',
      'game.lastPlay': 'ไม้ล่าสุด',
      'game.currentTrick': 'ไม้ปัจจุบัน',
      'game.selected': 'เลือก {count} ใบ',
      'game.trickEmptyOpening': '♦ ผู้ถือ 3 เริ่มก่อน',
      'game.trickEmptyOpen': 'โต๊ะเปิด — นำไม้ที่เล่นได้',
      'game.leadOpening': 'เริ่มด้วย 3♦',
      'game.yourHand': 'ไพ่ในมือ',
      'game.handHelp': 'แตะไพ่เพื่อยกขึ้น เล่นคอมโบที่แรงกว่าหรือผ่าน',
      'game.tableFeed': 'ฟีดโต๊ะ',
      'game.tableFeedSub': 'การเดินไพ่และปฏิกิริยาล่าสุด',
      'game.tableMomentum': 'โมเมนตัมโต๊ะ',
      'game.heatLow': 'ฝูงชน Big2Go รอจังหวะ',
      'game.heatMid': 'ฝูงชน Big2Go เริ่มตื่นเต้น',
      'game.heatHigh': 'ฝูงชน Big2Go ตะโกนเชียร์',
      'game.pass': 'ผ่าน',
      'game.sort': 'เรียง',
      'game.hint': 'คำใบ้',
      'game.playSelected': 'เล่นไพ่ที่เลือก',
      'game.newGame': 'เกมใหม่',
      'game.out': 'หมด',
      'game.cards': '{count} ใบ',
      'game.lastCard': 'ไพ่ใบสุดท้าย',
      'game.online': 'ออนไลน์',
      'game.offline': 'ออฟไลน์',
      'game.logEmpty': 'แตะไพ่เพื่อเริ่มการเดินไพ้แรกของคุณ',
      'game.tableChat': 'แชทโต๊ะ',
      'game.chatOpen': 'แตะเพื่อเปิด',
      'game.chatPlaceholder': 'พิมพ์ข้อความ…',
      'game.chatSend': 'ส่ง',
      'game.chatNice': 'ไม้ดี',
      'game.chatGood': 'เกมดี',
      'game.chatHurry': 'รีบหน่อย',
      'session.complete': 'จบเซสชัน',
      'session.thanks': 'ขอบคุณที่เล่น Big2Go หวังว่าคุณสนุกกับการแข่งขัน!',
      'session.playAgain': 'เล่นอีกครั้ง',
      'session.backHome': 'กลับหน้าแรก',
      'result.eyebrow': 'เรื่องราวผลแมตช์',
      'result.headline': 'แมตช์จบแล้ว',
      'result.playAgain': 'เล่นอีกครั้ง',
      'result.home': 'กลับหน้าแรก',
      'levelUp.eyebrow': 'เลเวลอัป',
      'levelUp.youWin': 'คุณชนะ!',
      'levelUp.message': 'คุณเลเวลอัปที่โต๊ะ Big2Go แล้ว',
      'levelUp.previous': 'ก่อนหน้า',
      'levelUp.newLevel': 'เลเวลใหม่',
      'levelUp.continue': 'ต่อไป',
      'levelUp.milestone': 'เลื่อนขั้นครั้งแรก',
      'levelUp.ribbon': 'คุณชนะ',
      'exit.title': 'คุณแน่ใจหรือไม่ว่าต้องการออกจาก Big2Go?',
      'exit.stay': 'อยู่ต่อ',
      'exit.exit': 'ออก',
      'demo.title': 'สาธิต: วิธีเล่น Big Two',
      'demo.desc': 'ดูคลิปสั้นนี้หากคุณเป็นมือใหม่ แสดงการแจกไพ่ ไม้เปิด การชนะไม้ การผ่าน และการชนะ',
      'demo.readRules': 'อ่านกติกาเต็ม',
      'demo.playNow': 'เล่นเลย',
      'demo.close': 'ปิด',
      'demo.pause': 'หยุดสาธิต',
      'demo.play': 'เล่นสาธิต',
      'demo.scenesNav': 'ฉากสาธิต',
      'help.title': 'วิธีเล่น',
      'help.gotIt': 'เข้าใจแล้ว',
      'settings.title': 'ตั้งค่า Big2Go',
      'settings.soundVolume': 'ระดับเสียงเกม',
      'settings.voiceVolume': 'ระดับเสียงแชท',
      'settings.note': 'เสียงเกมชัดขึ้นบนลำโพงมือถือ เสียงแชทแยกต่างหาก',
      'settings.language': 'ภาษา',
      'tier.rookie': 'นักท้าทายมือใหม่',
      'tier.strategist': 'นักยุทธศาสตร์',
      'tier.master': 'มาสเตอร์ Big2Go',
      'tier.legend': 'โหมดตำนาน'
    },
    zh: {
      'language.welcome': '欢迎来到 Big2Go',
      'language.choose': '选择你的语言',
      'landing.heroKicker': '快节奏 Big 2 对战',
      'landing.heroPromise': '选好牌桌，一键开局。',
      'landing.yourName': '你的昵称',
      'landing.namePlaceholder': '输入你的昵称',
      'landing.spade': '黑桃',
      'landing.heart': '红心',
      'landing.playNow': '立即开始',
      'landing.ctaSub': '四人快桌 · 约 2 分钟一局',
      'landing.continueGame': '继续游戏',
      'landing.resume': '恢复上一局',
      'landing.recoveryDefault': '你有一场进行中的 Big2Go 游戏。',
      'landing.rejoin': '重新加入',
      'landing.exitGame': '退出游戏',
      'landing.continue': '继续',
      'landing.continueSub': '上一局',
      'landing.room': '房间',
      'landing.roomSub': '创建 / 加入',
      'landing.demo': '演示',
      'landing.demoSub': '玩法说明',
      'landing.share': '分享',
      'landing.shareSub': '邀请好友',
      'landing.matchMode': '对战模式',
      'landing.classic': '经典',
      'landing.fast': '快速',
      'landing.duel': '对决',
      'landing.players4': '4 人',
      'landing.players3': '3 人',
      'landing.players2': '2 人',
      'landing.privatePlay': '私人对战',
      'landing.yourNameDefault': '你的昵称',
      'landing.privacy': '隐私',
      'landing.terms': '条款',
      'game.ready': '准备',
      'game.yourTurn': '你的回合',
      'game.playerTurn': '{name} 的回合',
      'game.gameOver': '游戏结束',
      'game.matchFinished': '对局已结束。',
      'game.beatPlay': '压过 {play}',
      'game.openingHand': '首出牌',
      'game.youLead': '你领出',
      'game.arena': 'Big2Go 竞技场',
      'game.statusLine': '{requirement} · 第 {round} 轮 · 火花 {sparks}',
      'game.yourCards': '你的手牌',
      'game.trick': '墩',
      'game.round': '轮次',
      'game.sparks': '火花',
      'game.open': '开放',
      'game.yourCoins': '你的金币',
      'game.prizePool': '奖池',
      'game.lastPlay': '上一手',
      'game.currentTrick': '当前墩',
      'game.selected': '已选 {count} 张',
      'game.trickEmptyOpening': '♦ 持 3 者先出',
      'game.trickEmptyOpen': '牌桌开放 — 可领出任意合法牌型。',
      'game.leadOpening': '以 3♦ 领出开局。',
      'game.yourHand': '你的手牌',
      'game.handHelp': '点选卡牌抬起，出更强组合或选择过牌。',
      'game.tableFeed': '牌桌动态',
      'game.tableFeedSub': '最近的出牌与组合反应。',
      'game.tableMomentum': '牌桌气势',
      'game.heatLow': 'Big2Go 观众等待火花。',
      'game.heatMid': 'Big2Go 观众开始兴奋。',
      'game.heatHigh': 'Big2Go 观众沸腾了。',
      'game.pass': '过牌',
      'game.sort': '整理',
      'game.hint': '提示',
      'game.playSelected': '出牌',
      'game.newGame': '新游戏',
      'game.out': '出完',
      'game.cards': '{count} 张',
      'game.lastCard': '最后一张',
      'game.online': '在线',
      'game.offline': '离线',
      'game.logEmpty': '点选卡牌开始你的第一步。',
      'game.tableChat': '牌桌聊天',
      'game.chatOpen': '点按打开',
      'game.chatPlaceholder': '说点什么…',
      'game.chatSend': '发送',
      'game.chatNice': '好牌',
      'game.chatGood': '好局',
      'game.chatHurry': '快点',
      'session.complete': '对局结束',
      'session.thanks': '感谢游玩 Big2Go，希望你享受这场对决！',
      'session.playAgain': '再来一局',
      'session.backHome': '返回首页',
      'result.eyebrow': '对局故事',
      'result.headline': '对局完成',
      'result.playAgain': '再来一局',
      'result.home': '返回首页',
      'levelUp.eyebrow': '升级',
      'levelUp.youWin': '你赢了！',
      'levelUp.message': '你在 Big2Go 牌桌升到了新等级。',
      'levelUp.previous': '之前',
      'levelUp.newLevel': '新等级',
      'levelUp.continue': '继续',
      'levelUp.milestone': '首次晋升',
      'levelUp.ribbon': '你赢了',
      'exit.title': '确定要退出 Big2Go 吗？',
      'exit.stay': '留下',
      'exit.exit': '退出',
      'demo.title': '演示：如何玩 Big Two',
      'demo.desc': '新手可看这段短片，了解发牌、首出、压牌、过牌与获胜。',
      'demo.readRules': '阅读完整规则',
      'demo.playNow': '立即开始',
      'demo.close': '关闭',
      'demo.pause': '暂停演示',
      'demo.play': '播放演示',
      'demo.scenesNav': '演示步骤',
      'help.title': '玩法说明',
      'help.gotIt': '知道了',
      'settings.title': 'Big2Go 设置',
      'settings.soundVolume': '游戏音量',
      'settings.voiceVolume': '语音聊天音量',
      'settings.note': '手机游戏音效在扬声器上更清晰，语音聊天音量单独调节。',
      'settings.language': '语言',
      'tier.rookie': '新秀挑战者',
      'tier.strategist': '战术大师',
      'tier.master': 'Big2Go 大师',
      'tier.legend': '传奇模式'
    },
    ja: {
      'language.welcome': 'Big2Goへようこそ',
      'language.choose': '言語を選択',
      'landing.heroKicker': '高速ビッグツー対戦',
      'landing.heroPromise': 'テーブルを選んでワンタップで開始。',
      'landing.yourName': 'あなたの名前',
      'landing.namePlaceholder': '名前を入力',
      'landing.spade': 'スペード',
      'landing.heart': 'ハート',
      'landing.playNow': '今すぐプレイ',
      'landing.ctaSub': '4人クイック卓 · 約2分',
      'landing.continueGame': 'ゲームを続ける',
      'landing.resume': '前のゲームに戻る',
      'landing.recoveryDefault': '進行中のBig2Goゲームがあります。',
      'landing.rejoin': '再参加',
      'landing.exitGame': 'ゲームを終了',
      'landing.continue': '続ける',
      'landing.continueSub': '前回のゲーム',
      'landing.room': 'ルーム',
      'landing.roomSub': '作成 / 参加',
      'landing.demo': 'デモ',
      'landing.demoSub': '遊び方',
      'landing.share': '共有',
      'landing.shareSub': '友達を招待',
      'landing.matchMode': 'マッチモード',
      'landing.classic': 'クラシック',
      'landing.fast': 'ファスト',
      'landing.duel': 'デュエル',
      'landing.players4': '4人',
      'landing.players3': '3人',
      'landing.players2': '2人',
      'landing.privatePlay': 'プライベート',
      'landing.yourNameDefault': 'あなたの名前',
      'landing.privacy': 'プライバシー',
      'landing.terms': '利用規約',
      'game.ready': '準備',
      'game.yourTurn': 'あなたの番',
      'game.playerTurn': '{name}の番',
      'game.gameOver': 'ゲーム終了',
      'game.matchFinished': 'マッチ終了。',
      'game.beatPlay': '{play}を上回る',
      'game.openingHand': '最初の手',
      'game.youLead': 'あなたがリード',
      'game.arena': 'Big2Goアリーナ',
      'game.statusLine': '{requirement} · ラウンド{round} · スパーク{sparks}',
      'game.yourCards': 'あなたの手札',
      'game.trick': 'トリック',
      'game.round': 'ラウンド',
      'game.sparks': 'スパーク',
      'game.open': 'オープン',
      'game.yourCoins': 'あなたのコイン',
      'game.prizePool': '賞金プール',
      'game.lastPlay': '最後のプレイ',
      'game.currentTrick': '現在のトリック',
      'game.selected': '{count}枚選択',
      'game.trickEmptyOpening': '♦3保持者が開始',
      'game.trickEmptyOpen': 'テーブルはオープン — 合法な手でリード。',
      'game.leadOpening': '3♦で開始手を出す。',
      'game.yourHand': 'あなたの手札',
      'game.handHelp': 'カードをタップして持ち上げ、強いコンボを出すかパス。',
      'game.tableFeed': 'テーブルフィード',
      'game.tableFeedSub': '最近の手とコンボ反応。',
      'game.tableMomentum': 'テーブル勢い',
      'game.heatLow': 'Big2Goの観客は火花を待っている。',
      'game.heatMid': 'Big2Goの観客が盛り上がり始めた。',
      'game.heatHigh': 'Big2Goの観客が大歓声！',
      'game.pass': 'パス',
      'game.sort': '並べ替え',
      'game.hint': 'ヒント',
      'game.playSelected': '選択を出す',
      'game.newGame': '新しいゲーム',
      'game.out': '上がり',
      'game.cards': '{count}枚',
      'game.lastCard': 'ラストカード',
      'game.online': 'オンライン',
      'game.offline': 'オフライン',
      'game.logEmpty': 'カードをタップして最初の手を始めよう。',
      'game.tableChat': 'テーブルチャット',
      'game.chatOpen': 'タップで開く',
      'game.chatPlaceholder': 'メッセージを入力…',
      'game.chatSend': '送信',
      'game.chatNice': 'ナイス',
      'game.chatGood': 'GG',
      'game.chatHurry': '急いで',
      'session.complete': 'セッション完了',
      'session.thanks': 'Big2Goをプレイしてくれてありがとう！',
      'session.playAgain': 'もう一度',
      'session.backHome': 'ホームへ',
      'result.eyebrow': '結果ストーリー',
      'result.headline': 'マッチ完了',
      'result.playAgain': 'もう一度',
      'result.home': 'ホームへ',
      'levelUp.eyebrow': 'レベルアップ',
      'levelUp.youWin': '勝利！',
      'levelUp.message': 'Big2Goテーブルで新しいレベルに到達しました。',
      'levelUp.previous': '以前',
      'levelUp.newLevel': '新レベル',
      'levelUp.continue': '続ける',
      'levelUp.milestone': '初昇格',
      'levelUp.ribbon': '勝利',
      'exit.title': 'Big2Goを終了しますか？',
      'exit.stay': '残る',
      'exit.exit': '終了',
      'demo.title': 'デモ：ビッグツーの遊び方',
      'demo.desc': '初めての方はこの短いクリップをご覧ください。配札、開始、上回り、パス、勝利を紹介します。',
      'demo.readRules': 'ルール全文',
      'demo.playNow': '今すぐプレイ',
      'demo.close': '閉じる',
      'demo.pause': 'デモを一時停止',
      'demo.play': 'デモを再生',
      'demo.scenesNav': 'デモシーン',
      'help.title': '遊び方',
      'help.gotIt': '了解',
      'settings.title': 'Big2Go設定',
      'settings.soundVolume': '効果音',
      'settings.voiceVolume': 'ボイスチャット音量',
      'settings.note': 'モバイルスピーカーではゲーム音がより明瞭です。ボイスは別設定です。',
      'settings.language': '言語',
      'tier.rookie': 'ルーキーチャレンジャー',
      'tier.strategist': 'バトルストラテジスト',
      'tier.master': 'Big2Goマスター',
      'tier.legend': 'レジェンドモード'
    },
    ko: {
      'language.welcome': 'Big2Go에 오신 것을 환영합니다',
      'language.choose': '언어를 선택하세요',
      'landing.heroKicker': '빠른 빅투 대전',
      'landing.heroPromise': '테이블을 고르고 한 번에 시작하세요.',
      'landing.yourName': '닉네임',
      'landing.namePlaceholder': '닉네임 입력',
      'landing.spade': '스페이드',
      'landing.heart': '하트',
      'landing.playNow': '지금 플레이',
      'landing.ctaSub': '4인 빠른 테이블 · 약 2분',
      'landing.continueGame': '게임 계속',
      'landing.resume': '이전 게임 재개',
      'landing.recoveryDefault': '진행 중인 Big2Go 게임이 있습니다.',
      'landing.rejoin': '다시 참가',
      'landing.exitGame': '게임 나가기',
      'landing.continue': '계속',
      'landing.continueSub': '마지막 게임',
      'landing.room': '룸',
      'landing.roomSub': '만들기 / 참가',
      'landing.demo': '데모',
      'landing.demoSub': '플레이 방법',
      'landing.share': '공유',
      'landing.shareSub': '친구 초대',
      'landing.matchMode': '매치 모드',
      'landing.classic': '클래식',
      'landing.fast': '빠른',
      'landing.duel': '대결',
      'landing.players4': '4인',
      'landing.players3': '3인',
      'landing.players2': '2인',
      'landing.privatePlay': '프라이빗',
      'landing.yourNameDefault': '닉네임',
      'landing.privacy': '개인정보',
      'landing.terms': '약관',
      'game.ready': '준비',
      'game.yourTurn': '당신 차례',
      'game.playerTurn': '{name} 차례',
      'game.gameOver': '게임 종료',
      'game.matchFinished': '매치가 끝났습니다.',
      'game.beatPlay': '{play} 이기기',
      'game.openingHand': '첫 패',
      'game.youLead': '당신이 리드',
      'game.arena': 'Big2Go 아레나',
      'game.statusLine': '{requirement} · 라운드 {round} · 스파크 {sparks}',
      'game.yourCards': '내 패',
      'game.trick': '트릭',
      'game.round': '라운드',
      'game.sparks': '스파크',
      'game.open': '오픈',
      'game.yourCoins': '내 코인',
      'game.prizePool': '상금 풀',
      'game.lastPlay': '마지막 플레이',
      'game.currentTrick': '현재 트릭',
      'game.selected': '{count}장 선택',
      'game.trickEmptyOpening': '♦ 3 보유자 시작',
      'game.trickEmptyOpen': '테이블 오픈 — 합법 패로 리드하세요.',
      'game.leadOpening': '3♦로 시작 패를 내세요.',
      'game.yourHand': '내 패',
      'game.handHelp': '카드를 탭해 들어 올리고, 더 강한 조합을 내거나 패스하세요.',
      'game.tableFeed': '테이블 피드',
      'game.tableFeedSub': '최근 수와 콤보 반응.',
      'game.tableMomentum': '테이블 모멘텀',
      'game.heatLow': 'Big2Go 관중이 불꽃을 기다립니다.',
      'game.heatMid': 'Big2Go 관중이 몰입하기 시작했습니다.',
      'game.heatHigh': 'Big2Go 관중이 환호합니다!',
      'game.pass': '패스',
      'game.sort': '정렬',
      'game.hint': '힌트',
      'game.playSelected': '선택 패 내기',
      'game.newGame': '새 게임',
      'game.out': '탈락',
      'game.cards': '{count}장',
      'game.lastCard': '마지막 카드',
      'game.online': '온라인',
      'game.offline': '오프라인',
      'game.logEmpty': '카드를 탭해 첫 수를 시작하세요.',
      'game.tableChat': '테이블 채팅',
      'game.chatOpen': '탭하여 열기',
      'game.chatPlaceholder': '메시지 입력…',
      'game.chatSend': '보내기',
      'game.chatNice': '좋은 수',
      'game.chatGood': 'GG',
      'game.chatHurry': '빨리',
      'session.complete': '세션 완료',
      'session.thanks': 'Big2Go를 플레이해 주셔서 감사합니다!',
      'session.playAgain': '다시 플레이',
      'session.backHome': '홈으로',
      'result.eyebrow': '결과 스토리',
      'result.headline': '매치 완료',
      'result.playAgain': '다시 플레이',
      'result.home': '홈으로',
      'levelUp.eyebrow': '레벨 업',
      'levelUp.youWin': '승리!',
      'levelUp.message': 'Big2Go 테이블에서 새 레벨에 도달했습니다.',
      'levelUp.previous': '이전',
      'levelUp.newLevel': '새 레벨',
      'levelUp.continue': '계속',
      'levelUp.milestone': '첫 승급',
      'levelUp.ribbon': '승리',
      'exit.title': 'Big2Go를 종료하시겠습니까?',
      'exit.stay': '머무르기',
      'exit.exit': '종료',
      'demo.title': '데모: 빅투 플레이 방법',
      'demo.desc': '처음이시라면 이 짧은 영상을 보세요. 딜, 시작, 이기기, 패스, 승리를 보여줍니다.',
      'demo.readRules': '전체 규칙',
      'demo.playNow': '지금 플레이',
      'demo.close': '닫기',
      'demo.pause': '데모 일시정지',
      'demo.play': '데모 재생',
      'demo.scenesNav': '데모 장면',
      'help.title': '플레이 방법',
      'help.gotIt': '확인',
      'settings.title': 'Big2Go 설정',
      'settings.soundVolume': '효과음',
      'settings.voiceVolume': '보이스 채팅 볼륨',
      'settings.note': '모바일 스피커에서 게임 사운드가 더 선명합니다. 보이스는 별도 설정입니다.',
      'settings.language': '언어',
      'tier.rookie': '루키 챌린저',
      'tier.strategist': '배틀 전략가',
      'tier.master': 'Big2Go 마스터',
      'tier.legend': '레전드 모드'
    }
  };

  const RULES_HTML = {
    en: `<ul>
      <li><strong>Card order:</strong> 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2. In Big Two, 2 is the highest rank.</li>
      <li><strong>Suit order:</strong> diamonds, clubs, hearts, spades.</li>
      <li><strong>Opening player:</strong> whoever holds <strong>3♦</strong> starts the game, then may play any valid opening hand.</li>
      <li><strong>Match the count:</strong> beat a single with a single, a pair with a pair, a triple with a triple.</li>
      <li><strong>Five-card plays:</strong> straight, flush, full house, four of a kind, and straight flush.</li>
      <li><strong>Passing:</strong> if you cannot beat the current trick, pass. The last player to win the trick leads the next one.</li>
      <li><strong>Goal:</strong> empty your hand before the AI players do.</li>
    </ul>`,
    th: `<ul>
      <li><strong>ลำดับแต้ม:</strong> 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2 โดย 2 สูงสุด</li>
      <li><strong>ลำดับดอก:</strong> ข้าวหลามตัด, ดอกจิก, โพแดง, โพดำ</li>
      <li><strong>ผู้เริ่ม:</strong> ผู้ถือ <strong>3♦</strong> เริ่มก่อน แล้วเล่นไม้เปิดที่ถูกต้อง</li>
      <li><strong>จำนวนไพ่ต้องเท่ากัน:</strong> เดี่ยวชนเดี่ยว คู่ชนคู่ ตองชนตอง</li>
      <li><strong>ไพ่ 5 ใบ:</strong> สเตรท ฟลัช ฟูลเฮาส์ โฟร์การ์ด สเตรทฟลัช</li>
      <li><strong>การผ่าน:</strong> ถ้าชนะไม้ปัจจุบันไม่ได้ให้ผ่าน ผู้ชนะไม้ล่าสุดนำรอบถัดไป</li>
      <li><strong>เป้าหมาย:</strong> ทิ้งไพ่หมดก่อนคู่แข่ง AI</li>
    </ul>`,
    zh: `<ul>
      <li><strong>点数顺序：</strong>3、4、5、6、7、8、9、10、J、Q、K、A、2，其中 2 最大。</li>
      <li><strong>花色顺序：</strong>方块、梅花、红心、黑桃。</li>
      <li><strong>开局：</strong>持有 <strong>3♦</strong> 的玩家先出，可出任意合法首手。</li>
      <li><strong>张数相同：</strong>单张压单张，对子压对子，三张压三张。</li>
      <li><strong>五张牌型：</strong>顺子、同花、葫芦、四条、同花顺。</li>
      <li><strong>过牌：</strong>无法压过当前墩则过牌，最后赢家领出下一墩。</li>
      <li><strong>目标：</strong>在 AI 之前出完手牌。</li>
    </ul>`,
    ja: `<ul>
      <li><strong>ランク順:</strong> 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2。2が最高。</li>
      <li><strong>スート順:</strong> ダイヤ、クラブ、ハート、スペード。</li>
      <li><strong>開始:</strong> <strong>3♦</strong> を持つプレイヤーが開始し、合法な開始手を出す。</li>
      <li><strong>枚数一致:</strong> シングル対シングル、ペア対ペア、トリプル対トリプル。</li>
      <li><strong>5枚役:</strong> ストレート、フラッシュ、フルハウス、フォーカード、ストレートフラッシュ。</li>
      <li><strong>パス:</strong> 上回れない場合はパス。最後に勝ったプレイヤーが次をリード。</li>
      <li><strong>目標:</strong> AIより先に手札を出し切る。</li>
    </ul>`,
    ko: `<ul>
      <li><strong>랭크 순서:</strong> 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2. 2가 최고입니다.</li>
      <li><strong>무늬 순서:</strong> 다이아, 클로버, 하트, 스페이드.</li>
      <li><strong>시작:</strong> <strong>3♦</strong> 보유자가 시작하며 합법적인 첫 패를 냅니다.</li>
      <li><strong>같은 장수:</strong> 싱글은 싱글, 페어는 페어, 트리플은 트리플로 이깁니다.</li>
      <li><strong>5장 패:</strong> 스트레이트, 플러시, 풀하우스, 포카드, 스트레이트 플러시.</li>
      <li><strong>패스:</strong> 현재 트릭을 이길 수 없으면 패스. 마지막 승자가 다음을 리드합니다.</li>
      <li><strong>목표:</strong> AI보다 먼저 패를 모두 냅니다.</li>
    </ul>`
  };

  let currentLocale = DEFAULT_LOCALE;

  function normalizeLocale(locale) {
    const value = String(locale || '').toLowerCase();
    return LOCALES.some(entry => entry.id === value) ? value : DEFAULT_LOCALE;
  }

  function loadLocale() {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved) return normalizeLocale(saved);
    } catch (_) {}
    return DEFAULT_LOCALE;
  }

  function saveLocale(locale) {
    try {
      localStorage.setItem(LANGUAGE_KEY, normalizeLocale(locale));
    } catch (_) {}
  }

  function hasChosenLanguage() {
    try {
      return Boolean(localStorage.getItem(LANGUAGE_KEY));
    } catch (_) {
      return false;
    }
  }

  function t(key, vars = {}) {
    const table = MESSAGES[currentLocale] || MESSAGES.en;
    const fallback = MESSAGES.en[key] || key;
    let text = table[key] || fallback;
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value ?? ''));
    });
    return text;
  }

  function getRulesHtml() {
    return RULES_HTML[currentLocale] || RULES_HTML.en;
  }

  function getLocale() {
    return currentLocale;
  }

  function getLocales() {
    return LOCALES.slice();
  }

  function setLocale(locale, options = {}) {
    const next = normalizeLocale(locale);
    if (next === currentLocale && !options.force) return currentLocale;
    currentLocale = next;
    saveLocale(next);
    document.documentElement.lang = next === 'zh' ? 'zh-Hans' : next;
    apply(document);
    updateLanguagePickerState();
    window.dispatchEvent(new CustomEvent('big2go:languagechange', { detail: { locale: next } }));
    return next;
  }

  function apply(root = document) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('[data-i18n]').forEach(node => {
      const key = node.dataset.i18n;
      if (!key) return;
      node.textContent = t(key);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
      const key = node.dataset.i18nPlaceholder;
      if (!key) return;
      node.setAttribute('placeholder', t(key));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(node => {
      const key = node.dataset.i18nAria;
      if (!key) return;
      node.setAttribute('aria-label', t(key));
    });
    root.querySelectorAll('[data-i18n-html]').forEach(node => {
      const key = node.dataset.i18nHtml;
      if (!key) return;
      node.innerHTML = t(key);
    });
  }

  function buildLanguageOptionsMarkup() {
    return LOCALES.map(entry => `
      <button type="button" class="language-option${entry.id === currentLocale ? ' selected' : ''}" data-locale="${entry.id}" aria-pressed="${entry.id === currentLocale ? 'true' : 'false'}">
        <span class="language-option-flag" aria-hidden="true">${entry.flag}</span>
        <span class="language-option-label">${entry.label}</span>
      </button>`).join('');
  }

  function updateLanguagePickerState() {
    document.querySelectorAll('[data-locale]').forEach(button => {
      const active = button.dataset.locale === currentLocale;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindLanguageButtons(root = document) {
    root.querySelectorAll('[data-locale]').forEach(button => {
      if (button.dataset.i18nBound === '1') return;
      button.dataset.i18nBound = '1';
      button.addEventListener('click', () => {
        const locale = button.dataset.locale;
        if (!locale) return;
        setLocale(locale);
        hideLanguageWelcome();
      });
    });
  }

  function showLanguageWelcome() {
    const overlay = document.querySelector('#language-welcome');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    document.body.classList.add('language-welcome-open');
    updateLanguagePickerState();
  }

  function hideLanguageWelcome() {
    const overlay = document.querySelector('#language-welcome');
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.classList.remove('language-welcome-open');
  }

  function init() {
    currentLocale = loadLocale();
    if (!hasChosenLanguage()) currentLocale = DEFAULT_LOCALE;
    document.documentElement.lang = currentLocale === 'zh' ? 'zh-Hans' : currentLocale;
    apply(document);
    bindLanguageButtons(document);
    if (!hasChosenLanguage()) showLanguageWelcome();
  }

  window.Big2GoI18n = {
    LOCALES,
    DEFAULT_LOCALE,
    getLocale,
    getLocales,
    setLocale,
    t,
    apply,
    getRulesHtml,
    hasChosenLanguage,
    showLanguageWelcome,
    hideLanguageWelcome,
    buildLanguageOptionsMarkup,
    bindLanguageButtons,
    init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
