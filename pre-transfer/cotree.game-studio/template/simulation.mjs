export const width = 20, height = 12;
const targets = [{ x: 6, y: 5 }, { x: 10, y: 7 }, { x: 15, y: 3 }];
export const initialState = () => ({ x: 3, y: 5, paused: false, collected: [], won: false });
export function advance(state, action) {
  if (action === 'restart') return initialState();
  if (action === 'pause') return state.won ? state : { ...state, paused: !state.paused };
  const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[action];
  if (!delta || state.paused || state.won) return state;
  const x = Math.max(0, Math.min(width - 1, state.x + delta[0]));
  const y = Math.max(0, Math.min(height - 1, state.y + delta[1]));
  const collected = targets.flatMap((point, index) => state.collected.includes(index) || (point.x === x && point.y === y) ? [index] : []);
  return { ...state, x, y, collected, won: collected.length === targets.length };
}
export const remaining = state => targets.filter((_, index) => !state.collected.includes(index));
