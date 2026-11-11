import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

const REQUIRED_API_METHODS = [
  "loadInitialData",
  "getTasks",
  "createTask",
  "updateTask",
  "setTaskCompleted",
  "deleteTask",
  "resetDemoData",
];
const REQUIRED_VIEW_METHODS = [
  "setListState",
  "setTasks",
  "setCategories",
  "setTotal",
  "setFormTask",
  "showFormErrors",
  "setMutationPending",
  "notify",
];

function isAborted(error) {
  return error instanceof ApiError && error.kind === "aborted";
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
// Обязательные методы результата:
// start, applyFilters, refresh, submit, beginEdit, cancelEdit,
// toggleTask, deleteTask, resetData и destroy.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  for (const name of REQUIRED_API_METHODS) {
    if (typeof api?.[name] !== "function") {
      throw new TypeError(`У api должен быть метод ${name}.`);
    }
  }
  for (const name of REQUIRED_VIEW_METHODS) {
    if (typeof view?.[name] !== "function") {
      throw new TypeError(`У view должен быть метод ${name}.`);
    }
  }
  if (typeof validateDraft !== "function") {
    throw new TypeError("validateDraft должен быть функцией.");
  }

  // Состояние контроллера. Единственный источник задач — сервер: здесь хранится
  // лишь последний полученный ответ, который перезаписывается при каждой загрузке.
  let tasks = [];
  let categories = [];
  let categoriesLoaded = false;
  let filters = {};
  let editingId = null;
  let activeLoad = null; // AbortController текущей загрузки
  let lastLoadId = 0; // номер последней начатой загрузки
  let mutationPending = false;

  // Загружает список с текущими фильтрами. Пока категории не получены,
  // выполняется loadInitialData (повтор после ошибки первой загрузки), далее — getTasks.
  // Возвращает true только если результат был показан пользователю.
  async function loadCurrentTasks() {
    activeLoad?.abort(); // предыдущий запрос отменяется
    const controller = new AbortController();
    activeLoad = controller;
    const loadId = lastLoadId + 1;
    lastLoadId = loadId;

    view.setListState("loading");
    try {
      const options = { signal: controller.signal };
      let result;
      if (categoriesLoaded) {
        result = await api.getTasks({ ...filters }, options);
      } else {
        result = await api.loadInitialData({ ...filters }, options);
      }

      // Устаревший ответ: за время ожидания начата более новая загрузка.
      // Сигнал отмены этого не гарантирует, поэтому проверяется номер.
      if (loadId !== lastLoadId) {
        return false;
      }

      if (!categoriesLoaded) {
        categories = result.categories;
        categoriesLoaded = true;
        view.setCategories(categories);
      }
      tasks = result.tasks;
      view.setTasks(tasks, categories);
      view.setTotal(result.meta?.total ?? tasks.length);
      view.setListState(tasks.length > 0 ? "ready" : "empty");
      return true;
    } catch (error) {
      if (loadId !== lastLoadId || isAborted(error)) {
        return false; // отмена и устаревший отказ пользователю не показываются
      }
      view.setListState("error", messageForError(error));
      return false;
    } finally {
      if (activeLoad === controller) {
        activeLoad = null;
      }
    }
  }

  // Общая схема изменяющих операций: блокировка, запрос, сообщение, повторный GET.
  async function runMutation(operation, successMessage) {
    if (mutationPending) {
      return false;
    }
    mutationPending = true;
    view.setMutationPending(true);
    try {
      await operation();
      view.notify(successMessage, "success");
      await loadCurrentTasks();
      return true;
    } catch (error) {
      view.notify(messageForError(error), "error");
      return false;
    } finally {
      mutationPending = false;
      view.setMutationPending(false);
    }
  }

  function leaveEditMode() {
    editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
  }

  function findTask(id) {
    return tasks.find((task) => task.id === id);
  }

  return {
    start(initialFilters = {}) {
      filters = { ...initialFilters };
      return loadCurrentTasks();
    },

    applyFilters(nextFilters = {}) {
      filters = { ...nextFilters };
      return loadCurrentTasks();
    },

    refresh() {
      return loadCurrentTasks();
    },

    async submit(draft) {
      const checked = validateDraft(draft, categories);
      if (!checked.valid) {
        // Невалидная форма не вызывает API.
        view.showFormErrors(checked.errors);
        return false;
      }
      view.showFormErrors({});

      const editingNow = editingId;
      const value = checked.value;
      return runMutation(
        async () => {
          if (editingNow === null) {
            await api.createTask(value);
          } else {
            await api.updateTask(editingNow, value);
          }
          leaveEditMode();
        },
        editingNow === null ? "Задача добавлена." : "Изменения сохранены.",
      );
    },

    beginEdit(id) {
      const task = findTask(id);
      if (task === undefined) {
        view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
        return false;
      }
      editingId = id;
      view.showFormErrors({});
      view.setFormTask(task);
      return true;
    },

    cancelEdit() {
      leaveEditMode();
    },

    async toggleTask(id) {
      const task = findTask(id);
      if (task === undefined) {
        view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
        return false;
      }
      // Новое значение вычисляется от актуальных данных, а не от текста кнопки.
      return runMutation(
        () => api.setTaskCompleted(id, !task.completed),
        "Статус задачи изменён.",
      );
    },

    async deleteTask(id) {
      return runMutation(async () => {
        await api.deleteTask(id);
        if (editingId === id) {
          leaveEditMode();
        }
      }, "Задача удалена.");
    },

    async resetData() {
      return runMutation(async () => {
        await api.resetDemoData();
        leaveEditMode();
      }, "Учебные данные восстановлены.");
    },

    destroy() {
      activeLoad?.abort();
      activeLoad = null;
      lastLoadId += 1; // ответ, который придёт позже, будет считаться устаревшим
    },
  };
}
