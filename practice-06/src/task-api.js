import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

// Методы результата:
// getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask,
// setTaskCompleted, deleteTask и resetDemoData.
// Последний аргумент каждого метода данных — { signal }.
export function createTaskApi(client) {
  if (client === null || typeof client !== "object" || typeof client.requestJson !== "function") {
    throw new TypeError("Для createTaskApi нужен клиент с методом requestJson.");
  }

  const UPDATABLE_FIELDS = new Set(["title", "priority", "categoryId", "completed"]);

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function assertId(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным целым числом.");
    }
  }

  // Проверяются только допустимые фильтры; строковое представление создаёт URLSearchParams.
  function normalizeFilters(filters) {
    if (!isPlainObject(filters)) {
      throw new TypeError("filters должен быть обычным объектом.");
    }

    const query = {};
    for (const [name, value] of Object.entries(filters)) {
      if (!ALLOWED_FILTERS.has(name)) {
        throw new TypeError(`Неизвестный фильтр: ${name}.`);
      }
      if (value === undefined) continue;

      if (name === "completed") {
        if (typeof value !== "boolean") throw new TypeError("completed должен быть true или false.");
        query.completed = value;
      } else if (name === "priority") {
        if (!ALLOWED_PRIORITIES.has(value)) {
          throw new TypeError("priority должен быть low, medium или high.");
        }
        query.priority = value;
      } else if (name === "categoryId") {
        if (!isPositiveSafeInteger(value)) {
          throw new TypeError("categoryId должен быть положительным целым числом.");
        }
        query.categoryId = value;
      } else {
        if (typeof value !== "string") throw new TypeError("q должен быть строкой.");
        const text = value.trim();
        if (text.length > 100) throw new TypeError("q не должен быть длиннее 100 символов.");
        if (text !== "") query.q = text;
      }
    }
    return query;
  }

  function assertCollection(payload, itemGuard, label) {
    if (payload === null || typeof payload !== "object" || !Array.isArray(payload.data)) {
      throw invalidResponse(`Ответ ${label} должен содержать массив data.`);
    }
    if (!payload.data.every((item) => itemGuard(item))) {
      throw invalidResponse(`В ответе ${label} есть запись неверной формы.`);
    }
    if (new Set(payload.data.map((item) => item.id)).size !== payload.data.length) {
      throw invalidResponse(`В ответе ${label} повторяются идентификаторы.`);
    }
    const meta = payload.meta;
    if (meta === null || typeof meta !== "object" || meta.total !== payload.data.length) {
      throw invalidResponse(`meta.total в ответе ${label} не совпадает с длиной data.`);
    }
    return payload;
  }

  // Одиночная задача из ответа { data: task }: GET, POST (201) и PATCH.
  function readSingleTask(payload) {
    if (payload === null || typeof payload !== "object" || !isTask(payload.data)) {
      throw invalidResponse("Ответ не содержит корректную задачу.");
    }
    return payload.data;
  }

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = assertCollection(
      await client.requestJson("/tasks", { query, signal: options.signal }),
      isTask,
      "задач",
    );
    if (payload.meta.filters === null || typeof payload.meta.filters !== "object") {
      throw invalidResponse("В ответе задач отсутствует meta.filters.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id, options = {}) {
    assertId(id);
    return readSingleTask(await client.requestJson(`/tasks/${id}`, { signal: options.signal }));
  }

  async function getCategories(options = {}) {
    const payload = assertCollection(
      await client.requestJson("/categories", { signal: options.signal }),
      isCategory,
      "категорий",
    );
    return payload.data;
  }

  // Оба запроса начинаются до общего await: независимые операции не ждут друг друга.
  async function loadInitialData(filters = {}, options = {}) {
    const tasksPromise = getTasks(filters, options);
    const categoriesPromise = getCategories(options);
    const [taskResult, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks: taskResult.tasks, categories, meta: taskResult.meta };
  }

  // Смысл значений (название, приоритет, категорию) проверяет сервер: клиент их не отклоняет,
  // чтобы серверная ошибка VALIDATION_ERROR оставалась доступной вызывающему коду.
  async function createTask(draft, options = {}) {
    if (!isPlainObject(draft)) {
      throw new TypeError("draft должен быть обычным объектом.");
    }
    const body = { title: draft.title, priority: draft.priority, categoryId: draft.categoryId };
    return readSingleTask(
      await client.requestJson("/tasks", { method: "POST", body, signal: options.signal }),
    );
  }

  async function updateTask(id, changes, options = {}) {
    assertId(id);
    if (!isPlainObject(changes) || Object.keys(changes).length === 0) {
      throw new TypeError("changes должен быть непустым объектом.");
    }
    for (const name of Object.keys(changes)) {
      if (!UPDATABLE_FIELDS.has(name)) {
        throw new TypeError(`Поле ${name} нельзя изменить.`);
      }
    }
    return readSingleTask(
      await client.requestJson(`/tasks/${id}`, {
        method: "PATCH",
        body: { ...changes },
        signal: options.signal,
      }),
    );
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") {
      throw new TypeError("completed должен быть true или false.");
    }
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, options = {}) {
    assertId(id);
    const result = await client.requestJson(`/tasks/${id}`, {
      method: "DELETE",
      signal: options.signal,
    });
    // Успешный DELETE возвращает 204 без тела: клиент преобразует его в null.
    if (result !== null) {
      throw invalidResponse("Ответ на DELETE должен быть пустым (204).");
    }
    return null;
  }

  async function resetDemoData(options = {}) {
    const payload = await client.requestJson("/debug/reset", {
      method: "POST",
      signal: options.signal,
    });
    const data = payload?.data;
    if (
      data === null
      || typeof data !== "object"
      || data.reset !== true
      || !Number.isSafeInteger(data.total)
      || data.total < 0
    ) {
      throw invalidResponse("Ответ сброса данных имеет неверную форму.");
    }
    return { reset: data.reset, total: data.total };
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}
