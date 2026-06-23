// ── app.js ──

// ─── Data ───────────────────────────────────────────
let DATA = { nouns: [], iAdj: [], naAdj: [] };
let STATE = {
  tab: 'noun',          // current main tab
  subTab: 'quiz',       // quiz | table
  wordType: 'noun',
  selectedWord: null,
  currentQ: null,
  answered: false,
  sessionCorrect: 0,
  sessionTotal: 0,
};

// ─── Boot ─────────────────────────────────────────────
async function boot() {
  const fetchJson = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  }).catch(e => { console.warn(e); return []; });

  const [nouns, iAdj, naAdj] = await Promise.all([
    fetchJson('data/nouns.json'),
    fetchJson('data/i-adjectives.json'),
    fetchJson('data/na-adjectives.json'),
  ]);
  DATA.nouns = nouns;
  DATA.iAdj = iAdj;
  DATA.naAdj = naAdj;

  Store.updateStreak();
  renderHeader();
  renderNav();
  switchTab('noun');
}

// ─── Header ───────────────────────────────────────────
function renderHeader() {
  document.getElementById('streak-badge').textContent =
    `🔥 ${Store.getStreak()}일 연속`;
}

// ─── Bottom Nav ───────────────────────────────────────
const TABS = [
  { id: 'noun',  icon: '名', label: '명사' },
  { id: 'iadj',  icon: 'い', label: 'い형용사' },
  { id: 'naadj', icon: 'な', label: 'な형용사' },
  { id: 'wrong', icon: '✗',  label: '오답노트' },
];

function renderNav() {
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = TABS.map(t => `
    <button class="nav-btn ${STATE.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
      <span class="icon">${t.icon}</span>
      <span>${t.label}</span>
    </button>
  `).join('');
  nav.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
}

function switchTab(id) {
  STATE.tab = id;
  STATE.subTab = 'quiz';
  STATE.selectedWord = null;
  STATE.currentQ = null;
  STATE.answered = false;
  renderNav();

  if (id === 'noun')  renderWordTab('noun',  DATA.nouns,  Conj.noun);
  if (id === 'iadj')  renderWordTab('iadj',  DATA.iAdj,   Conj.iAdj);
  if (id === 'naadj') renderWordTab('naadj', DATA.naAdj,  Conj.naAdj);
  if (id === 'wrong') renderWrongTab();
}

// ─── Generic word tab (noun / i-adj / na-adj) ──────────
function renderWordTab(type, words, conjFn) {
  const content = document.getElementById('content');
  const label = type === 'noun' ? '명사' : type === 'iadj' ? 'い형용사' : 'な형용사';

  content.innerHTML = `
    <p class="section-title">${label} 선택</p>
    <div class="sub-tabs">
      <button class="sub-tab ${STATE.subTab === 'quiz' ? 'active' : ''}" data-sub="quiz">퀴즈</button>
      <button class="sub-tab ${STATE.subTab === 'table' ? 'active' : ''}" data-sub="table">활용표</button>
    </div>
    <div class="word-grid" id="word-grid"></div>
    <div id="quiz-zone"></div>
  `;

  // sub-tabs
  content.querySelectorAll('.sub-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      STATE.subTab = btn.dataset.sub;
      content.querySelectorAll('.sub-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderWordZone(type, words, conjFn);
    })
  );

  // word grid
  const grid = content.querySelector('#word-grid');
  words.forEach(w => {
    const chip = document.createElement('button');
    chip.className = `word-chip ${STATE.selectedWord?.id === w.id ? 'selected' : ''}`;
    chip.innerHTML = `
      <span class="jp">${w.word}</span>
      ${w.reading ? `<span class="reading">${w.reading}</span>` : ''}
      <span class="kr">${w.meaning}</span>
    `;
    chip.addEventListener('click', () => {
      STATE.selectedWord = w;
      STATE.answered = false;
      STATE.currentQ = null;
      grid.querySelectorAll('.word-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      renderWordZone(type, words, conjFn);
    });
    grid.appendChild(chip);
  });

  renderWordZone(type, words, conjFn);
}

function renderWordZone(type, words, conjFn) {
  const zone = document.getElementById('quiz-zone');
  if (!STATE.selectedWord) {
    zone.innerHTML = `
      <div class="empty-state">
        <div class="big">👆</div>
        <p>위에서 단어를 선택하면<br>퀴즈 또는 활용표가 표시됩니다</p>
      </div>`;
    return;
  }

  if (STATE.subTab === 'table') {
    renderConjTable(conjFn, STATE.selectedWord, zone);
  } else {
    renderQuizZone(type, words, conjFn, zone);
  }
}

// ─── Conjugation Table ────────────────────────────────
function renderConjTable(conjFn, wordObj, container) {
  const forms = conjFn(wordObj.word);
  const rows = forms.map(f => `
    <tr>
      <td>${f.label}</td>
      <td class="${f.style === 'polite' ? 'conj-polite' : 'conj-plain'}">${f.form}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table class="conj-table">
      <thead><tr><th>형태</th><th>${wordObj.word} ${wordObj.reading ? `(${wordObj.reading})` : ''}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="height:20px"></div>
  `;
}

// ─── Quiz Zone ────────────────────────────────────────
function renderQuizZone(type, words, conjFn, container) {
  // Pick question type randomly: 60% form, 20% meaning, 20% word
  const r = Math.random();
  const qType = r < 0.6 ? 'form' : r < 0.8 ? 'meaning' : 'word';
  const q = Conj.makeQuestion(qType, STATE.selectedWord, words, conjFn);
  STATE.currentQ = q;
  STATE.answered = false;

  const today = Store.getTodayStats();

  container.innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val">${today.total}</div>
        <div class="stat-label">오늘 문제 수</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${today.total > 0 ? Math.round(today.correct/today.total*100) : 0}%</div>
        <div class="stat-label">정답률</div>
      </div>
    </div>
    <div class="quiz-area">
      ${buildPromptHTML(q)}
      <div class="options-grid" id="options"></div>
      <div class="feedback" id="feedback"></div>
      <button class="btn-primary" id="next-btn" style="display:none">다음 문제 →</button>
      <button class="btn-secondary" id="skip-btn">다른 문제</button>
    </div>
  `;

  // render options
  const optGrid = container.querySelector('#options');
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, q, type, words, conjFn));
    optGrid.appendChild(btn);
  });

  container.querySelector('#next-btn').addEventListener('click', () => {
    renderQuizZone(type, words, conjFn, container);
  });
  container.querySelector('#skip-btn').addEventListener('click', () => {
    renderQuizZone(type, words, conjFn, container);
  });
}

function buildPromptHTML(q) {
  if (q.promptType === 'form') {
    return `
      <div class="quiz-prompt">
        <div class="prompt-label">활용형을 고르세요</div>
        <div class="prompt-word">${q.word}</div>
        ${q.reading ? `<div class="prompt-reading">${q.reading}</div>` : ''}
        <div class="prompt-target">${q.promptLabel}</div>
      </div>`;
  }
  if (q.promptType === 'meaning') {
    return `
      <div class="quiz-prompt">
        <div class="prompt-label">뜻을 고르세요</div>
        <div class="prompt-word">${q.word}</div>
        ${q.reading ? `<div class="prompt-reading">${q.reading}</div>` : ''}
      </div>`;
  }
  // word type
  return `
    <div class="quiz-prompt">
      <div class="prompt-label">일본어를 고르세요</div>
      <div class="prompt-meaning">${q.word}</div>
    </div>`;
}

function handleAnswer(chosen, q, type, words, conjFn) {
  if (STATE.answered) return;
  STATE.answered = true;

  const isCorrect = chosen === q.answer;
  Store.recordAnswer(q.id, isCorrect);

  // color options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add('correct');
    else if (btn.textContent === chosen && !isCorrect) btn.classList.add('wrong');
  });

  // feedback
  const fb = document.getElementById('feedback');
  fb.classList.add('show');
  if (isCorrect) {
    fb.classList.add('correct-fb');
    fb.innerHTML = `<span>✓</span> 정답!`;
  } else {
    fb.classList.add('wrong-fb');
    fb.innerHTML = `<span>✗</span> 오답. 정답: <span class="fb-answer">${q.answer}</span>`;
  }

  document.getElementById('next-btn').style.display = 'block';
  document.getElementById('skip-btn').style.display = 'none';

  // refresh stats
  const today = Store.getTodayStats();
  const statCards = document.querySelectorAll('.stat-card');
  if (statCards[0]) statCards[0].querySelector('.stat-val').textContent = today.total;
  if (statCards[1]) statCards[1].querySelector('.stat-val').textContent =
    today.total > 0 ? Math.round(today.correct/today.total*100) + '%' : '0%';
}

// ─── Wrong Items Tab ──────────────────────────────────
function renderWrongTab() {
  const content = document.getElementById('content');
  const wrongItems = Store.getWrongItems();
  const entries = Object.entries(wrongItems)
    .sort(([,a],[,b]) => b.wrongCount - a.wrongCount);

  if (entries.length === 0) {
    content.innerHTML = `
      <p class="section-title">오답노트</p>
      <div class="empty-state">
        <div class="big">🎉</div>
        <p>아직 틀린 문제가 없습니다.<br>퀴즈를 풀면 여기에 기록됩니다.</p>
      </div>`;
    return;
  }

  // Build list with word lookups
  const allWords = [...DATA.nouns, ...DATA.iAdj, ...DATA.naAdj];
  const rows = entries.map(([id, info]) => {
    const word = allWords.find(w => id.startsWith(w.id));
    if (!word) return '';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:12px;background:var(--surface);border:1px solid var(--border);
                  border-radius:var(--radius-sm);margin-bottom:8px;">
        <div>
          <div style="font-family:'Noto Sans JP',sans-serif;font-size:16px">${word.word}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${word.meaning}</div>
          <div style="font-size:11px;color:var(--text-dimmer);margin-top:2px">마지막 오답: ${info.lastWrong}</div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--wrong);font-size:18px;font-weight:700">${info.wrongCount}</div>
          <div style="font-size:11px;color:var(--text-dimmer)">오답 횟수</div>
        </div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <p class="section-title">오답노트 (${entries.length}개)</p>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val">${entries.length}</div>
        <div class="stat-label">틀린 단어</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${entries.reduce((s,[,v])=>s+v.wrongCount,0)}</div>
        <div class="stat-label">총 오답 수</div>
      </div>
    </div>
    ${rows}
  `;
}

// ─── Start ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
