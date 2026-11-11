const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const MAX_TITLE_LENGTH = 100;

// Возвращает { valid, value, errors }.
// value содержит нормализованные title, priority и числовой categoryId.
// Функция не читает DOM и не изменяет входные объекты.
export function validateTaskDraft(draft, categories) {
  const source = draft !== null && typeof draft === "object" ? draft : {};
  const knownCategories = Array.isArray(categories) ? categories : [];
  const errors = {};

  // Название: строка, после trim от 1 до 100 символов.
  let title = "";
  if (typeof source.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    title = source.title.trim();
    if (title.length === 0) {
      errors.title = "Введите название задачи.";
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.title = `Название должно содержать от 1 до ${MAX_TITLE_LENGTH} символов.`;
    }
  }

  // Приоритет сравнивается строго: без trim и без изменения регистра.
  if (typeof source.priority !== "string" || !ALLOWED_PRIORITIES.has(source.priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий.";
  }

  // categoryId приходит из поля формы строкой: число проверяется явно.
  // Пустая строка не превращается в 0, нецелое значение отклоняется.
  let categoryId = null;
  const rawCategory = source.categoryId;
  const isEmptyString = typeof rawCategory === "string" && rawCategory.trim() === "";
  const numeric = typeof rawCategory === "number" || typeof rawCategory === "string"
    ? Number(rawCategory)
    : NaN;
  if (isEmptyString || !Number.isSafeInteger(numeric) || numeric <= 0) {
    errors.categoryId = "Выберите категорию.";
  } else if (!knownCategories.some((category) => category.id === numeric)) {
    errors.categoryId = "Выбранной категории нет в списке.";
  } else {
    categoryId = numeric;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, value: null, errors };
  }
  return { valid: true, value: { title, priority: source.priority, categoryId }, errors: {} };
}
