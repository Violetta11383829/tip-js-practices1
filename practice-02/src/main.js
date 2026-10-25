import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

// ---------- Вспомогательные функции вывода (прикладная логика остаётся в task-service.js) ----------

function printStats(label, tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  let line = `${label}: всего ${total}; выполнено ${completed}; осталось ${pending}; `;
  line += total === 0 ? "Задач пока нет" : `прогресс ${progress.toFixed(1)}%`;
  console.log(line);
}

// Применяет результат операции: при успехе возвращает новый массив,
// при отказе выводит ошибку и возвращает прежнее состояние без изменений.
function applyResult(label, currentTasks, result) {
  if (result.ok) {
    console.log(`Действие выполнено: ${label}`);
    return result.tasks;
  }
  console.error(`Ошибка (${label}): ${result.error}`);
  return currentTasks;
}

function printIds(label, tasks) {
  console.log(`${label}: [${tasks.map((task) => task.id).join(", ")}]`);
}

// Снимки для проверки неизменности исходных наборов.
const demoSnapshot = JSON.stringify(demoTasks);
const variantSnapshot = JSON.stringify(variantTasks);

// =====================================================================
// Общий сценарий (раздел 6.5)
// =====================================================================
console.log("=== ОБЩИЙ СЦЕНАРИЙ (demoTasks) ===");

console.log("\n1. Исходные данные");
console.table(demoTasks);
console.log("Названия:", getTaskTitles(demoTasks));
console.log("Невыполненные задачи (id):", getPendingTasks(demoTasks).map((task) => task.id));
console.log("Задача с id = 4:", findTaskById(demoTasks, 4));
console.log("Задача со строковым id \"4\":", findTaskById(demoTasks, "4"));
printStats("Исходный набор", demoTasks);

let currentTasks = demoTasks;

console.log("\n2. Добавление id = 20");
currentTasks = applyResult(
  "добавить id 20",
  currentTasks,
  addTask(currentTasks, 20, "Добавить проверку", "high"),
);
printStats("После добавления id 20", currentTasks);

console.log("\n3. Выполнение id = 4");
currentTasks = applyResult("выполнить id 4", currentTasks, setTaskCompleted(currentTasks, 4, true));
printStats("После выполнения id 4", currentTasks);

console.log("\n4. Переименование id = 10");
currentTasks = applyResult(
  "переименовать id 10",
  currentTasks,
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска"),
);
printStats("После переименования id 10", currentTasks);

console.log("\n5. Удаление id = 7");
currentTasks = applyResult("удалить id 7", currentTasks, removeTask(currentTasks, 7));
printStats("После удаления id 7", currentTasks);

console.log("\n6. Показ отказов (состояние не должно измениться)");
const beforeRefusals = JSON.stringify(currentTasks);
currentTasks = applyResult(
  "повторно добавить id 20",
  currentTasks,
  addTask(currentTasks, 20, "Дубликат", "low"),
);
currentTasks = applyResult(
  'установить completed = "true" для id 4',
  currentTasks,
  setTaskCompleted(currentTasks, 4, "true"),
);
currentTasks = applyResult("удалить отсутствующий id 777", currentTasks, removeTask(currentTasks, 777));
console.log(
  "Состояние после отказов не изменилось:",
  JSON.stringify(currentTasks) === beforeRefusals,
);

console.log("\nИтоговые задачи:");
console.table(currentTasks);
printIds("Идентификаторы итогового списка", currentTasks);
console.log("Невыполненные задачи (id):", getPendingTasks(currentTasks).map((task) => task.id));

console.log("\n7. Исходный demoTasks");
console.log("demoTasks сохранил прежние значения:", JSON.stringify(demoTasks) === demoSnapshot);
printIds("Идентификаторы demoTasks", demoTasks);
printStats("Сводка demoTasks", demoTasks);
console.log("Итоговый массив — другой объект, не demoTasks:", currentTasks !== demoTasks);

// =====================================================================
// Индивидуальный сценарий (раздел 7), вариант из data.js
// =====================================================================
console.log(`\n=== ИНДИВИДУАЛЬНЫЙ СЦЕНАРИЙ (вариант ${variantNumber}, variantTasks) ===`);

console.log("\n1. Исходные данные и сводка");
console.table(variantTasks);
printStats("Исходный набор варианта", variantTasks);

let variantState = variantTasks;

console.log("\n2. Добавление id = 80");
variantState = applyResult(
  "добавить id 80",
  variantState,
  addTask(variantState, 80, "Проверить сообщения об ошибках в интерфейсе", "low"),
);
printStats("После добавления id 80", variantState);

console.log("\n3. completed = true для id = 11 (задача уже выполнена, контракт всё равно соблюдается)");
const afterComplete = setTaskCompleted(variantState, 11, true);
if (afterComplete.ok) {
  console.log(
    "Новый массив и новый объект записи id 11:",
    afterComplete.tasks !== variantState &&
      findTaskById(afterComplete.tasks, 11) !== findTaskById(variantState, 11),
  );
}
variantState = applyResult("выполнить id 11", variantState, afterComplete);
printStats("После выполнения id 11", variantState);

console.log("\n4. Переименование id = 23");
variantState = applyResult(
  "переименовать id 23",
  variantState,
  renameTask(variantState, 23, "Проверить контрастность и размер шрифта"),
);
console.log("Задача id 23 после переименования:", findTaskById(variantState, 23));
printStats("После переименования id 23", variantState);

console.log("\n5. Удаление id = 37");
variantState = applyResult("удалить id 37", variantState, removeTask(variantState, 37));
printStats("После удаления id 37", variantState);

console.log("\n6. Повторное добавление id = 80 (ожидается отказ)");
const beforeDuplicate = JSON.stringify(variantState);
variantState = applyResult(
  "повторно добавить id 80",
  variantState,
  addTask(variantState, 80, "Ещё одна задача", "high"),
);
console.log("Список не изменился:", JSON.stringify(variantState) === beforeDuplicate);

console.log("\n7. Итог");
console.table(variantState);
printIds("Идентификаторы итогового списка", variantState);
printStats("Итоговая сводка варианта", variantState);
console.log(
  "variantTasks сохранил прежние значения:",
  JSON.stringify(variantTasks) === variantSnapshot,
);
printIds("Идентификаторы variantTasks", variantTasks);
