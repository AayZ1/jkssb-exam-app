// ================= SUPABASE CONFIG =================
const SUPABASE_URL = "https://gqwbptnmdmzeywpmsurn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WsqlGSeClqzfP00_Kt2EGA_pCuZGzeh";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ================= GLOBAL STATE =================
const MARKS_CORRECT = 1;
const MARKS_WRONG = -0.25;

let questions = [];
let activeQuestions = [];
let userAnswers = [];
let questionsReady = false;

let current = 0;
let score = 0;
let time = 0;
let timer = null;

let correctCount = 0;
let wrongCount = 0;
let reviewIndex = 0;
let sectionStats = {};

let overallChart = null;
let sectionChart = null;

// ================= ELEMENTS =================
const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const timerEl = document.getElementById("timer");
const categoryBox = document.getElementById("categoryBox");

const progressContainer = document.getElementById("progressContainer");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

// ================= LOAD QUESTIONS =================
async function loadQuestions() {
  questionEl.innerHTML = `
    <div class="loading">
      Loading questions…
      <span>Please wait</span>
    </div>
  `;
  optionsEl.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("questions")
    .select("id, category, question, options, correct, explanation")


  if (error) {
    questionEl.innerHTML = `
      <div class="empty-state">
        Failed to load questions.<br>
        Please refresh the page.
      </div>
    `;
    console.error(error);
    return;
  }

  questions = data;
  questionsReady = true;
  questionEl.innerHTML = "Select a test to begin";

}

// ================= START CATEGORY =================
window.startCategory = function (category) {
  if (!questions.length) {
    alert("Questions are still loading. Please wait.");
    return;
  }

  const filtered = questions.filter(q => q.category === category);
  startTest(filtered, 600);
};

// ================= START MOCK =================
window.startMockTest = function () {
  if (!questions.length) {
    alert("Questions are still loading. Please wait.");
    return;
  }

  const mixed = [...questions].sort(() => Math.random() - 0.5).slice(0, 20);
  startTest(mixed, 1800);
};

// ================= START TEST =================
function startTest(qList, testTime) {
  if (!qList.length) {
    alert("No questions available");
    return;
  }

  activeQuestions = qList;
  current = 0;
  score = 0;
  correctCount = 0;
  wrongCount = 0;
  userAnswers = [];
  sectionStats = {};
  time = testTime;

  activeQuestions.forEach(q => {
    if (!sectionStats[q.category]) {
      sectionStats[q.category] = { total: 0, correct: 0, wrong: 0 };
    }
    sectionStats[q.category].total++;
  });

  categoryBox.style.display = "none";
  timerEl.style.display = "block";
  progressContainer.style.display = "block";

  startTimer();
  showQuestion();
}

// ================= TIMER =================
function startTimer() {
  clearInterval(timer);
  timerEl.innerText = formatTime(time);

  timer = setInterval(() => {
    time--;
    timerEl.innerText = formatTime(time);

    if (time <= 0) {
      finishTest();
    }
  }, 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ================= PROGRESS =================
function updateProgress() {
  progressText.innerText = `Question ${current + 1} of ${activeQuestions.length}`;
  progressFill.style.width =
    `${((current + 1) / activeQuestions.length) * 100}%`;
}

// ================= QUESTIONS =================
function showQuestion() {
  if (current >= activeQuestions.length) {
    finishTest();
    return;
  }

  updateProgress();

  const q = activeQuestions[current];
  questionEl.innerText = `Q${current + 1}. ${q.question}`;
  optionsEl.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.innerText = opt;

    btn.onclick = () => {
      // disable all options immediately
      const allButtons = document.querySelectorAll("#options button");
      allButtons.forEach(b => b.classList.add("disabled"));

      userAnswers[current] = i;

      if (i === q.correct) {
        score += MARKS_CORRECT;
        correctCount++;
        sectionStats[q.category].correct++;
      } else {
        score += MARKS_WRONG;
        wrongCount++;
        sectionStats[q.category].wrong++;
      }

      // smooth transition to next question
      setTimeout(() => {
        current++;
        showQuestion();
      }, 300);
    };

    optionsEl.appendChild(btn);
  });
}

// ================= RESULT DASHBOARD =================
function finishTest() {
  saveAttempt();

  clearInterval(timer);
  timerEl.style.display = "none";
  progressContainer.style.display = "none";
  categoryBox.style.display = "block";

  const total = activeQuestions.length;
  const attempted = correctCount + wrongCount;
  const unattempted = total - attempted;

  questionEl.innerText = "Test Analysis";

  optionsEl.innerHTML = `
  <p><b>Final Score:</b> ${score.toFixed(2)}</p>

  <canvas id="overallChart" height="200"></canvas>
  <canvas id="sectionChart" height="200"></canvas>

  ${generateRecommendations(sectionStats)}

  <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
    <button onclick="showSectionAnalysis()">Section-wise Analysis</button>
    <button onclick="startReview()">Review Questions</button>
    <button onclick="showProgress()">View Progress</button>

  </div>
`;


  renderOverallChart(correctCount, wrongCount, unattempted);
  renderSectionChart(sectionStats);
}

// ================= CHARTS =================
function renderOverallChart(correct, wrong, unattempted) {
  const ctx = document.getElementById("overallChart");

  if (overallChart) overallChart.destroy();

  overallChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Correct", "Wrong", "Unattempted"],
      datasets: [{
        data: [correct, wrong, unattempted],
        backgroundColor: ["#28a745", "#dc3545", "#6c757d"]
      }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

function renderSectionChart(stats) {
  const labels = [];
  const data = [];

  for (let s in stats) {
    labels.push(s.replace("_", " "));
    data.push(stats[s].correct);
  }

  const ctx = document.getElementById("sectionChart");

  if (sectionChart) sectionChart.destroy();

  sectionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Correct Answers",
        data,
        backgroundColor: "#1f3c88"
      }]
    },
    options: {
      scales: { y: { beginAtZero: true, precision: 0 } }
    }
  });
}

// ================= SECTION ANALYSIS =================
window.showSectionAnalysis = function () {
  questionEl.innerText = "Section-wise Analysis";
  optionsEl.innerHTML = "";

  for (let section in sectionStats) {
    const s = sectionStats[section];
    const attempted = s.correct + s.wrong;
    const accuracy = attempted
      ? ((s.correct / attempted) * 100).toFixed(2)
      : 0;
    const marks = (s.correct * MARKS_CORRECT + s.wrong * MARKS_WRONG).toFixed(2);

    optionsEl.innerHTML += `
      <div style="margin-bottom:12px;padding:10px;border-radius:8px;background:#f1f5ff;">
        <b>${section.replace("_", " ")}</b><br>
        Total: ${s.total}<br>
        Correct: ${s.correct}<br>
        Wrong: ${s.wrong}<br>
        Accuracy: ${accuracy}%<br>
        Marks: ${marks}
      </div>
    `;
  }
};

// ================= REVIEW =================
window.startReview = function () {
  if (!activeQuestions.length) {
    questionEl.innerText = "Review";
    optionsEl.innerHTML = `
    <div class="empty-state">
      No test available for review.<br>
      Attempt a test first.
    </div>
  `;
    return;
  }

  reviewIndex = 0;
  showReviewQuestion();
};

function showReviewQuestion() {
  const q = activeQuestions[reviewIndex];
  questionEl.innerText = `Review Q${reviewIndex + 1}. ${q.question}`;
  optionsEl.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.disabled = true;

    if (i === q.correct) {
      btn.style.background = "green";
      btn.style.color = "white";
    }
    if (userAnswers[reviewIndex] === i && i !== q.correct) {
      btn.style.background = "red";
      btn.style.color = "white";
    }

    optionsEl.appendChild(btn);
  });

  const exp = document.createElement("div");
  exp.style.marginTop = "10px";
  exp.style.padding = "10px";
  exp.style.borderRadius = "8px";
  exp.style.background = "#eef2ff";
  exp.innerHTML = `<b>Explanation:</b><br>${q.explanation || "No explanation available."}`;
  optionsEl.appendChild(exp);

  const nav = document.createElement("div");
  nav.style.marginTop = "10px";
  nav.style.display = "flex";
  nav.style.gap = "10px";
  nav.innerHTML = `
    <button onclick="prevReview()">Previous</button>
    <button onclick="nextReview()">Next</button>
  `;
  optionsEl.appendChild(nav);
}

window.nextReview = function () {
  if (reviewIndex < activeQuestions.length - 1) {
    reviewIndex++;
    showReviewQuestion();
  }
};

window.prevReview = function () {
  if (reviewIndex > 0) {
    reviewIndex--;
    showReviewQuestion();
  }
};
function generateRecommendations(sectionStats) {
  let html = `<h3>📌 Smart Recommendations</h3>`;

  for (let section in sectionStats) {
    const s = sectionStats[section];
    const attempted = s.correct + s.wrong;
    const accuracy = attempted
      ? (s.correct / attempted) * 100
      : 0;

    let level = "";
    let advice = "";

    if (accuracy >= 70) {
      level = "🟢 Strong Area";
      advice = "Maintain by attempting mixed mock questions.";
    } else if (accuracy >= 40) {
      level = "🟡 Needs Practice";
      advice = "Revise concepts and attempt 20–30 topic-wise MCQs.";
    } else {
      level = "🔴 Weak Area";
      advice = "Revise basics, watch lectures, and practice daily MCQs.";
    }

    html += `
      <div style="margin-top:10px;padding:10px;border-radius:8px;background:#fff3cd;">
        <b>${section.replace("_", " ")}</b><br>
        Accuracy: ${accuracy.toFixed(2)}%<br>
        Status: <b>${level}</b><br>
        Recommendation: ${advice}
      </div>
    `;
  }

  return html;
}
function saveAttempt() {
  const attempts = JSON.parse(localStorage.getItem("jkssb_attempts")) || [];

  const attemptData = {
    date: new Date().toLocaleString(),
    score: Number(score.toFixed(2)),
    correct: correctCount,
    wrong: wrongCount,
    unattempted: activeQuestions.length - (correctCount + wrongCount),
    sectionStats: JSON.parse(JSON.stringify(sectionStats))
  };

  attempts.push(attemptData);
  localStorage.setItem("jkssb_attempts", JSON.stringify(attempts));
}
function showProgress() {
  const attempts = JSON.parse(localStorage.getItem("jkssb_attempts")) || [];

  if (!attempts.length) {
    questionEl.innerText = "Progress";
    optionsEl.innerHTML = `
    <div class="empty-state">
      No tests attempted yet.<br>
      Start a test to see your progress here.
    </div>
  `;
    return;
  }


  questionEl.innerText = "📈 Progress Over Time";
  optionsEl.innerHTML = `
    <canvas id="scoreTrend" height="200"></canvas>
    <canvas id="accuracyTrend" height="200"></canvas>
    <div id="attemptList" style="margin-top:10px;"></div>
  `;

  renderProgressCharts(attempts);
  renderAttemptList(attempts);
}
function renderProgressCharts(attempts) {
  const labels = attempts.map((_, i) => `Attempt ${i + 1}`);
  const scores = attempts.map(a => a.score);
  const accuracy = attempts.map(a => {
    const attempted = a.correct + a.wrong;
    return attempted ? ((a.correct / attempted) * 100).toFixed(2) : 0;
  });

  new Chart(document.getElementById("scoreTrend"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Score",
        data: scores,
        borderColor: "#1f3c88",
        fill: false
      }]
    }
  });

  new Chart(document.getElementById("accuracyTrend"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Accuracy (%)",
        data: accuracy,
        borderColor: "#28a745",
        fill: false
      }]
    }
  });
}

function renderAttemptList(attempts) {
  const list = document.getElementById("attemptList");

  attempts.slice().reverse().forEach((a, i) => {
    list.innerHTML += `
      <div style="padding:8px;margin-bottom:6px;border-radius:6px;background:#f1f5ff;">
        <b>${a.date}</b><br>
        Score: ${a.score} |
        Correct: ${a.correct} |
        Wrong: ${a.wrong} |
        Unattempted: ${a.unattempted}
      </div>
    `;
  });
}
function goHome() {
  // clear question & options
  document.getElementById("question").innerHTML = "";
  document.getElementById("options").innerHTML = "";

  // show category buttons again
  document.getElementById("categoryBox").style.display = "grid";
}
function setActiveNav(index) {
  const buttons = document.querySelectorAll("#bottomNav button");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
}

function enableCategoryButtons() {
  document.querySelectorAll("#categoryBox button").forEach(btn => {
    btn.disabled = false;
  });
}

