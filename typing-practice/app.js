(function () {
  'use strict';

  const DATA = window.TYPING_DATA;
  if (!DATA || !Array.isArray(DATA.cards)) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">학습 데이터를 불러오지 못했습니다. data.js가 index.html과 같은 폴더에 있는지 확인해 주세요.</p>';
    return;
  }

  const cards = DATA.cards;
  const lectures = [
    { key: '3', title: '3강', topic: '장내선충', macro: '선충' },
    { key: '4', title: '4강', topic: '조직내 선충', macro: '선충' },
    { key: '5', title: '5강', topic: '사상충', macro: '선충' },
    { key: '6', title: '6강', topic: '주혈흡충', macro: '흡충' },
    { key: '7', title: '7강', topic: '폐흡충·장흡충', macro: '흡충' },
    { key: '8', title: '8강', topic: '간흡충', macro: '흡충' },
    { key: '9', title: '9강', topic: '장내조충', macro: '조충' },
    { key: '10', title: '10강', topic: '조직내 조충', macro: '조충' },
    { key: '11', title: '11강', topic: '원충 총론', macro: '원충' },
    { key: '12', title: '12강', topic: '장관내 원충', macro: '원충' },
    { key: '13', title: '13강', topic: '열원충', macro: '원충' },
    { key: '15', title: '15강', topic: '세포내 원충', macro: '원충' },
    { key: '16', title: '16강', topic: '리슈만편모충', macro: '원충' },
    { key: '17', title: '17강', topic: '파동편모충', macro: '원충' },
    { key: '19', title: '19강', topic: '의용곤충', macro: '의용곤충' },
    { key: 'unassigned', title: '미지정', topic: '추가 원충', macro: '원충' },
  ];
  const lectureKeys = lectures.map((lecture) => lecture.key);
  const lectureByKey = new Map(lectures.map((lecture) => [lecture.key, lecture]));

  const els = {
    answerForm: document.getElementById('answerForm'),
    answerInput: document.getElementById('answerInput'),
    answerButton: document.getElementById('answerButton'),
    passButton: document.getElementById('passCard'),
    questionCard: document.getElementById('questionCard'),
    koreanPrompt: document.getElementById('koreanPrompt'),
    scientificPrompt: document.getElementById('scientificPrompt'),
    macroBadge: document.getElementById('macroBadge'),
    lectureBadge: document.getElementById('lectureBadge'),
    questionCounter: document.getElementById('questionCounter'),
    feedback: document.getElementById('feedback'),
    restartDeck: document.getElementById('restartDeck'),
    changeScope: document.getElementById('changeScope'),
    recentList: document.getElementById('recentList'),
    recentCount: document.getElementById('recentCount'),
    emptyState: document.getElementById('emptyState'),
    progressText: document.getElementById('progressText'),
    progressBar: document.getElementById('progressBar'),
    correctCount: document.getElementById('correctCount'),
    wrongCount: document.getElementById('wrongCount'),
    skippedCount: document.getElementById('skippedCount'),
    accuracyValue: document.getElementById('accuracyValue'),
    streakValue: document.getElementById('streakValue'),
    completionCard: document.getElementById('completionCard'),
    completionSummary: document.getElementById('completionSummary'),
    repeatRound: document.getElementById('repeatRound'),
    scopeSummary: document.getElementById('scopeSummary'),
    scopeDialog: document.getElementById('scopeDialog'),
    scopeForm: document.getElementById('scopeForm'),
    lectureOptions: document.getElementById('lectureOptions'),
    scopeCount: document.getElementById('scopeCount'),
    scopeCancel: document.getElementById('scopeCancel'),
    scopeClose: document.getElementById('scopeClose'),
    applyScope: document.getElementById('applyScope'),
    openScope: document.getElementById('openScope'),
    openHelp: document.getElementById('openHelp'),
    helpDialog: document.getElementById('helpDialog'),
  };

  let activeLectures = new Set(lectureKeys);
  let setupComplete = false;
  let deck = [];
  let position = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let streak = 0;
  let recent = [];
  let advanceTimer = null;
  let locked = true;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function scientificKey(value) {
    return String(value).trim().toLowerCase();
  }

  function cardLectureKeys(card) {
    return card.lectureNumbers.length ? card.lectureNumbers.map(String) : ['unassigned'];
  }

  function cardInScope(card) {
    return cardLectureKeys(card).some((key) => activeLectures.has(key));
  }

  function scopeIndices() {
    return cards.map((_, index) => index).filter((index) => cardInScope(cards[index]));
  }

  function shuffle(values) {
    const output = [...values];
    for (let i = output.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
  }

  function currentCard() {
    return position < deck.length ? cards[deck[position]] : null;
  }

  function setInputEnabled(enabled) {
    locked = !enabled;
    els.answerInput.disabled = !enabled;
    els.answerButton.disabled = !enabled;
    els.passButton.disabled = !enabled;
    els.restartDeck.disabled = !setupComplete;
  }

  function setFeedback(message, type) {
    els.feedback.textContent = message || '';
    els.feedback.className = `feedback${type ? ` ${type}` : ''}`;
  }

  function startRound() {
    clearTimeout(advanceTimer);
    deck = shuffle(scopeIndices());
    position = 0;
    correct = 0;
    wrong = 0;
    skipped = 0;
    streak = 0;
    recent = [];
    els.completionCard.hidden = true;
    els.questionCard.hidden = false;
    els.answerForm.hidden = false;
    els.answerInput.value = '';
    setFeedback('');
    renderRecent();
    renderStats();
    renderQuestion();
    setInputEnabled(true);
    els.answerInput.focus();
  }

  function renderQuestion() {
    const card = currentCard();
    if (!card) {
      finishRound();
      return;
    }
    els.questionCard.classList.remove('correct', 'wrong', 'skipped');
    els.macroBadge.textContent = card.macro;
    els.lectureBadge.textContent = card.lecture;
    els.koreanPrompt.textContent = card.koreanName;
    els.scientificPrompt.textContent = card.scientificName;
    els.questionCounter.textContent = `${position + 1} / ${deck.length}번째 카드`;
    els.answerInput.value = '';
  }

  function renderStats() {
    const completed = correct + wrong + skipped;
    const accuracy = completed ? `${Math.round((correct / completed) * 100)}%` : '—';
    const progress = deck.length ? (completed / deck.length) * 100 : 0;
    els.progressText.textContent = `${completed} / ${deck.length}`;
    els.progressBar.style.width = `${progress}%`;
    els.correctCount.textContent = String(correct);
    els.wrongCount.textContent = String(wrong);
    els.skippedCount.textContent = String(skipped);
    els.accuracyValue.textContent = accuracy;
    els.streakValue.textContent = String(streak);
  }

  function renderRecent() {
    els.emptyState.hidden = recent.length > 0;
    els.recentCount.textContent = `${recent.length}개`;
    els.recentList.innerHTML = recent.map((item) => {
      const card = cards[item.cardIndex];
      const outcome = item.outcome || 'correct';
      const symbol = outcome === 'correct' ? '✓' : outcome === 'wrong' ? '×' : '→';
      const label = outcome === 'correct' ? '정답' : outcome === 'wrong' ? '오답' : '패스';
      return `<article class="recent-item ${outcome}">
        <span>${symbol}</span>
        <div><strong>${escapeHtml(card.koreanName)}</strong><em>${escapeHtml(card.scientificName)}</em></div>
        <small>${label}</small>
      </article>`;
    }).join('');
  }

  function finishRound() {
    setInputEnabled(false);
    els.questionCard.hidden = true;
    els.answerForm.hidden = true;
    setFeedback('');
    const completed = correct + wrong + skipped;
    const accuracy = completed ? Math.round((correct / completed) * 100) : 100;
    els.completionSummary.textContent = `정답 ${correct}개 · 오답 ${wrong}개 · 패스 ${skipped}개 · 정확도 ${accuracy}%`;
    els.completionCard.hidden = false;
  }

  function sanitizeInput() {
    const original = els.answerInput.value;
    const cleaned = original.replace(/[^A-Za-z .-]/g, '');
    if (original !== cleaned) {
      els.answerInput.value = cleaned;
      setFeedback('학명은 영문으로만 입력할 수 있습니다.', 'error');
    }
  }

  function submitAnswer() {
    if (locked || !currentCard()) return;
    sanitizeInput();
    const card = currentCard();
    const submitted = scientificKey(els.answerInput.value);
    if (!submitted) {
      setFeedback('학명을 입력해 주세요.', 'error');
      return;
    }
    if (submitted === scientificKey(card.scientificName)) {
      correct += 1;
      streak += 1;
      recent.unshift({ cardIndex: deck[position], outcome: 'correct' });
      recent = recent.slice(0, 8);
      els.questionCard.classList.add('correct');
      setFeedback(`정답 — ${card.scientificName}`, 'success');
      renderRecent();
      renderStats();
      scheduleAdvance(720);
    } else {
      wrong += 1;
      streak = 0;
      recent.unshift({ cardIndex: deck[position], outcome: 'wrong' });
      recent = recent.slice(0, 8);
      els.questionCard.classList.add('wrong');
      setFeedback(`오답 — 정답: ${card.scientificName}`, 'error');
      renderRecent();
      renderStats();
      scheduleAdvance(1000);
    }
  }

  function passCard() {
    if (locked || !currentCard()) return;
    const card = currentCard();
    skipped += 1;
    streak = 0;
    recent.unshift({ cardIndex: deck[position], outcome: 'skipped' });
    recent = recent.slice(0, 8);
    els.questionCard.classList.add('skipped');
    setFeedback(`패스 — 정답: ${card.scientificName}`, 'skip');
    renderRecent();
    renderStats();
    scheduleAdvance(1000);
  }

  function scheduleAdvance(delay) {
    setInputEnabled(false);
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      position += 1;
      if (position >= deck.length) finishRound();
      else {
        renderQuestion();
        setFeedback('');
        setInputEnabled(true);
        els.answerInput.focus();
      }
    }, delay);
  }

  function lectureGroups() {
    return ['선충', '흡충', '조충', '원충', '의용곤충'].map((macro) => ({
      macro,
      items: lectures.filter((lecture) => lecture.macro === macro),
    }));
  }

  function countCardsForLecture(key) {
    return cards.filter((card) => cardLectureKeys(card).includes(key)).length;
  }

  function renderLectureOptions() {
    els.lectureOptions.innerHTML = lectureGroups().map((group) => `<section class="lecture-group">
      <h3>${escapeHtml(group.macro)}</h3>
      <div class="lecture-checks">${group.items.map((lecture) => `<label class="lecture-check">
        <input type="checkbox" value="${lecture.key}" ${activeLectures.has(lecture.key) ? 'checked' : ''}>
        <span><strong>${escapeHtml(lecture.title)}</strong><small>${escapeHtml(lecture.topic)}</small></span>
        <em>${countCardsForLecture(lecture.key)}종</em>
      </label>`).join('')}</div>
    </section>`).join('');
    updateScopeCount();
  }

  function selectedKeys() {
    return [...els.lectureOptions.querySelectorAll('input:checked')].map((input) => input.value);
  }

  function countCardsForKeys(keys) {
    const selected = new Set(keys);
    return cards.filter((card) => cardLectureKeys(card).some((key) => selected.has(key))).length;
  }

  function updateScopeCount() {
    const selected = selectedKeys();
    const count = countCardsForKeys(selected);
    els.scopeCount.textContent = `${selected.length}개 강의 · ${count}종`;
    els.applyScope.disabled = count === 0;
  }

  function updateScopeSummary() {
    const count = scopeIndices().length;
    if (!setupComplete) els.scopeSummary.textContent = '선택 전';
    else if (activeLectures.size === lectureKeys.length) els.scopeSummary.textContent = `전체 ${count}종`;
    else els.scopeSummary.textContent = `${activeLectures.size}개 강의 · ${count}종`;
  }

  function openScopeDialog() {
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
      position += 1;
      if (position >= deck.length) finishRound();
      else {
        renderQuestion();
        setFeedback('');
        setInputEnabled(true);
      }
    }
    renderLectureOptions();
    els.scopeCancel.hidden = !setupComplete;
    els.scopeClose.hidden = !setupComplete;
    els.applyScope.textContent = setupComplete ? '범위 적용하고 다시 시작' : '이 범위로 시작';
    els.scopeDialog.showModal();
  }

  els.answerInput.addEventListener('beforeinput', (event) => {
    if (event.data && /[^A-Za-z .-]/.test(event.data)) {
      event.preventDefault();
      setFeedback('학명은 영문으로만 입력할 수 있습니다.', 'error');
    }
  });
  els.answerInput.addEventListener('input', (event) => { if (!event.isComposing) sanitizeInput(); });
  els.answerInput.addEventListener('compositionend', sanitizeInput);
  els.answerForm.addEventListener('submit', (event) => { event.preventDefault(); submitAnswer(); });
  els.passButton.addEventListener('click', passCard);
  els.restartDeck.addEventListener('click', () => {
    if (setupComplete && window.confirm('현재 기록을 지우고 카드를 다시 섞을까요?')) startRound();
  });
  els.repeatRound.addEventListener('click', startRound);
  els.changeScope.addEventListener('click', openScopeDialog);
  els.openScope.addEventListener('click', openScopeDialog);
  els.openHelp.addEventListener('click', () => els.helpDialog.showModal());
  els.lectureOptions.addEventListener('change', updateScopeCount);
  els.scopeForm.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const checked = button.dataset.preset === 'all';
      els.lectureOptions.querySelectorAll('input').forEach((input) => { input.checked = checked; });
      updateScopeCount();
    });
  });
  els.applyScope.addEventListener('click', (event) => {
    event.preventDefault();
    const selected = selectedKeys();
    if (!selected.length) return;
    activeLectures = new Set(selected);
    setupComplete = true;
    updateScopeSummary();
    els.scopeDialog.close();
    try { localStorage.setItem('parasite-typing-practice-lectures', JSON.stringify(selected)); } catch (_) { /* optional */ }
    startRound();
  });
  els.scopeDialog.addEventListener('cancel', (event) => { if (!setupComplete) event.preventDefault(); });
  els.scopeDialog.addEventListener('click', (event) => { if (event.target === els.scopeDialog && setupComplete) els.scopeDialog.close(); });
  els.helpDialog.addEventListener('click', (event) => { if (event.target === els.helpDialog) els.helpDialog.close(); });

  try {
    const saved = JSON.parse(localStorage.getItem('parasite-typing-practice-lectures'));
    if (Array.isArray(saved) && saved.length && saved.every((key) => lectureByKey.has(key))) activeLectures = new Set(saved);
  } catch (_) { /* optional */ }

  renderLectureOptions();
  updateScopeSummary();
  renderRecent();
  renderStats();
  setInputEnabled(false);
  els.scopeCancel.hidden = true;
  els.scopeClose.hidden = true;
  els.scopeDialog.showModal();
})();
