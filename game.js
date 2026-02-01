const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 800;

// --- SETTINGS ---
let gravity = 0.5;
let gravityDir = 1;
let speedX = 4;

// --- PLAYER ---
let player = { x: 0, y: 0, w: 35, h: 35, vy: 0, color: "#7ec8e3" };

// --- LEVEL DATA ---
let platforms = [];
let hazards = [];
let goal = {};
let keys = {};
let gameState = "playing";

// --- RANDOM WITH SEED ---
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// --- DAILY SEED ---
function getDailySeed() {
    const now = new Date();
    const estDate = new Date(now.getTime() - 5*60*60*1000); // EST
    return estDate.getFullYear()*10000 + (estDate.getMonth()+1)*100 + estDate.getDate();
}

// --- LEVEL GENERATION ---
function generateLevel(seed) {
    platforms = [];
    hazards = [];
    const layers = 6;
    const minPlatWidth = 120;
    const maxPlatWidth = 180;
    const startY = canvas.height - 100;
    const layerHeight = (startY - 100) / (layers-1);
    let prevX = 100;

    // Main path platforms (guaranteed path)
    for (let i = 0; i < layers; i++) {
        const y = startY - i*layerHeight;
        const w = minPlatWidth + Math.floor(seededRandom(seed + i) * (maxPlatWidth - minPlatWidth));
        const xMin = Math.max(10, prevX - 100);
        const xMax = Math.min(canvas.width - w - 10, prevX + 100);
        const x = xMin + Math.floor(seededRandom(seed + i + 10) * (xMax - xMin));
        platforms.push({x: x, y: y, w: w, h: 20});
        prevX = x;
    }

    // Side platforms for challenge
    platforms.forEach((p, i) => {
        if (i === 0 || i === layers-1) return;
        if (seededRandom(seed + i + 50) > 0.5) {
            let w = minPlatWidth + Math.floor(seededRandom(seed + i + 60) * (maxPlatWidth - minPlatWidth));
            let xOffset = Math.floor(seededRandom(seed + i + 70) * (canvas.width - w - 10));
            platforms.push({x: xOffset, y: p.y, w: w, h: 20});
        }
    });

    // Hazards (minimum 2)
    platforms.forEach((p,i) => {
        if (i === 0 || i === layers-1) return;
        if (seededRandom(seed+i) > 0.3) {
            let hW = p.w * (0.5 + 0.2 * seededRandom(seed + i + 100));
            let hX = p.x + (p.w - hW)/2;
            hazards.push({x: hX, y: p.y + p.h, w: hW, h: 12, color: "#e74c3c"});
        }
    });
    while(hazards.length < 2){
        const p = platforms[Math.floor(seededRandom(seed + hazards.length) * platforms.length)];
        if (p !== platforms[0] && p !== platforms[platforms.length-1]){
            hazards.push({x: p.x + 10, y: p.y + p.h, w: p.w*0.6, h: 12, color: "#e74c3c"});
        }
    }

    // Player start on the lowest platform
    const lowestPlat = platforms.reduce((max, p) => p.y > max.y ? p : max, platforms[0]);
    player.x = lowestPlat.x + lowestPlat.w/2 - player.w/2;
    player.y = lowestPlat.y - player.h;

    // Place goal on the highest platform
    placeGoal();
}

// --- PLACE GOAL ---
function placeGoal() {
    const highestPlat = platforms.reduce((min, p) => p.y < min.y ? p : min, platforms[0]);
    goal = {
        w: 30,
        h: 30,
        color: "#3cb371",
        x: highestPlat.x + highestPlat.w/2 - 15,
        y: highestPlat.y + highestPlat.h
    };
}

// --- CONTROLS ---
document.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (e.code === "Space" && gameState === "playing") gravityDir *= -1;
});
document.addEventListener("keyup", e => keys[e.code] = false);

// --- GAME LOOP ---
function update() {
    if (gameState === "playing") {
        if (keys["ArrowLeft"]) player.x -= speedX;
        if (keys["ArrowRight"]) player.x += speedX;
        player.vy += gravity * gravityDir;
        player.y += player.vy;

        // Platform collisions
        platforms.forEach(p => {
            if(player.x + player.w > p.x && player.x < p.x + p.w){
                if(gravityDir === 1 && player.y + player.h > p.y && player.y + player.h < p.y + p.h + player.vy){
                    player.y = p.y - player.h;
                    player.vy = 0;
                }
                if(gravityDir === -1 && player.y < p.y + p.h && player.y > p.y - player.h + player.vy){
                    player.y = p.y + p.h;
                    player.vy = 0;
                }
            }
        });

        // Hazards
        hazards.forEach(h => {
            if(player.x + player.w > h.x && player.x < h.x + h.w &&
               player.y + player.h > h.y && player.y < h.y + h.h){
                   gameState = "failed";
               }
        });

        if(player.y < 0 || player.y + player.h > canvas.height) gameState = "failed";

        // Goal
        if(player.x + player.w > goal.x && player.x < goal.x + goal.w &&
           player.y + player.h > goal.y && player.y < goal.y + goal.h){
               gameState = "won";
           }

        if(player.x < 0) player.x = 0;
        if(player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    }

    draw();
    if(gameState === "playing") requestAnimationFrame(update);
}

// --- DRAW ---
function draw() {
    ctx.fillStyle = "#eee";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Platforms
    platforms.forEach(p => {
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(p.x,p.y,p.w,p.h);
    });

    // Hazards
    hazards.forEach(h => {
        ctx.fillStyle = h.color;
        ctx.fillRect(h.x,h.y,h.w,h.h);
    });

    // Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x,player.y,player.w,player.h);

    // Goal
    ctx.fillStyle = goal.color;
    ctx.fillRect(goal.x,goal.y,goal.w,goal.h);

    // End screens
    if(gameState === "failed") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#e74c3c";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL FAILED", canvas.width/2, canvas.height/2);
        ctx.font = "25px Arial";
        ctx.fillText("Refresh to try again", canvas.width/2, canvas.height/2+50);
    }

    if(gameState === "won") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#3cb371";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL COMPLETE!", canvas.width/2, canvas.height/2);
        ctx.font = "25px Arial";
        ctx.fillText("Come back tomorrow for a new challenge", canvas.width/2, canvas.height/2+50);
    }
}

// --- START ---
generateLevel(getDailySeed());
update();
