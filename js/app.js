// ── app.js ──

// ─── Data ───────────────────────────────────────────
let DATA = { nouns: [], iAdj: [], naAdj: [], verbs: [] };
let STATE = {
  tab: 'today',
  subTab: 'quiz',
  wordType: 'noun',
  selectedWord: null,
  currentQ: null,
  answered: false,
  sessionCorrect: 0,
  sessionTotal: 0,
  verbSubTab: 'quiz',
  verbGroup: 'all',
  todayQs: null,
  todayDate: null,
  todayIdx: 0,
  todayCorrect: 0,
  todayAnswered: false,
  rulesTab: 'noun',
  rulesVerbForm: 'masu',
  wrongQs: [],
  wrongIdx: 0,
  wrongAnswered: false,
};

// ─── Boot ─────────────────────────────────────────────
async function boot() {
  const fetchJson = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  }).catch(e => { console.warn(e); return []; });

  const [nouns, iAdj, naAdj, verbs] = await Promise.all([
    fetchJson('data/nouns.json'),
    fetchJson('data/i-adjectives.json'),
    fetchJson('data/na-adjectives.json'),
    fetchJson('data/verbs.json'),
  ]);
  DATA.nouns = nouns;
  DATA.iAdj = iAdj;
  DATA.naAdj = naAdj;
  DATA.verbs = verbs;

  Store.updateStreak();
  renderHeader();
  renderNav();
  switchTab('today');
}

// ─── Header ───────────────────────────────────────────
function renderHeader() {
  document.getElementById('streak-badge').textContent =
    `🔥 ${Store.getStreak()}일 연속`;
}

// ─── Bottom Nav ───────────────────────────────────────
const TABS = [
  { id: 'today', icon: '今', label: '오늘' },
  { id: 'noun',  icon: '名', label: '명사' },
  { id: 'iadj',  icon: 'い', label: 'い형용사' },
  { id: 'naadj', icon: 'な', label: 'な형용사' },
  { id: 'verb',  icon: '動', label: '동사' },
  { id: 'wrong', icon: '✗',  label: '오답노트' },
  { id: 'rules', icon: '📋', label: '규칙' },
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
  STATE.verbSubTab = 'quiz';
  STATE.verbGroup = 'all';
  STATE.selectedWord = null;
  STATE.currentQ = null;
  STATE.answered = false;
  STATE.wrongQs = [];
  STATE.wrongIdx = 0;
  STATE.wrongAnswered = false;
  renderNav();

  if (id === 'today') renderTodayTab();
  if (id === 'noun')  renderWordTab('noun',  DATA.nouns,  Conj.noun);
  if (id === 'iadj')  renderWordTab('iadj',  DATA.iAdj,   Conj.iAdj);
  if (id === 'naadj') renderWordTab('naadj', DATA.naAdj,  Conj.naAdj);
  if (id === 'verb')  renderVerbTab();
  if (id === 'wrong') renderWrongTab();
  if (id === 'rules') renderRulesTab();
}

// ─── Today's 20 Questions ─────────────────────────────
function generateTodayQuestions() {
  const shuffle = arr => {
    const a = [...arr]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
  };

  const qs = [];

  // 명사 4문제
  shuffle(DATA.nouns).slice(0, 4).forEach(w => {
    const types = ['form', 'meaning', 'word'];
    const t = types[Math.floor(Math.random() * types.length)];
    const q = Conj.makeQuestion(t, w, DATA.nouns, Conj.noun);
    if (q) qs.push({ ...q, category: '명사' });
  });

  // 형용사 4문제 (い+な 합쳐서)
  const adjPool = [...DATA.iAdj, ...DATA.naAdj];
  shuffle(adjPool).slice(0, 4).forEach(w => {
    const isI = DATA.iAdj.some(a => a.id === w.id);
    const conjFn = isI ? Conj.iAdj : Conj.naAdj;
    const allAdj = isI ? DATA.iAdj : DATA.naAdj;
    const types = ['form', 'meaning', 'word'];
    const t = types[Math.floor(Math.random() * types.length)];
    const q = Conj.makeQuestion(t, w, allAdj, conjFn);
    if (q) qs.push({ ...q, category: isI ? 'い형용사' : 'な형용사' });
  });

  // 동사 12문제
  shuffle(DATA.verbs).slice(0, 12).forEach(v => {
    const q = VerbConj.makeFormQuestion(v, DATA.verbs);
    if (q) qs.push({ ...q, category: '동사' });
  });

  return shuffle(qs);
}

function renderTodayTab() {
  const content = document.getElementById('content');

  // 오늘 날짜 기반으로 문제 생성 (하루에 한 번 고정)
  const today = new Date().toISOString().split('T')[0];
  if (!STATE.todayQs || STATE.todayDate !== today) {
    STATE.todayQs = generateTodayQuestions();
    STATE.todayDate = today;
    STATE.todayIdx = 0;
    STATE.todayCorrect = 0;
    STATE.todayAnswered = false;
  }

  const { todayQs, todayIdx } = STATE;
  const total = todayQs.length;

  // 완료 화면
  if (todayIdx >= total) {
    const pct = Math.round(STATE.todayCorrect / total * 100);
    content.innerHTML = `
      <p class="section-title">오늘의 20문제</p>
      <div class="quiz-prompt" style="margin-bottom:16px;text-align:center;padding:32px 20px">
        <div style="font-size:48px;margin-bottom:12px">${pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div>
        <div style="font-size:28px;font-weight:700;color:var(--accent)">${pct}%</div>
        <div style="color:var(--text-dim);margin-top:6px">${total}문제 중 ${STATE.todayCorrect}개 정답</div>
      </div>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-val">${STATE.todayCorrect}</div><div class="stat-label">정답</div></div>
        <div class="stat-card"><div class="stat-val">${total - STATE.todayCorrect}</div><div class="stat-label">오답</div></div>
        <div class="stat-card"><div class="stat-val">${pct}%</div><div class="stat-label">정답률</div></div>
      </div>
      <button class="btn-secondary" id="retry-btn">다시 풀기</button>
    `;
    content.querySelector('#retry-btn').addEventListener('click', () => {
      STATE.todayQs = generateTodayQuestions();
      STATE.todayIdx = 0;
      STATE.todayCorrect = 0;
      STATE.todayAnswered = false;
      renderTodayTab();
    });
    return;
  }

  const q = todayQs[todayIdx];
  const progress = Math.round((todayIdx / total) * 100);

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <p class="section-title" style="margin:0">오늘의 20문제</p>
      <span style="font-size:13px;color:var(--text-dim)">${todayIdx + 1} / ${total}</span>
    </div>
    <div class="progress-wrap"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div style="margin-bottom:12px">
      <span style="font-size:11px;background:var(--accent-soft);color:var(--accent);
                   border-radius:4px;padding:2px 8px;border:1px solid var(--accent)">${q.category}</span>
    </div>
    <div class="quiz-area">
      ${buildTodayPromptHTML(q)}
      <div class="options-grid" id="options"></div>
      <div class="feedback" id="feedback"></div>
      <button class="btn-primary" id="next-btn" style="display:none">
        ${todayIdx + 1 >= total ? '결과 보기 →' : '다음 문제 →'}
      </button>
    </div>
  `;

  STATE.todayAnswered = false;
  const optGrid = content.querySelector('#options');
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleTodayAnswer(opt, q));
    optGrid.appendChild(btn);
  });

  content.querySelector('#next-btn').addEventListener('click', () => {
    STATE.todayIdx++;
    STATE.todayAnswered = false;
    renderTodayTab();
  });
}

function buildTodayPromptHTML(q) {
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
  if (q.promptType === 'group') {
    return `
      <div class="quiz-prompt">
        <div class="prompt-label">그룹을 고르세요</div>
        <div class="prompt-word">${q.word}</div>
        <div class="prompt-reading">${q.reading}</div>
      </div>`;
  }
  return `
    <div class="quiz-prompt">
      <div class="prompt-label">일본어를 고르세요</div>
      <div class="prompt-meaning">${q.word}</div>
    </div>`;
}

function handleTodayAnswer(chosen, q) {
  if (STATE.todayAnswered) return;
  STATE.todayAnswered = true;

  const isCorrect = chosen === q.answer;
  if (isCorrect) STATE.todayCorrect++;
  Store.recordAnswer(q.id, isCorrect, q.category, { word: q.word, meaning: q.meaning, reading: q.reading });

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add('correct');
    else if (btn.textContent === chosen && !isCorrect) btn.classList.add('wrong');
  });

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
  const cat = type === 'noun' ? 'noun' : type === 'iadj' ? 'iadj' : 'naadj';
  Store.recordAnswer(q.id, isCorrect, cat, { word: q.word, meaning: q.meaning || q.answer, reading: q.reading });

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

// ─── Verb Tab ─────────────────────────────────────────
function renderVerbTab() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <p class="section-title">동사 선택</p>
    <div class="sub-tabs" id="verb-sub-tabs">
      <button class="sub-tab active" data-vsub="quiz">퀴즈</button>
      <button class="sub-tab" data-vsub="table">활용표</button>
    </div>
    <div class="sub-tabs" id="verb-group-tabs">
      <button class="sub-tab active" data-group="all">전체</button>
      <button class="sub-tab" data-group="1">1그룹</button>
      <button class="sub-tab" data-group="2">2그룹</button>
      <button class="sub-tab" data-group="3">3그룹</button>
    </div>
    <div class="word-grid" id="verb-grid"></div>
    <div id="verb-zone"></div>
  `;

  STATE.verbSubTab = 'quiz';
  STATE.verbGroup = 'all';

  content.querySelectorAll('#verb-sub-tabs .sub-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      STATE.verbSubTab = btn.dataset.vsub;
      content.querySelectorAll('#verb-sub-tabs .sub-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderVerbZone();
    })
  );

  content.querySelectorAll('#verb-group-tabs .sub-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      STATE.verbGroup = btn.dataset.group;
      content.querySelectorAll('#verb-group-tabs .sub-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderVerbGrid();
      STATE.selectedWord = null;
      renderVerbZone();
    })
  );

  renderVerbGrid();
  renderVerbZone();
}

function renderVerbGrid() {
  const grid = document.getElementById('verb-grid');
  if (!grid) return;
  const filtered = STATE.verbGroup === 'all'
    ? DATA.verbs
    : DATA.verbs.filter(v => String(v.group) === STATE.verbGroup);

  grid.innerHTML = '';
  filtered.forEach(v => {
    const chip = document.createElement('button');
    chip.className = `word-chip ${STATE.selectedWord?.id === v.id ? 'selected' : ''}`;
    chip.innerHTML = `
      <span class="jp">${v.word}</span>
      <span class="reading">${v.reading}</span>
      <span class="kr">${v.meaning}</span>
      <span class="reading" style="color:var(--accent);margin-top:2px">${v.group}그룹</span>
    `;
    chip.addEventListener('click', () => {
      STATE.selectedWord = v;
      STATE.answered = false;
      STATE.currentQ = null;
      grid.querySelectorAll('.word-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      renderVerbZone();
    });
    grid.appendChild(chip);
  });
}

function renderVerbZone() {
  const zone = document.getElementById('verb-zone');
  if (!zone) return;
  if (!STATE.selectedWord) {
    zone.innerHTML = `
      <div class="empty-state">
        <div class="big">👆</div>
        <p>위에서 동사를 선택하세요</p>
      </div>`;
    return;
  }
  if (STATE.verbSubTab === 'table') {
    renderVerbTable(STATE.selectedWord, zone);
  } else {
    renderVerbQuiz(zone);
  }
}

function renderVerbTable(verbObj, container) {
  const forms = VerbConj.conjugate(verbObj);
  const groupLabel = ['', '1그룹 (五段)', '2그룹 (一段)', '3그룹 (불규칙)'][verbObj.group];
  const rows = forms.map(f => `
    <tr>
      <td>${f.label}</td>
      <td style="font-family:'Noto Sans JP',sans-serif;font-size:15px">${f.form}</td>
    </tr>
  `).join('');
  container.innerHTML = `
    <div style="margin-bottom:12px;padding:10px 12px;background:var(--accent-soft);
                border:1px solid var(--accent);border-radius:var(--radius-sm);
                font-size:13px;color:var(--accent)">${groupLabel}</div>
    <table class="conj-table">
      <thead><tr><th>형태</th><th>${verbObj.word}（${verbObj.reading}）</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="height:20px"></div>
  `;
}

function renderVerbQuiz(container) {
  const verbObj = STATE.selectedWord;
  const filtered = STATE.verbGroup === 'all'
    ? DATA.verbs
    : DATA.verbs.filter(v => String(v.group) === STATE.verbGroup);

  const q = VerbConj.makeQuestion(verbObj, DATA.verbs);
  if (!q) { container.innerHTML = '<div class="empty-state"><p>문제를 생성할 수 없습니다</p></div>'; return; }
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
      ${buildVerbPromptHTML(q)}
      <div class="options-grid" id="options"></div>
      <div class="feedback" id="feedback"></div>
      <button class="btn-primary" id="next-btn" style="display:none">다음 문제 →</button>
      <button class="btn-secondary" id="skip-btn">다른 문제</button>
    </div>
  `;

  const optGrid = container.querySelector('#options');
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleVerbAnswer(opt, q));
    optGrid.appendChild(btn);
  });

  container.querySelector('#next-btn').addEventListener('click', () => renderVerbQuiz(container));
  container.querySelector('#skip-btn').addEventListener('click', () => renderVerbQuiz(container));
}

function buildVerbPromptHTML(q) {
  if (q.promptType === 'group') {
    return `
      <div class="quiz-prompt">
        <div class="prompt-label">그룹을 고르세요</div>
        <div class="prompt-word">${q.word}</div>
        <div class="prompt-reading">${q.reading}</div>
        <div class="prompt-meaning">${q.meaning}</div>
      </div>`;
  }
  if (q.promptType === 'meaning') {
    return `
      <div class="quiz-prompt">
        <div class="prompt-label">뜻을 고르세요</div>
        <div class="prompt-word">${q.word}</div>
        <div class="prompt-reading">${q.reading}</div>
      </div>`;
  }
  // form
  return `
    <div class="quiz-prompt">
      <div class="prompt-label">활용형을 고르세요</div>
      <div class="prompt-word">${q.word}</div>
      <div class="prompt-reading">${q.reading} ／ ${q.meaning}</div>
      <div class="prompt-target">${q.promptLabel}</div>
    </div>`;
}

function handleVerbAnswer(chosen, q) {
  if (STATE.answered) return;
  STATE.answered = true;

  const isCorrect = chosen === q.answer;
  Store.recordAnswer(q.id, isCorrect, 'verb', { word: q.word, meaning: q.meaning, reading: q.reading });

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add('correct');
    else if (btn.textContent === chosen && !isCorrect) btn.classList.add('wrong');
  });

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

  const today = Store.getTodayStats();
  const statCards = document.querySelectorAll('.stat-card');
  if (statCards[0]) statCards[0].querySelector('.stat-val').textContent = today.total;
  if (statCards[1]) statCards[1].querySelector('.stat-val').textContent =
    today.total > 0 ? Math.round(today.correct/today.total*100) + '%' : '0%';
}

// ─── Wrong Items Tab ──────────────────────────────────
const CAT_LABEL = { noun: '명사', iadj: 'い형용사', naadj: 'な형용사', verb: '동사' };
const CAT_COLOR = { noun: '#7c6af7', iadj: '#4ade80', naadj: '#f7a26a', verb: '#f87171' };

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
        <p>틀린 문제가 없습니다!<br>퀴즈를 풀면 여기에 기록됩니다.</p>
      </div>`;
    return;
  }

  const totalWrong = entries.reduce((s,[,v]) => s + v.wrongCount, 0);

  const rows = entries.map(([id, info]) => {
    const streakDots = [0,1,2].map(i =>
      `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:3px;
        background:${i < (info.correctStreak||0) ? 'var(--correct)' : 'var(--border)'}"></span>`
    ).join('');
    const catColor = CAT_COLOR[info.category] || 'var(--accent)';
    const catLabel = CAT_LABEL[info.category] || '';
    return `
      <div style="padding:12px;background:var(--surface);border:1px solid var(--border);
                  border-radius:var(--radius-sm);margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-family:'Noto Sans JP',sans-serif;font-size:18px;font-weight:500">${info.word || id}</span>
            ${info.reading ? `<span style="font-size:12px;color:var(--text-dimmer);font-family:'Noto Sans JP',sans-serif">${info.reading}</span>` : ''}
          </div>
          <span style="font-size:11px;background:${catColor}22;color:${catColor};
                       border-radius:4px;padding:2px 8px;border:1px solid ${catColor}44">${catLabel}</span>
        </div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:8px">${info.meaning || ''}</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:11px;color:var(--text-dimmer);margin-bottom:4px">연속 정답 (3번이면 졸업)</div>
            <div>${streakDots}</div>
          </div>
          <div style="text-align:right">
            <div style="color:var(--wrong);font-size:16px;font-weight:700">${info.wrongCount}회 오답</div>
            <div style="font-size:11px;color:var(--text-dimmer);margin-top:2px">${info.lastWrong || ''}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <p class="section-title">오답노트 (${entries.length}개)</p>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-val">${entries.length}</div><div class="stat-label">틀린 단어</div></div>
      <div class="stat-card"><div class="stat-val">${totalWrong}</div><div class="stat-label">총 오답 수</div></div>
    </div>
    <button class="btn-primary" id="wrong-quiz-btn" style="margin-bottom:16px">틀린 문제 퀴즈 시작 →</button>
    ${rows}
  `;

  content.querySelector('#wrong-quiz-btn').addEventListener('click', () => {
    STATE.wrongQs = generateWrongQuestions(entries);
    STATE.wrongIdx = 0;
    STATE.wrongAnswered = false;
    renderWrongQuiz();
  });
}

function generateWrongQuestions(entries) {
  const sorted = [...entries].sort(([,a],[,b]) => b.wrongCount - a.wrongCount).slice(0, 20);
  return sorted.map(([id, info]) => {
    const baseId = id.split('_')[0]; // 'v15_ます형...' → 'v15'
    const cat = info.category;
    if (cat === 'verb') {
      const verbObj = DATA.verbs.find(v => v.id === baseId);
      if (verbObj) return { ...VerbConj.makeFormQuestion(verbObj, DATA.verbs), category: 'verb' };
    } else {
      const words = cat === 'noun' ? DATA.nouns : cat === 'iadj' ? DATA.iAdj : DATA.naAdj;
      const conjFn = cat === 'noun' ? Conj.noun : cat === 'iadj' ? Conj.iAdj : Conj.naAdj;
      const wordObj = words.find(w => w.id === baseId);
      if (wordObj) return { ...Conj.makeQuestion('form', wordObj, words, conjFn), category: cat };
    }
    return null;
  }).filter(Boolean);
}

function renderWrongQuiz() {
  const content = document.getElementById('content');
  const { wrongQs, wrongIdx } = STATE;
  const total = wrongQs.length;

  if (!wrongQs.length) {
    renderWrongTab();
    return;
  }

  if (wrongIdx >= total) {
    content.innerHTML = `
      <p class="section-title">오답 퀴즈 완료!</p>
      <div class="quiz-prompt" style="text-align:center;padding:32px 20px;margin-bottom:16px">
        <div style="font-size:48px;margin-bottom:12px">✅</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent)">${total}문제 완료</div>
        <div style="color:var(--text-dim);margin-top:6px">3번 연속 맞춘 단어는 자동 졸업!</div>
      </div>
      <button class="btn-primary" id="back-btn">오답노트로 돌아가기</button>
    `;
    content.querySelector('#back-btn').addEventListener('click', () => renderWrongTab());
    return;
  }

  const q = wrongQs[wrongIdx];
  const progress = Math.round((wrongIdx / total) * 100);

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <p class="section-title" style="margin:0">오답 퀴즈</p>
      <span style="font-size:13px;color:var(--text-dim)">${wrongIdx + 1} / ${total}</span>
    </div>
    <div class="progress-wrap"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="quiz-area">
      ${buildTodayPromptHTML(q)}
      <div class="options-grid" id="options"></div>
      <div class="feedback" id="feedback"></div>
      <button class="btn-primary" id="next-btn" style="display:none">
        ${wrongIdx + 1 >= total ? '결과 보기 →' : '다음 →'}
      </button>
    </div>
  `;

  STATE.wrongAnswered = false;
  content.querySelectorAll && content.querySelector('#options') && (() => {
    const optGrid = content.querySelector('#options');
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleWrongAnswer(opt, q));
      optGrid.appendChild(btn);
    });
  })();

  content.querySelector('#next-btn').addEventListener('click', () => {
    STATE.wrongIdx++;
    renderWrongQuiz();
  });
}

function handleWrongAnswer(chosen, q) {
  if (STATE.wrongAnswered) return;
  STATE.wrongAnswered = true;

  const isCorrect = chosen === q.answer;
  const cat = q.category || 'verb';
  Store.recordAnswer(q.id, isCorrect, cat, { word: q.word, meaning: q.meaning, reading: q.reading });

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add('correct');
    else if (btn.textContent === chosen && !isCorrect) btn.classList.add('wrong');
  });

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
}

// ─── Rules Tab ────────────────────────────────────────
const RULES_TABS = [
  { id: 'noun',  label: '명사' },
  { id: 'iadj',  label: 'い형용사' },
  { id: 'naadj', label: 'な형용사' },
  { id: 'v1',    label: '동사 1그룹' },
  { id: 'v2',    label: '동사 2그룹' },
  { id: 'v3',    label: '동사 3그룹' },
];

const VERB_FORM_TABS = [
  { id: 'masu',  label: 'ます형' },
  { id: 'nai',   label: 'ない형' },
  { id: 'te',    label: 'て형' },
  { id: 'ta',    label: 'た형' },
  { id: 'voli',  label: '意志형' },
  { id: 'imp',   label: '命令형' },
  { id: 'kinjsi',label: '禁止형' },
];

function renderRulesTab() {
  if (!STATE.rulesTab) STATE.rulesTab = 'noun';
  if (!STATE.rulesVerbForm) STATE.rulesVerbForm = 'masu';

  const content = document.getElementById('content');
  content.innerHTML = `
    <p class="section-title">활용 규칙</p>
    <div class="sub-tabs" id="rules-main-tabs">
      ${RULES_TABS.map(t => `
        <button class="sub-tab ${STATE.rulesTab === t.id ? 'active' : ''}" data-rtab="${t.id}">${t.label}</button>
      `).join('')}
    </div>
    <div id="rules-verb-form-tabs"></div>
    <div id="rules-content"></div>
  `;

  content.querySelectorAll('#rules-main-tabs .sub-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      STATE.rulesTab = btn.dataset.rtab;
      STATE.rulesVerbForm = 'masu';
      content.querySelectorAll('#rules-main-tabs .sub-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderRulesContent();
    })
  );

  renderRulesContent();
}

function renderRulesContent() {
  const content = document.getElementById('content');
  const verbFormArea = content.querySelector('#rules-verb-form-tabs');
  const rulesArea = content.querySelector('#rules-content');

  // 동사일 때만 하위탭 표시
  const isVerb = ['v1','v2','v3'].includes(STATE.rulesTab);
  if (isVerb) {
    verbFormArea.innerHTML = `
      <div class="sub-tabs" style="margin-bottom:16px">
        ${VERB_FORM_TABS.map(t => `
          <button class="sub-tab ${STATE.rulesVerbForm === t.id ? 'active' : ''}" data-vform="${t.id}">${t.label}</button>
        `).join('')}
      </div>`;
    verbFormArea.querySelectorAll('.sub-tab').forEach(btn =>
      btn.addEventListener('click', () => {
        STATE.rulesVerbForm = btn.dataset.vform;
        verbFormArea.querySelectorAll('.sub-tab').forEach(b => b.classList.toggle('active', b === btn));
        rulesArea.innerHTML = buildRulesHTML();
      })
    );
  } else {
    verbFormArea.innerHTML = '';
  }

  rulesArea.innerHTML = buildRulesHTML();
}

function buildRulesHTML() {
  const t = STATE.rulesTab;
  if (t === 'noun')  return rulesNoun();
  if (t === 'iadj')  return rulesIAdj();
  if (t === 'naadj') return rulesNaAdj();
  if (t === 'v1')    return rulesV1(STATE.rulesVerbForm);
  if (t === 'v2')    return rulesV2(STATE.rulesVerbForm);
  if (t === 'v3')    return rulesV3(STATE.rulesVerbForm);
  return '';
}

function ruleTable(rows) {
  // rows: [{ label, plain, polite, example }]
  return `
    <table class="conj-table" style="margin-bottom:20px">
      <thead>
        <tr>
          <th>형태</th>
          <th>보통체</th>
          <th>정중체</th>
          <th style="color:var(--accent2)">예시</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.label}</td>
            <td class="conj-plain">${r.plain}</td>
            <td class="conj-polite">${r.polite}</td>
            <td style="color:var(--accent2);font-family:'Noto Sans JP',sans-serif">${r.ex}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function verbRuleTable(rows, note) {
  // rows: [{ ending, result, example }]
  return `
    ${note ? `<div style="margin-bottom:12px;padding:10px 12px;background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius-sm);font-size:13px;color:var(--accent)">${note}</div>` : ''}
    <table class="conj-table" style="margin-bottom:20px">
      <thead>
        <tr>
          <th>기본형 어미</th>
          <th>변환 결과</th>
          <th style="color:var(--accent2)">예시</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="font-family:'Noto Sans JP',sans-serif;font-size:16px">${r.ending}</td>
            <td style="font-family:'Noto Sans JP',sans-serif;font-size:15px">${r.result}</td>
            <td style="color:var(--accent2);font-family:'Noto Sans JP',sans-serif">${r.ex}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function exBox(label, text) {
  return `<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px;font-size:13px">
    <span style="color:var(--text-dimmer)">${label}　</span>
    <span style="font-family:'Noto Sans JP',sans-serif;font-size:15px">${text}</span>
  </div>`;
}

function warnBox(text) {
  return `<div style="background:#2a1f00;border:1px solid #f7a26a;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--accent2)">⚠️ ${text}</div>`;
}

// ── 명사 규칙 ──────────────────────────────────────────
function rulesNoun() {
  return `
    <p class="section-title" style="margin-bottom:12px">명사 활용 규칙</p>
    ${ruleTable([
      { label: '현재 긍정', plain: '〇〇だ',          polite: '〇〇です',              ex: '本だ／本です' },
      { label: '현재 부정', plain: '〇〇じゃない',     polite: '〇〇じゃありません',     ex: '本じゃない' },
      { label: '과거 긍정', plain: '〇〇だった',       polite: '〇〇でした',             ex: '本だった' },
      { label: '과거 부정', plain: '〇〇じゃなかった', polite: '〇〇じゃありませんでした', ex: '本じゃなかった' },
    ])}
    ${exBox('예시', '学生だ → 학생이다 / 学生でした → 학생이었습니다')}
  `;
}

// ── い형용사 규칙 ──────────────────────────────────────
function rulesIAdj() {
  return `
    <p class="section-title" style="margin-bottom:12px">い형용사 활용 규칙</p>
    <div style="margin-bottom:12px;padding:10px 12px;background:var(--surface2);border-radius:var(--radius-sm);font-size:13px;color:var(--text-dim)">
      어간 = い를 뗀 나머지　예) おいし<strong style="color:var(--text)">い</strong> → 어간: おいし
    </div>
    ${ruleTable([
      { label: '현재 긍정', plain: '어간＋い',         polite: '어간＋いです',       ex: 'おいしい／おいしいです' },
      { label: '현재 부정', plain: '어간＋くない',      polite: '어간＋くないです',   ex: 'おいしくない' },
      { label: '과거 긍정', plain: '어간＋かった',      polite: '어간＋かったです',   ex: 'おいしかった' },
      { label: '과거 부정', plain: '어간＋くなかった',  polite: '어간＋くなかったです', ex: 'おいしくなかった' },
      { label: 'て형 (연결)', plain: '어간＋くて',      polite: '―',               ex: 'おいしくて' },
      { label: '부사형',     plain: '어간＋く',         polite: '―',               ex: 'おいしく食べる' },
    ])}
    ${warnBox('いい (좋다) 는 불규칙! 어간이 よ로 바뀜: よくない／よかった／よくなかった')}
  `;
}

// ── な형용사 규칙 ──────────────────────────────────────
function rulesNaAdj() {
  return `
    <p class="section-title" style="margin-bottom:12px">な형용사 활용 규칙</p>
    <div style="margin-bottom:12px;padding:10px 12px;background:var(--surface2);border-radius:var(--radius-sm);font-size:13px;color:var(--text-dim)">
      명사 활용과 거의 동일. 명사 수식 시 <strong style="color:var(--text)">な</strong>를 붙임.
    </div>
    ${ruleTable([
      { label: '현재 긍정', plain: '〇〇だ',          polite: '〇〇です',              ex: '静かだ／静かです' },
      { label: '현재 부정', plain: '〇〇じゃない',     polite: '〇〇じゃありません',     ex: '静かじゃない' },
      { label: '과거 긍정', plain: '〇〇だった',       polite: '〇〇でした',             ex: '静かでした' },
      { label: '과거 부정', plain: '〇〇じゃなかった', polite: '〇〇じゃありませんでした', ex: '静かじゃなかった' },
      { label: 'て형 (연결)', plain: '〇〇で',         polite: '―',                    ex: '静かで' },
      { label: '부사형',     plain: '〇〇に',          polite: '―',                    ex: '静かに話す' },
    ])}
  `;
}

// ── 동사 1그룹 규칙 ───────────────────────────────────
function rulesV1(form) {
  const maps = {
    masu: {
      title: 'ます형 (정중 긍정)',
      note: '어미를 い단으로 바꾸고 ます를 붙임',
      rows: [
        { ending: 'く', result: 'き＋ます', ex: '書く → 書きます' },
        { ending: 'ぐ', result: 'ぎ＋ます', ex: '泳ぐ → 泳ぎます' },
        { ending: 'す', result: 'し＋ます', ex: '話す → 話します' },
        { ending: 'つ', result: 'ち＋ます', ex: '待つ → 待ちます' },
        { ending: 'ぬ', result: 'に＋ます', ex: '死ぬ → 死にます' },
        { ending: 'ぶ', result: 'び＋ます', ex: '飛ぶ → 飛びます' },
        { ending: 'む', result: 'み＋ます', ex: '読む → 読みます' },
        { ending: 'る', result: 'り＋ます', ex: '乗る → 乗ります' },
        { ending: 'う', result: 'い＋ます', ex: '買う → 買います' },
      ]
    },
    nai: {
      title: 'ない형 (보통 부정)',
      note: '어미를 あ단으로 바꾸고 ない를 붙임 (う→わ 주의!)',
      rows: [
        { ending: 'く', result: 'か＋ない', ex: '書く → 書かない' },
        { ending: 'ぐ', result: 'が＋ない', ex: '泳ぐ → 泳がない' },
        { ending: 'す', result: 'さ＋ない', ex: '話す → 話さない' },
        { ending: 'つ', result: 'た＋ない', ex: '待つ → 待たない' },
        { ending: 'ぬ', result: 'な＋ない', ex: '死ぬ → 死なない' },
        { ending: 'ぶ', result: 'ば＋ない', ex: '飛ぶ → 飛ばない' },
        { ending: 'む', result: 'ま＋ない', ex: '読む → 読まない' },
        { ending: 'る', result: 'ら＋ない', ex: '乗る → 乗らない' },
        { ending: 'う', result: 'わ＋ない', ex: '買う → 買わない' },
      ]
    },
    te: {
      title: 'て형',
      note: 'く→いて, ぐ→いで, す→して, 촉음편(つ/ぶ/む/る/う→って/んで)',
      rows: [
        { ending: 'く', result: 'いて', ex: '書く → 書いて' },
        { ending: 'ぐ', result: 'いで', ex: '泳ぐ → 泳いで' },
        { ending: 'す', result: 'して', ex: '話す → 話して' },
        { ending: 'つ', result: 'って', ex: '待つ → 待って' },
        { ending: 'ぬ', result: 'んで', ex: '死ぬ → 死んで' },
        { ending: 'ぶ', result: 'んで', ex: '飛ぶ → 飛んで' },
        { ending: 'む', result: 'んで', ex: '読む → 読んで' },
        { ending: 'る', result: 'って', ex: '乗る → 乗って' },
        { ending: 'う', result: 'って', ex: '買う → 買って' },
      ],
      extra: warnBox('行く만 예외! く→いて가 아닌 → <span style="font-family:Noto Sans JP">いって</span> (行って)')
    },
    ta: {
      title: 'た형 (보통 과거)',
      note: 'て형에서 て→た, で→だ 로 바꾸면 됨',
      rows: [
        { ending: 'く', result: 'いた', ex: '書く → 書いた' },
        { ending: 'ぐ', result: 'いだ', ex: '泳ぐ → 泳いだ' },
        { ending: 'す', result: 'した', ex: '話す → 話した' },
        { ending: 'つ', result: 'った', ex: '待つ → 待った' },
        { ending: 'ぬ', result: 'んだ', ex: '死ぬ → 死んだ' },
        { ending: 'ぶ', result: 'んだ', ex: '飛ぶ → 飛んだ' },
        { ending: 'む', result: 'んだ', ex: '読む → 読んだ' },
        { ending: 'る', result: 'った', ex: '乗る → 乗った' },
        { ending: 'う', result: 'った', ex: '買う → 買った' },
      ],
      extra: warnBox('行く만 예외! → <span style="font-family:Noto Sans JP">いった</span> (行った)')
    },
    voli: {
      title: '意志형 (~よう / ~おう)',
      note: '어미를 お단으로 바꾸고 う를 붙임',
      rows: [
        { ending: 'く', result: 'こう', ex: '書く → 書こう' },
        { ending: 'ぐ', result: 'ごう', ex: '泳ぐ → 泳ごう' },
        { ending: 'す', result: 'そう', ex: '話す → 話そう' },
        { ending: 'つ', result: 'とう', ex: '待つ → 待とう' },
        { ending: 'ぬ', result: 'のう', ex: '死ぬ → 死のう' },
        { ending: 'ぶ', result: 'ぼう', ex: '飛ぶ → 飛ぼう' },
        { ending: 'む', result: 'もう', ex: '読む → 読もう' },
        { ending: 'る', result: 'ろう', ex: '乗る → 乗ろう' },
        { ending: 'う', result: 'おう', ex: '買う → 買おう' },
      ]
    },
    imp: {
      title: '命令형',
      note: '어미를 え단으로 바꿈',
      rows: [
        { ending: 'く', result: 'け',  ex: '書く → 書け' },
        { ending: 'ぐ', result: 'げ',  ex: '泳ぐ → 泳げ' },
        { ending: 'す', result: 'せ',  ex: '話す → 話せ' },
        { ending: 'つ', result: 'て',  ex: '待つ → 待て' },
        { ending: 'ぬ', result: 'ね',  ex: '死ぬ → 死ね' },
        { ending: 'ぶ', result: 'べ',  ex: '飛ぶ → 飛べ' },
        { ending: 'む', result: 'め',  ex: '読む → 読め' },
        { ending: 'る', result: 'れ',  ex: '乗る → 乗れ' },
        { ending: 'う', result: 'え',  ex: '買う → 買え' },
      ]
    },
    kinjsi: {
      title: '禁止형 (~な)',
      note: '기본형 그대로에 な를 붙임. 모든 어미 동일!',
      rows: [
        { ending: 'く', result: 'く＋な', ex: '書く → 書くな' },
        { ending: 'ぐ', result: 'ぐ＋な', ex: '泳ぐ → 泳ぐな' },
        { ending: 'す', result: 'す＋な', ex: '話す → 話すな' },
        { ending: 'つ', result: 'つ＋な', ex: '待つ → 待つな' },
        { ending: 'ぬ', result: 'ぬ＋な', ex: '死ぬ → 死ぬな' },
        { ending: 'ぶ', result: 'ぶ＋な', ex: '飛ぶ → 飛ぶな' },
        { ending: 'む', result: 'む＋な', ex: '読む → 読むな' },
        { ending: 'る', result: 'る＋な', ex: '乗る → 乗るな' },
        { ending: 'う', result: 'う＋な', ex: '買う → 買うな' },
      ]
    },
  };

  const m = maps[form];
  if (!m) return '';
  return `
    <p class="section-title" style="margin-bottom:12px">1그룹 동사 — ${m.title}</p>
    ${verbRuleTable(m.rows, m.note)}
    ${m.extra || ''}
  `;
}

// ── 동사 2그룹 규칙 ───────────────────────────────────
function rulesV2(form) {
  const stem = '어간 (る를 뗀 나머지)';
  const maps = {
    masu:   { title: 'ます형',   rule: '어간＋ます',       ex: '食べる → 食べます' },
    nai:    { title: 'ない형',   rule: '어간＋ない',       ex: '食べる → 食べない' },
    te:     { title: 'て형',     rule: '어간＋て',         ex: '食べる → 食べて' },
    ta:     { title: 'た형',     rule: '어간＋た',         ex: '食べる → 食べた' },
    voli:   { title: '意志형',   rule: '어간＋よう',       ex: '食べる → 食べよう' },
    imp:    { title: '命令형',   rule: '어간＋ろ',         ex: '食べる → 食べろ' },
    kinjsi: { title: '禁止형',   rule: '기본형＋な',       ex: '食べる → 食べるな' },
  };
  const m = maps[form];
  if (!m) return '';
  return `
    <p class="section-title" style="margin-bottom:12px">2그룹 동사 — ${m.title}</p>
    <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text-dimmer);margin-bottom:6px">규칙</div>
      <div style="font-size:15px;color:var(--text)">${m.rule}</div>
    </div>
    ${exBox('예시', m.ex)}
    ${exBox('예시', m.ex.includes('食べ') ? '見る → ' + m.ex.replace('食べ','見').replace('ます','ます').replace('ない','ない') : '')}
    <div style="margin-top:16px;padding:12px;background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius-sm);font-size:13px;color:var(--accent)">
      💡 2그룹은 모든 활용이 <strong>어간＋어미</strong>로 일정해서 규칙적!
    </div>
  `;
}

// ── 동사 3그룹 규칙 ───────────────────────────────────
function rulesV3(form) {
  const maps = {
    masu:   { suru: 'します',       kuru: 'きます' },
    nai:    { suru: 'しない',       kuru: 'こない' },
    te:     { suru: 'して',         kuru: 'きて' },
    ta:     { suru: 'した',         kuru: 'きた' },
    voli:   { suru: 'しよう',       kuru: 'こよう' },
    imp:    { suru: 'しろ',         kuru: 'こい' },
    kinjsi: { suru: 'するな',       kuru: '来るな' },
  };
  const formLabels = {
    masu: 'ます형', nai: 'ない형', te: 'て형',
    ta: 'た형', voli: '意志형', imp: '命令형', kinjsi: '禁止형'
  };
  const m = maps[form];
  if (!m) return '';
  return `
    <p class="section-title" style="margin-bottom:12px">3그룹 동사 — ${formLabels[form]}</p>
    ${warnBox('3그룹은 규칙 없음. 통째로 암기!')}
    <table class="conj-table" style="margin-bottom:20px">
      <thead>
        <tr><th>기본형</th><th>뜻</th><th style="color:var(--accent2)">${formLabels[form]}</th></tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:'Noto Sans JP',sans-serif;font-size:16px">する</td>
          <td>하다</td>
          <td style="font-family:'Noto Sans JP',sans-serif;font-size:15px;color:var(--accent2)">${m.suru}</td>
        </tr>
        <tr>
          <td style="font-family:'Noto Sans JP',sans-serif;font-size:16px">来る</td>
          <td>오다</td>
          <td style="font-family:'Noto Sans JP',sans-serif;font-size:15px;color:var(--accent2)">${m.kuru}</td>
        </tr>
      </tbody>
    </table>
    <div style="padding:12px;background:var(--surface2);border-radius:var(--radius-sm);font-size:13px;color:var(--text-dim)">
      ～する 복합동사 (勉強する, 運動する 등)는 する와 동일하게 활용
    </div>
  `;
}

// ─── Start ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
