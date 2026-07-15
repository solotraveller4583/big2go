/* Big2Go — localized play demo scenes (loads after i18n.js) */

(function () {
  'use strict';

  const DEMO_SCENES = {
    en: [
      { title: 'Welcome to Big2Go', stageTitle: 'Fast mobile Big Two', caption: 'This demo walks you through one full round so you know what to tap.' },
      { title: 'Step 1: Pick your table', stageTitle: 'Choose match mode', caption: 'Then tap the gold PLAY NOW button to start.', modes: ['4P Classic', '3P Fast', '2P Duel'] },
      { title: 'Step 2: Cards are dealt', stageTitle: 'Find 3♦', caption: 'Your opening play must include 3♦ on the first trick.' },
      { title: 'Step 3: Lead the first trick', stageTitle: 'Open with a valid hand', caption: 'Higher rank wins. Suit order: ♦ ♣ ♥ ♠. 2 is the strongest rank.', playBtn: 'Play' },
      { title: 'Step 4: Beat the current trick', stageTitle: 'Play higher than the table', caption: 'This pair of 5s beats the pair of 4s.' },
      { title: 'Step 5: Pass when you cannot beat', stageTitle: 'No good play? Pass.', caption: 'Passing is normal. Wait for a fresh trick you can attack.', passBtn: 'Pass' },
      { title: 'Step 6: Five-card power plays', stageTitle: 'Five-card combos', caption: 'A straight flush is one of the strongest five-card hands.' },
      { title: 'Step 7: Win the match', stageTitle: 'Clear your hand first', caption: 'Ready to try it? Tap PLAY NOW and use Hint if you get stuck.', winBadge: 'YOU WIN!' }
    ],
    th: [
      { title: 'ยินดีต้อนรับสู่ Big2Go', stageTitle: 'ไพ่ Big 2 บนมือถือ', caption: 'สาธิตนี้พาคุณดูหนึ่งรอบเต็ม เพื่อรู้ว่าต้องแตะตรงไหน' },
      { title: 'ขั้นที่ 1: เลือกโต๊ะ', stageTitle: 'เลือกโหมดแมตช์', caption: 'จากนั้นแตะปุ่ม PLAY NOW สีทองเพื่อเริ่ม', modes: ['คลาสสิก 4 คน', 'เร็ว 3 คน', 'ดวล 2 คน'] },
      { title: 'ขั้นที่ 2: แจกไพ่', stageTitle: 'หา 3♦', caption: 'ไม้เปิดต้องมี 3♦ ในไม้แรก' },
      { title: 'ขั้นที่ 3: นำไม้แรก', stageTitle: 'เปิดด้วยมือที่ถูกต้อง', caption: 'แต้มสูงกว่าชนะ ลำดับดอก: ♦ ♣ ♥ ♠ และ 2 สูงสุด', playBtn: 'เล่น' },
      { title: 'ขั้นที่ 4: ชนะไม้บนโต๊ะ', stageTitle: 'เล่นให้สูงกว่าโต๊ะ', caption: 'คู่ 5 ชนะคู่ 4' },
      { title: 'ขั้นที่ 5: ผ่านเมื่อชนะไม่ได้', stageTitle: 'ไม่มีมือดี? ผ่าน', caption: 'การผ่านเป็นเรื่องปกติ รอไม้ใหม่ที่คุณจู่โจมได้', passBtn: 'ผ่าน' },
      { title: 'ขั้นที่ 6: ไพ่ 5 ใบพลังเต็ม', stageTitle: 'คอมโบ 5 ใบ', caption: 'สเตรทฟลัชเป็นหนึ่งในมือ 5 ใบที่แรงที่สุด' },
      { title: 'ขั้นที่ 7: ชนะแมตช์', stageTitle: 'ทิ้งไพ่หมดก่อน', caption: 'พร้อมลองแล้ว? แตะ PLAY NOW และใช้คำใบ้เมื่อติด', winBadge: 'คุณชนะ!' }
    ],
    zh: [
      { title: '欢迎来到 Big2Go', stageTitle: '快节奏手机 Big Two', caption: '本演示带你走完一整局，了解该点哪里。' },
      { title: '步骤 1：选择牌桌', stageTitle: '选择对战模式', caption: '然后点击金色「立即开始」按钮。', modes: ['经典 4 人', '快速 3 人', '对决 2 人'] },
      { title: '步骤 2：发牌', stageTitle: '找到 3♦', caption: '首墩出牌必须包含 3♦。' },
      { title: '步骤 3：领出首墩', stageTitle: '用合法牌型开局', caption: '点数更大者胜。花色顺序：♦ ♣ ♥ ♠，2 最大。', playBtn: '出牌' },
      { title: '步骤 4：压过当前墩', stageTitle: '出比桌上更大的牌', caption: '这对 5 压过那对 4。' },
      { title: '步骤 5：无法压过时过牌', stageTitle: '没有好牌？过牌。', caption: '过牌很正常，等待可以进攻的新墩。', passBtn: '过牌' },
      { title: '步骤 6：五张强力牌型', stageTitle: '五张组合', caption: '同花顺是最强的五张牌型之一。' },
      { title: '步骤 7：赢得对局', stageTitle: '最先出完手牌', caption: '准备好了吗？点「立即开始」，卡住时用提示。', winBadge: '你赢了！' }
    ],
    ja: [
      { title: 'Big2Goへようこそ', stageTitle: '高速モバイルビッグツー', caption: 'このデモで1ラウンドの流れを確認できます。' },
      { title: 'ステップ1：テーブル選択', stageTitle: 'マッチモードを選ぶ', caption: 'ゴールドの「今すぐプレイ」をタップして開始。', modes: ['クラシック4人', 'ファスト3人', 'デュエル2人'] },
      { title: 'ステップ2：カード配布', stageTitle: '3♦を探す', caption: '最初のトリックでは3♦を含める必要があります。' },
      { title: 'ステップ3：最初のリード', stageTitle: '合法な手で開始', caption: 'ランクが高い方が勝ち。スート順: ♦ ♣ ♥ ♠、2が最強。', playBtn: '出す' },
      { title: 'ステップ4：トリックを上回る', stageTitle: 'テーブルより高く', caption: 'この5のペアは4のペアに勝ちます。' },
      { title: 'ステップ5：上回れない時はパス', stageTitle: '良い手がない？パス', caption: 'パスは普通です。攻められる新しいトリックを待ちましょう。', passBtn: 'パス' },
      { title: 'ステップ6：5枚の強力役', stageTitle: '5枚コンボ', caption: 'ストレートフラッシュは最強クラスの5枚役です。' },
      { title: 'ステップ7：マッチ勝利', stageTitle: '手札を先に出し切る', caption: '試す準備はできましたか？「今すぐプレイ」とヒントを使いましょう。', winBadge: '勝利！' }
    ],
    ko: [
      { title: 'Big2Go에 오신 것을 환영합니다', stageTitle: '빠른 모바일 빅투', caption: '이 데모로 한 판의 흐름과 탭 방법을 익힙니다.' },
      { title: '1단계: 테이블 선택', stageTitle: '매치 모드 선택', caption: '골드 「지금 플레이」 버튼을 눌러 시작하세요.', modes: ['클래식 4인', '빠른 3인', '대결 2인'] },
      { title: '2단계: 카드 딜', stageTitle: '3♦ 찾기', caption: '첫 트릭에서는 3♦를 반드시 포함해야 합니다.' },
      { title: '3단계: 첫 리드', stageTitle: '합법 패로 시작', caption: '랭크가 높을수록 승리. 무늬 순서: ♦ ♣ ♥ ♠, 2가 최고.', playBtn: '내기' },
      { title: '4단계: 현재 트릭 이기기', stageTitle: '테이블보다 높게', caption: '이 5 페어가 4 페어를 이깁니다.' },
      { title: '5단계: 못 이기면 패스', stageTitle: '좋은 패 없음? 패스', caption: '패스는 정상입니다. 공격할 새 트릭을 기다리세요.', passBtn: '패스' },
      { title: '6단계: 5장 파워 패', stageTitle: '5장 조합', caption: '스트레이트 플러시는 가장 강한 5장 패 중 하나입니다.' },
      { title: '7단계: 매치 승리', stageTitle: '패를 먼저 모두 내기', caption: '준비됐나요? 「지금 플레이」와 힌트를 활용하세요.', winBadge: '승리!' }
    ]
  };

  function getLocale() {
    const locale = window.Big2GoI18n?.getLocale?.() || 'en';
    return DEMO_SCENES[locale] ? locale : 'en';
  }

  function buildPlayDemoScenes(buildDemoCard) {
    const scenes = DEMO_SCENES[getLocale()] || DEMO_SCENES.en;
    const c = buildDemoCard;

    return [
      {
        duration: 4200,
        title: scenes[0].title,
        html: `
          <div class="demo-stage demo-stage--intro">
            <div class="demo-brand-mark">B2</div>
            <h3 class="demo-stage-title">${scenes[0].stageTitle}</h3>
            <p class="demo-stage-caption">${scenes[0].caption}</p>
          </div>`
      },
      {
        duration: 4200,
        title: scenes[1].title,
        html: `
          <div class="demo-stage">
            <h3 class="demo-stage-title">${scenes[1].stageTitle}</h3>
            <div class="demo-modes">
              <span class="demo-mode-chip is-active">${scenes[1].modes[0]}</span>
              <span class="demo-mode-chip">${scenes[1].modes[1]}</span>
              <span class="demo-mode-chip">${scenes[1].modes[2]}</span>
            </div>
            <p class="demo-stage-caption">${scenes[1].caption}</p>
          </div>`
      },
      {
        duration: 4600,
        title: scenes[2].title,
        html: `
          <div class="demo-stage demo-stage--cards">
            <h3 class="demo-stage-title">${scenes[2].stageTitle}</h3>
            <div class="demo-hand demo-hand--spread">
              ${c('5', 'H')}
              ${c('9', 'C')}
              ${c('3', 'D', 'demo-card--glow')}
              ${c('J', 'S')}
              ${c('A', 'H')}
            </div>
            <p class="demo-stage-caption">${scenes[2].caption}</p>
          </div>`
      },
      {
        duration: 4600,
        title: scenes[3].title,
        html: `
          <div class="demo-stage demo-stage--cards">
            <h3 class="demo-stage-title">${scenes[3].stageTitle}</h3>
            <div class="demo-table demo-table--large">
              <div class="demo-trick">${c('3', 'D', 'demo-card--play-in')}</div>
            </div>
            <div class="demo-actions"><span class="demo-play-btn">${scenes[3].playBtn}</span></div>
            <p class="demo-stage-caption">${scenes[3].caption}</p>
          </div>`
      },
      {
        duration: 4800,
        title: scenes[4].title,
        html: `
          <div class="demo-stage demo-stage--cards">
            <h3 class="demo-stage-title">${scenes[4].stageTitle}</h3>
            <div class="demo-table demo-table--large">
              <div class="demo-trick demo-trick--dense">
                ${c('4', 'C')}
                ${c('4', 'D')}
                <span class="demo-trick-arrow" aria-hidden="true">→</span>
                ${c('5', 'H', 'demo-card--play-in')}
                ${c('5', 'S', 'demo-card--play-in')}
              </div>
            </div>
            <p class="demo-stage-caption">${scenes[4].caption}</p>
          </div>`
      },
      {
        duration: 4400,
        title: scenes[5].title,
        html: `
          <div class="demo-stage demo-stage--cards">
            <h3 class="demo-stage-title">${scenes[5].stageTitle}</h3>
            <div class="demo-table demo-table--large">
              <div class="demo-trick">
                ${c('K', 'S')}
                ${c('K', 'H')}
              </div>
            </div>
            <div class="demo-actions"><span class="demo-pass-btn">${scenes[5].passBtn}</span></div>
            <p class="demo-stage-caption">${scenes[5].caption}</p>
          </div>`
      },
      {
        duration: 4800,
        title: scenes[6].title,
        html: `
          <div class="demo-stage demo-stage--cards">
            <h3 class="demo-stage-title">${scenes[6].stageTitle}</h3>
            <div class="demo-table demo-table--large">
              <div class="demo-trick demo-trick--dense">
                ${c('7', 'D', 'demo-card--play-in')}
                ${c('8', 'D', 'demo-card--play-in')}
                ${c('9', 'D', 'demo-card--play-in')}
                ${c('10', 'D', 'demo-card--play-in')}
                ${c('J', 'D', 'demo-card--play-in')}
              </div>
            </div>
            <p class="demo-stage-caption">${scenes[6].caption}</p>
          </div>`
      },
      {
        duration: 5000,
        title: scenes[7].title,
        html: `
          <div class="demo-stage">
            <span class="demo-win-badge">${scenes[7].winBadge}</span>
            <h3 class="demo-stage-title">${scenes[7].stageTitle}</h3>
            <p class="demo-stage-caption">${scenes[7].caption}</p>
          </div>`
      }
    ];
  }

  window.Big2GoPlayDemo = {
    buildPlayDemoScenes
  };
})();
