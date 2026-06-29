"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultZonePlugin = void 0;
const core_1 = require("@vendure/core");
let DefaultZonePlugin = class DefaultZonePlugin {
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
exports.DefaultZonePlugin = DefaultZonePlugin;
exports.DefaultZonePlugin = DefaultZonePlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
    })
], DefaultZonePlugin);
//# sourceMappingURL=default-zone-plugin.js.map