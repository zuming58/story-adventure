const views = {
  input: document.querySelector("#input-view"),
  loading: document.querySelector("#loading-view"),
  ready: document.querySelector("#ready-view"),
  error: document.querySelector("#error-view"),
  study: document.querySelector("#study-view"),
  summary: document.querySelector("#summary-view"),
};

const form = document.querySelector("#material-form");
const formMessage = document.querySelector("#form-message");
const materialInput = document.querySelector("#material");
const subjectInput = document.querySelector("#subject");
const gradeInput = document.querySelector("#grade");
const toast = document.querySelector("#toast");

let cards = [];
let currentIndex = 0;
let reviewMode = false;
let reviewIndexes = [];

const demoCards = [
  {
    question: "一般过去时通常表示什么？",
    answer: "表示过去某个时间发生的动作或存在的状态。",
    hint: "常和 yesterday、last week、two days ago 等时间状语连用。",
    level: "简单",
  },
  {
    question: "动词过去式规则变化通常怎么构成？",
    answer: "多数动词直接加 -ed，以 e 结尾的动词加 -d。",
    hint: "例如 play -> played，live -> lived。",
    level: "中等",
  },
  {
    question: "为什么 did 后面的动词要用原形？",
    answer: "因为 did 已经承担了过去时标记，后面的实义动词恢复原形。",
    hint: "例如 Did you go，不是 Did you went。",
    level: "较难",
  },
  {
    question: "yesterday 在句子里常提示什么时态？",
    answer: "通常提示一般过去时。",
    hint: "看到明确过去时间，先检查谓语动词形式。",
    level: "简单",
  },
  {
    question: "一般过去时的一般疑问句通常怎么构成？",
    answer: "常用 Did + 主语 + 动词原形。",
    hint: "Did 放在句首，后面的动词不要再变过去式。",
    level: "中等",
  },
  {
    question: "请把 I go to school yesterday 改正确。",
    answer: "I went to school yesterday.",
    hint: "yesterday 提示过去时间，go 的过去式是 went。",
    level: "较难",
  },
].map(normalizeCard);

function showView(name) {
  Object.values(views).forEach((view) => view.classList.remove("active"));
  views[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function normalizeCard(card, index) {
  return {
    id: `card-${Date.now()}-${index}`,
    question: String(card.question || "").trim(),
    answer: String(card.answer || "").trim(),
    hint: String(card.hint || "").trim(),
    level: String(card.level || "中等").trim(),
    answered: false,
    revealed: false,
    status: null,
  };
}

function buildFallbackCards(material, subject, grade) {
  const topic = material.slice(0, 28).replace(/\s+/g, " ") || subject;
  return [
    {
      question: `这段${subject}材料的核心内容是什么？`,
      answer: `请用自己的话概括“${topic}...”的主要意思。`,
      hint: "先找关键词，再找材料想说明的关系或结论。",
      level: "简单",
    },
    {
      question: "材料里最值得记住的关键词有哪些？",
      answer: "选择 2-4 个关键词，并说明它们之间的关系。",
      hint: "关键词通常是定义、公式、人物、时间、条件或结论。",
      level: "简单",
    },
    {
      question: "这个知识点容易在哪里出错？",
      answer: "常见错误是只背结论，没有理解适用条件或例外情况。",
      hint: "想一想老师讲题时会提醒哪些坑。",
      level: "中等",
    },
    {
      question: `如果把它改成一道${grade}自测题，可以怎么问？`,
      answer: "可以从定义、原因、步骤、例子或反例角度提问。",
      hint: "好问题通常能检查你是否真的理解。",
      level: "中等",
    },
    {
      question: "请举一个生活中或题目里的例子来说明它。",
      answer: "用一个具体例子把抽象知识点落到真实场景。",
      hint: "例子越具体，越容易暴露理解是否扎实。",
      level: "较难",
    },
    {
      question: "复习完这段材料后，你还应该追问自己什么？",
      answer: "我是否能不看材料讲出来？是否能做一道类似题？",
      hint: "能复述、能迁移，才算比较稳。",
      level: "较难",
    },
  ];
}

async function requestCards(payload) {
  const response = await fetch("/api/generate-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "request failed";
    try {
      const errorData = await response.json();
      message = errorData.error || message;
    } catch (error) {
      message = response.statusText || message;
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  if (!Array.isArray(data.cards) || data.cards.length === 0) {
    throw new Error("empty cards");
  }
  return data.cards;
}

function renderReady() {
  const knownLevels = cards.reduce((result, card) => {
    result[card.level] = (result[card.level] || 0) + 1;
    return result;
  }, {});
  const levelText = Object.entries(knownLevels)
    .map(([level, count]) => `${level} ${count}`)
    .join(" / ");

  document.querySelector("#ready-title").textContent = `已生成 ${cards.length} 张复习卡片`;
  document.querySelector("#ready-meta").textContent = `科目：${subjectInput.value}　年级：${gradeInput.value}　难度分布：${levelText}`;
  document.querySelector("#preview-card").innerHTML = `
    <span class="difficulty">卡片 1 · ${cards[0].level}</span>
    <div class="card-focus">
      <div class="card-visual" aria-hidden="true">?</div>
      <p class="card-question">${escapeHtml(cards[0].question)}</p>
    </div>
  `;
}

function getActiveIndexes() {
  return reviewMode ? reviewIndexes : cards.map((_, index) => index);
}

function getCardIndex() {
  return getActiveIndexes()[currentIndex];
}

function renderStudyCard() {
  const activeIndexes = getActiveIndexes();
  const card = cards[getCardIndex()];
  const progressText = `${currentIndex + 1} / ${activeIndexes.length}`;

  document.querySelector("#progress-text").textContent = progressText;
  const status = card.status ? `<span class="status-pill">状态：${card.status === "known" ? "我会了" : "再复习"}</span>` : "";

  if (card.revealed || card.answered) {
    document.querySelector("#study-card").innerHTML = `
      ${status || `<span class="difficulty">难度：${escapeHtml(card.level)}</span>`}
      <div class="card-focus">
        <div class="card-visual answer" aria-hidden="true">✓</div>
        <p class="card-answer">${escapeHtml(card.answer)}</p>
        <p class="hint">提示：${escapeHtml(card.hint || "试着用自己的话复述答案。")}</p>
      </div>
    `;
    document.querySelector("#answer-actions").classList.remove("hidden");
  } else {
    document.querySelector("#study-card").innerHTML = `
      <span class="difficulty">难度：${escapeHtml(card.level)}</span>
      <div class="card-focus">
        <div class="card-visual" aria-hidden="true">?</div>
        <p class="card-question">${escapeHtml(card.question)}</p>
        <button id="reveal-answer" class="primary-action" type="button">查看答案</button>
      </div>
    `;
    document.querySelector("#answer-actions").classList.add("hidden");
    document.querySelector("#reveal-answer").addEventListener("click", () => {
      card.revealed = true;
      renderStudyCard();
    });
  }

  const prevButton = document.querySelector("#prev-card");
  const nextButton = document.querySelector("#next-card");
  prevButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex >= activeIndexes.length - 1 || !cards[activeIndexes[currentIndex + 1]]?.answered;

  const allAnswered = activeIndexes.every((index) => cards[index].answered);
  document.querySelector("#show-summary").classList.toggle("hidden", !allAnswered || reviewMode);
}

function markCard(status) {
  const card = cards[getCardIndex()];
  card.status = status;
  card.answered = true;
  card.revealed = true;

  const activeIndexes = getActiveIndexes();
  if (currentIndex < activeIndexes.length - 1) {
    currentIndex += 1;
  } else if (reviewMode) {
    refreshReviewIndexes();
    if (reviewIndexes.length === 0) {
      renderSummary();
      showView("summary");
      showToast("本轮已全部掌握");
      return;
    }
    currentIndex = Math.min(currentIndex, reviewIndexes.length - 1);
  }
  renderStudyCard();
}

function refreshReviewIndexes() {
  reviewIndexes = cards
    .map((card, index) => (card.status === "review" ? index : -1))
    .filter((index) => index >= 0);
}

function renderSummary() {
  const known = cards.filter((card) => card.status === "known").length;
  const review = cards.filter((card) => card.status === "review").length;
  const rate = Math.round((known / cards.length) * 100);

  document.querySelector("#summary-stats").innerHTML = `
    <div class="stat">总卡片<strong>${cards.length}</strong></div>
    <div class="stat">已掌握<strong>${known}</strong></div>
    <div class="stat">需再复习<strong>${review}</strong></div>
    <div class="stat">掌握率<strong>${rate}%</strong></div>
  `;

  const reviewCards = cards.filter((card) => card.status === "review");
  const reviewOnlyButton = document.querySelector("#review-only");
  reviewOnlyButton.disabled = false;
  reviewOnlyButton.textContent = reviewCards.length === 0 ? "重新生成卡片" : "只复习这些";
  reviewOnlyButton.dataset.empty = reviewCards.length === 0 ? "true" : "false";
  document.querySelector("#review-list").innerHTML = reviewCards.length
    ? `<h3>需要再复习</h3><ol>${reviewCards.map((card) => `<li>${escapeHtml(card.question)}</li>`).join("")}</ol>`
    : `<p class="subtle">本轮已全部掌握。</p>`;
}

function seedDemoCards(mode) {
  cards = demoCards.map((card) => ({ ...card }));
  currentIndex = 0;
  reviewMode = false;
  reviewIndexes = [];

  if (mode === "back") {
    cards[0].revealed = true;
  }

  if (mode === "answered") {
    cards[0].answered = true;
    cards[0].revealed = true;
    cards[0].status = "known";
    cards[1].answered = true;
    cards[1].revealed = true;
    cards[1].status = "review";
    currentIndex = 1;
  }

  if (mode === "summary") {
    cards.forEach((card, index) => {
      card.answered = true;
      card.revealed = true;
      card.status = index < 2 ? "known" : "review";
    });
  }

  if (mode === "complete") {
    cards.forEach((card) => {
      card.answered = true;
      card.revealed = true;
      card.status = "known";
    });
  }
}

function setupDemoToolbar() {
  const toolbar = document.querySelector("#demo-toolbar");
  if (!new URLSearchParams(window.location.search).has("demo")) {
    return;
  }

  toolbar.classList.remove("hidden");
  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-demo]");
    if (!button) return;

    toolbar.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const mode = button.dataset.demo;
    if (mode === "input") {
      showView("input");
      return;
    }
    if (mode === "loading") {
      showView("loading");
      return;
    }
    if (mode === "error") {
      showView("error");
      return;
    }
    if (mode === "ready") {
      seedDemoCards(mode);
      renderReady();
      showView("ready");
      return;
    }
    if (mode === "summary" || mode === "complete") {
      seedDemoCards(mode);
      renderSummary();
      showView("summary");
      return;
    }

    seedDemoCards(mode);
    renderStudyCard();
    showView("study");
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".upcoming").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.add("pressed");
    window.setTimeout(() => button.classList.remove("pressed"), 260);
    showToast(`${button.dataset.upcoming}将在下一版支持，请先使用文字输入。`);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const material = materialInput.value.trim();

  if (material.length < 12) {
    formMessage.textContent = "请补充更完整的课文、知识点、笔记或错题内容。";
    return;
  }

  formMessage.textContent = "";
  showView("loading");

  const payload = {
    subject: subjectInput.value,
    grade: gradeInput.value,
    material,
  };

  try {
    const generated = await requestCards(payload);
    cards = generated.map(normalizeCard).filter((card) => card.question && card.answer);
    showToast("已生成真实 AI 复习卡片。");
  } catch (error) {
    const fallback = buildFallbackCards(material, subjectInput.value, gradeInput.value);
    cards = fallback.map(normalizeCard);
    showToast(getFallbackMessage(error));
  }

  if (cards.length === 0) {
    formMessage.textContent = "生成失败，请稍后重试或缩短输入内容。";
    showView("input");
    return;
  }

  currentIndex = 0;
  reviewMode = false;
  reviewIndexes = [];
  renderReady();
  showView("ready");
});

document.querySelector("#cancel-generation").addEventListener("click", () => showView("input"));
document.querySelector("#edit-material").addEventListener("click", () => showView("input"));
document.querySelector("#error-edit").addEventListener("click", () => showView("input"));
document.querySelector("#error-retry").addEventListener("click", () => form.requestSubmit());
document.querySelector("#start-study").addEventListener("click", () => {
  currentIndex = 0;
  reviewMode = false;
  renderStudyCard();
  showView("study");
});

document.querySelector("#mark-known").addEventListener("click", () => markCard("known"));
document.querySelector("#mark-review").addEventListener("click", () => markCard("review"));
document.querySelector("#prev-card").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderStudyCard();
  }
});
document.querySelector("#next-card").addEventListener("click", () => {
  const activeIndexes = getActiveIndexes();
  if (currentIndex < activeIndexes.length - 1 && cards[activeIndexes[currentIndex + 1]].answered) {
    currentIndex += 1;
    renderStudyCard();
  }
});
document.querySelector("#show-summary").addEventListener("click", () => {
  renderSummary();
  showView("summary");
});
document.querySelector("#review-only").addEventListener("click", () => {
  if (document.querySelector("#review-only").dataset.empty === "true") {
    cards = [];
    currentIndex = 0;
    reviewMode = false;
    reviewIndexes = [];
    showView("input");
    return;
  }

  refreshReviewIndexes();
  if (reviewIndexes.length === 0) {
    showToast("没有需要再复习的卡片。");
    return;
  }
  reviewMode = true;
  currentIndex = 0;
  reviewIndexes.forEach((index) => {
    cards[index].revealed = false;
    cards[index].answered = false;
    cards[index].status = null;
  });
  renderStudyCard();
  showView("study");
});
document.querySelector("#restart").addEventListener("click", () => {
  cards = [];
  currentIndex = 0;
  reviewMode = false;
  reviewIndexes = [];
  showView("input");
});

setupDemoToolbar();

function getFallbackMessage(error) {
  if (error?.status === 503) {
    return "当前使用演示卡片。配置 AI Key 后可生成真实内容。";
  }

  if (error?.status === 400) {
    return "学习材料还不够完整，当前先展示演示卡片。";
  }

  return "AI 暂时不可用，当前使用演示卡片继续体验。";
}
