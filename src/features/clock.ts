import { $ } from '../core/utils';

export function updateClock(): void {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const timeEl = $('#current-time');
  const greetEl = $('#welcome-message');
  if (timeEl) timeEl.textContent = hh + ':' + mm + ':' + ss;

  const h = now.getHours();
  let greet = '晚上好';
  if (h >= 5 && h < 12) greet = '早上好';
  else if (h >= 12 && h < 18) greet = '下午好';
  if (greetEl) greetEl.textContent = greet + '！';
}

export function initClock(): void {
  updateClock();
  window.setInterval(updateClock, 1000);
}
