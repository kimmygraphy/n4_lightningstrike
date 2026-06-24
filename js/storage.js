// ── storage.js ── v2 (카테고리 + 졸업 시스템)

const Store = (() => {
  const KEY = 'jlpt_n4_v2'; // v1 → v2로 변경해서 기존 데이터 리셋

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || defaultState();
    } catch {
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Storage write failed', e);
    }
  }

  function defaultState() {
    return {
      streak: 0,
      lastStudyDate: null,
      wrongItems: {},   // id → { wrongCount, lastWrong, category, word, meaning, correctStreak }
      sessionStats: {}, // date → { total, correct }
    };
  }

  // category: 'noun' | 'iadj' | 'naadj' | 'verb'
  // wordObj: { id, word, meaning, reading? }
  function recordAnswer(id, isCorrect, category, wordObj) {
    const state = load();

    if (!isCorrect) {
      const prev = state.wrongItems[id] || {
        wrongCount: 0, lastWrong: null,
        category, word: wordObj?.word, meaning: wordObj?.meaning,
        reading: wordObj?.reading || '',
        correctStreak: 0,
      };
      state.wrongItems[id] = {
        ...prev,
        wrongCount: prev.wrongCount + 1,
        lastWrong: todayStr(),
        correctStreak: 0, // 틀리면 연속정답 리셋
        category: category || prev.category,
        word: wordObj?.word || prev.word,
        meaning: wordObj?.meaning || prev.meaning,
        reading: wordObj?.reading || prev.reading || '',
      };
    } else {
      if (state.wrongItems[id]) {
        const prev = state.wrongItems[id];
        const newStreak = (prev.correctStreak || 0) + 1;
        if (newStreak >= 3) {
          // 졸업!
          delete state.wrongItems[id];
        } else {
          state.wrongItems[id] = { ...prev, correctStreak: newStreak };
        }
      }
    }

    // session stats
    const d = todayStr();
    if (!state.sessionStats[d]) state.sessionStats[d] = { total: 0, correct: 0 };
    state.sessionStats[d].total++;
    if (isCorrect) state.sessionStats[d].correct++;

    save(state);
  }

  function updateStreak() {
    const state = load();
    const today = todayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split('T')[0];

    if (state.lastStudyDate === today) return state.streak;
    if (state.lastStudyDate === yd) {
      state.streak++;
    } else if (state.lastStudyDate !== today) {
      state.streak = 1;
    }
    state.lastStudyDate = today;
    save(state);
    return state.streak;
  }

  function getWrongItems() {
    return load().wrongItems;
  }

  function getTodayStats() {
    const stats = load().sessionStats[todayStr()];
    return stats || { total: 0, correct: 0 };
  }

  function getStreak() {
    return load().streak;
  }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  return { recordAnswer, updateStreak, getWrongItems, getTodayStats, getStreak };
})();
