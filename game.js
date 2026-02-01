const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ========== SETTINGS ==========
canvas.width = 600;
canvas.height = 800;

let gravity = 0.5;
let gravityDir = 1;
let speedX = 4;

// ========== DAILY STREAK & LEADERBOARD ==========
function getESTDateString() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const est = new Date(utc - 5 * 60 * 60 * 1000);
    return est.toISOString().split("T")[0];
}

let today = getESTDateString();

let streakData = JSON.parse(localStorage.getItem("flipventure_streak")) || {
    lastWinDate: null,
    streak: 0,
    playerName: null,
    lastTimeMs: null
};

let leaderboard = JSON.parse(localStorage.getItem("flipventure_leaderboard")) || {};
if (!leaderboard[today]) leaderboard[today] = [null,null,null,null,null];

// ========== PLAYER ==========
let player = { x:0, y:0, w:35, h:35, vy:0, color:"#7ec8e3" };

// ========== PLATFORMS ==========
let platforms = [
    { x: 50, y: 700, w: 200, h: 20 },
    { x: 350, y: 620, w: 150, h: 20 },
    { x: 100, y: 540, w: 180, h: 20 },
    { x: 320, y: 460, w: 160, h: 20 },
    { x: 80, y: 380, w: 120, h: 20 },
    { x: 300, y: 300, w: 100, h: 20 },
    { x: 150, y: 220, w: 180, h: 20 }
];

// ========== HAZARDS ==========
let hazards = platforms.slice(1,6).map(p=>({
    x:p.x+25, y:p.y+p.h, w:p.w-50, h:8, color:"#e74c3c"
}));

// ========== GOAL ==========
let highestPlatform = platforms.reduce((a,b)=>b.y<a.y?b:a);
let goal = { w:30, h:30, x:highestPlatform.x+highestPlatform.w/2-15, y:highestPlatform.y+highestPlatform.h, color:"#3cb371" };

// ========== GAME STATE ==========
let keys = {};
let gameState = "playing";
let startTime = Date.now();
let finishTimeMs = 0;

// ========== NAME INPUT ==========
let nameInputActive = false;
let nameInput = "";

// Only show name input if user hasn’t submitted today
if(streakData.lastWinDate !== today){
    nameInputActive = false;
}

// ========== INIT PLAYER ==========
player.x = platforms[0].x + platforms[0].w/2 - player.w/2;
player.y = platforms[0].y - player.h;

// ========== CONTROLS ==========
document.addEventListener("keydown", e=>{
    if (gameState==="playing" && !nameInputActive){
        keys[e.code]=true;
        if (e.code==="Space") gravityDir*=-1;
    }
    if (nameInputActive){
        if (e.key==="Backspace") nameInput=nameInput.slice(0,-1);
        else if (e.key==="Enter") submitName();
        else if (e.key.length===1 && nameInput.length<12) nameInput+=e.key;
    }
});

document.addEventListener("keyup", e=>{
    if(!nameInputActive) keys[e.code]=false;
});

// ========== SUBMIT NAME ==========
function submitName(){
    if(nameInput.trim()==="") nameInput="Guest";
    streakData.playerName=nameInput.substring(0,12);
    streakData.lastTimeMs=finishTimeMs;
    streakData.lastWinDate=today;
    localStorage.setItem("flipventure_streak", JSON.stringify(streakData));

    let todayLB=leaderboard[today];
    let newEntry={name:streakData.playerName, time:finishTimeMs};
    todayLB.push(newEntry);
    todayLB.sort((a,b)=>a? (b? a.time-b.time : -1) : 1 );
    leaderboard[today]=todayLB.slice(0,5);
    localStorage.setItem("flipventure_leaderboard", JSON.stringify(leaderboard));

    nameInputActive=false;
    updateLeaderboardHTML();
}

// ========== UPDATE LEADERBOARD ==========
function updateLeaderboardHTML(){
    const todayLB=leaderboard[today] || [null,null,null,null,null];
    const lbList=document.getElementById("leaderboardList");
    lbList.innerHTML="";
    for(let i=0;i<5;i++){
        let entry=todayLB[i];
        let text="";
        if(entry){
            let totalSec=Math.floor(entry.time/1000);

            // 🔥 ONLY CHANGE: milliseconds now 2 digits
            let ms=Math.floor((entry.time%1000)/10).toString().padStart(2,"0");

            text=`${entry.name}:${totalSec}:${ms}`;
        }
        const li=document.createElement("li");
        li.textContent=text;
        lbList.appendChild(li);
    }
}

// ========== GAME LOOP ==========
function update(){
    if(gameState==="playing"){
        if(keys["ArrowLeft"]) player.x-=speedX;
        if(keys["ArrowRight"]) player.x+=speedX;

        player.vy+=gravity*gravityDir;
        player.y+=player.vy;

        platforms.forEach(p=>{
            if(player.x+player.w>p.x && player.x<p.x+p.w){
                if(gravityDir===1 && player.y+player.h>p.y && player.y+player.h<p.y+p.h+Math.abs(player.vy)){
                    player.y=p.y-player.h; player.vy=0;
                }
                if(gravityDir===-1 && player.y<p.y+p.h && player.y>p.y-player.h-Math.abs(player.vy)){
                    player.y=p.y+p.h; player.vy=0;
                }
            }
        });

        hazards.forEach(h=>{
            if(player.x+player.w>h.x && player.x<h.x+h.w && player.y+player.h>h.y && player.y<h.y+h.h){
                gameState="failed"; finishTimeMs=Date.now()-startTime;
            }
        });

        if(player.y<0 || player.y+player.h>canvas.height){
            gameState="failed"; finishTimeMs=Date.now()-startTime;
        }

        if(player.x+player.w>goal.x && player.x<goal.x+goal.w && player.y+player.h>goal.y && player.y<goal.y+goal.h){
            gameState="won"; finishTimeMs=Date.now()-startTime;
            if(!nameInputActive && streakData.lastWinDate!==today){
                nameInputActive=true;
                nameInput="";
            }
        }

        if(player.x<0) player.x=0;
        if(player.x+player.w>canvas.width) player.x=canvas.width-player.w;
    }

    draw();
    if(gameState==="playing") requestAnimationFrame(update);
}

// ========== DRAW ==========
function draw(){
    ctx.fillStyle="#dbe9f4";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="#2c3e50";
    platforms.forEach(p=>ctx.fillRect(p.x,p.y,p.w,p.h));

    hazards.forEach(h=>{
        ctx.fillStyle=h.color;
        ctx.fillRect(h.x,h.y,h.w,h.h);
    });

    ctx.fillStyle=goal.color;
    ctx.fillRect(goal.x,goal.y,goal.w,goal.h);

    ctx.fillStyle=player.color;
    ctx.fillRect(player.x,player.y,player.w,player.h);

    if(gameState==="failed"){
        ctx.fillStyle="rgba(0,0,0,0.7)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle="#e74c3c";
        ctx.font="50px Arial";
        ctx.textAlign="center";
        ctx.fillText("LEVEL FAILED",canvas.width/2,canvas.height/2);
        ctx.font="22px Arial";
        ctx.fillText("Refresh to try again",canvas.width/2,canvas.height/2+50);
    }

    if(gameState==="won"){
        ctx.fillStyle="rgba(0,0,0,0.7)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle="#3cb371";
        ctx.font="50px Arial";
        ctx.textAlign="center";
        ctx.fillText("LEVEL COMPLETE!",canvas.width/2,canvas.height/2);

        if(nameInputActive){
            ctx.font="22px Arial";
            ctx.fillText("Enter name below",canvas.width/2,canvas.height/2+50);
            ctx.fillStyle="#ffffff";
            ctx.fillRect(canvas.width/2-100,canvas.height/2+90,200,35);
            ctx.fillStyle="#000000";
            ctx.font="20px Arial";
            ctx.textAlign="left";
            ctx.fillText(nameInput,canvas.width/2-95,canvas.height/2+117);
            ctx.textAlign="center";
        }
    }
}

// ========== START ==========
update();
updateLeaderboardHTML();
