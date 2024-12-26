class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.blockSize = 30;
        this.cols = 10;
        this.rows = 20;
        this.score = 0;
        this.level = 1;
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.gameOver = false;
        this.paused = false;
        this.currentPiece = null;
        this.nextPiece = null;
        
        // 方块形状定义
        this.shapes = {
            I: [[1,1,1,1]],
            O: [[1,1],[1,1]],
            T: [[0,1,0],[1,1,1]],
            S: [[0,1,1],[1,1,0]],
            Z: [[1,1,0],[0,1,1]],
            J: [[1,0,0],[1,1,1]],
            L: [[0,0,1],[1,1,1]]
        };
        
        this.colors = {
            I: '#00f0f0',
            O: '#f0f000',
            T: '#a000f0',
            S: '#00f000',
            Z: '#f00000',
            J: '#0000f0',
            L: '#f0a000'
        };
        
        this.bindControls();
        this.initButtons();
        this.dropSpeed = 1000; // 基础下落速度（毫秒）
        this.fastDropSpeed = 50; // 快速下落速度
        this.normalDropSpeed = 1000; // 正常下落速度
        this.currentDropSpeed = this.normalDropSpeed; // 当前下落速度
        this.showGhostPiece = true; // 显示预测线
        this.lastDropTime = 0; // 上次下落时间
        this.deltaTime = 0; // 时间增量
        this.requestId = null; // 用于动画循环
        
        // 添加新的视觉效果配置
        this.effects = {
            glowEnabled: true,
            particlesEnabled: true
        };
        
        // 添加粒子效果数组
        this.particles = [];
        
        // 添加彩带数组
        this.confetti = [];
        
        // 彩带颜色
        this.confettiColors = [
            '#ff0000', '#00ff00', '#0000ff', 
            '#ffff00', '#ff00ff', '#00ffff',
            '#ff4500', '#7fff00', '#ff1493',
            '#ffd700', '#00fa9a', '#9400d3'
        ];
    }

    initButtons() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.paused) return;
            
            switch(e.keyCode) {
                case 37: // 左箭头
                    this.moveLeft();
                    break;
                case 39: // 右箭头
                    this.moveRight();
                    break;
                case 40: // 下箭头
                    this.currentDropSpeed = this.fastDropSpeed;
                    break;
                case 38: // 上箭头
                    this.rotate();
                    break;
                case 32: // 空格
                    this.dropDown();
                    break;
            }
        });

        // 添加按键释放事件
        document.addEventListener('keyup', (e) => {
            if (e.keyCode === 40) { // 下箭头释放
                this.currentDropSpeed = this.normalDropSpeed;
            }
        });
    }

    start() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        this.level = 1;
        this.lastDropTime = 0;
        this.updateScore();
        this.createNewPiece();
        
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        this.requestId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    togglePause() {
        this.paused = !this.paused;
        if (!this.paused) {
            this.lastDropTime = 0;
            this.requestId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    createNewPiece() {
        const shapes = Object.keys(this.shapes);
        if (!this.nextPiece) {
            this.currentPiece = {
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                x: Math.floor(this.cols / 2) - 1,
                y: 0
            };
        } else {
            this.currentPiece = this.nextPiece;
        }
        
        this.nextPiece = {
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            x: Math.floor(this.cols / 2) - 1,
            y: 0
        };
        
        this.drawNextPiece();
        
        if (this.checkCollision()) {
            this.gameOver = true;
        }
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        const shape = this.shapes[this.nextPiece.shape];
        const color = this.colors[this.nextPiece.shape];
        
        const offsetX = (this.nextCanvas.width - shape[0].length * this.blockSize) / 2;
        const offsetY = (this.nextCanvas.height - shape.length * this.blockSize) / 2;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.nextCtx.fillStyle = color;
                    this.nextCtx.fillRect(
                        offsetX + x * this.blockSize,
                        offsetY + y * this.blockSize,
                        this.blockSize - 1,
                        this.blockSize - 1
                    );
                }
            });
        });
    }

    moveLeft() {
        this.currentPiece.x--;
        if (this.checkCollision()) {
            this.currentPiece.x++;
        }
    }

    moveRight() {
        this.currentPiece.x++;
        if (this.checkCollision()) {
            this.currentPiece.x--;
        }
    }

    moveDown() {
        this.currentPiece.y++;
        if (this.checkCollision()) {
            this.currentPiece.y--;
            this.freezePiece();
            this.createNewPiece();
            return false;
        }
        return true;
    }

    rotate() {
        const shape = this.shapes[this.currentPiece.shape];
        const newShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
        const oldShape = this.shapes[this.currentPiece.shape];
        this.shapes[this.currentPiece.shape] = newShape;
        
        if (this.checkCollision()) {
            this.shapes[this.currentPiece.shape] = oldShape;
        }
    }

    dropDown() {
        let dropDistance = 0;
        while (this.moveDown()) {
            dropDistance++;
        }
        // 给予额外分数奖励
        if (dropDistance > 0) {
            this.score += dropDistance * 2;
            this.updateScore();
        }
    }

    checkCollision() {
        const shape = this.shapes[this.currentPiece.shape];
        return shape.some((row, dy) => {
            return row.some((value, dx) => {
                if (!value) return false;
                const newX = this.currentPiece.x + dx;
                const newY = this.currentPiece.y + dy;
                return newX < 0 || newX >= this.cols || 
                       newY >= this.rows ||
                       (newY >= 0 && this.board[newY][newX]);
            });
        });
    }

    freezePiece() {
        const shape = this.shapes[this.currentPiece.shape];
        shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    const newY = this.currentPiece.y + dy;
                    const newX = this.currentPiece.x + dx;
                    if (newY >= 0) {
                        this.board[newY][newX] = this.currentPiece.shape;
                    }
                }
            });
        });
        
        this.clearLines();
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell)) {
                this.addClearLineEffect(y);
                this.addConfettiEffect(); // 添加彩带效果
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                y++;
                
                this.showMessage("陈壮是你爸爸");
            }
        }
        
        if (linesCleared > 0) {
            this.score += linesCleared * 100 * this.level;
            this.level = Math.floor(this.score / 1000) + 1;
            this.updateScore();
        }
    }

    // 添加新方法来显示消息
    showMessage(text) {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            z-index: 1000;
            animation: fadeInOut 3s forwards;
        `;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // 添加消息到页面
        document.body.appendChild(messageDiv);
        
        // 3秒后移除消息
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        this.drawGhostPiece();
        
        // 绘制已固定的方块
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.drawBlockWithGlow(x, y, this.colors[value]);
                }
            });
        });
        
        // 绘制当前方块
        if (this.currentPiece) {
            const shape = this.shapes[this.currentPiece.shape];
            const color = this.colors[this.currentPiece.shape];
            
            shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.drawBlockWithGlow(
                            this.currentPiece.x + x,
                            this.currentPiece.y + y,
                            color
                        );
                    }
                });
            });
        }
        
        // 更新粒子效果
        this.updateParticles();
        
        // 更新彩带效果
        this.updateConfetti();
        
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    gameLoop(timestamp) {
        if (this.gameOver || this.paused) {
            return;
        }

        if (!this.lastDropTime) {
            this.lastDropTime = timestamp;
        }

        this.deltaTime = timestamp - this.lastDropTime;
        
        // 使用当前下落速度
        const adjustedSpeed = this.currentDropSpeed / this.level;

        if (this.deltaTime > adjustedSpeed) {
            this.moveDown();
            this.lastDropTime = timestamp;
        }

        this.draw();
        this.requestId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    endGame() {
        this.gameOver = true;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
        this.draw(); // 绘制游戏结束画面
    }

    // 添加预测线制方法
    drawGhostPiece() {
        if (!this.currentPiece || !this.showGhostPiece) return;

        // 保存当前位置
        const originalY = this.currentPiece.y;
        
        // 找到最终落点
        while (!this.checkCollision()) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        
        // 绘制预测线
        const shape = this.shapes[this.currentPiece.shape];
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    this.ctx.fillRect(
                        (this.currentPiece.x + x) * this.blockSize,
                        (this.currentPiece.y + y) * this.blockSize,
                        this.blockSize - 1,
                        this.blockSize - 1
                    );
                }
            });
        });
        
        // 恢复原始位置
        this.currentPiece.y = originalY;
    }

    // 添加网格背景
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;

        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize, 0);
            this.ctx.lineTo(x * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.blockSize);
            this.ctx.lineTo(this.canvas.width, y * this.blockSize);
            this.ctx.stroke();
        }
    }

    // 添加方块发光效果
    drawBlockWithGlow(x, y, color) {
        if (this.effects.glowEnabled) {
            // 绘制发光效果
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize,
            y * this.blockSize,
            this.blockSize - 1,
            this.blockSize - 1
        );
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    // 添加消除行动画效果
    addClearLineEffect(y) {
        if (this.effects.particlesEnabled) {
            for (let x = 0; x < this.cols; x++) {
                for (let i = 0; i < 3; i++) { // 每个方块产生3个粒子
                    this.particles.push({
                        x: x * this.blockSize + this.blockSize / 2,
                        y: y * this.blockSize + this.blockSize / 2,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 1,
                        color: this.colors[this.board[y][x]]
                    });
                }
            }
        }
    }

    // 更新和绘制粒子效果
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    // 添加彩带效果
    addConfettiEffect() {
        // 增加彩带数量到100个
        for (let i = 0; i < 100; i++) {
            this.confetti.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                size: Math.random() * 15 + 5, // 增加彩带大小范围
                angle: Math.random() * 360,
                velocity: Math.random() * 8 + 3, // 增加速度
                rotationSpeed: (Math.random() - 0.5) * 15, // 增加旋转速度
                color: this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)],
                life: 1,
                // 添加闪烁效果
                sparkle: Math.random() > 0.5,
                sparkleSpeed: Math.random() * 0.1 + 0.05
            });
        }
    }

    // 更新和绘制彩带
    updateConfetti() {
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            
            // 更新位置
            const radians = c.angle * Math.PI / 180;
            c.x += Math.cos(radians) * c.velocity;
            c.y += Math.sin(radians) * c.velocity + 0.5; // 减小重力效果
            c.angle += c.rotationSpeed;
            c.life -= 0.008; // 减慢消失速度
            
            // 闪烁效果
            if (c.sparkle) {
                c.opacity = Math.abs(Math.sin(Date.now() * c.sparkleSpeed));
            } else {
                c.opacity = c.life;
            }
            
            // 如果彩带生命结束，则移除
            if (c.life <= 0) {
                this.confetti.splice(i, 1);
                continue;
            }
            
            // 绘制彩带
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate(c.angle * Math.PI / 180);
            this.ctx.globalAlpha = c.opacity;
            this.ctx.fillStyle = c.color;
            
            // 绘制更有趣的彩带形状
            if (Math.random() > 0.5) {
                // 矩形彩带
                this.ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
            } else {
                // 圆形彩带
                this.ctx.beginPath();
                this.ctx.arc(0, 0, c.size / 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
    }
}

// 创建游戏实例
const game = new Tetris(); 