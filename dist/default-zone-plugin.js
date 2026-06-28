"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultZonePlugin = void 0;
const core_1 = require("@vendure/core");
let DefaultZonePlugin = (() => {
    let _classDecorators = [(0, core_1.VendurePlugin)({
            imports: [core_1.PluginCommonModule],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var DefaultZonePlugin = _classThis = class {
        static async onBootstrap(injector) {
            const connection = injector.get('Connection');
            const zoneRepo = connection.getRepository('Zone');
            const channelRepo = connection.getRepository('Channel');
            let defaultZone = await zoneRepo.findOne({ where: { code: 'default-zone' } });
            if (!defaultZone) {
                defaultZone = zoneRepo.create({
                    name: 'Default',
                    code: 'default-zone',
                });
                await zoneRepo.save(defaultZone);
                console.log('[DefaultZonePlugin] Created default zone');
            }
            const channels = await channelRepo.find();
            for (const channel of channels) {
                if (!channel.defaultTaxZone) {
                    channel.defaultTaxZone = defaultZone;
                    await channelRepo.save(channel);
                    console.log('[DefaultZonePlugin] Set default tax zone for channel:', channel.name);
                }
                if (!channel.defaultShippingZone) {
                    channel.defaultShippingZone = defaultZone;
                    await channelRepo.save(channel);
                    console.log('[DefaultZonePlugin] Set default shipping zone for channel:', channel.name);
                }
            }
        }
    };
    __setFunctionName(_classThis, "DefaultZonePlugin");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DefaultZonePlugin = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DefaultZonePlugin = _classThis;
})();
exports.DefaultZonePlugin = DefaultZonePlugin;
//# sourceMappingURL=default-zone-plugin.js.map