const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

// Кнопка действия: <button type="button" data-action="..."><span class="action-label">…</span></button>
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

// Все серверные значения выводятся через textContent: разметка в названии остаётся текстом.
export function createTaskElement(task, category) {
  const item = document.createElement("li");
  item.className = "task-card";
  if (task.completed === true) {
    item.classList.add("is-completed");
  }
  item.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed === true ? "Выполнена" : "В работе";

  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = PRIORITY_LABELS[task.priority] ?? task.priority;

  const categoryNode = document.createElement("span");
  categoryNode.className = "task-category";
  // Если категория по id не найдена, показывается нейтральная подпись, а не пустое место.
  categoryNode.textContent = category?.name ?? "Без категории";

  meta.append(status, priority, categoryNode);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const toggleButton = createActionButton(
    "toggle",
    task.completed === true ? "Вернуть в работу" : "Выполнена",
  );
  toggleButton.setAttribute("aria-pressed", String(task.completed === true));
  actions.append(
    toggleButton,
    createActionButton("edit", "Изменить"),
    createActionButton("delete", "Удалить"),
  );

  item.append(title, meta, actions);
  return item;
}

export function renderTaskList(list, tasks, categories) {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  // replaceChildren заменяет содержимое списка и не накапливает старые карточки.
  list.replaceChildren(
    ...tasks.map((task) => createTaskElement(task, categoriesById.get(task.categoryId))),
  );
}
