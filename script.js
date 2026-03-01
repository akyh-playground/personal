const countElement = document.getElementById('count');
const incrementButton = document.getElementById('increment-btn');
const storageKey = 'click-counter-value';

function getInitialCount() {
  const savedValue = Number(localStorage.getItem(storageKey));
  return Number.isInteger(savedValue) && savedValue >= 0 ? savedValue : 0;
}

let count = getInitialCount();
countElement.textContent = String(count);

incrementButton.addEventListener('click', () => {
  count += 1;
  countElement.textContent = String(count);
  localStorage.setItem(storageKey, String(count));
});
