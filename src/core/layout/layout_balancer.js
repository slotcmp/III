/**
 * @file src/core/layout/layout_balancer.js
 * @version 3.2.0-RELEASE-SMO-BALANCER-CLI-RESCUED
 * @description Калибровщик и балансировщик швов флекс-сетки интерфейса (Control-контур).
 * ИСПРАВЛЕН CLI: Расчет переведен на строгую реверсивную схему снизу вверх для ликвидации вытеснения панелей.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Корректирует и выравнивает абсолютные координаты панелей в ОЗУ-реестре под физическое дно терминала
 * @param {Object} geoMap Ссылка на плоский ОЗУ-реестр вычисленных координат
 * @param {number} maxRowsNum Физическая высота консоли (process.stdout.rows)
 * @param {number} maxColsNum Физическая ширина консоли (process.stdout.columns)
 */
export function balanceGeometryMap(geoMap, maxRowsNum, maxColsNum) {
    if (!geoMap || !geoMap["root"]) return;

    const maxH = Math.max(10, Math.floor(maxRowsNum || 30));
    const maxW = Math.max(40, Math.floor(maxColsNum || 120));

    // Извлекаем дескрипторы всех панелей из плоского реестра ОЗУ
    const s101 = geoMap["101"]; // Дашборд
    const s102 = geoMap["102"]; // Левый Проводник
    const s103 = geoMap["103"]; // Правый Проводник
    const s106 = geoMap["106"]; // Панель Тем
    const s105 = geoMap["105"]; // Командная строка (CLI)
    const s108 = geoMap["108"]; // Системный журнал (Логгер)
    const sWork = geoMap["main_workspace"];
    const sSidebar = geoMap["right_sidebar"];

    // =================================================================
    // СТРОГИЙ РЕВЕРСИВНЫЙ РАСЧЕТ СТРАТЫ СНИЗУ ВВЕРХ
    // =================================================================
    
    // 1. Фиксируем Системный Логгер (Слот 108) на самом дне экрана
    if (s108) {
        s108.h = Math.max(3, Math.floor(maxH * 0.18)); // Выделяем честные ~18% высоты под логи
        s108.x = 0;
        s108.w = maxW;
        s108.y = maxH - s108.h; // Прижимаем к нижней строке
    }

    // 2. Ставим Командную строку (Слот 105) СТРОГО НАД логгером
    if (s105 && s108) {
        s105.h = 3; // Фиксированная TUI-высота для строки ввода по канону оригинала
        s105.x = 0;
        s105.w = maxW;
        s105.y = s108.y - s105.h; // Размещаем над Слотом 108
    }

    // 3. Ставим Дашборд (Слот 101) на самую верхнюю строчку терминала
    if (s101) {
        s101.y = 0;
        s101.x = 0;
        s101.w = maxW;
        s101.h = 5; // Фиксированная высота линеек и монитора
    }

    // 4. Весь остаток свободного пространства ОЗУ отдаем центральному воркспейсу
    const topLimitY = s101 ? s101.h : 0;
    const botLimitY = s105 ? s105.y : (s108 ? s108.y : maxH);
    const usableWorkspaceH = Math.max(2, botLimitY - topLimitY);

    if (sWork) {
        sWork.y = topLimitY;
        sWork.x = 0;
        sWork.w = maxW;
        sWork.h = usableWorkspaceH;
    }

    // =================================================================
    // ГОРИЗОНТАЛЬНАЯ КАЛИБРОВКА ПАНЕЛЕЙ ВОРКСПЕЙСА (По оси X)
    // =================================================================
    const leftW = Math.floor((maxW * 35) / 100);  // 35% под левый эксплорер
    const midW = Math.floor((maxW * 35) / 100);   // 35% под правый эксплорер
    const rightW = Math.max(5, maxW - leftW - midW); // Все остальное (30%) под боковую панель тем

    if (s102) {
        s102.x = 0;
        s102.y = topLimitY;
        s102.w = leftW;
        s102.h = usableWorkspaceH;
    }

    if (s103) {
        s103.x = leftW;
        s103.y = topLimitY;
        s103.w = midW;
        s103.h = usableWorkspaceH;
    }

    if (sSidebar) {
        sSidebar.x = leftW + midW;
        sSidebar.y = topLimitY;
        sSidebar.w = rightW;
        sSidebar.h = usableWorkspaceH;
    }

    if (s106 && sSidebar) {
        s106.x = sSidebar.x;
        s106.y = sSidebar.y;
        s106.w = sSidebar.w;
        s106.h = sSidebar.h;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/layout_balancer.js
 * Время модификации: 21.08.2026 18:52:10 MSK
 */
