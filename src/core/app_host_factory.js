/**
 * @file src/core/app_host_factory.js
 * @version 8.3.0-RELEASE-SMO-HOST-FACTORY-DECOMPOSED
 * @description Фабрика сборки ОЗУ-состояния ядра (PAC / Abstraction).
 * ИСПРАВЛЕНО: Полностью размоноличен на шаги в папке app_host_steps для защиты от лимитов V8.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { executeViewportBlit as pureBlitFn } from "../io/terminal/blit.js";
import { extractTopologySubZones } from "./app_host_subzones.js";

// Импортируем изолированные процедурные шаги сборщика
import { hostAllocator } from "./app_host_steps/host_allocator.js";
import { channelsMounter } from "./app_host_steps/channels_mounter.js";

/**
 * Создает мономорфную структуру главного рантайма ядра хоста
 */
export function createHostState(busEngineState, loaderPlugin, topologyTree) {
    // Шаг 1: Аллокация анемичного бланка ядра в куче
    const hostState = hostAllocator();

    // Навешиваем методы управления без Dictionary-деоптимизации скрытого класса
    hostState.boot = () => {
        // Шаг 2: Каскадный IoC-монтаж приборов на тактовую шину
        channelsMounter(hostState, loaderPlugin);
        return true;
    };

    hostState.updateGeometryMap = (newGeoMap) => {
        if (newGeoMap) hostState.calculatedGeoMap = newGeoMap;
    };

    hostState.executeViewportBlit = () => {
        if (hostState.virtualCanvasState && hostState.calculatedGeoMap) {
            pureBlitFn(hostState.virtualCanvasState, hostState, hostState.calculatedGeoMap);
        }
    };

    // Шаг 3: Экстракция подзон дерева разметки при наличии топологии
    if (topologyTree) {
        hostState.layoutTopologyTree = topologyTree;
        const rootChildren = topologyTree.children || [];
        extractTopologySubZones(hostState.model.logicalState.activeSubZonesRegistry, rootChildren);
    }
    
    // Намертво фиксируем Hidden Class ядра хоста (0% OOP)
    Object.preventExtensions(hostState.model.logicalState.activeSubZonesRegistry);
    Object.preventExtensions(hostState);
    return hostState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/app_host_factory.js
 * Время изменения: 19.09.2026 01:22:00 MSK
 */
