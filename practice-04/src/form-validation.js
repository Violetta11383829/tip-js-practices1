const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const MAX_TITLE_LENGTH = 100;

// Преобразует значение поля id в число. Строки приходят из формы, числа — из кода.
// Пустая строка не превращается в 0: она отклоняется отдельным сообщением.
function parseId(raw) {
  let value;
  if (typeof raw === "number") {
    value = raw;
  } else if (typeof raw === "string") {
    const text = raw.trim();
    if (text === "") {
      return { ok: false, error: "Укажите идентификатор задачи." };
    }
    value = Number(text);
  } else {
    return { ok: false, error: "Укажите идентификатор задачи." };
  }

  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: "Идентификатор должен быть положительным целым числом." };
  }
  return { ok: true, id: value };
}

function checkTitle(raw) {
  if (typeof raw !== "string") {
    return { ok: false, error: "Название должно быть строкой." };
  }
  const title = raw.trim();
  if (title.length === 0) {
    return { ok: false, error: "Название не должно быть пустым." };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Название не должно быть длиннее ${MAX_TITLE_LENGTH} символов.` };
  }
  return { ok: true, title };
}

// Чистая проверка данных формы. DOM и показ сообщений выполняются в main.js.
// draft: { id, title, priority }; editingId: null либо id редактируемой задачи.
// Успех: { ok: true, value: { id, title, priority } }.
// Отказ: { ok: false, errors: { id?: "...", title?: "...", priority?: "..." } }.
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let id;

  if (editingId === null) {
    // Создание: id берётся из формы и должен быть свободным.
    const parsed = parseId(draft.id);
    if (!parsed.ok) {
      errors.id = parsed.error;
    } else if (tasks.some((task) => task.id === parsed.id)) {
      errors.id = `Задача с идентификатором ${parsed.id} уже существует.`;
    } else {
      id = parsed.id;
    }
  } else {
    // Редактирование: draft.id не используется, источник id — editingId.
    const parsed = parseId(editingId);
    if (!parsed.ok || typeof editingId !== "number") {
      errors.id = "Некорректный идентификатор редактируемой задачи.";
    } else if (!tasks.some((task) => task.id === parsed.id)) {
      errors.id = `Редактируемая задача с идентификатором ${parsed.id} не найдена.`;
    } else {
      id = parsed.id;
    }
  }

  const titleResult = checkTitle(draft.title);
  if (!titleResult.ok) {
    errors.title = titleResult.error;
  }

  // Приоритет сравнивается строго: без trim и без изменения регистра.
  if (typeof draft.priority !== "string" || !ALLOWED_PRIORITIES.has(draft.priority)) {
    errors.priority = 'Приоритет должен быть одним из значений: "low", "medium", "high".';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { id, title: titleResult.title, priority: draft.priority } };
}
