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
  const els = {
    answerForm: document.getElementById('answerForm'),
    answerInput: document.getElementById('answerInput'),
    answerButton: document.getElementById('answerButton'),
    passButton: document.getElementById('passCard'),
    questionCard: document.getElementById('questionCard'),
    koreanPrompt: document.getElementById('koreanPrompt'),
    questionLabel: document.getElementById('questionLabel'),
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

  const allCardIds = cards.map((card) => String(card.id));
  const validCardIds = new Set(allCardIds);
  let activeCardIds = new Set(allCardIds);
  let draftCardIds = new Set(allCardIds);
  let writingMode = null;
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

  function normalizedKorean(value) {
    return String(value).trim().replace(/\s+/g, ' ');
  }

  function answerForCard(card) {
    return writingMode === 'en-to-ko' ? card.koreanName : card.scientificName;
  }

  function cardLectureKeys(card) {
    return card.lectureNumbers.length ? card.lectureNumbers.map(String) : ['unassigned'];
  }

  function cardInScope(card) {
    return activeCardIds.has(String(card.id));
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
    const reverse = writingMode === 'en-to-ko';
    els.questionLabel.textContent = reverse ? '이 학명의 한글 이름은?' : '이 기생충의 학명은?';
    els.koreanPrompt.textContent = reverse ? card.scientificName : card.koreanName;
    els.koreanPrompt.classList.toggle('scientific-question', reverse);
    els.answerInput.placeholder = reverse ? '한글 이름' : 'Genus species';
    els.answerInput.lang = reverse ? 'ko' : 'en';
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
    if (writingMode === 'en-to-ko') return;
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
    const answer = answerForCard(card);
    const submitted = writingMode === 'en-to-ko' ? normalizedKorean(els.answerInput.value) : scientificKey(els.answerInput.value);
    if (!submitted) {
      setFeedback(writingMode === 'en-to-ko' ? '한글 이름을 입력해 주세요.' : '학명을 입력해 주세요.', 'error');
      return;
    }
    const expected = writingMode === 'en-to-ko' ? normalizedKorean(answer) : scientificKey(answer);
    if (submitted === expected) {
      correct += 1;
      streak += 1;
      recent.unshift({ cardIndex: deck[position], outcome: 'correct' });
      recent = recent.slice(0, 8);
      els.questionCard.classList.add('correct');
      setFeedback(`정답 — ${answer}`, 'success');
      renderRecent();
      renderStats();
      scheduleAdvance(720);
    } else {
      wrong += 1;
      streak = 0;
      recent.unshift({ cardIndex: deck[position], outcome: 'wrong' });
      recent = recent.slice(0, 8);
      els.questionCard.classList.add('wrong');
      setFeedback(`오답 — 정답: ${answer}`, 'error');
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
    setFeedback(`패스 — 정답: ${answerForCard(card)}`, 'skip');
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

  function cardIdsForLecture(key) {
    return cards.filter((card) => cardLectureKeys(card).includes(key)).map((card) => String(card.id));
  }

  function renderLectureOptions() {
    els.lectureOptions.innerHTML = lectureGroups().map((group) => `<section class="lecture-group">
      <h3>${escapeHtml(group.macro)}</h3>
      <div class="lecture-checks">${group.items.map((lecture) => {
        const lectureCardIds = cardIdsForLecture(lecture.key);
        const selectedCount = lectureCardIds.filter((id) => draftCardIds.has(id)).length;
        return `<div class="lecture-block">
          <div class="lecture-row">
            <label class="lecture-check">
              <input class="lecture-master" type="checkbox" data-lecture="${lecture.key}" ${selectedCount === lectureCardIds.length ? 'checked' : ''}>
              <span><strong>${escapeHtml(lecture.title)}</strong><small>${escapeHtml(lecture.topic)}</small></span>
              <em>${selectedCount}/${lectureCardIds.length}종</em>
            </label>
            <button class="lecture-toggle" type="button" data-lecture="${lecture.key}" aria-expanded="false" aria-label="${escapeHtml(lecture.title)} 기생충 목록 열기">⌄</button>
          </div>
          <div class="parasite-options" data-panel="${lecture.key}" hidden>${lectureCardIds.map((id) => {
            const card = cards.find((item) => String(item.id) === id);
            return `<label class="parasite-check"><input class="parasite-check-input" type="checkbox" data-card-id="${id}" ${draftCardIds.has(id) ? 'checked' : ''}><span><strong>${escapeHtml(card.koreanName)}</strong><em>${escapeHtml(card.scientificName)}</em></span></label>`;
          }).join('')}</div>
        </div>`;
      }).join('')}</div>
    </section>`).join('');
    syncLectureMasters();
    updateScopeCount();
  }

  function syncLectureMasters() {
    els.lectureOptions.querySelectorAll('.lecture-master').forEach((input) => {
      const ids = cardIdsForLecture(input.dataset.lecture);
      const count = ids.filter((id) => draftCardIds.has(id)).length;
      input.checked = count === ids.length;
      input.indeterminate = count > 0 && count < ids.length;
      const countLabel = input.closest('.lecture-check').querySelector('em');
      countLabel.textContent = `${count}/${ids.length}종`;
    });
    els.lectureOptions.querySelectorAll('.parasite-check-input').forEach((input) => {
      input.checked = draftCardIds.has(input.dataset.cardId);
    });
  }

  function updateScopeCount() {
    const fullLectures = lectures.filter((lecture) => cardIdsForLecture(lecture.key).every((id) => draftCardIds.has(id))).length;
    els.scopeCount.textContent = `${fullLectures}개 강의 전체 · ${draftCardIds.size}종 선택`;
    els.applyScope.disabled = draftCardIds.size === 0;
  }

  function updateScopeSummary() {
    const count = scopeIndices().length;
    if (!setupComplete) els.scopeSummary.textContent = '선택 전';
    else if (activeCardIds.size === cards.length) els.scopeSummary.textContent = `전체 ${count}종`;
    else els.scopeSummary.textContent = `${count}종 선택`;
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
    draftCardIds = new Set(activeCardIds);
    renderLectureOptions();
    els.scopeForm.querySelectorAll('input[name="writingMode"]').forEach((input) => { input.checked = input.value === writingMode; });
    els.scopeCancel.hidden = !setupComplete;
    els.scopeClose.hidden = !setupComplete;
    els.applyScope.textContent = setupComplete ? '범위 적용하고 다시 시작' : '이 범위로 시작';
    els.scopeDialog.showModal();
  }

  els.answerInput.addEventListener('beforeinput', (event) => {
    if (writingMode !== 'en-to-ko' && event.data && /[^A-Za-z .-]/.test(event.data)) {
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
  els.lectureOptions.addEventListener('click', (event) => {
    const button = event.target.closest('.lecture-toggle');
    if (!button) return;
    const panel = els.lectureOptions.querySelector(`[data-panel="${button.dataset.lecture}"]`);
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    button.textContent = expanded ? '⌄' : '⌃';
    panel.hidden = expanded;
  });
  els.lectureOptions.addEventListener('change', (event) => {
    if (event.target.matches('.lecture-master')) {
      cardIdsForLecture(event.target.dataset.lecture).forEach((id) => {
        if (event.target.checked) draftCardIds.add(id); else draftCardIds.delete(id);
      });
    } else if (event.target.matches('.parasite-check-input')) {
      if (event.target.checked) draftCardIds.add(event.target.dataset.cardId);
      else draftCardIds.delete(event.target.dataset.cardId);
    }
    syncLectureMasters();
    updateScopeCount();
  });
  els.scopeForm.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      draftCardIds = button.dataset.preset === 'all' ? new Set(allCardIds) : new Set();
      syncLectureMasters();
      updateScopeCount();
    });
  });
  els.applyScope.addEventListener('click', (event) => {
    event.preventDefault();
    const selectedMode = els.scopeForm.querySelector('input[name="writingMode"]:checked')?.value;
    if (!selectedMode) {
      window.alert('쓰기 모드를 선택해 주세요.');
      return;
    }
    if (!draftCardIds.size) return;
    writingMode = selectedMode;
    activeCardIds = new Set(draftCardIds);
    setupComplete = true;
    updateScopeSummary();
    els.scopeDialog.close();
    try { localStorage.setItem('parasite-typing-cards', JSON.stringify([...activeCardIds])); } catch (_) { /* optional */ }
    startRound();
  });
  els.scopeDialog.addEventListener('cancel', (event) => { if (!setupComplete) event.preventDefault(); });
  els.scopeDialog.addEventListener('click', (event) => { if (event.target === els.scopeDialog && setupComplete) els.scopeDialog.close(); });
  els.helpDialog.addEventListener('click', (event) => { if (event.target === els.helpDialog) els.helpDialog.close(); });

  try {
    const saved = JSON.parse(localStorage.getItem('parasite-typing-cards'));
    if (Array.isArray(saved) && saved.length && saved.every((id) => validCardIds.has(String(id)))) activeCardIds = new Set(saved.map(String));
  } catch (_) { /* optional */ }

  draftCardIds = new Set(activeCardIds);
  renderLectureOptions();
  updateScopeSummary();
  renderRecent();
  renderStats();
  setInputEnabled(false);
  els.scopeCancel.hidden = true;
  els.scopeClose.hidden = true;
  els.scopeDialog.showModal();
})();
