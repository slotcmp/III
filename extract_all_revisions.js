/**
 * @file extract_all_revisions.js
 * @version 1.0.0-RELEASE-DIAGNOSTIC-EXTRACTOR
 * @description Синхронный DOD-инспектор и консолидатор кодовой базы форка.
 * Собирает паспорта всех модулей в единый плоский txt-файл для отправки.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% Dependencies.
 */

import fs from "node:fs";
import pathNode from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pathNode.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = pathNode.resolve(__dirname, "./fork_revisions_dump.txt");

// Список папок для обязательного сквозного сканирования
const TARGET_DIRS = ["src", "config"];
const EXCLUDED_NAMES = ["node_modules", ".git", "fork_revisions_dump.txt", "extract_all_revisions.js"];

let _totalFilesProcessed = 0;
let _accumulatedDumpStr = "";

/**
 * Рекурсивный DOD-обход дерева директорий без ООП-абстракций
 */
function scanDirectoryRecursive(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    
    const items = fs.readdirSync(currentPath);
    const len = items.length;

    for (let i = 0; i < len; i = (i + 1) | 0) {
        const item = items[i];
        if (EXCLUDED_NAMES.indexOf(item) !== -1) continue;

        const fullPath = pathNode.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectoryRecursive(fullPath);
        } else {
            const ext = pathNode.extname(item).toLowerCase();
            if (ext === ".js" || ext === ".json") {
                _processSingleFile(fullPath, stat);
            }
        }
    }
}

/**
 * Атомарный разбор файла и извлечение паспорта ревизии
 */
function _processSingleFile(filePath, stat) {
    const relativePath = pathNode.relative(__dirname, filePath).replace(/\\/g, "/");
    const rawContentStr = fs.readFileSync(filePath, "utf8");
    
    _totalFilesProcessed = (_totalFilesProcessed + 1) | 0;

    // Впекаем каноническую шапку-разделитель для ИИ-конвейера
    _accumulatedDumpStr += "\n\n@@@@ FILE_START: " + relativePath + " @@@@\n";
    _accumulatedDumpStr += "/**\n";
    _accumulatedDumpStr += " * @path " + relativePath + "\n";
    _accumulatedDumpStr += " * @sys_mtime " + stat.mtime.toISOString() + "\n";
    _accumulatedDumpStr += " */\n\n";
    
    _accumulatedDumpStr += rawContentStr;
    _accumulatedDumpStr += "\n@@@@ FILE_END: " + relativePath + " @@@@\n";
}

function runGlobalExtraction() {
    process.stderr.write("[EXTRACTOR] Старт агрегации ревизий форка SLOTCMP III...\n");
    
    // Сканируем корень на случай наличия index.js / package.json
    const rootItems = fs.readdirSync(__dirname);
    for (let i = 0; i < rootItems.length; i++) {
        const item = rootItems[i];
        const fullPath = pathNode.join(__dirname, item);
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory() && (item === "index.js" || item === "package.json")) {
            _processSingleFile(fullPath, stat);
        }
    }

    // Сканируем целевую архитектуру
    for (let d = 0; d < TARGET_DIRS.length; d = (d + 1) | 0) {
        const dirPath = pathNode.resolve(__dirname, TARGET_DIRS[d]);
        if (fs.existsSync(dirPath)) {
            scanDirectoryRecursive(dirPath);
        }
    }

    // Прямой DOD-выжиг на диск без создания холостых потоков в куче
    fs.writeFileSync(OUTPUT_FILE, _accumulatedDumpStr, "utf8");
    
    process.stderr.write("[SUCCESS] Агрегация завершена! Всего обработано файлов: " + _totalFilesProcessed + "\n");
    process.stderr.write("[SUCCESS] Итоговый слепок ревизий сохранен в: ./fork_revisions_dump.txt\n");
}

runGlobalExtraction();
