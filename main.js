const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const scoreSpan = document.getElementById("score");
const timerSpan = document.getElementById("timer");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const ISHIBA_SIZE = 100;
const ONIGIRI_SIZE = 40;
const BIG_ONIGIRI_SIZE = ONIGIRI_SIZE * 3;
const KISHIDA_SIZE = 90;
const GAME_TIME = 30; // 秒

const bgImg = new Image();
bgImg.src = "background.png"; // 国会議事堂の画像ファイル名
let bgLoaded = false;
bgImg.onload = function() {
  bgLoaded = true;
};

let isGameRunning = false;
let score = 0;
let timer = GAME_TIME;
let onigiris = [];
let kishidas = [];
let bigOnigiris = [];
let ishibaX = GAME_WIDTH / 2;
let ishibaY = GAME_HEIGHT - ISHIBA_SIZE / 2 - 10;
let animationId = null;
let timerId = null;
let spitAnimations = [];

// 出現タイミング管理
let kishidaSchedule = [];
let bigOnigiriSchedule = [];
let kishidaSpawned = 0;
let bigOnigiriSpawned = 0;

const ishibaImg = new Image();
ishibaImg.src = "ishiba.png";
const onigiriImg = new Image();
onigiriImg.src = "onigiri.png";
const kishidaImg = new Image();
kishidaImg.src = "kishida.png";

let imagesLoaded = 0;
function checkImagesLoaded() {
  imagesLoaded++;
  if (imagesLoaded === 3) {
    drawIshiba();
    startBtn.disabled = false;
  }
}
ishibaImg.onload = checkImagesLoaded;
onigiriImg.onload = checkImagesLoaded;
kishidaImg.onload = checkImagesLoaded;

// --- 石破茂の初期描画 ---
function drawIshiba() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(
    ishibaImg,
    ishibaX - ISHIBA_SIZE / 2,
    ishibaY - ISHIBA_SIZE / 2,
    ISHIBA_SIZE,
    ISHIBA_SIZE
  );
}

// ... 省略（前半は同じ） ...

// --- onigiri生成（ishibaを狙う軌道＋速度ランダム＋少しブレ） ---
function spawnOnigiri() {
  let x, y;
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) {
    x = Math.random() * (GAME_WIDTH - ONIGIRI_SIZE);
    y = -ONIGIRI_SIZE;
  } else if (edge === 1) {
    x = GAME_WIDTH + ONIGIRI_SIZE;
    y = Math.random() * (GAME_HEIGHT - ONIGIRI_SIZE);
  } else if (edge === 2) {
    x = Math.random() * (GAME_WIDTH - ONIGIRI_SIZE);
    y = GAME_HEIGHT + ONIGIRI_SIZE;
  } else {
    x = -ONIGIRI_SIZE;
    y = Math.random() * (GAME_HEIGHT - ONIGIRI_SIZE);
  }
  // ishbaの現在位置を狙う＋少しブレ
  const targetX = ishibaX + (Math.random() - 0.5) * 80;
  const targetY = ishibaY + (Math.random() - 0.5) * 80;
  const dx0 = targetX - x;
  const dy0 = targetY - y;
  const norm = Math.sqrt(dx0 * dx0 + dy0 * dy0);
  const speed = 2 + Math.random() * 3;
  const dx = (dx0 / norm) * speed;
  const dy = (dy0 / norm) * speed;
  onigiris.push({ x, y, dx, dy, caught: false });
}

// --- kishida生成（ishibaを狙う軌道＋速度ランダム＋少しブレ） ---
function spawnKishida() {
  let x, y;
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) {
    x = Math.random() * (GAME_WIDTH - KISHIDA_SIZE);
    y = -KISHIDA_SIZE;
  } else if (edge === 1) {
    x = GAME_WIDTH + KISHIDA_SIZE;
    y = Math.random() * (GAME_HEIGHT - KISHIDA_SIZE);
  } else if (edge === 2) {
    x = Math.random() * (GAME_WIDTH - KISHIDA_SIZE);
    y = GAME_HEIGHT + KISHIDA_SIZE;
  } else {
    x = -KISHIDA_SIZE;
    y = Math.random() * (GAME_HEIGHT - KISHIDA_SIZE);
  }
  const targetX = ishibaX + (Math.random() - 0.5) * 80;
  const targetY = ishibaY + (Math.random() - 0.5) * 80;
  const dx0 = targetX - x;
  const dy0 = targetY - y;
  const norm = Math.sqrt(dx0 * dx0 + dy0 * dy0);
  const speed = 2 + Math.random() * 3;
  const dx = (dx0 / norm) * speed;
  const dy = (dy0 / norm) * speed;
  kishidas.push({ x, y, dx, dy, touched: false });
}

// --- 大きいonigiri生成（ishibaを狙う軌道＋速度ランダム＋不規則な動き） ---
function spawnBigOnigiri() {
  let x, y;
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) {
    x = Math.random() * (GAME_WIDTH - BIG_ONIGIRI_SIZE);
    y = -BIG_ONIGIRI_SIZE;
  } else if (edge === 1) {
    x = GAME_WIDTH + BIG_ONIGIRI_SIZE;
    y = Math.random() * (GAME_HEIGHT - BIG_ONIGIRI_SIZE);
  } else if (edge === 2) {
    x = Math.random() * (GAME_WIDTH - BIG_ONIGIRI_SIZE);
    y = GAME_HEIGHT + BIG_ONIGIRI_SIZE;
  } else {
    x = -BIG_ONIGIRI_SIZE;
    y = Math.random() * (GAME_HEIGHT - BIG_ONIGIRI_SIZE);
  }
  const targetX = ishibaX + (Math.random() - 0.5) * 80;
  const targetY = ishibaY + (Math.random() - 0.5) * 80;
  const dx0 = targetX - x;
  const dy0 = targetY - y;
  const norm = Math.sqrt(dx0 * dx0 + dy0 * dy0);
  const speed = 1.5 + Math.random() * 2.5;
  const dx = (dx0 / norm) * speed;
  const dy = (dy0 / norm) * speed;
  const randomSeed = Math.random() * 10000;
  bigOnigiris.push({ x, y, dx, dy, caught: false, t: 0, randomSeed });
}

// --- 大きいonigiriの不規則な動き（gameLoop内） ---
for (let i = 0; i < bigOnigiris.length; i++) {
  const b = bigOnigiris[i];
  if (!b.caught) {
    b.t += 1;
    const freq = 0.05 + (b.randomSeed % 0.03);
    // 軌道にブレを加える
    b.x += b.dx + Math.sin(b.t * freq + b.randomSeed) * 4;
    b.y += b.dy + Math.cos(b.t * freq + b.randomSeed) * 4;
    ctx.drawImage(onigiriImg, b.x, b.y, BIG_ONIGIRI_SIZE, BIG_ONIGIRI_SIZE);
    // ...（以下略）
  }
}


// --- ゲーム初期化 ---
function resetGame() {
  score = 0;
  timer = GAME_TIME;
  onigiris = [];
  kishidas = [];
  bigOnigiris = [];
  spitAnimations = [];
  ishibaX = GAME_WIDTH / 2;
  ishibaY = GAME_HEIGHT - ISHIBA_SIZE / 2 - 10;
  scoreSpan.textContent = score;
  timerSpan.textContent = timer;
  kishidaSpawned = 0;
  bigOnigiriSpawned = 0;
  kishidaSchedule = [];
  bigOnigiriSchedule = [];
  if (animationId) cancelAnimationFrame(animationId);
  if (timerId) clearTimeout(timerId);

  // 出現タイミングをランダムで決定（秒単位）
  let kishidaTimes = [];
  while (kishidaTimes.length < 6) {
    let t = Math.floor(Math.random() * GAME_TIME);
    if (!kishidaTimes.includes(t)) kishidaTimes.push(t);
  }
  kishidaSchedule = kishidaTimes.sort((a, b) => a - b);

  let bigOnigiriTimes = [];
  while (bigOnigiriTimes.length < 3) {
    let t = Math.floor(Math.random() * GAME_TIME);
    if (!bigOnigiriTimes.includes(t)) bigOnigiriTimes.push(t);
  }
  bigOnigiriSchedule = bigOnigiriTimes.sort((a, b) => a - b);
}

// --- onigiri吐き出しアニメーション ---
function startSpitAnimation() {
  const spitCount = 10;
  const spitArray = [];
  for (let i = 0; i < spitCount; i++) {
    const angle = Math.PI * 1.2 + (Math.random() - 0.5) * 0.8;
    const speed = 4 + Math.random() * 2;
    spitArray.push({
      x: ishibaX,
      y: ishibaY + ISHIBA_SIZE / 4,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 10
    });
  }
  spitAnimations.push(spitArray);
}

// --- ゲームループ ---
function gameLoop() {
  if (!isGameRunning) return;
 
  // 背景画像を描画
  if (bgLoaded) {
    ctx.drawImage(bgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  // --- onigiri描画・移動 ---
  for (let i = 0; i < onigiris.length; i++) {
    const oni = onigiris[i];
    if (!oni.caught) {
      oni.x += oni.dx;
      oni.y += oni.dy;
      ctx.drawImage(onigiriImg, oni.x, oni.y, ONIGIRI_SIZE, ONIGIRI_SIZE);

      const dist = Math.hypot(
        (oni.x + ONIGIRI_SIZE / 2) - ishibaX,
        (oni.y + ONIGIRI_SIZE / 2) - ishibaY
      );
      if (dist < (ISHIBA_SIZE / 2 + ONIGIRI_SIZE / 2) * 0.7) {
        oni.caught = true;
        score++;
        scoreSpan.textContent = score;
      }
    }
  }

  // --- kishida描画・移動 ---
  for (let i = 0; i < kishidas.length; i++) {
    const k = kishidas[i];
    if (!k.touched) {
      k.x += k.dx;
      k.y += k.dy;
      ctx.drawImage(kishidaImg, k.x, k.y, KISHIDA_SIZE, KISHIDA_SIZE);

      const dist = Math.hypot(
        (k.x + KISHIDA_SIZE / 2) - ishibaX,
        (k.y + KISHIDA_SIZE / 2) - ishibaY
      );
      if (dist < (ISHIBA_SIZE / 2 + KISHIDA_SIZE / 2) * 0.7) {
        k.touched = true;
        score -= 10;
        if (score < 0) score = 0;
        scoreSpan.textContent = score;
        startSpitAnimation();
      }
    }
  }

// --- 大きいonigiri描画・移動 ---
for (let i = 0; i < bigOnigiris.length; i++) {
  const b = bigOnigiris[i];
  if (!b.caught) {
    b.t += 1;
    const freq = 0.05 + (b.randomSeed % 0.03);
    // 軌道にブレを加える
    b.x += b.dx + Math.sin(b.t * freq + b.randomSeed) * 4;
    b.y += b.dy + Math.cos(b.t * freq + b.randomSeed) * 4;
    ctx.drawImage(onigiriImg, b.x, b.y, BIG_ONIGIRI_SIZE, BIG_ONIGIRI_SIZE);

    const dist = Math.hypot(
      (b.x + BIG_ONIGIRI_SIZE / 2) - ishibaX,
      (b.y + BIG_ONIGIRI_SIZE / 2) - ishibaY
    );
    if (dist < (ISHIBA_SIZE / 2 + BIG_ONIGIRI_SIZE / 2) * 0.7) {
      b.caught = true;
      score += 5;
      scoreSpan.textContent = score;
    }
  }
}

  // --- ishiba描画 ---
  ctx.drawImage(
    ishibaImg,
    ishibaX - ISHIBA_SIZE / 2,
    ishibaY - ISHIBA_SIZE / 2,
    ISHIBA_SIZE,
    ISHIBA_SIZE
  );

  // --- 吐き出しアニメーション ---
  for (let i = spitAnimations.length - 1; i >= 0; i--) {
    const spitArray = spitAnimations[i];
    let allDead = true;
    for (let j = 0; j < spitArray.length; j++) {
      const s = spitArray[j];
      if (s.life > 0) {
        s.x += s.dx;
        s.y += s.dy;
        ctx.drawImage(onigiriImg, s.x, s.y, ONIGIRI_SIZE, ONIGIRI_SIZE);
        s.life--;
        allDead = false;
      }
    }
    if (allDead) {
      spitAnimations.splice(i, 1);
    }
  }

  // --- onigiriを一定間隔で発射 ---
  if (Math.random() < 0.03) {
    spawnOnigiri();
  }

  // --- 石破アイコンの自動移動 ---
  if (targetX !== null && targetY !== null) {
    const dx = targetX - ishibaX;
    const dy = targetY - ishibaY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ISHIBA_MOVE_SPEED) {
      ishibaX += (dx / dist) * ISHIBA_MOVE_SPEED;
      ishibaY += (dy / dist) * ISHIBA_MOVE_SPEED;
    } else {
      ishibaX = targetX;
      ishibaY = targetY;
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

// --- タイマー管理 ---
function startTimer() {
  if (!isGameRunning) return;
  if (timer > 0) {
    // kishida投入
    if (kishidaSchedule.includes(GAME_TIME - timer) && kishidaSpawned < 6) {
      spawnKishida();
      kishidaSpawned++;
    }
    // 大きいonigiri投入
    if (bigOnigiriSchedule.includes(GAME_TIME - timer) && bigOnigiriSpawned < 3) {
      spawnBigOnigiri();
      bigOnigiriSpawned++;
    }
    timerId = setTimeout(() => {
      timer--;
      timerSpan.textContent = timer;
      startTimer();
    }, 1000);
  } else {
    isGameRunning = false;
    startBtn.disabled = false;
    alert("終了！あなたのスコアは " + score + " です");
  }
}

// --- 石破茂の移動（マウス・タッチ対応、上下左右） ---
canvas.addEventListener("mousemove", function (e) {
  if (!isGameRunning) return;
  const rect = canvas.getBoundingClientRect();
  ishibaX = e.clientX - rect.left;
  ishibaY = e.clientY - rect.top;
});
canvas.addEventListener("touchmove", function (e) {
  if (!isGameRunning) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  ishibaX = touch.clientX - rect.left;
  ishibaY = touch.clientY - rect.top;
}, { passive: false });

canvas.addEventListener("touchend", function (e) {
  targetX = null;
  targetY = null;
}, { passive: false });

// --- スタートボタン ---
startBtn.addEventListener("click", function () {
  resetGame();
  isGameRunning = true;
  startBtn.disabled = true;
  gameLoop();
  startTimer();
});

function resizeCanvas() {
  const parent = canvas.parentElement;
  const parentWidth = parent.offsetWidth;
  // 幅を基準に高さを決める（2:2.6でやや低め）
  let canvasWidth = Math.min(parentWidth, 400);
  let canvasHeight = canvasWidth * 1.3; // 2:2.6
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let targetX = null;
let targetY = null;
const ISHIBA_MOVE_SPEED = 8; // 1フレームあたりの最大移動量（調整可）