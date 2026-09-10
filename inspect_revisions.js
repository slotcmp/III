/**
 * @file inspect_revisions.js
 * @version 1.0.0-RELEASE-METADATA-SCANNER
 * @description Чистый синхронный сканер паспортов ревизий платформы.
 * Вытаскивает строго номера версий и описания без чтения тел файлов.
 * Paradigm: PAC / DOD / 0% OOP / 0% RegExp / 0% External Dependencies.
 */

import fs from "node:fs";
import pathNode from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pathNode.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = pathNode.resolve(__dirname, "./revisions_manifest.txt");

const TARGET_DIRS = ["src", "config"];
const EXCLUDED = ["node_modules", ".git", "revisions_manifest.txt", "inspect_revisions.js", "diagnostic_sniffer.js", "test_direct_render.js"];

let _totalFiles = 0;
let _manifestOut = "============================================================\n" +
                    "МАНЕФЕСТ РЕВИЗИЙ И ВЕРСИЙ ФОРКА ПЛАТФОРМЫ SLOTCMP III\n" +
                    "============================================================\n\n";

/**
 * Парсит первые 500 байт файла на наличие ключевых JSDoc тегов без RegExp
 */
function extractPassportMeta(filePath, relativePath) {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(600);
    let bytesRead = 0;
    
    try {
        bytesRead = fs.readSync(fd, buffer, 0, 600, 0);
    } catch (e) {
        // Защита от пустых файлов
    }
    fs.closeSync(fd);

    if (bytesRead === 0) return;

    const chunkStr = buffer.toString("utf8", 0, bytesRead);
    const lines = chunkStr.split("\n");
    const len = lines.length;

    let ver = "NOT_SPECIFIED";
    let rev = "NOT_SPECIFIED";
    let desc = "NOT_SPECIFIED";

    for (let i = 0; i < len; i++) {
        const line = lines[i].trim();
        
        // Посимвольный разбор строк паспорта без регулярных выражений
        if (line.indexOf("@version") !== -1) {
            ver = line.substring(line.indexOf("@version") + 8).trim();
        } else if (line.indexOf("@revision") !== -1) {
            rev = line.substring(line.indexOf("@revision") + 9).trim();
        } else if (line.indexOf("@description") !== -1) {
            desc = line.substring(line.indexOf("@description") + 12).trim();
        }
    }

    _totalFiles = (_totalFiles + 1) | 0;
    _manifestOut += "#" + _totalFiles + " [" + relativePath + "]\n" +
                    "  -> Версия:   " + ver + "\n" +
                    "  -> Ревизия:  " + rev + "\n" +
                    "  -> Описание: " + desc + "\n" +
                    "------------------------------------------------------------\n";
}

function scanDir(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    const items = fs.readdirSync(currentPath);
    const len = items.length;

    for (let i = 0; i < len; i = (i + 1) | 0) {
        const item = items[i];
        if (EXCLUDED.indexOf(item) !== -1) continue;

        const fullPath = pathNode.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else {
            const ext = pathNode.extname(item).toLowerCase();
            if (ext === ".js" || ext === ".json") {
                const rel = pathNode.relative(__dirname, fullPath).replace(/\\/g, "/");
                extractPassportMeta(fullPath, rel);
            }
        }
    }
}

function runManifestInspection() {
    // Проверка корня
    const rootItems = fs.readdirSync(__dirname);
    for (let i = 0; i < rootItems.length; i++) {
        const item = rootItems[i];
        if (item === "index.js" || item === "package.json") {
            extractPassportMeta(pathNode.join(__dirname, item), item);
        }
    }

    // Проверка дерева
    for (let d = 0; d < TARGET_DIRS.length; d++) {
        const dirPath = pathNode.resolve(__dirname, TARGET_DIRS[d]);
        if (fs.existsSync(dirPath)) scanDir(dirPath);
    }

    fs.writeFileSync(OUTPUT_FILE, _manifestOut, "utf8");
    process.stderr.write("[SUCCESS] Метаданные собраны в: ./revisions_manifest.txt\n");
}

runManifestInspection();
