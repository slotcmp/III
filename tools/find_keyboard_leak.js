/**
 * @file tools/find_keyboard_leak.js
 * @version 1.0.0-DIAGNOSTIC-NODEJS-NATIVE
 * @description Высокоскоростной JS-сканер ОЗУ-кода ядра хоста для Node.js.
 * Локализует точку перехвата и подмены адресации воркера на Слот 105.
 * Выполнен в строгой парадигме PAC / DOD / Zero External Dependencies.
 */

import fs from "node:fs";
import path from "node:path";

const TARGET_DIR = path.resolve(process.cwd(), "./src/core");

function scanCoreFiles() {
    if (process.stdout) {
        process.stdout.write("\n[NODEJS_SCAN_START] Сканирование директории: " + TARGET_DIR + "\n");
        process.stdout.write("---------------------------------------------------------------------------\n");
    }

    let filesScanned = 0;
    let leaksFound = 0;

    if (!fs.existsSync(TARGET_DIR)) {
        if (process.stdout) {
            process.stdout.write("[CRITICAL_ERR] Директория " + TARGET_DIR + " физически отсутствует на диске!\n");
        }
        return;
    }

    function walk(currentPath) {
        const stats = fs.statSync(currentPath);
        
        if (stats.isDirectory()) {
            const items = fs.readdirSync(currentPath);
            const len = items.length;
            for (let i = 0; i < len; i++) {
                walk(path.join(currentPath, items[i]));
            }
        } else if (stats.isFile()) {
            const ext = path.extname(currentPath);
            if (ext === ".js" || ext === ".json") {
                filesScanned++;
                const rawText = fs.readFileSync(currentPath, "utf8");
                
                if (rawText.includes("KEYBOARD_ACTION_READY") || rawText.includes("105")) {
                    const lines = rawText.split("\n");
                    const linesLen = lines.length;
                    
                    for (let idx = 0; idx < linesLen; idx++) {
                        const cleanLine = lines[idx].trim();
                        
                        // Маркер А: Прием пакета от воркера клавиатуры
                        const hasToken = cleanLine.includes("KEYBOARD_ACTION_READY");
                        // Маркер Б: Силовая подстановка Слота 105 в контексте обработки клавиатурных событий
                        const hasOverride = cleanLine.includes("105") && 
                                            (cleanLine.includes("slotId") || 
                                             cleanLine.includes("target") || 
                                             cleanLine.includes("focused") || 
                                             cleanLine.includes("intent"));
                        
                        if (hasToken || hasOverride) {
                            leaksFound++;
                            const relPath = path.relative(process.cwd(), currentPath);
                            if (process.stdout) {
                                process.stdout.write("[НАЙДЕНO ВХOЖДЕНИЕ #" + leaksFound + "]\n");
                                process.stdout.write("  -> Модуль: " + relPath + " (Строка " + (idx + 1) + ")\n");
                                process.stdout.write("  -> Код:    " + cleanLine + "\n");
                                process.stdout.write("---------------------------------------------------------------------------\n");
                            }
                        }
                    }
                }
            }
        }
    }

    walk(TARGET_DIR);

    if (process.stdout) {
        process.stdout.write("[NODEJS_SCAN_COMPLETED] Операция завершена успешно.\n");
        process.stdout.write("  -> Проверено модулей ядра: " + filesScanned + " ед.\n");
        process.stdout.write("  -> Локализовано потенциальных утечек: " + leaksFound + " ед.\n\n");
    }
}

scanCoreFiles();
