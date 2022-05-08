var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/playwright-core/src/server/injected/utilityScript.ts
var utilityScript_exports = {};
__export(utilityScript_exports, {
  UtilityScript: () => UtilityScript
});
module.exports = __toCommonJS(utilityScript_exports);

// packages/playwright-core/src/server/isomorphic/utilityScriptSerializers.ts
function isRegExp(obj) {
  return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
}
function isDate(obj) {
  return obj instanceof Date || Object.prototype.toString.call(obj) === "[object Date]";
}
function isError(obj) {
  return obj instanceof Error || obj && obj.__proto__ && obj.__proto__.name === "Error";
}
function parseEvaluationResultValue(value, handles = []) {
  if (Object.is(value, void 0))
    return void 0;
  if (typeof value === "object" && value) {
    if ("v" in value) {
      if (value.v === "undefined")
        return void 0;
      if (value.v === "null")
        return null;
      if (value.v === "NaN")
        return NaN;
      if (value.v === "Infinity")
        return Infinity;
      if (value.v === "-Infinity")
        return -Infinity;
      if (value.v === "-0")
        return -0;
      return void 0;
    }
    if ("d" in value)
      return new Date(value.d);
    if ("r" in value)
      return new RegExp(value.r.p, value.r.f);
    if ("a" in value)
      return value.a.map((a) => parseEvaluationResultValue(a, handles));
    if ("o" in value) {
      const result = {};
      for (const { k, v } of value.o)
        result[k] = parseEvaluationResultValue(v, handles);
      return result;
    }
    if ("h" in value)
      return handles[value.h];
  }
  return value;
}
function serializeAsCallArgument(value, handleSerializer) {
  return serialize(value, handleSerializer, /* @__PURE__ */ new Set());
}
function serialize(value, handleSerializer, visited) {
  const result = handleSerializer(value);
  if ("fallThrough" in result)
    value = result.fallThrough;
  else
    return result;
  if (visited.has(value))
    throw new Error("Argument is a circular structure");
  if (typeof value === "symbol")
    return { v: "undefined" };
  if (Object.is(value, void 0))
    return { v: "undefined" };
  if (Object.is(value, null))
    return { v: "null" };
  if (Object.is(value, NaN))
    return { v: "NaN" };
  if (Object.is(value, Infinity))
    return { v: "Infinity" };
  if (Object.is(value, -Infinity))
    return { v: "-Infinity" };
  if (Object.is(value, -0))
    return { v: "-0" };
  if (typeof value === "boolean")
    return value;
  if (typeof value === "number")
    return value;
  if (typeof value === "string")
    return value;
  if (isError(value)) {
    const error = value;
    if ("captureStackTrace" in globalThis.Error) {
      return error.stack || "";
    }
    return `${error.name}: ${error.message}
${error.stack}`;
  }
  if (isDate(value))
    return { d: value.toJSON() };
  if (isRegExp(value))
    return { r: { p: value.source, f: value.flags } };
  if (Array.isArray(value)) {
    const a = [];
    visited.add(value);
    for (let i = 0; i < value.length; ++i)
      a.push(serialize(value[i], handleSerializer, visited));
    visited.delete(value);
    return { a };
  }
  if (typeof value === "object") {
    const o = [];
    visited.add(value);
    for (const name of Object.keys(value)) {
      let item;
      try {
        item = value[name];
      } catch (e) {
        continue;
      }
      if (name === "toJSON" && typeof item === "function")
        o.push({ k: name, v: { o: [] } });
      else
        o.push({ k: name, v: serialize(item, handleSerializer, visited) });
    }
    visited.delete(value);
    return { o };
  }
}

// packages/playwright-core/src/server/injected/utilityScript.ts
var UtilityScript = class {
  evaluate(isFunction, returnByValue, expression, argCount, ...argsAndHandles) {
    const args = argsAndHandles.slice(0, argCount);
    const handles = argsAndHandles.slice(argCount);
    const parameters = args.map((a) => parseEvaluationResultValue(a, handles));
    let result = globalThis.eval(expression);
    if (isFunction === true) {
      result = result(...parameters);
    } else if (isFunction === false) {
      result = result;
    } else {
      if (typeof result === "function")
        result = result(...parameters);
    }
    return returnByValue ? this._promiseAwareJsonValueNoThrow(result) : result;
  }
  jsonValue(returnByValue, value) {
    if (Object.is(value, void 0))
      return void 0;
    return serializeAsCallArgument(value, (value2) => ({ fallThrough: value2 }));
  }
  _promiseAwareJsonValueNoThrow(value) {
    const safeJson = (value2) => {
      try {
        return this.jsonValue(true, value2);
      } catch (e) {
        return void 0;
      }
    };
    if (value && typeof value === "object" && typeof value.then === "function") {
      return (async () => {
        const promiseValue = await value;
        return safeJson(promiseValue);
      })();
    }
    return safeJson(value);
  }
};
module.exports = UtilityScript;