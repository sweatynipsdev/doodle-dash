const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    backgroundColor: '#87ceeb',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    pixelArt: true // Disable smoothing for pixel-perfect rendering
};

const game = new Phaser.Game(config);
let currentScene = null;
let debugText = null;
let player = null;
let bananas = [], coins = [], powerUps = [], healthPickups = [], projectiles = [], particles = [], popUps = [], auraParticles = [], score = 0, gameOver = false;
let doublePointsActive = false;
let projectileActive = true;
let homingActive = false;
let slowdownActive = false;
let shieldHealth = 0;
let powerUpTimer = null;
let gameTime = 0;
let lastShotTime = 0;
let health = 3;
let currentWave = 1;
let nextWaveTime = 20;
let selectedCharacter = null;
let combo = 0;
let comboMultiplier = 1;
let stars = [];
let clouds = [];
let baseStarSpeed = 1;
let baseCloudSpeed = 2;
let highScores = JSON.parse(localStorage.getItem('doodleDashHighScores')) || [];
let tokens = parseInt(localStorage.getItem('doodleDashTokens')) || 0;
let canDash = true;
let dashCooldown = 1;
let dashTimer = 0;
let dashDistance = 75;
let lastDirection = 'right';
let bananaGroup, projectileGroup;
let fpsCounter = 0, frameCount = 0, lastFpsUpdate = 0;
let shake = { duration: 0, intensity: 0, offsetX: 0, offsetY: 0 };
let flash = { color: 'rgba(255, 255, 255, 0)', opacity: 0 };

const characterData = [
    { color: 'red', width: 50, height: 50 },
    { color: 'blue', width: 50, height: 50 },
    { color: 'green', width: 50, height: 50 }
];
let currentCharacterIndex = 0;
const slotOutcomes = [
    { id: 'coin', chance: 0.3 },
    { id: 'heart', chance: 0.2 },
    { id: 'skull', chance: 0.3 },
    { id: 'star', chance: 0.15 },
    { id: 'char', chance: 0.05 }
];

function preload() {
    this.load.spritesheet('heart', 'hearts.png', { frameWidth: 256, frameHeight: 256 });
    this.load.image('coin', 'coin.png');
    this.load.image('doublepoints', 'doublepoints.png');
    this.load.image('shield', 'shield.png');
    this.load.image('slowdown', 'slowdown.png');
    this.load.image('projectile', 'projectile.png');
}

function create() {
    currentScene = this;
    debugText = this.add.text(10, 10, 'Debug: Rendering Test', {
        fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
    });
    debugText.setDepth(1);

    this.keys = this.input.keyboard.createCursorKeys();
    this.keys.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keys.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.anims.create({ key: 'heart_anim', frames: this.anims.generateFrameNumbers('heart', { start: 0, end: 63 }), frameRate: 10, repeat: -1 });

    bananaGroup = this.physics.add.group();
    projectileGroup = this.physics.add.group();
    this.physics.add.overlap(projectileGroup, bananaGroup, handleProjectileBananaCollision, null, this);

    initBackground();
}

function handleProjectileBananaCollision(projectile, banana) {
    score += Math.round((doublePointsActive ? 20 : 10) * comboMultiplier);
    combo += 1; comboMultiplier = 1 + (combo * 0.1);
    updateUIDisplays();
    createParticles(banana.x, banana.y, 'rgba(255, 215, 0, 1)');
    popUps.push({ text: `+${Math.round((doublePointsActive ? 20 : 10) * comboMultiplier)}`, x: banana.x, y: banana.y, life: 1, obj: currentScene.add.text(banana.x - 20, banana.y, `+${Math.round((doublePointsActive ? 20 : 10) * comboMultiplier)}`, { fontSize: '16px', color: '#FFD700', stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
    if (combo > 1) popUps.push({ text: `Combo x${comboMultiplier.toFixed(1)}!`, x: player.x, y: player.y - 20, life: 1, obj: currentScene.add.text(player.x - 50, player.y - 20, `Combo x${comboMultiplier.toFixed(1)}!`, { fontSize: '16px', color: '#FF00FF', stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
    projectile.destroy(); banana.destroy();
    projectiles = projectiles.filter(p => p.obj !== projectile);
    bananas = bananas.filter(b => b.obj !== banana);
    console.log('Projectile hit banana at:', { projectileX: projectile.x, projectileY: projectile.y, bananaX: banana.x, bananaY: banana.y });
}

function update(time, delta) {
    if (gameOver) return;

    frameCount++;
    if (time - lastFpsUpdate >= 1000) {
        fpsCounter = frameCount;
        frameCount = 0;
        lastFpsUpdate = time;
    }

    gameTime += delta / 1000;

    if (gameTime >= nextWaveTime * currentWave) {
        currentWave++; score += currentWave * 50;
        increaseDifficulty(); updateUIDisplays();
        flash.opacity = 0.5; flash.color = 'rgba(255, 215, 0, 0.5)';
        createParticles(200, 300, 'rgba(255, 215, 0, 1)', 50); // Starburst
        popUps.push({ text: 'New Wave!', x: 200, y: 300, life: 2, obj: currentScene.add.text(150, 300, 'New Wave!', { fontSize: '16px', color: '#FFD700', stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
    }

    if (!canDash) {
        dashTimer += delta / 1000;
        if (dashTimer >= dashCooldown) { canDash = true; dashTimer = 0; }
    }

    if (player) {
        if (this.keys.left.isDown && player.x > player.width / 2) { player.x -= 5; lastDirection = 'left'; }
        else if (this.keys.right.isDown && player.x < 400 - player.width / 2) { player.x += 5; lastDirection = 'right'; }

        if (this.keys.shift.isDown && canDash) {
            if (lastDirection === 'left' && player.x > player.width / 2) {
                player.x -= dashDistance;
                if (player.x < player.width / 2) player.x = player.width / 2;
            } else if (lastDirection === 'right' && player.x < 400 - player.width / 2) {
                player.x += dashDistance;
                if (player.x > 400 - player.width / 2) player.x = 400 - player.width / 2;
            }
            canDash = false; dashTimer = 0;
        }

        if (this.keys.space.isDown && time - lastShotTime > 400) { // Increased cooldown to 400ms
            let projectile;
            if (homingActive) {
                projectile = currentScene.add.image(player.x, player.y - player.height / 2, 'projectile');
                projectile.setOrigin(0.5, 0); projectile.setScale(0.02);
            } else {
                projectile = currentScene.add.rectangle(player.x, player.y - player.height / 2, 10, 20, 0xff0000);
                projectile.setOrigin(0.5, 0);
            }
            projectile.setDepth(1);
            currentScene.physics.add.existing(projectile);
            projectile.body.setCircle(homingActive ? projectile.width * 0.02 / 2 : 5);
            projectileGroup.add(projectile);
            projectiles.push({ obj: projectile, x: projectile.x, y: projectile.y, speed: 10 });
            lastShotTime = time;
        }
    }

    if (debugText) debugText.setText(`FPS: ${fpsCounter}\nX: ${player ? player.x : 'N/A'}, Y: ${player ? player.y : 'N/A'}, Wave: ${currentWave}`);

    projectiles.forEach(projectile => {
        let effectiveSpeed = projectile.speed;
        if (homingActive && bananas.length > 0) {
            let nearestBanana = null; let minDistance = Infinity;
            bananas.forEach(banana => {
                const distance = Phaser.Math.Distance.Between(projectile.x, projectile.y, banana.x + banana.width / 2, banana.y + banana.height / 2);
                if (distance < minDistance) { minDistance = distance; nearestBanana = banana; }
            });
            if (nearestBanana) {
                const targetX = nearestBanana.x + nearestBanana.width / 2;
                const targetY = nearestBanana.y + nearestBanana.height / 2;
                const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, targetX, targetY);
                const homingSpeed = 7; const maxVerticalSpeed = 2;
                projectile.obj.x += Math.cos(angle) * homingSpeed;
                projectile.obj.y += Math.sin(angle) * homingSpeed;
                projectile.x = projectile.obj.x; projectile.y = projectile.obj.y;
                effectiveSpeed = maxVerticalSpeed;
                projectile.obj.rotation = angle + Math.PI / 2;
                projectile.obj.body.setVelocity(Math.cos(angle) * homingSpeed * 60, Math.sin(angle) * homingSpeed * 60);
            }
        } else {
            projectile.obj.y -= effectiveSpeed; projectile.y = projectile.obj.y;
            projectile.obj.body.setVelocityY(-effectiveSpeed * 60);
        }

        if (projectile.obj.y < 0) { projectile.obj.destroy(); projectiles = projectiles.filter(p => p !== projectile); }
    });

    bananas.forEach(banana => {
        let effectiveSpeed = banana.speed * (1 + Math.log2(Math.max(1, currentWave - 1)) * 0.2);
        console.log(`Banana speed: ${effectiveSpeed} at Wave ${currentWave}`); // Debug banana speed
        if (slowdownActive) effectiveSpeed *= 0.5;
        banana.vy = Math.max(1.2, banana.vy); // Increased minimum vertical speed to 1.2
        banana.obj.y += effectiveSpeed * banana.vy;
        banana.obj.x += effectiveSpeed * banana.vx;
        // Varied movement
        switch (banana.movementType) {
            case 0: // Angled descent
                break;
            case 1: // Weaving left to right
                banana.obj.x += Math.sin(gameTime + banana.x) * 2;
                break;
            case 2: // Spiral
                banana.obj.x += Math.sin(gameTime + banana.x) * 2;
                banana.obj.y += Math.cos(gameTime + banana.y) * 0.5;
                break;
            case 3: // Zigzag
                banana.obj.x += Math.sin(gameTime) * 3; // Reduced frequency to avoid vibration
                break;
            case 4: // Bounce
                banana.obj.y += Math.sin(gameTime + banana.y) * 0.5;
                break;
        }
        banana.x = banana.obj.x; banana.y = banana.obj.y;
        banana.obj.body.setVelocityY(effectiveSpeed * 60 * banana.vy);
        banana.obj.body.setVelocityX(effectiveSpeed * 60 * banana.vx);
        if (banana.obj.x < -banana.width || banana.obj.x > 400 + banana.width || banana.obj.y > 600 + banana.height) {
            banana.obj.destroy(); bananas = bananas.filter(b => b !== banana);
        }
        if (player && checkCollision(player, banana)) {
            if (!slowdownActive) {
                health -= 1; combo = 0; comboMultiplier = 1;
                updateUIDisplays();
                createParticles(player.x, player.y, 'rgba(255, 0, 0, 1)', 20); // Red burst
                shake.duration = 0.3; shake.intensity = 3;
                popUps.push({ text: 'Damage!', x: player.x, y: player.y - 20, life: 1, obj: currentScene.add.text(player.x - 30, player.y - 20, 'Damage!', { fontSize: '16px', color: '#FF0000', stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
                if (health <= 0) { gameOver = true; slotMachineDiv.style.display = 'block'; restartBtn.style.display = 'block'; }
            }
            banana.obj.destroy(); bananas = bananas.filter(b => b !== banana);
        }
    });

    coins.forEach(coin => {
        let speedMultiplier = coin.speedMultiplier || (0.5 + Math.random()); // Random speed between 0.5x and 1.5x
        let effectiveSpeed = 5 * speedMultiplier * (1 + Math.log2(Math.max(1, currentWave - 1)) * 0.2); // Increased base speed to 5
        coin.obj.y += effectiveSpeed;
        // Apply movement based on fixed type
        switch (coin.movementType) {
            case 0: // Angled
                coin.obj.x += Math.cos(gameTime) * 1;
                break;
            case 1: // Weaving
                coin.obj.x += Math.sin(gameTime + coin.x) * 2;
                break;
            case 2: // Spiral
                coin.obj.x += Math.sin(gameTime + coin.x) * 1.5;
                coin.obj.y += Math.cos(gameTime + coin.y) * 0.5;
                break;
            case 3: // Zigzag
                coin.obj.x += Math.sin(gameTime) * 2; // Reduced frequency
                break;
            case 4: // Bounce
                coin.obj.y += Math.sin(gameTime + coin.y) * 0.5;
                break;
        }
        coin.x = coin.obj.x; coin.y = coin.obj.y;
        if (coin.obj.y > 600 + coin.height) { coin.obj.destroy(); coins = coins.filter(c => c !== coin); }
        if (player && checkCollision(player, coin)) {
            score += Math.round((doublePointsActive ? 20 : 10) * comboMultiplier);
            combo += 1; comboMultiplier = 1 + (combo * 0.1);
            updateUIDisplays();
            createParticles(coin.x, coin.y, 'rgba(255, 215, 0, 1)');
            popUps.push({ text: `+${Math.round((doublePointsActive ? 20 : 10) * comboMultiplier)}`, x: coin.x, y: coin.y, life: 1, obj: currentScene.add.text(coin.x - 20, coin.y, `+${Math.round((doublePointsActive ? 20 : 10) * comboMultiplier)}`, { fontSize: '16px', color: '#FFD700', stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
            if (combo > 1) popUps.push({ text: `Combo x${comboMultiplier.toFixed(1)}!`, x: player.x, y: player.y - 20, life: 1, obj: currentScene.add.text(player.x - 50, player.y - 20, `Combo x${comboMultiplier.toFixed(1)}!`, { fontSize: '16px', color: '#FF00FF', stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
            coin.obj.destroy(); coins = coins.filter(c => c !== coin);
        }
    });

    powerUps.forEach(powerUp => {
        let speedMultiplier = powerUp.speedMultiplier || (0.5 + Math.random()); // Random speed between 0.5x and 1.5x
        let effectiveSpeed = 4 * speedMultiplier * (1 + Math.log2(Math.max(1, currentWave - 1)) * 0.2); // Increased base speed to 4
        powerUp.obj.y += effectiveSpeed;
        // Apply movement based on fixed type
        switch (powerUp.movementType) {
            case 0: // Angled
                powerUp.obj.x += Math.cos(gameTime) * 1.5;
                break;
            case 1: // Weaving
                powerUp.obj.x += Math.sin(gameTime + powerUp.x) * 2.5;
                break;
            case 2: // Spiral
                powerUp.obj.x += Math.sin(gameTime + powerUp.x) * 2;
                powerUp.obj.y += Math.cos(gameTime + powerUp.y) * 0.5;
                break;
            case 3: // Zigzag
                powerUp.obj.x += Math.sin(gameTime) * 2.5; // Reduced frequency
                break;
            case 4: // Bounce
                powerUp.obj.y += Math.sin(gameTime + powerUp.y) * 0.7;
                break;
        }
        powerUp.x = powerUp.obj.x; powerUp.y = powerUp.obj.y;
        if (powerUp.obj.y > 600 + powerUp.height) { powerUp.obj.destroy(); powerUps = powerUps.filter(p => p !== powerUp); }
        if (player && checkCollision(player, powerUp)) {
            activatePowerUp(powerUp.type);
            let color = ['rgba(0, 255, 0, 1)', 'rgba(0, 0, 255, 1)', 'rgba(128, 0, 128, 1)', 'rgba(0, 255, 255, 1)'][powerUp.type];
            createParticles(powerUp.x, powerUp.y, color, 20);
            flash.opacity = 0.7; flash.color = 'rgba(255, 255, 255, 0.7)';
            popUps.push({ text: 'Power-Up!', x: powerUp.x, y: powerUp.y, life: 1, obj: currentScene.add.text(powerUp.x - 30, powerUp.y, 'Power-Up!', { fontSize: '16px', color: color, stroke: '#000000', strokeThickness: 2 }).setDepth(2) });
            powerUp.obj.destroy(); powerUps = powerUps.filter(p => p !== powerUp);
        }
    });

    healthPickups.forEach(healthPickup => {
        healthPickup.obj.y += 1 * (1 + Math.log2(Math.max(1, currentWave - 1)) * 0.2);
        healthPickup.x = healthPickup.obj.x; healthPickup.y = healthPickup.obj.y;
        if (healthPickup.obj.y > 600 + healthPickup.height) { healthPickup.obj.destroy(); healthPickups = healthPickups.filter(h => h !== healthPickup); }
        if (player && checkCollision(player, healthPickup)) {
            if (health < 3) { health += 1; updateUIDisplays(); createParticles(healthPickup.x, healthPickup.y, 'rgba(255, 0, 255, 1)', 20); }
            healthPickup.obj.destroy(); healthPickups = healthPickups.filter(h => h !== healthPickup);
        }
    });

    particles.forEach(particle => {
        particle.x += particle.vx; particle.y += particle.vy; particle.life -= 0.02;
        if (particle.life <= 0 || particle.y > 600) {
            if (particle.obj) particle.obj.destroy();
            particles = particles.filter(p => p !== particle);
        } else if (particle.obj) {
            particle.obj.x = particle.x; particle.obj.y = particle.y; particle.obj.alpha = particle.life;
        }
    });

    auraParticles.forEach(particle => {
        particle.x = player.x + Math.cos(particle.angle) * 40;
        particle.y = player.y + Math.sin(particle.angle) * 40;
        particle.angle += 0.1;
        particle.life -= 0.01;
        if (particle.life <= 0) {
            if (particle.obj) particle.obj.destroy();
            auraParticles = auraParticles.filter(p => p !== particle);
        } else if (particle.obj) {
            particle.obj.x = particle.x;
            particle.obj.y = particle.y;
            particle.obj.alpha = 0.9;
        }
    });
    if ((doublePointsActive || homingActive || slowdownActive || shieldHealth > 0) && auraParticles.length < 15) {
        let color;
        if (doublePointsActive) color = 0x00FF00; // Green
        else if (homingActive) color = 0x0000FF; // Blue
        else if (slowdownActive) color = 0x800080; // Purple
        else if (shieldHealth > 0) color = 0x00FFFF; // Cyan
        const auraParticle = currentScene.add.circle(player.x, player.y, 8, color);
        auraParticle.setAlpha(0.9);
        auraParticle.setDepth(1);
        auraParticles.push({ obj: auraParticle, x: player.x, y: player.y, angle: Math.random() * Math.PI * 2, life: 1.0 });
    }

    popUps.forEach(popUp => {
        popUp.y -= 1; popUp.life -= 0.02;
        if (popUp.life <= 0) { if (popUp.obj) popUp.obj.destroy(); popUps = popUps.filter(p => p !== popUp); }
        else if (popUp.obj) { popUp.obj.y = popUp.y; popUp.obj.alpha = popUp.life; }
    });

    stars.forEach(star => { star.obj.y += baseStarSpeed; if (star.obj.y > 600) star.obj.y -= 600; star.y = star.obj.y; star.obj.alpha = 0.5 + Math.sin(gameTime) * 0.3; });
    clouds.forEach(cloud => { cloud.obj.y += baseCloudSpeed; if (cloud.obj.y > 600) cloud.obj.y -= 600; cloud.y = cloud.y; cloud.obj.alpha = 0.7 + Math.sin(gameTime) * 0.2; });

    if (shake.duration > 0) {
        shake.duration -= delta / 1000;
        shake.offsetX = (Math.random() - 0.5) * shake.intensity;
        shake.offsetY = (Math.random() - 0.5) * shake.intensity;
        currentScene.cameras.main.setScroll(shake.offsetX, shake.offsetY);
        if (shake.duration <= 0) currentScene.cameras.main.setScroll(0, 0);
    }

    if (flash.opacity > 0) {
        flash.opacity -= 0.05;
        currentScene.cameras.main.setBackgroundColor(flash.color.replace(/[^,]+(?=\))/, flash.opacity));
        if (flash.opacity <= 0) currentScene.cameras.main.setBackgroundColor('#87ceeb');
    }
}

function initPlayer() {
    if (!currentScene) return;
    if (selectedCharacter === null || selectedCharacter >= characterData.length) selectedCharacter = 0;
    const charData = characterData[selectedCharacter];
    player = currentScene.add.circle(200, 500, charData.width / 2, Phaser.Display.Color.HexStringToColor(charData.color).color);
    player.setOrigin(0.5, 0.5); player.setDepth(1); player.width = charData.width; player.height = charData.height;
}

function startGame() {
    if (!currentScene) return;
    if (selectedCharacter === null) selectedCharacter = 0;

    document.getElementsByTagName('canvas')[0].style.display = 'block';
    startBtn.style.display = 'none'; characterSelectDiv.style.display = 'none';
    document.getElementById('highScores').style.display = 'none'; restartBtn.style.display = 'none';
    controlsHint.style.display = 'block'; scoreDisplay.style.display = 'block';
    comboDisplay.style.display = 'block'; healthDisplay.style.display = 'block'; slotMachineDiv.style.display = 'none';

    initPlayer(); spawnBanana(); spawnCoin(); spawnPowerUp(); spawnHealthPickup();
}

function updateCharacterDisplay() {
    const charData = characterData[currentCharacterIndex];
    currentCharacterDiv.style.backgroundColor = charData.color;
    currentCharacterDiv.classList.add('selected'); selectedCharacter = currentCharacterIndex; startBtn.disabled = false;
}

function displayHighScores() {
    const highScoresDiv = document.getElementById('highScores');
    if (highScores.length === 0) highScoresDiv.innerHTML = 'High Scores:<br>No scores yet';
    else {
        highScoresDiv.innerHTML = 'High Scores:<br>';
        highScores.slice(0, 5).forEach((score, index) => {
            const rank = ['1st', '2nd', '3rd', '4th', '5th'][index];
            highScoresDiv.innerHTML += `${rank} ${score}<br>`;
        });
    }
}

function updateUIDisplays() {
    scoreDisplay.textContent = `Score: ${score}`;
    comboDisplay.textContent = `Combo: ${combo}x (x${comboMultiplier.toFixed(1)})`;
    healthDisplay.innerHTML = '';
    for (let i = 0; i < health + shieldHealth; i++) {
        const heart = document.createElement('span');
        heart.textContent = '❤️'; heart.style.color = 'red'; heart.style.fontSize = '20px'; heart.style.marginRight = '5px';
        healthDisplay.appendChild(heart);
    }
    let waveDisplay = document.getElementById('waveDisplay');
    if (!waveDisplay) {
        waveDisplay = document.createElement('div');
        waveDisplay.id = 'waveDisplay'; waveDisplay.style.position = 'absolute'; waveDisplay.style.top = '50px';
        waveDisplay.style.left = '10px'; waveDisplay.style.fontSize = '16px'; waveDisplay.style.color = '#fff';
        waveDisplay.style.textShadow = '1px 1px 2px #000';
        healthDisplay.parentNode.insertBefore(waveDisplay, healthDisplay.nextSibling);
    }
    waveDisplay.textContent = `Wave: ${currentWave}`;
    scoreDisplay.style.display = 'block'; comboDisplay.style.display = 'block'; healthDisplay.style.display = 'block';
}

function cycleLeft() { currentCharacterIndex = (currentCharacterIndex - 1 + characterData.length) % characterData.length; updateCharacterDisplay(); }
function cycleRight() { currentCharacterIndex = (currentCharacterIndex + 1) % characterData.length; updateCharacterDisplay(); }

function initBackground() {
    for (let i = 0; i < 50; i++) {
        const star = currentScene.add.circle(Math.random() * 400, Math.random() * 600, Math.random() * 2 + 1, 0xffffff);
        star.setAlpha(0.5); star.setDepth(0);
        stars.push({ obj: star, x: star.x, y: star.y, size: star.radius, opacity: star.alpha });
    }
    for (let i = 0; i < 10; i++) {
        const cloud = currentScene.add.rectangle(Math.random() * 400, Math.random() * 600, Math.random() * 50 + 30, Math.random() * 20 + 10, 0xffffff);
        cloud.setAlpha(0.7); cloud.setDepth(0);
        clouds.push({ obj: cloud, x: cloud.x, y: cloud.y, width: cloud.width, height: cloud.height });
    }
}

function spawnBanana() {
    if (gameOver) return;
    const type = Math.random() < 0.3 ? 'splitter' : 'normal';
    const width = type === 'normal' ? Math.random() * 40 + 20 : 40;
    const height = width;
    const isFast = Math.random() < 0.2;
    const baseSpeed = isFast ? 4 : (type === 'splitter' ? 3 : 2);
    const speed = baseSpeed * (1 + Math.log2(Math.max(1, currentWave - 1)) * 0.2);
    const movementType = Math.floor(Math.random() * 5); // 0: Angled, 1: Weaving, 2: Spiral, 3: Zigzag, 4: Bounce
    const angle = Math.random() * Math.PI / 4 - Math.PI / 8; // Narrower angle range (-22.5° to 22.5°)
    const vx = Math.cos(angle) * 0.3;
    const vy = Math.max(1.2, Math.sin(angle) * 0.7); // Increased minimum vy to 1.2
    const banana = currentScene.add.circle(Math.random() * (400 - width), 0, width / 2, 0xffff00);
    banana.setDepth(1);
    currentScene.physics.add.existing(banana);
    banana.body.setCircle(width / 2);
    bananaGroup.add(banana);
    bananas.push({ obj: banana, x: banana.x, y: banana.y, width: width, height: height, type: type, splitCount: type === 'splitter' ? 1 : 0, speed: speed, isFast: isFast, vx: vx, vy: vy, movementType: movementType });
    const baseInterval = 1000 - (currentWave * 200); const minInterval = 300;
    const interval = Math.max(baseInterval, minInterval);
    setTimeout(spawnBanana, interval);
}

function spawnCoin() {
    if (gameOver) return;
    const coin = currentScene.add.image(Math.random() * (400 - 40), 0, 'coin'); // Adjusted spawn position for larger size
    coin.setOrigin(0.5, 0.5); coin.setScale(40 / 1024); // Doubled size (was 20 / 1024)
    coin.setDepth(1);
    coins.push({ obj: coin, x: coin.x, y: coin.y, width: 40, height: 40, floatOffset: 0, rotation: 0, speedMultiplier: 0.5 + Math.random(), movementType: Math.floor(Math.random() * 5) });
    const baseInterval = 800 - (currentWave * 100); const minInterval = 400;
    const interval = Math.max(baseInterval, minInterval);
    setTimeout(spawnCoin, interval);
}

function spawnPowerUp() {
    if (gameOver) return;
    const type = Math.floor(Math.random() * 4);
    let imageKey;
    switch (type) {
        case 0: imageKey = 'doublepoints'; break;
        case 1: imageKey = 'projectile'; break;
        case 2: imageKey = 'slowdown'; break;
        case 3: imageKey = 'shield'; break;
        default: imageKey = 'doublepoints';
    }
    const powerUp = currentScene.add.image(Math.random() * (400 - 40), 0, imageKey);
    powerUp.setOrigin(0.5, 0.5); powerUp.setScale(40 / 1024);
    powerUp.setDepth(1);
    powerUps.push({ obj: powerUp, x: powerUp.x, y: powerUp.y, width: 40, height: 40, type: type, floatOffset: 0, scaleFactor: 1, speedMultiplier: 0.5 + Math.random(), movementType: Math.floor(Math.random() * 5) });
    const baseInterval = 8000 - (currentWave * 800); const minInterval = 3000;
    const interval = Math.max(baseInterval, minInterval);
    setTimeout(spawnPowerUp, interval);
}

function spawnHealthPickup() {
    if (gameOver) return;
    if (healthPickups.length >= 2) return;
    const originalSize = 256; const scaledSize = 40; const scale = scaledSize / originalSize;
    const healthPickup = currentScene.add.sprite(Math.random() * (400 - scaledSize) + scaledSize / 2, scaledSize / 2, 'heart');
    healthPickup.setOrigin(0.5, 0.5); healthPickup.setScale(scale); healthPickup.setDepth(1); healthPickup.play('heart_anim');
    healthPickups.push({ obj: healthPickup, x: healthPickup.x, y: healthPickup.y, width: scaledSize, height: scaledSize, floatOffset: 0 });
    const interval = Math.max(4000, 12000 - (currentWave * 800));
    setTimeout(spawnHealthPickup, interval);
}

function createParticles(x, y, color = 'rgba(255, 215, 0, 1)', count = 10) {
    if (particles.length > 50) return;
    for (let i = 0; i < count; i++) {
        const particleObj = currentScene.add.circle(x, y, Math.random() * 4 + 2, Phaser.Display.Color.HexStringToColor(color).color);
        particleObj.setDepth(2);
        particles.push({ obj: particleObj, x: x, y: y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2, life: 1.0 });
    }
}

function activatePowerUp(type) {
    if (type === 0) {
        doublePointsActive = true;
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => { doublePointsActive = false; }, 5000);
    } else if (type === 1) {
        homingActive = true;
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => { homingActive = false; }, 5000);
    } else if (type === 2) {
        slowdownActive = true;
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => { slowdownActive = false; }, 5000);
    } else if (type === 3) {
        shieldHealth = 1;
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => { shieldHealth = 0; }, 5000);
    }
}

function checkCollision(player, obj) {
    const playerCenterX = player.x; const playerCenterY = player.y; const playerRadius = player.width / 2;
    const objCenterX = obj.x + obj.width / 2; const objCenterY = obj.y + obj.height / 2; const objRadius = obj.width / 2;
    const distance = Phaser.Math.Distance.Between(playerCenterX, playerCenterY, objCenterX, objCenterY);
    const minDistance = playerRadius + objRadius;
    if (distance < minDistance) {
        console.log('Player-Banana collision:', { player: { x: playerCenterX, y: playerCenterY, radius: playerRadius }, banana: { x: objCenterX, y: objCenterY, radius: objRadius }, distance, minDistance });
        return true;
    }
    return false;
}

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const controlsHint = document.getElementById('controlsHint');
const scoreDisplay = document.getElementById('scoreDisplay');
const comboDisplay = document.getElementById('comboDisplay');
const healthDisplay = document.getElementById('healthDisplay');
const characterSelectDiv = document.getElementById('characterSelect');
const currentCharacterDiv = document.getElementById('currentCharacter');
const leftArrow = document.getElementById('leftArrow');
const rightArrow = document.getElementById('rightArrow');
const slotMachineDiv = document.getElementById('slotMachine');
const reelsDiv = document.getElementById('reels');
const spinBtn = document.getElementById('spinBtn');
const tokenDisplay = document.getElementById('tokenDisplay');

startBtn.addEventListener('click', startGame);
leftArrow.addEventListener('click', cycleLeft);
rightArrow.addEventListener('click', cycleRight);
restartBtn.addEventListener('click', () => location.reload());
spinBtn.addEventListener('click', () => {
    if (tokens < 5) { alert('Not enough tokens!'); return; }
    tokens -= 5; localStorage.setItem('doodleDashTokens', tokens);
    tokenDisplay.textContent = `Tokens: ${tokens}`; reelsDiv.innerHTML = '';
    let result = []; for (let i = 0; i < 3; i++) {
        const roll = Math.random(); let cumulative = 0;
        for (let outcome of slotOutcomes) { cumulative += outcome.chance; if (roll <= cumulative) { result.push(outcome); break; } }
        reelsDiv.innerHTML += `<div>${result[i].id.charAt(0).toUpperCase()}</div>`;
    }
});

tokenDisplay.textContent = `Tokens: ${tokens}`;
updateCharacterDisplay(); displayHighScores();

function increaseDifficulty() {}