// State
let correctCount = 0;
let wrongCount = 0;
let answered = new Set();
let currentCategory = 'all';
let answerMap = {};
let shuffledOptions = {}; // stores shuffled options & correct index per question

const letters = ['A', 'B', 'C', 'D'];
const categoryLabels = {
    tones: 'Tones', pronouns: 'Pronouns', sentences: 'Sentences',
    vocabulary: 'Vocabulary', days: 'Days', months: 'Months',
    numbers: 'Numbers', greetings: 'Greetings'
};

// DOM refs
const quizContainer = document.getElementById('quizContainer');
const correctEl = document.getElementById('correctCount');
const wrongEl = document.getElementById('wrongCount');
const progressEl = document.getElementById('progressCount');
const progressBar = document.getElementById('progressBar');
const scrollBtn = document.getElementById('scrollTopBtn');
const categoryNav = document.getElementById('categoryNav');
const resetBtn = document.getElementById('resetBtn');

// Modal refs
const completionModal = document.getElementById('completionModal');
const resetModal = document.getElementById('resetModal');
const modalCorrect = document.getElementById('modalCorrect');
const modalWrong = document.getElementById('modalWrong');
const modalPercent = document.getElementById('modalPercent');
const modalGrade = document.getElementById('modalGrade');
const modalClose = document.getElementById('modalClose');
const modalRestart = document.getElementById('modalRestart');
const resetCancel = document.getElementById('resetCancel');
const resetConfirm = document.getElementById('resetConfirm');

// ===== Shuffle Logic =====
// Fisher-Yates shuffle
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Shuffle options for all questions and store the mapping
function shuffleAllOptions() {
    shuffledOptions = {};
    allQuestions.forEach(q => {
        // Create array of {text, originalIndex}
        const indexed = q.opts.map((opt, i) => ({ text: opt, origIdx: i }));
        const shuffled = shuffleArray(indexed);
        // Find where the correct answer ended up
        const newCorrectIdx = shuffled.findIndex(item => item.origIdx === q.ans);
        shuffledOptions[q.id] = {
            opts: shuffled.map(item => item.text),
            ans: newCorrectIdx,
            // Map: new index -> original index
            indexMap: shuffled.map(item => item.origIdx)
        };
    });
}

// Get shuffled data for a question
function getShuffled(qid) {
    return shuffledOptions[qid];
}

// ===== Render =====
function renderQuestions(category) {
    const qs = category === 'all' ? allQuestions : allQuestions.filter(q => q.cat === category);
    quizContainer.innerHTML = '';

    if (qs.length === 0) {
        quizContainer.innerHTML = '<div style="text-align:center; padding:60px 20px; color: var(--text-secondary);"><p style="font-size:18px;">No questions in this category.</p></div>';
        return;
    }

    qs.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.id = `q-${q.id}`;
        card.style.animationDelay = `${Math.min(idx * 0.03, 1)}s`;

        const sh = getShuffled(q.id);
        let optionsHTML = '';
        sh.opts.forEach((opt, oi) => {
            optionsHTML += `
                <button class="option-btn" id="q${q.id}-opt${oi}" data-qid="${q.id}" data-oidx="${oi}" onclick="handleAnswer(${q.id}, ${oi}, this)">
                    <span class="option-letter">${letters[oi]}</span>
                    <span class="option-text">${opt}</span>
                </button>`;
        });

        card.innerHTML = `
            <div class="q-header">
                <span class="q-number">Q${q.id}</span>
                <span class="q-category">${categoryLabels[q.cat] || q.cat}</span>
                <span class="q-text">${q.q}</span>
            </div>
            <div class="options" id="opts-${q.id}">${optionsHTML}</div>
            <div id="result-${q.id}"></div>`;

        quizContainer.appendChild(card);

        // Restore state if already answered
        if (answered.has(q.id)) {
            restoreAnswer(q.id);
        }
    });
}

function handleAnswer(qid, selectedIdx, btn) {
    if (answered.has(qid)) return;
    answered.add(qid);
    answerMap[qid] = selectedIdx;

    const q = allQuestions.find(x => x.id === qid);
    const sh = getShuffled(qid);
    const isCorrect = selectedIdx === sh.ans;
    const optsDiv = document.getElementById(`opts-${qid}`);
    const resultDiv = document.getElementById(`result-${qid}`);
    const card = document.getElementById(`q-${qid}`);
    const allBtns = optsDiv.querySelectorAll('.option-btn');

    // Disable all & dim
    allBtns.forEach(b => b.classList.add('disabled'));

    // Highlight correct
    const correctBtn = optsDiv.querySelector(`[data-oidx="${sh.ans}"]`);
    correctBtn.classList.add('correct');
    correctBtn.classList.remove('disabled');

    if (isCorrect) {
        correctCount++;
        card.classList.add('answered-correct');
        resultDiv.innerHTML = '<div class="result-badge correct-badge">✅ Correct! Well done!</div>';
    } else {
        wrongCount++;
        btn.classList.add('wrong');
        card.classList.add('answered-wrong');
        resultDiv.innerHTML = `<div class="result-badge wrong-badge">❌ Wrong! Correct answer: ${letters[sh.ans]}. ${sh.opts[sh.ans]}</div>`;
    }

    updateScore();
    saveState();

    // Check if all questions are answered
    if (answered.size === allQuestions.length) {
        setTimeout(showCompletionModal, 800);
    }
}

function restoreAnswer(qid) {
    const q = allQuestions.find(x => x.id === qid);
    const sh = getShuffled(qid);
    const optsDiv = document.getElementById(`opts-${qid}`);
    const resultDiv = document.getElementById(`result-${qid}`);
    const card = document.getElementById(`q-${qid}`);
    if (!optsDiv || !resultDiv) return;

    const selectedIdx = answerMap[qid] !== undefined ? answerMap[qid] : sh.ans;
    const isCorrect = selectedIdx === sh.ans;
    const allBtns = optsDiv.querySelectorAll('.option-btn');

    allBtns.forEach(b => b.classList.add('disabled'));

    const correctBtn = optsDiv.querySelector(`[data-oidx="${sh.ans}"]`);
    correctBtn.classList.add('correct');
    correctBtn.classList.remove('disabled');

    if (isCorrect) {
        card.classList.add('answered-correct');
        resultDiv.innerHTML = '<div class="result-badge correct-badge">✅ Correct! Well done!</div>';
    } else {
        const wrongBtn = optsDiv.querySelector(`[data-oidx="${selectedIdx}"]`);
        if (wrongBtn) wrongBtn.classList.add('wrong');
        card.classList.add('answered-wrong');
        resultDiv.innerHTML = `<div class="result-badge wrong-badge">❌ Wrong! Correct answer: ${letters[sh.ans]}. ${sh.opts[sh.ans]}</div>`;
    }
}

function updateScore() {
    const animateBump = (el) => {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    };

    correctEl.textContent = correctCount;
    wrongEl.textContent = wrongCount;
    animateBump(correctEl);
    animateBump(wrongEl);

    const total = answered.size;
    const totalQuestions = allQuestions.length;
    progressEl.textContent = `${total}/${totalQuestions}`;
    progressBar.style.width = `${(total / totalQuestions) * 100}%`;
}

function saveState() {
    localStorage.setItem('chinese_mcq_state', JSON.stringify({
        answered: [...answered],
        answers: answerMap,
        correct: correctCount,
        wrong: wrongCount,
        shuffledOptions: shuffledOptions
    }));
}

// ===== Completion Modal =====
function showCompletionModal() {
    const total = allQuestions.length;
    const percent = Math.round((correctCount / total) * 100);

    modalCorrect.textContent = correctCount;
    modalWrong.textContent = wrongCount;
    modalPercent.textContent = `${percent}%`;

    let gradeText, gradeClass;
    if (percent >= 90) { gradeText = '🏆 S Grade — Outstanding!'; gradeClass = 'grade-s'; }
    else if (percent >= 70) { gradeText = '⭐ A Grade — Great Job!'; gradeClass = 'grade-a'; }
    else if (percent >= 50) { gradeText = '📚 B Grade — Good Effort!'; gradeClass = 'grade-b'; }
    else { gradeText = '💪 C Grade — Keep Practicing!'; gradeClass = 'grade-c'; }

    modalGrade.textContent = gradeText;
    modalGrade.className = 'modal-grade ' + gradeClass;

    completionModal.classList.add('active');
}

modalClose.addEventListener('click', () => {
    completionModal.classList.remove('active');
});

modalRestart.addEventListener('click', () => {
    completionModal.classList.remove('active');
    resetQuiz();
});

// ===== Reset =====
resetBtn.addEventListener('click', () => {
    if (answered.size === 0) return;
    resetModal.classList.add('active');
});

resetCancel.addEventListener('click', () => {
    resetModal.classList.remove('active');
});

resetConfirm.addEventListener('click', () => {
    resetModal.classList.remove('active');
    resetQuiz();
});

function resetQuiz() {
    correctCount = 0;
    wrongCount = 0;
    answered = new Set();
    answerMap = {};
    localStorage.removeItem('chinese_mcq_state');
    // Re-shuffle options for a fresh experience every time!
    shuffleAllOptions();
    updateScore();
    renderQuestions(currentCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close modals on overlay click
[completionModal, resetModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        completionModal.classList.remove('active');
        resetModal.classList.remove('active');
    }
});

// Category nav
categoryNav.addEventListener('click', (e) => {
    if (!e.target.classList.contains('cat-btn')) return;
    categoryNav.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentCategory = e.target.dataset.category;
    renderQuestions(currentCategory);
});

// Scroll to top
window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('visible', window.scrollY > 400);
});
scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== Load State =====
function loadState() {
    const saved = JSON.parse(localStorage.getItem('chinese_mcq_state') || 'null');
    if (saved && saved.answered) {
        answered = new Set(saved.answered);
        answerMap = saved.answers || {};
        correctCount = saved.correct || 0;
        wrongCount = saved.wrong || 0;
        // Restore the same shuffle so answered questions display correctly
        if (saved.shuffledOptions) {
            shuffledOptions = saved.shuffledOptions;
        } else {
            shuffleAllOptions();
        }
        updateScore();
    } else {
        // Fresh start — shuffle options
        shuffleAllOptions();
    }
}

// ===== Init =====
loadState();
renderQuestions('all');
