/**
 * @file src/core/layout/layout_balancer.js
 * @version 2.0.0-RELEASE-SMO-LAYOUT-BALANCER-PROPORTIONAL-FIXED
 * @description Реактивный DOD-калибратор межслотовых швов и флекс-пропорций (Control-контур).
 * ИСПРАВЛЕН СЛОТ 106: Удален жесткий хардкод проводников, панель тем строго зажата в лимит 30% ширины кадра.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

/**
 * Выполняет прецизионное пропорциональное выравнивание стыков окон по сетке layout.json
 * @param {Object} geoMap Ссылка на плоское ОЗУ-зеркало координат _globalRuntimeGeometryRegistry
 * @param {number} totalRows Физическая высота терминала Windows
 * @param {number} totalCols Физическая ширина терминала Windows
 */
export function balanceGeometryMap(geoMap, totalRows, totalCols) {
    if (!geoMap || !geoMap["root"]) return;

    const rootW = Math.max(40, Math.floor(totalCols || 120));
    const rootH = Math.max(10, Math.floor(totalRows || 30));

    // 1. ВЫЧИСЛЕНИЕ ЖИВЫХ ПРОПОРЦИЙ ДЛЯ ЦЕНТРАЛЬНОГО РЯДА (WORKSPACE)
    // Согласно layout.json: 102 (35%), 103 (35%), контейнер sidebar/106 (30%)
    const availWorkspaceW = rootW;
    
    const w102 = Math.floor(availWorkspaceW * 0.35);
    const w103 = Math.floor(availWorkspaceW * 0.35);
    const w106 = availWorkspaceW - w102 - w103; // Чистый, пропорциональный остаток (ровно ~30%)

    // 2. ТОЧЕЧНАЯ ИНЖЕКЦИЯ КООРДИНАТ В ОЗУ-РЕЕСТР ГЕОМЕТРИИ (0% OOP)
    
    // Слот 101 (Dashboard) — забирает всю ширину, высота жестко 7
    if (geoMap["101"]) {
        geoMap["101"].x = 0;
        geoMap["101"].w = rootW;
        geoMap["101"].h = 7;
    }

    // Слот 102 (Левый Проводник) — начинается с левого края
    if (geoMap["102"]) {
        geoMap["102"].x = 0;
        geoMap["102"].w = w102;
    }

    // Слот 103 (Правый Проводник) — встает сразу за Слотом 102
    if (geoMap["103"]) {
        geoMap["103"].x = w102;
        geoMap["103"].w = w103;
    }

    // Слот 106 (Панель Тем) — встает в правый угол, занимая строго свои 30% ширины!
    if (geoMap["106"]) {
        geoMap["106"].x = w102 + w103;
        geoMap["106"].w = w106;
    }

    // Корректируем горизонтальные координаты нижних сервисных приборов
    if (geoMap["105"]) {
        geoMap["105"].x = 0;
        geoMap["105"].w = rootW;
    }
    
    if (geoMap["108"]) {
        geoMap["108"].x = 0;
        geoMap["108"].w = rootW;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/layout_balancer.js
 * Время изменения: 04.09.2026 23:55:14 MSK
 */
