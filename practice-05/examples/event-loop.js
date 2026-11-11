const log = (label) => console.log(label);

log("A: синхронный код");

setTimeout(() => {
  log("F: задача таймера");
}, 0);

Promise.resolve().then(() => {
  log("D: обработчик Promise");
});

// Собственный обработчик (задание 6.2): стоит сразу после D и до вызова async-функции.
Promise.resolve().then(() => {
  log("G: собственный обработчик Promise");
});

async function demonstrateAwait() {
  log("B: начало async-функции");
  await null;
  log("E: продолжение после await");
}

demonstrateAwait();
log("C: конец синхронного кода");

// До запуска записать прогноз порядка A–F в отчёт, затем объяснить результат.
