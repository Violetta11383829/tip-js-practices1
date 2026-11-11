export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);
const JSON_MEDIA_TYPE = /^application\/(?:[\w.+-]+\+)?json$/i;

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

// Проверяет baseUrl: абсолютный http/https без query и hash. Возвращает объект URL.
function parseBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть непустой строкой.");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch (error) {
    throw new TypeError("baseUrl должен быть абсолютным адресом.", { cause: error });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("baseUrl должен использовать схему http или https.");
  }
  if (url.search !== "" || url.hash !== "" || baseUrl.includes("?") || baseUrl.includes("#")) {
    throw new TypeError("baseUrl не должен содержать query и hash.");
  }
  return url;
}

// Создаёт URL относительно baseUrl и добавляет непустые параметры query.
// Значения кодируются средствами URL и URLSearchParams, а не вручную.
export function buildUrl(baseUrl, path, query = {}) {
  const url = parseBaseUrl(baseUrl);

  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError("path должен быть непустой строкой.");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new TypeError("path должен быть относительным путём.");
  }
  if (path.includes("?") || path.includes("#")) {
    throw new TypeError("Параметры передаются через query, а не внутри path.");
  }
  if (!isPlainObject(query)) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  // Лишние слэши по краям убираются, чтобы не получить двойной разделитель.
  const basePath = url.pathname.replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  url.pathname = `${basePath}/${relativePath}`;

  for (const [name, value] of Object.entries(query)) {
    // undefined, null и пустая строка пропускаются; false и 0 сохраняются.
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.append(name, String(value));
  }
  return url.toString();
}

// Определяет вид отказа fetch по состоянию сигналов, а не по тексту сообщения.
function classifyFetchFailure(error, { externalSignal, timeoutSignal, url, timeoutMs }) {
  if (externalSignal?.aborted) {
    return new ApiError("Запрос отменён.", { kind: "aborted", url, cause: error });
  }
  if (timeoutSignal.aborted) {
    return new ApiError(`Превышено время ожидания ответа (${timeoutMs} мс).`, {
      kind: "timeout",
      url,
      cause: error,
    });
  }
  return new ApiError("Сетевая ошибка: не удалось выполнить запрос.", {
    kind: "network",
    url,
    cause: error,
  });
}

// Описание HTTP-ошибки берётся из payload.error, если сервер вернул JSON нужной формы.
async function readHttpError(response, url) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Тело не JSON или недоступно: сохраняется только статус.
  }
  const apiError = payload !== null && typeof payload === "object" ? payload.error : null;
  const hasStructure = apiError !== null && typeof apiError === "object";

  const fallbackMessage = `Сервер вернул HTTP ${response.status}${
    response.statusText ? ` (${response.statusText})` : ""
  }.`;
  return new ApiError(
    hasStructure && typeof apiError.message === "string" && apiError.message !== ""
      ? apiError.message
      : fallbackMessage,
    {
      kind: "http",
      status: response.status,
      code: hasStructure && typeof apiError.code === "string" ? apiError.code : null,
      details: hasStructure && apiError.details !== undefined ? apiError.details : null,
      url,
    },
  );
}

// fetchFn передаётся явно, чтобы модуль можно было проверить без реальной сети.
// Возвращаемый объект: { requestJson(path, { method, query, body, signal, timeoutMs } = {}) }.
// Допустимы GET, POST, PATCH и DELETE; успешный ответ 204 преобразуется в null.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  parseBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  if (!isPositiveSafeInteger(timeoutMs)) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  async function requestJson(
    path,
    { method = "GET", query = {}, body, signal, timeoutMs: requestTimeoutMs } = {},
  ) {
    const url = buildUrl(baseUrl, path, query);

    // Метод нормализуется в верхний регистр и проверяется до сетевого запроса.
    const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "";
    if (!ALLOWED_METHODS.has(normalizedMethod)) {
      throw new TypeError("method должен быть GET, POST, PATCH или DELETE.");
    }
    if (normalizedMethod === "GET" && body !== undefined) {
      throw new TypeError("Запрос GET не должен содержать body.");
    }

    // Тело сериализуется один раз; Content-Type добавляется только при наличии тела.
    const headers = { Accept: "application/json" };
    let serializedBody;
    if (body !== undefined) {
      try {
        serializedBody = JSON.stringify(body);
      } catch (error) {
        throw new TypeError("body нельзя преобразовать в JSON.", { cause: error });
      }
      if (serializedBody === undefined) {
        throw new TypeError("body нельзя преобразовать в JSON.");
      }
      headers["Content-Type"] = "application/json";
    }

    const limitMs = requestTimeoutMs ?? timeoutMs;
    if (!isPositiveSafeInteger(limitMs)) {
      throw new TypeError("timeoutMs должен быть положительным целым числом.");
    }
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("signal должен быть экземпляром AbortSignal.");
    }

    // Один сигнал для fetch: сработает либо тайм-аут, либо внешняя отмена.
    const timeoutSignal = AbortSignal.timeout(limitMs);
    const combinedSignal =
      signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
    const context = { externalSignal: signal, timeoutSignal, url, timeoutMs: limitMs };

    // Отдельный try только для получения Response: ошибки разбора сюда не попадают.
    let response;
    try {
      response = await fetchFn(url, {
        method: normalizedMethod,
        headers,
        ...(serializedBody === undefined ? {} : { body: serializedBody }),
        signal: combinedSignal,
      });
    } catch (error) {
      throw classifyFetchFailure(error, context);
    }

    if (!(response instanceof Response)) {
      throw new ApiError("Функция запроса вернула не Response.", {
        kind: "invalid-response",
        url,
      });
    }

    // Сначала HTTP-ошибка: для неё тип содержимого может быть любым.
    if (!response.ok) {
      throw await readHttpError(response, url);
    }

    if (response.status === 204) {
      return null;
    }

    const mediaType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!JSON_MEDIA_TYPE.test(mediaType)) {
      throw new ApiError(
        `Ожидался JSON, получен Content-Type: ${mediaType === "" ? "не указан" : mediaType}.`,
        { kind: "invalid-response", status: response.status, url },
      );
    }

    try {
      return await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApiError("Ответ содержит повреждённый JSON.", {
          kind: "invalid-response",
          status: response.status,
          url,
          cause: error,
        });
      }
      // Тайм-аут или отмена во время чтения тела.
      throw classifyFetchFailure(error, context);
    }
  }

  return { requestJson };
}
