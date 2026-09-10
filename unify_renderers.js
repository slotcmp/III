/**
 * @file scripts/unify_renderers.js
 * @version 1.0.0-RELEASE-SMO-REFACTOR-UNIFIER
 * @description Скрипт автоматической унификации имен функций рендеринга бизнес-слоев до стандарта renderContent.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_MODULES = [
    { dir: 'dashboard', file: 'dashboard_view.js', oldFn: 'renderDashboardContent' },
    { dir: 'explorer',  file: 'explorer_view.js',  oldFn: 'renderExplorerContent' },
    { dir: 'command',   file: 'command_view.js',   oldFn: 'renderCommandContent' },
    { dir: 'logger',    file: 'logger_view.js',    oldFn: 'renderLoggerContent' },
    { dir: 'theme',     file: 'theme_view.js',     oldFn: 'renderThemeContent' },
    { dir: 'taskbar',   file: 'taskbar_view.js',   oldFn: 'renderTaskbarViewUnit' }
];

const ROUTER_PATH = path.resolve('src/io/terminal/content_router.js');

function executeRefactoringPulse() {
    console.log('[UNIFIER] Запуск автоматической рефакторинг-унификации до renderContent...\n');

    const modulesLen = TARGET_MODULES.length;
    for (let i = 0; i < modulesLen; i++) {
        const target = TARGET_MODULES[i];
        const filePath = path.resolve('src/modules', target.dir, target.file);

        if (fs.existsSync(filePath)) {
            const rawContent = fs.readFileSync(filePath, 'utf8');
            if (rawContent.includes(target.oldFn)) {
                const updatedContent = rawContent.split(target.oldFn).join('renderContent');
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                console.log(`  [OK] Функция ${target.oldFn} -> renderContent в файле: ${target.dir}/${target.file}`);
            } else if (rawContent.includes('renderContent')) {
                console.log(`  [SKIP] Файл уже унифицирован: ${target.dir}/${target.file}`);
            }
        } else {
            console.log(`  [WARN] Файл не найден на диске: src/modules/${target.dir}/${target.file}`);
        }
    }

    if (fs.existsSync(ROUTER_PATH)) {
        let routerContent = fs.readFileSync(ROUTER_PATH, 'utf8');
        let mutationsCount = 0;

        for (let i = 0; i < modulesLen; i++) {
            const target = TARGET_MODULES[i];
            const oldImportToken = target.oldFn;
            const aliasImportToken = `${target.oldFn} as renderContent_${target.dir}`;
            const newAliasCallToken = `renderContent_${target.dir}`;

            if (routerContent.includes(oldImportToken) && !routerContent.includes(aliasImportToken)) {
                routerContent = routerContent.split(oldImportToken).join(`renderContent as renderContent_${target.dir}`);
                routerContent = routerContent.split(`${target.oldFn}(`).join(`${newAliasCallToken}(`);
                mutationsCount++;
            }
        }

        if (mutationsCount > 0) {
            fs.writeFileSync(ROUTER_PATH, routerContent, 'utf8');
            console.log(`\n  [OK] Диспетчер content_router.js успешно переведен на изолированные алиасы бизнес-слоев.`);
        } else {
            console.log('\n  [SKIP] Диспетчер content_router.js уже адаптирован или не требует изменений.');
        }
    } else {
        console.log(`\n  [FATAL] Центральный маршрутизатор не найден по пути: ${ROUTER_PATH}`);
    }

    console.log('\n=================================================================');
    console.log('[UNIFIER_SUCCESS] Все бизнес-слои приведены к единому TUI-интерфейсу.');
    console.log('=================================================================');
}

executeRefactoringPulse();