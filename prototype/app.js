const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activeDialog = null;
let returnFocus = null;
let closingTimer = null;

function openDialog(id, trigger) {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement)) return;
  clearTimeout(closingTimer);
  if (activeDialog) {
    activeDialog.close();
    activeDialog.classList.remove('open', 'closing');
  }
  returnFocus = trigger;
  activeDialog = dialog;
  document.body.classList.add('has-dialog');
  dialog.showModal();
  requestAnimationFrame(() => dialog.classList.add('open'));
  // Focus the dialog heading without scrolling its content; close remains keyboard-accessible.
  const heading = dialog.querySelector('h2, [id$="-title"]');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

function closeDialog() {
  if (!activeDialog || activeDialog.classList.contains('closing')) return;
  const dialog = activeDialog;
  dialog.classList.remove('open');
  dialog.classList.add('closing');
  closingTimer = setTimeout(() => {
    dialog.close();
    dialog.classList.remove('closing');
    activeDialog = null;
    document.body.classList.remove('has-dialog');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }, reducedMotion.matches ? 180 : 320);
}

document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.open, button)));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeDialog));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog();
  });
});
document.querySelectorAll('.menu-links a').forEach(link => link.addEventListener('click', () => {
  const dialog = activeDialog;
  if (dialog) { clearTimeout(closingTimer); dialog.close(); dialog.classList.remove('open', 'closing'); activeDialog = null; document.body.classList.remove('has-dialog'); }
}));

const motionButton = document.querySelector('.motion-button');
let paused = reducedMotion.matches;
function applyMotion() {
  if (reducedMotion.matches) paused = true;
  root.classList.toggle('paused', paused);
  motionButton.disabled = reducedMotion.matches;
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
  motionButton.querySelector('span:last-child').textContent = reducedMotion.matches ? 'Без анимации' : paused ? 'Движение остановлено' : 'Остановить движение';
}
motionButton.addEventListener('click', () => { paused = !paused; applyMotion(); });
reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; applyMotion(); });
applyMotion();

const descriptions = [
  'У поверхности вода пронизана светом. Здесь начинается наше погружение.',
  'Свет постепенно растворяется в синеве. Силуэты становятся мягче, а расстояния — загадочнее.',
  'Глубже вода скрывает детали. Остановитесь на мгновение и дайте взгляду привыкнуть.'
];
document.querySelectorAll('[data-depth]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-depth]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelector('.depth-window').dataset.layer = button.dataset.depth;
  document.querySelector('.depth-description').textContent = descriptions[Number(button.dataset.depth)];
}));

const routeButtons = [...document.querySelectorAll('[data-route]')];
function selectRoute(route, saved = false) {
  routeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.route === route)));
  document.getElementById('route-status').textContent = saved ? `Ваш маршрут: «${route}». Сохранён на этом устройстве.` : `Выбран маршрут «${route}».`;
}
routeButtons.forEach(button => button.addEventListener('click', () => {
  try { localStorage.setItem('pelagos-route', button.dataset.route); selectRoute(button.dataset.route, true); }
  catch { selectRoute(button.dataset.route); }
}));
try { const saved = localStorage.getItem('pelagos-route'); if (routeButtons.some(button => button.dataset.route === saved)) selectRoute(saved, true); } catch { /* Private mode can deny storage; route selection remains available. */ }

function applyDesign(mark, font) {
  const marks = ['window', 'ray', 'wave', 'depth'];
  const fonts = ['manrope', 'prata', 'cormorant', 'oranienbaum'];
  root.dataset.mark = marks.includes(mark) ? mark : 'window';
  root.dataset.font = fonts.includes(font) ? font : 'manrope';
  document.querySelector('.brand-symbol use').setAttribute('href', `#mark-${root.dataset.mark}`);
  document.querySelectorAll('[data-mark]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.mark === root.dataset.mark));
  });
  document.getElementById('font-select').value = root.dataset.font;
}
function saveDesign() {
  const url = new URL(location.href);
  url.searchParams.set('mark', root.dataset.mark);
  url.searchParams.set('font', root.dataset.font);
  history.replaceState(null, '', url);
}
const params = new URLSearchParams(location.search);
applyDesign(params.get('mark'), params.get('font'));
document.querySelectorAll('button[data-mark]').forEach(button => button.addEventListener('click', () => { applyDesign(button.dataset.mark, root.dataset.font); saveDesign(); }));
document.getElementById('font-select').addEventListener('change', event => { applyDesign(root.dataset.mark, event.target.value); saveDesign(); });
