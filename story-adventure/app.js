const TOTAL_ACTS = 5;
const STORAGE_KEY = "storyAdventure.currentStory.v1";
const COMPLETION_LIMIT_KEY = "storyAdventure.completedAt.v1";
const runtimeConfig = {
  imageMode: "each_scene",
  imageStorageMode: "browser",
  storySessionConcurrency: 8,
  storySessionTtlMs: 600000,
  storyCompletedCooldownMs: 1200000,
};
const IMAGE_POLL_INTERVAL_MS = 3000;
const IMAGE_SLOW_NOTICE_MS = 90000;
const IMAGE_POLL_TIMEOUT_MS = 600000;
const SESSION_POLL_INTERVAL_MS = 2500;
const SESSION_HEARTBEAT_INTERVAL_MS = 30000;

const views = {
  cover: document.querySelector("#cover-view"),
  home: document.querySelector("#home-view"),
  waiting: document.querySelector("#waiting-view"),
  loading: document.querySelector("#loading-view"),
  scene: document.querySelector("#scene-view"),
  writing: document.querySelector("#writing-view"),
  ending: document.querySelector("#ending-view"),
  name: document.querySelector("#name-view"),
  book: document.querySelector("#book-view"),
  error: document.querySelector("#error-view"),
};

const storyStartInput = document.querySelector("#story-start");
const playerNameInput = document.querySelector("#player-name");
const homeMessage = document.querySelector("#home-message");
const browserHint = document.querySelector("#browser-hint");
const nameMessage = document.querySelector("#name-message");
const waitingText = document.querySelector("#waiting-text");
const toast = document.querySelector("#toast");
const exportPreview = document.querySelector("#export-preview");
const genreButtons = [...document.querySelectorAll("#genre-options .choice")];
const resumeStoryButton = document.querySelector("#resume-story");

const demoScenes = [
  {
    title: "会发光的地图",
    text: "我在学校储物柜里发现了一张会发光的地图。地图上的路线像小蛇一样移动，最后停在操场后面的旧钟楼。就在这时，地图边缘浮现出一句话：午夜前找到门。",
    symbol: "🗺",
    imageUrl: "assets/story-choice.png",
    imageTitle: "储物柜里的发光地图",
    imagePrompt: "学校储物柜里一张会发光的地图，儿童绘本风格，温暖金色光线",
    summary: "主角发现一张指向旧钟楼的发光地图。",
    choices: ["立刻去旧钟楼看看", "找最好的朋友一起研究", "把地图交给老师"],
  },
  {
    title: "图书馆的暗号",
    text: "你和伙伴躲进图书馆角落。地图在桌面上轻轻发光，旧钟楼的位置突然浮现出一个奇怪的符号。伙伴说，这个符号好像在校史馆的老照片里出现过。",
    symbol: "📚",
    imageUrl: "assets/story-choice.png",
    imageTitle: "图书馆角落的秘密暗号",
    imagePrompt: "图书馆角落里发光地图和神秘符号，两个学生低声讨论，儿童漫画风格",
    summary: "主角和伙伴发现地图符号可能与校史馆旧照片有关。",
    choices: ["去校史馆找照片", "先去旧钟楼看看", "上网搜索这个符号"],
  },
  {
    title: "校史馆的旧照片",
    text: "校史馆里安静得只能听见钟表声。你们在玻璃柜里发现一张泛黄照片，照片角落的符号和地图上一模一样。照片背面写着：门只为相信故事的人打开。",
    symbol: "🕰",
    imageUrl: "assets/story-choice.png",
    imageTitle: "泛黄照片上的神秘符号",
    imagePrompt: "校史馆玻璃柜里的泛黄照片和神秘符号，悬疑但温和，绘本风格",
    summary: "主角发现旧照片背面写着门只为相信故事的人打开。",
    choices: ["继续调查照片背面", "去找照片中的老校长", "把发现告诉老师"],
  },
  {
    title: "旧钟楼的蓝光",
    text: "你们来到旧钟楼门口，门缝里透出蓝光。地图忽然变成一把纸钥匙，钥匙上画着三颗星。伙伴小声说：也许它不是让我们找宝藏，而是找一个被忘记的故事。",
    symbol: "🚪",
    imageUrl: "assets/story-choice.png",
    imageTitle: "旧钟楼门缝里的蓝光",
    imagePrompt: "旧钟楼门缝透出蓝光，纸钥匙漂浮在空中，奇幻儿童绘本风格",
    summary: "主角来到旧钟楼，地图变成纸钥匙，线索指向一个被忘记的故事。",
    choices: ["推开门", "从窗户往里看", "先绕到钟楼后面"],
  },
  {
    title: "被遗忘的故事室",
    text: "门后不是怪物，而是一间小小的故事室。墙上挂满学生写过的冒险，最中间有一本空白书。地图飞进书页，变成第一行字：现在，轮到你写下结尾。",
    symbol: "✨",
    imageUrl: "assets/story-choice.png",
    imageTitle: "钟楼里的故事室",
    imagePrompt: "钟楼里温暖发光的故事室，墙上挂满孩子写的冒险，儿童绘本风格",
    summary: "主角进入故事室，空白书等待他们写下结尾。",
    choices: ["写下勇敢的结尾", "写下帮助大家的结尾", "写下一个搞笑结尾"],
  },
];

const demoEnding = {
  title: "会发光的地图",
  type: "友情结局",
  protagonist: "你和伙伴",
  text: "你和伙伴把这次冒险写进空白书。旧钟楼的蓝光慢慢散开，学校里所有被忘记的故事都亮了起来。你们终于明白，地图真正寻找的不是宝藏，而是愿意一起相信故事的人。",
  symbol: "🌟",
  imageUrl: "assets/book-ending.png",
  imageTitle: "点亮故事室的两个伙伴",
  imagePrompt: "两个孩子点亮故事室，墙上故事发出星光，温暖儿童绘本风格",
  summary: "主角和伙伴把冒险写进空白书，点亮了被忘记的故事。",
};

let state = getInitialState();

function getInitialState() {
  return {
    genre: "奇幻",
    opening: "",
    currentSceneIndex: 0,
    scenes: [],
    choices: [],
    summary: "",
    ending: null,
    playerName: "",
    usingFallback: false,
    imageJobs: {},
    lockedImageProvider: "",
    storySessionId: "",
    storySessionReleased: false,
    completionRecordedAt: 0,
  };
}

function saveStoryState() {
  if (!state.scenes.length && !state.ending) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        savedAt: Date.now(),
      }),
    );
    updateResumeButton();
  } catch (error) {
    console.warn(error);
    if (dropGeneratedImagesForStorage()) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...state,
            savedAt: Date.now(),
          }),
        );
        showToast("图片较大，已保留故事文字，导出时会使用默认图。");
        updateResumeButton();
      } catch (retryError) {
        console.warn(retryError);
      }
    }
  }
}

function dropGeneratedImagesForStorage() {
  let changed = false;
  state.scenes.forEach((scene) => {
    if (scene.generatedImageUrl && scene.imageUrl === scene.generatedImageUrl) {
      scene.generatedImageUrl = "";
      scene.imageUrl = "assets/story-choice.png";
      changed = true;
    }
  });

  if (state.ending?.generatedImageUrl && state.ending.imageUrl === state.ending.generatedImageUrl) {
    state.ending.generatedImageUrl = "";
    state.ending.imageUrl = "assets/book-ending.png";
    changed = true;
  }

  return changed;
}

function loadSavedStory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const saved = JSON.parse(raw);
    if (!saved || (!Array.isArray(saved.scenes) && !saved.ending)) {
      return null;
    }

    return {
      ...getInitialState(),
      ...saved,
      scenes: Array.isArray(saved.scenes) ? saved.scenes : [],
      choices: Array.isArray(saved.choices) ? saved.choices : [],
      imageJobs: saved.imageJobs && typeof saved.imageJobs === "object" ? saved.imageJobs : {},
    };
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function clearSavedStory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn(error);
  }
  updateResumeButton();
}

function updateResumeButton() {
  const saved = loadSavedStory();
  resumeStoryButton.classList.toggle("hidden", !saved || (!saved.scenes.length && !saved.ending));
}

function restoreSavedStory() {
  const saved = loadSavedStory();
  if (!saved) {
    showToast("没有找到上次故事。");
    updateResumeButton();
    return;
  }

  state = saved;
  storyStartInput.value = state.opening || "";
  setActiveGenre(state.genre);

  if (state.ending) {
    showBook();
    return;
  }

  const index = Math.min(state.currentSceneIndex || 0, Math.max(state.scenes.length - 1, 0));
  renderScene(index);
  showView("scene");
  resumePendingImageJobs();
}

function setActiveGenre(genre) {
  const matched = genreButtons.find((button) => button.dataset.genre === genre) || genreButtons[0];
  if (matched) {
    setGenre(matched);
  }
}

function showView(name) {
  Object.values(views).forEach((view) => view.classList.remove("active"));
  views[name].classList.add("active");
  if (name === "home" && browserHint) {
    browserHint.classList.toggle("hidden", !isWeChatBrowser());
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch("/api/story-adventure/config");
    const config = await response.json().catch(() => ({}));
    if (response.ok) {
      runtimeConfig.imageMode = config.imageMode || runtimeConfig.imageMode;
      runtimeConfig.imageStorageMode = config.imageStorageMode || runtimeConfig.imageStorageMode;
      runtimeConfig.storySessionConcurrency = config.storySessionConcurrency || runtimeConfig.storySessionConcurrency;
      runtimeConfig.storySessionTtlMs = Number(config.storySessionTtlMs || runtimeConfig.storySessionTtlMs);
      runtimeConfig.storyCompletedCooldownMs = Number(config.storyCompletedCooldownMs || runtimeConfig.storyCompletedCooldownMs);
    }
  } catch (error) {
    console.warn(error);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function getGenre() {
  return document.querySelector("#genre-options .choice.active")?.dataset.genre || "奇幻";
}

function setGenre(button) {
  genreButtons.forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  state.genre = button.dataset.genre;
}

async function startAdventure() {
  const opening = storyStartInput.value.trim();

  if (opening.length < 3) {
    homeMessage.textContent = "请先写一个故事开头。";
    return;
  }

  if (isCompletionCooldownActive()) {
    homeMessage.textContent = getCompletionCooldownMessage();
    showToast("现场体验每台设备暂时限玩一轮，可以继续查看上次故事。");
    return;
  }

  homeMessage.textContent = "";
  state = {
    ...getInitialState(),
    genre: getGenre(),
    opening,
  };
  clearSavedStory();

  await beginQueuedAdventure();
}

async function beginQueuedAdventure() {
  waitingText.textContent = "正在帮你进入故事传送门...";
  showView("waiting");

  try {
    const session = await createStorySession();
    state.storySessionId = session.id;
    saveStoryState();

    if (session.status === "active") {
      await generateFirstSceneAfterAdmission();
      return;
    }

    updateWaitingText(session);
    pollStorySession(session.id);
  } catch (error) {
    console.warn(error);
    homeMessage.textContent = "现场排队服务暂时不稳定，请稍后再试。";
    showView("home");
  }
}

async function generateFirstSceneAfterAdmission() {
  startStorySessionHeartbeat();
  document.querySelector("#loading-text").textContent = "AI 正在根据你的开头编织第一幕。";
  showView("loading");

  try {
    const scene = await generateScene(1);
    state.scenes = [scene];
    state.summary = scene.summary || scene.text;
    saveStoryState();
    renderScene(0);
    showView("scene");
    requestSceneImageV2(0);
  } catch (error) {
    console.warn(error);
    finishCurrentStorySession();
    homeMessage.textContent = error.message || "这个开头暂时不适合儿童绘本，请换一个更安全、积极的开头。";
    showView("home");
  }
}

async function createStorySession() {
  const response = await fetch("/api/story-adventure/sessions", { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "进入排队失败");
  }

  return data;
}

async function getStorySession(sessionId) {
  const response = await fetch(`/api/story-adventure/sessions/${encodeURIComponent(sessionId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "查询排队失败");
  }

  return data;
}

function finishCurrentStorySession() {
  const sessionId = state.storySessionId;
  if (!sessionId || state.storySessionReleased) {
    return;
  }

  state.storySessionId = "";
  state.storySessionReleased = true;
  saveStoryState();
  fetch(`/api/story-adventure/sessions/${encodeURIComponent(sessionId)}/finish`, { method: "POST" }).catch((error) =>
    console.warn(error),
  );
}

function startStorySessionHeartbeat() {
  const sessionId = state.storySessionId;
  if (!sessionId || state.storySessionReleased) {
    return;
  }

  window.setTimeout(async () => {
    if (state.storySessionId !== sessionId || state.storySessionReleased) {
      return;
    }

    try {
      await getStorySession(sessionId);
    } catch (error) {
      console.warn(error);
    }

    startStorySessionHeartbeat();
  }, SESSION_HEARTBEAT_INTERVAL_MS);
}

function pollStorySession(sessionId) {
  window.setTimeout(async () => {
    if (state.storySessionId !== sessionId || !views.waiting.classList.contains("active")) {
      return;
    }

    try {
      const session = await getStorySession(sessionId);
      state.storySessionId = session.id;

      if (session.status === "active") {
        await generateFirstSceneAfterAdmission();
        return;
      }

      updateWaitingText(session);
      pollStorySession(sessionId);
    } catch (error) {
      console.warn(error);
      waitingText.textContent = "排队查询有点慢，请保持页面打开。";
      pollStorySession(sessionId);
    }
  }, SESSION_POLL_INTERVAL_MS);
}

function updateWaitingText(session) {
  const position = Number(session.queuePosition || 0);
  const maxActive = Number(session.maxActive || runtimeConfig.storySessionConcurrency || 8);
  waitingText.textContent =
    position > 1
      ? `现场正在分批进入，前面还有 ${position - 1} 组。每次大约开放 ${maxActive} 组。`
      : "快轮到你了，请保持页面打开。";
}

function cancelWaiting() {
  finishCurrentStorySession();
  showView("home");
}

async function generateScene(actNumber, selectedChoice = "") {
  if (state.usingFallback) {
    return normalizeSceneForUi(demoScenes[actNumber - 1], actNumber);
  }

  try {
    const result = await requestStoryGeneration({
      mode: "scene",
      genre: state.genre,
      opening: state.opening,
      actNumber,
      summary: state.summary,
      selectedChoice,
      scenes: state.scenes,
      choices: state.choices,
    });

    return normalizeSceneForUi(result, actNumber);
  } catch (error) {
    if (isSafetyBlocked(error)) {
      throw error;
    }

    console.warn(error);
    if (error.statusCode === 503) {
      state.usingFallback = true;
      showToast("当前使用演示故事，配置 AI 后可生成真实内容。");
      return normalizeSceneForUi(demoScenes[actNumber - 1], actNumber);
    }

    throw error;
  }
}

async function generateEnding(selectedChoice = "") {
  if (state.usingFallback) {
    return buildFallbackEnding(selectedChoice);
  }

  try {
    const result = await requestStoryGeneration({
      mode: "ending",
      genre: state.genre,
      opening: state.opening,
      actNumber: TOTAL_ACTS,
      summary: state.summary,
      selectedChoice,
      scenes: state.scenes,
      choices: state.choices,
    });

    return normalizeEndingForUi(result);
  } catch (error) {
    if (isSafetyBlocked(error)) {
      throw error;
    }

    console.warn(error);
    if (error.statusCode === 503) {
      state.usingFallback = true;
      showToast("结局暂时使用演示版本，故事流程不会中断。");
      return buildFallbackEnding(selectedChoice);
    }

    throw error;
  }
}

async function requestStoryGeneration(payload) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/story-adventure/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || "故事生成失败");
        error.statusCode = response.status;
        error.code = data.code || "";
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;
      const retryable = !error.statusCode || error.statusCode >= 500;
      if (!retryable || attempt === 1) {
        throw error;
      }

      await wait(700);
    }
  }

  throw lastError || new Error("故事生成失败");
}

function isSafetyBlocked(error) {
  return error?.code === "CHILD_SAFETY_BLOCKED" || error?.statusCode === 422;
}

function renderScene(index) {
  const scene = state.scenes[index];
  state.currentSceneIndex = index;

  document.querySelector("#scene-count").textContent = `第 ${index + 1} 幕 / 共 ${TOTAL_ACTS} 幕`;
  document.querySelector("#scene-title").textContent = scene.title;
  document.querySelector("#scene-genre").textContent = state.genre;
  document.querySelector("#scene-text").textContent = scene.text;
  document.querySelector("#scene-image").innerHTML = renderIllustration(scene, { type: "scene", index });

  const previousChoice = document.querySelector("#previous-choice");
  if (index > 0) {
    previousChoice.textContent = `上一步选择：${state.choices[index - 1]}`;
    previousChoice.classList.remove("hidden");
  } else {
    previousChoice.classList.add("hidden");
  }

  const choiceArea = document.querySelector("#choice-area");
  choiceArea.innerHTML = "";

  scene.choices.forEach((choice, choiceIndex) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = `${String.fromCharCode(65 + choiceIndex)}. ${choice}`;
    button.addEventListener("click", () => choosePath(choice));
    choiceArea.append(button);
  });
}

async function choosePath(choice) {
  const nextIndex = state.currentSceneIndex + 1;
  state.choices[state.currentSceneIndex] = choice;
  saveStoryState();
  document.querySelector("#chosen-option-text").textContent =
    nextIndex >= TOTAL_ACTS ? `你的结局方向：${choice}` : `你的选择：${choice}`;
  showView("writing");

  if (nextIndex >= TOTAL_ACTS) {
    try {
      state.ending = await generateEnding(choice);
      saveStoryState();
      showEnding();
    } catch (error) {
      showError("故事结局需要换一种方向", error.message || "这条路线暂时不适合儿童绘本，请返回重新选择。");
    }
    return;
  }

  try {
    const scene = await generateScene(nextIndex + 1, choice);
    state.scenes[nextIndex] = scene;
    state.summary = scene.summary || state.summary;
    saveStoryState();
    renderScene(nextIndex);
    showView("scene");
    requestSceneImageV2(nextIndex);
  } catch (error) {
    showError("故事需要换一种方向", error.message || "这条路线暂时不适合儿童绘本，请返回重新选择。");
  }
}

function showError(title, message) {
  document.querySelector("#error-title").textContent = title;
  document.querySelector("#error-message").textContent = message;
  showView("error");
}

function showEnding() {
  const ending = state.ending || normalizeEndingForUi(demoEnding);
  state.ending = ending;
  document.querySelector("#ending-title").textContent = ending.title;
  document.querySelector("#ending-type").textContent = ending.type;
  document.querySelector("#ending-text").textContent = ending.text;
  document.querySelector("#ending-image").innerHTML = renderIllustration(ending, { type: "ending" });
  showView("ending");
  requestEndingImageV2();
}

function showNameEntry() {
  playerNameInput.value = state.playerName || "";
  nameMessage.textContent = "";
  showView("name");
  window.setTimeout(() => playerNameInput.focus(), 80);
}

function confirmPlayerName() {
  const name = playerNameInput.value.trim();
  if (!name) {
    nameMessage.textContent = "先写上你的名字，故事书会更有纪念感。";
    return;
  }

  state.playerName = name.slice(0, 12);
  saveStoryState();
  showBook();
}

function showBook(options = {}) {
  renderBookContent();
  showView("book");
  finalizeStorySessionIfReady();
}

function renderBookContent() {
  const ending = state.ending || normalizeEndingForUi(demoEnding);
  const owner = getStoryOwner();
  document.querySelector("#book-title").textContent = owner ? `${owner}的《${ending.title}》` : ending.title;
  document.querySelector("#book-meta").textContent = `类型：${state.genre} | 主角：${owner || ending.protagonist} | 结局：${ending.type}`;
  document.querySelector("#book-ending").textContent = ending.text;
  renderBookImageStatus();

  const pages = document.querySelector("#book-pages");
  pages.innerHTML = "";
  state.scenes.forEach((scene, index) => {
    const article = document.createElement("article");
    article.className = "book-page";
    article.innerHTML = `
      <h3><span>第 ${index + 1} 幕</span><span>${escapeHtml(scene.title)}</span></h3>
      <div class="illustration">${renderIllustration(scene)}</div>
      <p class="story-text">${escapeHtml(scene.text)}</p>
      <p class="choice-record">${`我的选择：${escapeHtml(state.choices[index] || "未选择")}`}</p>
    `;
    pages.append(article);
  });

}

function renderBookImageStatus() {
  const status = document.querySelector("#book-image-status");
  const missing = getMissingStoryImages();
  if (!status) {
    return;
  }

  const providerText = state.lockedImageProvider
    ? `插图风格已锁定：${getImageProviderLabel(state.lockedImageProvider)}`
    : "插图风格会在第一张图生成后自动锁定";

  if (!missing.length) {
    status.hidden = false;
    status.innerHTML = `<span>${escapeHtml(providerText)}</span>`;
    finalizeStorySessionIfReady();
    return;
  }

  const running = missing.filter((item) => item.imageLoading || item.imageJobId).length;
  status.hidden = false;
  status.innerHTML = `
    <span>${escapeHtml(providerText)}；${running ? "插图还在补齐中" : "还有插图没有生成成功"}：${missing.map((item) => `第 ${item.index + 1} 幕`).join("、")}</span>
    <button id="complete-book-images" type="button">${running ? "继续查询缺失插图" : "补齐缺失插图"}</button>
  `;
}

function getMissingStoryImages() {
  return state.scenes
    .map((scene, index) => ({ ...scene, index }))
    .filter((scene) => !scene.generatedImageUrl);
}

function refreshBookContentPreservingScroll() {
  const scrollY = window.scrollY;
  renderBookContent();
  window.scrollTo({ top: scrollY, behavior: "auto" });
}

function getStoryOwner() {
  return String(state.playerName || "").trim();
}

function renderIllustration(scene, options = {}) {
  const imageControls = renderImageControls(scene, options);
  if (scene.imageUrl) {
    return `
      <img class="illustration-img" src="${escapeHtml(scene.imageUrl)}" alt="${escapeHtml(scene.imageTitle || scene.title || "\u6545\u4e8b\u63d2\u56fe")}">
      ${scene.imageLoading ? `<span class="image-status">${escapeHtml(scene.imageStatus || "\u6b63\u5728\u751f\u6210\u63d2\u56fe...")}</span>` : ""}
      ${imageControls}
    `;
  }

  return `
    <div class="illustration-inner" title="${escapeHtml(scene.imagePrompt || scene.imageTitle || "")}">
      <div class="storybook-art" aria-hidden="true">
        <span class="art-sky"></span>
        <span class="art-moon"></span>
        <span class="art-hill art-hill-left"></span>
        <span class="art-hill art-hill-right"></span>
        <span class="art-path"></span>
        <span class="art-spark art-spark-one"></span>
        <span class="art-spark art-spark-two"></span>
        <span class="art-spark art-spark-three"></span>
      </div>
      <div class="illustration-caption">
        <span class="illustration-symbol">${escapeHtml(scene.symbol || "\u2726")}</span>
        <div class="illustration-title">${escapeHtml(scene.imageTitle || scene.title)}</div>
      </div>
      ${scene.imageLoading ? `<span class="image-status">${escapeHtml(scene.imageStatus || "\u6b63\u5728\u751f\u6210\u63d2\u56fe...")}</span>` : ""}
      ${imageControls}
    </div>
  `;
}

function renderImageControls(scene, options = {}) {
  if (!scene?.imageError || !options.type) {
    return "";
  }

  const indexAttr = Number.isInteger(options.index) ? ` data-image-index="${options.index}"` : "";
  const label = scene.imageCanRetry === false ? "继续查询插图" : "重新生成插图";
  return `
    <div class="image-actions">
      <span>${escapeHtml(scene.imageError)}</span>
      <button class="image-retry" type="button" data-image-retry="${escapeHtml(options.type)}"${indexAttr}>${escapeHtml(label)}</button>
    </div>
  `;
}
async function requestSceneImage(index) {
  const scene = state.scenes[index];
  if (!scene || scene.generatedImageUrl || scene.imageLoading || runtimeConfig.imageMode === "cover_only") {
    return;
  }

  scene.imageLoading = true;
  scene.imageStatus = "插图生成中...";
  if (state.currentSceneIndex === index) {
    document.querySelector("#scene-image").innerHTML = renderIllustration(scene);
  }

  try {
    const result = await requestImageGeneration({
      genre: state.genre,
      actNumber: index + 1,
      title: scene.title,
      text: scene.text,
      imagePrompt: scene.imagePrompt,
      includeGuides: false,
    });

    scene.generatedImageUrl = result.imageUrl;
    scene.imageUrl = result.imageUrl;
    scene.imageLoading = false;
    scene.imageStatus = "";
    saveStoryState();
    refreshIllustration("scene", index);
  } catch (error) {
    console.warn(error);
    scene.imageLoading = false;
    scene.imageStatus = "";
    showToast("本幕插图暂时使用默认图。");
    refreshIllustration("scene", index);
  }
}

async function requestEndingImage() {
  const ending = state.ending;
  if (!ending || ending.generatedImageUrl || ending.imageLoading) {
    return;
  }

  ending.imageLoading = true;
  ending.imageStatus = "结局插图生成中...";
  document.querySelector("#ending-image").innerHTML = renderIllustration(ending);

  try {
    const result = await requestImageGeneration({
      genre: state.genre,
      actNumber: TOTAL_ACTS,
      title: ending.title,
      text: ending.text,
      imagePrompt: ending.imagePrompt,
      includeGuides: false,
    });

    ending.generatedImageUrl = result.imageUrl;
    ending.imageUrl = result.imageUrl;
    ending.imageLoading = false;
    ending.imageStatus = "";
    saveStoryState();
    refreshIllustration("ending");
  } catch (error) {
    console.warn(error);
    ending.imageLoading = false;
    ending.imageStatus = "";
    showToast("结局插图暂时使用默认图。");
    refreshIllustration("ending");
  }
}

async function requestImageGeneration(payload) {
  const response = await fetch("/api/story-adventure/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "插图生成失败");
  }

  return data;
}

async function requestSceneImageV2(index, options = {}) {
  const scene = state.scenes[index];
  if (!scene || scene.generatedImageUrl || runtimeConfig.imageMode === "cover_only") {
    return;
  }

  if (scene.imageJobId && !options.force) {
    scene.imageLoading = true;
    scene.imageError = "";
    scene.imageCanRetry = false;
    scene.imageStatus = "正在继续查询插图...";
    saveStoryState();
    refreshIllustration("scene", index);
    pollImageJob(scene.imageJobId, { type: "scene", index });
    return;
  }

  if (scene.imageLoading) {
    return;
  }

  scene.imageLoading = true;
  scene.imageError = "";
  scene.imageCanRetry = false;
  scene.imageJobId = "";
  scene.imageStatus = "插图任务创建中...";
  refreshIllustration("scene", index);

  try {
    const job = await createImageJob({
      genre: state.genre,
      actNumber: index + 1,
      title: scene.title,
      text: scene.text,
      imagePrompt: buildImagePromptWithContinuity(scene.imagePrompt, index),
      includeGuides: false,
      preferredProvider: state.lockedImageProvider || "",
    });

    scene.imageJobId = job.id;
    scene.imageStatus = "插图正在生成，可以先继续故事...";
    saveStoryState();
    refreshIllustration("scene", index);
    pollImageJob(job.id, { type: "scene", index });
  } catch (error) {
    console.warn(error);
    markImageFailed(scene, "插图任务创建失败，可点重新生成");
    refreshIllustration("scene", index);
  }
}

async function requestEndingImageV2(options = {}) {
  const ending = state.ending;
  if (!ending || ending.generatedImageUrl) {
    return;
  }

  if (ending.imageJobId && !options.force) {
    ending.imageLoading = true;
    ending.imageError = "";
    ending.imageCanRetry = false;
    ending.imageStatus = "正在继续查询结局插图...";
    saveStoryState();
    refreshIllustration("ending");
    pollImageJob(ending.imageJobId, { type: "ending" });
    return;
  }

  if (ending.imageLoading) {
    return;
  }

  ending.imageLoading = true;
  ending.imageError = "";
  ending.imageCanRetry = false;
  ending.imageJobId = "";
  ending.imageStatus = "结局插图任务创建中...";
  refreshIllustration("ending");

  try {
    const job = await createImageJob({
      genre: state.genre,
      actNumber: TOTAL_ACTS,
      title: ending.title,
      text: ending.text,
      imagePrompt: buildImagePromptWithContinuity(ending.imagePrompt, state.scenes.length),
      includeGuides: false,
      preferredProvider: state.lockedImageProvider || "",
    });

    ending.imageJobId = job.id;
    ending.imageStatus = "结局插图正在生成...";
    saveStoryState();
    refreshIllustration("ending");
    pollImageJob(job.id, { type: "ending" });
  } catch (error) {
    console.warn(error);
    markImageFailed(ending, "结局插图任务创建失败，可点重新生成");
    refreshIllustration("ending");
  }
}

async function createImageJob(payload) {
  const response = await fetch("/api/story-adventure/image-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "插图任务创建失败");
  }

  return data;
}

function buildImagePromptWithContinuity(basePrompt, sceneIndex) {
  const previousScenes = state.scenes
    .slice(0, Math.max(0, sceneIndex))
    .map((scene, index) => `第${index + 1}幕：${scene.title}，${scene.summary || scene.text}`)
    .join("；");
  const storyClues = [state.opening ? `故事开头：${state.opening}` : "", previousScenes ? `前文线索：${previousScenes}` : ""]
    .filter(Boolean)
    .join("\n");

  return [
    basePrompt,
    storyClues,
    "连续性要求：沿用前文已经出现的主角、动物、怪物、伙伴或关键物品；同一角色要保持外貌、服装颜色、体型比例和气质一致；不要把主角画成另一个新角色。",
  ]
    .filter(Boolean)
    .join("\n");
}

async function getImageJob(jobId) {
  const response = await fetch(`/api/story-adventure/image-jobs/${encodeURIComponent(jobId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "插图任务查询失败");
  }

  return data;
}

function pollImageJob(jobId, target, startedAt = Date.now()) {
  window.setTimeout(async () => {
    const item = getImageTarget(target);
    if (!item || item.generatedImageUrl || item.imageJobId !== jobId) {
      return;
    }

    try {
      const job = await getImageJob(jobId);
      if (job.status === "succeeded" && job.result?.imageUrl) {
        item.generatedImageUrl = job.result.imageUrl;
        item.imageUrl = job.result.imageUrl;
        item.imageProvider = job.result.provider || "";
        item.imageFallbackUsed = Boolean(job.result.fallbackUsed);
        item.imageLoading = false;
        item.imageStatus = "";
        item.imageError = "";
        lockImageProvider(job.result.provider);
        state.allowExportWithMissingImages = false;
        saveStoryState();
        refreshIllustration(target.type, target.index);
        finalizeStorySessionIfReady();
        showToast("插图生成完成，已自动更新。");
        return;
      }

      if (job.status === "failed") {
        markImageFailed(item, "插图生成失败，可点重新生成");
        refreshIllustration(target.type, target.index);
        finalizeStorySessionIfReady();
        return;
      }

      item.imageLoading = true;
      item.imageError = "";
      item.imageCanRetry = false;
      const elapsed = Date.now() - startedAt;
      item.imageStatus =
        elapsed > IMAGE_POLL_TIMEOUT_MS
          ? "插图排队较久，系统仍在继续查询；好了会自动更新。"
          : elapsed > IMAGE_SLOW_NOTICE_MS
            ? "插图比较慢，可以先继续故事；好了会自动更新。"
          : getImageJobStatusText(job);
      saveStoryState();
      refreshIllustration(target.type, target.index);
      pollImageJob(jobId, target, startedAt);
    } catch (error) {
      console.warn(error);
      item.imageLoading = true;
      item.imageError = "";
      item.imageCanRetry = false;
      item.imageStatus = "网络查询有点慢，仍在继续等插图...";
      saveStoryState();
      refreshIllustration(target.type, target.index);
      pollImageJob(jobId, target, startedAt);
    }
  }, IMAGE_POLL_INTERVAL_MS);
}

function getImageTarget(target) {
  if (target.type === "scene") {
    return state.scenes[target.index];
  }
  if (target.type === "ending") {
    return state.ending;
  }
  return null;
}

function getImageJobStatusText(job) {
  if (job.status === "running") {
    return "插图还在生成中...";
  }

  if (job.status === "pending") {
    const position = Number(job.queuePosition || 0);
    return position > 1 ? `插图正在排队，前面还有 ${position - 1} 张...` : "插图即将开始生成...";
  }

  return "插图正在排队...";
}

function lockImageProvider(provider) {
  const normalized = normalizeImageProvider(provider);
  if (!normalized) {
    return;
  }

  if (state.lockedImageProvider !== normalized) {
    state.lockedImageProvider = normalized;
    showToast(`插图风格已锁定：${getImageProviderLabel(normalized)}`);
  }
}

function normalizeImageProvider(provider) {
  const value = String(provider || "").trim().toLowerCase();
  if (value === "openai") return "uu";
  if (value === "uu-gpt-fast") return "uu-fast";
  if (value === "banana" || value === "nano-banana") return "uu-banana";
  if (value === "ark" || value === "seedream") return "volcengine";
  return value;
}

function getImageProviderLabel(provider) {
  const labels = {
    uu: "UU 主通道",
    "uu-fast": "UU 快速通道",
    "uu-banana": "Banana",
    volcengine: "火山 Seedream",
  };
  return labels[normalizeImageProvider(provider)] || provider || "当前模型";
}

function markImageFailed(item, message) {
  item.imageLoading = false;
  item.imageStatus = "";
  item.imageError = message;
  item.imageCanRetry = true;
  state.allowExportWithMissingImages = false;
  showToast("插图暂时没有生成成功，已保留默认图。");
  saveStoryState();
}

function markImageDelayed(item, message) {
  item.imageLoading = false;
  item.imageStatus = "";
  item.imageError = message;
  item.imageCanRetry = false;
  state.allowExportWithMissingImages = false;
  showToast("插图还在后台生成，可以稍后继续查询。");
  saveStoryState();
}

function completeMissingStoryImages() {
  const missing = getMissingStoryImages();
  if (!missing.length) {
    showToast("五幕插图已经齐了，可以导出长图。");
    return;
  }

  state.allowExportWithMissingImages = false;
  missing.forEach((scene) => {
    if (scene.imageLoading) {
      return;
    }

    requestSceneImageV2(scene.index, { force: scene.imageCanRetry !== false });
  });
  renderBookImageStatus();
  showToast("正在补齐缺失插图，可以稍后再导出。");
}

function finalizeStorySessionIfReady() {
  if (!state.ending || !views.book.classList.contains("active") || state.storySessionReleased) {
    return;
  }

  if (getMissingStoryImages().length) {
    return;
  }

  finishCurrentStorySession();
  markStoryCompletedForCooldown();
}

function markStoryCompletedForCooldown() {
  if (state.completionRecordedAt) {
    return;
  }

  const completedAt = Date.now();
  state.completionRecordedAt = completedAt;
  try {
    localStorage.setItem(COMPLETION_LIMIT_KEY, String(completedAt));
  } catch (error) {
    console.warn(error);
  }
  saveStoryState();
}

function getCompletionCooldownRemainingMs() {
  const completedAt = getLastCompletionTime();
  if (!completedAt) {
    return 0;
  }

  const remaining = runtimeConfig.storyCompletedCooldownMs - (Date.now() - completedAt);
  return Math.max(0, remaining);
}

function getLastCompletionTime() {
  const values = [Number(state.completionRecordedAt || 0)];
  try {
    values.push(Number(localStorage.getItem(COMPLETION_LIMIT_KEY) || 0));
  } catch (error) {
    console.warn(error);
  }

  return Math.max(...values.filter((value) => Number.isFinite(value)));
}

function isCompletionCooldownActive() {
  return getCompletionCooldownRemainingMs() > 0;
}

function getCompletionCooldownMessage() {
  const minutes = Math.max(1, Math.ceil(getCompletionCooldownRemainingMs() / 60000));
  return `你已经完成过一次现场体验啦。为了让后面的同学也能生成插图，请约 ${minutes} 分钟后再开始新故事；也可以点“继续上次故事”回看和导出。`;
}

function resumePendingImageJobs() {
  state.scenes.forEach((scene, index) => {
    if (scene?.imageJobId && !scene.generatedImageUrl) {
      scene.imageLoading = true;
      scene.imageError = "";
      scene.imageStatus = "正在继续查询插图...";
      pollImageJob(scene.imageJobId, { type: "scene", index });
    }
  });

  if (state.ending?.imageJobId && !state.ending.generatedImageUrl) {
    state.ending.imageLoading = true;
    state.ending.imageError = "";
    state.ending.imageStatus = "正在继续查询结局插图...";
    pollImageJob(state.ending.imageJobId, { type: "ending" });
  }
}

function refreshIllustration(type, index) {
  if (type === "scene" && state.currentSceneIndex === index && views.scene.classList.contains("active")) {
    document.querySelector("#scene-image").innerHTML = renderIllustration(state.scenes[index], { type: "scene", index });
  }

  if (type === "ending" && views.ending.classList.contains("active")) {
    document.querySelector("#ending-image").innerHTML = renderIllustration(state.ending, { type: "ending" });
  }

  if (views.book.classList.contains("active")) {
    refreshBookContentPreservingScroll();
  }
}

async function exportStoryLongImage() {
  if (!state.scenes.length) {
    showToast("先完成一个故事，再导出长图。");
    return;
  }

  const missing = getMissingStoryImages();
  if (missing.length && !state.allowExportWithMissingImages) {
    state.allowExportWithMissingImages = true;
    renderBookImageStatus();
    showToast(`还有 ${missing.length} 幕插图未补齐，先点“补齐缺失插图”。再次点击可导出当前版本。`);
    return;
  }

  const button = document.querySelector("#save-story");
  button.disabled = true;
  button.textContent = "正在生成长图...";

  try {
    const blob = await renderStorybookPng();
    const owner = getStoryOwner();
    const filename = `${sanitizeFilename(owner ? `${owner}的故事书` : state.ending?.title || "我的故事书")}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isWeChat = isWeChatBrowser();
    const url = URL.createObjectURL(blob);

    if (isMobile && !isWeChat && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: filename.replace(/\.png$/i, ""),
        files: [file],
      });
      showToast("已打开系统保存/分享面板。");
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.append(link);
    link.click();
    link.remove();

    renderExportPreview(url, filename, isWeChat);

    if (isWeChat) {
      showToast("微信内建议点右上角在浏览器打开；下方也可尝试长按预览图保存。");
    } else if (isMobile) {
      window.open(url, "_blank");
      showToast("如果没有自动保存，请在打开的长图中长按保存。");
    } else {
      showToast("长图已导出。");
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.warn(error);
    showToast("长图导出失败，请等图片加载完成后再试。");
  } finally {
    button.disabled = false;
    button.textContent = "导出长图";
  }
}

function renderExportPreview(url, filename, isWeChat) {
  if (!exportPreview) {
    return;
  }

  exportPreview.classList.remove("hidden");
  exportPreview.innerHTML = `
    <p>${escapeHtml(isWeChat ? "微信内长按保存可能失败。最稳的方法：点右上角“在浏览器打开”，再导出或长按保存。" : "如果没有自动保存，也可以在下面重新打开长图。")}</p>
    <a class="export-preview-link" href="${escapeHtml(url)}" target="_blank" download="${escapeHtml(filename)}">
      <img class="export-preview-image" src="${escapeHtml(url)}" alt="导出的故事长图预览">
    </a>
  `;
}

async function renderStorybookPng() {
  const width = 1080;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = 9000;

  const ending = state.ending || normalizeEndingForUi(demoEnding);
  const owner = getStoryOwner();
  const padding = 62;
  const cardX = 46;
  const cardW = width - cardX * 2;
  const imageH = 500;
  let y = 0;

  ctx.fillStyle = "#f6edda";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSoftBackground(ctx, width, canvas.height);

  y += 70;
  ctx.fillStyle = "#74439d";
  ctx.font = "900 48px Microsoft YaHei, Arial";
  y = drawWrappedText(ctx, owner ? `${owner}的故事书` : "AI 互动故事冒险机", padding, y, width - padding * 2, 62);
  ctx.fillStyle = "#3b2854";
  ctx.font = "900 68px Microsoft YaHei, Arial";
  y = drawWrappedText(ctx, ending.title || "我的故事书", padding, y + 18, width - padding * 2, 82);
  ctx.fillStyle = "#6b5b70";
  ctx.font = "700 30px Microsoft YaHei, Arial";
  y = drawWrappedText(
    ctx,
    `类型：${state.genre}   主角：${owner || ending.protagonist || "我"}   结局：${ending.type || "故事结局"}`,
    padding,
    y + 16,
    width - padding * 2,
    42,
  );
  y = drawWrappedText(ctx, `开头：${state.opening || "我写下了一个故事开头。"}`, padding, y + 14, width - padding * 2, 42);

  const coverImage = await loadCanvasImage(ending.imageUrl || "assets/book-ending.png");
  y += 28;
  drawImageOrPlaceholder(ctx, coverImage, padding, y, width - padding * 2, imageH, "我的故事封面");
  y += imageH + 58;

  for (let index = 0; index < state.scenes.length; index += 1) {
    const scene = state.scenes[index];
    const img = await loadCanvasImage(scene.imageUrl || "assets/story-choice.png");
    const cardStart = y;
    const estimatedHeight = 1160;

    drawCardBackground(ctx, cardX, cardStart, cardW, estimatedHeight);
    y += 42;
    ctx.fillStyle = "#c9842d";
    ctx.font = "900 30px Microsoft YaHei, Arial";
    y = drawWrappedText(ctx, `第 ${index + 1} 幕`, padding, y, width - padding * 2, 42);
    ctx.fillStyle = "#30243f";
    ctx.font = "900 46px Microsoft YaHei, Arial";
    y = drawWrappedText(ctx, scene.title, padding, y + 8, width - padding * 2, 58);
    y += 26;
    drawImageOrPlaceholder(ctx, img, padding, y, width - padding * 2, imageH, scene.title);
    y += imageH + 50;
    ctx.fillStyle = "#30243f";
    ctx.font = "800 38px Microsoft YaHei, Arial";
    y = drawWrappedText(ctx, scene.text, padding, y, width - padding * 2, 58);
    ctx.fillStyle = "#9a651f";
    ctx.font = "900 34px Microsoft YaHei, Arial";
    y = drawWrappedText(ctx, `我的选择：${state.choices[index] || "未选择"}`, padding, y + 26, width - padding * 2, 48);
    y += 64;
  }

  drawCardBackground(ctx, cardX, y, cardW, 660);
  y += 44;
  ctx.fillStyle = "#c9842d";
  ctx.font = "900 30px Microsoft YaHei, Arial";
  y = drawWrappedText(ctx, "结局", padding, y, width - padding * 2, 42);
  ctx.fillStyle = "#30243f";
  ctx.font = "900 48px Microsoft YaHei, Arial";
  y = drawWrappedText(ctx, ending.title, padding, y + 8, width - padding * 2, 62);
  ctx.fillStyle = "#74439d";
  ctx.font = "900 32px Microsoft YaHei, Arial";
  y = drawWrappedText(ctx, ending.type || "故事结局", padding, y + 8, width - padding * 2, 46);
  ctx.fillStyle = "#30243f";
  ctx.font = "700 32px Microsoft YaHei, Arial";
  y = drawWrappedText(ctx, ending.text, padding, y + 18, width - padding * 2, 48);
  y += 70;

  const output = document.createElement("canvas");
  output.width = width;
  output.height = Math.min(y, canvas.height);
  output.getContext("2d").drawImage(canvas, 0, 0);

  return new Promise((resolve, reject) => {
    output.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

function drawSoftBackground(ctx, width, height) {
  const purple = ctx.createRadialGradient(width * 0.1, 260, 20, width * 0.1, 260, 700);
  purple.addColorStop(0, "rgba(116, 67, 157, 0.2)");
  purple.addColorStop(1, "rgba(116, 67, 157, 0)");
  ctx.fillStyle = purple;
  ctx.fillRect(0, 0, width, height);

  const gold = ctx.createRadialGradient(width * 0.9, 760, 20, width * 0.9, 760, 760);
  gold.addColorStop(0, "rgba(201, 132, 45, 0.22)");
  gold.addColorStop(1, "rgba(201, 132, 45, 0)");
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, width, height);
}

function drawCardBackground(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 249, 236, 0.94)";
  ctx.strokeStyle = "#e6d6bd";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 24);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawImageOrPlaceholder(ctx, image, x, y, width, height, title) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 24);
  ctx.clip();

  if (image) {
    const scale = Math.max(width / image.width, height / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#b7dfec");
    gradient.addColorStop(0.48, "#f8d69a");
    gradient.addColorStop(1, "#4c9a75");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(255, 249, 236, 0.9)";
    ctx.font = "900 36px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.fillText(title || "故事插图", x + width / 2, y + height / 2);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const value = String(text || "");
  const paragraphs = value.split(/\n+/);
  let cursorY = y;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    let line = "";
    for (const char of paragraph) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
        line = char;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
    if (paragraphIndex < paragraphs.length - 1) {
      cursorY += lineHeight * 0.4;
    }
  });

  return cursorY;
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function sanitizeFilename(name) {
  return String(name || "我的故事书").replace(/[\\/:*?"<>|]/g, "").slice(0, 40) || "我的故事书";
}

function isWeChatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeSceneForUi(scene, actNumber) {
  const fallback = demoScenes[actNumber - 1] || demoScenes[demoScenes.length - 1];
  return {
    title: String(scene?.title || fallback.title).trim(),
    text: String(scene?.text || fallback.text).trim(),
    choices: normalizeChoices(scene?.choices, fallback.choices),
    symbol: fallback.symbol,
    imageUrl: String(scene?.imageUrl || fallback.imageUrl || "assets/story-choice.png").trim(),
    imageTitle: String(scene?.imageTitle || scene?.title || fallback.imageTitle).trim(),
    imagePrompt: String(scene?.imagePrompt || fallback.imagePrompt || fallback.imageTitle).trim(),
    summary: String(scene?.summary || fallback.summary || scene?.text || fallback.text).trim(),
  };
}

function normalizeEndingForUi(ending) {
  return {
    title: String(ending?.title || demoEnding.title).trim(),
    type: String(ending?.type || demoEnding.type).trim(),
    protagonist: String(ending?.protagonist || demoEnding.protagonist).trim(),
    text: String(ending?.text || demoEnding.text).trim(),
    symbol: demoEnding.symbol,
    imageUrl: String(ending?.imageUrl || demoEnding.imageUrl || "assets/book-ending.png").trim(),
    imageTitle: String(ending?.imageTitle || ending?.title || demoEnding.imageTitle).trim(),
    imagePrompt: String(ending?.imagePrompt || demoEnding.imagePrompt).trim(),
    summary: String(ending?.summary || ending?.text || demoEnding.summary).trim(),
  };
}

function buildFallbackEnding(selectedChoice = "") {
  const lastScene = state.scenes[state.scenes.length - 1];
  const title = lastScene?.title || demoEnding.title;
  const motif = extractStoryMotif();
  const endingText = `你顺着${motif}留下的线索，做出了“${selectedChoice || "继续相信故事"}”的选择。最后，所有光点慢慢聚在一起，变成一本温暖的故事书。你和伙伴明白了，真正重要的不是找到宝藏，而是把每一次选择都变成属于自己的冒险。`;

  return normalizeEndingForUi({
    title,
    type: "专属结局",
    protagonist: "你和伙伴",
    text: endingText,
    imagePrompt: `${title}的温暖结局，主角和故事中已经出现的角色一起看着发光故事书，儿童绘本风格`,
    summary: endingText,
  });
}

function extractStoryMotif() {
  const text = [state.opening, ...state.scenes.map((scene) => `${scene.title} ${scene.text}`)].join(" ");
  const motifs = ["发光地图", "旧钟楼", "空白书", "小兔子", "小怪物", "会说话的猫", "星星", "钥匙", "故事书"];
  return motifs.find((item) => text.includes(item)) || "故事";
}

function normalizeChoices(choices, fallbackChoices) {
  const cleaned = Array.isArray(choices)
    ? choices.map((choice) => String(choice || "").trim()).filter(Boolean)
    : [];

  return cleaned.length === 3 ? cleaned : fallbackChoices;
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

    seedDemo();
    const target = button.dataset.demo;
    if (target === "cover") showView("cover");
    if (target === "home") showView("home");
    if (target === "waiting") showView("waiting");
    if (target === "loading") showView("loading");
    if (target === "scene") {
      renderScene(2);
      showView("scene");
    }
    if (target === "writing") showView("writing");
    if (target === "ending") showEnding();
    if (target === "name") showNameEntry();
    if (target === "book") showBook();
    if (target === "error") showView("error");
  });
}

function seedDemo() {
  state = {
    ...getInitialState(),
    genre: "奇幻",
    opening: "我在学校储物柜里发现了一张会发光的地图。",
    scenes: demoScenes.map((scene, index) => normalizeSceneForUi(scene, index + 1)),
    choices: ["找最好的朋友一起研究", "去校史馆找照片", "推开门", "从窗户往里看", "写下勇敢的结尾"],
    summary: demoScenes[4].summary,
    ending: normalizeEndingForUi(demoEnding),
    playerName: "小宇",
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function triggerMagicClick(target) {
  const button = target?.closest?.("button");
  if (!button || button.disabled || button.closest("#demo-toolbar")) {
    return;
  }

  button.classList.remove("magic-pressed");
  void button.offsetWidth;
  button.classList.add("magic-pressed");
  window.setTimeout(() => button.classList.remove("magic-pressed"), 520);

  if (navigator.vibrate) {
    navigator.vibrate(18);
  }

  const rect = button.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const count = 5;

  for (let index = 0; index < count; index += 1) {
    const sparkle = document.createElement("span");
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const distance = 34 + index * 5;
    sparkle.className = "magic-sparkle";
    sparkle.textContent = "✦";
    sparkle.style.left = `${centerX}px`;
    sparkle.style.top = `${centerY}px`;
    sparkle.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
    sparkle.style.animationDelay = `${index * 24}ms`;
    document.body.append(sparkle);
    sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
  }
}

genreButtons.forEach((button) => {
  button.addEventListener("click", () => setGenre(button));
});

document.querySelectorAll(".example").forEach((button) => {
  button.addEventListener("click", () => {
    storyStartInput.value = button.dataset.start;
    homeMessage.textContent = "";
  });
});

document.querySelector("#voice-input")?.addEventListener("click", () => {
  showToast("\u8bed\u97f3\u8f93\u5165\u6682\u4e0d\u5f00\u653e\uff0c\u8bf7\u5148\u4f7f\u7528\u6587\u5b57\u8f93\u5165\u3002");
});
document.querySelector("#enter-story").addEventListener("click", () => showView("home"));
resumeStoryButton.addEventListener("click", restoreSavedStory);
document.querySelector("#start-adventure").addEventListener("click", startAdventure);
document.querySelector("#cancel-waiting").addEventListener("click", cancelWaiting);
document.querySelector("#cancel-loading").addEventListener("click", () => {
  finishCurrentStorySession();
  showView("home");
});
document.querySelector("#make-book").addEventListener("click", showNameEntry);
document.querySelector("#confirm-book").addEventListener("click", confirmPlayerName);
document.querySelector("#skip-name").addEventListener("click", () => {
  state.playerName = "";
  saveStoryState();
  showBook();
});
playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    confirmPlayerName();
  }
});
document.querySelector("#review-story").addEventListener("click", () => {
  renderScene(0);
  showView("scene");
});
document.querySelector("#restart-story").addEventListener("click", () => {
  if (isCompletionCooldownActive()) {
    showToast(getCompletionCooldownMessage());
    return;
  }

  finishCurrentStorySession();
  state = getInitialState();
  clearSavedStory();
  storyStartInput.value = "";
  showView("cover");
});
document.querySelector("#save-story").addEventListener("click", exportStoryLongImage);
document.querySelector("#error-edit").addEventListener("click", () => showView("home"));
document.querySelector("#error-retry").addEventListener("click", startAdventure);
document.addEventListener("click", (event) => {
  triggerMagicClick(event.target);

  const completeButton = event.target.closest("#complete-book-images");
  if (completeButton) {
    completeMissingStoryImages();
    return;
  }

  const button = event.target.closest("[data-image-retry]");
  if (!button) return;

  const type = button.dataset.imageRetry;
  if (type === "scene") {
    const index = Number(button.dataset.imageIndex);
    if (Number.isInteger(index) && state.scenes[index]) {
      const scene = state.scenes[index];
      const shouldCreateNewJob = scene.imageCanRetry !== false;
      scene.imageError = "";
      if (shouldCreateNewJob) {
        scene.imageJobId = "";
      }
      requestSceneImageV2(index, { force: shouldCreateNewJob });
    }
  }

  if (type === "ending" && state.ending) {
    const shouldCreateNewJob = state.ending.imageCanRetry !== false;
    state.ending.imageError = "";
    if (shouldCreateNewJob) {
      state.ending.imageJobId = "";
    }
    requestEndingImageV2({ force: shouldCreateNewJob });
  }
});

setupDemoToolbar();
loadRuntimeConfig();
updateResumeButton();
