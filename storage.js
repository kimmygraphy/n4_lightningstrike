// ── storage.js ──
// All localStorage interactions in one place

const Store = (() => {
  const KEY = 'jlpt_n4_v1';

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
      wrongItems: {},   // id → { wrongCount, lastWrong }
      sessionStats: {}, // date → { total, correct }
    };
  }

  function recordAnswer(id, isCorrect) {
    const state = load();
    if (!isCorrect) {
      const prev = state.wrongItems[id] || { wrongCount: 0, lastWrong: null };
      state.wrongItems[id] = {
        wrongCount: prev.wrongCount + 1,
        lastWrong: todayStr(),
      };
    } else {
      // Reduce wrong count by 1 if exists (correct answer helps)
      if (state.wrongItems[id]) {
        state.wrongItems[id].wrongCount = Math.max(0, state.wrongItems[id].wrongCount - 1);
        if (state.wrongItems[id].wrongCount === 0) delete state.wrongItems[id];
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
