import { getTaskStats } from "./task-service.js";

// Здесь создаётся DOM, но не изменяется состояние приложения.
// Контракт карточки, селекторы и тексты описаны в методичке.

const PRIORITY_LABELS = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

// Создаёт кнопку действия: <button type="button" data-action="..."><span class="action-label">…</span></button>
function createActionButton(action, labelText) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;

  const label = document.createElement("span");
  label.className = "action-label";
  label.textContent = labelText;

  button.append(label);
  return button;
}

export function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-card";
  if (task.completed === true) {
    item.classList.add("is-completed");
  }
  item.dataset.taskId = String(task.id);

  // Все значения записываются через textContent: название не интерпретируется как HTML.
  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed === true ? "Выполнена" : "В работе";

  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = PRIORITY_LABELS[task.priority];

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const toggleButton = createActionButton("toggle", "Выполнена");
  toggleButton.setAttribute("aria-pressed", String(task.completed === true));
  const deleteButton = createActionButton("delete", "Удалить");
  actions.append(toggleButton, deleteButton);

  item.append(title, status, priority, actions);
  return item;
}

export function renderTaskList(listElement, tasks) {
  // replaceChildren заменяет содержимое списка; сам ul (и обработчик на нём) сохраняется.
  listElement.replaceChildren(...tasks.map((task) => createTaskElement(task)));
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  // tasks — ВЕСЬ текущий массив, visibleCount — длина отфильтрованного списка.
  const { total, completed, pending, progress } = getTaskStats(tasks);
  const values = {
    total: String(total),
    completed: String(completed),
    pending: String(pending),
    progress: `${progress.toFixed(1)}%`,
    visible: String(visibleCount),
  };

  for (const [name, value] of Object.entries(values)) {
    const node = summaryElement.querySelector(`[data-stat="${name}"]`);
    if (node === null) {
      throw new Error(`В сводке не найден элемент [data-stat="${name}"]`);
    }
    node.textContent = value;
  }
}

export function renderEmptyState(messageElement, total, visibleCount) {
  if (visibleCount > 0) {
    messageElement.textContent = "";
    messageElement.hidden = true;
    return;
  }

  messageElement.textContent =
    total === 0 ? "Список задач пуст." : "Нет задач по выбранному фильтру.";
  messageElement.hidden = false;
}
