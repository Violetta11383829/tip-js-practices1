// Общий контрольный набор. Для своего варианта ниже предусмотрен отдельный массив.
// Идентификатор задачи не совпадает с её индексом в массиве.
export const demoTasks = [
  { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
  { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
  { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
  { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

// Вариант 6. Тематика: «Проверка пользовательского интерфейса».
// Идентификаторы: 11, 23, 37, 41, 58, 64 (в указанном порядке).
// Выполнены первые K = 5 задач; в наборе есть приоритеты low, medium и high.
export const variantNumber = 6;
export const variantTasks = [
  { id: 11, title: "Составить чек-лист проверки интерфейса", completed: true, priority: "medium" },
  { id: 23, title: "Проверить читаемость текста и контрастность", completed: true, priority: "high" },
  { id: 37, title: "Проверить адаптивность на узком экране", completed: true, priority: "low" },
  { id: 41, title: "Проверить работу кнопок и форм", completed: true, priority: "high" },
  { id: 58, title: "Зафиксировать найденные дефекты", completed: true, priority: "medium" },
  { id: 64, title: "Подготовить отчёт по проверке", completed: false, priority: "low" },
];
