export class GameEngine {
    constructor({
        canvas,
        joystickBase,
        joystickHandle,
        images = {},
        onScoreChange = () => {},
        onHighScoreChange = () => {},
        onFinalScoreChange = () => {},
        onScreenChange = () => {},
        onPowerUpsChange = () => {},
    }) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.joystickBase = joystickBase;
        this.joystickHandle = joystickHandle;
        this.onScoreChange = onScoreChange;
        this.onHighScoreChange = onHighScoreChange;
        this.onFinalScoreChange = onFinalScoreChange;
        this.onScreenChange = onScreenChange;
        this.onPowerUpsChange = onPowerUpsChange;
        this.images = images;
        this.bgMusic = new Audio('./bgm.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.4;

        this.powerUpSound = new Audio('./powerUp.ogg');
        this.powerUpSound.volume = 0.7;

        this.explosionSound = new Audio('./explosion.ogg');
        this.explosionSound.volume = 1;

        this.bgmEnabled = true;
        this.animationFrameId = null;
        this.timeoutIds = [];
        this.boundResize = () => this.setCanvasSize();
        this.setCanvasSize();
        window.addEventListener('resize', this.boundResize);
        
        this.player = null;
        this.monsters = [];
        this.powerUps = [];
        this.explosions = [];
        
        this.time = 0;
        this.gameRunning = false;
        this.timeSlowMultiplier = 1;
        this.lastTime = 0;
        this.monsterSpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        
        this.keys = { up: false, down: false, left: false, right: false };
        this.joystickActive = false;
        this.joystickAngle = 0;
        this.eventListeners = [];
        
        this.highScore = parseInt(localStorage.getItem('survivalHighScore') || '0');
        this.onHighScoreChange(this.highScore);
        
        this.initControls();
        this.onScreenChange('start');
    }
    
    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initControls() {
        this.addEventListener(document, 'keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': case 'arrowup': this.keys.up = true; break;
                case 's': case 'arrowdown': this.keys.down = true; break;
                case 'a': case 'arrowleft': this.keys.left = true; break;
                case 'd': case 'arrowright': this.keys.right = true; break;
            }
        });
        
        this.addEventListener(document, 'keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': case 'arrowup': this.keys.up = false; break;
                case 's': case 'arrowdown': this.keys.down = false; break;
                case 'a': case 'arrowleft': this.keys.left = false; break;
                case 'd': case 'arrowright': this.keys.right = false; break;
            }
        });
        
        this.initJoystick();
    }
    
    initJoystick() {
        const base = this.joystickBase;
        const handle = this.joystickHandle;
        
        let startX, startY;
        
        const getPosition = (e) => {
            const touch = e.touches ? e.touches[0] : e;
            return { x: touch.clientX, y: touch.clientY };
        };
        
        const handleStart = (e) => {
            e.preventDefault();
            this.joystickActive = true;
            const pos = getPosition(e);
            startX = pos.x;
            startY = pos.y;
        };
        
        const handleMove = (e) => {
            if (!this.joystickActive) return;
            e.preventDefault();
            const pos = getPosition(e);
            const dx = pos.x - startX;
            const dy = pos.y - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 60;
            
            if (distance > maxDistance) {
                const ratio = maxDistance / distance;
                handle.style.left = (60 + dx * ratio) + 'px';
                handle.style.top = (60 + dy * ratio) + 'px';
            } else {
                handle.style.left = (60 + dx) + 'px';
                handle.style.top = (60 + dy) + 'px';
            }
            
            this.joystickAngle = Math.atan2(dy, dx);
        };
        
        const handleEnd = () => {
            this.joystickActive = false;
            handle.style.left = '60px';
            handle.style.top = '60px';
        };
        
        this.addEventListener(base, 'mousedown', handleStart);
        this.addEventListener(base, 'touchstart', handleStart, { passive: false });
        this.addEventListener(document, 'mousemove', handleMove);
        this.addEventListener(document, 'touchmove', handleMove, { passive: false });
        this.addEventListener(document, 'mouseup', handleEnd);
        this.addEventListener(document, 'touchend', handleEnd);
    }
    
    addEventListener(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        this.eventListeners.push({ target, type, listener, options });
    }

    hideScreens() {
        this.onScreenChange('playing');
    }
    
    showGameOverScreen() {
        this.onFinalScoreChange(Math.floor(this.time));
        this.onScreenChange('game-over');
    }

    toggleBgm() {
    this.bgmEnabled = !this.bgmEnabled;

    if (this.bgmEnabled) {
        this.bgMusic.play();
    } else {
        this.bgMusic.pause();
    }

    return this.bgmEnabled;
}
    
    startGame() {
        this.hideScreens();
        this.gameRunning = true;
        this.bgMusic.currentTime = 0;
        if (this.bgmEnabled) { this.bgMusic.play();}
        this.timeStopped = false;
        this.time = 0;
        this.monsters = [];
        this.powerUps = [];
        this.explosions = [];
        this.monsterSpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.canvas);
        
        for (let i = 0; i < 3; i++) {
            const timeoutId = setTimeout(() => this.spawnInitialMonster(), i * 300);
            this.timeoutIds.push(timeoutId);
        }
        
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.gameRunning) return;
        
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        this.time += deltaTime;
        
        this.update(deltaTime);
        this.render();
        
        this.onScoreChange(Math.floor(this.time));
        
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.player.update(deltaTime, this.keys, this.joystickActive, this.joystickAngle);
        
        this.monsterSpawnTimer += deltaTime;

        const spawnInterval = Math.max(1.0, 2.0 - this.time / 60);
        const maxMonsters = 12;

        if (
            this.monsterSpawnTimer >= spawnInterval &&
            this.monsters.length < maxMonsters
        ) {
            this.spawnMonster();
            this.monsterSpawnTimer = 0;
        }

this.powerUpSpawnTimer += deltaTime;

if (this.powerUpSpawnTimer >= 10) {
    this.spawnPowerUp();
    this.powerUpSpawnTimer = 0;
}

this.monsters.forEach(monster => 
    monster.update(
        deltaTime * this.timeSlowMultiplier,
        this.player,
        this.canvas
    )
);
        
        this.monsters = this.monsters.filter(m => !m.destroyed);
        
        this.powerUps.forEach(powerUp => powerUp.update(deltaTime));
        this.powerUps = this.powerUps.filter(p => !p.collected && !p.destroyed);
        
        this.explosions.forEach(exp => exp.update(deltaTime));
        this.explosions = this.explosions.filter(e => !e.destroyed);
        
        this.checkCollisions();
        this.updatePowerUpIndicator();
    }
    
    spawnInitialMonster() {
        const types = ['normal', 'fast', 'tank'];
        const weights = [35, 40, 25];
        const maxWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * maxWeight;
        let type = 'normal';
        
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                type = types[i];
                break;
            }
        }
        
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = Math.random() * this.canvas.width; y = -30; break;
            case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
            case 3: x = -30; y = Math.random() * this.canvas.height; break;
        }
        
        this.monsters.push(new Monster(x, y, type, this.canvas));
    }
    
    spawnMonster() {
        const availableTypes = ['normal', 'fast', 'tank'];
        const availableWeights = [40, 40, 20];
        
        if (this.time >= 10) {
            availableTypes.push('zigzag');
            availableWeights.push(20);
        }
        
        if (this.time >= 20) {
            availableTypes.push('homing');
            availableWeights.push(5);
        }
        
        if (this.time >= 30) {
            availableTypes.push('splitter');
            availableWeights.push(20);
        }
        
        if (this.time >= 40) {
            availableTypes.push('teleporter');
            availableWeights.push(5);
        }
        
        const maxWeight = availableWeights.reduce((a, b) => a + b, 0);
        let random = Math.random() * maxWeight;
        let type = 'normal';
        
        for (let i = 0; i < availableTypes.length; i++) {
            random -= availableWeights[i];
            if (random <= 0) {
                type = availableTypes[i];
                break;
            }
        }
        
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = Math.random() * this.canvas.width; y = -30; break;
            case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
            case 3: x = -30; y = Math.random() * this.canvas.height; break;
        }
        
        this.monsters.push(new Monster(x, y, type, this.canvas));
    }
    
    spawnPowerUp() {
    const powerUps = [
        { type: 'shield', weight: 20 },
        { type: 'speed', weight: 35 },
        { type: 'time', weight: 35 },
        { type: 'explosion', weight: 10 },
    ];

    const totalWeight = powerUps.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedType = 'shield';

    for (const powerUp of powerUps) {
        random -= powerUp.weight;

        if (random <= 0) {
            selectedType = powerUp.type;
            break;
        }
    }

    const x = 50 + Math.random() * (this.canvas.width - 100);
    const y = 50 + Math.random() * (this.canvas.height - 100);

    this.powerUps.push(new PowerUp(x, y, selectedType));
}
    
    checkCollisions() {
        // When shield is active, destroy monsters on contact instead of dying
        if (this.player.hasShield) {
    const shieldRadius = this.player.radius + 10;

    for (const monster of this.monsters) {
        const dx = this.player.x - monster.x;
        const dy = this.player.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // kill monster when touching shield outer ring
        if (distance < shieldRadius + monster.radius) {
            monster.destroyed = true;
        }
    }
}
        else if (!this.player.invincible) {
            for (const monster of this.monsters) {
                if (this.circleCollision(this.player, monster)) {
                    this.gameOver();
                    return;
                }
            }
        }
        
        for (const powerUp of this.powerUps) {
            if (this.circleCollision(this.player, powerUp)) {
                this.collectPowerUp(powerUp);
            }
        }
        
        for (const explosion of this.explosions) {
            if (explosion.active) {
                const monstersToSplit = [];
                
                for (const monster of this.monsters) {
                    const dx = monster.x - explosion.x;
                    const dy = monster.y - explosion.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < explosion.radius) {
                        if (monster.type === 'splitter' && !monster.isSplit) {
                            monstersToSplit.push(monster);
                        }
                        monster.destroyed = true;
                    }
                }
                
                monstersToSplit.forEach(monster => {
                    const splitAngle1 = Math.random() * Math.PI * 2;
                    const splitAngle2 = splitAngle1 + Math.PI;
                    
                    const splitMonster1 = new Monster(
                        monster.x + Math.cos(splitAngle1) * 20,
                        monster.y + Math.sin(splitAngle1) * 20,
                        'fast',
                        this.canvas,
                        true
                    );
                    const splitMonster2 = new Monster(
                        monster.x + Math.cos(splitAngle2) * 20,
                        monster.y + Math.sin(splitAngle2) * 20,
                        'fast',
                        this.canvas,
                        true
                    );
                    
                    splitMonster1.color = '#a8e6cf';
                    splitMonster2.color = '#a8e6cf';
                    
                    this.monsters.push(splitMonster1);
                    this.monsters.push(splitMonster2);
                });
            }
        }
    }
    
    circleCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (a.radius + b.radius) * 0.4;
    }
    
   collectPowerUp(powerUp) {

    powerUp.collected = true;

    switch(powerUp.type) {

        case 'explosion':

            // EXPLOSION SOUND
            if (this.bgmEnabled) {
                this.explosionSound.currentTime = 0;
                this.explosionSound.play();
            }

            this.createExplosion(this.player.x, this.player.y);
            break;

        case 'shield':

            // NORMAL POWERUP SOUND
            if (this.bgmEnabled) {
                this.powerUpSound.currentTime = 0;
                this.powerUpSound.play();
            }

            this.player.activateShield();
            break;

        case 'speed':

            if (this.bgmEnabled) {
                this.powerUpSound.currentTime = 0;
                this.powerUpSound.play();
            }

            this.player.activateSpeed();
            break;

        case 'time':

            if (this.bgmEnabled) {
                this.powerUpSound.currentTime = 0;
                this.powerUpSound.play();
            }

            this.slowTime();
            break;
    }
}
    
    createExplosion(x, y) {
        this.explosions.push(new Explosion(x, y));
    }
    
    slowTime() {
    this.timeSlowMultiplier = 0.3;

    const timeoutId = setTimeout(() => {
        this.timeSlowMultiplier = 1;
    }, 5000);

    this.timeoutIds.push(timeoutId);
}
    
    updatePowerUpIndicator() {
        this.onPowerUpsChange({
            shield: Boolean(this.player?.hasShield),
            speed: Boolean(this.player?.hasSpeed),
            time: this.timeSlowMultiplier < 1,
        });
    }
    
    gameOver() {
        this.gameRunning = false;
        this.bgMusic.pause();
        const currentScore = Math.floor(this.time);
        
        if (currentScore > this.highScore) {
            this.highScore = currentScore;
            localStorage.setItem('survivalHighScore', this.highScore.toString());
            this.onHighScoreChange(this.highScore);
        }
        
        this.showGameOverScreen();
    }
    
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.powerUps.forEach(powerUp => powerUp.render(this.ctx, this.images));
        this.monsters.forEach(monster => monster.render(this.ctx, this.images));
        this.player.render(this.ctx, this.images);

        this.explosions.forEach(exp => exp.render(this.ctx));
    }
    
    drawBackground() {
        
        const bg = this.images?.background;
        if (bg) {
        // draw full screen background
        this.ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
        return;}

        // fallback (keep your original)
        const gradient = this.ctx.createLinearGradient(
        0,
        0,
        this.canvas.width,
        this.canvas.height
        );
        gradient.addColorStop(0, '#16213e');
        gradient.addColorStop(1, '#0f3460');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy() {
        this.gameRunning = false;
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
        this.timeoutIds = [];
        this.eventListeners.forEach(({ target, type, listener, options }) => {
            target.removeEventListener(type, listener, options);
        });
        this.eventListeners = [];
        window.removeEventListener('resize', this.boundResize);
    }
}

class Player {
    constructor(x, y, canvas) {
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.radius = 50;
        this.baseSpeed = 5;
        this.angle = 0;
        
        this.hasShield = false;
        this.hasSpeed = false;
        this.invincible = false;
        
        this.shieldTimer = 0;
        this.speedTimer = 0;
        this.invincibleTimer = 0;
    }
    
    update(deltaTime, keys, joystickActive, joystickAngle) {
        let dx = 0, dy = 0;
        
        if (joystickActive) {
            dx = Math.cos(joystickAngle);
            dy = Math.sin(joystickAngle);
        } else {
            if (keys.up) dy -= 1;
            if (keys.down) dy += 1;
            if (keys.left) dx -= 1;
            if (keys.right) dx += 1;
        }
        
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
            this.angle = Math.atan2(dy, dx);
        }
        
        const currentSpeed = this.hasSpeed ? this.baseSpeed * 2.0 : this.baseSpeed;
       this.x += dx * currentSpeed * deltaTime * 60;
       this.y += dy * currentSpeed * deltaTime * 60;

        this.x = Math.max(this.radius, Math.min(this.canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.canvas.height - this.radius, this.y));
        
        if (this.hasShield) {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
            }
        }
        
        if (this.hasSpeed) {
            this.speedTimer -= deltaTime;
            if (this.speedTimer <= 0) {
                this.hasSpeed = false;
            }
        }
        
        if (this.invincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
    }
    
    activateShield() {
        this.hasShield = true;
        this.shieldTimer = 8;
        this.invincible = true;
        this.invincibleTimer = 8;
    }
    
    activateSpeed() {
        this.hasSpeed = true;
        this.speedTimer = 5;
    }
    
    render(ctx, images) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.hasShield) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
            ctx.fill();
        }
        
        if (this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        const playerImg = images?.player;
        if (playerImg) {
            ctx.drawImage(playerImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(-this.radius * 0.7, this.radius * 0.7);
        ctx.lineTo(0, this.radius * 0.3);
        ctx.lineTo(this.radius * 0.7, this.radius * 0.7);
        ctx.closePath();
        ctx.fill(); 
        }
        ctx.restore();
    }
}

class Monster {
    constructor(x, y, type, canvas, isSplit = false) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.canvas = canvas;
        this.destroyed = false;
        this.isSplit = isSplit;
        
        this.config = {
            normal: { radius: 35, speed: 2.0, color: '#ff6b6b', name: 'normal' },
            fast: { radius: 25, speed: 4.5, color: '#feca57', name: 'fast' },
            tank: { radius: 60, speed: 0.7, color: '#5f27cd', name: 'tank' },
            zigzag: { radius: 35, speed: 2.2, color: '#00d2d3', name: 'zigzag' },
            homing: { radius: 35, speed: 2.0, color: '#ff9ff3', name: 'homing' },
            splitter: { radius: 35, speed: 2.0, color: '#7ed321', name: 'splitter' },
            teleporter: { radius: 35, speed: 2.0, color: '#f15a24', name: 'teleporter' }
        };
        
        const cfg = this.config[type];
        this.radius = cfg.radius;
        this.speed = cfg.speed;
        this.color = cfg.color;
        
        this.angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
        this.zigzagTime = 0;
        this.zigzagOffset = 0;
        this.teleportTimer = 0;
        this.teleportCooldown = isSplit ? 2.5 : 1.5;
    }
    
    update(deltaTime, player, canvas) {
        let dx = 0, dy = 0;
        
        switch(this.type) {
            case 'normal':
            case 'fast':
            case 'tank':
            case 'splitter':
                dx = Math.cos(this.angle);
                dy = Math.sin(this.angle);
                break;
                
            case 'zigzag':
                this.zigzagTime += deltaTime;
                this.zigzagOffset = Math.sin(this.zigzagTime * 8) * 0.5;
                dx = Math.cos(this.angle + this.zigzagOffset);
                dy = Math.sin(this.angle + this.zigzagOffset);
                break;
                
            case 'homing':
                if (!player.hasShield) {
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                }
                dx = Math.cos(this.angle);
                dy = Math.sin(this.angle);
                break;
                
            case 'teleporter':
                this.teleportTimer += deltaTime;
                if (this.teleportTimer >= this.teleportCooldown) {
                    this.teleportTimer = 0;
                    this.teleport(player, canvas);
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                }
                dx = Math.cos(this.angle);
                dy = Math.sin(this.angle);
                break;
        }
        
        this.x += dx * this.speed * deltaTime * 60;
        this.y += dy * this.speed * deltaTime * 60;
        
        if (this.x < -50 || this.x > canvas.width + 50 ||
            this.y < -50 || this.y > canvas.height + 50) {
            this.destroyed = true;
        }
    }
    
    teleport(player, canvas) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        const newX = player.x + Math.cos(angle) * distance;
        const newY = player.y + Math.sin(angle) * distance;
        
        this.x = Math.max(20, Math.min(canvas.width - 20, newX));
        this.y = Math.max(20, Math.min(canvas.height - 20, newY));
    }
    
    render(ctx, images) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.type === 'teleporter' && this.teleportTimer > this.teleportCooldown - 0.3) {
            ctx.globalAlpha = 0.5;
        }
        
         const monsterImageMap = {
            normal: 'normalMonster',
            fast: 'fastMonster',
            tank: 'tankMonster',
            zigzag: 'zigzagMonster',
            homing: 'homingMonster',
            splitter: 'splitterMonster',
            teleporter: 'teleporterMonster',
        };
        
        const imgKey = monsterImageMap[this.type];
        const img = images?.[imgKey];
        
        if (img) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.3, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.type === 'tank') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.type === 'splitter') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (this.type === 'teleporter') {
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const offset = (i - 1) * 6;
                ctx.beginPath();
                ctx.arc(offset, 0, this.radius * 0.2 - Math.abs(offset) * 0.02, 0, Math.PI * 2);
                ctx.stroke();
            }
            }
        }
        
        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 40;
        this.collected = false;
        this.destroyed = false;
        this.pulse = 0;
        
        this.config = {
            explosion: { color: '#ff6b6b', glow: 'rgba(255, 107, 107, 0.5)', symbol: '💥' },
            shield: { color: '#667eea', glow: 'rgba(102, 126, 234, 0.5)', symbol: '🛡️' },
            speed: { color: '#f093fb', glow: 'rgba(240, 147, 251, 0.5)', symbol: '⚡' },
            time: { color: '#4facfe', glow: 'rgba(79, 172, 254, 0.5)', symbol: '⏱️' }
        };
    }
    
    update(deltaTime) {
        this.pulse += deltaTime * 3;
    }
    
    render(ctx, images) {
        const cfg = this.config[this.type];
        const scale = 1 + Math.sin(this.pulse) * 0.1;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        
        const powerUpImageMap = {
            explosion: 'explosionPowerUp',
            shield: 'shieldPowerUp',
            speed: 'speedPowerUp',
            time: 'timeStopPowerUp',
        };
        
        const imgKey = powerUpImageMap[this.type];
        const img = images?.[imgKey];
        
        if (img) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {

        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = cfg.glow;
        ctx.fill();
        
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.symbol, 0, 0);
        }
        ctx.restore();
    }
}

class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.5;
        this.active = true;
        this.destroyed = false;
        this.alpha = 1;
    }
    
    update(deltaTime) {
        this.radius += deltaTime * 500;
        this.alpha = 1 - this.radius / this.maxRadius;
        
        if (this.radius >= this.maxRadius) {
            this.active = false;
            this.destroyed = true;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, `rgba(255, 200, 50, ${this.alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 50, ${this.alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(255, 50, 50, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
