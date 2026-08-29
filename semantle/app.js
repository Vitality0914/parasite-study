(function () {
  'use strict';

  const DATA = window.PARASITE_DATA;
  if (!DATA || !Array.isArray(DATA.cards) || !Array.isArray(DATA.similarityMatrix)) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">게임 데이터를 불러오지 못했습니다. data.js가 index.html과 같은 폴더에 있는지 확인해 주세요.</p>';
    return;
  }

  const cards = DATA.cards;
  const matrix = DATA.similarityMatrix;
  const lectures = [
    { key: '3', number: 3, title: '3강', topic: '장내선충', macro: '선충' },
    { key: '4', number: 4, title: '4강', topic: '조직내 선충', macro: '선충' },
    { key: '5', number: 5, title: '5강', topic: '사상충', macro: '선충' },
    { key: '6', number: 6, title: '6강', topic: '주혈흡충', macro: '흡충' },
    { key: '7', number: 7, title: '7강', topic: '폐흡충·장흡충', macro: '흡충' },
    { key: '8', number: 8, title: '8강', topic: '간흡충', macro: '흡충' },
    { key: '9', number: 9, title: '9강', topic: '장내조충', macro: '조충' },
    { key: '10', number: 10, title: '10강', topic: '조직내 조충', macro: '조충' },
    { key: '11', number: 11, title: '11강', topic: '원충 총론', macro: '원충' },
    { key: '12', number: 12, title: '12강', topic: '장관내 원충', macro: '원충' },
    { key: '13', number: 13, title: '13강', topic: '열원충', macro: '원충' },
    { key: '15', number: 15, title: '15강', topic: '세포내 원충', macro: '원충' },
    { key: '16', number: 16, title: '16강', topic: '리슈만편모충', macro: '원충' },
    { key: '17', number: 17, title: '17강', topic: '파동편모충', macro: '원충' },
    { key: '19', number: 19, title: '19강', topic: '의용곤충', macro: '의용곤충' },
    { key: 'unassigned', number: null, title: '미지정', topic: '추가 원충', macro: '원충' },
  ];
  const lectureByKey = new Map(lectures.map((lecture) => [lecture.key, lecture]));
  const allLectureKeys = lectures.map((lecture) => lecture.key);
  const exactScientificNames = new Map(cards.map((card, index) => [scientificKey(card.scientificName), index]));

  const els = {
    guessForm: document.getElementById('guessForm'),
    guessInput: document.getElementById('guessInput'),
    suggestions: document.getElementById('suggestions'),
    notice: document.getElementById('notice'),
    hintStrip: document.getElementById('hintStrip'),
    attemptList: document.getElementById('attemptList'),
    emptyState: document.getElementById('emptyState'),
    answerResult: document.getElementById('answerResult'),
    guessCount: document.getElementById('guessCount'),
    bestScore: document.getElementById('bestScore'),
    bestRank: document.getElementById('bestRank'),
    proximityBar: document.getElementById('proximityBar'),
    proximityLabel: document.getElementById('proximityLabel'),
    newGame: document.getElementById('newGame'),
    hintButton: document.getElementById('hintButton'),
    shareButton: document.getElementById('shareButton'),
    giveUpButton: document.getElementById('giveUpButton'),
    openScope: document.getElementById('openScope'),
    scopeDialog: document.getElementById('scopeDialog'),
    scopeForm: document.getElementById('scopeForm'),
    lectureOptions: document.getElementById('lectureOptions'),
    scopeCount: document.getElementById('scopeCount'),
    scopeSummary: document.getElementById('scopeSummary'),
    scopeCancel: document.getElementById('scopeCancel'),
    scopeClose: document.getElementById('scopeClose'),
    applyScope: document.getElementById('applyScope'),
    openHelp: document.getElementById('openHelp'),
    helpDialog: document.getElementById('helpDialog'),
    catalogToggle: document.getElementById('catalogToggle'),
    catalogPanel: document.getElementById('catalogPanel'),
    catalogBody: document.getElementById('catalogBody'),
    toast: document.getElementById('toast'),
  };

  let activeLectures = new Set(allLectureKeys);
  let difficulty = 'hard';
  let setupComplete = false;
  let answerIndex = null;
  let previousAnswerIndex = null;
  let history = [];
  let rankings = new Map();
  let hintLevel = 0;
  let hintMessages = [];
  let gameOver = false;
  let toastTimer = null;
  let sharedAnswerIndex = answerFromUrl();
  let visibleSuggestions = [];
  let activeSuggestion = -1;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function scientificKey(value) {
    return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function setNotice(message) {
    els.notice.textContent = message || '';
  }

  function cardLectureKeys(card) {
    if (!card.lectureNumbers.length) return ['unassigned'];
    return card.lectureNumbers.map(String);
  }

  function cardInScope(card) {
    return cardLectureKeys(card).some((key) => activeLectures.has(key));
  }

  function eligibleIndices() {
    return cards.map((_, index) => index).filter((index) => cardInScope(cards[index]));
  }

  function searchScientificNames(query) {
    const q = scientificKey(query);
    if (!q) return [];
    const guessed = new Set(history.map((item) => item.index));
    return eligibleIndices()
      .filter((index) => !guessed.has(index))
      .map((index) => {
        const name = scientificKey(cards[index].scientificName);
        const relevance = name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : 9;
        return { index, relevance };
      })
      .filter((item) => item.relevance < 9)
      .sort((a, b) => a.relevance - b.relevance || cards[a.index].id - cards[b.index].id)
      .slice(0, 9)
      .map((item) => item.index);
  }

  function hideSuggestions() {
    visibleSuggestions = [];
    activeSuggestion = -1;
    els.suggestions.hidden = true;
    els.suggestions.innerHTML = '';
    els.guessInput.setAttribute('aria-expanded', 'false');
  }

  function renderSuggestions() {
    if (difficulty !== 'easy' || gameOver || !setupComplete) {
      hideSuggestions();
      return;
    }
    visibleSuggestions = searchScientificNames(els.guessInput.value);
    activeSuggestion = visibleSuggestions.length ? 0 : -1;
    if (!visibleSuggestions.length) {
      hideSuggestions();
      return;
    }
    els.suggestions.innerHTML = visibleSuggestions.map((index, position) => {
      const card = cards[index];
      return `<button type="button" class="suggestion${position === activeSuggestion ? ' active' : ''}" role="option" aria-selected="${position === activeSuggestion}" data-index="${index}">
        <strong>${escapeHtml(card.scientificName)}</strong><small>${escapeHtml(card.macro)}</small>
      </button>`;
    }).join('');
    els.suggestions.hidden = false;
    els.guessInput.setAttribute('aria-expanded', 'true');
  }

  function updateActiveSuggestion() {
    [...els.suggestions.querySelectorAll('.suggestion')].forEach((node, position) => {
      const active = position === activeSuggestion;
      node.classList.toggle('active', active);
      node.setAttribute('aria-selected', String(active));
      if (active) node.scrollIntoView({ block: 'nearest' });
    });
  }

  function countCardsForLecture(key) {
    return cards.filter((card) => cardLectureKeys(card).includes(key)).length;
  }

  function buildRankings() {
    rankings = new Map();
    if (answerIndex === null) return;
    const values = eligibleIndices()
      .filter((index) => index !== answerIndex)
      .map((index) => ({ index, score: matrix[answerIndex][index] }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    values.forEach((item) => {
      const rank = 1 + values.filter((other) => other.score > item.score + Number.EPSILON).length;
      rankings.set(item.index, { rank, poolSize: values.length });
    });
  }

  function answerFromUrl() {
    try {
      const key = new URL(window.location.href).searchParams.get('answer');
      if (!key) return null;
      const index = cards.findIndex((card) => card.slug === key || String(card.id) === key);
      return index >= 0 ? index : null;
    } catch (_) {
      return null;
    }
  }

  function pickRandomAnswer() {
    const pool = eligibleIndices();
    if (!pool.length) return null;
    const withoutPrevious = pool.length > 1 ? pool.filter((index) => index !== previousAnswerIndex) : pool;
    return withoutPrevious[Math.floor(Math.random() * withoutPrevious.length)];
  }

  function resetUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('answer');
      window.history.replaceState({}, '', url.href);
    } catch (_) { /* file URLs can restrict history changes */ }
  }

  function setGameControls(enabled) {
    els.guessInput.disabled = !enabled;
    els.newGame.disabled = !enabled;
    els.hintButton.disabled = !enabled;
    els.shareButton.disabled = !enabled;
    els.giveUpButton.disabled = !enabled;
  }

  function startGame(preferredIndex, keepSharedUrl) {
    previousAnswerIndex = answerIndex;
    const preferredIsValid = Number.isInteger(preferredIndex) && cardInScope(cards[preferredIndex]);
    const chosen = preferredIsValid ? preferredIndex : pickRandomAnswer();
    if (chosen === null) {
      setNotice('출제할 수 있는 카드가 없습니다. 강의를 한 개 이상 선택해 주세요.');
      return;
    }
    answerIndex = chosen;
    history = [];
    hintLevel = 0;
    hintMessages = [];
    gameOver = false;
    buildRankings();
    els.guessInput.value = '';
    hideSuggestions();
    els.answerResult.hidden = true;
    els.answerResult.innerHTML = '';
    els.hintStrip.hidden = true;
    els.hintStrip.innerHTML = '';
    setGameControls(true);
    setNotice('');
    refreshAttempts();
    updateStatus();
    if (!keepSharedUrl) resetUrl();
    els.guessInput.focus();
  }

  function proximity(score) {
    if (score >= 100) return '정답';
    if (score >= 75) return '매우 가까움';
    if (score >= 50) return '가까움';
    if (score >= 25) return '연결됨';
    return '먼 편';
  }

  function scoreColor(score) {
    if (score >= 99.999) return '#237653';
    if (score >= 75) return '#ed6a50';
    if (score >= 50) return '#e7a838';
    if (score >= 25) return '#8eaa72';
    return '#9aa9a3';
  }

  function matchLabel(index) {
    if (index === answerIndex) return '정답';
    const answer = cards[answerIndex];
    const card = cards[index];
    const sameLecture = card.lectureNumbers.some((number) => answer.lectureNumbers.includes(number));
    if (sameLecture) return '같은 강의';
    if (card.macro === answer.macro) return '같은 대분류';
    return '';
  }

  function submitGuess(index, source) {
    if (gameOver || index === null || index === undefined) return;
    if (!cardInScope(cards[index])) {
      setNotice('선택한 강의 범위에 등록되지 않은 학명입니다');
      return;
    }
    if (history.some((item) => item.index === index)) {
      setNotice('이미 입력한 학명입니다');
      return;
    }
    const score = index === answerIndex ? 100 : matrix[answerIndex][index] * 100;
    const rankInfo = rankings.get(index) || { rank: 0, poolSize: eligibleIndices().length - 1 };
    history.push({ index, score, rank: rankInfo.rank, poolSize: rankInfo.poolSize, source: source || 'guess' });
    els.guessInput.value = '';
    hideSuggestions();
    setNotice('');
    refreshAttempts();
    updateStatus();
    if (index === answerIndex) finishGame(true);
    else els.guessInput.focus();
  }

  function refreshAttempts() {
    els.emptyState.hidden = history.length > 0;
    if (!history.length) {
      els.attemptList.innerHTML = '';
      return;
    }
    const latestIndex = history[history.length - 1].index;
    const sorted = [...history].sort((a, b) => b.score - a.score || a.rank - b.rank || a.index - b.index);
    els.attemptList.innerHTML = sorted.map((item) => {
      const card = cards[item.index];
      const label = matchLabel(item.index);
      const winner = item.index === answerIndex;
      const rank = winner ? 'TARGET' : `${item.rank} / ${item.poolSize}`;
      return `<article class="attempt-row${item.index === latestIndex ? ' latest' : ''}${winner ? ' winner' : ''}">
        <div class="attempt-name">
          <strong>${escapeHtml(card.scientificName)}${label ? `<span class="match-label">${escapeHtml(label)}</span>` : ''}</strong>
          <em>${escapeHtml(card.lecture)}</em>
        </div>
        <div class="score-cell">
          <span class="score-track"><i style="width:${Math.max(1, item.score)}%;background:${scoreColor(item.score)}"></i></span>
          <strong class="score-value" style="color:${scoreColor(item.score)}">${item.score.toFixed(1)}</strong>
        </div>
        <span class="rank-value">${rank}</span>
      </article>`;
    }).join('');
  }

  function updateStatus() {
    const nonAnswer = history.filter((item) => item.index !== answerIndex);
    const best = nonAnswer.length ? [...nonAnswer].sort((a, b) => b.score - a.score)[0] : null;
    els.guessCount.textContent = String(history.length);
    els.bestScore.textContent = best ? best.score.toFixed(1) : '—';
    els.bestRank.textContent = best ? `#${best.rank}` : '—';
    els.proximityBar.style.width = best ? `${best.score}%` : '0%';
    els.proximityLabel.textContent = best ? proximity(best.score) : '탐색 전';
  }

  function renderAnswerCard(won) {
    const card = cards[answerIndex];
    const sectionOrder = ['형태', '생활사', '역학', '병리', '증상', '진단', '치료', '예방', '기타'];
    const details = sectionOrder
      .filter((section) => Array.isArray(card.sections[section]) && card.sections[section].length)
      .map((section, index) => `<details${index < 2 ? ' open' : ''}>
        <summary>${escapeHtml(section)}</summary>
        <ul>${card.sections[section].map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      </details>`).join('');
    els.answerResult.innerHTML = `
      <span class="result-badge">${won ? '정답입니다' : '이번 정답'}</span>
      <h2 class="result-title">${escapeHtml(card.koreanName)}</h2>
      <p class="result-scientific">${escapeHtml(card.scientificName)}</p>
      <div class="result-meta"><span>${escapeHtml(card.macro)}</span><span>${escapeHtml(card.lecture)}</span><span>카드 ${card.id}</span></div>
      <div class="study-details">${details}</div>`;
    els.answerResult.hidden = false;
    els.answerResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function finishGame(won) {
    gameOver = true;
    hideSuggestions();
    setGameControls(false);
    els.newGame.disabled = false;
    els.shareButton.disabled = false;
    renderAnswerCard(won);
    setNotice(won ? `${history.length}번 만에 정답을 찾았습니다.` : '정답 카드를 펼쳐 복습해 보세요.');
  }

  function useHint() {
    if (gameOver) return;
    const answer = cards[answerIndex];
    hintLevel += 1;
    if (hintLevel === 1) {
      hintMessages.push(`대분류: <strong>${escapeHtml(answer.macro)}</strong>`);
    } else if (hintLevel === 2) {
      hintMessages.push(`강의: <strong>${escapeHtml(answer.lecture)}</strong>`);
    } else {
      const guessed = new Set(history.map((item) => item.index));
      const closest = [...rankings.entries()]
        .filter(([index]) => !guessed.has(index))
        .sort((a, b) => a[1].rank - b[1].rank || a[0] - b[0])[0];
      if (!closest) {
        hintMessages.push('더 이상 추천할 후보가 없습니다.');
        els.hintButton.disabled = true;
      } else {
        hintMessages.push(`가장 가까운 미입력 학명 <strong>${escapeHtml(cards[closest[0]].scientificName)}</strong>을 기록에 추가했습니다.`);
        submitGuess(closest[0], 'hint');
      }
    }
    els.hintStrip.innerHTML = hintMessages.join('<span aria-hidden="true"> · </span>');
    els.hintStrip.hidden = false;
  }

  async function shareGame() {
    if (answerIndex === null) return;
    const card = cards[answerIndex];
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('answer', card.slug);
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url.href);
      else {
        const area = document.createElement('textarea');
        area.value = url.href;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      showToast('같은 정답으로 시작하는 주소를 복사했습니다.');
    } catch (_) {
      showToast('주소 복사가 제한되었습니다. 브라우저 주소창에서 복사해 주세요.');
    }
  }

  function lectureGroups() {
    const macros = ['선충', '흡충', '조충', '원충', '의용곤충'];
    return macros.map((macro) => ({ macro, items: lectures.filter((lecture) => lecture.macro === macro) }));
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

  function selectedLectureKeysFromDialog() {
    return [...els.lectureOptions.querySelectorAll('input:checked')].map((input) => input.value);
  }

  function countCardsForKeys(keys) {
    const selected = new Set(keys);
    return cards.filter((card) => cardLectureKeys(card).some((key) => selected.has(key))).length;
  }

  function updateScopeCount() {
    const selected = selectedLectureKeysFromDialog();
    const count = countCardsForKeys(selected);
    els.scopeCount.textContent = `${selected.length}개 강의 · ${count}종`;
    els.applyScope.disabled = count === 0;
  }

  function updateScopeSummary() {
    const count = eligibleIndices().length;
    const mode = difficulty === 'easy' ? 'Easy' : 'Hard';
    if (!setupComplete) els.scopeSummary.textContent = '선택 전';
    else if (activeLectures.size === allLectureKeys.length) els.scopeSummary.textContent = `${mode} · 전체 ${count}종`;
    else els.scopeSummary.textContent = `${mode} · ${activeLectures.size}강 · ${count}종`;
  }

  function renderCatalog() {
    els.catalogBody.innerHTML = cards.map((card) => {
      const lectureLabel = card.lectureNumbers.length ? `${card.lectureNumbers.join('·')}강` : '강의 미지정';
      return `<tr><td>${card.id}</td><td><i>${escapeHtml(card.scientificName)}</i></td><td>${escapeHtml(lectureLabel)}</td></tr>`;
    }).join('');
  }

  function sanitizeScientificInput() {
    const original = els.guessInput.value;
    const cleaned = original.replace(/[^A-Za-z .-]/g, '');
    if (original !== cleaned) {
      els.guessInput.value = cleaned;
      setNotice('학명은 영문으로만 입력할 수 있습니다');
    } else if (els.notice.textContent === '학명은 영문으로만 입력할 수 있습니다') {
      setNotice('');
    }
  }

  els.guessInput.addEventListener('beforeinput', (event) => {
    if (event.data && /[^A-Za-z .-]/.test(event.data)) {
      event.preventDefault();
      setNotice('학명은 영문으로만 입력할 수 있습니다');
    }
  });
  els.guessInput.addEventListener('input', (event) => {
    if (!event.isComposing) {
      sanitizeScientificInput();
      renderSuggestions();
    }
  });
  els.guessInput.addEventListener('compositionend', () => {
    sanitizeScientificInput();
    renderSuggestions();
  });
  els.guessInput.addEventListener('keydown', (event) => {
    if (difficulty !== 'easy' || els.suggestions.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeSuggestion = Math.min(activeSuggestion + 1, visibleSuggestions.length - 1);
      updateActiveSuggestion();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeSuggestion = Math.max(activeSuggestion - 1, 0);
      updateActiveSuggestion();
    } else if (event.key === 'Escape') {
      hideSuggestions();
    }
  });
  els.guessInput.addEventListener('blur', () => setTimeout(hideSuggestions, 130));
  els.suggestions.addEventListener('mousedown', (event) => event.preventDefault());
  els.suggestions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-index]');
    if (button) submitGuess(Number(button.dataset.index));
  });
  els.guessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!setupComplete || gameOver) return;
    sanitizeScientificInput();
    const value = scientificKey(els.guessInput.value);
    if (!value) {
      setNotice('학명을 입력해 주세요');
      return;
    }
    let index = exactScientificNames.get(value);
    if (index === undefined && difficulty === 'easy' && activeSuggestion >= 0) index = visibleSuggestions[activeSuggestion];
    if (index === undefined) {
      setNotice('등록되지 않은 학명입니다');
      return;
    }
    if (!cardInScope(cards[index])) {
      setNotice('선택한 강의 범위에 등록되지 않은 학명입니다');
      return;
    }
    submitGuess(index);
  });

  els.newGame.addEventListener('click', () => startGame());
  els.hintButton.addEventListener('click', useHint);
  els.giveUpButton.addEventListener('click', () => {
    if (!gameOver && window.confirm('정답을 확인하고 이번 문제를 끝낼까요?')) finishGame(false);
  });
  els.shareButton.addEventListener('click', shareGame);
  els.openHelp.addEventListener('click', () => els.helpDialog.showModal());
  els.openScope.addEventListener('click', () => {
    hideSuggestions();
    renderLectureOptions();
    const difficultyInput = els.scopeForm.querySelector(`input[name="difficulty"][value="${difficulty}"]`);
    if (difficultyInput) difficultyInput.checked = true;
    els.scopeCancel.hidden = !setupComplete;
    els.scopeClose.hidden = !setupComplete;
    els.applyScope.textContent = setupComplete ? '범위 적용하고 새 문제' : '이 범위로 시작';
    els.scopeDialog.showModal();
  });
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
    const selected = selectedLectureKeysFromDialog();
    if (!selected.length) return;
    activeLectures = new Set(selected);
    difficulty = els.scopeForm.querySelector('input[name="difficulty"]:checked')?.value || 'hard';
    setupComplete = true;
    updateScopeSummary();
    els.scopeDialog.close();
    try { localStorage.setItem('parasite-semantle-lectures', JSON.stringify(selected)); } catch (_) { /* optional preference */ }
    try { localStorage.setItem('parasite-semantle-difficulty', difficulty); } catch (_) { /* optional preference */ }
    const preferred = sharedAnswerIndex !== null && cardInScope(cards[sharedAnswerIndex]) ? sharedAnswerIndex : null;
    startGame(preferred, preferred !== null);
    sharedAnswerIndex = null;
  });
  els.scopeDialog.addEventListener('cancel', (event) => {
    if (!setupComplete) event.preventDefault();
  });
  els.scopeDialog.addEventListener('click', (event) => {
    if (event.target === els.scopeDialog && setupComplete) els.scopeDialog.close();
  });
  els.helpDialog.addEventListener('click', (event) => {
    if (event.target === els.helpDialog) els.helpDialog.close();
  });
  els.catalogToggle.addEventListener('click', () => {
    const expanded = els.catalogToggle.getAttribute('aria-expanded') === 'true';
    els.catalogToggle.setAttribute('aria-expanded', String(!expanded));
    els.catalogPanel.hidden = expanded;
    els.catalogToggle.querySelector('i').textContent = expanded ? '＋' : '−';
  });

  try {
    const saved = JSON.parse(localStorage.getItem('parasite-semantle-lectures'));
    if (Array.isArray(saved) && saved.length && saved.every((key) => lectureByKey.has(key))) activeLectures = new Set(saved);
  } catch (_) { /* local storage is optional */ }
  try {
    const savedDifficulty = localStorage.getItem('parasite-semantle-difficulty');
    if (savedDifficulty === 'easy' || savedDifficulty === 'hard') difficulty = savedDifficulty;
  } catch (_) { /* local storage is optional */ }

  renderLectureOptions();
  renderCatalog();
  updateScopeSummary();
  setGameControls(false);
  refreshAttempts();
  updateStatus();
  els.scopeCancel.hidden = true;
  els.scopeClose.hidden = true;
  const initialDifficulty = els.scopeForm.querySelector(`input[name="difficulty"][value="${difficulty}"]`);
  if (initialDifficulty) initialDifficulty.checked = true;
  els.scopeDialog.showModal();
})();
