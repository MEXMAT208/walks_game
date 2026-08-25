// canvas-confetti v1.6.0 (Formatted version)
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.confetti = factory();
    }
})(this, function () {
    var isWorker = typeof window === 'undefined';
    var raf = (!isWorker && window.requestAnimationFrame) || function (cb) { setTimeout(cb, 16); };

    var defaults = {
        particleCount: 50,
        angle: 90,
        spread: 45,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1,
        drift: 0,
        ticks: 200,
        x: 0.5,
        y: 0.5,
        shapes: ['square', 'circle'],
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffd21f', '#abcdef'],
        scalar: 1
    };

    function randomRange(min, max) {
        return min + (max - min) * Math.random();
    }

    function getOption(opt, key) {
        return opt[key] !== undefined ? opt[key] : defaults[key];
    }

    function convertColors(colors) {
        return colors.map(function (color) {
            return color;
        });
    }

    function drawSquare(ctx, x, y, width, height, tilt, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.fillStyle = color;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
    }

    function drawCircle(ctx, x, y, width, height, tilt, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }

    function createParticle(options) {
        var angle = options.angle * (Math.PI / 180);
        var spread = options.spread * (Math.PI / 180);

        return {
            x: options.x,
            y: options.y,
            velocity: options.startVelocity * randomRange(0.5, 1),
            angle: angle + randomRange(-spread / 2, spread / 2),
            gravity: options.gravity * 3,
            wobble: Math.random() * 10,
            wobbleSpeed: Math.min(0.11, randomRange(0.05, 0.1) + options.scalar * 0.01),
            tilt: Math.random() * 2 * Math.PI,
            tiltSpeed: randomRange(0.1, 0.2) + options.scalar * 0.02,
            color: options.color,
            shape: options.shape,
            tick: 0,
            totalTicks: options.ticks,
            decay: options.decay,
            drift: options.drift,
            scale: options.scalar
        };
    }

    function updateParticle(ctx, size, particle) {
        particle.x += Math.cos(particle.angle) * particle.velocity + particle.drift;
        particle.y += Math.sin(particle.angle) * particle.velocity + particle.gravity;
        particle.velocity *= particle.decay;
        particle.wobble += particle.wobbleSpeed;
        particle.tilt += particle.tiltSpeed;
        particle.tick++;

        var x = particle.x * size.width;
        var y = particle.y * size.height;
        var width = particle.scale * 10 * Math.abs(Math.cos(particle.wobble));
        var height = particle.scale * 10 * Math.abs(Math.sin(particle.wobble));

        if (particle.shape === 'circle') {
            drawCircle(ctx, x, y, width, height, particle.tilt, particle.color);
        } else {
            drawSquare(ctx, x, y, width, height, particle.tilt, particle.color);
        }

        return particle.tick < particle.totalTicks;
    }

    function mainAnimation(canvas, particles) {
        var ctx = canvas.getContext('2d');

        function update() {
            var width = canvas.width = window.innerWidth;
            var height = canvas.height = window.innerHeight;

            ctx.clearRect(0, 0, width, height);

            particles = particles.filter(function (p) {
                return updateParticle(ctx, { width: width, height: height }, p);
            });

            if (particles.length > 0) {
                raf(update);
            } else {
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
            }
        }

        raf(update);
    }

    function fire(options) {
        var opt = options || {};
        var canvas = document.createElement('canvas');

        canvas.style.position = 'fixed';
        canvas.style.pointerEvents = 'none';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '2000'; // Поверх модального окна

        document.body.appendChild(canvas);

        var particleCount = getOption(opt, 'particleCount');
        var angle = getOption(opt, 'angle');
        var spread = getOption(opt, 'spread');
        var startVelocity = getOption(opt, 'startVelocity');
        var decay = getOption(opt, 'decay');
        var gravity = getOption(opt, 'gravity');
        var drift = getOption(opt, 'drift');
        var ticks = getOption(opt, 'ticks');
        var x = getOption(opt, 'x');
        var y = getOption(opt, 'y');
        var shapes = getOption(opt, 'shapes');
        var colors = getOption(opt, 'colors');
        var scalar = getOption(opt, 'scalar');

        var particles = [];

        for (var i = 0; i < particleCount; i++) {
            var color = colors[Math.floor(Math.random() * colors.length)];
            var shape = shapes[Math.floor(Math.random() * shapes.shapes || shapes.length)];

            particles.push(createParticle({
                angle: angle,
                spread: spread,
                startVelocity: startVelocity,
                decay: decay,
                gravity: gravity,
                drift: drift,
                ticks: ticks,
                x: x,
                y: y,
                shape: shape,
                color: color,
                scalar: scalar
            }));
        }

        mainAnimation(canvas, particles);
    }

    return fire;
});
