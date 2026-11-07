import { initialState, advance, remaining, width, height } from './simulation.mjs';
const field = document.querySelector('#playfield'), score = document.querySelector('#score'), status = document.querySelector('#status'), pause = document.querySelector('#pause');
let state = initialState(), graphics;
function paint() {
  if (!graphics) return;
  graphics.clear(); graphics.fillStyle(0x10282e); graphics.fillRect(0, 0, 800, 480);
  graphics.lineStyle(1, 0x203c41);
  for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) graphics.strokeRect(x * 40, y * 40, 40, 40);
  for (const point of remaining(state)) { graphics.fillStyle(0xc9f78c, 0.15); graphics.fillCircle(point.x * 40 + 20, point.y * 40 + 20, 18); graphics.fillStyle(0xc9f78c); graphics.fillCircle(point.x * 40 + 20, point.y * 40 + 20, 7); }
  graphics.fillStyle(state.paused ? 0x7b9596 : 0x6de0da); graphics.fillRoundedRect(state.x * 40 + 7, state.y * 40 + 7, 26, 26, 8);
  graphics.fillStyle(0x10282e); graphics.fillCircle(state.x * 40 + 24, state.y * 40 + 17, 3);
  score.textContent = `${state.collected.length} / 3`;
  status.textContent = state.won ? '全部点亮！可以重新开始。' : state.paused ? '已暂停' : '用方向键、WASD 或下方按钮移动';
  pause.textContent = state.paused ? '继续' : '暂停'; pause.setAttribute('aria-pressed', String(state.paused)); pause.disabled = state.won;
  field.dataset.position = `${state.x},${state.y}`; field.dataset.state = state.won ? 'won' : state.paused ? 'paused' : 'playing';
}
function dispatch(action) { state = advance(state, action); paint(); }
new Phaser.Game({ type: Phaser.AUTO, parent: 'playfield', width: 800, height: 480, backgroundColor: '#10282e', banner: false, audio: { noAudio: true }, scene: { create() { graphics = this.add.graphics(); paint(); } } });
const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
field.addEventListener('keydown', event => { const action = keys[event.key]; if (action) { event.preventDefault(); dispatch(action); } });
field.addEventListener('pointerdown', () => field.focus());
pause.addEventListener('click', () => dispatch('pause')); document.querySelector('#restart').addEventListener('click', () => dispatch('restart'));
for (const button of document.querySelectorAll('[data-move]')) button.addEventListener('click', () => dispatch(button.dataset.move));
