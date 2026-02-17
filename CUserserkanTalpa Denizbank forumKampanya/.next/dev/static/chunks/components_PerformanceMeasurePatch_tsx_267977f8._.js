(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/PerformanceMeasurePatch.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PerformanceMeasurePatch",
    ()=>PerformanceMeasurePatch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
function PerformanceMeasurePatch() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PerformanceMeasurePatch.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const perf = window.performance;
            if (!perf?.measure || perf.__measurePatched) return;
            const original = perf.measure.bind(perf);
            perf.measure = ({
                "PerformanceMeasurePatch.useEffect": function(name, startOrMeasureOptions, endMark) {
                    try {
                        // @ts-ignore - overloading complexity
                        return original(name, startOrMeasureOptions, endMark);
                    } catch (err) {
                        const msg = (err instanceof Error ? err.message : String(err)) ?? '';
                        if (msg.includes('negative time stamp')) return;
                        throw err;
                    }
                }
            })["PerformanceMeasurePatch.useEffect"];
            perf.__measurePatched = true;
        }
    }["PerformanceMeasurePatch.useEffect"], []);
    return null;
}
_s(PerformanceMeasurePatch, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = PerformanceMeasurePatch;
var _c;
__turbopack_context__.k.register(_c, "PerformanceMeasurePatch");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_PerformanceMeasurePatch_tsx_267977f8._.js.map