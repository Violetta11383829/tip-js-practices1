"use strict";

// Вариант 6
const totalTasks = 18;
const completedTasks = 6;
const dailyLimit = 5;

// Проверка входных данных. Первая найденная ошибка записывается в errorMessage.
let errorMessage = null;

if (typeof totalTasks !== "number" || typeof completedTasks !== "number") {
  errorMessage = "Ошибка: количество задач должно быть числом, а не строкой или другим типом.";
} else if (!Number.isFinite(totalTasks) || !Number.isFinite(completedTasks)) {
  errorMessage = "Ошибка: недопустимое числовое значение количества задач (NaN или бесконечность).";
} else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
  errorMessage = "Ошибка: количество задач должно быть целым числом, дробное значение недопустимо.";
} else if (totalTasks < 0 || completedTasks < 0) {
  errorMessage = "Ошибка: количество задач не может быть отрицательным.";
} else if (totalTasks > 1000) {
  errorMessage = "Ошибка: превышена верхняя граница, всего задач не может быть больше 1000.";
} else if (completedTasks > totalTasks) {
  errorMessage = "Ошибка: некорректное число выполненных задач, выполнено больше, чем существует.";
} else if (typeof dailyLimit !== "number") {
  errorMessage = "Ошибка: дневная норма должна быть числом, а не строкой или другим типом.";
} else if (!Number.isFinite(dailyLimit)) {
  errorMessage = "Ошибка: недопустимое числовое значение дневной нормы (NaN или бесконечность).";
} else if (!Number.isInteger(dailyLimit)) {
  errorMessage = "Ошибка: дневная норма должна быть целым числом, дробной нормы быть не должно.";
} else if (dailyLimit < 1) {
  errorMessage = "Ошибка: дневная норма должна быть не меньше 1.";
} else if (dailyLimit > 1000) {
  errorMessage = "Ошибка: превышена верхняя граница дневной нормы, максимум 1000.";
}

if (errorMessage !== null) {
  console.log(errorMessage);
} else {
  let remainingTasks = totalTasks - completedTasks;
  let day = 0;

  if (remainingTasks === 0) {
    console.log("Все задачи уже выполнены, планировать нечего.");
  } else {
    console.log(`Осталось задач: ${remainingTasks}`);

    while (remainingTasks > 0) {
      day += 1;
      // За последний день нельзя выполнить больше задач, чем осталось.
      const doneToday = Math.min(dailyLimit, remainingTasks);
      remainingTasks -= doneToday;
      console.log(`День ${day}: выполнено ${doneToday}, осталось ${remainingTasks}`);
    }
  }

  console.log(`Потребуется дней: ${day}`);
}
