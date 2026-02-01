// ===== CREATE LAYOUT IN JS =====
const root = document.getElementById("root");

root.innerHTML = `
<div id="wrapper">
    <div id="gameCol">
        <h1><span class="flip">Flip</span><span class="venture">Venture</span></h1>
        <canvas id="game" width="420" height="300"></canvas>
    </div>

    <div id="leaderboard">
        <h3>🏆 Today</h3>
        <div class="slot" id="s1">1:</div>
        <div class="slot" id="s2">2:</div>
        <div class="slot" id="s3">3:</div>
        <div class="slot" id="s4">4:</div>
        <div class="slot" id="s5">5:</div>
    </div>
</div>
`;

// ===== STYLES IN JS =====
const style = document.createElement("style");
style.textContent = `
body {
    margin: 0;
    background: #111;
    color: white;
    font-family: Arial;
}
#wrapper {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 30px;
}
#gameCol {
    display: flex;
    flex-direction: column;
    align-items: center;
}
h1 {
    margin: 0 0 10px 0;
}
.flip { color: #7ec8e3; }
.venture { color: #f6b26b; }

canvas {
    background: #222;
    border-radius: 8px;
}

#leaderboard {
    width: 220px;
    background: white;
    color: black;
    padding: 12px;
    border-radius: 10px;
}
.slot {
    margin: 6px 0;
    font-size: 15px;
}
`;
document.head.appendChild(style);

// ===== GAME SETUP =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let player = { x: 20, y: 140, w: 20, h: 20, vy: 0 };
let gravity = 0.6;
let dir = 1;
let running = true;

let startTime = Date.now();
let finishTime = 0;

// ===== DATE (DAILY LOCK) =====
function today() {
    const d = new Date();
    return d.toISOString().split("T")[0];
}

// ===== STORAGE =====
let leaderboard =
    JSON.parse(localStorage.getItem("fv_lb")) || {};

let nameStored =
    JSON.parse(localStorage.getItem("fv_name")) || {};

if (!leaderboard[today()]) leaderboard[today()] = [];

// ===== INPUT =====
document.addEventListener("keydown", e => {
    if (!running) return;
    if (e.code === "Space") dir *= -1;
});

// ===== GAME LOOP =====
function update() {
    if (!running) return;

    player.vy += gravity * dir;
    player.y += player.vy;

    if (player.y < 0 || player.y + player.h > canvas.height) {
        endGame(false);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#7ec8e3";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    requestAnimationFrame(update);
}

update();

// ===== END GAME =====
function endGame(win) {
    running = false;
    finishTime = Date.now() - startTime;

    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = win ? "#3cb371" : "#e74c3c";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        win ? "LEVEL COMPLETE" : "YOU DIED",
        canvas.width/2,
        canvas.height/2
    );

    if (win) handleWin();
}

// ===== WIN HANDLER =====
function handleWin() {
    if (nameStored[today()]) {
        saveScore(nameStored[today()]);
        return;
    }

    let name = prompt("Enter name (once per day):");
    if (!name) name = "Guest";

    nameStored[today()] = name;
    localStorage.setItem("fv_name", JSON.stringify(nameStored));
    saveScore(name);
}

// ===== SAVE SCORE =====
function saveScore(name) {
    leaderboard[today()].push({ name, time: finishTime });
    leaderboard[today()].sort((a,b)=>a.time-b.time);
    leaderboard[today()] = leaderboard[today()].slice(0,5);

    localStorage.setItem("fv_lb", JSON.stringify(leaderboard));
    renderLeaderboard();
}

// ===== RENDER LEADERBOARD =====
function renderLeaderboard() {
    const list = leaderboard[today()];
    for (let i = 1; i <= 5; i++) {
        const slot = document.getElementById("s"+i);
        if (list[i-1]) {
            const t = list[i-1].time;
            const s = Math.floor(t/1000);
            const ms = String(t%1000).padStart(3,"0");
            slot.textContent = `${i}: ${list[i-1].name}:${s}.${ms}`;
        } else {
            slot.textContent = `${i}:`;
        }
    }
}

renderLeaderboard();
