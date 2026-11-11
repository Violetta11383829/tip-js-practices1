// Вызовы предметного API для таблицы «Доменный модуль задач». Нужен запущенный API (npm start).
import { createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";
const api = createTaskApi(createApiClient({ baseUrl, timeoutMs: 1000 }));

const all = await api.getTasks();
console.log("getTasks():", all.tasks.length, all.tasks.map((task) => task.id), all.meta);

const filtered = await api.getTasks({ completed: false, priority: "high" });
console.log("getTasks({ completed: false, priority: \"high\" }):", filtered.tasks.length, filtered.tasks.map((task) => task.id), filtered.meta);

console.log("getTaskById(25):", await api.getTaskById(25));
console.log("getCategories():", (await api.getCategories()).map((category) => `${category.id}=${category.name}`));

const initial = await api.loadInitialData({ completed: false, priority: "high" });
console.log("loadInitialData(...) ключи:", Object.keys(initial));
console.log("  tasks:", initial.tasks.map((task) => task.id), "categories:", initial.categories.length, "meta.total:", initial.meta.total);
