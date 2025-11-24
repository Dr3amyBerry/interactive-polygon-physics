const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Controls
const speedUpBtn = document.getElementById('speedUp');
const slowDownBtn = document.getElementById('slowDown');

speedUpBtn.addEventListener('click', () => {
    ball.vx *= 1.2;
    ball.vy *= 1.2;
});

slowDownBtn.addEventListener('click', () => {
    ball.vx *= 0.8;
    ball.vy *= 0.8;
});

// Game State
let numSides = 3;
const polygonRadius = 300;
const ball = {
    x: 0,
    y: 0,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    radius: 10,
    color: 'red',
    baseSpeed: 7,
    trail: []
};

let lastCollisionTime = 0;

// Ensure ball starts with some speed
if (Math.abs(ball.vx) < 2) ball.vx = 5;
if (Math.abs(ball.vy) < 2) ball.vy = 5;


function getPolygonVertices(sides, radius, centerX, centerY) {
    const vertices = [];
    const angleStep = (Math.PI * 2) / sides;
    const rotationOffset = -Math.PI / 2;

    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep + rotationOffset;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        vertices.push({ x, y });
    }
    return vertices;
}

function drawPolygon(vertices) {
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    // Style
    ctx.strokeStyle = '#00ccff'; // Neon blue
    ctx.lineWidth = 5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ccff';
    ctx.stroke();

    // Reset shadow for other elements
    ctx.shadowBlur = 0;
}

function drawVertices(vertices) {
    for (let i = 0; i < vertices.length; i++) {
        ctx.beginPath();
        ctx.arc(vertices[i].x, vertices[i].y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    }
}

function drawBall() {
    // Draw Trail (Continuous Line)
    if (ball.trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(ball.trail[0].x + canvas.width / 2, ball.trail[0].y + canvas.height / 2);

        // Use quadratic curves for smoother trail
        for (let i = 1; i < ball.trail.length - 1; i++) {
            const xc = (ball.trail[i].x + ball.trail[i + 1].x) / 2 + canvas.width / 2;
            const yc = (ball.trail[i].y + ball.trail[i + 1].y) / 2 + canvas.height / 2;
            const cpX = ball.trail[i].x + canvas.width / 2;
            const cpY = ball.trail[i].y + canvas.height / 2;
            ctx.quadraticCurveTo(cpX, cpY, xc, yc);
        }
        // Connect to the last point
        const last = ball.trail[ball.trail.length - 1];
        ctx.lineTo(last.x + canvas.width / 2, last.y + canvas.height / 2);

        // Gradient for fading trail
        const gradient = ctx.createLinearGradient(
            ball.trail[0].x + canvas.width / 2, ball.trail[0].y + canvas.height / 2,
            ball.trail[ball.trail.length - 1].x + canvas.width / 2, ball.trail[ball.trail.length - 1].y + canvas.height / 2
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.8)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = ball.radius;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(ball.x + canvas.width / 2, ball.y + canvas.height / 2, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 15;
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center coordinate system
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const vertices = getPolygonVertices(numSides, polygonRadius, centerX, centerY);

    drawPolygon(vertices);
    drawVertices(vertices);
    update();
    drawBall();

    requestAnimationFrame(loop);
}

loop();
