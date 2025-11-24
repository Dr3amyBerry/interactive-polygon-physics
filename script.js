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
    if (ball.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ball.trail[0].x + canvas.width / 2, ball.trail[0].y + canvas.height / 2);
        for (let i = 1; i < ball.trail.length; i++) {
            ctx.lineTo(ball.trail[i].x + canvas.width / 2, ball.trail[i].y + canvas.height / 2);
        }

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
    ctx.shadowColor = 'red';
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Physics & Collision
function update() {
    // Apply gravity
    ball.vy += 0.15;

    // Dynamic Speed Decay
    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (Date.now() - lastCollisionTime > 1000 && currentSpeed > ball.baseSpeed) {
        ball.vx *= 0.99;
        ball.vy *= 0.99;
    }

    // Update Trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 20) {
        ball.trail.shift();
    }

    // Ray-Cast / Continuous Collision Detection
    // We want to move from (x, y) to (x+vx, y+vy)
    // We check if this path intersects any wall (offset by radius)

    let timeStep = 1.0; // Full frame
    let remainingTime = 1.0;

    // Safety break to prevent infinite loops in corners
    let iterations = 0;

    while (remainingTime > 0 && iterations < 5) {
        const vertices = getPolygonVertices(numSides, polygonRadius, 0, 0);
        let earliestCollision = null;

        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % vertices.length];

            // Wall vector
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;

            // Normal (pointing inward? we need to check)
            // Vertices are usually clockwise or counter-clockwise.
            // Let's assume standard geometric normal (-dy, dx)
            let nx = -dy;
            let ny = dx;
            // Normalize
            const len = Math.sqrt(nx * nx + ny * ny);
            nx /= len;
            ny /= len;

            // Ensure normal points towards center (0,0)
            // Dot product with vector to center (-p1)
            if (nx * (-p1.x) + ny * (-p1.y) < 0) {
                nx = -nx;
                ny = -ny;
            }

            // Distance from ball center to wall line: (P - p1) . n
            // We want to find t such that dist(Pos + Vel*t) = radius
            // (Pos + Vel*t - p1) . n = radius
            // (Pos - p1).n + (Vel.n)*t = radius
            // t = (radius - (Pos - p1).n) / (Vel.n)

            const distToWall = (ball.x - p1.x) * nx + (ball.y - p1.y) * ny;
            const velDotNormal = ball.vx * nx + ball.vy * ny;

            // If moving away from wall (velDotNormal > 0), ignore
            if (velDotNormal >= 0) continue;

            // t is the fraction of the velocity vector
            const t = (ball.radius - distToWall) / velDotNormal;

            if (t >= 0 && t <= remainingTime) {
                // Potential collision
                // Check if the intersection point is actually within the segment p1-p2
                // Intersection point on the line (ball center)
                const ix = ball.x + ball.vx * t;
                const iy = ball.y + ball.vy * t;

                // Project 'i' onto the line p1-p2 to see if it's within the segment
                // Vector p1->i
                const p1_i_x = ix - p1.x;
                const p1_i_y = iy - p1.y;
                // Dot product with wall vector
                const wallLenSq = dx * dx + dy * dy;
                const proj = (p1_i_x * dx + p1_i_y * dy) / wallLenSq;

                // Allow a bit of buffer for corners (0.0 to 1.0)
                if (proj >= -0.1 && proj <= 1.1) {
                    if (!earliestCollision || t < earliestCollision.t) {
                        earliestCollision = { t, nx, ny };
                    }
                }
            }
        }

        if (earliestCollision) {
            // Move to collision point
            ball.x += ball.vx * earliestCollision.t;
            ball.y += ball.vy * earliestCollision.t;

            // Reflect
            const dot = ball.vx * earliestCollision.nx + ball.vy * earliestCollision.ny;
            ball.vx = ball.vx - 2 * dot * earliestCollision.nx;
            ball.vy = ball.vy - 2 * dot * earliestCollision.ny;

            // Add chaos
            ball.vx += (Math.random() - 0.5) * 4;
            ball.vy += (Math.random() - 0.5) * 4;

            // Game logic
            numSides++;
            ball.vx *= 1.05;
            ball.vy *= 1.05;
            lastCollisionTime = Date.now();

            // Reduce remaining time
            remainingTime -= earliestCollision.t;

            // Nudge slightly to avoid getting stuck exactly on the line
            ball.x += ball.vx * 0.01;
            ball.y += ball.vy * 0.01;

        } else {
            // No collision, move full remaining distance
            ball.x += ball.vx * remainingTime;
            ball.y += ball.vy * remainingTime;
            remainingTime = 0;
        }

        iterations++;
    }

    // Failsafe: Hard clamp if still outside
    const distFromCenter = Math.sqrt(ball.x * ball.x + ball.y * ball.y);
    // Approximate polygon boundary distance (using radius is a safe upper bound for corners, but apothem is lower)
    // If we are WAY out, reset.
    if (distFromCenter > polygonRadius + ball.radius + 100) {
        ball.x = 0;
        ball.y = 0;
        ball.vx = 0;
        ball.vy = 0;
        numSides = 3;
    }
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
