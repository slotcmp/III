/**
 * @file test_mouse_click.js
 * @description Стерильный DOD-тест сквозного прохождения кликов мыши на шине GPSS.
 * ИСПРАВЛЕНО: Инжектированы тестовые габариты в calculatedGeoMap для прохождения хит-теста.
 */
import { initializeCoreRuntime, triggerPrimaryGpssPulse } from "./src/core/smo/bootstrap.js";
import { generateGpssTransaction, _gpssEngineState } from "./src/core/smo/bus.js";
import fs from "node:fs";

// 1. Загружаем живые конфигурации проекта
const topology = JSON.parse(fs.readFileSync("./config/layout.json", "utf8"));
const config = JSON.parse(fs.readFileSync("./config/app_config.json", "utf8"));
_gpssEngineState.facilitiesKeysCached = ["200", "101", "102", "103", "104", "105", "106", "108", "100"];

console.log("[TEST_LAUNCH] Инициализация рантайма SLOTCMP III...");
const kernel = initializeCoreRuntime(topology, config, 120, 30);
triggerPrimaryGpssPulse(kernel);

// Продвигаем шину, чтобы завершить IoC-бут
const rootUnit = _gpssEngineState.facilitiesRegistry.get("0");
if (rootUnit && typeof rootUnit.advanceFacility === "function") rootUnit.advanceFacility();

// =================================================================
// ИНЖЕКЦИЯ ТЕСТОВOЙ ГЕOМЕТРИИ ДЛЯ КАНАЛА 10 (Имитируем воркер разметки)
// =================================================================
kernel.calculatedGeoMap["200"] = { x: 0, y: 0,  w: 120, h: 1 };  // Слот 200 на самом верху
kernel.calculatedGeoMap["102"] = { x: 0, y: 1,  w: 48,  h: 15 }; // Левый Проводник под ним

console.log("\n============================================================");
console.log("ТЕСТ 1: Имитация клика по ушку DEFAULT (Слот 200, X=5, Y=0)");
console.log("============================================================");

// Вбрасываем мышиное прерывание на Канал 10
const mockPayload200 = { x: 5, y: 0, action: "MOUSE_CLICK" };
generateGpssTransaction("10", "MOUSE_CLICK", mockPayload200, "200");

// Тактуем мышиный воркер (Канал 10)
const mouseUnit = _gpssEngineState.facilitiesRegistry.get("10");
if (mouseUnit && typeof mouseUnit.advanceFacility === "function") {
    const mutated = mouseUnit.advanceFacility();
    console.log(" -> Результат продвижения Канала 10:", mutated ? "МУТАЦИЯ УСПЕШНА ✅" : "ПАССИВНЫЙ СБРОС ❌");
}

// Тактуем менеджер вкладок (Канал 12)
const tabUnit = _gpssEngineState.facilitiesRegistry.get("12");
if (tabUnit && typeof tabUnit.advanceFacility === "function") {
    const mutated = tabUnit.advanceFacility();
    console.log(" -> Результат продвижения Канала 12 (Вкладки):", mutated ? "ФОКУС ПЕРЕКЛЮЧЕН ✅" : "ИГНОРИРОВАНИЕ ❌");
}

console.log(" -> Текущий focusedSlotId в ядре:", kernel.model?.logicalState?.focusedSlotId);

console.log("\n============================================================");
console.log("ТЕСТ 2: Имитация клика по контенту Проводника (Слот 102, X=10, Y=4)");
console.log("============================================================");

const mockPayload102 = { x: 10, y: 4, action: "MOUSE_CLICK" };
generateGpssTransaction("10", "MOUSE_CLICK", mockPayload102, "102");

if (mouseUnit && typeof mouseUnit.advanceFacility === "function") {
    const mutated = mouseUnit.advanceFacility();
    console.log(" -> Результат продвижения Канала 10 для Слота 102:", mutated ? "ПРОБРОС В ШИНУ ✅" : "СБРОС ❌");
}

// Тактуем контроллер Левого Проводника
const explorerUnit = _gpssEngineState.facilitiesRegistry.get("102");
if (explorerUnit && typeof explorerUnit.advanceFacility === "function") {
    const mutated = explorerUnit.advanceFacility();
    console.log(" -> Результат продвижения Слота 102 (VFS):", mutated ? "СТРОКА ВЫДЕЛЕНА ✅" : "ИГНОРИРОВАНИЕ ❌");
}

console.log("============================================================\n");
