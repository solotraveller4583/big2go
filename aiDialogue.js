/* Big2Go — localized in-game AI dialogue (loads after i18n.js, before aiCharacters.js) */

(function () {
  'use strict';

  const DEFAULT_LOCALE = 'en';
  const SUPPORTED_LOCALES = ['en', 'th', 'zh', 'ja', 'ko'];

  const GENERIC_LINES = {
    en: {
      player_slow: ['⏰ Hurry up', '👀 Watching', '🤔 Thinking', '⌛ Waiting'],
      ai_strong_play: ['🔥 Good play', '😎 Cool', '😈 Challenge', '💪 Strong'],
      ai_lose_round: ['😭', '😱', '😅', '🤦'],
      ai_win_round: ['🎉', '😎', '🔥'],
      ai_win: ['🎉', '😎', '🔥'],
      ai_lose: ['😭', '😱', '😅', '🤦'],
      player_strong_play: ['🔥 Good play', '😮 Wow', '👏 Nice']
    },
    th: {
      player_slow: ['⏰ รีบหน่อย', '👀 กำลังดูอยู่', '🤔 กำลังคิด', '⌛ รออยู่'],
      ai_strong_play: ['🔥 ไม้ดี', '😎 เท่', '😈 ท้าชน', '💪 แรง'],
      ai_lose_round: ['😭', '😱', '😅', '🤦'],
      ai_win_round: ['🎉', '😎', '🔥'],
      ai_win: ['🎉', '😎', '🔥'],
      ai_lose: ['😭', '😱', '😅', '🤦'],
      player_strong_play: ['🔥 ไม้ดี', '😮 ว้าว', '👏 เจ๋ง']
    },
    zh: {
      player_slow: ['⏰ 快点', '👀 看着呢', '🤔 在想', '⌛ 等着'],
      ai_strong_play: ['🔥 好牌', '😎 酷', '😈 来挑战', '💪 很强'],
      ai_lose_round: ['😭', '😱', '😅', '🤦'],
      ai_win_round: ['🎉', '😎', '🔥'],
      ai_win: ['🎉', '😎', '🔥'],
      ai_lose: ['😭', '😱', '😅', '🤦'],
      player_strong_play: ['🔥 好牌', '😮 哇', '👏 漂亮']
    },
    ja: {
      player_slow: ['⏰ 急いで', '👀 見てる', '🤔 考え中', '⌛ 待ってる'],
      ai_strong_play: ['🔥 ナイス', '😎 クール', '😈 挑戦', '💪 強い'],
      ai_lose_round: ['😭', '😱', '😅', '🤦'],
      ai_win_round: ['🎉', '😎', '🔥'],
      ai_win: ['🎉', '😎', '🔥'],
      ai_lose: ['😭', '😱', '😅', '🤦'],
      player_strong_play: ['🔥 ナイス', '😮 わあ', '👏 いいね']
    },
    ko: {
      player_slow: ['⏰ 빨리', '👀 지켜보는 중', '🤔 생각 중', '⌛ 기다리는 중'],
      ai_strong_play: ['🔥 좋은 수', '😎 멋져', '😈 도전', '💪 강해'],
      ai_lose_round: ['😭', '😱', '😅', '🤦'],
      ai_win_round: ['🎉', '😎', '🔥'],
      ai_win: ['🎉', '😎', '🔥'],
      ai_lose: ['😭', '😱', '😅', '🤦'],
      player_strong_play: ['🔥 좋은 수', '😮 와', '👏 멋져']
    }
  };

  const ORACLE = {
    en: {
      single: ['Small spark, big nerve.', 'The alley hushes for a beat.', 'A neat little slash through the night.'],
      pair: ['Two cards, one rhythm.', 'The crowd hears the bass line.', 'A tidy little power chord.'],
      triple: ['Three-card thunder!', 'That move rattled the lanterns.', 'Triple pressure — nice.'],
      straight: ['The Big2Go path starts to snake forward.', 'Five in a row, smooth as silk.', 'A sleek line through the crowd.'],
      flush: ['All one suit — very stylish.', 'The lights lean in to watch.', 'A polished color wave.'],
      'full-house': ['Full house! The crowd loses its mind.', 'That is a heavyweight combo.', 'That trick just got dramatic.'],
      'four-kind': ['Four of a kind! Massive flex.', 'That was a thunder clap.', 'The lane is on fire.'],
      'straight-flush': ['Straight flush! Fireworks now!', 'That is a headline move.', 'Absolute festival chaos.']
    },
    th: {
      single: ['ประกายเล็ก แต่ใจใหญ่', 'ตรอกเงียบลงชั่วครู่', 'ฟาดไพ่สวยราวกับแสงกลางคืน'],
      pair: ['สองใบ จังหวะเดียวกัน', 'ฝูงชนได้ยินจังหวะเบส', 'คอร์ดพลังเล็กๆ ที่เรียบร้อย'],
      triple: ['สามใบสายฟ้า!', 'ไม้นี้ทำให้โคมไฟสั่น', 'กดดันสามใบ — สุดยอด'],
      straight: ['เส้นทาง Big2Go เริ่มเล winding ไปข้างหน้า', 'ห้าใบเรียง ลื่นเหมือนไหม', 'เส้นสวยทะลุฝูงชน'],
      flush: ['ดอกเดียวกันทั้งมือ — สไตล์มาก', 'ไฟส่องมาดูใกล้ๆ', 'คลื่นสีที่ขัดเงาแล้ว'],
      'full-house': ['ฟูลเฮาส์! ฝูงชนคลั่ง', 'คอมโบหนักแน่น', 'ไม้นี้ดrama สุดๆ'],
      'four-kind': ['โฟร์การ์ด! โชว์พลังเต็มที่', 'เสียงฟ้าร้องกึกก้อง', 'เลนไพ่ลุกเป็นไฟ'],
      'straight-flush': ['สเตรทฟลัช! ดอกไม้ไฟเลย!', 'ไม้ที่ขึ้นหัวข่าวแน่', 'ความวุ่นวายสุดเทศกาล']
    },
    zh: {
      single: ['小火花，大胆量。', '牌巷安静了一拍。', '夜里利落的一刀。'],
      pair: ['两张牌，同一个节奏。', '观众听到了低音线。', '整齐的小力和弦。'],
      triple: ['三张雷霆！', '这一手震动了灯笼。', '三重压力——漂亮。'],
      straight: ['Big2Go 的路开始蜿蜒向前。', '五连顺，丝般顺滑。', '穿过人群的一条利线。'],
      flush: ['同一花色——非常讲究。', '灯光凑近观看。', '抛光的色波。'],
      'full-house': ['葫芦！观众沸腾了。', '这是重量级组合。', '这一墩瞬间戏剧化。'],
      'four-kind': ['四条！强力展牌。', '像一声雷鸣。', '牌道着火了。'],
      'straight-flush': ['同花顺！烟花绽放！', '这是头版级别的出牌。', '绝对的嘉年华狂热。']
    },
    ja: {
      single: ['小さな火花、大きな度胸。', '路地が一瞬静まる。', '夜を切り裂く neat な一撃。'],
      pair: ['二枚、一つのリズム。', '観客がベースラインを聞いた。', ' tidy な小さなパワーコード。'],
      triple: ['三枚のサンダー！', 'その手が提灯を揺らした。', 'トリプルプレッシャー — ナイス。'],
      straight: ['Big2Go の道が蛇行し始める。', '五枚並び、 silk のように滑らか。', '群衆を貫く sleek なライン。'],
      flush: ['同スート — とても stylish。', 'ライトが覗き込む。', '磨かれた色の波。'],
      'full-house': ['フルハウス！ 観客が狂う。', 'ヘビー級コンボだ。', 'そのトリックが dramatic になった。'],
      'four-kind': ['フォーカード！ 大 flex。', '雷鳴のような一撃。', 'レーンが燃え上がる。'],
      'straight-flush': ['ストレートフラッシュ！ 花火！', 'ヘッドラインムーブだ。', '祭りの absolute chaos。']
    },
    ko: {
      single: ['작은 불꽃, 큰 배짱.', '골목이 잠시 조용해진다.', '밤을 가르는 neat 한 한 수.'],
      pair: ['두 장, 하나의 리듬.', '관중이 베이스 라인을 듣는다.', ' tidy 한 작은 파워 코드.'],
      triple: ['세 장의 천둥!', '그 수가 등불을 흔들었다.', '트리플 압박 — nice.'],
      straight: ['Big2Go 길이 구불구불 앞으로 간다.', '다섯 장 연속, silk 처럼 부드럽다.', '군중을 가르는 sleek 한 라인.'],
      flush: ['한 무늬 — 매우 stylish.', '조명이 가까이 기울어 본다.', '연마된 색의 파도.'],
      'full-house': ['풀하우스! 관중이 미친다.', '헤비급 콤보다.', '그 트릭이 dramatic 해졌다.'],
      'four-kind': ['포카드! massive flex.', '천둥 같은 한 수.', '레인이 불타오른다.'],
      'straight-flush': ['스트레이트 플러시! 불꽃놀이!', '헤드라인 무브다.', '축제의 absolute chaos.']
    }
  };

  const GAME_LINES = {
    en: {
      'log.tableBegins': 'The table begins. {name} holds the 3♦ and starts the game.',
      'log.passed': '{name} passed. The table keeps moving.',
      'log.claimedTrick': '{name} claimed the trick and opens a fresh table line.',
      'log.played': '{name} {source} {play}. {comment}',
      'log.youPlayed': 'You played {play}. {comment}',
      'log.restore': 'The table returns from save. Pick up where you left off.',
      'log.aiJoin': '{name} joins the table with 🪙 {coins} coins.',
      'log.twoCards': '{name} is down to 2 cards.',
      'log.warn': '⚠️ {note}',
      'heat.freshTrick': 'A fresh trick means a fresh crowd cheer.',
      'selection.beatOrPass': 'Beat {play} or pass',
      'selection.openingTurn': 'Your Turn · Play 3♦ opening',
      'selection.freeTurn': 'Your Turn · Play any combo',
      'selection.canPlay': '{play} · can play',
      'play.single': 'Single {card}',
      'play.pair': 'Pair {cards}',
      'play.triple': 'Triple {cards}',
      'play.straight': 'Straight',
      'play.flush': 'Flush',
      'play.fullHouse': 'Full house',
      'play.fourKind': 'Four of a kind',
      'play.straightFlush': 'Straight flush',
      'play.fiveCard': 'Five-card hand',
      'play.sourcePlayed': 'played',
      'play.invalidHand': 'That selection is not a valid Big Two hand.',
      'play.mustBeat': 'You must beat {play} with a stronger hand of the same size.',
      'log.trickMeta': '{play} · Led by {name} · {passes} passes',
      'victory.youDefeated': 'You defeated {name}!',
      'victory.defeatedYou': '{name} defeated you!',
      'victory.speaker': '{name} says:',
      'victory.rematch': 'Rematch?',
      'victory.goodGame': 'Good game!',
      'victory.betterLuck': 'Better luck next time!',
      'victory.seeYou': 'See you again!',
      'levelUp.humanLegend.eyebrow': '🎪 Carnival Legend',
      'levelUp.humanLegend.title': 'You Win!',
      'levelUp.humanLegend.message': 'You reached Level 30 — the highest rank in Big2Go. You are now in Legend Mode.',
      'levelUp.humanLegend.quote': '"The carnival crowns a true master of the cards."',
      'levelUp.humanTierChange.eyebrow': '🎪 Carnival Rank Up',
      'levelUp.humanTierChange.title': 'You Win!',
      'levelUp.humanTierChange.message': 'You advanced to {tierLabel}. New rivals will respect your table presence.',
      'levelUp.humanTierChange.quote': '"Every tier climbed lights up the Big2Go carnival."',
      'levelUp.humanFirstPromotion.eyebrow': '🎪 First Carnival Win',
      'levelUp.humanFirstPromotion.title': 'You Win!',
      'levelUp.humanFirstPromotion.message': 'You earned your stripes as a Rookie Challenger. Keep winning to reach Battle Strategist.',
      'levelUp.humanFirstPromotion.quote': '"Twenty wins — the carnival lights burn brighter when you rise."',
      'levelUp.humanDefault.eyebrow': '🎪 Carnival Win',
      'levelUp.humanDefault.title': 'You Win!',
      'levelUp.humanDefault.message': 'You climbed to Lv {level} · {tierLabel}.',
      'levelUp.humanDefault.quote': '"Every win sparks another light on the carnival strip."',
      'levelUp.rivalLegendSkill.eyebrow': 'Rival Legend Mode',
      'levelUp.rivalLegendSkill.title': '{name} reached Legend Mode!',
      'levelUp.rivalLegendSkill.message': '{name} hit Level 30. Their AI skillset is now Expert level — extremely intelligent.',
      'levelUp.rivalLegendSkill.quote': '"I see every card before it lands."',
      'levelUp.rivalSkillUpgraded.eyebrow': 'Rival Rank Up',
      'levelUp.rivalSkillUpgraded.title': '{name} promoted!',
      'levelUp.rivalSkillUpgraded.message': '{name} reached Lv {level} · {tierLabel}.',
      'levelUp.rivalSkillUpgraded.quote': '"My next hand will be sharper than the last."',
      'levelUp.rivalFirstPromotion.eyebrow': 'Rival Promotion',
      'levelUp.rivalFirstPromotion.title': '{name} leveled up!',
      'levelUp.rivalFirstPromotion.message': '{name} is now Lv {level} · {tierLabel}.',
      'levelUp.rivalFirstPromotion.quote': '"Watch out… I am just getting warmed up."',
      'levelUp.rivalDefault.eyebrow': 'Rival Promotion',
      'levelUp.rivalDefault.title': '{name} leveled up!',
      'levelUp.rivalDefault.message': '{name} reached Lv {level} · {tierLabel}.',
      'levelUp.rivalDefault.quote': '"Next table, I play even harder."',
      'skill.rookie': '',
      'skill.strategist': 'Skillset upgraded — this rival now plays smarter and reads the table better.',
      'skill.master': 'Skillset upgraded — this rival now outplays Strategist-level foes with sharper combos.',
      'skill.legend': 'Skillset upgraded — Expert Legend AI. Expect ruthless, intelligent plays every turn.'
    },
    th: {
      'log.tableBegins': 'โต๊ะเริ่มแล้ว {name} ถือ 3♦ และเริ่มเกม',
      'log.passed': '{name} ผ่าน โต๊ะยังเดินต่อ',
      'log.claimedTrick': '{name} ชนะไม้และเปิดไลน์ใหม่บนโต๊ะ',
      'log.played': '{name} {source} {play} {comment}',
      'log.youPlayed': 'คุณเล่น {play} {comment}',
      'log.restore': 'โต๊ะกลับมาจากการบันทึก เล่นต่อจากที่ค้างไว้',
      'log.aiJoin': '{name} เข้าโต๊ะด้วย 🪙 {coins} เหรียญ',
      'log.twoCards': '{name} เหลือ 2 ใบ',
      'log.warn': '⚠️ {note}',
      'heat.freshTrick': 'ไม้ใหม่หมายถึงเสียงเชียร์ใหม่จากฝูงชน',
      'selection.beatOrPass': 'ชนะ {play} หรือผ่าน',
      'selection.openingTurn': 'ตาคุณ · เปิดด้วย 3♦',
      'selection.freeTurn': 'ตาคุณ · เล่นคอมโบใดก็ได้',
      'selection.canPlay': '{play} · เล่นได้',
      'play.single': 'เดี่ยว {card}',
      'play.pair': 'คู่ {cards}',
      'play.triple': 'ตอง {cards}',
      'play.straight': 'สเตรท',
      'play.flush': 'ฟลัช',
      'play.fullHouse': 'ฟูลเฮาส์',
      'play.fourKind': 'โฟร์การ์ด',
      'play.straightFlush': 'สเตรทฟลัช',
      'play.fiveCard': 'ไพ่ 5 ใบ',
      'play.sourcePlayed': 'เล่น',
      'play.invalidHand': 'ไพ่ที่เลือกไม่ใช่มือ Big Two ที่ถูกต้อง',
      'play.mustBeat': 'คุณต้องชนะ {play} ด้วยมือที่แรงกว่าและจำนวนใบเท่ากัน',
      'log.trickMeta': '{play} · นำโดย {name} · ผ่าน {passes} ครั้ง',
      'victory.youDefeated': 'คุณชนะ {name}!',
      'victory.defeatedYou': '{name} ชนะคุณ!',
      'victory.speaker': '{name} พูดว่า:',
      'victory.rematch': 'เล่นอีกครั้ง?',
      'victory.goodGame': 'เกมดี!',
      'victory.betterLuck': 'โชคดีกว่านี้รอบหน้า!',
      'victory.seeYou': 'แล้วเจอกัน!',
      'levelUp.humanLegend.eyebrow': '🎪 ตำนานคาร์นิวัล',
      'levelUp.humanLegend.title': 'คุณชนะ!',
      'levelUp.humanLegend.message': 'คุณถึงเลเวล 30 — อันดับสูงสุดใน Big2Go คุณอยู่ในโหมดตำนานแล้ว',
      'levelUp.humanLegend.quote': '"คาร์นิวัลมอบมงกุฎให้ปรมาจารย์ไพ่ตัวจริง"',
      'levelUp.humanTierChange.eyebrow': '🎪 เลื่อนแรงค์คาร์นิวัล',
      'levelUp.humanTierChange.title': 'คุณชนะ!',
      'levelUp.humanTierChange.message': 'คุณเลื่อนขึ้นเป็น {tierLabel} คู่แข่งใหม่จะให้เกียรติคุณที่โต๊ะ',
      'levelUp.humanTierChange.quote': '"ทุกแรงค์ที่ปีนขึ้นทำให้คาร์นิวัล Big2Go สว่างขึ้น"',
      'levelUp.humanFirstPromotion.eyebrow': '🎪 ชัยชนะคาร์นิวัลครั้งแรก',
      'levelUp.humanFirstPromotion.title': 'คุณชนะ!',
      'levelUp.humanFirstPromotion.message': 'คุณได้แรงค์นักท้าทายมือใหม่แล้ว ชนะต่อเพื่อไปถึงนักยุทธศาสตร์',
      'levelUp.humanFirstPromotion.quote': '"ยี่สิบชัยชนะ — ไฟคาร์นิวัลสว่างขึ้นเมื่อคุณรุ่งขึ้น"',
      'levelUp.humanDefault.eyebrow': '🎪 ชนะคาร์นิวัล',
      'levelUp.humanDefault.title': 'คุณชนะ!',
      'levelUp.humanDefault.message': 'คุณขึ้นถึง Lv {level} · {tierLabel}',
      'levelUp.humanDefault.quote': '"ทุกชัยชนะจุดประกายไฟอีกดวงบนถนนคาร์นิวัล"',
      'levelUp.rivalLegendSkill.eyebrow': 'คู่แข่งโหมดตำนาน',
      'levelUp.rivalLegendSkill.title': '{name} ถึงโหมดตำนาน!',
      'levelUp.rivalLegendSkill.message': '{name} ถึงเลเวล 30 ทักษะ AI เป็นระดับ Expert — ฉลาดมาก',
      'levelUp.rivalLegendSkill.quote': '"ฉันเห็นไพ่ทุกใบก่อนมันลงโต๊ะ"',
      'levelUp.rivalSkillUpgraded.eyebrow': 'คู่แข่งเลื่อนแรงค์',
      'levelUp.rivalSkillUpgraded.title': '{name} เลื่อนขั้น!',
      'levelUp.rivalSkillUpgraded.message': '{name} ถึง Lv {level} · {tierLabel}',
      'levelUp.rivalSkillUpgraded.quote': '"มือถัดไปของฉันจะคมกว่าเดิม"',
      'levelUp.rivalFirstPromotion.eyebrow': 'คู่แข่งเลเวลอัป',
      'levelUp.rivalFirstPromotion.title': '{name} เลเวลอัป!',
      'levelUp.rivalFirstPromotion.message': '{name} ตอนนี้ Lv {level} · {tierLabel}',
      'levelUp.rivalFirstPromotion.quote': '"ระวังนะ… ฉันเพิ่งเริ่มอุ่นเครื่อง"',
      'levelUp.rivalDefault.eyebrow': 'คู่แข่งเลเวลอัป',
      'levelUp.rivalDefault.title': '{name} เลเวลอัป!',
      'levelUp.rivalDefault.message': '{name} ถึง Lv {level} · {tierLabel}',
      'levelUp.rivalDefault.quote': '"โต๊ะถัดไป ฉันเล่นหนักกว่าเดิม"',
      'skill.rookie': '',
      'skill.strategist': 'อัปเกรดทักษะ — คู่แข่งนี้เล่นฉลาดขึ้นและอ่านโต๊ะได้ดีขึ้น',
      'skill.master': 'อัปเกรดทักษะ — คู่แข่งนี้ชนะระดับนักยุทธศาสตร์ด้วยคอมโบที่คมกว่า',
      'skill.legend': 'อัปเกรดทักษะ — AI ตำนานระดับ Expert คาดหวังการเล่นที่โหดและฉลาดทุกตา'
    },
    zh: {
      'log.tableBegins': '牌局开始。{name} 持有 3♦ 并率先出牌。',
      'log.passed': '{name} 过牌，牌桌继续。',
      'log.claimedTrick': '{name} 赢得此墩并开启新的牌线。',
      'log.played': '{name}{source}{play}。{comment}',
      'log.youPlayed': '你出了 {play}。{comment}',
      'log.restore': '牌桌从存档恢复，请继续游戏。',
      'log.aiJoin': '{name} 加入牌桌，携带 🪙 {coins} 金币。',
      'log.twoCards': '{name} 只剩 2 张牌。',
      'log.warn': '⚠️ {note}',
      'heat.freshTrick': '新墩意味着观众新一轮欢呼。',
      'selection.beatOrPass': '压过 {play} 或过牌',
      'selection.openingTurn': '你的回合 · 以 3♦ 开局',
      'selection.freeTurn': '你的回合 · 可出任意组合',
      'selection.canPlay': '{play} · 可出',
      'play.single': '单张 {card}',
      'play.pair': '对子 {cards}',
      'play.triple': '三张 {cards}',
      'play.straight': '顺子',
      'play.flush': '同花',
      'play.fullHouse': '葫芦',
      'play.fourKind': '四条',
      'play.straightFlush': '同花顺',
      'play.fiveCard': '五张牌型',
      'play.sourcePlayed': '出了',
      'play.invalidHand': '所选牌型不是合法的 Big Two 手牌。',
      'play.mustBeat': '你必须用同样张数且更大的牌压过 {play}。',
      'log.trickMeta': '{play} · 由 {name} 领出 · {passes} 次过牌',
      'victory.youDefeated': '你击败了 {name}！',
      'victory.defeatedYou': '{name} 击败了你！',
      'victory.speaker': '{name} 说：',
      'victory.rematch': '再来一局？',
      'victory.goodGame': '好局！',
      'victory.betterLuck': '下次好运！',
      'victory.seeYou': '下次见！',
      'levelUp.humanLegend.eyebrow': '🎪 嘉年华传奇',
      'levelUp.humanLegend.title': '你赢了！',
      'levelUp.humanLegend.message': '你达到 30 级——Big2Go 最高段位，现已进入传奇模式。',
      'levelUp.humanLegend.quote': '"嘉年华为真正的牌桌大师加冕。"',
      'levelUp.humanTierChange.eyebrow': '🎪 嘉年华升段',
      'levelUp.humanTierChange.title': '你赢了！',
      'levelUp.humanTierChange.message': '你晋升至 {tierLabel}。新对手会尊重你的牌桌气场。',
      'levelUp.humanTierChange.quote': '"每升一段，Big2Go 嘉年华就多一盏灯。"',
      'levelUp.humanFirstPromotion.eyebrow': '🎪 首次嘉年华胜利',
      'levelUp.humanFirstPromotion.title': '你赢了！',
      'levelUp.humanFirstPromotion.message': '你获得新秀挑战者称号。继续获胜以晋升战术大师。',
      'levelUp.humanFirstPromotion.quote': '"二十胜——当你崛起，嘉年华灯火更亮。"',
      'levelUp.humanDefault.eyebrow': '🎪 嘉年华胜利',
      'levelUp.humanDefault.title': '你赢了！',
      'levelUp.humanDefault.message': '你升至 Lv {level} · {tierLabel}。',
      'levelUp.humanDefault.quote': '"每胜一局，嘉年华又多一道光。"',
      'levelUp.rivalLegendSkill.eyebrow': '对手传奇模式',
      'levelUp.rivalLegendSkill.title': '{name} 进入传奇模式！',
      'levelUp.rivalLegendSkill.message': '{name} 达到 30 级。AI 技能现为 Expert 级——极其聪明。',
      'levelUp.rivalLegendSkill.quote': '"每张牌落地前我都看得见。"',
      'levelUp.rivalSkillUpgraded.eyebrow': '对手升段',
      'levelUp.rivalSkillUpgraded.title': '{name} 晋升了！',
      'levelUp.rivalSkillUpgraded.message': '{name} 达到 Lv {level} · {tierLabel}。',
      'levelUp.rivalSkillUpgraded.quote': '"下一手会比上一手更锋利。"',
      'levelUp.rivalFirstPromotion.eyebrow': '对手升级',
      'levelUp.rivalFirstPromotion.title': '{name} 升级了！',
      'levelUp.rivalFirstPromotion.message': '{name} 现为 Lv {level} · {tierLabel}。',
      'levelUp.rivalFirstPromotion.quote': '"小心……我才刚热身。"',
      'levelUp.rivalDefault.eyebrow': '对手升级',
      'levelUp.rivalDefault.title': '{name} 升级了！',
      'levelUp.rivalDefault.message': '{name} 达到 Lv {level} · {tierLabel}。',
      'levelUp.rivalDefault.quote': '"下一桌，我会更拼。"',
      'skill.rookie': '',
      'skill.strategist': '技能升级——此对手更聪明，读牌更准。',
      'skill.master': '技能升级——此对手以更锋利的组合击败战术级对手。',
      'skill.legend': '技能升级——专家级传奇 AI。每回合都狠辣且聪明。'
    },
    ja: {
      'log.tableBegins': 'テーブル開始。{name}が3♦を持ち、ゲームを始める。',
      'log.passed': '{name}がパス。テーブルは動き続ける。',
      'log.claimedTrick': '{name}がトリックを獲得し、新しいラインを開く。',
      'log.played': '{name}が{source}{play}。{comment}',
      'log.youPlayed': 'あなたが{play}を出した。{comment}',
      'log.restore': 'セーブからテーブル復帰。続きからプレイ。',
      'log.aiJoin': '{name}が🪙{coins}コインでテーブルに参加。',
      'log.twoCards': '{name}は残り2枚。',
      'log.warn': '⚠️ {note}',
      'heat.freshTrick': '新しいトリックは新しい歓声を呼ぶ。',
      'selection.beatOrPass': '{play}を上回るかパス',
      'selection.openingTurn': 'あなたの番 · 3♦で開始',
      'selection.freeTurn': 'あなたの番 · 任意のコンボ',
      'selection.canPlay': '{play} · 出せる',
      'play.single': 'シングル {card}',
      'play.pair': 'ペア {cards}',
      'play.triple': 'トリプル {cards}',
      'play.straight': 'ストレート',
      'play.flush': 'フラッシュ',
      'play.fullHouse': 'フルハウス',
      'play.fourKind': 'フォーカード',
      'play.straightFlush': 'ストレートフラッシュ',
      'play.fiveCard': '5枚役',
      'play.sourcePlayed': 'が出した',
      'play.invalidHand': 'その選択は有効なビッグツーの手ではありません。',
      'play.mustBeat': '同じ枚数で {play} より強い手で上回ってください。',
      'log.trickMeta': '{play} · {name} がリード · パス {passes}',
      'victory.youDefeated': '{name}に勝利！',
      'victory.defeatedYou': '{name}に敗北！',
      'victory.speaker': '{name}：',
      'victory.rematch': 'リマッチ？',
      'victory.goodGame': 'GG！',
      'victory.betterLuck': '次は頑張って！',
      'victory.seeYou': 'また会おう！',
      'levelUp.humanLegend.eyebrow': '🎪 カーニバルレジェンド',
      'levelUp.humanLegend.title': '勝利！',
      'levelUp.humanLegend.message': 'レベル30到達——Big2Go最高ランク。レジェンドモード突入。',
      'levelUp.humanLegend.quote': '"カーニバルが真のカードマスターに冠を授ける。"',
      'levelUp.humanTierChange.eyebrow': '🎪 カーニバルランクアップ',
      'levelUp.humanTierChange.title': '勝利！',
      'levelUp.humanTierChange.message': '{tierLabel}に昇格。新ライバルもあなたを敬う。',
      'levelUp.humanTierChange.quote': '"一つ上がるたび、Big2Goカーニバルが明るくなる。"',
      'levelUp.humanFirstPromotion.eyebrow': '🎪 初カーニバル勝利',
      'levelUp.humanFirstPromotion.title': '勝利！',
      'levelUp.humanFirstPromotion.message': 'ルーキーチャレンジャー称号獲得。勝ち続けてバトルストラテジストへ。',
      'levelUp.humanFirstPromotion.quote': '"20勝——上昇するほどカーニバルの灯が輝く。"',
      'levelUp.humanDefault.eyebrow': '🎪 カーニバル勝利',
      'levelUp.humanDefault.title': '勝利！',
      'levelUp.humanDefault.message': 'Lv {level} · {tierLabel}に到達。',
      'levelUp.humanDefault.quote': '"勝利のたび、カーニバルストリップに灯がともる。"',
      'levelUp.rivalLegendSkill.eyebrow': 'ライバルレジェンドモード',
      'levelUp.rivalLegendSkill.title': '{name}がレジェンドモード！',
      'levelUp.rivalLegendSkill.message': '{name}がレベル30。AIスキルはExpert——非常に賢い。',
      'levelUp.rivalLegendSkill.quote': '"カードが着地する前に全部見える。"',
      'levelUp.rivalSkillUpgraded.eyebrow': 'ライバルランクアップ',
      'levelUp.rivalSkillUpgraded.title': '{name}が昇格！',
      'levelUp.rivalSkillUpgraded.message': '{name}がLv {level} · {tierLabel}に到達。',
      'levelUp.rivalSkillUpgraded.quote': '"次の手は前より鋭い。"',
      'levelUp.rivalFirstPromotion.eyebrow': 'ライバル昇格',
      'levelUp.rivalFirstPromotion.title': '{name}がレベルアップ！',
      'levelUp.rivalFirstPromotion.message': '{name}はLv {level} · {tierLabel}。',
      'levelUp.rivalFirstPromotion.quote': '"覚悟して… まだウォームアップ中。"',
      'levelUp.rivalDefault.eyebrow': 'ライバル昇格',
      'levelUp.rivalDefault.title': '{name}がレベルアップ！',
      'levelUp.rivalDefault.message': '{name}がLv {level} · {tierLabel}に到達。',
      'levelUp.rivalDefault.quote': '"次のテーブルはもっと本気。"',
      'skill.rookie': '',
      'skill.strategist': 'スキルアップ——このライバルはより賢く、テーブルを読む。',
      'skill.master': 'スキルアップ——ストラテジスト級をより鋭いコンボで上回る。',
      'skill.legend': 'スキルアップ——ExpertレジェンドAI。毎ターン容赦なく賢いプレイ。'
    },
    ko: {
      'log.tableBegins': '테이블 시작. {name}이(가) 3♦를 들고 게임을 시작합니다.',
      'log.passed': '{name}이(가) 패스. 테이블은 계속 진행됩니다.',
      'log.claimedTrick': '{name}이(가) 트릭을 가져가 새 라인을 엽니다.',
      'log.played': '{name}이(가) {source} {play}. {comment}',
      'log.youPlayed': '당신이 {play}을(를) 냈습니다. {comment}',
      'log.restore': '저장에서 테이블 복귀. 이어서 플레이하세요.',
      'log.aiJoin': '{name}이(가) 🪙 {coins} 코인으로 테이블에 참가합니다.',
      'log.twoCards': '{name}은(는) 2장 남았습니다.',
      'log.warn': '⚠️ {note}',
      'heat.freshTrick': '새 트릭은 새로운 관중 환호를 부릅니다.',
      'selection.beatOrPass': '{play}을(를) 이기거나 패스',
      'selection.openingTurn': '당신 차례 · 3♦로 시작',
      'selection.freeTurn': '당신 차례 · 아무 콤보',
      'selection.canPlay': '{play} · 가능',
      'play.single': '싱글 {card}',
      'play.pair': '페어 {cards}',
      'play.triple': '트리플 {cards}',
      'play.straight': '스트레이트',
      'play.flush': '플러시',
      'play.fullHouse': '풀하우스',
      'play.fourKind': '포카드',
      'play.straightFlush': '스트레이트 플러시',
      'play.fiveCard': '5장 패',
      'play.sourcePlayed': '냄',
      'play.invalidHand': '선택한 패는 유효한 빅투 패가 아닙니다.',
      'play.mustBeat': '같은 장수로 {play}보다 강한 패로 이겨야 합니다.',
      'log.trickMeta': '{play} · {name} 리드 · 패스 {passes}',
      'victory.youDefeated': '{name}을(를) 이겼습니다!',
      'victory.defeatedYou': '{name}에게 졌습니다!',
      'victory.speaker': '{name}:',
      'victory.rematch': '리매치?',
      'victory.goodGame': 'GG!',
      'victory.betterLuck': '다음엔 더 잘할 거예요!',
      'victory.seeYou': '다시 봐요!',
      'levelUp.humanLegend.eyebrow': '🎪 카니발 레전드',
      'levelUp.humanLegend.title': '승리!',
      'levelUp.humanLegend.message': '레벨 30 도달 — Big2Go 최고 랭크. 레전드 모드 진입.',
      'levelUp.humanLegend.quote': '"카니발이 진정한 카드 마스터에게 왕관을 씌운다."',
      'levelUp.humanTierChange.eyebrow': '🎪 카니발 랭크 업',
      'levelUp.humanTierChange.title': '승리!',
      'levelUp.humanTierChange.message': '{tierLabel}로 승급. 새 라이벌도 당신을 존중합니다.',
      'levelUp.humanTierChange.quote': '"한 단계 오를 때마다 Big2Go 카니발이 밝아진다."',
      'levelUp.humanFirstPromotion.eyebrow': '🎪 첫 카니발 승리',
      'levelUp.humanFirstPromotion.title': '승리!',
      'levelUp.humanFirstPromotion.message': '루키 챌린저 칭호 획득. 계속 이겨 배틀 전략가에 도전하세요.',
      'levelUp.humanFirstPromotion.quote': '"20승 — 오를수록 카니발 불빛이 더 밝다."',
      'levelUp.humanDefault.eyebrow': '🎪 카니발 승리',
      'levelUp.humanDefault.title': '승리!',
      'levelUp.humanDefault.message': 'Lv {level} · {tierLabel}에 도달.',
      'levelUp.humanDefault.quote': '"승리마다 카니발 거리에 불빛 하나."',
      'levelUp.rivalLegendSkill.eyebrow': '라이벌 레전드 모드',
      'levelUp.rivalLegendSkill.title': '{name} 레전드 모드!',
      'levelUp.rivalLegendSkill.message': '{name} 레벨 30. AI 스킬 Expert — 매우 지능적.',
      'levelUp.rivalLegendSkill.quote': '"카드가 놓이기 전에 다 본다."',
      'levelUp.rivalSkillUpgraded.eyebrow': '라이벌 랭크 업',
      'levelUp.rivalSkillUpgraded.title': '{name} 승급!',
      'levelUp.rivalSkillUpgraded.message': '{name} Lv {level} · {tierLabel} 도달.',
      'levelUp.rivalSkillUpgraded.quote': '"다음 패는 더 날카롭다."',
      'levelUp.rivalFirstPromotion.eyebrow': '라이벌 승급',
      'levelUp.rivalFirstPromotion.title': '{name} 레벨 업!',
      'levelUp.rivalFirstPromotion.message': '{name} Lv {level} · {tierLabel}.',
      'levelUp.rivalFirstPromotion.quote': '"조심해… 아직 워밍업 중."',
      'levelUp.rivalDefault.eyebrow': '라이벌 승급',
      'levelUp.rivalDefault.title': '{name} 레벨 업!',
      'levelUp.rivalDefault.message': '{name} Lv {level} · {tierLabel} 도달.',
      'levelUp.rivalDefault.quote': '"다음 테이블은 더 세게."',
      'skill.rookie': '',
      'skill.strategist': '스킬 업그레이드 — 이 라이벌은 더 똑똑하고 테이블을 잘 읽습니다.',
      'skill.master': '스킬 업그레이드 — 더 날카로운 콤보로 전략가급을 이깁니다.',
      'skill.legend': '스킬 업그레이드 — Expert 레전드 AI. 매 턴 냉혹하고 지능적인 플레이.'
    }
  };

  const TRANSLATIONS = {
    th: {
      bruno: {
        reactions: {
          player_slow: [
            'รีบหน่อย! 😆',
            'ถึงตาคุณแล้ว! ⏰',
            'รออยู่นะ... 👀',
            'มาเลย โชว์ไม้มา 🔥',
            'คิดนานไปเปล่า? 😂',
            'ไปกันเลย! ⚡'
          ],
          ai_strong_play: [
            'เป็นไงล่ะ? 🔥',
            'ชนะสิ! 😈',
            'มือแรง 💪',
            'ถึงตาคุณ 😎'
          ],
          ai_win_round: ['บอกแล้วไง 😎', 'ได้ไป! 🎉', 'ง่ายมาก 🔥'],
          ai_lose_round: ['โชคดีไป 😤', 'ไม้ดี 😅', 'โดนคุณแล้ว 🤦'],
          ai_win: ['ชนะ! 🎉', 'แชมป์ 😎', 'GG 🔥'],
          ai_lose: ['เล่นดี 👏', 'คุณชนะ 😭', 'รีแมตช์? 😤'],
          player_strong_play: ['ไม้กล้า 🤔', 'น่าสนใจ... 🧐', 'โชว์อีก 🔥']
        },
        rival: {
          defeatPlayer: [
            'โชคดีกว่านี้รอบหน้า 😏',
            'ง่ายเกินไปสำหรับฉัน 🔥',
            'ฝึกให้หนักแล้วกลับมา 💪',
            'โต๊ะนี้เป็นของฉันตั้งแต่แรก',
            'กลับมาเมื่อมือแข็งกว่านี้ 😎',
            'แทบไม่ต้องพยายามเลยรอบนี้ 😏',
            'ตำนาน Big Two? ยังไม่ใช่ 🔥',
            'จดไม้ของฉันแล้วลองใหม่ 📚'
          ],
          defeatedByPlayer: [
            'ครั้งหน้าจะไม่แพ้ 🔥',
            'โชคดีรอบนี้ 😤',
            'รีแมตช์ — ขอรีแมตช์!',
            'ฉันยังไม่สุด... บางที 😏',
            'คุณจับจังหวะฉันพลาดรอบนี้',
            'โอเค รอบสอง เดี๋ยวนี้ 💪',
            'ชัยชนะนั้นจะไม่ซ้ำสองครั้ง 😤',
            'อย่าชินชนะ Bruno 🔥'
          ]
        },
        farewell: {
          humanWon: ['โดนคุณรอบนี้ 😏', 'เคารพ — คุณสมควรชนะ', 'เจอกันที่โต๊ะถัดไป 💪'],
          humanLost: ['โชคดีกว่านี้รอบหน้า 😏', 'ฝึกแล้วกลับมา 🔥', 'โต๊ะจำได้']
        }
      },
      luna: {
        reactions: {
          player_slow: [
            'ค่อยๆ คิดนะ 😊',
            'พร้อมแล้ว ✨',
            'ไม่ต้องรีบ! 💫',
            'ยังอยู่ตรงนี้กับคุณ 🌙',
            'คิดหนักอยู่? 🤔'
          ],
          ai_strong_play: [
            'หวังว่าจะชอบนะ 😊',
            'ชนะไม้นี้ได้ไหม? 😏',
            'คอมโบสวยกำลังมา! ✨',
            'ถึงตาคุณ เพื่อน'
          ],
          ai_win_round: ['เย้! 🎉', 'ได้แล้ว 😊', 'โชคดีจากพระจันทร์ ✨'],
          ai_lose_round: ['เก่งมาก! 👏', 'ว้าว 😮', 'เกือบแล้ว 😅'],
          ai_win: ['เราทำได้! 🎉', 'ชนะแล้วมีความสุข 😊', 'เกมดี 🌙'],
          ai_lose: ['ยินดีด้วย! 👏', 'ทำได้ดี 😊', 'คุณสมควรได้ 🎉'],
          player_strong_play: ['ไม้น่าสนใจ 🤔', 'เล่นดี! 👏', 'ประทับใจ 😮']
        },
        rival: {
          defeatPlayer: [
            'เกมดี — คุณเล่นดี 😊',
            'รอบหน้าดีกว่า? ✨',
            'สนุกอยู่ดี 🌙',
            'คุณทำให้ฉันต้องระวัง 👏',
            'เกือบแล้ว — ลองอีกไหม?',
            'แมตช์น่ารักมาก ✨',
            'ไม้คุณคมวันนี้ 😊',
            'พรุ่งนี้เวลาเดิมรีแมตช์? 🌙'
          ],
          defeatedByPlayer: [
            'ว้าว คุณเก่งมาก 👏',
            'ฉันจะฝึกเพิ่มรอบหน้า ✨',
            'คุณสมควรชนะจริงๆ',
            'ฉันเชียร์คุณแล้ว 🌙',
            'เล่นสวยมาก 😊',
            'ทำให้ดูง่ายเลย',
            'โอ้ว — สอนฉันหน่อย ✨',
            'แมตช์ที่ดีที่สุดในนาน 👏'
          ]
        },
        farewell: {
          humanWon: ['สนุกมาก! แล้วเจอกัน ✨', 'คุณเล่นสวย 🌙', 'พรุ่งนี้เวลาเดิม?'],
          humanLost: ['เกมดี — เกือบชนะแล้ว', 'สนุกอยู่ดี 🌙', 'อีกรอบไหม? ✨']
        }
      },
      kiro: {
        reactions: {
          player_slow: [
            'กำลังคำนวณ... 📊',
            'อย่าให้รอนาน 😜',
            'ไพ่พร้อมแล้ว 😎',
            'ติ๊กต๊อก... ⏰',
            'ยังคำนวณอยู่ 📊',
            'มีใครอยู่ไหม? 👀'
          ],
          ai_strong_play: [
            'ไม้ใหม่! 🔥',
            'ลองอันนี้ 😜',
            'อ่านเกมคม 💪',
            'ช่วงตัดสิน 🔥'
          ],
          ai_win_round: ['อ่านเกมสะอาด 📊', 'หวาน! 🎉', 'โดนแล้ว 😎'],
          ai_lose_round: ['อุ๊ปส์ 😅', 'คำนวณพลาด 😱', 'เจ็บนะ'],
          ai_win: ['Kiro ชนะ! 🎉', 'ชัยชนะที่คำนวณแล้ว 😎', 'ข้อมูลชนะ 🔥'],
          ai_lose: ['คุณเล่นเก่งกว่า 😭', 'พ่ายแบบคม', 'GG 😅'],
          player_strong_play: ['ไม้เผ็ด 🌶️', 'เล่นอร่อย 😋', 'ว้าว 😮']
        },
        rival: {
          defeatPlayer: [
            'ชนะที่คำนวณแล้ว — สะอาด 📊',
            'อัตราต่อรองเข้าข้างฉันรอบนี้',
            'ช่วงตัดสินสำเร็จ 😎',
            'ความน่าจะเป็นบอกว่าครั้งหน้าฉันชนะ 📈',
            'แผนนั้นได้ผลสมบูรณ์',
            'ข้อมูลไม่โกหก — Kiro ชนะ 🤓',
            'อ่านโต๊ะสะอาดอีกครั้ง 😎',
            'ชัยชนะที่สมควรได้'
          ],
          defeatedByPlayer: [
            'กลยุทธ์ต้องแพตช์ 🤓',
            'เล่นดี — ฉันประเมินคุณต่ำไป',
            'แมตช์หน้าฉันอัปเดตสมุกกลยุทธ์ 🔥',
            'การอ่านเกมของคุณคมกว่า 📊',
            'ฉันคำนวณพลาดหนึ่งตา — ประทับใจ',
            'กำลังจำลองรีแมตช์ 🤓',
            'ความพ่ายนี้อยู่ในบันทึกเรียนรู้ 📚',
            'คุณแคร็กแผนเกมฉันรอบนี้ 🔥'
          ]
        },
        farewell: {
          humanWon: ['ความพ่ายนี้อยู่ในบันทึกเรียนรู้ 📚', 'เล่นดี — กำลังอัปเดตสมุกกลยุทธ์', 'อ่านเกมคมรอบนี้ 🤓'],
          humanLost: ['ความน่าจะเป็นเข้าข้างฉันวันนี้ 📊', 'ช่วงตัดสินสำเร็จ', 'รีแมตช์หลังเก็บข้อมูล? 📈']
        }
      },
      pico: {
        reactions: {
          player_slow: [
            'ไป ไป ไป! ⚡',
            'ปีกพร้อมแล้ว ⚡',
            'ช้าไป! 😤',
            'ซูoom ซoom — ถึงตาคุณ ⏰',
            'ฉันกระโดดอยู่ตรงนี้',
            'รีบ รีบ! 🔥'
          ],
          ai_strong_play: [
            'โจมตีความเร็ว! ⚡',
            'คอมโบเร็ว 🔥',
            'ชนะ burst นี้สิ',
            'ตัวเล็กแต่แกร่ง 💪',
            'ไม้ซoom!'
          ],
          ai_win_round: ['ชนะเร็ว ⚡', 'ซoom! 🔥', 'เร็วเกิน', 'แชมป์ความเร็ว 🎉'],
          ai_lose_round: ['โดนคุณ 😤', 'burst โชคดี 😅', 'ว้าว 😮', 'แรง! 👏'],
          ai_win: ['Pico ชนะ! ⚡', 'แชมป์ความเร็ว 🎉', 'มือเร็วที่สุด 🔥'],
          ai_lose: ['คุณชนะ 😭', 'ความเร็วดี 👏', 'รีแมตช์!'],
          player_strong_play: ['พลังเต็ม 🔥', 'โอ้ 😮', 'มือเร็ว 👏', 'ไม้แรง 💪']
        },
        rival: {
          defeatPlayer: [
            'เร็วเกินคุณ ⚡',
            'ซoom ซoom ชนะ 🔥',
            'ฝึก reflex 💪',
            'แชมป์ความเร็วอีกแล้ว 🎉',
            'โต๊ะนั้นเป็นของฉัน',
            'กลับมาเร็วกว่านี้ 😏',
            'Pico ชนะอีก ⚡',
            'กระพริบแล้วพลาด 🔥'
          ],
          defeatedByPlayer: [
            'คุณวิ่งเร็วกว่าไม้ฉัน 😤',
            'โอเค — รีแมตช์เดี๋ยวนี้',
            'ชัยชนะนั้นเร็ว 🔥',
            'ฉันช้าไปหนึ่งจังหวะ ⚡',
            'เคารพการกลับมา 👏',
            'รอบหน้าฉันวางแผนใหม่',
            'คุณตัดความเร็วฉันวันนี้ 😭',
            'โอเคโอเค — คุณชนะ 💪'
          ]
        },
        farewell: {
          humanWon: ['ชนะเร็ว — เคารพ ⚡', 'คุณเล่นสมบูรณ์แบบ 👏', 'รีแมตช์เต็มสปีด 🔥'],
          humanLost: ['Pico ซoom ไปกับชัยชนะ', 'ความเร็วชนะอีก 🔥', 'แข่งอีกไหม? ⚡']
        }
      },
      bao: {
        reactions: {
          player_slow: [
            'ยังอุ่นอยู่... 🥟',
            'คน คน... ยังคิด? 😜',
            'เริ่มร้อน ☕',
            'มีใครไหม? 👀',
            'จิบชารอตัดสิน 😏',
            'ความอดทน Bao ใกล้หมด 😂'
          ],
          ai_strong_play: [
            'คอมโบเหนียว! 🥟',
            'ดูดไม้นี้สิ 😎',
            'พลังฟอง 💥',
            'ลองชนะ Bao 🔥',
            'เสิร์ฟใหม่กำลังมา ✨'
          ],
          ai_win_round: ['ชนะนุ่ม 🥟', 'เหนียว! 😎', 'ฟองแตก 🎉', 'ไม้อร่อย ✨'],
          ai_lose_round: ['โดนคุณแตก 😅', 'สวนเผ็ด 🌶️', 'โอ้ว 😮', 'เล่นธรรม 👏'],
          ai_win: ['Bao ชนะ! 🥟', 'ชัยชนะจานเต็ม 😎', 'ชนแก้ว 🔥'],
          ai_lose: ['คุณกินชัยชนะฉัน 😭', 'เล่นดี', 'รีแมตช์? 😤'],
          player_strong_play: ['มือเผ็ด 🌶️', 'พลังเต็ม 🔥', 'โดนใจ 👏', 'ฟองวุ่น 😮']
        },
        rival: {
          defeatPlayer: [
            'หมดแก้ว — ฉันชนะ 🥟',
            'รอบชัยชนะเหนียว 😎',
            'รอบนั้นรสชาติพิเศษ ✨',
            'กลับมาพร้อมชาแกร่งกว่า 🔥',
            'Bao กลับมาเสมอ',
            'จิบความพ่ายนั้นสิ 😏',
            'แชมป์อีกแล้ว 🎉',
            'สั่งรีแมตช์กลับบ้าน 🥟'
          ],
          defeatedByPlayer: [
            'คุณทำกลยุทธ์ฉันล้น 😭',
            'ไม้นั้นหวานพิเศษ 👏',
            'ต้องเติมรีแมตช์',
            'คุณแคร็กคอมโบรอบนี้ 🔥',
            'โอเค พระเอก 😤',
            'ฟองแตก... เคารพ ✨',
            'รอบหน้าฉันกล้ากว่า 😎',
            'ความพ่ายเหนียวขม 🥟'
          ]
        },
        farewell: {
          humanWon: ['คุณได้คำกัดสุดท้าย 🥟', 'ชนะหวาน — เคารพ 👏', 'โต๊ะเดิมรอบหน้า? ✨'],
          humanLost: ['จานเต็มชัยชนะ 🥟', 'แมตช์สนุก 😎', 'รีแมตช์ในร้าน? 🔥']
        }
      },
      tora: {
        reactions: {
          player_slow: [
            'โหมด zen...',
            'ไม่ต้องรีบ ☁️',
            'ค่อยๆ คิด 🌿',
            'ยังสงบและพร้อม',
            'ฉันรออย่างสงบ 😌',
            'ช้าแต่ลื่น'
          ],
          ai_strong_play: [
            'ไม้ที่คำนวณแล้ว',
            'ท่า balanced ☁️',
            'ลองอ่านนี้ 📊',
            'มือนิ่ง',
            'ถึงตาคุณ 😌'
          ],
          ai_win_round: ['ไม้สะอาด', 'ชนะ balanced ☁️', 'ลื่น 😌', 'ตามแผน 📊'],
          ai_lose_round: ['ไม้คม 👏', 'อ่านดี 😮', 'เคารพ', 'ทำได้ดี 🌿'],
          ai_win: ['Tora ชนะ', 'แชมป์สงบ ☁️', 'สันติและชัยชนะ'],
          ai_lose: ['เล่นดี 👏', 'คุณสมควรได้', 'เกมดี 😌'],
          player_strong_play: ['อ่านแรง 🤔', 'เส้นทางน่าสนใจ 👏', 'กล้าแต่ฉลาด 📊', 'จังหวะดี']
        },
        rival: {
          defeatPlayer: [
            'ชนะสงบของ Tora',
            'โต๊ะต้องการ balance ☁️',
            'ศึกษาการไหลของไม้ 📊',
            'ความอดทนคุ้ม 🌿',
            'กลับมาเมื่อใจนิ่ง 😌',
            'จบลื่น',
            'การอ่านนั้นสะอาด 📊',
            'ชัยชนะ zen ☁️'
          ],
          defeatedByPlayer: [
            'คุณทำลายความสงบ 😤',
            'โฟกัสน่าประทับใจ 👏',
            'ฉันเล่นผิดหนึ่งตา',
            'รีแมตช์หลังนั่งสมาธิ? ☁️',
            'การอ่านของคุณคมกว่า 📊',
            'Tora เคารพชัยชนะนั้น',
            'ฉันจะฝึกเพิ่ม 😌',
            'แชมป์ที่สมควรได้'
          ]
        },
        farewell: {
          humanWon: ['จิตแข็ง ชนะแข็ง', 'เคารพโฟกัสของคุณ 👏', 'จนกว่าจะเจอในการต่อสู้สงบ ☁️'],
          humanLost: ['balance เข้าข้างฉันวันนี้', 'เกมดี 😌', 'โต๊ะเดิมเร็วๆ นี้? 🌿']
        }
      }
    },
    zh: {
      bruno: {
        reactions: {
          player_slow: [
            '快点！ 😆',
            '该你了！ ⏰',
            '等着呢... 👀',
            '来吧，亮出你的牌 🔥',
            '想太久了吧？ 😂',
            '走起！ ⚡'
          ],
          ai_strong_play: [
            '这个怎么样？ 🔥',
            '压过试试！ 😈',
            '强牌 💪',
            '轮到你了 😎'
          ],
          ai_win_round: ['早说了 😎', '我的！ 🎉', '太简单 🔥'],
          ai_lose_round: ['运气好 😤', '不错 😅', '被你拿下了 🤦'],
          ai_win: ['胜利！ 🎉', '冠军 😎', 'GG 🔥'],
          ai_lose: ['打得好 👏', '你赢了 😭', '再来一局？ 😤'],
          player_strong_play: ['大胆 🤔', '有意思... 🧐', '再亮一手 🔥']
        },
        rival: {
          defeatPlayer: [
            '下次好运 😏',
            '对我来说太简单 🔥',
            '练强点再来 💪',
            '这桌从一开始就是我的',
            '手牌更强了再来 😎',
            '这局我几乎没费劲 😏',
            'Big Two 传奇？还早 🔥',
            '研究我的打法再试 📚'
          ],
          defeatedByPlayer: [
            '下次我不会输 🔥',
            '这局你运气好 😤',
            '重赛——我要重赛！',
            '我留了一手... 也许 😏',
            '这次被你打了个措手不及',
            '行。第二局。现在 💪',
            '那胜利不会重复两次 😤',
            '别习惯赢 Bruno 🔥'
          ]
        },
        farewell: {
          humanWon: ['这局被你拿下了 😏', '尊重——你配得上这场胜利', '下桌见 💪'],
          humanLost: ['下局好运 😏', '练好了再来 🔥', '牌桌会记住的']
        }
      },
      luna: {
        reactions: {
          player_slow: [
            '慢慢想 😊',
            '我准备好了 ✨',
            '不急！ 💫',
            '还陪着你 🌙',
            '在想什么呢？ 🤔'
          ],
          ai_strong_play: [
            '希望你喜欢 😊',
            '能压过这个吗？ 😏',
            '漂亮组合来了！ ✨',
            '轮到你了，朋友'
          ],
          ai_win_round: ['耶！ 🎉', '拿到了 😊', '幸运之月 ✨'],
          ai_lose_round: ['干得好！ 👏', '哇 😮', '好接近 😅'],
          ai_win: ['我们做到了！ 🎉', '开心胜利 😊', '好局 🌙'],
          ai_lose: ['恭喜！ 👏', '做得好 😊', '你配得上 🎉'],
          player_strong_play: ['有意思的出牌 🤔', '好牌！ 👏', '真厉害 😮']
        },
        rival: {
          defeatPlayer: [
            '好局——你打得不错 😊',
            '下局试试？ ✨',
            '反正很开心 🌙',
            '你让我不敢大意 👏',
            '好接近——再试一次？',
            '很精彩的对局 ✨',
            '你今天出牌很锋利 😊',
            '明天同一时间重赛？ 🌙'
          ],
          defeatedByPlayer: [
            '哇，你太厉害了 👏',
            '下次我会多练 ✨',
            '你完全配得上这场胜利',
            '我现在为你加油 🌙',
            '打得真漂亮 😊',
            '你让这看起来好轻松',
            '好吧——教教我秘诀 ✨',
            '很久以来最好的一局 👏'
          ]
        },
        farewell: {
          humanWon: ['太开心了！再见 ✨', '你打得真美 🌙', '明天同一时间？'],
          humanLost: ['好局——你咬得很紧', '反正很开心 🌙', '再来一局？ ✨']
        }
      },
      kiro: {
        reactions: {
          player_slow: [
            '在算数... 📊',
            '别让我们等 😜',
            '我的牌准备好了 😎',
            '滴答滴答... ⏰',
            '还在计算 📊',
            '喂？ 👀'
          ],
          ai_strong_play: [
            '新出牌！ 🔥',
            '试试这个 😜',
            '读牌很准 💪',
            '关键时刻 🔥'
          ],
          ai_win_round: ['读牌干净 📊', '漂亮！ 🎉', '抓到你了 😎'],
          ai_lose_round: ['哎呀 😅', '算错了 😱', '好痛'],
          ai_win: ['Kiro 赢了！ 🎉', '计算过的胜利 😎', '数据获胜 🔥'],
          ai_lose: ['你比我打得好 😭', '干脆的败北', 'GG 😅'],
          player_strong_play: ['辣手 🌶️', '漂亮的打法 😋', '哇 😮']
        },
        rival: {
          defeatPlayer: [
            '计算过的胜利——干净 📊',
            '这局概率站在我这边',
            '关键时刻完成 😎',
            '概率说我下次还会赢 📈',
            '那个计划完美执行',
            '数据不会说谎—— Kiro 赢 🤓',
            '又一次干净的读牌 😎',
            '实至名归的胜利'
          ],
          defeatedByPlayer: [
            '我的策略需要调整 🤓',
            '打得好——我低估你了',
            '下局我在更新战术手册 🔥',
            '你的读牌比我准 📊',
            '我算错了一手——厉害',
            '正在为重赛跑模拟 🤓',
            '这次失败记入学习日志 📚',
            '你破解了我的战术 🔥'
          ]
        },
        farewell: {
          humanWon: ['这次失败记入学习日志 📚', '打得好——更新战术手册中', '这局读牌很准 🤓'],
          humanLost: ['今天概率站在我这边 📊', '关键时刻完成', '多收点数据再重赛？ 📈']
        }
      },
      pico: {
        reactions: {
          player_slow: [
            '冲冲冲！ ⚡',
            '翅膀准备好了 ⚡',
            '太慢！ 😤',
            '嗖嗖——该你了 ⏰',
            '我在原地蹦',
            '快快快！ 🔥'
          ],
          ai_strong_play: [
            '速度攻击！ ⚡',
            '快速组合 🔥',
            '压过这波攻势',
            '小个子大能量 💪',
            '飞速出牌！'
          ],
          ai_win_round: ['快速胜利 ⚡', '嗖！ 🔥', '太快了', '速度冠军 🎉'],
          ai_lose_round: ['被你拿下了 😤', '幸运的爆发 😅', '哇 😮', '强！ 👏'],
          ai_win: ['Pico 赢了！ ⚡', '速度冠军 🎉', '最快的手 🔥'],
          ai_lose: ['你赢了 😭', '速度不错 👏', '重赛！'],
          player_strong_play: ['大能量 🔥', '哇 😮', '快手 👏', '强牌 💪']
        },
        rival: {
          defeatPlayer: [
            '对你太快了 ⚡',
            '嗖嗖胜利 🔥',
            '练练反应速度 💪',
            '又是速度冠军 🎉',
            '那桌是我的',
            '下次来得更快 😏',
            'Pico 又赢了 ⚡',
            '眨眼就错过 🔥'
          ],
          defeatedByPlayer: [
            '你比我的出牌还快 😤',
            '行——现在重赛',
            '那胜利好快 🔥',
            '我慢了一拍 ⚡',
            '佩服你的反击 👏',
            '下局我要新计划',
            '你今天剪掉了我的速度 😭',
            '好好好——你赢 💪'
          ]
        },
        farewell: {
          humanWon: ['快速胜利——佩服 ⚡', '你打得完美 👏', '全速重赛 🔥'],
          humanLost: ['Pico 带着胜利飞走了', '速度又赢了 🔥', '再比一次？ ⚡']
        }
      },
      bao: {
        reactions: {
          player_slow: [
            '还在冒热气... 🥟',
            '搅搅... 还在想？ 😜',
            '越来越暖了 ☕',
            '喂？ 👀',
            '你决定时抿一口 😏',
            'Bao 的耐心快没了 😂'
          ],
          ai_strong_play: [
            'Q弹组合！ 🥟',
            '吸溜这手 😎',
            '气泡力量 💥',
            '试试压过 Bao 🔥',
            '新鲜上菜来了 ✨'
          ],
          ai_win_round: ['软胜利 🥟', 'Q弹！ 😎', '气泡爆开 🎉', '美味的一墩 ✨'],
          ai_lose_round: ['被你戳破了 😅', '辛辣的反击 🌶️', '好吧 😮', '公平对局 👏'],
          ai_win: ['Bao 赢了！ 🥟', '满盘胜利 😎', '干杯 🔥'],
          ai_lose: ['你吃掉了我的胜利 😭', '打得好', '重赛？ 😤'],
          player_strong_play: ['辣手 🌶️', '大能量 🔥', '打中了 👏', '气泡麻烦 😮']
        },
        rival: {
          defeatPlayer: [
            '干杯——我赢 🥟',
            'Q弹胜利圈 😎',
            '那局格外有滋味 ✨',
            '带着更浓的茶回来 🔥',
            'Bao 总会反弹回来',
            '慢慢品味那份失败 😏',
            '又是冠军 🎉',
            '打包一份重赛 🥟'
          ],
          defeatedByPlayer: [
            '你洒了我的战术 😭',
            '那手格外甜 👏',
            '我需要续杯重赛',
            '你这次破解了组合 🔥',
            '好吧主角 😤',
            '气泡破了... 佩服 ✨',
            '下局我会更大胆 😎',
            'Q弹的失败好苦 🥟'
          ]
        },
        farewell: {
          humanWon: ['最后一口是你的 🥟', '甜蜜的胜利——佩服 👏', '下局同桌？ ✨'],
          humanLost: ['满盘胜利 🥟', '有趣的对局 😎', '店家请客重赛？ 🔥']
        }
      },
      tora: {
        reactions: {
          player_slow: [
            '禅模式...',
            '不急 ☁️',
            '慢慢想 🌿',
            '依然平静且就绪',
            '我安详地等 😌',
            '慢即是顺'
          ],
          ai_strong_play: [
            '精算出牌',
            '平衡的动作 ☁️',
            '试试这个读牌 📊',
            '稳定的手',
            '轮到你了 😌'
          ],
          ai_win_round: ['干净的一墩', '平衡的胜利 ☁️', '顺滑 😌', '如计划 📊'],
          ai_lose_round: ['锋利的出牌 👏', '读牌准确 😮', '佩服', '做得好 🌿'],
          ai_win: ['Tora 赢了', '沉静的冠军 ☁️', '和平与胜利'],
          ai_lose: ['打得好 👏', '你配得上', '好局 😌'],
          player_strong_play: ['读牌很准 🤔', '有趣的路线 👏', '大胆但聪明 📊', '节奏不错']
        },
        rival: {
          defeatPlayer: [
            'Tora 的沉静胜利',
            '牌桌需要平衡 ☁️',
            '研究牌墩流向 📊',
            '耐心有回报 🌿',
            '心静了再来 😌',
            '顺滑收尾',
            '那次读牌很干净 📊',
            '禅意胜利 ☁️'
          ],
          defeatedByPlayer: [
            '你打破了我的平静 😤',
            '专注令人佩服 👏',
            '我失误了一手',
            '冥想后重赛？ ☁️',
            '你的读牌更准 📊',
            'Tora 尊重那场胜利',
            '我会多练 😌',
            '实至名归的冠军'
          ]
        },
        farewell: {
          humanWon: ['强心智，强胜利', '尊重你的专注 👏', '下次平静对决见 ☁️'],
          humanLost: ['今天平衡站在我这边', '好局 😌', '很快同桌？ 🌿']
        }
      }
    },
    ja: {
      bruno: {
        reactions: {
          player_slow: [
            '急げ！ 😆',
            'もう君の番！ ⏰',
            '待ってるよ... 👀',
            'さあ、見せて 🔥',
            '考えすぎ？ 😂',
            '行こう！ ⚡'
          ],
          ai_strong_play: [
            'これはどう？ 🔥',
            '上回ってみろ！ 😈',
            '強い手 💪',
            '君の番 😎'
          ],
          ai_win_round: ['言ったろ 😎', '取った！ 🎉', '楽勝 🔥'],
          ai_lose_round: ['ラッキー 😤', 'ナイス 😅', 'やられた 🤦'],
          ai_win: ['勝利！ 🎉', 'チャンピオン 😎', 'GG 🔥'],
          ai_lose: ['上手い 👏', '君の勝ち 😭', 'リマッチ？ 😤'],
          player_strong_play: ['大胆 🤔', '面白い... 🧐', 'もっと見せて 🔥']
        },
        rival: {
          defeatPlayer: [
            '次は頑張って 😏',
            '俺には簡単すぎ 🔥',
            'もっと鍛えて戻れ 💪',
            'この卓は最初から俺のもの',
            '手札が強くなったら来い 😎',
            '今回はほとんど手も使わなかった 😏',
            'Big Twoの伝説？ まだ早い 🔥',
            '俺の手を研究して再挑戦 📚'
          ],
          defeatedByPlayer: [
            '次は負けない 🔥',
            '今回は運が良かった 😤',
            'リマッチ——リマッチだ！',
            '手加減してた... かも 😏',
            '今回は不意を突かれた',
            'いい。第二ラウンド。今すぐ 💪',
            'あの勝利は二度とない 😤',
            'Brunoに勝つのに慣れるな 🔥'
          ]
        },
        farewell: {
          humanWon: ['今回は君の勝ち 😏', 'リスペクト——勝利は君のもの', '次の卓で 💪'],
          humanLost: ['次は頑張って 😏', '鍛えて戻って 🔥', '卓は覚えている']
        }
      },
      luna: {
        reactions: {
          player_slow: [
            'ゆっくりでいいよ 😊',
            '準備できてる ✨',
            '急がなくて大丈夫！ 💫',
            'まだ一緒にいるよ 🌙',
            '考え中？ 🤔'
          ],
          ai_strong_play: [
            '気に入ってくれるといいな 😊',
            'これに勝てる？ 😏',
            'いいコンボが来る！ ✨',
            '君の番、友だち'
          ],
          ai_win_round: ['やった！ 🎉', '取れた 😊', 'ラッキームーン ✨'],
          ai_lose_round: ['上手！ 👏', 'わあ 😮', '惜しい 😅'],
          ai_win: ['できた！ 🎉', '嬉しい勝利 😊', 'いいゲーム 🌙'],
          ai_lose: ['おめでとう！ 👏', 'よくやった 😊', '君が勝った 🎉'],
          player_strong_play: ['面白い手 🤔', 'ナイス！ 👏', 'すごい 😮']
        },
        rival: {
          defeatPlayer: [
            'いいゲーム——上手だった 😊',
            '次のラウンド？ ✨',
            'とにかく楽しかった 🌙',
            '油断させてくれた 👏',
            '惜しかった——もう一度？',
            '素敵なマッチ ✨',
            '今日の手は鋭かった 😊',
            '明日同じ時間にリマッチ？ 🌙'
          ],
          defeatedByPlayer: [
            'わあ、すごい 👏',
            '次はもっと練習する ✨',
            '君は本当に勝つに値する',
            '今は君を応援してる 🌙',
            '美しいプレイ 😊',
            '簡単そうに見えた',
            'わあ——秘訣教えて ✨',
            '久しぶりの最高のマッチ 👏'
          ]
        },
        farewell: {
          humanWon: ['楽しかった！また会おう ✨', '美しくプレイした 🌙', '明日同じ時間？'],
          humanLost: ['いいゲーム——接戦だった', 'とにかく楽しかった 🌙', 'もう一ラウンド？ ✨']
        }
      },
      kiro: {
        reactions: {
          player_slow: [
            '計算中... 📊',
            '待たせないで 😜',
            'カード準備OK 😎',
            'チクタク... ⏰',
            'まだ計算中 📊',
            'もしもし？ 👀'
          ],
          ai_strong_play: [
            '新しい手！ 🔥',
            'これ試して 😜',
            '鋭い読み 💪',
            '勝負どころ 🔥'
          ],
          ai_win_round: ['クリーンな読み 📊', 'スイート！ 🎉', '捕まえた 😎'],
          ai_lose_round: ['おっと 😅', '計算ミス 😱', '痛い'],
          ai_win: ['Kiro勝利！ 🎉', '計算された勝利 😎', 'データが勝つ 🔥'],
          ai_lose: ['君の方が上手 😭', '鋭い敗北', 'GG 😅'],
          player_strong_play: ['スパイシーな手 🌶️', '美味しいプレイ 😋', 'わあ 😮']
        },
        rival: {
          defeatPlayer: [
            '計算された勝利——クリーン 📊',
            '今回は確率が俺に味方',
            '勝負どころクリア 😎',
            '確率は次も俺の勝ち 📈',
            'そのプランは完璧に機能',
            'データは嘘をつかない——Kiro勝利 🤓',
            'またクリーンな読み 😎',
            'よく得た勝利'
          ],
          defeatedByPlayer: [
            '戦略にパッチが必要 🤓',
            '上手——過小評価していた',
            '次はプレイブック更新 🔥',
            '君の読みの方が鋭い 📊',
            '一手計算ミス——見事',
            'リマッチのシミュレーション中 🤓',
            'その敗北は学習ログへ 📚',
            '今回はゲームプランを破られた 🔥'
          ]
        },
        farewell: {
          humanWon: ['その敗北は学習ログへ 📚', '上手——プレイブック更新中', '今回は鋭い読み 🤓'],
          humanLost: ['今日は確率が味方 📊', '勝負どころクリア', 'もっとデータ集めてリマッチ？ 📈']
        }
      },
      pico: {
        reactions: {
          player_slow: [
            'ゴーゴーゴー！ ⚡',
            '翼準備OK ⚡',
            '遅い！ 😤',
            'ズームズーム——君の番 ⏰',
            'ここでバウンドしてる',
            '急いで急いで！ 🔥'
          ],
          ai_strong_play: [
            'スピードアタック！ ⚡',
            '高速コンボ 🔥',
            'このバーストに勝て',
            '小さいけど強い 💪',
            'ズームプレイ！'
          ],
          ai_win_round: ['クイック勝利 ⚡', 'ズーム！ 🔥', '速すぎ', 'スピードチャンピオン 🎉'],
          ai_lose_round: ['やられた 😤', 'ラッキーバースト 😅', 'わあ 😮', '強い！ 👏'],
          ai_win: ['Pico勝利！ ⚡', 'スピードチャンピオン 🎉', '最速の手 🔥'],
          ai_lose: ['君の勝ち 😭', 'いいスピード 👏', 'リマッチ！'],
          player_strong_play: ['大エネルギー 🔥', 'わあ 😮', '速い手 👏', '強いプレイ 💪']
        },
        rival: {
          defeatPlayer: [
            '君には速すぎ ⚡',
            'ズームズーム勝利 🔥',
            '反射神経を鍛えろ 💪',
            'またスピードチャンピオン 🎉',
            'あの卓は俺のもの',
            'もっと速く戻って 😏',
            'Picoまた勝利 ⚡',
            '瞬きしたら見逃す 🔥'
          ],
          defeatedByPlayer: [
            '君の方が速かった 😤',
            'いい——今リマッチ',
            'あの勝利は速かった 🔥',
            '一拍遅れた ⚡',
            'カムバックに敬意 👏',
            '次は計画を練る',
            '今日はスピードを切られた 😭',
            'わかった——君の勝ち 💪'
          ]
        },
        farewell: {
          humanWon: ['速い勝利——リスペクト ⚡', '完璧なプレイ 👏', 'フルスピードでリマッチ 🔥'],
          humanLost: ['Picoは勝利と共にズーム', 'スピード再勝利 🔥', 'またレース？ ⚡']
        }
      },
      bao: {
        reactions: {
          player_slow: [
            'まだ蒸し中... 🥟',
            'かき混ぜ... まだ考え中？ 😜',
            '温まってきた ☕',
            'もしもし？ 👀',
            '決める間に一口 😏',
            'Baoの忍耐も限界 😂'
          ],
          ai_strong_play: [
            'もちもちコンボ！ 🥟',
            'この手をすする 😎',
            'バブルパワー 💥',
            'Baoに勝てる？ 🔥',
            '新鮮サーブが来る ✨'
          ],
          ai_win_round: ['ソフト勝利 🥟', 'もちもち！ 😎', 'バブルバースト 🎉', '美味しいトリック ✨'],
          ai_lose_round: ['弾けられた 😅', 'スパイシーカウンター 🌶️', 'わあ 😮', 'フェアプレイ 👏'],
          ai_win: ['Bao勝利！ 🥟', '満皿の勝利 😎', '乾杯 🔥'],
          ai_lose: ['勝利を食べられた 😭', '上手', 'リマッチ？ 😤'],
          player_strong_play: ['スパイシーな手 🌶️', '大エネルギー 🔥', '当たった 👏', 'バブルトラブル 😮']
        },
        rival: {
          defeatPlayer: [
            '乾杯——俺の勝ち 🥟',
            'もちもち勝利ラップ 😎',
            'あのラウンドは特別な味 ✨',
            'もっと強い茶を持って戻れ 🔥',
            'Baoは必ず戻る',
            'その敗北をすする 😏',
            'またチャンピオン 🎉',
            'テイクアウトリマッチ 🥟'
          ],
          defeatedByPlayer: [
            '戦略をこぼされた 😭',
            'あの手は特別甘い 👏',
            'リフィルリマッチが必要',
            '今回コンボを破られた 🔥',
            'わかった主役 😤',
            'バブルバースト... リスペクト ✨',
            '次はもっと大胆 😎',
            'もちもち敗北は苦い 🥟'
          ]
        },
        farewell: {
          humanWon: ['最後の一口は君のもの 🥟', '甘い勝利——リスペクト 👏', '次も同じ卓？ ✨'],
          humanLost: ['満皿の勝利 🥟', '楽しいマッチ 😎', '店のリマッチ？ 🔥']
        }
      },
      tora: {
        reactions: {
          player_slow: [
            '禅モード...',
            '急がなくていい ☁️',
            'ゆっくり 🌿',
            'まだ穏やかで準備OK',
            '穏やかに待つ 😌',
            '遅いは滑らか'
          ],
          ai_strong_play: [
            '計算された手',
            'バランスの取れた動き ☁️',
            'この読みを試して 📊',
            '安定した手',
            '君の番 😌'
          ],
          ai_win_round: ['クリーンなトリック', 'バランス勝利 ☁️', 'スムーズ 😌', '計画通り 📊'],
          ai_lose_round: ['鋭いプレイ 👏', 'いい読み 😮', 'リスペクト', 'よくやった 🌿'],
          ai_win: ['Tora勝利', '穏やかなチャンピオン ☁️', '平和と勝利'],
          ai_lose: ['上手 👏', '君が勝った', 'いいゲーム 😌'],
          player_strong_play: ['強い読み 🤔', '面白いライン 👏', '大胆だが賢い 📊', 'いいテンポ']
        },
        rival: {
          defeatPlayer: [
            'Toraの穏やかな勝利',
            '卓にはバランスが必要 ☁️',
            'トリックの流れを学べ 📊',
            '忍耐が報われる 🌿',
            '心が整ったら戻れ 😌',
            'スムーズなフィニッシュ',
            'あの読みはクリーン 📊',
            '禅の勝利 ☁️'
          ],
          defeatedByPlayer: [
            '穏やかさを破られた 😤',
            '印象的な集中 👏',
            '一手ミスプレイ',
            '瞑想後にリマッチ？ ☁️',
            '君の読みの方が鋭い 📊',
            'Toraはその勝利を尊重',
            'もっと鍛える 😌',
            'よく得たチャンピオン'
          ]
        },
        farewell: {
          humanWon: ['強い心、強い勝利', '集中に敬意 👏', '次の穏やかな戦いまで ☁️'],
          humanLost: ['今日はバランスが味方', 'いいゲーム 😌', 'またすぐ同じ卓？ 🌿']
        }
      }
    },
    ko: {
      bruno: {
        reactions: {
          player_slow: [
            '빨리! 😆',
            '벌써 네 차례! ⏰',
            '기다리는 중... 👀',
            '자, 수 보여줘 🔥',
            '너무 오래 생각해? 😂',
            '가자! ⚡'
          ],
          ai_strong_play: [
            '이건 어때? 🔥',
            '이겨 봐! 😈',
            '강한 패 💪',
            '네 차례 😎'
          ],
          ai_win_round: ['말했잖아 😎', '내 거! 🎉', '너무 쉬워 🔥'],
          ai_lose_round: ['운 좋았네 😤', '좋은 수 😅', '당했어 🤦'],
          ai_win: ['승리! 🎉', '챔피언 😎', 'GG 🔥'],
          ai_lose: ['잘했어 👏', '네가 이겼어 😭', '리매치? 😤'],
          player_strong_play: ['대담한 수 🤔', '흥미롭네... 🧐', '더 보여줘 🔥']
        },
        rival: {
          defeatPlayer: [
            '다음엔 더 잘해 😏',
            '나한텐 너무 쉬워 🔥',
            '더 연습하고 와 💪',
            '그 테이블은 처음부터 내 거',
            '패 더 강해지면 와 😎',
            '이번 판은 거의 안 힘들었어 😏',
            'Big Two 전설? 아직 🔥',
            '내 수 연구하고 다시 와 📚'
          ],
          defeatedByPlayer: [
            '다음엔 안 져 🔥',
            '이번엔 운 좋았네 😤',
            '리매치 — 리매치!',
            '봐줬어... 아마 😏',
            '이번엔 기습당했어',
            '좋아. 2라운드. 지금 💪',
            '그 승리는 두 번 없을 거야 😤',
            'Bruno 이기는 거 익숙해지지 마 🔥'
          ]
        },
        farewell: {
          humanWon: ['이번엔 네가 이겼어 😏', '존경 — 승리는 네 것', '다음 테이블에서 💪'],
          humanLost: ['다음 판 더 잘해 😏', '연습하고 돌아와 🔥', '테이블은 기억해']
        }
      },
      luna: {
        reactions: {
          player_slow: [
            '천천히 해도 돼 😊',
            '준비됐어 ✨',
            '급하지 않아! 💫',
            '아직 같이 있어 🌙',
            '열심히 생각 중? 🤔'
          ],
          ai_strong_play: [
            '마음에 들면 좋겠다 😊',
            '이걸 이길 수 있어? 😏',
            '멋진 콤보 온다! ✨',
            '네 차례, 친구'
          ],
          ai_win_round: ['야! 🎉', '가져갔어 😊', '행운의 달 ✨'],
          ai_lose_round: ['잘했어! 👏', '와 😮', '아깝다 😅'],
          ai_win: ['해냈어! 🎉', '기쁜 승리 😊', '좋은 게임 🌙'],
          ai_lose: ['축하해! 👏', '잘했어 😊', '네가 earned 했어 🎉'],
          player_strong_play: ['흥미로운 수 🤔', '좋은 플레이! 👏', '인상적 😮']
        },
        rival: {
          defeatPlayer: [
            '좋은 게임 — 잘했어 😊',
            '다음 라운드? ✨',
            '어쨌든 재밌었어 🌙',
            '緊張하게 만들었어 👏',
            '아깝다 — 한 번 더?',
            '멋진 매치 ✨',
            '오늘 수가 정말 날카로웠어 😊',
            '내일 같은 시간에 리매치? 🌙'
          ],
          defeatedByPlayer: [
            '와, 정말 대단해 👏',
            '다음엔 더 연습할게 ✨',
            '그 승리 완전히 deserved',
            '이제 너 응원할게 🌙',
            '아름다운 플레이 😊',
            '쉬워 보이게 했네',
            '와 — 비법 알려줘 ✨',
            '오랜만에 최고의 매치 👏'
          ]
        },
        farewell: {
          humanWon: ['재밌었어! 또 보자 ✨', '아름답게 플레이했어 🌙', '내일 같은 시간?'],
          humanLost: ['좋은 게임 — 아슬아슬했어', '어쨌든 재밌었어 🌙', '한 판 더? ✨']
        }
      },
      kiro: {
        reactions: {
          player_slow: [
            '계산 중... 📊',
            '기다리게 하지 마 😜',
            '카드 준비됐어 😎',
            '똑똑... ⏰',
            '아직 계산 중 📊',
            '여보세요? 👀'
          ],
          ai_strong_play: [
            '새 수! 🔥',
            '이거 해봐 😜',
            '날카로운 리드 💪',
            '승부처 🔥'
          ],
          ai_win_round: ['깔끔한 리드 📊', '스위트! 🎉', '잡았다 😎'],
          ai_lose_round: ['앗 😅', '계산 실수 😱', '아프네'],
          ai_win: ['Kiro 승리! 🎉', '계산된 승리 😎', '데이터가 이긴다 🔥'],
          ai_lose: ['네가 더 잘했어 😭', '날카로운 패배', 'GG 😅'],
          player_strong_play: ['매운 수 🌶️', '맛있는 플레이 😋', '와 😮']
        },
        rival: {
          defeatPlayer: [
            '계산된 승리 — 깔끔 📊',
            '이번 판 확률은 내 편',
            '승부처 클리어 😎',
            '확률상 다음에도 내가 이긴다 📈',
            '그 계획 완벽히 작동',
            '데이터는 거짓말 안 해 — Kiro 승 📊',
            '또 깔끔한 리드 😎',
            '잘 earned 한 승리'
          ],
          defeatedByPlayer: [
            '전략 패치 필요 🤓',
            '잘했어 — 널 과소평가했어',
            '다음 매치 playbook 업데이트 🔥',
            '네 리드가 더 날카로웠어 📊',
            '한 수 계산 실수 — 인상적',
            '리매치 시뮬레이션 중 🤓',
            '그 패배는 학습 로그에 📚',
            '이번 판 내 game plan 뚫렸어 🔥'
          ]
        },
        farewell: {
          humanWon: ['그 패배는 학습 로그에 📚', '잘했어 — playbook 업데이트 중', '이번 판 날카로운 리드 🤓'],
          humanLost: ['오늘 확률은 내 편 📊', '승부처 클리어', '데이터 더 모으고 리매치? 📈']
        }
      },
      pico: {
        reactions: {
          player_slow: [
            '고고고! ⚡',
            '날개 준비됐어 ⚡',
            '너무 느려! 😤',
            '줌줌 — 네 차례 ⏰',
            '여기서 통통 튀고 있어',
            '빨리 빨리! 🔥'
          ],
          ai_strong_play: [
            '스피드 어택! ⚡',
            '빠른 콤보 🔥',
            '이 버스트 이겨 봐',
            '작지만 강해 💪',
            '줌 플레이!'
          ],
          ai_win_round: ['퀵 승리 ⚡', '줌! 🔥', '너무 빨라', '스피드 챔피언 🎉'],
          ai_lose_round: ['당했어 😤', '럭키 버스트 😅', '와 😮', '강해! 👏'],
          ai_win: ['Pico 승리! ⚡', '스피드 챔피언 🎉', '가장 빠른 손 🔥'],
          ai_lose: ['네가 이겼어 😭', '좋은 스피드 👏', '리매치!'],
          player_strong_play: ['큰 에너지 🔥', '와 😮', '빠른 손 👏', '강한 플레이 💪']
        },
        rival: {
          defeatPlayer: [
            '너한텐 너무 빨라 ⚡',
            '줌줌 승리 🔥',
            '반사신경 키워 💪',
            '또 스피드 챔피언 🎉',
            '그 테이블은 내 거',
            '더 빨리 돌아와 😏',
            'Pico 또 승리 ⚡',
            '깜빡하면 놓친다 🔥'
          ],
          defeatedByPlayer: [
            '네가 내 수보다 빨랐어 😤',
            '좋아 — 지금 리매치',
            '그 승리는 빨랐어 🔥',
            '한 박자 늦었어 ⚡',
            '컴백에 존경 👏',
            '다음 판 계획 짜겠어',
            '오늘 내 스피드 잘랐네 😭',
            '알았어 — 네 승리 💪'
          ]
        },
        farewell: {
          humanWon: ['빠른 승리 — 존경 ⚡', '완벽한 플레이 👏', '풀 스피드 리매치 🔥'],
          humanLost: ['Pico는 승리와 함께 줌', '스피드 또 승리 🔥', '다시 레이스? ⚡']
        }
      },
      bao: {
        reactions: {
          player_slow: [
            '아직 찌는 중... 🥟',
            '휘저어... 아직 생각? 😜',
            '따뜻해지는 중 ☕',
            '여보세요? 👀',
            '결정하는 동안 한 모금 😏',
            'Bao 인내 한계 😂'
          ],
          ai_strong_play: [
            '쫄깃한 콤보! 🥟',
            '이 수 빨아봐 😎',
            '버블 파워 💥',
            'Bao 이겨 봐 🔥',
            '신선 서브 곧 나옵니다 ✨'
          ],
          ai_win_round: ['소프트 승리 🥟', '쫄깃! 😎', '버블 버스트 🎉', '맛있는 트릭 ✨'],
          ai_lose_round: ['터졌어 😅', '매운 카운터 🌶️', '와 😮', '페어 플레이 👏'],
          ai_win: ['Bao 승리! 🥟', '만 plate 승리 😎', '건배 🔥'],
          ai_lose: ['내 승리 먹혔어 😭', '잘했어', '리매치? 😤'],
          player_strong_play: ['매운 패 🌶️', '큰 에너지 🔥', '꽂혔어 👏', '버블 트러블 😮']
        },
        rival: {
          defeatPlayer: [
            '원샷 — 내 승리 🥟',
            '쫄깃한 승리 랩 😎',
            '그 라운드는 특별한 맛 ✨',
            '더 강한 차 들고 와 🔥',
            'Bao는 항상 돌아와',
            '그 패배 한 모금 😏',
            '또 챔피언 🎉',
            '테이크아웃 리매치 🥟'
          ],
          defeatedByPlayer: [
            '전략 쏟았네 😭',
            '그 수는 특별히 달콤 👏',
            '리필 리매치 필요',
            '이번엔 콤보 뚫었어 🔥',
            '알았어 주인공 😤',
            '버블 버스트... 존경 ✨',
            '다음엔 더 bold 😎',
            '쫄깃한 패배는 쓰 🥟'
          ]
        },
        farewell: {
          humanWon: ['마지막 한 입은 네 거 🥟', '달콤한 승리 — 존경 👏', '다음에 같은 테이블? ✨'],
          humanLost: ['만 plate 승리 🥟', '재밌는 매치 😎', '집 리매치? 🔥']
        }
      },
      tora: {
        reactions: {
          player_slow: [
            '선 모드...',
            '급하지 않아 ☁️',
            '천천히 🌿',
            '여전히 차분하고 준비됨',
            '평화롭게 기다려 😌',
            '느림이 곧 매끄러움'
          ],
          ai_strong_play: [
            '계산된 수',
            '균형 잡힌 동작 ☁️',
            '이 리드 해봐 📊',
            '안정된 손',
            '네 차례 😌'
          ],
          ai_win_round: ['깔끔한 트릭', '균형 승리 ☁️', '스무스 😌', '계획대로 📊'],
          ai_lose_round: ['날카로운 플레이 👏', '좋은 리드 😮', '존경', '잘했어 🌿'],
          ai_win: ['Tora 승리', '차분한 챔피언 ☁️', '평화와 승리'],
          ai_lose: ['잘했어 👏', '네가 earned', '좋은 게임 😌'],
          player_strong_play: ['강한 리드 🤔', '흥미로운 라인 👏', '대담하지만 똑똑 📊', '좋은 템포']
        },
        rival: {
          defeatPlayer: [
            'Tora의 차분한 승리',
            '테이블에 균형이 필요 ☁️',
            '트릭 흐름을 공부해 📊',
            '인내가 보상 🌿',
            '마음 가다듬고 와 😌',
            '스무스 피니시',
            '그 리드는 깔끔 📊',
            '선 승리 ☁️'
          ],
          defeatedByPlayer: [
            '내 평온을 깼어 😤',
            '인상적인 집중 👏',
            '한 수 실수',
            '명상 후 리매치? ☁️',
            '네 리드가 더 날카로웠어 📊',
            'Tora는 그 승리를 존경',
            '더 연습할게 😌',
            'well earned 챔피언'
          ]
        },
        farewell: {
          humanWon: ['강한 마음, 강한 승리', '집중에 존경 👏', '다음 차분한 전투까지 ☁️'],
          humanLost: ['오늘 균형은 내 편', '좋은 게임 😌', '곧 같은 테이블? 🌿']
        }
      }
    }
  };

  const lineBags = new Map();

  function normalizeLocale(locale) {
    const value = String(locale || '').toLowerCase();
    return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
  }

  function getLocale() {
    return normalizeLocale(window.Big2GoI18n?.getLocale?.());
  }

  function replaceVars(text, vars = {}) {
    let result = String(text ?? '');
    Object.entries(vars).forEach(([name, value]) => {
      result = result.replaceAll(`{${name}}`, String(value ?? ''));
    });
    return result;
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getPool(characterId, category, subcategory) {
    const locale = getLocale();
    if (locale === DEFAULT_LOCALE) {
      const character = window.Big2GoAICharacters?.getById?.(characterId);
      return character?.[category]?.[subcategory] || null;
    }
    return TRANSLATIONS[locale]?.[characterId]?.[category]?.[subcategory] || null;
  }

  function getGenericPool(event) {
    const locale = getLocale();
    const table = GENERIC_LINES[locale] || GENERIC_LINES.en;
    return table?.[event] || GENERIC_LINES.en[event] || null;
  }

  function pickLine(lines, bagKey) {
    if (!Array.isArray(lines) || !lines.length) return '';

    let bag = lineBags.get(bagKey);
    if (!bag || !bag.remaining.length) {
      let pool = [...lines];
      if (bag?.last && pool.length > 1) {
        pool = pool.filter(line => line !== bag.last);
      }
      bag = { remaining: shuffle(pool), last: bag?.last ?? null };
      lineBags.set(bagKey, bag);
    }

    const pick = bag.remaining.shift();
    bag.last = pick;
    return pick || lines[0];
  }

  function pickCharacterLine(characterId, category, subcategory, bagKey) {
    const lines = getPool(characterId, category, subcategory);
    if (!lines?.length) return '';
    const key = bagKey || `${characterId}:${category}:${subcategory}`;
    return pickLine(lines, key);
  }

  function pickGenericLine(event, bagKey) {
    const lines = getGenericPool(event);
    if (!lines?.length) return '';
    const key = bagKey || `generic:${event}`;
    return pickLine(lines, key);
  }

  function getVictoryMeta(character, playerWon) {
    const locale = getLocale();
    const name = character?.name || 'AI';
    const table = GAME_LINES[locale] || GAME_LINES.en;
    const en = GAME_LINES.en;
    return {
      title: replaceVars(playerWon
        ? (table['victory.youDefeated'] || en['victory.youDefeated'])
        : (table['victory.defeatedYou'] || en['victory.defeatedYou']), { name }),
      speakerLabel: replaceVars(table['victory.speaker'] || en['victory.speaker'], { name }),
      rematchLabel: table['victory.rematch'] || en['victory.rematch']
    };
  }

  function getOracleLine(playKind) {
    const locale = getLocale();
    const pools = ORACLE[locale] || ORACLE.en;
    const deck = pools[playKind] || pools.single;
    return deck[Math.floor(Math.random() * deck.length)];
  }

  function getGameLine(key, vars = {}) {
    const locale = getLocale();
    const table = GAME_LINES[locale] || GAME_LINES.en;
    const fallback = GAME_LINES.en[key] || key;
    return replaceVars(table[key] ?? fallback, vars);
  }

  function clearBags() {
    lineBags.clear();
  }

  window.Big2GoAIDialogue = {
    getLocale,
    getPool,
    getGenericPool,
    pickLine,
    pickCharacterLine,
    pickGenericLine,
    getVictoryMeta,
    getOracleLine,
    getGameLine,
    clearBags,
    GENERIC_LINES,
    ORACLE,
    GAME_LINES,
    TRANSLATIONS
  };
})();
