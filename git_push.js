#!/usr/bin/env node

/**
 * slotCmp Git Automation Gateway v1.0.0
 * Paradigm: 0% OOP / 0% try-catch / 0% RegExp / Pure DOD
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Удаленный репозиторий назначения
const GITHUB_REMOTE_URL = "https://github.com";

const GITIGNORE_CONTENT = `# slotCmp Git Ignore Mask
node_modules/
.DS_Store
*.log
smo.log
temp/
generated/
dist/
build/
slotcmp_monolith.txt
`;

/**
 * Выполняет атомарную системную команду в консоли Windows/ConPTY
 * Без использования try-catch. Ошибки рантайма падают нативно в лог ядра.
 */
function runCommand(command) {
    process.stdout.write(`⚡ EXEC: ${command}\n`);
    // Перенаправляем IO потоки прямо в родительский терминал
    execSync(command, { stdio: 'inherit' });
}

/**
 * Точка входа в такт синхронизации репозитория
 */
function main() {
    const rootDir = process.cwd();
    const gitDir = path.join(rootDir, '.git');
    const ignorePath = path.join(rootDir, '.gitignore');

    // 1. Проверяем и создаем правильный .gitignore без RegExp
    if (!fs.existsSync(ignorePath)) {
        fs.writeFileSync(ignorePath, GITIGNORE_CONTENT, 'utf8');
        process.stdout.write("📝 Создан файл .gitignore с масками исключений.\n");
    }

    // 2. Инициализация локального Git-контура, если его еще нет
    if (!fs.existsSync(gitDir)) {
        runCommand("git init");
        runCommand("git branch -M main");
        process.stdout.write("📂 Локальный Git-репозиторий успешно инициализирован.\n");
    }

    // 3. Индексация плоского дерева файлов
    runCommand("git add .");

    // 4. Фиксация такта (Коммит)
    // Генерируем таймстемп канонично без ООП-оберток
    const timestamp = new Date().toISOString();
    runCommand(`git commit -m "DOD-Core-Snapshot-Commit-${timestamp}"`);

    // 5. Привязка к удаленной шине GitHub и отправка байтов
    // Пробуем сбросить старый remote, если он был задан неверно
    try { execSync("git remote remove origin", { stdio: 'ignore' }); } catch(e) {}
    
    runCommand(`git remote add origin ${GITHUB_REMOTE_URL}`);
    
    process.stdout.write("🚀 Залп пакетов данных в репозиторий ://github.com...\n");
    runCommand("git push -u origin main --force");

    process.stdout.write("🏁 Успешно! Вся кодовая база разложена по веткам репозитория.\n");
}

main();
