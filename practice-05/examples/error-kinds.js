// Наблюдение за видами ошибок клиента (таблица «Классификация ошибок»).
// Нужен запущенный API (npm start). Секреты и персональные данные не выводятся.
import { ApiError, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";
const client = createApiClient({ baseUrl, timeoutMs: 1000 });
const api = createTaskApi(client);

function describe(error) {
  if (!(error instanceof ApiError)) return `не ApiError: ${error.name}: ${error.message}`;
  return JSON.stringify({
    kind: error.kind,
    status: error.status,
    code: error.code,
    details: error.details,
    message: error.message,
    url: error.url,
    cause: error.cause ? `${error.cause.name}: ${error.cause.message}` : null,
  });
}

async function scenario(name, action) {
  try {
    const value = await action();
    console.log(`${name} -> успех: ${JSON.stringify(value)}`);
  } catch (error) {
    console.log(`${name} -> ${describe(error)}`);
  }
}

await scenario("Задача 999", () => api.getTaskById(999));
await scenario("completed=yes", () => client.requestJson("/tasks", { query: { completed: "yes" } }));
await scenario("/debug/error", () => client.requestJson("/debug/error"));
await scenario("/debug/invalid-json", () => client.requestJson("/debug/invalid-json"));
await scenario("/debug/text", () => client.requestJson("/debug/text"));

// Порт 5599 не используется: соединение будет отклонено.
const offline = createApiClient({ baseUrl: "http://127.0.0.1:5599/api", timeoutMs: 1000 });
await scenario("Не запущен API", () => offline.requestJson("/health"));

await scenario("Задержка больше тайм-аута", () => client.requestJson("/debug/delay", {
  query: { ms: 150 },
  timeoutMs: 20,
}));

const controller = new AbortController();
const pending = client.requestJson("/debug/delay", {
  query: { ms: 150 },
  signal: controller.signal,
  timeoutMs: 1000,
});
controller.abort();
await scenario("Явный AbortController.abort()", () => pending);
