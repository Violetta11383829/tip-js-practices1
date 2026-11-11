import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
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

function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

// client — объект, созданный createApiClient.
// Контракт результата:
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
  if (client === null || typeof client !== "object" || typeof client.requestJson !== "function") {
    throw new TypeError("Для createTaskApi нужен клиент с методом requestJson.");
  }

  // Проверяются только допустимые фильтры; строковое представление создаёт URLSearchParams.
  function normalizeFilters(filters) {
    if (filters === null || typeof filters !== "object" || Array.isArray(filters)) {
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
        query.completed = value; // false сохраняется как булево значение
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
    const ids = new Set(payload.data.map((item) => item.id));
    if (ids.size !== payload.data.length) {
      throw invalidResponse(`В ответе ${label} повторяются идентификаторы.`);
    }
    const meta = payload.meta;
    if (meta === null || typeof meta !== "object" || meta.total !== payload.data.length) {
      throw invalidResponse(`meta.total в ответе ${label} не совпадает с длиной data.`);
    }
    return payload;
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = assertCollection(
      await client.requestJson("/tasks", { query }),
      isTask,
      "задач",
    );
    if (payload.meta.filters === null || typeof payload.meta.filters !== "object") {
      throw invalidResponse("В ответе задач отсутствует meta.filters.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным целым числом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`);
    if (payload === null || typeof payload !== "object" || !isTask(payload.data)) {
      throw invalidResponse("Ответ не содержит корректную задачу.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = assertCollection(await client.requestJson("/categories"), isCategory, "категорий");
    return payload.data;
  }

  // Оба запроса начинаются до общего await: независимые операции не ждут друг друга.
  async function loadInitialData(filters = {}) {
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();
    const [tasksResult, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks: tasksResult.tasks, categories, meta: tasksResult.meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
