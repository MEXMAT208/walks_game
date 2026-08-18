const MAP = {
    'hero': 1,
    'finish': 2,
    'wall': -1,
    'trap': 3
};

function bfs_(start_i, start_j, finish_i, finish_j, field) {
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const n = field.length;
    const m = field[0].length;

    const visited = new Set();
    visited.add(`${start_i},${start_j}`);

    const queue = [[start_i, start_j]];
    const parent = {};

    let found = false;
    while (queue.length > 0) {
        const [i, j] = queue.shift(); // Аналог queue.get()

        if (i === finish_i && j === finish_j) {
            found = true;
            break;
        }

        for (const [di, dj] of directions) {
            const new_i = i + di;
            const new_j = j + dj;

            if (new_i < 0 || new_i >= n || new_j < 0 || new_j >= m) continue;
            if (visited.has(`${new_i},${new_j}`)) continue;

            const cell = field[new_i][new_j];
            if (cell === 0 || cell === 2 || cell === 3) {
                visited.add(`${new_i},${new_j}`);
                queue.push([new_i, new_j]);
                parent[`${new_i},${new_j}`] = [i, j];
            }
        }
    }

    if (!found) return -1;

    const path = [];
    let curr = parent[`${finish_i},${finish_j}`];

    while (curr && (curr[0] !== start_i || curr[1] !== start_j)) {
        path.append ? path.push(curr) : path.push(curr); // Безопасный push
        curr = parent[`${curr[0]},${curr[1]}`];
    }

    return path.reverse();
}

// Замена для matrix2tuple и numpy.flat
function matrix2string(matrix) {
    return matrix.map(row => row.join(',')).join(';');
}

function trap_in_path(path, field) {
    for (const [y, x] of path) {
        if (field[y][x] === 3) return true;
    }
    return false;
}

function finish_in_path(path, field) {
    for (const [y, x] of path) {
        if (field[y][x] === 2) return [y, x];
    }
    return false;
}

function check_win_(field) {
    for (const row of field) {
        for (const val of row) {
            if (val === 1) return false;
        }
    }
    return true;
}

// Глубокое копирование матрицы (Замена copy.deepcopy)
function deepCopyField(field) {
    return field.map(row => [...row]);
}

function solve_level(start_position, max_depth = 10) {
    const n = start_position.length;
    const m = start_position[0].length;

    const visited = new Set();
    visited.add(matrix2string(start_position));

    const queue = [[deepCopyField(start_position), 0]];

    let fastest = null;
    let num = 0;

    while (queue.length > 0) {
        const [curr_field, depth] = queue.shift();

        if (check_win_(curr_field)) {
            if (fastest === null) {
                fastest = depth;
            } else if (depth > fastest) {
                continue;
            }
            num += 1;
            continue;
        } else {
            if (fastest !== null && depth >= fastest) {
                continue;
            }
        }

        if (depth === max_depth) continue;

        for (let start_i = 0; start_i < n; start_i++) {
            for (let start_j = 0; start_j < m; start_j++) {
                if (curr_field[start_i][start_j] === 1) {
                    for (let finish_i = 0; finish_i < n; finish_i++) {
                        for (let finish_j = 0; finish_j < m; finish_j++) {
                            if (curr_field[finish_i][finish_j] === 0 || curr_field[finish_i][finish_j] === 2) {
                                const path = bfs_(start_i, start_j, finish_i, finish_j, curr_field);
                                if (path === -1) continue;
                                if (trap_in_path(path, curr_field)) continue;

                                const new_field = deepCopyField(curr_field);
                                new_field[start_i][start_j] = 0;
                                const finish = finish_in_path(path, curr_field);

                                if (finish) {
                                    continue;
                                } else {
                                    if (curr_field[finish_i][finish_j] === 2) {
                                        new_field[finish_i][finish_j] = 12;
                                    } else {
                                        new_field[finish_i][finish_j] = 1;
                                    }
                                }

                                const stringified = matrix2string(new_field);
                                if (!visited.has(stringified)) {
                                    queue.push([new_field, depth + 1]);
                                    if (!check_win_(new_field)) {
                                        visited.add(stringified);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return [fastest, num];
}

// Вспомогательная функция для выбора случайного элемента массива или числа
function getStructureVal(val) {
    if (Array.isArray(val)) {
        return val[Math.floor(Math.random() * val.length)];
    }
    return val;
}

function create_random_field(structure) {
    const n = getStructureVal(structure.n);
    const m = getStructureVal(structure.m);

    const values = [];
    for (const arg in structure) {
        if (['depth', 'n', 'm'].includes(arg)) continue;

        const num = getStructureVal(structure[arg]);
        for (let k = 0; k < num; k++) {
            values.push(MAP[arg]);
        }

        if (arg === 'hero') {
            for (let k = 0; k < num; k++) {
                values.push(MAP['finish']);
            }
        }
    }

    const curr_len = values.length;
    const total_cells = n * m;
    for (let k = 0; k < (total_cells - curr_len); k++) {
        values.push(0);
    }

    // Случайная перетасовка (Аналог random.shuffle)
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[values[i]] ? values[i] : values[i]]; // Обмен элементами
    }

    // Раскладываем по матрице
    const field = [];
    for (let i = 0; i < n; i++) {
        const row = values.slice(i * m, (i + 1) * m);
        field.push(row);
    }

    return field;
}

function try_generate_level(structure, attempts, var_limit) {
    const depth = structure.depth;
    const visited = new Set();

    for (let i = 0; i < attempts; i++) {
        const field = create_random_field(structure);
        const stringified = matrix2string(field);

        if (visited.has(stringified)) continue;
        visited.add(stringified);

        const [min_moves, n_vars] = solve_level(field, depth);
        if (min_moves !== null && min_moves === depth && n_vars <= var_limit) {
            return [field, min_moves];
        }
    }

    return [null, null];
}

function generate_level() {
    const structures = [
        { n: [4, 5], m: [4, 5, 6], hero: 2, wall: [0, 1, 2], trap: [1, 2, 3], depth: 3 },
        { n: [4, 5], m: [4, 5, 6], hero: 3, wall: [0, 1, 2], trap: [1, 2, 3], depth: 3 },
        { n: [4, 5], m: [4, 5, 6], hero: 3, wall: [0, 1, 2], trap: [1, 2, 3], depth: 4 }
    ];

    for (var i = 1; i < 3; i ++) {
        let variant = Math.floor(Math.random() * structures.length);
        let [field, moves] = try_generate_level(structures[variant], 40, 1);
        if (field !== null) return {field: field, moves: moves};
    }

    const variant = Math.floor(Math.random() * structures.length);
    [field, moves] = try_generate_level(structures[variant], 450, 100);
    if (field !== null) return {field: field, moves: moves};

    const default_fields = [
        [[3, 0, -1, 0, 0], [2, 2, 0, 0, 0], [0, 0, 3, 3, 0], [0, 1, -1, 1, 0]],
        [[0, -1, 0, 0, 0], [0, 0, 0, 1, 0], [2, 2, 3, 0, 1], [0, 3, 0, 0, 0]],
        [[0, 0, 0, 3, 2], [0, 0, 0, 0, 0], [1, 1, 3, 0, 0], [0, 0, 0, 0, 0], [-1, 0, 2, 0, 0]],
        [[-1, 0, 1, 3], [3, 0, 3, 0], [0, 0, 0, 0], [1, 2, 3, 2]],
        [[1, 3, 0, -1, 3], [0, 0, 0, 0, 0], [1, 0, 3, 2, 2], [0, 0, -1, 0, 0]],
        [[0, -1, 3, 0, 0], [0, 0, 1, 3, 0], [3, 1, -1, 0, 0], [0, 0, 0, 0, 0], [2, 3, 0, 2, 0]],
        [[0, 0, 1, 1], [0, 0, 0, 3], [0, 0, 2, 3], [2, 3, 0, 0]]
    ];

    const def_variant = Math.floor(Math.random() * default_fields.length);
    return {field: default_fields[def_variant], moves: 3};
}
