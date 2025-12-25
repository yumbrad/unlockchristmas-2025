"use strict";

const TOTAL_LEVELS = 7;
const PRIME_SET = new Set([2, 3, 5, 7, 11, 13, 17, 19]);
const AUDIO_FILES = {
  boot: "assets/sfx/boot.mp3",
  typing: "assets/sfx/typing.mp3",
  error: "assets/sfx/error.mp3",
  adelle: "assets/sfx/sfx_adelle_success.mp3",
  thaddeus: "assets/sfx/sfx_thaddeus_moon.mp3",
  josiah: "assets/sfx/sfx_josiah_portal.mp3",
  maisie: "assets/sfx/sfx_maisie_sims.mp3",
  mikeyHit: "assets/sfx/sfx_mikey_hit.mp3",
  mikeyMiss: "assets/sfx/sfx_mikey_miss.mp3",
  mikey: "assets/sfx/sfx_mikey_victory.mp3",
  laurana: "assets/sfx/sfx_laurana_spaceballs.mp3",
  norasue: "assets/sfx/sfx_norasue_finalsolve.mp3",
  finale: "assets/sfx/finale.mp3",
};

const SUCCESS_MESSAGES = {
  0: "ADELLE -> AUTHORIZATION GRANTED",
  1: "THADDEUS -> MODULE RESTORED",
  2: "JOSIAH -> UNEXPECTEDLY SUCCESSFUL",
  3: "MAISIE -> ANOMALY RESOLVED",
  4: "MIKEY -> OUTCOME EXCEEDS EXPECTATIONS",
  5: "LAURANA -> CHAIN REACTION INITIATED",
  6: "NORASUE -> FINAL PROTOCOLS UNLOCKED",
};

const BOOT_LINES = [
  "INITIALIZING SYSTEMS...",
  "CHECKING ASSET REGISTRY...",
  "VERIFYING VAULT INDEX...",
  "SYNCING HOLIDAY PROTOCOLS...",
  "ERROR.",
  "ERROR.",
  "ERROR.",
  "",
  "CHRISTMAS ASSETS: NOT FOUND",
  "STATUS: OFFLINE",
  "LAST KNOWN STATE: SECURED",
  "",
  "CAUSE: MULTIPLE SYSTEM FAILURES",
  "RECOVERY REQUIRED",
  "",
  "PRIORITY MODULE REQUIRED",
  "EXECUTION NODE: OFFLINE",
  "ASSIGNED OPERATOR: ADELLE",
];

const FINALE_SECTIONS = [
  "ASSET LOCATED.",
  "DESIGNATED HOLDING AREA:\nFORWARD AUXILIARY LUGGAGE SPACE",
  "NOTE:\n\"FRUNK\" IS NOT AN\nAPPROVED DESIGNATION.",
  "AN EXCEPTION\nHAS BEEN GRANTED.",
  "MERRY CHRISTMAS.",
];

const CONNECTIONS_DATA = [
  {
    name: "CANVA EDITOR TABS",
    letter: "C",
    items: ["ELEMENTS", "TEXT", "UPLOADS", "PROJECTS"],
  },
  {
    name: "OBSCURE SLOTH SPECIES",
    letter: "O",
    items: ["PYGMY", "MANED", "BROWN-THROATED", "PALE-THROATED"],
  },
  {
    name: "OTHER WEASLEY SIBLINGS",
    letter: "O",
    items: ["BILL", "CHARLIE", "PERCY", "GINNY"],
  },
  {
    name: "PAINTING AND DRAWING",
    letter: "P",
    items: ["PENCIL", "CHARCOAL", "INK", "PASTEL"],
  },
];

const state = {
  currentLevel: 0,
  mikeyStage: 1,
  mikeyAwaitingContinue: false,
  josiahStage: 1,
  josiahSequenceRunning: false,
  isTransitioning: false,
  norasueSolved: new Set(),
  audioArmed: false,
  finalePlayed: false,
  finaleTransitionRunning: false,
  finaleTransitionComplete: false,
};

let elements = {};
let audioBank = {};
let activeLevel = null;
let lastTypingSound = 0;
let lastErrorSound = 0;
let connectionsTiles = [];
let selectedTiles = [];
let mikeyGame = null;

document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  cacheElements();
  audioBank = buildAudioBank();
  if (audioBank.finale) {
    audioBank.finale.load();
  }
  bindEvents();
  initConnections();
  loadState();
  updateJosiahUI();
  updateDashboard();

  const savedProgress = readStorage("unlockProgress");
  const skipIntro = shouldSkipIntro();
  if (savedProgress) {
    showMainAndDashboard();
    showScreen(null);
    showLevel(state.currentLevel);
    return;
  }
  if (skipIntro) {
    showMainAndDashboard();
    showScreen(null);
    setLevel(0);
    return;
  }

  hideMainAndDashboard();
  await runIntroSequence({ bootAudio: audioBank.boot, errorAudio: audioBank.error });
  showScreen(null);
  showMainAndDashboard();
  setLevel(0);
}

function cacheElements() {
  elements = {
    dashboard: document.getElementById("dashboard"),
    mainContent: document.getElementById("main-content"),
    introScreen: document.getElementById("intro"),
    introNormal: document.getElementById("introNormal"),
    introBoot: document.getElementById("introBoot"),
    bootLog: document.getElementById("bootLog"),
    bootBigLine: document.getElementById("bootBigLine"),
    introStartBtn: document.getElementById("introStartBtn"),
    levelSections: Array.from(document.querySelectorAll(".level")),
    progressFill: document.getElementById("progress-fill"),
    progressText: document.getElementById("progress-text"),
    avatarSlots: Array.from(document.querySelectorAll(".avatar-slot")),
    adelleForm: document.getElementById("adelle-form"),
    adelleInput: document.getElementById("adelle-code"),
    adelleResponse: document.getElementById("adelle-response"),
    thaddeusForm: document.getElementById("thaddeus-form"),
    thaddeusInputs: Array.from(document.querySelectorAll("#thaddeus-form .hud-input")),
    thaddeusResponse: document.getElementById("thaddeus-response"),
    josiahForm: document.getElementById("josiah-form"),
    josiahInput: document.getElementById("josiah-code"),
    josiahResponse: document.getElementById("josiah-response"),
    josiahKeypadButtons: Array.from(document.querySelectorAll(".keypad-grid button")),
    josiahLog: document.getElementById("josiah-log"),
    remoteFeed: document.getElementById("remote-feed"),
    maisieForm: document.getElementById("maisie-form"),
    maisieInput: document.getElementById("maisie-code"),
    maisieResponse: document.getElementById("maisie-response"),
    mikeyForm: document.getElementById("mikey-form"),
    mikeyInput: document.getElementById("mikey-code"),
    mikeyResponse: document.getElementById("mikey-response"),
    mikeyStage1: document.getElementById("mikey-stage1"),
    mikeyStage2: document.getElementById("mikey-stage2"),
    mikeyCanvas: document.getElementById("mikey-canvas"),
    mikeyStreak: document.getElementById("mikey-streak"),
    mikeyStatus: document.getElementById("mikey-status"),
    mikeyVictory: document.getElementById("mikey-victory"),
    lauranaForm: document.getElementById("laurana-form"),
    lauranaResponse: document.getElementById("laurana-response"),
    connectionsGrid: document.getElementById("connections-grid"),
    connectionsSubmit: document.getElementById("connections-submit"),
    connectionsStatus: document.getElementById("connections-status"),
    connectionsCategories: document.getElementById("connections-categories"),
    coopMessage: document.getElementById("coop-message"),
    coopInputWrap: document.getElementById("coop-input"),
    coopInput: document.getElementById("coop-code"),
    coopSubmit: document.getElementById("coop-submit"),
    finaleMessage: document.getElementById("finale-message"),
    finaleTransition: document.getElementById("finale-transition"),
    finaleGlyph: document.getElementById("finale-glyph"),
    finaleFlash: document.getElementById("finale-flash"),
    successBanner: document.getElementById("success-banner"),
    successText: document.getElementById("success-text"),
    adminPanel: document.getElementById("admin-panel"),
    adminClose: document.getElementById("admin-close"),
    adminClear: document.getElementById("admin-clear"),
    adminComplete: document.getElementById("admin-complete"),
    adminIntro: document.getElementById("admin-intro"),
    adminLevelButtons: Array.from(document.querySelectorAll("[data-admin-level]")),
  };
}

function bindEvents() {
  document.addEventListener("click", armAudio, { once: true });
  document.addEventListener("keydown", armAudio, { once: true });
  document.addEventListener("keydown", handleAdminShortcut);
  document.addEventListener("keydown", handleMikeyContinue);
  document.addEventListener("keydown", handleSpikeControl);

  elements.adelleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isTransitioning) {
      return;
    }
    const value = elements.adelleInput.value.trim().toUpperCase();
    if (value === "RANDM") {
      grantAccess(elements.adelleResponse, "ACCESS GRANTED");
      playSound("adelle");
      showSuccessBanner(SUCCESS_MESSAGES[0], advanceLevel);
    } else {
      denyAccess(getLevelSection(0), elements.adelleResponse);
    }
  });

  elements.thaddeusInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value.length === 1 && elements.thaddeusInputs[index + 1]) {
        elements.thaddeusInputs[index + 1].focus();
      }
    });
  });

  elements.thaddeusForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isTransitioning) {
      return;
    }
    const combo = elements.thaddeusInputs.map((input) => input.value.trim()).join("");
    if (combo === "198") {
      grantAccess(elements.thaddeusResponse, "POWER MOON RESTORED");
      playSound("thaddeus");
      showSuccessBanner(SUCCESS_MESSAGES[1], advanceLevel);
    } else {
      denyAccess(getLevelSection(1), elements.thaddeusResponse);
    }
  });

  elements.josiahKeypadButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      const action = button.dataset.action;
      if (key) {
        if (elements.josiahInput.value.length < getJosiahMaxLength()) {
          elements.josiahInput.value += key;
          playTyping();
        }
      } else if (action === "clear") {
        elements.josiahInput.value = "";
      } else if (action === "back") {
        elements.josiahInput.value = elements.josiahInput.value.slice(0, -1);
      }
    });
  });

  elements.josiahForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isTransitioning) {
      return;
    }
    if (state.josiahSequenceRunning) {
      return;
    }
    const value = elements.josiahInput.value.trim();
    if (state.josiahStage === 1 && value === "527") {
      grantAccess(elements.josiahResponse, "CODE ACCEPTED");
      runJosiahSequence();
    } else if (state.josiahStage === 2 && value === "6767") {
      grantAccess(elements.josiahResponse, "PORTAL CALIBRATED");
      playSound("josiah");
      showSuccessBanner(SUCCESS_MESSAGES[2], advanceLevel);
    } else {
      denyAccess(getLevelSection(2), elements.josiahResponse);
    }
  });

  elements.remoteFeed.addEventListener("click", () => {
    const url = elements.remoteFeed.dataset.url || "https://example.com";
    window.open(url, "_blank", "noopener");
  });

  elements.maisieForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isTransitioning) {
      return;
    }
    const value = elements.maisieInput.value.trim().toUpperCase();
    if (value === "ROSEBUD") {
      grantAccess(elements.maisieResponse, "SIMLISH CONFIRMED");
      playSound("maisie");
      showSuccessBanner(SUCCESS_MESSAGES[3], advanceLevel);
    } else {
      denyAccess(getLevelSection(3), elements.maisieResponse);
    }
  });

  elements.mikeyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = elements.mikeyInput.value.trim().toUpperCase();
    if (value === "SERVER") {
      grantAccess(elements.mikeyResponse, "FIREWALL BYPASSED");
      setMikeyStage(2);
      showMikeyStage();
    } else {
      denyAccess(getLevelSection(4), elements.mikeyResponse);
    }
  });

  elements.lauranaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isTransitioning) {
      return;
    }
    const answerKey = {
      "dark-helmet": "apricot",
      skroob: "marmalade",
      "dot-matrix": "grape",
      barf: "strawberry",
      "lone-starr": "raspberry",
    };
    let correct = true;
    elements.lauranaForm.querySelectorAll("select").forEach((select) => {
      const expected = answerKey[select.dataset.character];
      if (select.value !== expected) {
        correct = false;
      }
    });
    if (correct) {
      grantAccess(elements.lauranaResponse, "12345... AMAZING!");
      playSound("laurana");
      showSuccessBanner(SUCCESS_MESSAGES[5], advanceLevel);
    } else {
      denyAccess(getLevelSection(5), elements.lauranaResponse);
    }
  });

  elements.connectionsSubmit.addEventListener("click", submitConnections);
  elements.coopSubmit.addEventListener("click", verifyCoopCode);
  elements.coopInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      verifyCoopCode();
    }
  });

  elements.adminLevelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const level = Number(button.dataset.adminLevel);
      if (!Number.isNaN(level)) {
        setLevel(level);
        closeAdminPanel();
      }
    });
  });

  elements.adminClose.addEventListener("click", closeAdminPanel);
  elements.adminComplete.addEventListener("click", () => {
    advanceLevel();
    closeAdminPanel();
  });
  if (elements.adminIntro) {
    elements.adminIntro.addEventListener("click", () => {
      skipIntroToLevelZero();
      closeAdminPanel();
    });
  }
  elements.adminClear.addEventListener("click", () => {
    resetAllProgress();
    closeAdminPanel();
  });

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", playTyping);
  });

  window.addEventListener("resize", () => {
    if (activeLevel === 4 && state.mikeyStage === 2) {
      resizeMikeyCanvas();
    }
  });
}

function buildAudioBank() {
  const bank = {};
  Object.entries(AUDIO_FILES).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    bank[key] = audio;
  });
  return bank;
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  document.body.classList.toggle("intro-active", screenId === "intro");
  if (!screenId) {
    return;
  }
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
  }
}

function showSuccessBanner(message, onComplete) {
  if (!elements.successBanner || !elements.successText) {
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }
  if (state.isTransitioning) {
    return;
  }
  state.isTransitioning = true;
  elements.successText.textContent = message;
  elements.successBanner.classList.remove("hidden");
  elements.successBanner.classList.add("show");
  setTimeout(() => {
    elements.successBanner.classList.remove("show");
  }, 4700);
  setTimeout(() => {
    elements.successBanner.classList.add("hidden");
    elements.successText.textContent = "";
    state.isTransitioning = false;
    if (typeof onComplete === "function") {
      onComplete();
    }
  }, 5000);
}

function startFinaleTransition() {
  if (state.finaleTransitionRunning) {
    return;
  }
  state.finaleTransitionRunning = true;

  if (!elements.finaleTransition || !elements.finaleGlyph || !elements.finaleFlash) {
    showFinaleMessage();
    state.finaleTransitionRunning = false;
    state.finaleTransitionComplete = true;
    return;
  }

  let started = false;
  const beginTransition = () => {
    if (started) {
      return;
    }
    started = true;
    const soundDuration = getFinaleRemainingMs();
    const phase2Speedup = 5000;
    const glyphDuration = Math.max(800, soundDuration - 300 - phase2Speedup);
    elements.finaleTransition.style.setProperty("--glyph-duration", `${glyphDuration}ms`);
    setFinaleGlyphShape();
    if (elements.finaleMessage) {
      elements.finaleMessage.classList.remove("show");
      elements.finaleMessage.textContent = "";
    }
    elements.finaleTransition.classList.remove("hidden");
    elements.finaleTransition.classList.add("show");
    elements.finaleTransition.classList.remove("active", "pulse");
    elements.finaleFlash.classList.remove("show");
    elements.finaleTransition.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      elements.finaleTransition.classList.add("active");
    }, 300);

    const flashAt = Math.max(0, glyphDuration + 3000);
    const pulseDelay = Math.max(0, flashAt - 220);
    setTimeout(() => {
      elements.finaleTransition.classList.add("pulse");
      setTimeout(() => {
        elements.finaleTransition.classList.remove("pulse");
      }, 500);
    }, pulseDelay);

    const flashDuration = 120;
    setTimeout(() => {
      elements.finaleFlash.classList.add("show");
    }, flashAt);

    setTimeout(() => {
      elements.finaleFlash.classList.remove("show");
    }, flashAt + flashDuration);

    const stillnessDelay = flashAt + flashDuration + 250;
    setTimeout(() => {
      elements.finaleTransition.classList.remove("show");
      elements.finaleTransition.classList.add("hidden");
      elements.finaleTransition.setAttribute("aria-hidden", "true");
      showFinaleMessage();
      state.finaleTransitionRunning = false;
      state.finaleTransitionComplete = true;
    }, stillnessDelay);
  };

  const startAudio = playFinaleAudio();
  if (startAudio && typeof startAudio.then === "function") {
    startAudio.then(() => {
      beginTransition();
    }).catch(() => {
      beginTransition();
    });
    return;
  }
  beginTransition();
}

function setFinaleGlyphShape() {
  if (!elements.finaleGlyph) {
    return;
  }
  const shapes = ["hexagon", "square", "circle"];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  elements.finaleGlyph.dataset.shape = shape;
}

function playFinaleAudio() {
  const audio = audioBank.finale;
  if (state.finalePlayed || !state.audioArmed || !audio) {
    return Promise.resolve(false);
  }
  state.finalePlayed = true;
  audio.preload = "auto";
  audio.currentTime = 0;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    return playPromise.then(() => true).catch(() => false);
  }
  return Promise.resolve(true);
}

function getFinaleRemainingMs() {
  const audio = audioBank.finale;
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
    const remaining = Math.max(0, audio.duration - audio.currentTime);
    return remaining * 1000;
  }
  return 4200;
}

function showMainAndDashboard() {
  if (elements.dashboard) {
    elements.dashboard.classList.remove("hidden");
  }
  if (elements.mainContent) {
    elements.mainContent.classList.remove("hidden");
  }
}

function hideMainAndDashboard() {
  if (elements.dashboard) {
    elements.dashboard.classList.add("hidden");
  }
}

function shouldSkipIntro() {
  const params = new URLSearchParams(window.location.search);
  return params.get("skipIntro") === "1";
}

async function runIntroSequence({ bootAudio, errorAudio } = {}) {
  showScreen("intro");

  const normal = elements.introNormal;
  const boot = elements.introBoot;
  const bootLog = elements.bootLog;
  const bootBigLine = elements.bootBigLine;
  const startBtn = elements.introStartBtn;

  if (!normal || !boot || !bootLog || !bootBigLine || !startBtn) {
    return;
  }

  normal.classList.remove("hidden");
  boot.classList.add("hidden");
  bootLog.textContent = "";
  bootBigLine.textContent = "";
  startBtn.disabled = false;
  startBtn.classList.remove("hidden");
  startBtn.textContent = "TAP TO START";

  await waitForButtonClick(startBtn);

  startBtn.disabled = true;
  startBtn.classList.add("hidden");

  if (state.audioArmed) {
    try {
      if (bootAudio) {
        bootAudio.currentTime = 0;
      }
      bootAudio?.play?.();
    } catch (error) {
      playSound("boot");
    }
  }

  await sleep(1600);

  normal.classList.add("glitch-burst");
  if (state.audioArmed) {
    try {
      if (errorAudio) {
        errorAudio.currentTime = 0;
      }
      errorAudio?.play?.();
    } catch (error) {
      playErrorSound();
    }
  }
  await sleep(4000);
  normal.classList.remove("glitch-burst");

  normal.classList.add("hidden");
  boot.classList.remove("hidden");

  bootBigLine.textContent = "";
  await typeBootLines(bootLog, BOOT_LINES, { lineDelayMs: 200, charDelayMs: 10 });

  bootBigLine.textContent = "SYSTEM LOCKDOWN ACTIVE";
  await sleep(800);

  const prompt = "PRESS ANY KEY TO CONTINUE";
  bootBigLine.textContent = prompt;
  startBtn.textContent = prompt;
  startBtn.disabled = false;
  startBtn.classList.remove("hidden");

  await waitForAnyKeyOrClick(startBtn);
}

function waitForButtonClick(button) {
  return new Promise((resolve) => {
    const handler = () => {
      button.removeEventListener("click", handler);
      resolve();
    };
    button.addEventListener("click", handler);
  });
}

function waitForAnyKeyOrClick(button) {
  return new Promise((resolve) => {
    const handler = () => {
      cleanup();
      resolve();
    };
    const onKey = () => handler();
    const onClick = () => handler();
    const cleanup = () => {
      document.removeEventListener("keydown", onKey);
      button.removeEventListener("click", onClick);
    };
    document.addEventListener("keydown", onKey);
    button.addEventListener("click", onClick);
  });
}

async function typeBootLines(targetEl, lines, { lineDelayMs = 220, charDelayMs = 8 } = {}) {
  targetEl.textContent = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1) {
      targetEl.textContent += line[i];
      await sleep(charDelayMs);
    }
    targetEl.textContent += "\n";
    await sleep(lineDelayMs);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJosiahMaxLength() {
  const raw = parseInt(elements.josiahInput?.maxLength, 10);
  return Number.isNaN(raw) ? 4 : raw;
}

function setJosiahStage(stage) {
  state.josiahStage = stage;
  writeStorage("josiahStage", String(stage));
  updateJosiahUI();
}

function updateJosiahUI() {
  if (!elements.josiahInput) {
    return;
  }
  if (state.josiahStage === 1) {
    elements.josiahInput.maxLength = 3;
    elements.josiahInput.placeholder = "KEYPAD INPUT";
    if (!state.josiahSequenceRunning && elements.josiahLog) {
      elements.josiahLog.classList.add("hidden");
      elements.josiahLog.textContent = "";
    }
  } else {
    elements.josiahInput.maxLength = 4;
    elements.josiahInput.placeholder = "SECONDARY KEYCODE";
    if (elements.josiahLog) {
      elements.josiahLog.classList.remove("hidden");
      if (!elements.josiahLog.textContent.trim()) {
        elements.josiahLog.textContent = "KEYCODE REQUIRED.";
      }
    }
  }
}

function setJosiahInputEnabled(enabled) {
  if (!elements.josiahInput) {
    return;
  }
  elements.josiahInput.disabled = !enabled;
  elements.josiahForm.querySelectorAll("button").forEach((button) => {
    button.disabled = !enabled;
  });
  elements.josiahKeypadButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

async function runJosiahSequence() {
  if (!elements.josiahLog || state.josiahSequenceRunning) {
    return;
  }
  state.josiahSequenceRunning = true;
  setJosiahInputEnabled(false);
  elements.josiahResponse.textContent = "";
  elements.josiahResponse.classList.remove("success", "error");
  elements.josiahLog.classList.remove("hidden");
  elements.josiahLog.textContent = "";

  await typeJosiahLine(elements.josiahLog, "CODE ACCEPTED");
  await sleep(2000);
  await typeJosiahLine(elements.josiahLog, "...PARTIALLY");
  await sleep(2000);

  await typeJosiahLine(elements.josiahLog, "");
  await typeJosiahLine(elements.josiahLog, "REMAINING DIGITS DETECTED");
  await typeJosiahLine(elements.josiahLog, "INSIDE THE COMPANION CUBE.");
  await sleep(2000);

  await typeJosiahLine(elements.josiahLog, "");
  await typeJosiahLine(elements.josiahLog, "YES. THAT ONE.");
  await sleep(2000);
  await typeJosiahLine(elements.josiahLog, "THE ONE YOU WERE TOLD");
  await typeJosiahLine(elements.josiahLog, "NOT TO PUT DOWN.");
  await sleep(2000);

  await typeJosiahLine(elements.josiahLog, "");
  await typeJosiahLine(elements.josiahLog, "COMPANION CUBE");
  await typeJosiahLine(elements.josiahLog, "SACRIFICE REQUIRED.");
  await sleep(2000);

  await typeJosiahLine(elements.josiahLog, "");
  await typeJosiahLine(elements.josiahLog, "THIS WAS ALWAYS GOING TO HAPPEN.");
  await sleep(2000);
  await typeJosiahLine(elements.josiahLog, "YOU MONSTER.");

  state.josiahSequenceRunning = false;
  setJosiahStage(2);
  elements.josiahInput.value = "";
  setJosiahInputEnabled(true);
  elements.josiahInput.focus();
}

async function typeJosiahLine(targetEl, line, charDelayMs = 16) {
  for (let i = 0; i < line.length; i += 1) {
    targetEl.textContent += line[i];
    await sleep(charDelayMs);
  }
  targetEl.textContent += "\n";
}

function getFinaleText() {
  return FINALE_SECTIONS.join("\n\n");
}

function showFinaleMessage() {
  if (!elements.finaleMessage) {
    return;
  }
  elements.finaleMessage.textContent = getFinaleText();
  elements.finaleMessage.classList.add("show");
}

function armAudio() {
  if (state.audioArmed) {
    return;
  }
  state.audioArmed = true;
}

function playSound(key) {
  if (!state.audioArmed) {
    return;
  }
  playRaw(key);
}

function playRaw(key) {
  const audio = audioBank[key];
  if (!audio) {
    return;
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playErrorSound() {
  const now = Date.now();
  if (now - lastErrorSound < 400) {
    return;
  }
  lastErrorSound = now;
  playSound("error");
}

function playTyping() {
  const now = Date.now();
  if (now - lastTypingSound < 90) {
    return;
  }
  lastTypingSound = now;
  playSound("typing");
}

function loadState() {
  const storedLevel = parseInt(readStorage("unlockProgress"), 10);
  if (!Number.isNaN(storedLevel)) {
    state.currentLevel = clamp(storedLevel, 0, TOTAL_LEVELS);
  }
  const mikeyStage = readStorage("mikeyStage");
  if (mikeyStage === "2") {
    state.mikeyStage = 2;
  }
  const solvedRaw = readStorage("norasueSolved");
  if (solvedRaw) {
    try {
      const parsed = JSON.parse(solvedRaw);
      parsed.forEach((name) => state.norasueSolved.add(name));
    } catch (error) {
      state.norasueSolved.clear();
    }
  }
  const josiahStage = readStorage("josiahStage");
  if (josiahStage === "2") {
    state.josiahStage = 2;
  }
}

function saveProgress() {
  writeStorage("unlockProgress", String(state.currentLevel));
}

function setLevel(level) {
  state.currentLevel = clamp(level, 0, TOTAL_LEVELS);
  saveProgress();
  updateDashboard();
  showLevel(state.currentLevel);
}

function advanceLevel() {
  if (state.currentLevel < TOTAL_LEVELS) {
    setLevel(state.currentLevel + 1);
  }
}

function updateDashboard() {
  const progressValue = Math.min(state.currentLevel, TOTAL_LEVELS);
  const percent = (progressValue / TOTAL_LEVELS) * 100;
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = `${progressValue}/7`;
  elements.avatarSlots.forEach((slot, index) => {
    let status = "locked";
    if (state.currentLevel > index) {
      status = "restored";
    } else if (state.currentLevel === index && state.currentLevel !== TOTAL_LEVELS) {
      status = "active";
    }
    slot.dataset.state = status;
    const label = slot.querySelector(".avatar-state");
    if (label) {
      label.textContent = status.toUpperCase();
    }
  });
}

function showLevel(level) {
  if (elements.introScreen && elements.introScreen.classList.contains("active")) {
    showScreen(null);
    showMainAndDashboard();
  }
  elements.levelSections.forEach((section) => {
    section.classList.toggle("active", Number(section.dataset.level) === level);
  });
  if (activeLevel === 4 && level !== 4) {
    stopMikeyGame();
    resetMikeyVictory();
  }
  activeLevel = level;
  const activeSection = getLevelSection(level);
  if (activeSection) {
    runTypewriter(activeSection);
  }
  if (level === 4) {
    showMikeyStage();
  }
  if (level === 6) {
    renderConnectionsState();
  }
  if (level === 7) {
    triggerFinale();
  }
}

function runTypewriter(section) {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.querySelectorAll("[data-typewriter]").forEach((element) => {
    if (element.dataset.typed === "true") {
      return;
    }
    const text = element.dataset.typewriter || "";
    if (prefersReduced) {
      element.textContent = text;
      element.dataset.typed = "true";
      return;
    }
    element.textContent = "";
    let index = 0;
    const timer = setInterval(() => {
      element.textContent += text.charAt(index);
      index += 1;
      if (index >= text.length) {
        clearInterval(timer);
        element.dataset.typed = "true";
      }
    }, 24);
  });
}

function grantAccess(responseEl, message) {
  responseEl.textContent = message;
  responseEl.classList.remove("error");
  responseEl.classList.add("success");
}

function denyAccess(section, responseEl) {
  playErrorSound();
  responseEl.textContent = "ACCESS DENIED";
  responseEl.classList.remove("success");
  responseEl.classList.add("error");
  if (section) {
    section.classList.add("shake");
    setTimeout(() => section.classList.remove("shake"), 420);
  }
}

function getLevelSection(level) {
  return elements.levelSections.find(
    (section) => Number(section.dataset.level) === level
  );
}

function handleAdminShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.code === "KeyD") {
    event.preventDefault();
    toggleAdminPanel();
  }
}

function toggleAdminPanel() {
  if (!elements.adminPanel) {
    return;
  }
  const isHidden = elements.adminPanel.classList.contains("hidden");
  elements.adminPanel.classList.toggle("hidden", !isHidden);
  elements.adminPanel.setAttribute("aria-hidden", String(!isHidden));
}

function closeAdminPanel() {
  elements.adminPanel.classList.add("hidden");
  elements.adminPanel.setAttribute("aria-hidden", "true");
}

function resetAllProgress() {
  clearStorage();
  state.currentLevel = 0;
  state.mikeyStage = 1;
  state.josiahStage = 1;
  state.josiahSequenceRunning = false;
  state.isTransitioning = false;
  state.norasueSolved.clear();
  state.finalePlayed = false;
  state.finaleTransitionRunning = false;
  state.finaleTransitionComplete = false;
  if (elements.josiahInput) {
    elements.josiahInput.value = "";
  }
  if (elements.finaleMessage) {
    elements.finaleMessage.textContent = "";
    elements.finaleMessage.classList.remove("show");
  }
  if (elements.finaleTransition) {
    elements.finaleTransition.classList.add("hidden");
    elements.finaleTransition.classList.remove("show", "active", "pulse");
  }
  updateJosiahUI();
  updateDashboard();
  showLevel(state.currentLevel);
}

function skipIntroToLevelZero() {
  showScreen(null);
  showMainAndDashboard();
  setLevel(0);
}

function handleSpikeControl(event) {
  if (event.code !== "Space") {
    return;
  }
  if (state.currentLevel === 4 && state.mikeyStage === 2) {
    if (state.mikeyAwaitingContinue) {
      return;
    }
    event.preventDefault();
    spikeBall();
  }
}

function handleMikeyContinue(event) {
  if (
    state.currentLevel === 4 &&
    state.mikeyStage === 2 &&
    state.mikeyAwaitingContinue
  ) {
    if (state.isTransitioning) {
      return;
    }
    event.preventDefault();
    resetMikeyVictory();
    showSuccessBanner(SUCCESS_MESSAGES[4], advanceLevel);
  }
}

function setMikeyStage(stage) {
  state.mikeyStage = stage;
  writeStorage("mikeyStage", String(stage));
}

function showMikeyStage() {
  if (state.mikeyStage === 2) {
    elements.mikeyStage1.classList.add("hidden");
    elements.mikeyStage2.classList.remove("hidden");
    startMikeyGame();
  } else {
    elements.mikeyStage1.classList.remove("hidden");
    elements.mikeyStage2.classList.add("hidden");
    stopMikeyGame();
    resetMikeyVictory();
  }
}

function resetMikeyVictory() {
  state.mikeyAwaitingContinue = false;
  if (elements.mikeyVictory) {
    elements.mikeyVictory.classList.add("hidden");
    elements.mikeyVictory.classList.remove("show");
  }
  if (elements.mikeyStatus) {
    elements.mikeyStatus.textContent = "PRESS SPACE TO SPIKE";
  }
}

function initMikeyGame() {
  if (!elements.mikeyCanvas) {
    return null;
  }
  const ctx = elements.mikeyCanvas.getContext("2d");
  return {
    ctx,
    balls: [],
    explosions: [],
    running: false,
    lastTime: 0,
    lastSpawn: 0,
    spawnInterval: 900,
    streak: 0,
  };
}

function startMikeyGame() {
  if (!mikeyGame) {
    mikeyGame = initMikeyGame();
  }
  if (!mikeyGame || mikeyGame.running) {
    return;
  }
  mikeyGame.balls = [];
  mikeyGame.running = true;
  mikeyGame.lastTime = 0;
  mikeyGame.lastSpawn = 0;
  mikeyGame.spawnInterval = 900;
  mikeyGame.streak = 0;
  mikeyGame.explosions = [];
  elements.mikeyStreak.textContent = "0";
  resetMikeyVictory();
  resizeMikeyCanvas();
  requestAnimationFrame(updateMikeyGame);
}

function stopMikeyGame() {
  if (mikeyGame) {
    mikeyGame.running = false;
  }
}

function resizeMikeyCanvas() {
  if (!elements.mikeyCanvas) {
    return;
  }
  const rect = elements.mikeyCanvas.getBoundingClientRect();
  elements.mikeyCanvas.width = rect.width;
  elements.mikeyCanvas.height = 320;
}

function updateMikeyGame(timestamp) {
  if (!mikeyGame || !mikeyGame.running) {
    return;
  }
  const delta = mikeyGame.lastTime ? (timestamp - mikeyGame.lastTime) / 1000 : 0;
  mikeyGame.lastTime = timestamp;

  if (timestamp - mikeyGame.lastSpawn > mikeyGame.spawnInterval) {
    spawnBall();
    mikeyGame.lastSpawn = timestamp;
    mikeyGame.spawnInterval = Math.max(420, 900 - mikeyGame.streak * 18);
  }

  updateBalls(delta);
  updateExplosions(delta);
  drawMikeyGame();
  requestAnimationFrame(updateMikeyGame);
}

function spawnBall() {
  const canvas = elements.mikeyCanvas;
  const radius = 18;
  const value = Math.floor(Math.random() * 20) + 1;
  const speed = (90 + Math.random() * 70 + mikeyGame.streak * 2) * 0.9;
  const x = radius + Math.random() * (canvas.width - radius * 2);
  mikeyGame.balls.push({ x, y: -radius, radius, value, speed });
}

function updateBalls(delta) {
  const canvas = elements.mikeyCanvas;
  const height = canvas.height;
  const toRemove = [];
  mikeyGame.balls.forEach((ball, index) => {
    ball.y += ball.speed * delta;
    if (ball.y - ball.radius > height) {
      if (isPrime(ball.value)) {
        resetMikeyStreak();
        createExplosion(ball.x, height - 6);
        playSound("mikeyMiss");
      }
      toRemove.push(index);
    }
  });
  toRemove.reverse().forEach((index) => mikeyGame.balls.splice(index, 1));
}

function drawMikeyGame() {
  const canvas = elements.mikeyCanvas;
  const ctx = mikeyGame.ctx;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, width, height);

  const zoneHeight = 70;
  const zoneTop = height - zoneHeight;
  ctx.fillStyle = "rgba(0, 229, 255, 0.08)";
  ctx.fillRect(0, zoneTop, width, zoneHeight);
  ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
  ctx.strokeRect(0, zoneTop, width, zoneHeight);

  ctx.font = "16px Roboto Mono";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  mikeyGame.balls.forEach((ball) => {
    const eligible = isBallEligible(ball, zoneTop);
    ctx.fillStyle = eligible ? "#00ff41" : "#00e5ff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.fillText(String(ball.value), ball.x, ball.y);
  });

  drawExplosions(ctx);
}

function spikeBall() {
  if (!mikeyGame || !mikeyGame.running) {
    return;
  }
  const canvas = elements.mikeyCanvas;
  const zoneTop = canvas.height - 70;
  const candidates = mikeyGame.balls.filter(
    (ball) => isPrime(ball.value) && isBallEligible(ball, zoneTop)
  );
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.y - a.y);
    const ball = candidates[0];
    const index = mikeyGame.balls.indexOf(ball);
    if (index >= 0) {
      mikeyGame.balls.splice(index, 1);
    }
    playSound("mikeyHit");
    incrementMikeyStreak();
    return;
  }
  const compositeCandidates = mikeyGame.balls.filter(
    (ball) => !isPrime(ball.value) && isBallEligible(ball, zoneTop)
  );
  if (compositeCandidates.length > 0) {
    compositeCandidates.sort((a, b) => b.y - a.y);
    const ball = compositeCandidates[0];
    const index = mikeyGame.balls.indexOf(ball);
    if (index >= 0) {
      mikeyGame.balls.splice(index, 1);
    }
    createExplosion(ball.x, ball.y);
  } else {
    createExplosion(canvas.width / 2, canvas.height - 10);
  }
  playSound("mikeyMiss");
  resetMikeyStreak();
}

function incrementMikeyStreak() {
  mikeyGame.streak += 1;
  elements.mikeyStreak.textContent = String(mikeyGame.streak);
  if (mikeyGame.streak >= 10) {
    mikeyWin();
  }
}

function resetMikeyStreak() {
  mikeyGame.streak = 0;
  elements.mikeyStreak.textContent = "0";
}

function mikeyWin() {
  stopMikeyGame();
  elements.mikeyStatus.textContent = "PRESS ANY KEY TO CONTINUE";
  playSound("mikey");
  state.mikeyAwaitingContinue = true;
  if (elements.mikeyVictory) {
    elements.mikeyVictory.classList.remove("hidden");
    requestAnimationFrame(() => elements.mikeyVictory.classList.add("show"));
  }
}

function isPrime(value) {
  return PRIME_SET.has(value);
}

function isBallEligible(ball, zoneTop) {
  return ball.y + ball.radius >= zoneTop;
}

function createExplosion(x, y) {
  if (!mikeyGame) {
    return;
  }
  mikeyGame.explosions.push({
    x,
    y,
    life: 0,
    ttl: 0.5,
    seed: Math.random(),
  });
}

function updateExplosions(delta) {
  if (!mikeyGame.explosions.length) {
    return;
  }
  mikeyGame.explosions.forEach((burst) => {
    burst.life += delta;
  });
  mikeyGame.explosions = mikeyGame.explosions.filter(
    (burst) => burst.life < burst.ttl
  );
}

function drawExplosions(ctx) {
  mikeyGame.explosions.forEach((burst) => {
    const progress = burst.life / burst.ttl;
    const radius = 12 + progress * 48;
    const alpha = Math.max(0, 1 - progress);
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    ctx.strokeStyle = `rgba(255, 0, 85, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 0, 85, ${alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    const shardCount = 5;
    for (let i = 0; i < shardCount; i += 1) {
      const angle = (Math.PI * 2 * (i / shardCount)) + burst.seed * 2;
      const jitter = (Math.random() - 0.5) * 10;
      const inner = radius * 0.2;
      const outer = radius * (0.7 + Math.random() * 0.5);
      const x1 = burst.x + Math.cos(angle) * inner + jitter;
      const y1 = burst.y + Math.sin(angle) * inner + jitter;
      const x2 = burst.x + Math.cos(angle) * outer + jitter;
      const y2 = burst.y + Math.sin(angle) * outer + jitter;
      ctx.strokeStyle = `rgba(255, 0, 85, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const blockCount = 4;
    for (let i = 0; i < blockCount; i += 1) {
      const size = 6 + Math.random() * 10;
      const offsetX = (Math.random() - 0.5) * radius * 1.6;
      const offsetY = (Math.random() - 0.5) * radius * 1.2;
      ctx.fillStyle = `rgba(255, 0, 85, ${alpha * 0.6})`;
      ctx.fillRect(burst.x + offsetX, burst.y + offsetY, size, 3);
    }

    ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.4})`;
    ctx.lineWidth = 1;
    const glitchOffset = (Math.random() - 0.5) * 6;
    ctx.beginPath();
    ctx.arc(burst.x + glitchOffset, burst.y - glitchOffset, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function initConnections() {
  const allWords = CONNECTIONS_DATA.flatMap((category) => category.items);
  const shuffled = shuffleArray(allWords);
  elements.connectionsGrid.innerHTML = "";
  connectionsTiles = shuffled.map((word, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    button.textContent = word;
    button.dataset.word = word;
    button.style.order = index + 100;
    button.addEventListener("click", () => toggleTile(button));
    elements.connectionsGrid.appendChild(button);
    return button;
  });
  renderConnectionsState();
}

function renderConnectionsState() {
  elements.connectionsCategories.innerHTML = "";
  selectedTiles = [];
  connectionsTiles.forEach((tile) => tile.classList.remove("selected"));
  let solvedIndex = 0;
  CONNECTIONS_DATA.forEach((category) => {
    if (state.norasueSolved.has(category.name)) {
      markCategorySolved(category, solvedIndex);
      solvedIndex += 1;
    }
  });
  if (state.norasueSolved.size === CONNECTIONS_DATA.length) {
    revealCoopMessage();
  } else {
    elements.coopMessage.classList.add("hidden");
    elements.coopInputWrap.classList.add("hidden");
  }
}

function toggleTile(tile) {
  if (tile.classList.contains("solved")) {
    return;
  }
  if (tile.classList.contains("selected")) {
    tile.classList.remove("selected");
    selectedTiles = selectedTiles.filter((item) => item !== tile);
    return;
  }
  if (selectedTiles.length >= 4) {
    return;
  }
  tile.classList.add("selected");
  selectedTiles.push(tile);
}

function submitConnections() {
  if (selectedTiles.length !== 4) {
    setConnectionsStatus("SELECT 4 TILES", true);
    shakeConnections();
    playErrorSound();
    return;
  }
  const selectedWords = selectedTiles.map((tile) => tile.dataset.word);
  const match = CONNECTIONS_DATA.find(
    (category) =>
      !state.norasueSolved.has(category.name) &&
      sameItems(selectedWords, category.items)
  );
  if (!match) {
    setConnectionsStatus("ACCESS DENIED", true);
    shakeConnections();
    playErrorSound();
    selectedTiles.forEach((tile) => tile.classList.remove("selected"));
    selectedTiles = [];
    return;
  }
  const solvedIndex = state.norasueSolved.size;
  state.norasueSolved.add(match.name);
  writeStorage("norasueSolved", JSON.stringify(Array.from(state.norasueSolved)));
  markCategorySolved(match, solvedIndex);
  setConnectionsStatus(`${match.name} CONFIRMED`, false);
  if (state.norasueSolved.size === CONNECTIONS_DATA.length) {
    playSound("norasue");
    revealCoopMessage();
  }
}

function markCategorySolved(category, solvedIndex) {
  const tiles = connectionsTiles.filter((tile) =>
    category.items.includes(tile.dataset.word)
  );
  tiles.forEach((tile, index) => {
    tile.classList.remove("selected");
    tile.classList.add("solved");
    tile.disabled = true;
    tile.style.order = solvedIndex * 4 + index;
  });
  const categoryEl = document.createElement("div");
  categoryEl.className = "category";
  categoryEl.textContent = category.name;
  elements.connectionsCategories.appendChild(categoryEl);
  selectedTiles = [];
}

function setConnectionsStatus(message, isError) {
  elements.connectionsStatus.textContent = message;
  elements.connectionsStatus.classList.toggle("error", isError);
  elements.connectionsStatus.classList.toggle("success", !isError);
}

function shakeConnections() {
  elements.connectionsGrid.classList.add("shake");
  setTimeout(() => elements.connectionsGrid.classList.remove("shake"), 420);
}

function revealCoopMessage() {
  elements.coopMessage.classList.remove("hidden");
  elements.coopInputWrap.classList.remove("hidden");
}

function verifyCoopCode() {
  const code = elements.coopInput.value.trim().toUpperCase();
  if (code === "GOLDENEGG") {
    setConnectionsStatus("FINAL KEY ACCEPTED", false);
    setTimeout(() => playFinaleAudio(), 3000);
    showSuccessBanner(SUCCESS_MESSAGES[6], advanceLevel);
  } else {
    setConnectionsStatus("ACCESS DENIED", true);
    playErrorSound();
  }
}

function triggerFinale() {
  document.body.classList.add("finale");
  if (state.finaleTransitionComplete) {
    showFinaleMessage();
    return;
  }
  startFinaleTransition();
}

function sameItems(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((item) => b.includes(item));
}

function shuffleArray(items) {
  const array = items.slice();
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    return;
  }
}

function clearStorage() {
  try {
    localStorage.removeItem("unlockProgress");
    localStorage.removeItem("mikeyStage");
    localStorage.removeItem("josiahStage");
    localStorage.removeItem("norasueSolved");
  } catch (error) {
    return;
  }
}
