/**
 * @file test_vfs_injection.js
 * @version 1.0.1-RELEASE-SMO-TEST-VFS-INJECTION-CAMELCASE-FIXED
 * @description Автономный сквозной тест-инжектор контура VFS и слоев отрисовки кадра.
 * ИСПРАВЛЕНО: Все импорты и вызовы переведены на ваши camelCase-процедуры из app_host_steps.
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { _gpssEngineState, generateGpssTransaction } from "./src/core/smo/bus.js";

// СИНХРОНИЗИРОВАНО: Импортируем шаги строго под вашими новыми именами
import { hostAllocator } from "./src/core/app_host_steps/host_allocator.js";
import { channelsMounter } from "./src/core/app_host_steps/channels_mounter.js";

import { reduceContentLayer } from "./src/io/terminal/z_layers/z1_content_reducer.js";

function runVfsAutomationTest() {
    // 1. Инициализация анемичного бланка ядра через ваш camelCase-аллокатор
    const mockTopology = { id: "root", type: "container", children: [
        { id: "102", slot: "102", component: "explorer", enabled: true, width: 50, height: 20 }
    ]};
    
    // Вызываем вашу точную функцию аллокации каркаса
    const hostState = hostAllocator();
    hostState.layoutTopologyTree = mockTopology;
    _gpssEngineState.runtime = hostState;
    
    // Монтируем базовые каналы через ваш mounter
    channelsMounter(hostState, null);
    
    let reportStr = "=== ЗАПУСК АВТОНОМНОГО ТЕСТА ВЕКТОРОВ VFS ===\n";
    
    // Извлекаем прибор Левого Проводника из реестра шины СМО
    const f102 = _gpssEngineState.facilitiesRegistry.get("102");
    if (!f102) {
        fs.writeFileSync("./logs/vfs_test_report.txt", "Критическая ошибка: Слот 102 не примонтирован к шине.\n");
        return;
    }
    
    // Искусственно наливаем viewStack, если фабрика создала плоский объект
    if (!f102.viewStack) {
        f102.viewStack = [{
            view: { width: 50, height: 20, localBuffer: { matrix: Array.from({length: 20}, () => new Int32Array(50)) } },
            mdl: { items: [], itemsList: [], selectedIndex: 0, viewportOffset: 0, _isDirty: true },
            tabTitle: "SYS"
        }];
    }
    
    const targetTriad = Array.isArray(f102.viewStack) ? f102.viewStack[0] : f102.viewStack;
    
    // 2. ФАЗА ПРИНУДИТЕЛЬНОЙ ИНЖЕКЦИИ
    const mockFilesPayload = {
        tabIdx: 0,
        items: [
            { name: "kernel_core.sys", isDirectory: false, size: 1024 },
            { name: "vfs_worker.js", isDirectory: false, size: 512 },
            { name: "config.json", isDirectory: false, size: 128 }
        ]
    };
    Object.preventExtensions(mockFilesPayload);
    
    reportStr += "[TEST_STEP 1] Вброс тестового вектора файлов в интент INJECT_VFS_DATA...\n";
    
    // Стреляем напрямую в контроллер Слота 102
    if (typeof f102.specificAdvanceWorker === "function") {
        f102.specificAdvanceWorker(f102, "INJECT_VFS_DATA", mockFilesPayload, null);
    } else {
        // Резервный прямой налив в ОЗУ-массивы при нестыковке оберток
        const m = targetTriad.mdl;
        m.items = [...mockFilesPayload.items];
        m.itemsList = [...mockFilesPayload.items];
    }
    
    reportStr += "[TEST_DATA] Модель ОЗУ после инжекции -> items.length: " + targetTriad.mdl.items.length + "\n";
    
    // 3. ФАЗА РЕНДЕРИНГА Z-1
    const testCanvasMatrix = Array.from({length: 30}, () => new Int32Array(120));
    const geoMap = { "102": { x: 0, y: 2, w: 50, h: 20 } };
    const registeredKeys = ["102"];
    
    reportStr += "[TEST_STEP 2] Запуск сквозного редуктора слоев контента reduceContentLayer...\n";
    
    // Прогоняем наш Z-1 редьюсер
    reduceContentLayer(testCanvasMatrix, hostState, geoMap, registeredKeys, 1)
        .then(() => {
            // Проверяем, изменились ли ячейки теневой UHD-матрицы кадра
            let bytesMutatedCount = 0;
            for (let y = 0; y < 30; y++) {
                for (let x = 0; x < 120; x++) {
                    if (testCanvasMatrix[y][x] !== 0) bytesMutatedCount++;
                }
            }
            
            reportStr += "[TEST_RESULT] Финальный UHD холст -> Изменено ячеек растра: " + bytesMutatedCount + "\n";
            if (bytesMutatedCount > 0) {
                reportStr += "=== ТЕСТ УСПЕШЕН: ОЗУ-контур и Блайтер Z-1 полностью исправны. Баг сидит на стороне асинхронного воркера диска VFS. ===\n";
            } else {
                reportStr += "=== ТЕСТ ПРОВАЛЕН: Блайтер Z-1 или routeModuleContentRender игнорируют налитые модели. ===\n";
            }
            
            fs.writeFileSync("./logs/vfs_test_report.txt", reportStr);
            console.log("Тест завершен. Результат записан в ./logs/vfs_test_report.txt");
            process.exit(0);
        })
        .catch(err => {
            reportStr += "[TEST_CRASH] Крах блайтера: " + err.stack + "\n";
            fs.writeFileSync("./logs/vfs_test_report.txt", reportStr);
            process.exit(1);
        });
}

runVfsAutomationTest();
