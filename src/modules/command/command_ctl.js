/**
 * @file src/modules/command/command_ctl.js
 * @version 3.0.1-RELEASE-SMO-COMMAND-CONTROLLER-SYNCHRONOUS
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 105 (Command Line).
 * Синхронно разбирает CLI-команды ввода и маршрутизирует транзакты без try/catch.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createCommandMdlInstance } from "./command_mdl.js";
import { createCommandViewInstance, renderCommandContent } from "./command_view.js";
import { calculateMutation } from "../../io/terminal/common_input_engine.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";
import fs from "node:fs";

/**
 * Фабрика сборки мономорфного состояния PAC-контроллера командной панели
 * @param {Object} appHostRef Ссылка на ядро хоста приложения
 * @param {string} slotIdStr Идентификатор целевого слота
 * @returns {Object} Запечатанная структура контроллера
 */
export function createCommandController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "105");
    const ctlState = { mdl: createCommandMdlInstance(), view: createCommandViewInstance(id), host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 105
 * @param {Object} facilityState Состояние активного прибора СМО
 * @param {string} intentStr Идентификатор прерывания
 * @param {Object} contextPayload Контекст транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций
 */
export function processSpecificCommandLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const mdl = pack.mdl;
    const view = pack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    // СМО-ФАЗА ОТРЕСОВКИ: Полностью СИНХРОННЫЙ вызов отрисовщика из статического импорта
    if (intent === "SMO_PHASE_CONTENT") {
        renderCommandContent(view, mdl);
        return true;
    }

    const maxBufferLen = 256;

    switch (intent) {
        case "KEY_PRESSED":
            if (contextPayload && contextPayload.char) {
                const patch = calculateMutation("TYPE_CHAR", contextPayload.char, mdl);
                if (patch) {
                    mdl.buffer = String(patch.buffer);
                    mdl.cursor = Math.floor(patch.cursor);
                    mdl.textLength = mdl.buffer.length; 
                    mdl.cursorX = mdl.cursor;
                    
                    const charCount = mdl.buffer.length;
                    for (let i = 0; i < charCount; i++) {
                        mdl.charBuffer[i] = mdl.buffer.charAt(i);
                    }
                    mdl._isDirty = true; 
                    isMutated = true;
                }
            }
            break;

        case "BACKSPACE_PRESSED":
            const patchBs = calculateMutation("BACKSPACE", null, mdl);
            if (patchBs) {
                mdl.buffer = String(patchBs.buffer);
                mdl.cursor = Math.floor(patchBs.cursor);
                mdl.textLength = mdl.buffer.length; 
                mdl.cursorX = mdl.cursor;
                mdl.charBuffer[mdl.buffer.length] = " ";
                
                const charCountBs = mdl.buffer.length;
                for (let i = 0; i < charCountBs; i++) {
                    mdl.charBuffer[i] = mdl.buffer.charAt(i);
                }
                mdl._isDirty = true; 
                isMutated = true;
            }
            break;

        case "ENTER_PRESSED":
            const rawCmd = mdl.buffer.trim();
            if (rawCmd.length > 0) {
                const spaceIdx = rawCmd.indexOf(" ");
                const cmdToken = (spaceIdx !== -1) ? rawCmd.substring(0, spaceIdx).toLowerCase() : rawCmd.toLowerCase();
                const argToken = (spaceIdx !== -1) ? rawCmd.substring(spaceIdx + 1).trim() : "";

                if (cmdToken === "clear") {
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[CLI_SHELL] Буфер консоли очищен");
                } else if (cmdToken === "mkdir" && argToken.length > 0) {
                    // Превентивный гвард заменяет try/catch для защиты от сбоев ФС
                    if (!fs.existsSync(argToken)) {
                        fs.mkdirSync(argToken, { recursive: true });
                        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[CLI_SHELL] Создана директория: " + argToken);
                    } else {
                        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[CLI_SHELL] Ошибка mkdir: Директория уже существует");
                    }
                } else if (cmdToken === "cd" && argToken.length > 0) {
                    if (facilityState.host?.workerGateway?.triggerDirectoryIndexing) {
                        facilityState.host.workerGateway.triggerDirectoryIndexing("102", argToken, 0);
                        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[CLI_SHELL] Переход в директорию: " + argToken);
                    }
                } else {
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[CLI_SHELL] Неизвестная команда: " + cmdToken);
                }

                mdl.buffer = ""; 
                mdl.cursor = 0; 
                mdl.textLength = 0; 
                mdl.cursorX = 0;
                for (let i = 0; i < maxBufferLen; i++) {
                    mdl.charBuffer[i] = " ";
                }
                mdl._isDirty = true; 
                isMutated = true;
            }
            break;
    }
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/command/command_controller.js
 * Время модификации: 18.08.2026 17:15:30 MSK
 */
