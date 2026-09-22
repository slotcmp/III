/**
 * @file src/core/smo/simulation_bench.js
 * @version 2.0.5-DEBUG-IDD-DEEP-DUMP
 * @description Стенд глубокого DOD-аудита адресного пространства PAC-триад Слота 104.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { _gpssEngineState } from "./bus.js";
import { processSystemVScrollbarLogic } from "../../system/vscrollbar/vscrollbar_ctl.js";
import { processSpecificFnbarLogic } from "../../modules/fnbar/fnbar_ctl.js";
import { renderContent } from "../../modules/fnbar/fnbar_view.js";

function forceHydrateTestEnvironmentV5() {
    const registry = _gpssEngineState.facilitiesRegistry;

    // Имитируем реальное поведение ядра: разворачиваем РАЗДЕЛЬНЫЕ модели во viewStack,
    // чтобы проверить, куда именно уходит запись при смещении индексов Window Manager
    if (!registry.has("104")) {
        const createModelLayer = () => {
            const m = {
                activeModifierIdx: 0,
                _activeSubZone: 0,
                _isDirty: false,
                menuMatrix: [
                    ["F1_Help", "F2_Menu", "F3_View", "F4_Edit", "F5_Copy", "F6_RenM", "F7_MkD", "F8_Del", "F9_Conf", "F10_Exit"],
                    ["C1_Left", "C2_Righ", "C3_Ver ", "C4_Edit", "C5_Prin", "C6_Link", "C7_Find", "C8_Hist", "C9_Vide", "C10_Tree"],
                    ["S1_Help", "S2_User", "S3_Cmd ", "S4_Arch", "S5_Copy", "S6_RenM", "S7_MkD", "S8_Del", "S9_Save", "S10_Last"],
                    ["A1_Left", "A2_Righ", "A3_View", "A4_Hex ", "A5_Pack", "A6_Unpa", "A7_Find", "A8_Hist", "A9_Vide", "A10_Tree"]
                ]
            };
            Object.preventExtensions(m);
            return m;
        };

        const mockFnbar = {
            id: "104",
            componentType: "fnbar",
            activeStackIdx: 0,
            viewStack: [
                { mdl: createModelLayer(), view: { height: 1 } },
                { mdl: createModelLayer(), view: { height: 1 } },
                { mdl: createModelLayer(), view: { height: 1 } },
                { mdl: createModelLayer(), view: { height: 1 } }
            ]
        };
        registry.set("104", mockFnbar);
    }

    if (!registry.has("200")) {
        registry.set("200", { id: "200", componentType: "tabsbar", activeStackIdx: 0, viewStack: [] });
    }

    if (!registry.has("14")) {
        registry.set("14", {
            id: "14",
            mdl: {
                viewportOffsetRegistry: new Int16Array(256),
                selectedIndexRegistry:  new Int16Array(256),
                totalItemsRegistry:     new Int16Array(256),
                maxVisibleRowsRegistry: new Uint8Array(256)
            }
        });
    }
}

export function runIddScrollDiagnosticBench() {
    console.log("\n====================================================");
    console.log("[IDD_TEST_BENCH] ЗАПУСК СТЕНДА ГЛУБОКОГО АУДИТА ОЗУ V5...");
    console.log("====================================================");

    forceHydrateTestEnvironmentV5();

    const fnbar = _gpssEngineState.facilitiesRegistry.get("104");
    const vscrollbar = _gpssEngineState.facilitiesRegistry.get("14");

    console.log("ГЛУБИНА СТЭКА TRIADS В СЛОТЕ 104:", fnbar.viewStack.length, "элементов.");
    console.log("СТАРТОВЫЙ ИНДЕКС WM (activeStackIdx):", fnbar.activeStackIdx);
    console.log("СТАРТОВЫЙ РЕГИСТР _activeSubZone ТРИАДЫ [0]:", fnbar.viewStack[0].mdl._activeSubZone);

    // =================================================================
    // СИМУЛЯЦИЯ ИМПУЛЬСА: КРУТИМ КОЛЕСИКО ВНИЗ СТРОГО 1 РАЗ
    // =================================================================
    console.log("\n>>> СИМУЛЯЦИЯ: Вращение колесика мыши (WHEEL_DOWN) над ушками 200 >>>");
    
    const mockPayload = { targetSlotId: "200" };
    Object.preventExtensions(mockPayload);

    // Шаг 1: Отрабатывает Канал 14 (vscrollbar_ctl), смещая активный индекс фасилити в 1
    processSystemVScrollbarLogic(vscrollbar, "SCROLL_TABS_DOWN", mockPayload, null);
    
    console.log("\n[ПОСЛЕ СКРОЛЛА] Состояние регистров Window Manager:");
    console.log("   -> Текущий активный индекс СМО фасилити 104:", fnbar.activeStackIdx);

    // Шаг 2: Шина вызывает процесс обработки интента для Слота 104
    const nextModIdx = fnbar.activeStackIdx;
    processSpecificFnbarLogic(fnbar, "KEYBOARD_MODIFIER_CHANGED", { modifierIdx: nextModIdx }, null);

    console.log("\n[ПОСЛЕ ОБРАБОТКИ ИНТЕНТА] Дамп регистров ОЗУ моделей во viewStack:");
    for (let idx = 0; idx < fnbar.viewStack.length; idx++) {
        console.log(`   -> Триада [${idx}]: _activeSubZone = ${fnbar.viewStack[idx].mdl._activeSubZone}, _isDirty = ${fnbar.viewStack[idx].mdl._isDirty}`);
    }

    // Шаг 3: Симулируем вызов отрисовщика ядра, как это делает реальный EXECUTE_RENDER
    console.log("\n>>> СИМУЛЯЦИЯ ЯДРА: Вызов fnbar_view.renderContent для текущей активной триады >>>");
    
    // Создаем мок двумерной матрицы кадра (1 строка, 120 ячеек)
    const mockMatrix = [new Int32Array(120)];
    
    // Ядро берет триаду по текущему смещенному индексу WM!
    const activeTriadForRender = fnbar.viewStack[fnbar.activeStackIdx];
    
    renderContent(mockMatrix, 120, 1, activeTriadForRender.mdl, fnbar.activeStackIdx, "104", fnbar.viewStack);

    console.log("\n====================================================");
    console.log("[IDD_TEST_BENCH] ТЕСТИРОВАНИЕ ЗАВЕРШЕНО.");
    console.log("====================================================\n");
}
