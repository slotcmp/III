/**
 * @file refactor_ctl.js
 * @version 1.0.2-RELEASE-SMO-REFACTOR-PROPERTY-BASED
 * @description Скрипт автоматического рефакторинга локальных имен моделей и представлений.
 * ИСПРАВЛЕНА ИНДЕКСАЦИЯ: Переведен на явные именованные свойства .old и .next (0% OOP).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetModulesDir = path.resolve(__dirname, "./src/modules");

/**
 * Выполняет рефакторинг контента файла по фиксированным маскам токенов (0% RegExp)
 * @param {string} content Исходный код файла
 * @returns {string} Модифицированный мономорфный код
 */
function refactorCtlContent(content) {
    let codeStr = String(content);

    // Пары точечной замены структур вложенности на явных DOD-объектах во избежание багов V8
    const tokens = [
        { old: "pack.model", next: "pack.mdl" },
        { old: "pack.presentation", next: "pack.view" },
        { old: "pack.viewState", next: "pack.view" },
        { old: "pack.viewInstance", next: "pack.view" },
        
        { old: "const model =", next: "const mdl =" },
        { old: "const presentation =", next: "const view =" },
        { old: "const viewState =", next: "const view =" },
        { old: "const modelState =", next: "const mdl =" },
        
        { old: "let model =", next: "let mdl =" },
        { old: "let presentation =", next: "let view =" },
        
        { old: "(presentation, model)", next: "(view, mdl)" },
        { old: "(viewState, modelState)", next: "(view, mdl)" },
        { old: "(view, model)", next: "(view, mdl)" },
        { old: "(presentation, mdl)", next: "(view, mdl)" },

        { old: "model.", next: "mdl." },
        { old: "presentation.", next: "view." },
        { old: "viewState.", next: "view." }
    ];

    for (let i = 0; i < tokens.length; i++) {
        // Защищено от искажения: Читаем строго именованные свойства объектов
        const rule = tokens[i];
        const searchStr = rule.old;
        const replaceStr = rule.next;
        
        // Посимвольный цикл замены подстрок без использования регулярных выражений
        let idx = codeStr.indexOf(searchStr);
        while (idx !== -1) {
            codeStr = codeStr.substring(0, idx) + replaceStr + codeStr.substring(idx + searchStr.length);
            idx = codeStr.indexOf(searchStr, idx + replaceStr.length);
        }
    }

    return codeStr;
}

/**
 * Рекурсивный безмусорный обход директории src/modules
 * @param {string} currentDirPath Путь к текущей директории
 */
function scanAndRefactorDirectory(currentDirPath) {
    if (!fs.existsSync(currentDirPath)) return;

    const files = fs.readdirSync(currentDirPath);
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        const fullPath = path.join(currentDirPath, fileName);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanAndRefactorDirectory(fullPath);
        } else if (stat.isFile()) {
            const len = fileName.length;
            // Проверяем суффикс бизнес-контроллера _ctl.js посимвольным срезом строки
            if (len > 7 && fileName.substring(len - 7) === "_ctl.js") {
                const rawContent = fs.readFileSync(fullPath, "utf8");
                const alignedContent = refactorCtlContent(rawContent);

                if (rawContent !== alignedContent) {
                    fs.writeFileSync(fullPath, alignedContent, "utf8");
                    console.log("[REFACTOR_SUCCESS] Модифицирован файл: " + path.relative(__dirname, fullPath));
                }
            }
        }
    }
}

function main() {
    console.log("[REFACTOR_START] Запуск процесса унификации ОЗУ-триады в src/modules...");
    if (!fs.existsSync(targetModulesDir)) {
        console.error("[REFACTOR_ERROR] Директория " + targetModulesDir + " не найдена.");
        process.exit(1);
    }
    scanAndRefactorDirectory(targetModulesDir);
    console.log("[REFACTOR_DONE] Все бизнес-контроллеры приведены к стандарту mdl и view.");
}

main();
