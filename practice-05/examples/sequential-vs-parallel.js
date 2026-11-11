// Временный эксперимент (задание 6.7): два независимых запроса с искусственной задержкой.
// Нужен запущенный API (npm start). В рабочие модули задержки не включаются.
import { createApiClient } from "../src/api-client.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";
const client = createApiClient({ baseUrl, timeoutMs: 3000 });
const DELAY_MS = 150;
const RUNS = 3;

const first = () => client.requestJson("/debug/delay", { query: { ms: DELAY_MS } });
const second = () => client.requestJson("/debug/delay", { query: { ms: DELAY_MS } });

async function sequential() {
  const a = await first();
  const b = await second();
  return [a, b];
}

async function parallel() {
  // Оба запроса начинаются до общего await.
  const pendingA = first();
  const pendingB = second();
  return Promise.all([pendingA, pendingB]);
}

async function measure(name, action) {
  const results = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const startedAt = performance.now();
    await action();
    results.push(Math.round(performance.now() - startedAt));
  }
  console.log(`${name}: ${results.join(", ")} мс`);
}

console.log(`Задержка каждого запроса: ${DELAY_MS} мс, запусков: ${RUNS}`);
await measure("Два последовательных await", sequential);
await measure("Promise.all", parallel);
