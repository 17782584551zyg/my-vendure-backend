"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function initDefaultTaxZone() {
    const { app } = await (0, core_1.bootstrap)(vendure_config_1.config);
    try {
        const db = app.get('Connection');
        const defaultChannel = await db.getRepository('Channel').findOne({
            where: { token: 'default-channel' }
        });
        if (defaultChannel) {
            let defaultZone = await db.getRepository('Zone').findOne({
                where: { name: 'Default' }
            });
            if (!defaultZone) {
                defaultZone = db.getRepository('Zone').create({
                    name: 'Default',
                    code: 'default-zone',
                });
                await db.getRepository('Zone').save(defaultZone);
                console.log('Created default zone');
            }
            if (!defaultChannel.defaultTaxZone) {
                defaultChannel.defaultTaxZone = defaultZone;
                await db.getRepository('Channel').save(defaultChannel);
                console.log('Set default tax zone for channel');
            }
            if (!defaultChannel.defaultShippingZone) {
                defaultChannel.defaultShippingZone = defaultZone;
                await db.getRepository('Channel').save(defaultChannel);
                console.log('Set default shipping zone for channel');
            }
        }
        await app.close();
        console.log('Initialization complete');
    }
    catch (err) {
        console.error('Initialization failed:', err);
        await app.close();
        process.exit(1);
    }
}
initDefaultTaxZone();
//# sourceMappingURL=init-default-tax-zone.js.map