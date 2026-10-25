"use strict";

// Вариант 6
const totalTasks = 18;
const completedTasks = 6;

// Проверка входных данных. Первая найденная ошибка записывается в errorMessage.
let errorMessage = null;

if (typeof totalTasks !== "number" || typeof completedTasks !== "number") {
  errorMessage = "Ошибка: количество задач должно быть числом, а не строкой или другим типом.";
} else if (!Number.isFinite(totalTasks) || !Number.isFinite(completedTasks)) {
  errorMessage = "Ошибка: недопустимое числовое значение (NaN или бесконечность).";
} else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
  errorMessage = "Ошибка: количество задач должно быть целым числом, дробное значение недопустимо.";
} else if (totalTasks < 0 || completedTasks < 0) {
  errorMessage = "Ошибка: количество задач не может быть отрицательным.";
} else if (totalTasks > 1000) {
  errorMessage = "Ошибка: превышена верхняя граница, всего задач не может быть больше 1000.";
} else if (completedTasks > totalTasks) {
  errorMessage = "Ошибка: выполнено больше задач, чем существует.";
}

if (errorMessage !== null) {
  console.log(errorMessage);
} else if (totalTasks === 0) {
  // После проверки totalTasks === 0 означает, что и completedTasks === 0.
  console.log("Задач пока нет");
} else {
  const remainingTasks = totalTasks - completedTasks;
  const percentage = (completedTasks / totalTasks) * 100;

  // Статус определяется по исходным количествам, а не по округлённому проценту.
  let status;
  if (completedTasks === 0) {
    status = "Не начато";
  } else if (completedTasks === totalTasks) {
    status = "Завершено";
  } else {
    status = "В работе";
  }

  console.log(`Всего задач: ${totalTasks}`);
  console.log(`Выполнено: ${completedTasks}`);
  console.log(`Осталось: ${remainingTasks}`);
  console.log(`Прогресс: ${percentage.toFixed(1)}%`);
  console.log(`Статус: ${status}`);
}
