export const STORAGE_VERSION = 1;

const ALLOWED_PRIORITIES = ["low", "medium", "high"];
const MAX_TITLE_LENGTH = 100;

// Все функции принимают объект storage явно, чтобы их можно было проверить
// без обращения к глобальному window.localStorage.

function isValidTask(task) {
  if (task === null || typeof task !== "object" || Array.isArray(task)) {
    return false;
  }
  return (
    Number.isSafeInteger(task.id) &&
    task.id > 0 &&
    typeof task.title === "string" &&
    task.title === task.title.trim() &&
    task.title.length >= 1 &&
    task.title.length <= MAX_TITLE_LENGTH &&
    typeof task.completed === "boolean" &&
    ALLOWED_PRIORITIES.includes(task.priority)
  );
}

// Проверяет весь массив целиком и уникальность id. Значение не исправляется.
export function isValidTaskList(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  if (!value.every((task) => isValidTask(task))) {
    return false;
  }
  const ids = new Set(value.map((task) => task.id));
  return ids.size === value.length;
}

// Независимая копия записей: изменение копии не затрагивает исходный массив.
function copyTasks(tasks) {
  return tasks.map((task) => ({ ...task }));
}

function fallbackResult(fallbackTasks, error) {
  return { ok: false, source: "fallback", tasks: copyTasks(fallbackTasks), error };
}

export function loadTasks(storage, key, fallbackTasks) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return { ok: true, source: "initial", tasks: copyTasks(fallbackTasks) };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return fallbackResult(
        fallbackTasks,
        `Сохранённые данные повреждены (некорректный JSON: ${error.message}). Используется исходный набор.`,
      );
    }

    if (parsed === null || typeof parsed !== "object" || parsed.version !== STORAGE_VERSION) {
      return fallbackResult(
        fallbackTasks,
        "Неизвестная версия сохранённых данных. Используется исходный набор.",
      );
    }
    if (!isValidTaskList(parsed.tasks)) {
      return fallbackResult(
        fallbackTasks,
        "Сохранённые данные не соответствуют схеме. Используется исходный набор.",
      );
    }

    return { ok: true, source: "storage", tasks: copyTasks(parsed.tasks) };
  } catch (error) {
    return fallbackResult(
      fallbackTasks,
      `Не удалось прочитать localStorage: ${error.message}. Используется исходный набор.`,
    );
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Список задач некорректен и не был сохранён." };
  }
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Не удалось записать в localStorage: ${error.message}. После перезагрузки изменения могут быть потеряны.`,
    };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Не удалось удалить сохранённые данные: ${error.message}.` };
  }
}
