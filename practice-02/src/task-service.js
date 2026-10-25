// Прикладная логика работы с задачами.
// Здесь нет console.log(), DOM и глобального изменяемого списка: каждая функция
// работает только с переданными аргументами и не изменяет входные данные.
// Ожидаемые ошибки возвращаются как данные: { ok: false, error: "..." }.

const ALLOWED_PRIORITIES = ["low", "medium", "high"];
const MAX_TITLE_LENGTH = 100;

// ---------- Внутренние функции проверки ----------

// Возвращает текст ошибки или null, если id корректен. Типы не преобразуются.
function getIdError(id) {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным безопасным целым числом.";
  }
  return null;
}

// Проверяет и нормализует название. Сначала проверяется тип, затем длина.
function normalizeTitle(title) {
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой." };
  }
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0) {
    return { ok: false, error: "Название не должно быть пустым." };
  }
  if (cleanTitle.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Название не должно быть длиннее ${MAX_TITLE_LENGTH} символов.`,
    };
  }
  return { ok: true, title: cleanTitle };
}

function getPriorityError(priority) {
  if (typeof priority !== "string" || !ALLOWED_PRIORITIES.includes(priority)) {
    return 'Приоритет должен быть одним из значений: "low", "medium", "high".';
  }
  return null;
}

// ---------- Создание ----------

export function createTask(id, title, priority = "medium") {
  const idError = getIdError(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }

  const priorityError = getPriorityError(priority);
  if (priorityError !== null) {
    return { ok: false, error: priorityError };
  }

  return {
    ok: true,
    task: {
      id,
      title: titleResult.title,
      completed: false,
      priority,
    },
  };
}

// ---------- Чтение ----------

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed === true).length;
  const pending = total - completed;
  // Процент возвращается числом без округления; округление выполняется при выводе.
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return { total, completed, pending, progress };
}

// ---------- Изменение (исходные данные не изменяются) ----------

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);
  if (!created.ok) {
    return created;
  }

  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: `Задача с идентификатором ${id} уже существует.` };
  }

  return { ok: true, tasks: [...tasks, created.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  const idError = getIdError(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  if (typeof completed !== "boolean") {
    return { ok: false, error: "Признак выполнения должен быть значением true или false." };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с идентификатором ${id} не найдена.` };
  }

  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, completed } : task)),
  };
}

export function renameTask(tasks, id, title) {
  const idError = getIdError(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с идентификатором ${id} не найдена.` };
  }

  return {
    ok: true,
    tasks: tasks.map((task) =>
      task.id === id ? { ...task, title: titleResult.title } : task,
    ),
  };
}

export function removeTask(tasks, id) {
  const idError = getIdError(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с идентификатором ${id} не найдена.` };
  }

  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}
