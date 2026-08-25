// Простой и надежный скрипт салюта (confetti.js)
(function (global) {
    function fireConfetti(options) {
        var opt = options || {};
        var particleCount = opt.particleCount || 100;
        var spread = opt.spread || 70;
        var startVelocity = opt.startVelocity || 30;

        // Создаем холст
        var canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '99999'; // Поверх всего

        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');

        var colors = opt.colors || ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffd21f', '#abcdef'];
        var particles = [];

        // Точка старта (по умолчанию снизу по центру экрана)
        var startX = window.innerWidth * 0.5;
        var startY = window.innerHeight * 0.75;

        // Если переданы координаты origin (от 0 до 1)
        if (opt.origin) {
            if (opt.origin.x !== undefined) startX = window.innerWidth * opt.origin.x;
            if (opt.origin.y !== undefined) startY = window.innerHeight * opt.origin.y;
        }

        // Создаем частицы
        for (var i = 0; i < particleCount; i++) {
            // Переводим угол разлета в радианы
            var baseAngle = (opt.angle !== undefined ? opt.angle : 90) * Math.PI / 180;
            var spreadAngle = (Math.random() - 0.5) * (spread * Math.PI / 180);
            var finalAngle = baseAngle + spreadAngle;

            var velocity = startVelocity * (0.6 + Math.random() * 0.8);

            particles.push({
                x: startX,
                y: startY,
                vx: Math.cos(finalAngle) * velocity,
                vy: -Math.sin(finalAngle) * velocity, // Минус, так как ось Y идет вниз
                size: randomRange(6, 12),
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
                wobble: Math.random() * 10,
                wobbleSpeed: 0.05 + Math.random() * 0.05,
                shape: Math.random() > 0.5 ? 'square' : 'circle'
            });
        }

        function randomRange(min, max) {
            return min + (max - min) * Math.random();
        }

        // Цикл анимации
        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Обновляем и рисуем каждую частицу
            particles.forEach(function (p) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.4; // Сила гравитации (тянет вниз)
                p.vx *= 0.98; // Сопротивление воздуха
                p.vy *= 0.98;
                p.rotation += p.rotationSpeed;
                p.wobble += p.wobbleSpeed;
                p.opacity -= 0.006; // Плавное исчезновение

                if (p.opacity <= 0) return;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;

                var scaleX = Math.sin(p.wobble);

                if (p.shape === 'square') {
                    ctx.fillRect(-p.size * scaleX / 2, -p.size / 2, p.size * scaleX, p.size);
                } else {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, (p.size / 2) * Math.abs(scaleX), p.size / 2, 0, 0, 2 * Math.PI);
                    ctx.fill();
                }
                ctx.restore();
            });

            // Фильтруем только живые частицы
            particles = particles.filter(function (p) {
                return p.opacity > 0;
            });

            // Если частицы еще есть — продолжаем кадры
            if (particles.length > 0) {
                requestAnimationFrame(update);
            } else {
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
            }
        }

        requestAnimationFrame(update);
    }

    global.confetti = fireConfetti;
})(this);
