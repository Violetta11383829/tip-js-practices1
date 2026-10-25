import { demoTasks, variantTasks, variantNumber } from "./data.js";
import { findTaskById, setTaskCompleted, removeTask } from "./task-service.js";
import { getVisibleTasks } from "./task-selectors.js";
import { renderTaskList, renderSummary, renderEmptyState } from "./task-view.js";

const elements = {
  list: document.querySelector("#task-list"),
  filters: document.querySelector("#task-filters"),
  summary: document.querySelector("#task-summary"),
  empty: document.querySelector("#empty-message"),
  message: document.querySelector("#operation-message"),
  datasetLabel: document.querySelector("#dataset-label"),
};

// Готовая служебная часть: ?dataset=variant включает данные своего варианта.
// Наборы не смешиваются, редактировать код для переключения не требуется.
const isVariant = new URLSearchParams(window.location.search).get("dataset") === "variant";
const initialTasks = isVariant ? variantTasks : demoTasks;
let currentTasks = initialTasks.map((task) => ({ ...task }));
let currentFilter = "all";

elements.datasetLabel.textContent = isVariant
  ? `Индивидуальный вариант: ${variantNumber ?? "не указан"}`
  : "Общий контрольный набор";

const ALLOWED_FILTERS = ["all", "pending", "completed"];

function showMessage(text) {
  elements.message.textContent = text;
}

function clearMessage() {
  elements.message.textContent = "";
}

function renderApp() {
  // Выборка вычисляется заново; currentTasks здесь только читается.
  const visibleTasks = getVisibleTasks(currentTasks, currentFilter);

  renderTaskList(elements.list, visibleTasks);
  // Сводка считается по ВСЕМУ списку, а «Показано» — по выборке.
  renderSummary(elements.summary, currentTasks, visibleTasks.length);
  renderEmptyState(elements.empty, currentTasks.length, visibleTasks.length);

  for (const button of elements.filters.querySelectorAll("button[data-filter]")) {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function handleTaskListClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  // closest находит кнопку, даже если нажат вложенный span.action-label.
  const button = event.target.closest("button[data-action]");
  if (button === null || !elements.list.contains(button)) {
    return;
  }

  const action = button.dataset.action;
  if (action !== "toggle" && action !== "delete") {
    return;
  }

  const card = button.closest("li[data-task-id]");
  if (card === null || !elements.list.contains(card)) {
    showMessage("Не удалось определить задачу для этой кнопки.");
    return;
  }

  // dataset всегда содержит строку: преобразуем её в число и проверяем.
  // Сравнение String(id) с исходной строкой отсекает значения вроде "4abc", " 4", "04", "1e1".
  const rawId = card.dataset.taskId;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== rawId) {
    showMessage(`Некорректный идентификатор задачи: "${rawId}".`);
    return;
  }

  let result;
  if (action === "toggle") {
    // Берём актуальное значение из данных, а не из текста кнопки или CSS-класса.
    const task = findTaskById(currentTasks, id);
    result =
      task === undefined
        ? { ok: false, error: `Задача с идентификатором ${id} не найдена.` }
        : setTaskCompleted(currentTasks, id, !task.completed);
  } else {
    result = removeTask(currentTasks, id);
  }

  if (!result.ok) {
    // При отказе массив не заменяется.
    showMessage(result.error);
    return;
  }

  currentTasks = result.tasks;
  clearMessage();
  renderApp();
  restoreTaskFocus(id, action);
}

function handleFilterClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("button[data-filter]");
  if (button === null || !elements.filters.contains(button)) {
    return;
  }

  const filter = button.dataset.filter;
  if (!ALLOWED_FILTERS.includes(filter)) {
    return;
  }

  // Меняется только выбранный фильтр; полный список currentTasks остаётся прежним.
  currentFilter = filter;
  clearMessage();
  renderApp();
}

// Готовая вспомогательная функция. Сохраняет понятную позицию клавиатурного фокуса
// после замены карточек. Если карточки больше нет, фокус получает активный фильтр.
function restoreTaskFocus(id, action) {
  const actionButton = elements.list.querySelector(
    `[data-task-id="${id}"] button[data-action="${action}"]`,
  );
  const filterButton = elements.filters.querySelector(`[data-filter="${currentFilter}"]`);
  (actionButton ?? filterButton)?.focus();
}

// Подписки выполняются один раз. Эти контейнеры не заменяются при перерисовке.
elements.list.addEventListener("click", handleTaskListClick);
elements.filters.addEventListener("click", handleFilterClick);

// До реализации renderApp ожидается сообщение о заглушке.
// try/catch здесь — готовая диагностика старта, а не замена проверки result.ok.
try {
  renderApp();
} catch (error) {
  elements.message.textContent = `Ошибка запуска: ${error.message}`;
  console.error(error);
}
