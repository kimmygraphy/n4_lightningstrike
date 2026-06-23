// ── conjugation.js ──
// Generates all forms for nouns, い-adj, な-adj
// Returns an array of { label, form, style } objects

const Conj = (() => {

  // ── NOUN ──
  function noun(word) {
    return [
      // polite
      { label: '현재 긍정 (정중)', form: `${word}です`, style: 'polite' },
      { label: '현재 부정 (정중)', form: `${word}じゃありません`, style: 'polite' },
      { label: '과거 긍정 (정중)', form: `${word}でした`, style: 'polite' },
      { label: '과거 부정 (정중)', form: `${word}じゃありませんでした`, style: 'polite' },
      // plain
      { label: '현재 긍정 (보통)', form: `${word}だ`, style: 'plain' },
      { label: '현재 부정 (보통)', form: `${word}じゃない`, style: 'plain' },
      { label: '과거 긍정 (보통)', form: `${word}だった`, style: 'plain' },
      { label: '과거 부정 (보통)', form: `${word}じゃなかった`, style: 'plain' },
    ];
  }

  // ── い-ADJECTIVE ──
  function iAdj(word) {
    // handle irregular いい
    const isIi = word === 'いい';
    const stem = isIi ? 'よ' : word.slice(0, -1); // remove trailing い
    return [
      // polite
      { label: '현재 긍정 (정중)', form: `${word}です`, style: 'polite' },
      { label: '현재 부정 (정중)', form: `${stem}くないです`, style: 'polite' },
      { label: '과거 긍정 (정중)', form: `${stem}かったです`, style: 'polite' },
      { label: '과거 부정 (정중)', form: `${stem}くなかったです`, style: 'polite' },
      // plain
      { label: '현재 긍정 (보통)', form: `${word}`, style: 'plain' },
      { label: '현재 부정 (보통)', form: `${stem}くない`, style: 'plain' },
      { label: '과거 긍정 (보통)', form: `${stem}かった`, style: 'plain' },
      { label: '과거 부정 (보통)', form: `${stem}くなかった`, style: 'plain' },
      // connective / adverb
      { label: '연결형 (～て)', form: `${stem}くて`, style: 'plain' },
      { label: '부사형 (～く)', form: `${stem}く`, style: 'plain' },
    ];
  }

  // ── な-ADJECTIVE ──
  function naAdj(word) {
    return [
      // polite
      { label: '현재 긍정 (정중)', form: `${word}です`, style: 'polite' },
      { label: '현재 부정 (정중)', form: `${word}じゃありません`, style: 'polite' },
      { label: '과거 긍정 (정중)', form: `${word}でした`, style: 'polite' },
      { label: '과거 부정 (정중)', form: `${word}じゃありませんでした`, style: 'polite' },
      // plain
      { label: '현재 긍정 (보통)', form: `${word}だ`, style: 'plain' },
      { label: '현재 부정 (보통)', form: `${word}じゃない`, style: 'plain' },
      { label: '과거 긍정 (보통)', form: `${word}だった`, style: 'plain' },
      { label: '과거 부정 (보통)', form: `${word}じゃなかった`, style: 'plain' },
      // connective / adverb
      { label: '연결형 (～で)', form: `${word}で`, style: 'plain' },
      { label: '부사형 (～に)', form: `${word}に`, style: 'plain' },
    ];
  }

  // ── QUESTION GENERATOR ──
  // Picks a random form from a word's conjugations and generates 4 options
  // questionType: 'form' (label→form) | 'meaning' (jp→kr) | 'word' (kr→jp base)
  function makeQuestion(type, wordObj, allWords, conjFn) {
    if (type === 'form') {
      const forms = conjFn(wordObj.word);
      const correct = forms[Math.floor(Math.random() * forms.length)];
      // Distractors: wrong forms from same word OR correct forms of other words
      const distractors = new Set();
      // Wrong forms from same word (different conjugation)
      forms.filter(f => f.form !== correct.form).forEach(f => distractors.add(f.form));
      // Forms from other random words
      const others = allWords.filter(w => w.id !== wordObj.id);
      shuffle(others).slice(0, 3).forEach(w => {
        const fs = conjFn(w.word);
        const idx = forms.findIndex(f => f.label === correct.label);
        if (idx >= 0 && fs[idx]) distractors.add(fs[idx].form);
      });
      const options = shuffle([correct.form, ...shuffle([...distractors]).slice(0, 3)]).slice(0, 4);
      // make sure correct is included
      if (!options.includes(correct.form)) options[0] = correct.form;
      return {
        id: `${wordObj.id}_${correct.label}`,
        word: wordObj.word,
        reading: wordObj.reading || '',
        promptType: 'form',
        promptLabel: correct.label,
        answer: correct.form,
        options: shuffle(options),
      };
    }

    if (type === 'meaning') {
      const correct = wordObj.meaning;
      const distractors = shuffle(allWords.filter(w => w.id !== wordObj.id))
        .slice(0, 3).map(w => w.meaning);
      const options = shuffle([correct, ...distractors]).slice(0, 4);
      if (!options.includes(correct)) options[0] = correct;
      return {
        id: `${wordObj.id}_meaning`,
        word: wordObj.word,
        reading: wordObj.reading || '',
        promptType: 'meaning',
        promptLabel: '뜻을 고르세요',
        answer: correct,
        options: shuffle([correct, ...distractors].slice(0, 4)),
      };
    }

    if (type === 'word') {
      const correct = wordObj.word;
      const distractors = shuffle(allWords.filter(w => w.id !== wordObj.id))
        .slice(0, 3).map(w => w.word);
      return {
        id: `${wordObj.id}_word`,
        word: wordObj.meaning,
        reading: '',
        promptType: 'word',
        promptLabel: '일본어를 고르세요',
        answer: correct,
        options: shuffle([correct, ...distractors].slice(0, 4)),
      };
    }
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { noun, iAdj, naAdj, makeQuestion, shuffle };
})();
