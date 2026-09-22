/**
 * @file tools/track_stdin_leak.js
 * @version 1.0.0-LEAK-DETECTOR-NATIVE
 * @description Прецизионный JS-сканер для поиска скрытых слушателей stdin и readline.
 * Локализует узел, который перехватывает нажатия кнопок до воркера клавиатуры.
 * Выполнен в строгой парадигме PAC / DOD / Zero External Dependencies.
 */

import fs from "node:fs";
import path from "node:path";

const TARGET_DIR = path.resolve(process.cwd(), "./src");

function findStdinListeners() {
    if (process.stdout) {
        process.stdout.write("\n[INPUT_LEAK_SCAN_START] Сканирование директории: " + TARGET_DIR + "\n");
        process.stdout.write("---------------------------------------------------------------------------\n");
    }

    let filesScanned = 0;
    let entriesFound = 0;

    function walk(currentPath) {
        const stats = fs.statSync(currentPath);
        
        if (stats.isDirectory()) {
            const items = fs.readdirSync(currentPath);
            for (let i = 0; i < items.length; i++) {
                walk(path.join(currentPath, items[i]));
            }
        } else if (stats.isFile()) {
            const ext = path.extname(currentPath);
            if (ext === ".js") {
                filesScanned++;
                const rawText = fs.readFileSync(currentPath, "utf8");
                
                // Ищем ключевые системные маркеры низкоуровневого ввода Node.js
                if (rawText.includes("stdin") || rawText.includes("readline") || rawText.includes("keypress")) {
                    const lines = rawText.split("\n");
                    
                    for (let idx = 0; idx < lines.length; idx++) {
                        const cleanLine = lines[idx].trim();
                        
                        const hasListener = cleanLine.includes(".on(") || cleanLine.includes("createInterface");
                        const hasInputToken = cleanLine.includes("stdin") || cleanLine.includes("keypress");
                        
                        if (hasListener && hasInputToken) {
                            entriesFound++;
                            const relPath = path.relative(process.cwd(), currentPath);
                            if (process.stdout) {
                                process.stdout.write("[НАЙДЕН СЛУШАТЕЛЬ ВХОДА #" + entriesFound + "]\n");
                                process.stdout.write("  -> Моду|ль: " + relPath + " (Строка " + (idx + 1) + ")\n");
                                process.stdout.write("  -> Код:    " + cleanLine + "\n");
                                process.stdout.write("---------------------------------------------------------------------------\n");
                            }
                        }
                    }
                }
            }
        }
    }

    if (fs.existsSync(TARGET_DIR)) {
        walk(TARGET_DIR);
    }

    if (process.stdout) {
        process.stdout.write("[INPUT_LEAK_SCAN_COMPLETED] Операция успешно завершена.\n");
        process.stdout.write("  -> Просканировано JS-файлов: " + filesScanned + " ед.\n");
        process.stdout.write("  -> Обнаружено точек съема ввода: " + entriesFound + " ед.\n\n");
    }
}

findStdinListeners();
