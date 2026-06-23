// ── verb-conjugation.js ──
// 1그룹 / 2그룹 / 3그룹 동사 활용 엔진
// 行く・ある・する・来る 예외 처리 포함

const VerbConj = (() => {

  // ── 1그룹: 어미 변환표 ──────────────────────────────
  // 기본 어미 → [마스stem, ない stem, て형, た형, 의지stem, 명령형, 금지어미앞]
  const G1_MAP = {
    'く': { masu: 'き', nai: 'か', te: 'いて', ta: 'いた', voli: 'こ', imp: 'け' },
    'ぐ': { masu: 'ぎ', nai: 'が', te: 'いで', ta: 'いだ', voli: 'ご', imp: 'げ' },
    'す': { masu: 'し', nai: 'さ', te: 'して', ta: 'した', voli: 'そ', imp: 'せ' },
    'つ': { masu: 'ち', nai: 'た', te: 'って', ta: 'った', voli: 'と', imp: 'て' },
    'ぬ': { masu: 'に', nai: 'な', te: 'んで', ta: 'んだ', voli: 'の', imp: 'ね' },
    'ぶ': { masu: 'び', nai: 'ば', te: 'んで', ta: 'んだ', voli: 'ぼ', imp: 'べ' },
    'む': { masu: 'み', nai: 'ま', te: 'んで', ta: 'んだ', voli: 'も', imp: 'め' },
    'る': { masu: 'り', nai: 'ら', te: 'って', ta: 'った', voli: 'ろ', imp: 'れ' },
    'う': { masu: 'い', nai: 'わ', te: 'って', ta: 'った', voli: 'お', imp: 'え' },
  };

  // ── 불규칙 ──────────────────────────────────────────
  // 行く: て형/た형만 예외 (いって/いった)
  // ある: ない형이 あらない가 아닌 ない
  // する / 来る: 완전 불규칙

  function conjugate(verbObj) {
    const { word, group, irregular, prefix } = verbObj;

    if (group === 3) {
      if (irregular === 'suru') return suruForms(word, prefix);
      if (irregular === 'kuru') return kuruForms();
    }
    if (group === 2) return g2Forms(word);
    if (group === 1) return g1Forms(word, irregular);
    return [];
  }

  // ── 2그룹 ────────────────────────────────────────────
  function g2Forms(word) {
    const stem = word.slice(0, -1); // 食べる → 食べ
    return buildForms(stem, {
      masuStem: stem,
      naiStem: stem,
      te: stem + 'て',
      ta: stem + 'た',
      voliStem: stem + 'よ',
      imp: stem + 'ろ',
      base: word,
    });
  }

  // ── 1그룹 ────────────────────────────────────────────
  function g1Forms(word, irregular) {
    const ending = word.slice(-1);
    const stem = word.slice(0, -1);
    const m = G1_MAP[ending];
    if (!m) return [];

    let te = stem + m.te;
    let ta = stem + m.ta;

    // 行く 예외
    if (irregular === 'iku') { te = stem + 'って'; ta = stem + 'った'; }

    // ある 예외: ない형 → ない (not あらない)
    const naiForm = irregular === 'aru' ? 'ない' : stem + m.nai + 'ない';
    const naiPolite = irregular === 'aru' ? 'ないです' : stem + m.nai + 'なないです';

    return [
      { label: 'ます형 (정중 긍정)', form: stem + m.masu + 'ます' },
      { label: 'ません (정중 부정)', form: stem + m.masu + 'ません' },
      { label: 'ました (정중 과거)', form: stem + m.masu + 'ました' },
      { label: 'ませんでした (정중 과거부정)', form: stem + m.masu + 'ませんでした' },
      { label: 'ない형 (보통 부정)', form: naiForm },
      { label: 'て형', form: te },
      { label: 'た형 (보통 과거)', form: ta },
      { label: '意志형 (～よう/～おう)', form: stem + m.voli + 'う' },
      { label: '命令형', form: stem + m.imp },
      { label: '禁止형 (～な)', form: word + 'な' },
      { label: '辞書형 (기본형)', form: word },
    ];
  }

  function buildForms(stem, f) {
    return [
      { label: 'ます형 (정중 긍정)', form: f.masuStem + 'ます' },
      { label: 'ません (정중 부정)', form: f.masuStem + 'ません' },
      { label: 'ました (정중 과거)', form: f.masuStem + 'ました' },
      { label: 'ませんでした (정중 과거부정)', form: f.masuStem + 'ませんでした' },
      { label: 'ない형 (보통 부정)', form: f.naiStem + 'ない' },
      { label: 'て형', form: f.te },
      { label: 'た형 (보통 과거)', form: f.ta },
      { label: '意志형 (～よう)', form: f.voliStem + 'う' },
      { label: '命令형', form: f.imp },
      { label: '禁止형 (～な)', form: f.base + 'な' },
      { label: '辞書형 (기본형)', form: f.base },
    ];
  }

  // ── する / ～する ─────────────────────────────────────
  function suruForms(word, prefix) {
    const p = prefix || '';
    return [
      { label: 'ます형 (정중 긍정)', form: p + 'します' },
      { label: 'ません (정중 부정)', form: p + 'しません' },
      { label: 'ました (정중 과거)', form: p + 'しました' },
      { label: 'ませんでした (정중 과거부정)', form: p + 'しませんでした' },
      { label: 'ない형 (보통 부정)', form: p + 'しない' },
      { label: 'て형', form: p + 'して' },
      { label: 'た형 (보통 과거)', form: p + 'した' },
      { label: '意志형 (～よう)', form: p + 'しよう' },
      { label: '命令형', form: p + 'しろ' },
      { label: '禁止형 (～な)', form: word + 'な' },
      { label: '辞書형 (기본형)', form: word },
    ];
  }

  // ── 来る ──────────────────────────────────────────────
  function kuruForms() {
    return [
      { label: 'ます형 (정중 긍정)', form: 'きます' },
      { label: 'ません (정중 부정)', form: 'きません' },
      { label: 'ました (정중 과거)', form: 'きました' },
      { label: 'ませんでした (정중 과거부정)', form: 'きませんでした' },
      { label: 'ない형 (보통 부정)', form: 'こない' },
      { label: 'て형', form: 'きて' },
      { label: 'た형 (보통 과거)', form: 'きた' },
      { label: '意志형 (～よう)', form: 'こよう' },
      { label: '命令형', form: 'こい' },
      { label: '禁止형 (～な)', form: '来るな' },
      { label: '辞書형 (기본형)', form: '来る' },
    ];
  }

  // ── 그룹 판별 문제 ────────────────────────────────────
  function makeGroupQuestion(verbObj, allVerbs) {
    const correct = String(verbObj.group) + '그룹';
    const options = shuffle(['1그룹', '2그룹', '3그룹']);
    return {
      id: `${verbObj.id}_group`,
      promptType: 'group',
      promptLabel: '그룹을 고르세요',
      word: verbObj.word,
      reading: verbObj.reading,
      meaning: verbObj.meaning,
      answer: correct,
      options,
    };
  }

  // ── 활용형 문제 ───────────────────────────────────────
  function makeFormQuestion(verbObj, allVerbs) {
    const forms = conjugate(verbObj);
    if (!forms.length) return null;

    // 출제할 형태 고르기 (랜덤)
    const target = forms[Math.floor(Math.random() * forms.length)];

    // 오답: 같은 형태를 다른 동사에 적용
    const distractors = new Set();
    shuffle(allVerbs)
      .filter(v => v.id !== verbObj.id)
      .slice(0, 5)
      .forEach(v => {
        const fs = conjugate(v);
        const match = fs.find(f => f.label === target.label);
        if (match && match.form !== target.form) distractors.add(match.form);
      });

    // 같은 동사의 다른 형태도 오답 후보로
    forms
      .filter(f => f.form !== target.form)
      .forEach(f => distractors.add(f.form));

    const opts = [target.form, ...shuffle([...distractors]).slice(0, 3)];
    if (opts.length < 4) {
      // 패딩 (혹시 부족할 경우)
      const pads = ['食べます', 'きます', 'しない', 'よんで'];
      pads.forEach(p => { if (!opts.includes(p) && opts.length < 4) opts.push(p); });
    }

    return {
      id: `${verbObj.id}_${target.label}`,
      promptType: 'form',
      promptLabel: target.label,
      word: verbObj.word,
      reading: verbObj.reading,
      meaning: verbObj.meaning,
      answer: target.form,
      options: shuffle(opts.slice(0, 4)),
    };
  }

  // ── 뜻 문제 ───────────────────────────────────────────
  function makeMeaningQuestion(verbObj, allVerbs) {
    const correct = verbObj.meaning;
    const distractors = shuffle(allVerbs.filter(v => v.id !== verbObj.id))
      .slice(0, 3).map(v => v.meaning);
    return {
      id: `${verbObj.id}_meaning`,
      promptType: 'meaning',
      promptLabel: '뜻을 고르세요',
      word: verbObj.word,
      reading: verbObj.reading,
      meaning: verbObj.meaning,
      answer: correct,
      options: shuffle([correct, ...distractors].slice(0, 4)),
    };
  }

  function makeQuestion(verbObj, allVerbs) {
    const r = Math.random();
    if (r < 0.1) return makeGroupQuestion(verbObj, allVerbs);
    if (r < 0.25) return makeMeaningQuestion(verbObj, allVerbs);
    return makeFormQuestion(verbObj, allVerbs);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── 공개 API ──────────────────────────────────────────
  return { conjugate, makeQuestion, makeGroupQuestion, makeFormQuestion, makeMeaningQuestion, shuffle };
})();
