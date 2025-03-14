
        const gameCanvas = document.getElementById('gameCanvas');
        const gameCtx = gameCanvas.getContext('2d');
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');
        const controlsHint = document.getElementById('controlsHint');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const comboDisplay = document.getElementById('comboDisplay');
        const healthDisplay = document.getElementById('healthDisplay');
        const backgroundMusic = document.getElementById('backgroundMusic');
        
        const coinSound = document.getElementById('coinSound');
        const hitSound = document.getElementById('hitSound');
        const shootSound = document.getElementById('shootSound');
        const powerUpSound = document.getElementById('powerUpSound');

        let canDash = true; // Tracks if the player can dash
        let dashCooldown = 2; // Cooldown in seconds
        let dashTimer = 0; // Tracks the cooldown timer
        let dashDistance = 50; // How far the player dashes
        let lastDirection = 'right'; // Tracks the last direction for dashing

        let player, bananas = [], coins = [], powerUps = [], healthPickups = [], projectiles = [], particles = [], popUps = [], textParticles = [], score = 0, gameOver = false;
        let keys = {};
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
        let coinImageLoaded = false;
        let doublePointsImageLoaded = false;
        let projectileImageLoaded = false;
        let slowdownImageLoaded = false;
        let heartImageLoaded = false;
        let shieldImageLoaded = false;
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

        const characterData = [
            { color: 'red', width: 50, height: 50 },
            { color: 'blue', width: 50, height: 50 },
            { color: 'green', width: 50, height: 50 }
        ];

        let backgroundImg = new Image();
        let coinImg = new Image();
        let doublePointsImg = new Image();
        let projectileImg = new Image();
        let slowdownImg = new Image();
        let heartImg = new Image();
        let shieldImg = new Image();

        backgroundImg.src = 'https://cdn.pixabay.com/photo/2017/08/30/12/37/paper-2698393_1280.jpg?w=300';
        coinImg.src = 'coin.png';
        doublePointsImg.src = 'doublepoints.png';
        projectileImg.src = 'projectile.png';
        slowdownImg.src = 'slowdown.png';
        heartImg.src = 'heart.png';
        shieldImg.src = 'shield.png';

        backgroundImg.onload = function() { console.log('Background loaded'); };
        coinImg.onload = function() { coinImageLoaded = true; console.log('Coin image loaded'); };
        coinImg.onerror = function() { coinImageLoaded = false; console.error('Failed to load coin image'); };
        doublePointsImg.onload = function() { doublePointsImageLoaded = true; console.log('Double Points image loaded'); };
        doublePointsImg.onerror = function() { doublePointsImageLoaded = false; console.error('Failed to load Double Points image'); };
        projectileImg.onload = function() { projectileImageLoaded = true; console.log('Projectile image loaded'); };
        projectileImg.onerror = function() { projectileImageLoaded = false; console.error('Failed to load Projectile image'); };
        slowdownImg.onload = function() { slowdownImageLoaded = true; console.log('Slowdown image loaded'); };
        slowdownImg.onerror = function() { slowdownImageLoaded = false; console.error('Failed to load Slowdown image'); };
        heartImg.onload = function() { heartImageLoaded = true; console.log('Heart image loaded'); };
        heartImg.onerror = function() { heartImageLoaded = false; console.error('Failed to load heart image'); };
        shieldImg.onload = function() { shieldImageLoaded = true; console.log('Shield image loaded'); };
        shieldImg.onerror = function() { shieldImageLoaded = false; console.error('Failed to load shield image'); };

        let currentCharacterIndex = 0;
        const characterSelectDiv = document.getElementById('characterSelect');
        const currentCharacterDiv = document.getElementById('currentCharacter');
        const leftArrow = document.getElementById('leftArrow');
        const rightArrow = document.getElementById('rightArrow');
        const slotMachineDiv = document.getElementById('slotMachine');
        const reelsDiv = document.getElementById('reels');
        const spinBtn = document.getElementById('spinBtn');
        const tokenDisplay = document.getElementById('tokenDisplay');

        function updateCharacterDisplay() {
            const charData = characterData[currentCharacterIndex];
            currentCharacterDiv.style.backgroundColor = charData.color;
            currentCharacterDiv.style.backgroundImage = 'none';
            currentCharacterDiv.classList.add('selected');
            selectedCharacter = currentCharacterIndex;
            startBtn.disabled = false;
            console.log('Character updated to:', charData.color); // Debug log
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
                if (heartImageLoaded) {
                    const heart = document.createElement('img');
                    heart.src = heartImg.src;
                    heart.style.width = '20px';
                    heart.style.height = '20px';
                    heart.style.marginRight = '5px';
                    healthDisplay.appendChild(heart);
                } else {
                    const heart = document.createElement('span');
                    heart.textContent = '♥';
                    heart.style.color = 'red';
                    heart.style.fontSize = '20px';
                    heart.style.marginRight = '5px';
                    healthDisplay.appendChild(heart);
                }
            }
            scoreDisplay.style.display = 'block';
            comboDisplay.style.display = 'block';
            healthDisplay.style.display = 'block';
        }

        // UI FIX START - Debug Character Cycling
        function cycleLeft() {
            currentCharacterIndex = (currentCharacterIndex - 1 + characterData.length) % characterData.length;
            console.log('Cycling left, new index:', currentCharacterIndex); // Debug log
            updateCharacterDisplay();
        }

        function cycleRight() {
            currentCharacterIndex = (currentCharacterIndex + 1) % characterData.length;
            console.log('Cycling right, new index:', currentCharacterIndex); // Debug log
            updateCharacterDisplay();
        }

        leftArrow.addEventListener('click', () => {
            console.log('Left arrow clicked'); // Debug log
            cycleLeft();
        });
        rightArrow.addEventListener('click', () => {
            console.log('Right arrow clicked'); // Debug log
            cycleRight();
        });
        // UI FIX END

        startBtn.addEventListener('click', () => {
            if (selectedCharacter === null) return;
            setupPlayer();
            gameCanvas.style.display = 'block';
            startBtn.style.display = 'none';
            characterSelectDiv.style.display = 'none';
            document.getElementById('highScores').style.display = 'none';
            restartBtn.style.display = 'block';
            controlsHint.style.display = 'block';
            scoreDisplay.style.display = 'block';
            comboDisplay.style.display = 'block';
            healthDisplay.style.display = 'block';
            slotMachineDiv.style.display = 'none';
            initBackground();
            startGame();
        });

        function initBackground() {
            for (let i = 0; i < 50; i++) {
                stars.push({
                    x: Math.random() * 400,
                    y: Math.random() * 600,
                    size: Math.random() * 2 + 1,
                    opacity: Math.random() * 0.5 + 0.5
                });
            }
            for (let i = 0; i < 10; i++) {
                clouds.push({
                    x: Math.random() * 400,
                    y: Math.random() * 600,
                    width: Math.random() * 50 + 30,
                    height: Math.random() * 20 + 10
                });
            }
        }

        function drawBackground() {
            const gradient = gameCtx.createLinearGradient(0, 0, 0, 600);
            gradient.addColorStop(0, '#87ceeb');
            gradient.addColorStop(1, '#9370db');
            gameCtx.fillStyle = gradient;
            gameCtx.fillRect(0, 0, 400, 600);

            gameCtx.save();
            gameCtx.translate(0, starOffsetY);
            stars.forEach(star => {
                gameCtx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                gameCtx.beginPath();
                gameCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                gameCtx.fill();
                gameCtx.beginPath();
                gameCtx.arc(star.x, star.y - 600, star.size, 0, Math.PI * 2);
                gameCtx.fill();
            });
            gameCtx.restore();

            gameCtx.save();
            gameCtx.translate(0, cloudOffsetY);
            clouds.forEach(cloud => {
                gameCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                gameCtx.beginPath();
                gameCtx.roundRect(cloud.x, cloud.y, cloud.width, cloud.height, 10);
                gameCtx.fill();
                gameCtx.beginPath();
                gameCtx.roundRect(cloud.x, cloud.y - 600, cloud.width, cloud.height, 10);
                gameCtx.fill();
            });
            gameCtx.restore();
        }

        function updateBackground() {
            let speedFactor = slowdownActive ? 0.5 : 1;
            let waveSpeedIncrease = currentWave * 0.5;

            starOffsetY += (baseStarSpeed + waveSpeedIncrease) * speedFactor;
            cloudOffsetY += (baseCloudSpeed + waveSpeedIncrease) * speedFactor;

            if (starOffsetY >= 600) starOffsetY -= 600;
            if (cloudOffsetY >= 600) cloudOffsetY -= 600;
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

        function startGame() {
            console.log('Starting game with character:', characterData[selectedCharacter].color);
            const charData = characterData[selectedCharacter];
            player = { x: 185, y: 500, width: charData.width, height: charData.height, color: charData.color };
            backgroundMusic.play();
            gameCanvas.addEventListener('click', () => {});
            gameCanvas.addEventListener('touchstart', () => {});
            document.addEventListener('keydown', (e) => { keys[e.key] = true; });
            document.addEventListener('keyup', (e) => { keys[e.key] = false; });
            spawnBanana();
            spawnCoin();
            spawnPowerUp();
            spawnHealthPickup();
            gameLoop();
            console.log('Game loop initiated');
        }

        function movePlayer() {
            // Track the last direction for dashing
            if (keys['ArrowLeft'] && player.x > 0) {
                player.x -= 5;
                lastDirection = 'left';
            }
            if (keys['ArrowRight'] && player.x < 400 - player.width) {
                player.x += 5;
                lastDirection = 'right';
            }
        
            // Dash mechanic
            if (keys['Shift'] && canDash) {
                if (lastDirection === 'left' && player.x > 0) {
                    player.x -= dashDistance;
                    if (player.x < 0) player.x = 0; // Prevent going off-screen
                } else if (lastDirection === 'right' && player.x < 400 - player.width) {
                    player.x += dashDistance;
                    if (player.x > 400 - player.width) player.x = 400 - player.width; // Prevent going off-screen
                }
                canDash = false; // Start cooldown
                dashTimer = 0;
                createParticles(player.x + player.width / 2, player.y + player.height / 2, 'rgba(255, 255, 255, 1)'); // White particles for dash
                console.log('Dashed in direction:', lastDirection); // Debug log
            }
        }

        function spawnBanana() {
            const type = Math.random() < 0.3 ? 'splitter' : 'normal';
            const shape = type === 'normal' ? Math.floor(Math.random() * 3) : 0;
            const width = type === 'normal' ? Math.random() * 40 + 20 : 40;
            const height = type === 'normal' ? Math.random() * 50 + 30 : 40;
            const isFast = Math.random() < 0.2; // 20% chance for fast banana
            const speed = isFast ? 8 : (type === 'splitter' ? 4 : 5); // Fast bananas move at speed 8
            bananas.push({ 
                x: Math.random() * (400 - width), 
                y: 0, 
                width: width, 
                height: height, 
                shape: shape, 
                type: type,
                splitCount: type === 'splitter' ? 1 : 0,
                speed: speed, // New speed property
                isFast: isFast // Track if it's a fast banana for styling
            });
            const baseInterval = 1500 - (currentWave * 200);
            const minInterval = 500;
            const interval = Math.max(baseInterval, minInterval);
            setTimeout(spawnBanana, interval);
        }

        function spawnCoin() {
            coins.push({ x: Math.random() * (400 - 20), y: 0, width: 20, height: 20, floatOffset: 0, rotation: 0 });
            const baseInterval = 1000 - (currentWave * 100);
            const minInterval = 500;
            const interval = Math.max(baseInterval, minInterval);
            setTimeout(spawnCoin, interval);
        }

        function spawnPowerUp() {
            const type = Math.floor(Math.random() * 4);
            powerUps.push({ 
                x: Math.random() * (400 - 40), 
                y: 0, 
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
            if (healthPickups.length >= 2) return;
            healthPickups.push({ 
                x: Math.random() * (400 - 20), 
                y: 0, 
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

        function gameLoop() {
            if (gameOver) {
                backgroundMusic.pause();
                document.getElementById('highScores').style.display = 'block';
                const tokensEarned = Math.floor(score / 100) + currentWave;
                tokens += tokensEarned;
                localStorage.setItem('doodleDashTokens', tokens);
                gameCtx.fillStyle = 'black';
                gameCtx.font = '20px Press Start 2P';
                gameCtx.fillText(`Game Over! Score: ${score}`, 50, 300);
                gameCtx.fillText(`Tokens Earned: ${tokensEarned} | Total: ${tokens}`, 50, 350);
                slotMachineDiv.style.display = 'flex'; // Ensure slot machine is visible after game over
                tokenDisplay.textContent = `Tokens: ${tokens}`;
                return;
            }
            gameTime += 1 / 60;
            // Update dash cooldown
if (!canDash) {
    dashTimer += 1 / 60;
    if (dashTimer >= dashCooldown) {
        canDash = true;
        dashTimer = 0;
    }
}
            let speedFactor = 1 + Math.min(gameTime / 30, 2) + (currentWave * 0.2);
            if (slowdownActive) speedFactor *= 0.5;

            if (gameTime >= nextWaveTime) {
                currentWave++;
                nextWaveTime += 15;
                popUps.push({ text: `Wave ${currentWave}!`, x: 200, y: 300, life: 2 });
                console.log(`Wave ${currentWave} started`);
            }

            if (shake.duration > 0) {
                shake.duration -= 1 / 60;
                shake.offsetX = (Math.random() - 0.5) * shake.intensity;
                shake.offsetY = (Math.random() - 0.5) * shake.intensity;
            } else {
                shake.offsetX = 0;
                shake.offsetY = 0;
            }

            if (flash.opacity > 0) {
                flash.opacity -= 0.05;
                flash.color = `rgba(255, 255, 255, ${flash.opacity})`;
            }

            if (invincible && invincibilityTimer) {
                if (gameTime - invincibilityTimer >= 3) {
                    invincible = false;
                    invincibilityTimer = null;
                    console.log('Invincibility ended');
                }
            }

            gameCtx.clearRect(0, 0, 400, 600);

            updateBackground();
            drawBackground();

            gameCtx.save();
            gameCtx.translate(shake.offsetX, shake.offsetY);

            movePlayer();

            const floatY = Math.sin(gameTime * 2) * 5;
            const tilt = Math.sin(gameTime * 1.5) * 0.1;
            gameCtx.save();
            gameCtx.translate(player.x + player.width / 2, player.y + player.height / 2 + floatY);
            gameCtx.rotate(tilt);

            if (doublePointsActive || homingActive || slowdownActive || shieldHealth > 0) {
                const flicker = 1 + Math.random() * 0.6;
                const numSpikes = 12;
                const baseRadius = 25;
                const spikeLength = 8;

                gameCtx.beginPath();
                for (let i = 0; i < numSpikes; i++) {
                    const angle = (i / numSpikes) * Math.PI * 2;
                    const waveOffset = Math.sin(gameTime * 0.1 + i) * 3;
                    const innerRadius = baseRadius * (0.7 + Math.sin(angle + gameTime) * 0.3) * flicker;
                    const outerRadius = (baseRadius + spikeLength + waveOffset) * flicker;

                    const x1 = Math.cos(angle) * innerRadius;
                    const y1 = Math.sin(angle) * innerRadius;
                    const x2 = Math.cos(angle) * outerRadius;
                    const y2 = Math.sin(angle) * outerRadius;

                    gameCtx.lineTo(x1, y1);
                    gameCtx.lineTo(x2, y2);
                }
                gameCtx.closePath();

                const gradient = gameCtx.createRadialGradient(0, 0, 0, 0, 0, baseRadius + spikeLength);
                gradient.addColorStop(0, `${auraColor}, 0.6)`);
                gradient.addColorStop(1, `${auraColor}, 0.1)`);
                gameCtx.fillStyle = gradient;
                gameCtx.fill();

                gameCtx.strokeStyle = `${auraColor}, 0.8)`;
                gameCtx.lineWidth = 1;
                gameCtx.stroke();
            }

            if (invincible) {
                if (Math.floor(gameTime * 10) % 2 === 0) {
                    gameCtx.globalAlpha = 0.5;
                }
            }
            gameCtx.fillStyle = player.color;
            gameCtx.beginPath();
            gameCtx.arc(0, 0, player.width / 2, 0, Math.PI * 2);
            gameCtx.fill();
            gameCtx.globalAlpha = 1;
            gameCtx.restore();

            bananas.forEach((b, i) => {
                gameCtx.fillStyle = b.isFast ? 'red' : (b.type === 'splitter' ? 'orange' : 'yellow'); // Fast bananas are red
                if (b.shape === 0) {
                    gameCtx.fillRect(b.x, b.y, b.width, b.height);
                } else if (b.shape === 1) {
                    gameCtx.beginPath();
                    gameCtx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
                    gameCtx.fill();
                } else if (b.shape === 2) {
                    gameCtx.beginPath();
                    gameCtx.moveTo(b.x, b.y + b.height);
                    gameCtx.lineTo(b.x + b.width / 2, b.y);
                    gameCtx.lineTo(b.x + b.width, b.y + b.height);
                    gameCtx.closePath();
                    gameCtx.fill();
                }
                b.y += b.speed * speedFactor; // Use the banana's speed property
                if (b.y > 600) bananas.splice(i, 1);
                if (checkCollision(player, b) && !invincible) {
                    if (shieldHealth > 0) {
                        shieldHealth = 0;
                        console.log('Shield absorbed damage');
                    } else if (health > 0) {
                        health--;
                        invincible = true;
                        invincibilityTimer = gameTime;
                        combo = 0;
                        comboMultiplier = 1;
                        console.log(`Health reduced to ${health}, invincibility started, combo reset`);
                    }
                    hitSound.play();
                    flash.opacity = 0.5;
                    shake.duration = 0.3;
                    shake.intensity = 5;
                    if (health <= 0) {
                        gameOver = true;
                    }
                }
            });

            coins.forEach((c, i) => {
                c.floatOffset = Math.sin(gameTime * 2) * 10;
                c.rotation += 0.05;
                if (coinImageLoaded) {
                    const aspectRatio = coinImg.naturalWidth / coinImg.naturalHeight;
                    let drawWidth = 20;
                    let drawHeight = 20 / aspectRatio;
                    if (drawHeight > 20) {
                        drawHeight = 20;
                        drawWidth = 20 * aspectRatio;
                    }
                    const offsetX = (20 - drawWidth) / 2;
                    const offsetY = (20 - drawHeight) / 2;
                    gameCtx.save();
                    gameCtx.translate(c.x + 10, c.y + 10 + c.floatOffset);
                    gameCtx.rotate(c.rotation);
                    gameCtx.drawImage(coinImg, -drawWidth / 2 + offsetX, -drawHeight / 2 + offsetY, drawWidth, drawHeight);
                    gameCtx.restore();
                } else {
                    gameCtx.beginPath();
                    gameCtx.arc(c.x + 10, c.y + 10 + c.floatOffset, 10, 0, Math.PI * 2);
                    gameCtx.fillStyle = 'gold';
                    gameCtx.fill();
                }
                c.y += 3 * speedFactor;
                if (c.y > 600) coins.splice(i, 1);
                if (checkCollision(player, c)) {
                    console.log('Coin collected at:', c.x, c.y);
                    coins.splice(i, 1);
                    combo++;
                    comboMultiplier = Math.min(1 + Math.floor(combo / 5) * 0.5, 5);
                    score += 10 * (doublePointsActive ? 2 : 1) * comboMultiplier;
                    coinSound.play();
                }
            });

            powerUps.forEach((p, i) => {
                p.floatOffset = Math.sin(gameTime * 2 + i) * 10;
                p.scaleFactor = 1 + Math.sin(gameTime * 3) * 0.2;
                if (p.type === 0 && doublePointsImageLoaded) {
                    const aspectRatio = doublePointsImg.naturalWidth / doublePointsImg.naturalHeight;
                    let drawWidth = 40 * p.scaleFactor;
                    let drawHeight = 40 * p.scaleFactor / aspectRatio;
                    if (drawHeight > 40 * p.scaleFactor) {
                        drawHeight = 40 * p.scaleFactor;
                        drawWidth = 40 * p.scaleFactor * aspectRatio;
                    }
                    const offsetX = (40 - drawWidth) / 2;
                    const offsetY = (40 - drawHeight) / 2;
                    gameCtx.save();
                    gameCtx.translate(p.x + 20, p.y + 20 + p.floatOffset);
                    gameCtx.drawImage(doublePointsImg, -drawWidth / 2 + offsetX, -drawHeight / 2 + offsetY, drawWidth, drawHeight);
                    gameCtx.restore();
                } else if (p.type === 1 && projectileImageLoaded) {
                    const aspectRatio = projectileImg.naturalWidth / projectileImg.naturalHeight;
                    let drawWidth = 40 * p.scaleFactor;
                    let drawHeight = 40 * p.scaleFactor / aspectRatio;
                    if (drawHeight > 40 * p.scaleFactor) {
                        drawHeight = 40 * p.scaleFactor;
                        drawWidth = 40 * p.scaleFactor * aspectRatio;
                    }
                    const offsetX = (40 - drawWidth) / 2;
                    const offsetY = (40 - drawHeight) / 2;
                    gameCtx.save();
                    gameCtx.translate(p.x + 20, p.y + 20 + p.floatOffset);
                    gameCtx.drawImage(projectileImg, -drawWidth / 2 + offsetX, -drawHeight / 2 + offsetY, drawWidth, drawHeight);
                    gameCtx.restore();
                } else if (p.type === 2 && slowdownImageLoaded) {
                    const aspectRatio = slowdownImg.naturalWidth / slowdownImg.naturalHeight;
                    let drawWidth = 40 * p.scaleFactor;
                    let drawHeight = 40 * p.scaleFactor / aspectRatio;
                    if (drawHeight > 40 * p.scaleFactor) {
                        drawHeight = 40 * p.scaleFactor;
                        drawWidth = 40 * p.scaleFactor * aspectRatio;
                    }
                    const offsetX = (40 - drawWidth) / 2;
                    const offsetY = (40 - drawHeight) / 2;
                    gameCtx.save();
                    gameCtx.translate(p.x + 20, p.y + 20 + p.floatOffset);
                    gameCtx.drawImage(slowdownImg, -drawWidth / 2 + offsetX, -drawHeight / 2 + offsetY, drawWidth, drawHeight);
                    gameCtx.restore();
                } else if (p.type === 3 && shieldImageLoaded) {
                    const aspectRatio = shieldImg.naturalWidth / shieldImg.naturalHeight;
                    let drawWidth = 40 * p.scaleFactor;
                    let drawHeight = 40 * p.scaleFactor / aspectRatio;
                    if (drawHeight > 40 * p.scaleFactor) {
                        drawHeight = 40 * p.scaleFactor;
                        drawWidth = 40 * p.scaleFactor * aspectRatio;
                    }
                    const offsetX = (40 - drawWidth) / 2;
                    const offsetY = (40 - drawHeight) / 2;
                    gameCtx.save();
                    gameCtx.translate(p.x + 20, p.y + 20 + p.floatOffset);
                    gameCtx.drawImage(shieldImg, -drawWidth / 2 + offsetX, -drawHeight / 2 + offsetY, drawWidth, drawHeight);
                    gameCtx.restore();
                }
                p.y += 3 * speedFactor;
                if (p.y > 600) powerUps.splice(i, 1);
                if (checkCollision(player, p)) {
                    console.log('Power-up collected at:', p.x, p.y, 'Type:', p.type);
                    powerUps.splice(i, 1);
                    activatePowerUp(p.type);
                    powerUpSound.play();
                    let particleColor;
                    switch (p.type) {
                        case 0: particleColor = 'rgba(0, 255, 0, 1)'; break;
                        case 1: particleColor = 'rgba(0, 0, 255, 1)'; break;
                        case 2: particleColor = 'rgba(128, 0, 128, 1)'; break;
                        case 3: particleColor = 'rgba(0, 255, 255, 1)'; break;
                    }
                    createParticles(player.x + player.width / 2, player.y, particleColor);
                }
            });

            healthPickups.forEach((h, i) => {
                h.floatOffset = Math.sin(gameTime * 2 + i) * 10;
                if (heartImageLoaded) {
                    const aspectRatio = heartImg.naturalWidth / heartImg.naturalHeight;
                    let drawWidth = 20;
                    let drawHeight = 20 / aspectRatio;
                    if (drawHeight > 20) {
                        drawHeight = 20;
                        drawWidth = 20 * aspectRatio;
                    }
                    gameCtx.drawImage(heartImg, h.x + 10, h.y + 10 + h.floatOffset, drawWidth, drawHeight);
                } else {
                    gameCtx.fillStyle = 'red';
                    gameCtx.beginPath();
                    gameCtx.moveTo(h.x + 10, h.y + h.floatOffset);
                    gameCtx.lineTo(h.x + 5, h.y + 15 + h.floatOffset);
                    gameCtx.lineTo(h.x, h.y + h.floatOffset);
                    gameCtx.lineTo(h.x + 5, h.y - 5 + h.floatOffset);
                    gameCtx.lineTo(h.x + 15, h.y - 5 + h.floatOffset);
                    gameCtx.lineTo(h.x + 20, h.y + h.floatOffset);
                    gameCtx.lineTo(h.x + 15, h.y + 15 + h.floatOffset);
                    gameCtx.closePath();
                    gameCtx.fill();
                }
                h.y += 3 * speedFactor;
                if (h.y > 600) healthPickups.splice(i, 1);
                if (checkCollision(player, h)) {
                    console.log('Health pickup collected at:', h.x, h.y);
                    healthPickups.splice(i, 1);
                    if (health < 3) health++;
                    console.log(`Health increased to ${health}`);
                    powerUpSound.play();
                    createParticles(player.x + player.width / 2, player.y, 'rgba(255, 0, 0, 1)');
                }
            });

            projectiles.forEach((p, i) => {
                if (homingActive && bananas.length > 0) {
                    const nearestBanana = findNearestBanana(p);
                    if (nearestBanana) {
                        const dx = nearestBanana.x + nearestBanana.width / 2 - p.x;
                        const dy = nearestBanana.y + nearestBanana.height / 2 - p.y;
                        const angle = Math.atan2(dy, dx);
                        const speed = 10 * speedFactor;
                        p.vx = Math.cos(angle) * speed;
                        p.vy = Math.sin(angle) * speed;
                        p.angle = angle;
                    }
                } else {
                    p.vy = -10 * speedFactor;
                    p.angle = -Math.PI / 2;
                }
                p.x += p.vx || 0;
                p.y += p.vy || -10 * speedFactor;

                if (projectileImageLoaded) {
                    gameCtx.save();
                    gameCtx.translate(p.x + p.width / 2, p.y + p.height / 2);
                    gameCtx.rotate(p.angle + Math.PI / 2);
                    const drawWidth = p.width === 10 ? 15 : 10;
                    const drawHeight = p.width === 10 ? 30 : 20;
                    gameCtx.drawImage(projectileImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                    gameCtx.restore();
                } else {
                    gameCtx.fillStyle = 'red';
                    gameCtx.fillRect(p.x, p.y, p.width, p.height);
                }

                if (p.y < 0 || p.x < 0 || p.x > 400) projectiles.splice(i, 1);

                bananas.forEach((b, j) => {
                    if (p.x < b.x + b.width && p.x + p.width > b.x && p.y < b.y + b.height && p.y + p.height > b.y) {
                        if (b.type === 'splitter' && b.splitCount > 0) {
                            bananas.push({
                                x: b.x - 10,
                                y: b.y,
                                width: b.width / 2,
                                height: b.height / 2,
                                shape: 0,
                                type: 'normal',
                                splitCount: 0
                            });
                            bananas.push({
                                x: b.x + 10,
                                y: b.y,
                                width: b.width / 2,
                                height: b.height / 2,
                                shape: 0,
                                type: 'normal',
                                splitCount: 0
                            });
                        }
                        bananas.splice(j, 1);
                        projectiles.splice(i, 1);
                        combo++;
                        comboMultiplier = Math.min(1 + Math.floor(combo / 5) * 0.5, 5);
                        score += 15 * (doublePointsActive ? 2 : 1) * comboMultiplier;
                        createParticles(b.x + b.width / 2, b.y + b.height / 2);
                    }
                });
            });

            particles.forEach((particle, i) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 1 / 60;
                particle.vy += 0.1;

                gameCtx.fillStyle = particle.color.replace('1)', `${particle.life})`);
                gameCtx.beginPath();
                gameCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                gameCtx.fill();

                if (particle.life <= 0) {
                    particles.splice(i, 1);
                }
            });

            textParticles.forEach((particle, i) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 1 / 60;
                particle.vy += 0.05;

                gameCtx.fillStyle = `rgba(255, 215, 0, ${particle.life})`;
                gameCtx.beginPath();
                gameCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                gameCtx.fill();

                if (particle.life <= 0) {
                    textParticles.splice(i, 1);
                }
            });

            popUps.forEach((popUp, i) => {
                popUp.life -= 1 / 60;
                const opacity = popUp.life > 1 ? 1 : Math.max(0, popUp.life);
                const baseScale = 1 + (2 - popUp.life) * 0.1;
                const pulseScale = 1 + Math.sin(gameTime * 10) * 0.05;
                const totalScale = baseScale * pulseScale;
                const rotation = Math.sin(gameTime * 5) * 0.05;

                if (popUp.life > 1.9) {
                    for (let j = 0; j < 5; j++) {
                        textParticles.push({
                            x: popUp.x + (Math.random() - 0.5) * 50,
                            y: popUp.y + (Math.random() - 0.5) * 50,
                            vx: (Math.random() - 0.5) * 2,
                            vy: (Math.random() - 0.5) * 2 - 1,
                            life: 1.0,
                            size: Math.random() * 2 + 1
                        });
                    }
                }

                gameCtx.save();
                gameCtx.translate(popUp.x, popUp.y - 50 * totalScale);
                gameCtx.rotate(rotation);
                gameCtx.scale(totalScale, totalScale);

                const gradient = gameCtx.createLinearGradient(-50, -20, 50, 20);
                gradient.addColorStop(0, '#00ff00');
                gradient.addColorStop(1, '#00cc00');
                gameCtx.fillStyle = gradient;
                gameCtx.font = 'bold 40px Press Start 2P';
                for (let offset = 3; offset > 0; offset--) {
                    gameCtx.fillText(popUp.text, -offset, -offset);
                }
                gameCtx.fillText(popUp.text, 0, 0);
                gameCtx.strokeStyle = '#fff';
                gameCtx.lineWidth = 2;
                gameCtx.strokeText(popUp.text, 0, 0);

                gameCtx.restore();

                if (popUp.life <= 0) {
                    popUps.splice(i, 1);
                }
            });

            gameCtx.restore();

            if (flash.opacity > 0) {
                gameCtx.fillStyle = flash.color;
                gameCtx.fillRect(0, 0, 400, 600);
            }

            updateUIDisplays();

            requestAnimationFrame(gameLoop);
        }

        function findNearestBanana(projectile) {
            let nearest = null;
            let minDistance = Infinity;
            bananas.forEach(banana => {
                const dx = banana.x + banana.width / 2 - projectile.x;
                const dy = banana.y + banana.height / 2 - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = banana;
                }
            });
            return nearest;
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

        let canShoot = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && projectileActive) {
                e.preventDefault();
                const currentTime = gameTime;
                if (homingActive && currentTime - lastMissileTime >= 0.4) {
                    const projectileX = player.x + player.width / 2;
                    const projectileY = player.y;
                    projectiles.push({ x: projectileX, y: projectileY, width: 10, height: 10, vx: 0, vy: 0, angle: -Math.PI / 2 });
                    lastMissileTime = currentTime;
                } else if (canShoot && !homingActive && currentTime - lastShotTime >= 0.5) {
                    const projectileX = player.x + player.width / 2;
                    const projectileY = player.y;
                    projectiles.push({ x: projectileX, y: projectileY, width: 5, height: 5, angle: -Math.PI / 2 });
                    lastShotTime = currentTime;
                    canShoot = false;
                }
            }
            keys[e.key] = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') {
                canShoot = true;
            }
            keys[e.key] = false;
        });

        restartBtn.addEventListener('click', () => {
            location.reload();
        });

        const slotOutcomes = [
            { id: 'coin', chance: 0.3 },
            { id: 'heart', chance: 0.2 },
            { id: 'skull', chance: 0.3 },
            { id: 'star', chance: 0.15 },
            { id: 'char', chance: 0.05 }
        ];
        let nextRunEffect = null;

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