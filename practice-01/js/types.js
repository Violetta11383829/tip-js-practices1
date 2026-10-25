"use strict";

// Задание 2. Исследование типов и преобразований.
// Для каждого выражения выводятся его значение и тип результата.
// Выражения 9 и 10: значение выражения typeof ... и тип самого этого значения.

console.log('1. "8" + 2 =', "8" + 2, "| тип результата:", typeof ("8" + 2));
console.log('2. "8" - 2 =', "8" - 2, "| тип результата:", typeof ("8" - 2));
console.log('3. Number("8") + 2 =', Number("8") + 2, "| тип результата:", typeof (Number("8") + 2));
console.log('4. "12" > "3" =', "12" > "3", "| тип результата:", typeof ("12" > "3"));
console.log('5. 12 === "12" =', 12 === "12", "| тип результата:", typeof (12 === "12"));
console.log('6. Number("") =', Number(""), "| тип результата:", typeof Number(""));
console.log('7. Number("text") =', Number("text"), "| тип результата:", typeof Number("text"));
console.log('8. Boolean("false") =', Boolean("false"), "| тип результата:", typeof Boolean("false"));
console.log("9. typeof null =", typeof null, "| тип результата:", typeof typeof null);
console.log("10. typeof NaN =", typeof NaN, "| тип результата:", typeof typeof NaN);
