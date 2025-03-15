const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    backgroundColor: '#87ceeb'
};

const game = new Phaser.Game(config);
let currentScene = null;
let gameCanvasElement = null;
let debugText = null;
let player = null;
let bananas = [], coins = [], powerUps = [], healthPickups = [], projectiles = [], particles = [], popUps = [], textParticles = [], score = 0, gameOver = false;
let playerImg, playerCollisionMask = [];
let doublePointsActive = false;
let projectileActive = true;
let homingActive = false;
let slowdownActive = false;
let invincible = false;
let invincibilityTimer = null;
let shieldHealth = 0;
let powerUpTimer = null;
let gameTime = 0;
let lastMissileTime = 0;
let lastShotTime = 0;
let flash = { color: 'rgba(255, 255, 255, 0)', opacity: 0 };
let shake = { duration: 0, intensity: 0, offsetX: 0, offsetY: 0 };
let auraColor = '';
let health = 3;
let currentWave = 1;
let nextWaveTime = 15;
let selectedCharacter = null;
let combo = 0;
let comboMultiplier = 1;
let stars = [];
let clouds = [];
let starOffsetY = 0;
let cloudOffsetY = 0;
let baseStarSpeed = 1;
let baseCloudSpeed = 2;
let highScores = JSON.parse(localStorage.getItem('doodleDashHighScores')) || [];
let tokens = parseInt(localStorage.getItem('doodleDashTokens')) || 0;
let canDash = true;
let dashCooldown = 1;
let dashTimer = 0;
let dashDistance = 75;
let lastDirection = 'right';
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
let nextRunEffect = null;

function preload() {
    console.log('Preload function called');
    // Placeholder for power-up images (to be added later)
    this.load.image('powerup0', 'path/to/powerup0.png');
    this.load.image('powerup1', 'path/to/powerup1.png');
    this.load.image('powerup2', 'path/to/powerup2.png');
    this.load.image('powerup3', 'path/to/powerup3.png');
}

function create() {
    console.log('Create function called');
    currentScene = this;
    gameCanvasElement = document.getElementsByTagName('canvas')[0];
    if (!gameCanvasElement) {
        console.error('Game canvas element not found in DOM');
        return;
    }
    console.log('Canvas element found:', gameCanvasElement);

    debugText = this.add.text(10, 10, 'Debug: Rendering Test', {
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
    });
    debugText.setDepth(1);
    console.log('Debug text created at:', debugText.x, debugText.y);

    this.keys = this.input.keyboard.createCursorKeys();
    this.keys.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keys.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    initBackground();
}

function update(time, delta) {
    console.log('Update function called');
    if (gameOver) return; // Stop updates when game is over

    gameTime += delta / 1000;

    if (!canDash) {
        dashTimer += delta / 1000;
        if (dashTimer >= dashCooldown) {
            canDash = true;
            dashTimer = 0;
        }
    }

    if (player) {
        if (this.keys.left.isDown && player.x > 0) {
            player.x -= 5;
            lastDirection = 'left';
        }
        if (this.keys.right.isDown && player.x < 400 - player.width) {
            player.x += 5;
            lastDirection = 'right';
        }

        if (this.keys.shift.isDown && canDash) {
            if (lastDirection === 'left' && player.x > 0) {
                player.x -= dashDistance;
                if (player.x < 0) player.x = 0;
            } else if (lastDirection === 'right' && player.x < 400 - player.width) {
                player.x += dashDistance;
                if (player.x > 400 - player.width) player.x = 400 - player.width;
            }
            canDash = false;
            dashTimer = 0;
            console.log('Dashed in direction:', lastDirection);
        }

        // Fire projectiles with space bar
        if (this.keys.space.isDown && time - lastShotTime > 500) {
            const projectile = currentScene.add.rectangle(player.x + player.width / 2, player.y, 10, 20, 0xff0000);
            projectile.setOrigin(0.5, 0);
            projectile.setDepth(1);
            projectiles.push({ obj: projectile, x: projectile.x, y: projectile.y, speed: 10 });
            lastShotTime = time;
            console.log('Projectile fired at:', projectile.x, projectile.y);
            // shootSound.play(); // Uncomment when audio is added
        }
    }

    if (debugText) {
        debugText.setText(`Debug: X: ${player ? player.x : 'N/A'}, Y: ${player ? player.y : 'N/A'}`);
    }

    // Move projectiles upward with homing behavior if active
    projectiles.forEach(projectile => {
        projectile.obj.y -= projectile.speed;
        projectile.y = projectile.obj.y;

        if (homingActive && bananas.length > 0) {
            // Find the nearest banana
            let nearestBanana = null;
            let minDistance = Infinity;
            bananas.forEach(banana => {
                const distance = Phaser.Math.Distance.Between(projectile.x, projectile.y, banana.x + banana.width / 2, banana.y + banana.height / 2);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBanana = banana;
                }
            });

            if (nearestBanana) {
                // Move projectile towards the nearest banana's center
                const targetX = nearestBanana.x + nearestBanana.width / 2;
                const targetY = nearestBanana.y + nearestBanana.height / 2;
                const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, targetX, targetY);
                const homingSpeed = 5; // Increased for noticeable effect
                projectile.obj.x += Math.cos(angle) * homingSpeed;
                projectile.x = projectile.obj.x;
            }
        }

        if (projectile.obj.y < 0) {
            projectile.obj.destroy();
            projectiles = projectiles.filter(p => p !== projectile);
        }
    });

    // Move bananas downward with slowdown effect if active
    bananas.forEach(banana => {
        let effectiveSpeed = banana.speed;
        if (slowdownActive) effectiveSpeed *= 0.5; // Reduce speed by half when slowdown is active
        banana.obj.y += effectiveSpeed;
        banana.obj.x += banana.vx;
        banana.x = banana.obj.x;
        banana.y = banana.obj.y;
        if (banana.obj.y > 600 + banana.height) {
            banana.obj.destroy();
            bananas = bananas.filter(b => b !== banana);
        }
        if (player && checkCollision(player, banana)) {
            health -= 1;
            updateUIDisplays();
            if (health <= 0) {
                gameOver = true;
                slotMachineDiv.style.display = 'block';
                restartBtn.style.display = 'block';
            }
            banana.obj.destroy();
            bananas = bananas.filter(b => b !== banana);
        }
    });

    // Check collisions between projectiles and bananas
    projectiles.forEach(projectile => {
        bananas.forEach(banana => {
            const projectileBounds = {
                x: projectile.obj.x - projectile.obj.width / 2,
                y: projectile.obj.y,
                width: projectile.obj.width,
                height: projectile.obj.height
            };
            const bananaBounds = {
                x: banana.obj.x,
                y: banana.obj.y,
                width: banana.obj.width,
                height: banana.obj.height
            };
            if (projectileBounds.x < bananaBounds.x + bananaBounds.width &&
                projectileBounds.x + projectileBounds.width > bananaBounds.x &&
                projectileBounds.y < bananaBounds.y + bananaBounds.height &&
                projectileBounds.y + projectileBounds.height > bananaBounds.y) {
                score += doublePointsActive ? 20 : 10;
                combo += 1;
                comboMultiplier = Math.floor(combo / 5) + 1;
                updateUIDisplays();
                createParticles(banana.x, banana.y);
                projectile.obj.destroy();
                banana.obj.destroy();
                projectiles = projectiles.filter(p => p !== projectile);
                bananas = bananas.filter(b => b !== banana);
            }
        });
    });

    // Move coins downward
    coins.forEach(coin => {
        coin.obj.y += 2;
        coin.x = coin.obj.x;
        coin.y = coin.obj.y;
        if (coin.obj.y > 600 + coin.height) {
            coin.obj.destroy();
            coins = coins.filter(c => c !== coin);
        }
        if (player && checkCollision(player, coin)) {
            score += doublePointsActive ? 20 : 10;
            combo += 1;
            comboMultiplier = Math.floor(combo / 5) + 1;
            updateUIDisplays();
            createParticles(coin.x, coin.y);
            coin.obj.destroy();
            coins = coins.filter(c => c !== coin);
            // coinSound.play(); // Uncomment when audio is added
        }
    });

    // Move power-ups downward
    powerUps.forEach(powerUp => {
        powerUp.obj.y += 1;
        powerUp.x = powerUp.obj.x;
        powerUp.y = powerUp.obj.y;
        if (powerUp.obj.y > 600 + powerUp.height) {
            powerUp.obj.destroy();
            powerUps = powerUps.filter(p => p !== powerUp);
        }
        if (player && checkCollision(player, powerUp)) {
            activatePowerUp(powerUp.type);
            createParticles(powerUp.x, powerUp.y);
            powerUp.obj.destroy();
            powerUps = powerUps.filter(p => p !== powerUp);
            // powerUpSound.play(); // Uncomment when audio is added
        }
    });

    // Move health pickups downward
    healthPickups.forEach(healthPickup => {
        healthPickup.obj.y += 1;
        healthPickup.x = healthPickup.obj.x;
        healthPickup.y = healthPickup.obj.y;
        if (healthPickup.obj.y > 600 + healthPickup.height) {
            healthPickup.obj.destroy();
            healthPickups = healthPickups.filter(h => h !== healthPickup);
        }
        if (player && checkCollision(player, healthPickup)) {
            if (health < 3) {
                health += 1;
                updateUIDisplays();
                createParticles(healthPickup.x, healthPickup.y);
            }
            healthPickup.obj.destroy();
            healthPickups = healthPickups.filter(h => h !== healthPickup);
        }
    });

    // Update particles
    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        if (particle.life <= 0) {
            particles = particles.filter(p => p !== particle);
        }
    });

    // Render particles
    particles.forEach(particle => {
        const particleObj = currentScene.add.circle(particle.x, particle.y, particle.size, Phaser.Display.Color.HexStringToColor('#FFD700').color);
        particleObj.setAlpha(particle.life);
        particleObj.setDepth(2);
        currentScene.time.delayedCall(50, () => particleObj.destroy());
    });

    // Update and render pop-ups
    popUps.forEach(popUp => {
        popUp.y -= 1;
        popUp.life -= 0.02;
        if (popUp.life <= 0) {
            popUps = popUps.filter(p => p !== popUp);
        } else {
            const text = currentScene.add.text(popUp.x - 50, popUp.y, popUp.text, {
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            });
            text.setDepth(2);
            text.setAlpha(popUp.life);
            currentScene.time.delayedCall(50, () => text.destroy());
        }
    });

    // Move stars
    starOffsetY += baseStarSpeed;
    stars.forEach(star => {
        star.obj.y += baseStarSpeed;
        if (star.obj.y > 600) {
            star.obj.y -= 600;
        }
        star.y = star.obj.y;
    });

    // Move clouds
    cloudOffsetY += baseCloudSpeed;
    clouds.forEach(cloud => {
        cloud.obj.y += baseCloudSpeed;
        if (cloud.obj.y > 600) {
            cloud.obj.y -= 600;
        }
        cloud.y = cloud.obj.y;
    });
}

function initPlayer() {
    if (!currentScene) {
        console.error('No scene available to initialize player');
        return;
    }
    if (selectedCharacter === null || selectedCharacter >= characterData.length) {
        console.log('Invalid selectedCharacter, defaulting to red');
        selectedCharacter = 0;
    }
    const charData = characterData[selectedCharacter];
    try {
        player = currentScene.add.rectangle(200, 500, charData.width, charData.height, Phaser.Display.Color.HexStringToColor(charData.color).color);
        player.setOrigin(0.5, 0.5);
        player.setStrokeStyle(2, 0xff0000);
        player.setDepth(1);
        player.color = charData.color;
        player.width = charData.width;
        player.height = charData.height;
        console.log('Player initialized at:', player.x, player.y, 'with color:', charData.color, 'bounds:', player.getBounds());
    } catch (error) {
        console.error('Failed to initialize player:', error);
    }
}

function startGame() {
    if (!currentScene) {
        console.error('No scene available to start game');
        return;
    }

    if (selectedCharacter === null) {
        console.log('No character selected, defaulting to red');
        selectedCharacter = 0;
    }

    gameCanvasElement.style.display = 'block';
    startBtn.style.display = 'none';
    characterSelectDiv.style.display = 'none';
    document.getElementById('highScores').style.display = 'none';
    restartBtn.style.display = 'none';
    controlsHint.style.display = 'block';
    scoreDisplay.style.display = 'block';
    comboDisplay.style.display = 'block';
    healthDisplay.style.display = 'block';
    slotMachineDiv.style.display = 'none';

    initPlayer();
    setupPlayer();
    spawnBanana();
    spawnCoin();
    spawnPowerUp();
    spawnHealthPickup();
    console.log('Game started with character:', characterData[selectedCharacter].color);
    // backgroundMusic.play(); // Uncomment when audio is added
}

function updateCharacterDisplay() {
    const charData = characterData[currentCharacterIndex];
    currentCharacterDiv.style.backgroundColor = charData.color;
    currentCharacterDiv.style.backgroundImage = 'none';
    currentCharacterDiv.classList.add('selected');
    selectedCharacter = currentCharacterIndex;
    startBtn.disabled = false;
    console.log('Character updated to:', charData.color, 'selectedCharacter:', selectedCharacter);
}

function displayHighScores() {
    const highScoresDiv = document.getElementById('highScores');
    if (highScores.length === 0) {
        highScoresDiv.innerHTML = 'High Scores:<br>No scores yet';
    } else {
        highScoresDiv.innerHTML = 'High Scores:<br>';
        highScores.slice(0, 5).forEach((score, index) => {
            const rank = ['1st', '2nd', '3rd', '4th', '5th'][index];
            highScoresDiv.innerHTML += `${rank} ${score}<br>`;
        });
    }
}

function updateUIDisplays() {
    scoreDisplay.textContent = `Score: ${score}`;
    comboDisplay.textContent = `Combo: ${combo}x`;
    healthDisplay.innerHTML = '';
    for (let i = 0; i < health + shieldHealth; i++) {
        const heart = document.createElement('span');
        heart.textContent = '❤️';
        heart.style.color = 'red';
        heart.style.fontSize = '20px';
        heart.style.marginRight = '5px';
        healthDisplay.appendChild(heart);
    }
    scoreDisplay.style.display = 'block';
    comboDisplay.style.display = 'block';
    healthDisplay.style.display = 'block';
}

function cycleLeft() {
    currentCharacterIndex = (currentCharacterIndex - 1 + characterData.length) % characterData.length;
    console.log('Cycling left, new index:', currentCharacterIndex);
    updateCharacterDisplay();
}

function cycleRight() {
    currentCharacterIndex = (currentCharacterIndex + 1) % characterData.length;
    console.log('Cycling right, new index:', currentCharacterIndex);
    updateCharacterDisplay();
}

function initBackground() {
    for (let i = 0; i < 50; i++) {
        const star = currentScene.add.circle(
            Math.random() * 400,
            Math.random() * 600,
            Math.random() * 2 + 1,
            0xffffff
        );
        star.setAlpha(Math.random() * 0.5 + 0.5);
        star.setDepth(0);
        stars.push({
            obj: star,
            x: star.x,
            y: star.y,
            size: star.radius,
            opacity: star.alpha
        });
    }
    for (let i = 0; i < 10; i++) {
        const cloud = currentScene.add.rectangle(
            Math.random() * 400,
            Math.random() * 600,
            Math.random() * 50 + 30,
            Math.random() * 20 + 10,
            0xffffff
        );
        cloud.setAlpha(0.7);
        cloud.setDepth(0);
        clouds.push({
            obj: cloud,
            x: cloud.x,
            y: cloud.y,
            width: cloud.width,
            height: cloud.height
        });
    }
}

function setupPlayer() {
    const charData = characterData[selectedCharacter];
    playerCollisionMask = [{
        x: 0,
        y: 0,
        width: charData.width,
        height: charData.height
    }];
}

function spawnBanana() {
    if (gameOver) return;
    console.log('spawnBanana called');
    const type = Math.random() < 0.3 ? 'splitter' : 'normal';
    const shape = type === 'normal' ? Math.floor(Math.random() * 3) : 0;
    const width = type === 'normal' ? Math.random() * 40 + 20 : 40;
    const height = type === 'normal' ? Math.random() * 50 + 30 : 40;
    const isFast = Math.random() < 0.2;
    const speed = isFast ? 8 : (type === 'splitter' ? 4 : 5);
    const isBouncer = Math.random() < 0.2;
    const vx = isBouncer ? (Math.random() * 4 - 2) : 0;
    const banana = currentScene.add.rectangle(Math.random() * (400 - width), 0, width, height, 0xffff00);
    banana.setDepth(1);
    bananas.push({
        obj: banana,
        x: banana.x,
        y: banana.y,
        width: width,
        height: height,
        shape: shape,
        type: type,
        splitCount: type === 'splitter' ? 1 : 0,
        speed: speed,
        isFast: isFast,
        isBouncer: isBouncer,
        vx: vx
    });
    const baseInterval = 1500 - (currentWave * 200);
    const minInterval = 500;
    const interval = Math.max(baseInterval, minInterval);
    setTimeout(spawnBanana, interval);
}

function spawnCoin() {
    if (gameOver) return;
    console.log('spawnCoin called');
    const coin = currentScene.add.circle(Math.random() * (400 - 20), 0, 10, 0xffd700);
    coin.setDepth(1);
    coins.push({ obj: coin, x: coin.x, y: coin.y, width: 20, height: 20, floatOffset: 0, rotation: 0 });
    const baseInterval = 1000 - (currentWave * 100);
    const minInterval = 500;
    const interval = Math.max(baseInterval, minInterval);
    setTimeout(spawnCoin, interval);
}

function spawnPowerUp() {
    if (gameOver) return;
    console.log('spawnPowerUp called');
    const type = Math.floor(Math.random() * 4);
    const powerUp = currentScene.add.rectangle(Math.random() * (400 - 40), 0, 40, 40, 0x00ff00);
    powerUp.setDepth(1);
    powerUps.push({
        obj: powerUp,
        x: powerUp.x,
        y: powerUp.y,
        width: 40,
        height: 40,
        type: type,
        floatOffset: 0,
        scaleFactor: 1
    });
    const baseInterval = 10000 - (currentWave * 1000);
    const minInterval = 4000;
    const interval = Math.max(baseInterval, minInterval);
    setTimeout(spawnPowerUp, interval);
}

function spawnHealthPickup() {
    if (gameOver) return;
    console.log('spawnHealthPickup called');
    if (healthPickups.length >= 2) return;
    const healthPickup = currentScene.add.rectangle(Math.random() * (400 - 20), 0, 20, 20, 0xff0000);
    healthPickup.setDepth(1);
    healthPickups.push({
        obj: healthPickup,
        x: healthPickup.x,
        y: healthPickup.y,
        width: 20,
        height: 20,
        floatOffset: 0
    });
    const interval = Math.max(5000, 15000 - (currentWave * 1000));
    setTimeout(spawnHealthPickup, interval);
}

function createParticles(x, y, color = 'rgba(255, 215, 0, 1)') {
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: 1.0,
            size: Math.random() * 4 + 2,
            color: color
        });
    }
}

function activatePowerUp(type) {
    flash.opacity = 0.5;
    flash.color = 'rgba(255, 255, 255, 0.5)';
    shake.duration = 0.3;
    shake.intensity = 5;

    if (type === 0) {
        doublePointsActive = true;
        auraColor = 'rgba(0, 255, 0, 0.6)';
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => {
            doublePointsActive = false;
            if (!homingActive && !slowdownActive && shieldHealth === 0) auraColor = '';
            console.log('Double Points ended');
        }, 5000);
        popUps.push({ text: 'Double Points!', x: player.x + player.width / 2, y: player.y, life: 2 });
        console.log('Double Points activated');
    } else if (type === 1) {
        homingActive = true;
        auraColor = 'rgba(0, 0, 255, 0.6)';
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => {
            homingActive = false;
            if (!doublePointsActive && !slowdownActive && shieldHealth === 0) auraColor = '';
            console.log('Homing Missiles ended');
        }, 5000);
        popUps.push({ text: 'Homing Missiles!', x: player.x + player.width / 2, y: player.y, life: 2 });
        console.log('Homing Missiles activated');
    } else if (type === 2) {
        slowdownActive = true;
        auraColor = 'rgba(128, 0, 128, 0.6)';
        if (powerUpTimer) clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => {
            slowdownActive = false;
            if (!doublePointsActive && !homingActive && shieldHealth === 0) auraColor = '';
            console.log('Slowdown ended');
        }, 5000);
        popUps.push({ text: 'Slow Time!', x: player.x + player.width / 2, y: player.y, life: 2 });
        console.log('Slowdown activated');
    } else if (type === 3) {
        shieldHealth = 1;
        auraColor = 'rgba(0, 255, 255, 0.6)';
        if (!doublePointsActive && !homingActive && !slowdownActive) auraColor = 'rgba(0, 255, 255, 0.6)';
        popUps.push({ text: 'Shield Gained!', x: player.x + player.width / 2, y: player.y, life: 2 });
        console.log('Shield gained as extra health');
    }
}

function checkCollision(player, obj) {
    const playerBoxes = playerCollisionMask.map(box => ({
        x: player.x + box.x * (player.width / 50),
        y: player.y + box.y * (player.height / 50),
        width: box.width * (player.width / 50) + 10,
        height: box.height * (player.height / 50) + 10
    }));

    if (obj.shape === undefined && obj.type === undefined) {
        const objBox = {
            x: obj.x - 10,
            y: obj.y + (obj.floatOffset || 0) - 10,
            width: obj.width + 20,
            height: obj.height + 20
        };
        for (let box of playerBoxes) {
            if (box.x < objBox.x + objBox.width &&
                box.x + box.width > objBox.x &&
                box.y < objBox.y + objBox.height &&
                box.y + box.height > objBox.y) {
                return true;
            }
        }
        return false;
    }

    if (obj.shape !== undefined) {
        if (obj.shape === 0) {
            for (let box of playerBoxes) {
                if (box.x < obj.x + obj.width &&
                    box.x + box.width > obj.x &&
                    box.y < obj.y + obj.height &&
                    box.y + box.height > obj.y) {
                    return true;
                }
            }
            return false;
        } else if (obj.shape === 1) {
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y + obj.height / 2;
            const radius = obj.width / 2 + 5;
            for (let box of playerBoxes) {
                const closestX = Math.max(box.x, Math.min(centerX, box.x + box.width));
                const closestY = Math.max(box.y, Math.min(centerY, box.y + box.height));
                const distanceX = centerX - closestX;
                const distanceY = centerY - closestY;
                if ((distanceX * distanceX + distanceY * distanceY) <= (radius * radius)) {
                    return true;
                }
            }
            return false;
        } else if (obj.shape === 2) {
            const v0 = { x: obj.x, y: obj.y + obj.height };
            const v1 = { x: obj.x + obj.width / 2, y: obj.y };
            const v2 = { x: obj.x + obj.width, y: obj.y + obj.height };

            for (let box of playerBoxes) {
                const corners = [
                    { x: box.x, y: box.y },
                    { x: box.x + box.width, y: box.y },
                    { x: box.x, y: box.y + box.height },
                    { x: box.x + box.width, y: box.y + box.height }
                ];
                for (let corner of corners) {
                    if (pointInTriangle(corner, v0, v1, v2)) return true;
                }
                if (box.x < obj.x + obj.width &&
                    box.x + box.width > obj.x &&
                    box.y < obj.y + obj.height &&
                    box.y + box.height > obj.y) {
                    return true;
                }
            }
            return false;
        }
    }

    if (obj.type !== undefined) {
        const objBox = {
            x: obj.x - 10,
            y: obj.y + (obj.floatOffset || 0) - 10,
            width: obj.width + 20,
            height: obj.height + 20
        };
        for (let box of playerBoxes) {
            if (box.x < objBox.x + objBox.width &&
                box.x + box.width > objBox.x &&
                box.y < objBox.y + objBox.height &&
                box.y + box.height > objBox.y) {
                return true;
            }
        }
        return false;
    }
    return false;
}

function pointInTriangle(p, v0, v1, v2) {
    const area = 0.5 * (-v1.y * v2.x + v0.y * (-v1.x + v2.x) + v0.x * (v1.y - v2.y) + v1.x * v2.y);
    const s = 1 / (2 * area) * (v0.y * v2.x - v0.x * v2.y + (v2.y - v0.y) * p.x + (v0.x - v2.x) * p.y);
    const t = 1 / (2 * area) * (v0.x * v1.y - v0.y * v1.x + (v0.y - v1.y) * p.x + (v1.x - v0.x) * p.y);
    return s >= 0 && t >= 0 && (s + t) <= 1;
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
// const backgroundMusic = document.getElementById('backgroundMusic');
// const coinSound = document.getElementById('coinSound');
// const hitSound = document.getElementById('hitSound');
// const shootSound = document.getElementById('shootSound');
// const powerUpSound = document.getElementById('powerUpSound');

startBtn.addEventListener('click', () => {
    if (!currentScene) {
        console.error('Scene not initialized, retrying...');
        setTimeout(() => startGame(), 100);
        return;
    }
    startGame();
});

leftArrow.addEventListener('click', () => {
    console.log('Left arrow clicked');
    cycleLeft();
});

rightArrow.addEventListener('click', () => {
    console.log('Right arrow clicked');
    cycleRight();
});

restartBtn.addEventListener('click', () => {
    location.reload();
});

spinBtn.addEventListener('click', () => {
    if (tokens < 5) {
        alert('Not enough tokens!');
        return;
    }
    tokens -= 5;
    localStorage.setItem('doodleDashTokens', tokens);
    tokenDisplay.textContent = `Tokens: ${tokens}`;
    reelsDiv.innerHTML = '';
    let result = [];
    for (let i = 0; i < 3; i++) {
        const roll = Math.random();
        let cumulative = 0;
        for (let outcome of slotOutcomes) {
            cumulative += outcome.chance;
            if (roll <= cumulative) {
                result.push(outcome);
                break;
            }
        }
        reelsDiv.innerHTML += `<div>${result[i].id.charAt(0).toUpperCase()}</div>`;
    }
    console.log('Slot result:', result.map(r => r.id));
});

tokenDisplay.textContent = `Tokens: ${tokens}`;
updateCharacterDisplay();
displayHighScores();