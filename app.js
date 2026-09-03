let lockedToastTimer = null;
let completed_levels = [];
let lastAdShowTime = Date.now();

let squares = []
let heroes = []

let field
let n, m
let num_selected
let in_move
let curr_level
let level_data
let currentLang = 'en';

let currentPage = 0;
const levelsPerPage = 15; // Сколько уровней показывать на одной странице (4x3 = 12)
const totalLevels = 50;

const sounds = {};
const last_free_level = 25;

const CELL_EMPTY = 0;
const CELL_HERO = 1;
const CELL_FINISH = 2;
const CELL_WALL = -1;
const CELL_TRAP = 3;


const level2level = {
    6: 5, 7: 5, 8: 5, 9: 5, 10: 5,
    11: 10, 12: 10, 13: 10, 14: 10, 15: 10,
    16: 15, 17: 15, 18: 15, 19: 15, 20: 15,
    21: 15, 22: 15, 23: 15, 24: 15, 25: 15
};

const MILESTONE_MESSAGES = {
    ru: {
        5:  '⭐ Отличная работа! Открыты уровни 6-10!',
        10: '⭐ Потрясающе! Открыты уровни 11-15!',
        15: '⭐ Невероятно! Открыты уровни 16-25!'
    },
    en: {
        5:  '⭐ Great job! Levels 6-10 are open!',
        10: '⭐ Amazing! Levels 11-15 are open!',
        15: '⭐ Unbelievable! Levels 16-25 are open!'
    }
};

const translations = {
    ru: {
        level: "Уровень ",
        completed: "Пройдено: ",
        moves: "Осталось ходов: ",
        win: "🎉 Уровень пройден!",
        win_desc: "Отличная работа!",
        trap: "💀 Вы попали в ловушку!",
        trap_descr: "Попробуйте обойти опасное место",
        lose: "Ходы закончились!",
        lose_descr: "Попробуйте ещё раз",
        to_menu: "🏠 В меню",
        retry: "🔄 Попробовать снова",
        next: "Дальше →",
        random_level: "🎞 Случайный уровень",
        generating: "Генерируем уровень",
        random_level_text: "Случайный уровень",
        again: "Уровень пройден снова!",
        toggle: (n) => `Пройдите уровень <strong>${n}</strong>, чтобы открыть этот`
    },
    en: {
        level: "Level ",
        completed: "Completed: ",
        moves: "Moves left: ",
        win: "🎉 Level completed!",
        win_descr: "Great job!",
        trap: "💀 You're trapped",
        trap_descr: "Try to avoid a dangerous place",
        lose: "The moves are over!",
        lose_descr: "Try again",
        to_menu: "🏠 To menu",
        retry: "🔄 Try again",
        next: "Next →",
        random_level: "🎞 Random level",
        generating: "Generate level",
        random_level_text: "Random level",
        again: "Level is completed again!",
        toggle: (n) => `Complet the level <strong>${n}</strong> to open this`
    }
};

function levelCompleteFireworks() {
    // Залп слева
    confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 } // Левый нижний угол
    });

    // Залп справа
    confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 } // Правый нижний угол
    });
}

function showLockedLevelToast(requiredLevel) {
    const toast = document.getElementById('lockedToast');
    const text = document.getElementById('lockedToastText');

    text.innerHTML = translations[currentLang]['toggle'](requiredLevel);

    if (lockedToastTimer) {
        clearTimeout(lockedToastTimer);
        toast.classList.remove('show');
    }

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    lockedToastTimer = setTimeout(() => {
        toast.classList.remove('show');
        lockedToastTimer = null;
    }, 2500);
}

// Измененная логика состояний под Яндекс
function get_level_state(level_id) {
    if (completed_levels.includes(level_id)) {
        return 'completed';
    }

    if (level_id < 6) {
        return 'available';
    }

    // Уровни выше 25 требуют премиум-статуса (или просмотра рекламы)
    if (level_id > last_free_level) {
        return 'premium';
    }

    if (completed_levels.includes(level2level[level_id])) {
        return 'available';
    } else {
        return 'locked';
    }
}


function playRandomWithAds() {
    document.getElementById('loading-overlay').classList.remove('hidden');

    let prepared_level_data = null;
    let isAdSuccessfullyWatched = false; // Флаг: досмотрено ли видео

    console.log('1. Запуск Rewarded видео VK и параллельной генерации...');

    // ШАГ А: Запускаем генерацию уровня в фоне.
    // Используем setTimeout(..., 0), чтобы тяжелые вычисления не заблокировали
    // отправку запроса VK Bridge на открытие рекламного плеера.
    setTimeout(() => {
        prepared_level_data = generate_level();
        console.log('А. Уровень успешно сгенерирован в фоне и ждет окончания рекламы.');

        // Если реклама ВДРУГ завершилась РАНЬШЕ, чем закончилась генерация
        if (isAdSuccessfullyWatched) {
            console.log('Реклама уже была просмотрена, запускаем игру сразу!');
            startGameWithPreparedData();
        }
    }, 0);

    // ШАГ Б: Вызываем рекламу за вознаграждение в VK
    vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
        .then(data => {
            // Строгая проверка VK: видео досмотрено до конца
            if (data && data.result === true) {
                console.log('Б. Видео успешно досмотрено до конца!');
                isAdSuccessfullyWatched = true;

                // Проверяем: готов ли уже уровень, сгенерированный в фоне?
                if (prepared_level_data) {
                    startGameWithPreparedData();
                } else {
                    console.log('Уровень еще генерируется, игрок подождет на loading-overlay...');
                    // Функция startGameWithPreparedData вызовется сама из ШАГА А, когда он завершится
                }
            } else {
                // Сюда код попадет, если игрок закрыл видео крестиком на 1-й секунде
                console.log('Игрок закрыл видео раньше времени. Сгенерированный уровень сжигается.');
                document.getElementById('loading-overlay').classList.add('hidden');
                prepared_level_data = null; // Очищаем данные, уровень не выдается
            }
        })
        .catch(error => {
            console.error('Ошибка при показе Rewarded рекламы в VK:', error);

            // Проверяем, почему сработал .catch()
            const errorReason = error && error.error_data ? error.error_data.error_reason : '';

            if (errorReason === 'User denied' || errorReason === 'Operation denied by user') {
                // Игрок САМ осознанно закрыл рекламу крестиком. Награду НЕ ДАЕМ!
                console.log('Игрок отменил просмотр. Уровень остается закрытым.');
                document.getElementById('loading-overlay').classList.add('hidden');
                switchToMenuScreen()
            } else {
                if (prepared_level_data) {
                    document.getElementById('loading-overlay').classList.add('hidden');
                    startGameWithPreparedData();
                } else {
                    prepared_level_data = generate_level();
                    startGameWithPreparedData();
                }
            }

        });

    // Вспомогательная функция для чистого запуска, чтобы не дублировать код
    function startGameWithPreparedData() {
        document.getElementById('loading-overlay').classList.add('hidden');
        clear_level();
        switchToGameScreen('random', prepared_level_data);
    }
}


function unlockPremiumLevelWithAds(level_id) {
    vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
        .then(data => {
            if (data && data.result == true) {
                console.log('Видео досмотрено! Открываем премиум уровень...');
                // Игрок досмотрел рекламу до конца — запускаем уровень
                switchToGameScreen(level_id);
            } else {
                console.log('Игрок закрыл видео раньше времени. Уровень остается заблокирован.');
                switchToMenuScreen();
            }
        })
        .catch(error => {
            console.error('Ошибка при показе Rewarded рекламы в VK:', error);

            // Проверяем, почему сработал .catch()
            const errorReason = error && error.error_data ? error.error_data.error_reason : '';

            if (errorReason === 'User denied' || errorReason === 'Operation denied by user') {
                // Игрок САМ осознанно закрыл рекламу крестиком. Награду НЕ ДАЕМ!
                console.log('Игрок отменил просмотр. Уровень остается закрытым.');
                document.getElementById('loading-overlay').classList.add('hidden');
                switchToMenuScreen();
            } else {
                // Сюда мы попадем, только если упал интернет или у ВК нет рекламы (No Fill).
                // Только в этом случае ВК требует пустить игрока бесплатно, чтобы пройти модерацию.
                console.log('Техническая ошибка сети или No Fill. Пускаем бесплатно по правилам ВК.');
                isAdSuccessfullyWatched = true;

                if (prepared_level_data) {
                    startGameWithPreparedData();
                } else {
                    console.log('Ждем фоновую генерацию после ошибки сети...');
                }
            }
        });
}

function renderLevels() {
    const grid = document.getElementById('levels-grid');
    if (!grid) return;
    grid.innerHTML = ''; // Очищаем сетку

    // Высчитываем индексы уровней для текущей страницы
    const startIndex = currentPage * levelsPerPage;
    const endIndex = Math.min(startIndex + levelsPerPage, totalLevels);

    // Допустим, ваши уровни лежат в массиве window.GAME_LEVELS
    const allLevels = window.GAME_LEVELS || [];

    for (let i = startIndex; i < endIndex; i++) {
        const levelNum = i + 1;
        const btn = document.createElement('div');

        const state = get_level_state(levelNum);

        btn.className = `level-btn ${state}`;

        if (state === 'locked') {
            btn.innerHTML = `<div class="lock-icon">🔒</div>`;
        }  else {
            btn.innerHTML = `<div class="level-number">${levelNum}</div>`;
        }

        // Клик по уровню
        btn.addEventListener('click', () => {
            if (state === 'locked') {
                showLockedLevelToast(level2level[levelNum]);
                return;
            }

            if (state === 'premium') {
                // Если уровень платный — предлагаем посмотреть видео
                unlockPremiumLevelWithAds(levelNum);
                return;
            }

            // Доступный или пройденный → запускаем игру
            launchLevel(levelNum);
        });

        grid.appendChild(btn);
    }

    // Обновляем состояние стрелочек и надписи страницы
    updatePaginationControls();
    updateStats(completed_levels.length, totalLevels);
}

function updatePaginationControls() {
    const totalPages = Math.ceil(totalLevels / levelsPerPage);

    // Блокируем левую стрелку на первой странице, правую — на последней
    document.getElementById('prev-page-btn').disabled = (currentPage === 0);
    document.getElementById('next-page-btn').disabled = (currentPage === totalPages - 1);
}

// === Обновление статистики ===
function updateStats(n, m) {
    const statElem = document.getElementById('completed-count');
    if (statElem) {
        statElem.textContent = `${n} / ${m}`;
    }
}

function launchLevel(level_id) {
    switchToGameScreen(level_id)
}

function switchToGameScreen(levelId, pregeneratedData = null) {
    // 1. Прячем экран меню, показываем экран игры
    document.getElementById('screen-menu').style.display = 'none';
    document.getElementById('screen-game').style.display = 'block';

    // 2. Записываем текущие параметры уровня в глобальные переменные
    curr_level = levelId;

    if (levelId === 'random') {
        level_data = pregeneratedData;
    } else {
        level_data = window.GAME_LEVELS.find(l => l.id === parseInt(levelId));
    }

    // 3. Запускаем отрисовку уровня
    clear_level();
    setup_panel_buttons();
    draw_level(level_data);
}


// ======= Уровень =========

function switchToMenuScreen() {
    hide_win_modal()
    hide_trap_modal()
    hide_lose_modal()

    // Прячем игру, показываем меню
    document.getElementById('screen-game').style.display = 'none';
    document.getElementById('screen-menu').style.display = 'block';

    // Перерисовываем сетку уровней (чтобы обновились замочки и открылся следующий)
    renderLevels();
}


// Скрыть спиннер
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('active');
}

function setup_panel_buttons() {
    // Кнопка "Начать заново"
    document.getElementById('btn-restart').onclick = () => {
        replay_level();
    };

    // Кнопка "В меню"
    document.getElementById('btn-to-menu').onclick = () => {
        switchToMenuScreen()
    };

    loadSoundState();
    document.getElementById('btn-sound').addEventListener('click', toggleSound);
}

function draw_level(level_data) {
    if (level_data.id) {
        document.getElementById('level-text').textContent = translations[currentLang]['level']
        document.getElementById('level-number').textContent = level_data.id
    } else {
        document.getElementById('level-text').textContent = translations[currentLang]['random_level_text']
        document.getElementById('level-number').textContent = ''
    }

    const hintPanel = document.getElementById('hint-panel');
    if (level_data.hint_ru) {
        hintPanel.style.display = ''
        const hintText = document.getElementById('hint-text');

        const key = `hint_${currentLang}`
        const text = level_data[key]

        hintText.textContent = text;
    } else {
        hintPanel.style.display = 'none'
    }

    field = structuredClone(level_data.field)

    n = field.length
    m = field[0].length

    const board = document.getElementById('board');
    const containerWidth = board.clientWidth;
    const containerHeight = board.clientHeight;

    const boardWidth = containerWidth - 20;
    const boardHeight = containerHeight - 20;

    cell_size = Math.min(boardWidth / m, boardHeight / n)

    const totalWidth = cell_size * m;
    const totalHeight = cell_size * n;
    indent_x = ((boardWidth - totalWidth) / 2) + 10;
    indent_y = ((boardHeight - totalHeight) / 2) + 10;

    const boardFrame = document.createElement('div');
    boardFrame.className = 'grid-board-frame';
    boardFrame.style.position = 'absolute';
    // Натягиваем рамку ровно на размеры нашей сетки с учетом небольших отступов наружу
    boardFrame.style.left = (indent_x - 8) / containerWidth * 100 + '%';
    boardFrame.style.top = (indent_y - 8) / containerHeight * 100 + '%';
    boardFrame.style.width = (totalWidth + 16) / containerWidth * 100 + '%';
    boardFrame.style.height = (totalHeight + 16) / containerHeight * 100 + '%';
    board.appendChild(boardFrame);

    num_heroes = 0
    for(var i = 0; i < n; i++) {
        squares[i] = [];
        for(var j = 0; j < m; j++) {
            squares[i][j] = document.createElement('div')
            squares[i][j].className = 'square';

            if (field[i][j] == 1) {
                const hero = document.createElement('div');
                hero.className = 'hero-piece';
                hero.style.position = 'absolute';
                hero.style.left = (indent_x + (j + 0.1) * cell_size) / containerWidth * 100 + '%'
                hero.style.top = (indent_y + (i + 0.1) * cell_size) / containerHeight * 100 + '%'
                hero.style.width = cell_size * 0.8 / containerWidth * 100 + '%'
                hero.style.height = cell_size * 0.8 / containerHeight * 100 + '%'
                hero.style.transition = 'left 0.4s ease, top 0.4s ease';
                hero.i = i;
                hero.j = j;
                hero.selected = false;
                hero.finished = false;
                hero.num = num_heroes;

                hero.onmousedown = hero_click;
                board.appendChild(hero);
                heroes.push(hero);

                num_heroes += 1;
            }

            if (field[i][j] == CELL_WALL) {
                squares[i][j].classList.add('wall')
            }

            if (field[i][j] == CELL_EMPTY || field[i][j] == CELL_HERO) {
                squares[i][j].classList.add('empty')
            }

            if (field[i][j] == CELL_FINISH) {
                squares[i][j].classList.add('finish')
            }

            if (field[i][j] == CELL_TRAP) {
                squares[i][j].classList.add('trap')
            }

            // Позиционирование элементов
            squares[i][j].style.position = 'absolute';
            squares[i][j].style.left = (indent_x + j * cell_size + 2) / containerWidth * 100 + '%'
            squares[i][j].style.top = (indent_y + i * cell_size + 2) / containerHeight * 100 + '%';
            squares[i][j].style.width = (cell_size - 4) / containerWidth * 100 + '%';
            squares[i][j].style.height = (cell_size - 4) / containerHeight * 100 + '%';

            squares[i][j].row = i
            squares[i][j].col = j

            squares[i][j].onmousedown = square_click
            board.appendChild(squares[i][j])
        }
    }

    num_selected = -1

    moves_limit = level_data.moves
    moves_left = moves_limit;

    update_moves_display();
}


function preloadSounds() {
    sounds['sound-piece'] = new Audio('./static/sounds/piece.wav');
    sounds['sound-fire'] = new Audio('./static/sounds/fire.wav');
    sounds['sound-win'] = new Audio('./static/sounds/win.wav');
    sounds['sound-sizzle'] = new Audio('./static/sounds/sizzle.wav');

    // Предзагружаем все звуки
    Object.values(sounds).forEach(sound => {
        sound.preload = 'auto';
        sound.volume = 0.5;
    });
}

async function move_hero(path) {
    heroes[num_selected].classList.remove('selected')
    remove_possible_flag()

    prev_x = heroes[num_selected].j
    prev_y = heroes[num_selected].i

    var last_y
    var last_x

    in_move = true
    for (const [y, x] of path) {
        var last_y = y
        var last_x = x

        heroes[num_selected].style.left = (indent_x + (x + 0.1) * cell_size) + 'px';
        heroes[num_selected].style.top = (indent_y + (y + 0.1) * cell_size) + 'px';

        heroes[num_selected].i = y
        heroes[num_selected].j = x

        playSound('sound-piece')
        await sleep(400);

        if (field[y][x] == CELL_TRAP) {
            playSound('sound-sizzle')
            show_trap_modal()
            return
        }

        if (field[y][x] == CELL_FINISH) {
            heroes[num_selected].finished = true
            heroes[num_selected].classList.add('finished')

            if (check_win()) {
                moves_left--;
                update_moves_display()
                playSound('sound-win')
                show_win_modal()
                return
            }

            break
        }

    }

    heroes[num_selected].selected = false
    num_selected = -1

    field[prev_y][prev_x] = CELL_EMPTY
    field[last_y][last_x] = CELL_HERO
    in_move = false

    moves_left--;
    update_moves_display()

    if (moves_left == 0) {
        show_lose_modal()
    }
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('active');
}

function showPhoto(level_id) {
    level_data = window.GAME_LEVELS.find(l => l.id === parseInt(level_id));
    let currentTime = Date.now();

    // 120000 миллисекунд = 2 минуты
    if (currentTime - lastAdShowTime > 120000) {
        lastAdShowTime = currentTime; // Обновляем время таймера

        // Вызываем рекламу VK
        vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
            .then(() => draw_level(level_data))
            .catch(() => draw_level(level_data));
    } else {
        // Прошло мало времени — пускаем игрока сразу без запросов к VK
        console.log("Реклама пропущена по внутреннему таймеру игры");
        draw_level(level_data);
    }
}

async function markLevelAsCompleted(levelId) {
    // 1. Добавляем ID в наш локальный массив (если его там еще нет)
    if (!completed_levels.includes(levelId)) {
        completed_levels.push(levelId);
        console.log(completed_levels);
    }

    // 2. Отправляем обновленный массив в облачную базу Яндекса
    try {
        // 1. Сохраняем в облако VK (массив обязательно переводим в строку)
        await vkBridge.send('VKWebAppStorageSet', {
            key: 'completed_levels_list',
            value: JSON.stringify(completed_levels)
        });
        console.log("Уровень успешно сохранен в облако VK.");
    } catch (e) {
        console.error("Ошибка сохранения прогресса в Яндекс:", e);
    }

}

function clear_level() {
    const frame = document.querySelector('.grid-board-frame');
    if (frame) frame.parentNode.removeChild(frame);

    // 1. ЖЕЛЕЗНАЯ ОЧИСТКА: Находим контейнер игрового поля
    const board = document.getElementById('board');
    if (board) {
        // Удаляем абсолютно все DOM-узлы старых клеток внутри доски одним махом
        board.innerHTML = '';

        // Сбрасываем инлайновые стили (grid-template-columns, ширину, высоту),
        // которые вы могли динамически прописывать для разных размеров сетки
        board.removeAttribute('style');
    }

    // 2. Безопасная очистка массивов героев для игровой логики
    heroes.forEach(hero => {
        if (hero && hero.parentNode) {
            hero.parentNode.removeChild(hero);
        }
    });
    heroes = [];

    // 3. Безопасная очистка массивов клеток
    for (let i = 0; i < squares.length; i++) {
        if (!squares[i]) continue;
        for (let j = 0; j < squares[i].length; j++) {
            if (squares[i][j] && squares[i][j].parentNode) {
                squares[i][j].parentNode.removeChild(squares[i][j]);
            }
        }
    }
    squares = [];

    // 4. Скрытие подсказки ловушки
    const hintText = document.getElementById('hint-text');
    if (hintText) {
        hintText.classList.remove('show');
    }

    // Сбрасываем игровые переменные
    num_heroes = 0;
    num_selected = -1;
    in_move = false;
}

async function replay_level() {
    hide_win_modal();
    hide_lose_modal();
    hide_trap_modal();

    clear_level()
    draw_level(level_data)
}

function hide_premium_modal() {
    const modal = document.getElementById('premium-modal');
    modal.style.display = 'none';
}

function hide_win_modal() {
    const modal = document.getElementById('win-modal');
    modal.style.display = 'none';
}

function hide_lose_modal() {
    const modal = document.getElementById('lose-modal');
    modal.style.display = 'none';
}

function hide_trap_modal() {
    const modal = document.getElementById('trap-modal');
    modal.style.display = 'none';
}

function show_lose_modal() {
    const modal = document.getElementById('lose-modal');
    modal.style.display = 'flex';

    // Привязываем обработчики кнопок
    document.getElementById('btn-lose-retry').onclick = replay_level;
    document.getElementById('btn-lose-menu').onclick = switchToMenuScreen;
}

function show_trap_modal() {
    const modal = document.getElementById('trap-modal');
    modal.style.display = 'flex';

    var modalContent = modal.querySelector('.trap-content')

    modalContent.classList.add('modal-fire');

    // Привязываем обработчики кнопок
    document.getElementById('btn-trap-retry').onclick = replay_level;
    document.getElementById('btn-trap-menu').onclick = switchToMenuScreen;
}

async function show_win_modal() {
    const modal = document.getElementById('win-modal');
    const messageEl = document.getElementById('win-message');

    levelCompleteFireworks()

    let first_time;

    if (curr_level == 'random') {
        first_time = true
    } else {
        first_time = !completed_levels.includes(parseInt(curr_level));
        await markLevelAsCompleted(curr_level)
        updateVKLeaderboard(completed_levels.length)
    }

    if (first_time) {
        // Проверяем, есть ли особое сообщение для этого уровня
        if (MILESTONE_MESSAGES['en'][curr_level]) {
            messageEl.textContent = MILESTONE_MESSAGES[currentLang][curr_level];
            messageEl.classList.add('milestone-message');  // Для особого стиля
        } else {
            messageEl.textContent = translations[currentLang]['win_descr']
            messageEl.classList.remove('milestone-message');
        }
    } else {
        // Повторное прохождение — обычный текст
        messageEl.textContent = translations[currentLang]['again']
        messageEl.classList.remove('milestone-message');
    }

    document.getElementById('btn-win-replay').onclick = replay_level;
    document.getElementById('btn-win-menu').onclick = switchToMenuScreen;

    const btn = document.getElementById('btn-win-next')

    if (curr_level == 50) {
        btn.style.display = 'none'
    } else {
        btn.onclick = next_level;
    }

    modal.style.display = 'flex';
}

function next_level() {
    hide_win_modal();
    clear_level();

    if (curr_level == 'random') {
        playRandomWithAds()
    } else {
        curr_level += 1
        if (curr_level <= last_free_level) {
            showPhoto(curr_level)
        } else {
            unlockPremiumLevelWithAds(curr_level)
        }
    }
}

async function square_click(event) {
    if (in_move) {
        return false;
    }

    obj = event.target

    if (obj.classList.contains('trap')) {
        return false
    }

    if (obj.classList.contains('hero')) {
        return false
    }

    if (num_selected == -1) {
        return false
    }

    const path = bfs(obj.row, obj.col);

    if (path == -1) {
        return false;
    }

    move_hero(path)
}

function check_win() {
    for (var k = 0; k < num_heroes; k++) {
        if (!heroes[k].finished) {
            return false
        }
    }

    return true
}

function bfs(finish_i, finish_j) {
    const hero_i = heroes[num_selected].i
    const hero_j = heroes[num_selected].j
    const queue = [[hero_i, hero_j]]
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];

    const visited = new Set();
    visited.add(`${hero_i},${hero_j}`);

    const parent = new Map();
    parent.set(`${hero_i},${hero_j}`, null);

    var found = false;
    while (queue.length > 0) {
        const [i, j] = queue.shift();

        if (i == finish_i && j == finish_j) {
            found = true;
            break;
        }

        for (const [di, dj] of directions) {
            const new_i = i + di;
            const new_j = j + dj;

            // Проверка границ
            if (new_i < 0 || new_i >= n || new_j < 0 || new_j >= m) continue;

            const key = `${new_i},${new_j}`;

            // Если не посещали и клетка подходит
            cell_type = field[new_i][new_j]
            if (!visited.has(key) && (cell_type == CELL_EMPTY ||
                cell_type == CELL_TRAP || cell_type == CELL_FINISH)) {
                visited.add(key);
                queue.push([new_i, new_j]);

                parent.set(key, `${i},${j}`);
            }
        }
    }

    if (!found) {
        return -1;
    }

    const path = [];
    let curr = `${finish_i},${finish_j}`
    while (curr != [hero_i, hero_j]) {
        path.push(curr.split(',').map(Number));
        curr = parent.get(curr); // идём назад к началу
    }

    return path.reverse()
}

function hero_click(event) {
    if (in_move) {
        return false;
    }

    obj = event.target

    if (obj.finished) {
        return false
    }

    if (obj.selected) {
        obj.selected = false
        heroes[num_selected].classList.remove('selected')
        num_selected = -1
    } else {
        if (num_selected != -1) {
            heroes[num_selected].selected = false
            heroes[num_selected].classList.remove('selected')
        }
        obj.selected = true
        obj.classList.add('selected')
        num_selected = obj.num
    }

    if (num_selected != -1) {
        add_possible_flag()
    } else {
        remove_possible_flag()
    }

    return false
}

function add_possible_flag() {
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < m; j++) {
            if (field[i][j] == CELL_EMPTY) {
                squares[i][j].classList.add('possible')
            }
        }
    }
}

function remove_possible_flag() {
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < m; j++) {
            squares[i][j].classList.remove('possible')
        }
    }
}

function update_moves_display() {
    const moves_info = document.getElementById('moves-info');
    const moves_count = document.getElementById('moves-count');
    moves_count.textContent = moves_left

    //  Меняем цвет в зависимости от количества
    if (moves_left <= 0) {
        moves_info.style.color = '#e74c3c';  // красный — критично
        moves_info.style.fontWeight = 'bold';
    } else if (moves_left <= 3) {
        moves_info.style.color = '#f39c12';  // оранжевый — мало
        moves_info.style.fontWeight = 'bold';
    } else {
        moves_info.style.color = '#fff';     // белый — нормально
        moves_info.style.fontWeight = 'normal';
    }
}

function loadSoundState() {
    const savedState = localStorage.getItem('soundEnabled');
    isSoundEnabled = savedState !== 'false'; // По умолчанию true, если не сохранено
    updateSoundButton();
}

// Сохранение состояния
function saveSoundState() {
    localStorage.setItem('soundEnabled', isSoundEnabled);
}

// Обновление кнопки
function updateSoundButton() {
    const btn = document.getElementById('btn-sound');
    if (isSoundEnabled) {
        btn.textContent = '🔊';
        btn.classList.remove('muted');
        btn.title = 'Выключить звук';
    } else {
        btn.textContent = '🔇';
        btn.classList.add('muted');
        btn.title = 'Включить звук';
    }
}

function playSound(soundId) {
    if (!isSoundEnabled) return; // Если звук выключен — не играем

    const sound = sounds[soundId]
    if (!sound) {
        return
    }

    sound.currentTime = 0;
    sound.play().catch(e => console.log('Sound blocked:', e));
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    updateSoundButton();
    saveSoundState();
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initLocalization(lang) {
    const selectedLang = translations[lang] ? lang : 'en';

    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[selectedLang][key]) {
            element.textContent = translations[selectedLang][key];
        }
    });
}

function updateVKLeaderboard(score) {
    // Используем фоновое сохранение в VK Storage.
    // Ключ 'level' или 'score' распознается игровой платформой VK автоматически
    vkBridge.send("VKWebAppStorageSet", {
        "key": "level",
        "value": String(score) // VK принимает только строковые значения
    })
    .then(data => {
        if (data.result) {
            console.log("Рекорд успешно обновлен в VK в фоновом режиме.");
        }
    })
    .catch(error => {
        console.error("Ошибка фонового обновления лидерборда в VK:", error);
    });
}

function showVKLeaderboardWindow() {
    // Вызываем окно лиги друзей ТОЛЬКО при нажатии на кнопку кубка в меню
    vkBridge.send("VKWebAppShowLeaderBoardBox", {
        "user_result": 0 // Передаем 0, чтобы просто открыть окно без перезаписи очков
    })
    .then(data => {
        console.log("Игрок закрыл окно лидерборда.");
    })
    .catch(error => {
        console.error("Не удалось открыть окно лидерборда:", error);
    });
}

async function Start() {
    try {
        // 1. Определение языка из URL-параметров VK (возвращает 'ru', 'en' и т.д.)
        const urlParams = new URLSearchParams(window.location.search);
        const vkLang = urlParams.get('vk_language');

        if (vkLang) {
            currentLang = vkLang;
            console.log("Язык платформы VK определен автоматически:", currentLang);
        } else {
            console.log("Параметр vk_language не найден, используем язык по умолчанию:", currentLang);
        }

        initLocalization(currentLang);

        // 2. Получение данных из облачного хранилища VK Storage
        try {
            const storageData = await vkBridge.send('VKWebAppStorageGet', {
                keys: ['completed_levels_list']
            });

            // Проверяем, вернулись ли ключи и есть ли значение для нашего ключа
            if (storageData && storageData.keys && storageData.keys[0] && storageData.keys[0].value) {
                const rawValue = storageData.keys[0].value;
                const parsedData = JSON.parse(rawValue);

                if (Array.isArray(parsedData)) {
                    completed_levels = parsedData;
                    console.log("Успешно загружен прогресс из VK Cloud Storage:", completed_levels);
                }
            } else {
                console.log("В VK Cloud Storage нет сохраненного прогресса, пробуем localStorage");
                // Если в облаке пусто, пытаемся взять из localStorage (для старых игроков)
                const localData = localStorage.getItem('completed_levels_list');
                if (localData) {
                    completed_levels = JSON.parse(localData);
                    console.log("Загружен локальный прогресс из localStorage:", completed_levels);
                }
            }
        } catch (vkStorageError) {
            console.error("Ошибка при работе с VK Storage, переходим на localStorage:", vkStorageError);
            const localData = localStorage.getItem('completed_levels_list');
            if (localData) {
                completed_levels = JSON.parse(localData);
            }
        }

    } catch (e) {
        console.error("Критическая ошибка при инициализации игры:", e);
        initLocalization(currentLang);
        completed_levels = []; // Фолбэк на пустой массив
    }

    preloadSounds();
    renderLevels();

    // Сигнал об успешной загрузке в VK отправляется автоматически через VKWebAppInit в index.html
    console.log("Игра готова к запуску на платформе VK");
}


// === Запуск ===
document.addEventListener('DOMContentLoaded', async () => {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => {
            if (currentPage > 0) {
                currentPage--;
                renderLevels();
            }
        };
        nextBtn.onclick = () => {
            const totalPages = Math.ceil(totalLevels / levelsPerPage);
            if (currentPage < totalPages - 1) {
                currentPage++;
                renderLevels();
            }
        };
    }

    cup = document.getElementById('cup');
    cup.onclick = () => {
        showVKLeaderboardWindow();
    }

    rnd_button = document.getElementById('random-btn');
    rnd_button.onclick = () => {
        playRandomWithAds();
    }

    await Start();
});

window.addEventListener('contextmenu', event => event.preventDefault());
