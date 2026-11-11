// Собственные проверки ПР5: случаи, которых нет в готовых наборах.
// Часть сценариев работает с реальным учебным API на свободном порту, часть — с подменённым fetchFn.
import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack ?? error.message);
  }
}

async function expectApiError(action, kind) {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApiError, "Ожидался экземпляр ApiError");
  assert.equal(caught.kind, kind);
  return caught;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const goodTask = { id: 1, title: "Задача", completed: false, priority: "low", categoryId: 1 };

const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

try {
  await check("O1. собственная комбинация query: categoryId, completed=false и q", async () => {
    // Три фильтра одновременно. Ожидание по данным API: в категории 2 невыполненная
    // задача со словом «API» в названии одна — id 28.
    const urls = [];
    const fetchFn = (url, options) => {
      urls.push(String(url));
      return fetch(url, options);
    };
    const api = createTaskApi(createApiClient({ baseUrl, fetchFn, timeoutMs: 1000 }));
    const result = await api.getTasks({ categoryId: 2, completed: false, q: "api" });
    assert.deepEqual(result.tasks.map((task) => task.id), [28]);
    assert.equal(result.meta.total, 1);
    const params = new URL(urls[0]).searchParams;
    assert.equal(params.get("categoryId"), "2");
    assert.equal(params.get("completed"), "false");
    assert.equal(params.get("q"), "api");
    assert.equal(params.has("priority"), false);
  });

  await check("O2. фильтры варианта 6 дают задачи категории 2", async () => {
    const api = createTaskApi(createApiClient({ baseUrl, timeoutMs: 1000 }));
    const result = await api.getTasks(variantFilters);
    assert.deepEqual(variantFilters, { categoryId: 2 });
    assert.deepEqual(result.tasks.map((task) => task.id), [4, 16, 22, 25, 28, 34]);
    assert.equal(result.meta.total, 6);
    assert.ok(result.tasks.every((task) => task.categoryId === 2));
  });

  await check("O3. HTTP 404 для отсутствующей категории сохраняет код и детали", async () => {
    const client = createApiClient({ baseUrl, timeoutMs: 1000 });
    const error = await expectApiError(() => client.requestJson("/categories/999"), "http");
    assert.equal(error.status, 404);
    assert.equal(error.code, "CATEGORY_NOT_FOUND");
    assert.deepEqual(error.details, { id: 999 });
    assert.equal(error.url, `${baseUrl}/categories/999`);
  });

  await check("O4. HTTP 400 для недопустимого значения query остаётся ошибкой http", async () => {
    // Общий клиент не проверяет смысл параметров, поэтому ошибку возвращает сервер.
    const client = createApiClient({ baseUrl, timeoutMs: 1000 });
    const error = await expectApiError(
      () => client.requestJson("/tasks", { query: { priority: "urgent" } }),
      "http",
    );
    assert.equal(error.status, 400);
    assert.equal(error.code, "INVALID_QUERY");
  });

  await check("O5. уже отменённый сигнал даёт aborted без обращения к сети", async () => {
    let calls = 0;
    const fetchFn = async (_url, { signal }) => {
      calls += 1;
      throw signal.reason;
    };
    const client = createApiClient({ baseUrl, fetchFn, timeoutMs: 1000 });
    const controller = new AbortController();
    controller.abort();
    await expectApiError(() => client.requestJson("/tasks", { signal: controller.signal }), "aborted");
    assert.equal(calls, 1); // fetchFn вызван, но получил уже отменённый сигнал
  });

  await check("O6. граница q: 100 символов допустимо, 101 отклоняется до запроса", async () => {
    let calls = 0;
    const api = createTaskApi({
      async requestJson(_path, options) {
        calls += 1;
        return { data: [], meta: { total: 0, filters: options.query } };
      },
    });
    await api.getTasks({ q: "я".repeat(100) });
    assert.equal(calls, 1);
    await assert.rejects(() => api.getTasks({ q: "я".repeat(101) }), TypeError);
    assert.equal(calls, 1);
  });

  await check("O7. граница названия в ответе: 100 символов принимается, 101 — invalid-response", async () => {
    const build = (length) => createTaskApi({
      async requestJson() {
        return {
          data: [{ ...goodTask, title: "а".repeat(length) }],
          meta: { total: 1, filters: {} },
        };
      },
    });
    const ok = await build(100).getTasks();
    assert.equal(ok.tasks[0].title.length, 100);
    await expectApiError(() => build(101).getTasks(), "invalid-response");
  });

  await check("O8. buildUrl кодирует кириллицу, пробел и амперсанд в q", async () => {
    const url = new URL(buildUrl("http://localhost:5505/api", "tasks", { q: "ошибки & API", completed: false }));
    assert.equal(url.searchParams.get("q"), "ошибки & API");
    assert.ok(url.search.includes("%26"), "амперсанд должен быть закодирован");
    assert.ok(!url.search.includes(" "), "пробел не должен остаться в строке");
    assert.equal(url.searchParams.get("completed"), "false");
  });

  await check("O9. ответ 200 с телом-массивом вместо коллекции — invalid-response", async () => {
    const client = createApiClient({
      baseUrl: "https://example.test/api",
      fetchFn: async () => jsonResponse([goodTask]),
    });
    await expectApiError(() => createTaskApi(client).getTasks(), "invalid-response");
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\nИтог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
