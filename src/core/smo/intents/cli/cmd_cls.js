/**
 * @file src/core/smo/intents/cli/cmd_cls.js
 * @version 1.0.0-RELEASE-SMO-DOD-CMD-CLS
 * @description Изолированная процедура очистки журнала Системного Логгера (Слот 108).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../../bus.js";

/**
 * Выполняет транзакционный сброс текстовых массивов Канала 108
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function reduceCmdCls(kernel) {
    // 1. Выстреливаем изолированный приказ очистки памяти на Канал 108
    generateGpssTransaction("108", "CLEAR_LOG_BUFFER", null, "0");
    
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    
    const successLogStr = "[" + h + ":" + m + ":" + s + " Msk] [SYSTEM_CLI] Журнал успешно зачищен пользователем.\n";
    
    // 2. Пишем стартовый маркер в уже чистый журнал логгера
    generateGpssTransaction("108", "ADD_LOG_ENTRY", successLogStr, "0");
    
    // 3. Пинаем Window Manager на немедленный рендер UHD-кадра
    generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli/cmd_cls.js
 */
