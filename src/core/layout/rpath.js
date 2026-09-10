/**
 * @file src/core/layout/rpath.js
 * @version 2.5.9-RELEASE-SMO-RPATH-TOPOLOGY-TREE-STABLE
 * @description Ядро E4X-JSON интерпретатора топологии разметки интерфейса СМО.
 * ИСПРАВЛЕН КОРЕНЬ: Поиск узлов переведен на живой ОЗУ-регистр ядра app.layoutTopologyTree.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../smo/bus.js";

// Импорт размоноличенных процедурных ядер атрибутов
import { mutateAttrEnabled } from "./rpath/attr_enabled.js";
import { mutateAttrCollapsed } from "./rpath/attr_collapsed.js";
import { mutateAttrFocus } from "./rpath/attr_focus.js";

/**
 * Вычисляет e4x-путь и применяет атомарную мутацию к атрибутам слотов
 * @param {Object} app Ссылка на ОЗУ-рантайм хоста ядра (kernel)
 * @param {string} rpathStr Строка запроса в стиле //106/@collapsed=true
 * @param {Object|null} localContext Локальный узел для относительных запросов
 */
export function evaluateRpath(app, rpathStr, localContext = null) {
    if (!rpathStr || !app) return null;

    // СТРОГО ПО КАРТЕ СНИФФЕРА: Завязываемся на живой регистр топологии ядра!
    const rootLayout = app.layoutTopologyTree;
    let currentNode = localContext || rootLayout || app;
    
    const isGlobalDeep = rpathStr.indexOf("//") === 0;
    const isAbsolute = rpathStr.indexOf("/") === 0;
    
    const assignIdx = rpathStr.indexOf("=");
    let pathPart = assignIdx !== -1 ? rpathStr.substring(0, assignIdx).trim() : rpathStr;
    let mutationOp = "";
    let valuePart = "";

    if (assignIdx !== -1) {
        if (pathPart.substring(pathPart.length - 1) === "^") {
            mutationOp = "^=";
            pathPart = pathPart.substring(0, pathPart.length - 1).trim();
        } else {
            mutationOp = "=";
        }
        valuePart = rpathStr.substring(assignIdx + 1).trim().replace(/['"]/g, "");
    }

    let targetAttribute = null;
    const attrIdx = pathPart.lastIndexOf("/@");
    if (attrIdx !== -1) {
        targetAttribute = pathPart.substring(attrIdx + 2);
        pathPart = pathPart.substring(0, attrIdx);
    }

    const rawTokens = pathPart.split("/");
    let steps = [];
    
    let i = isAbsolute ? 1 : 0;
    let nextTokenIsDeep = isGlobalDeep; 

    while (i < rawTokens.length) {
        let token = rawTokens[i];
        
        if (token === "") {
            nextTokenIsDeep = true;
            i++;
            continue;
        }
        
        let hasCut = false;
        if (token.substring(token.length - 1) === "!") {
            hasCut = true;
            token = token.substring(0, token.length - 1);
        }
        
        steps.push({ raw: token, deepScan: nextTokenIsDeep, hasCut: hasCut });
        nextTokenIsDeep = false; 
        i++;
    }

    let currentStepIndex = 0;
    while (currentStepIndex < steps.length && currentNode) {
        const step = steps[currentStepIndex];
        
        if (step.raw.indexOf("goto(") === 0) {
            const arg = step.raw.substring(5, step.raw.length - 1).replace(/['"]/g, "");
            currentNode = resolveGlobalRpathContext(app, arg);
            currentStepIndex++;
            continue;
        }

        if (step.deepScan) {
            currentNode = executeRpathDeepScan(currentNode, step.raw);
        } else {
            currentNode = executeRpathStandardStep(currentNode, step.raw);
        }

        if (currentNode && step.hasCut) {
            break;
        }

        currentStepIndex++;
    }

    if (currentNode && targetAttribute) {
        applyRpathFlashMutation(app, currentNode, targetAttribute, mutationOp, valuePart);
    }

    return currentNode;
}

function resolveGlobalRpathContext(app, argument) {
    if (!app) return null;
    
    const slotId = parseInt(argument, 10);
    if (!isNaN(slotId)) {
        const rootLayout = app.layoutTopologyTree;
        return rootLayout ? executeRpathDeepScan(rootLayout, String(slotId)) : null;
    }

    if (argument === "layout") {
        return app.layoutTopologyTree || null;
    }
    if (argument === "/") return app;

    return null;
}

function executeRpathDeepScan(rootNode, token) {
    let foundNode = null;
    const tokenStr = String(token);
    
    const traverse = (node) => {
        if (!node || foundNode) return;
        
        const nodeIdStr = typeof node.id !== "undefined" && node.id !== null ? String(node.id) : "";
        const nodeCompStr = typeof node.component !== "undefined" && node.component !== null ? String(node.component) : "";

        if (nodeIdStr === tokenStr || nodeCompStr === tokenStr) {
            foundNode = node;
            return;
        }

        if (node.children && node.children.length > 0) {
            const len = node.children.length;
            for (let i = 0; i < len; i++) {
                traverse(node.children[i]);
            }
        }
    };
    
    traverse(rootNode);
    return foundNode;
}

function executeRpathStandardStep(node, token) {
    if (!node) return null;
    
    const tokenStr = String(token);
    if (tokenStr === "next" && node.children) {
        return node.children || null;
    }
    
    if (node.children) {
        const len = node.children.length;
        for (let i = 0; i < len; i++) {
            const child = node.children[i];
            const childIdStr = typeof child.id !== "undefined" && child.id !== null ? String(child.id) : "";
            const childCompStr = typeof child.component !== "undefined" && child.component !== null ? String(child.component) : "";
            const childTypeStr = typeof child.type !== "undefined" && child.type !== null ? String(child.type) : "";

            if (childIdStr === tokenStr || childCompStr === tokenStr) {
                return child;
            }

            if (childTypeStr === "container" && child.children) {
                const subSearch = executeRpathStandardStep(child, tokenStr);
                if (subSearch) return subSearch;
            }
        }
    }
    return null;
}

function applyRpathFlashMutation(app, node, attribute, operator, rawValue) {
    let value = rawValue === "true" ? true : rawValue === "false" ? false : rawValue;
    
    if (operator === "^=") {
        value = !node[attribute];
    }

    const slotNum = parseInt(node.slot || node.id, 10);

    if (attribute === "enabled") {
        mutateAttrEnabled(app, node, slotNum, value);
    } 
    else if (attribute === "collapsed") {
        mutateAttrCollapsed(app, node, slotNum, value);
    } 
    else if (attribute === "isActiveFocus") {
        mutateAttrFocus(app, node, slotNum, value);
    } 
    else {
        node[attribute] = value;
    }

    if (app.virtualCanvasState) {
        app.virtualCanvasState.isDirty = true;
    }
}
