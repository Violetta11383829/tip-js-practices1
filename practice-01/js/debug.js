"use strict";

// Задание 5. ИСПРАВЛЕННАЯ версия.
// Исходные ошибки описаны в practice-01/README.md (раздел «Отладка»).

const plannedText = "8";
const completedText = "3";
const additionalText = "2";

// Исправление 1: строки явно преобразуются в числа до сложения и вычитания.
const completedTotal = Number(completedText) + Number(additionalText);
const remainingTasks = Number(plannedText) - completedTotal;

console.log("Выполнено:", completedTotal);
console.log("Осталось:", remainingTasks);

let controlSum = 0;

// Исправление 2: граница цикла включает номер 4 (было: taskNumber < 4).
for (let taskNumber = 1; taskNumber <= 4; taskNumber += 1) {
  controlSum += taskNumber;
}

console.log("Контрольная сумма:", controlSum);
