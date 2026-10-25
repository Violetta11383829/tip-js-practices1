// Новый модуль ПР3. Вход: корректный массив задач и фильтр all/pending/completed.
// Результат: новый массив, исходный порядок и объекты сохраняются.
export function getVisibleTasks(tasks, filter = "all") {
  if (filter === "pending") {
    return tasks.filter((task) => task.completed === false);
  }
  if (filter === "completed") {
    return tasks.filter((task) => task.completed === true);
  }
  // "all" (и значение по умолчанию): копия массива с теми же записями.
  // Недопустимые значения фильтра отсеиваются в обработчике, а не здесь.
  return [...tasks];
}
