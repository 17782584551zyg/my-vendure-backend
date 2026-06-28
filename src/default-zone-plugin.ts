import { PluginCommonModule, VendurePlugin } from '@vendure/core';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class DefaultZonePlugin {
  static async onBootstrap(injector: any) {
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
}