const maze = document.querySelector('#maze').getContext('2d');
for (let row = 0; row < 25; row++) {
  for (let col = 0; col < 25; col++) {
    const wall = row === 0 || col === 0 || row === 24 || col === 24 ||
      (row % 3 === 0 && col !== (row % 2 ? 23 : 1));
    maze.fillStyle = wall ? '#4b5962' : '#eee0b6';
    maze.fillRect(col * 15, row * 15, 15, 15);
  }
}
maze.fillStyle = '#316852';
maze.fillRect(15, 15, 15, 15);
maze.fillStyle = '#a04f25';
maze.fillRect(345, 345, 15, 15);

const layouts = {
  boxes: [['#########','#@.. .. #','#  B    #','# ##.## #','#   B   #','#       #','#########']],
  pits: [
    ['#########','#@      #','# A O   #','#       #','#   A O #','#       #','#########'],
    ['#########','#   @   #','#   A   #','#       #','#   O   #','#       #','#########'],
  ],
  targets: [
    ['#########','#@      #','# A T   #','#       #','#   A T #','#       #','#########'],
    ['#########','#   @   #','#   A   #','#       #','#   T   #','#       #','#########'],
  ],
  boulder: [
    ['##########','#@..*....#','#...#o...#','#*..#....#','#....#...#','#  #  F E#','##########'],
    ['##########','#@.*..# E#','#..o..# .#','#.*......#','#...#..*.#','#    F   #','##########'],
  ],
};
const modeSelect = document.querySelector('#mode');
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const cellSize = 42;
const directions = [[1,0],[0,1],[-1,0],[0,-1]];
const arrows = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3 };
let mode, board, pieces, player, butterfly, heading, level, finished, audio;

function sound(frequency) {
  try {
    audio ??= new AudioContext();
    if (audio.state !== 'running') audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0.08, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.13);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.14);
  } catch {}
}

function start(nextLevel = 0) {
  mode = modeSelect.value;
  level = nextLevel;
  finished = false;
  pieces = [];
  butterfly = null;
  heading = 0;
  board = layouts[mode][level].map((row, y) => [...row].map((char, x) => {
    if (char === '@') player = { x, y };
    if (char === 'F') butterfly = { x, y };
    if ('ABo'.includes(char)) pieces.push({ x, y, char });
    return '@FABo'.includes(char) ? ' ' : char;
  }));
  canvas.width = board[0].length * cellSize;
  canvas.height = board.length * cellSize;
  status.textContent = 'Уровень ' + (level + 1);
  draw();
}

function draw() {
  const colors = { '#':'#455563', '.':'#c6a36e', ' ':'#f6e9c9', 'O':'#49362c', 'T':'#9cbe99', '*':'#c6a36e', 'E':'#a6c8d2' };
  board.forEach((row, y) => row.forEach((char, x) => {
    ctx.fillStyle = colors[char];
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    ctx.strokeStyle = '#877a6550';
    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    if (char === '*') icon('💎', {x,y});
    if (char === 'E') icon('🚪', {x,y});
    if (char === 'T') icon('○', {x,y});
  }));
  pieces.forEach(piece => icon({ A:'🍎', B:'📦', o:'🪨' }[piece.char], piece));
  if (butterfly) icon('🦋', butterfly);
  icon('🧑', player);
}

function icon(text, position) {
  ctx.font = '27px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#304832';
  ctx.fillText(text, (position.x + 0.5) * cellSize, (position.y + 0.55) * cellSize);
}

const pieceAt = (x, y) => pieces.find(piece => piece.x === x && piece.y === y);
const terrain = (x, y) => board[y]?.[x] ?? '#';
const at = (object, x, y) => object?.x === x && object?.y === y;

function advance() {
  if (level + 1 < layouts[mode].length) start(level + 1);
  else {
    finished = true;
    status.textContent = 'Все уровни пройдены';
    draw();
  }
}

function move(direction) {
  if (finished) return;
  const [dx, dy] = directions[direction];
  const x = player.x + dx;
  const y = player.y + dy;
  const floor = terrain(x, y);
  const gemsRemain = () => board.some(row => row.includes('*'));
  if (floor === '#' || floor === 'O' || (floor === 'E' && gemsRemain())) return;
  const piece = pieceAt(x, y);
  if (piece) {
    const nx = x + dx;
    const ny = y + dy;
    const target = terrain(nx, ny);
    if (pieceAt(nx, ny) || at(butterfly, nx, ny)) return;
    if (piece.char === 'o' && dy !== 0) return;
    if (target === 'O' && piece.char === 'A' && mode === 'pits') {
      board[ny][nx] = ' ';
      pieces = pieces.filter(item => item !== piece);
    } else {
      if (![' ', '.', 'T'].includes(target)) return;
      piece.x = nx;
      piece.y = ny;
    }
  }
  player = { x, y };
  if (floor === '.' || floor === '*') board[y][x] = ' ';
  if (mode === 'boulder') {
    sound(floor === '*' ? 700 : floor === '.' ? 260 : 150);
    if (floor === 'E') return advance();
    if (at(butterfly, x, y)) return lose();
  }
  if (mode === 'pits' && pieces.length === 0) return advance();
  if (mode === 'targets' && pieces.every(item => terrain(item.x, item.y) === 'T')) return advance();
  draw();
}

function lose() {
  finished = true;
  sound(80);
  status.textContent = 'Столкновение с бабочкой. Начни уровень заново.';
  draw();
}

setInterval(() => {
  if (mode !== 'boulder' || finished) return;
  const rocks = pieces.filter(piece => piece.char === 'o').sort((a,b) => b.y - a.y);
  for (const rock of rocks) {
    const y = rock.y + 1;
    if (terrain(rock.x, y) === ' ' && !pieceAt(rock.x, y) &&
        !at(player, rock.x, y) && !at(butterfly, rock.x, y)) rock.y = y;
  }
  for (const turn of [1, 0, 3, 2]) {
    const next = (heading + turn) % 4;
    const [dx, dy] = directions[next];
    const x = butterfly.x + dx;
    const y = butterfly.y + dy;
    if (terrain(x, y) !== ' ' || pieceAt(x, y)) continue;
    butterfly = { x, y };
    heading = next;
    if (at(player, x, y)) return lose();
    break;
  }
  draw();
}, 320);

document.addEventListener('keydown', event => {
  if (!Object.hasOwn(arrows, event.key) || event.target.tagName === 'SELECT') return;
  event.preventDefault();
  move(arrows[event.key]);
});
modeSelect.onchange = () => start();
document.querySelector('#reset').onclick = () => start(level);
start();
