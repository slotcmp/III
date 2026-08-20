#!/usr/bin/env node

/**
 * slotCmp Context Stitcher v1.0.1 (ESM Edition)
 * Paradigm: 0% OOP / 0% try-catch / 0% RegExp / Pure DOD / High Performance
 */

import fs from 'node:fs';
import path from 'node:path';

// Статическая конфигурация без вызова конструкторов классов
const CONFIG = {
    outputFile: 'slotcmp_monolith.txt',
    allowedExtensions: ['.js', '.json', '.md', '.jsonc'],
    ignoredDirectories: [
        'node_modules',
        '.git',
        '.github',
        'dist',
        'build',
        'temp',
        'generated'
    ],
    ignoredFiles: [
        'package-lock.json',
        'smo.log'
    ]
};

// Плоский массив-буфер для сбора путей (чистый DOD-style)
const filesToProcess = [];
let totalBytes = 0;

/**
 * Рекурсивный обход дерева каталогов
 * Без try/catch. Санитария через прямые инлайновые ветвления `if`.
 * Вместо RegExp — строгое посимвольное и покомпонентное сравнение строк.
 */
function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const count = entries.length;

    for (let i = 0; i < count; i++) {
        const entry = entries[i];
        const name = entry.name;

        if (entry.isDirectory()) {
            // Линейная проверка игнорируемых директорий
            let skipDir = false;
            for (let j = 0; j < CONFIG.ignoredDirectories.length; j++) {
                if (name === CONFIG.ignoredDirectories[j]) {
                    skipDir = true;
                    break;
                }
            }
            if (!skipDir) {
                scanDirectory(path.join(currentDir, name));
            }
        } else if (entry.isFile()) {
            // Извлечение расширения файла без RegExp
            const ext = path.extname(name);
            let allowed = false;

            // Валидация расширения
            for (let j = 0; j < CONFIG.allowedExtensions.length; j++) {
                if (ext === CONFIG.allowedExtensions[j]) {
                    allowed = true;
                    break;
                }
            }

            // Отсечение заблокированных файлов
            if (allowed) {
                for (let j = 0; j < CONFIG.ignoredFiles.length; j++) {
                    if (name === CONFIG.ignoredFiles[j]) {
                        allowed = false;
                        break;
                    }
                }
            }

            if (allowed) {
                filesToProcess.push(path.join(currentDir, name));
            }
        }
    }
}

/**
 * Точка входа в такт склейки контекста
 */
function stitch() {
    const rootDir = process.cwd();
    
    // 1. Сбор путей файлов в плоский массив
    scanDirectory(rootDir);

    const fileCount = filesToProcess.length;
    if (fileCount === 0) {
        process.stdout.write("❌ Ошибка: Файлы для склейки не найдены.\n");
        process.exit(1);
    }

    // Открываем низкоуровневый системный дескриптор файла на запись
    const outPath = path.join(rootDir, CONFIG.outputFile);
    const fd = fs.openSync(outPath, 'w');

    // Запись мета-заголовка контекста
    fs.writeSync(fd, `=======================================================================\n`);
    fs.writeSync(fd, `SLOTCMP CORE SNAPSHOT: REVISION #0819-STITCHED\n`);
    fs.writeSync(fd, `TIMESTAMP: ${new Date().toISOString()}\n`);
    fs.writeSync(fd, `TOTAL FILES: ${fileCount}\n`);
    fs.writeSync(fd, `=======================================================================\n\n`);

    // 2. Линейный трансфер байт (Zero Garbage Collection)
    for (let i = 0; i < fileCount; i++) {
        const fullPath = filesToProcess[i];
        const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

        // Гвард: не склеиваем монолит сам с собой и пропускаем файл скрипта
        if (relativePath === CONFIG.outputFile || relativePath === 'stitcher.js') {
            continue;
        }

        // Понятный для AI маркер начала нового прибора/файла
        fs.writeSync(fd, `// =======================================================================\n`);
        fs.writeSync(fd, `// FILE: ${relativePath}\n`);
        fs.writeSync(fd, `// =======================================================================\n\n`);

        // Прямой проброс бинарного буфера контента в дескриптор
        const contentBuffer = fs.readFileSync(fullPath);
        fs.writeSync(fd, contentBuffer);
        fs.writeSync(fd, `\n\n`);

        totalBytes += contentBuffer.length;
    }

    // Закрываем дескриптор, фиксируя изменения на диске Windows
    fs.closeSync(fd);

    process.stdout.write(`⚡ Успешно! Склеено файлов: ${fileCount} (${totalBytes} байт).\n`);
    process.stdout.write(`📂 Монолит сохранен в: ${CONFIG.outputFile}\n`);
}

stitch();
