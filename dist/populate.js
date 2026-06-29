"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function populateData() {
    console.log('Starting Vendure server to create initial data...');
    const app = await (0, core_1.bootstrap)(vendure_config_1.config);
    try {
        const administratorService = app.get('AdministratorService');
        const channelService = app.get('ChannelService');
        const productService = app.get('ProductService');
        const stockLocationService = app.get('StockLocationService');
        const taxCategoryService = app.get('TaxCategoryService');
        const facetService = app.get('FacetService');
        console.log('Creating superadmin user...');
        try {
            const existingAdmin = await administratorService.findOne({ emailAddress: 'superadmin' });
            if (!existingAdmin) {
                await administratorService.create({
                    emailAddress: 'superadmin',
                    identifier: 'superadmin',
                    password: 'superadmin',
                    firstName: 'Super',
                    lastName: 'Admin',
                    roles: ['superadmin'],
                });
                console.log('✅ Superadmin user created: superadmin / superadmin');
            }
            else {
                console.log('ℹ️ Superadmin user already exists');
            }
        }
        catch (adminError) {
            console.error('Error creating superadmin:', adminError.message);
        }
        console.log('Setting up channel...');
        // Create tax category
        console.log('Creating tax category...');
        const taxCategory = await taxCategoryService.create({
            name: 'Standard Tax',
            isDefault: true,
        });
        // Create stock location
        console.log('Creating stock location...');
        const stockLocation = await stockLocationService.create({
            name: 'Default Warehouse',
            description: 'Main warehouse',
        });
        // Create a facet (category)
        console.log('Creating facets...');
        const categoryFacet = await facetService.create({
            code: 'category',
            isPrivate: false,
            translations: [{ languageCode: 'en', name: 'Category' }],
            values: [
                { code: 'electronics', translations: [{ languageCode: 'en', name: 'Electronics' }] },
                { code: 'accessories', translations: [{ languageCode: 'en', name: 'Accessories' }] },
            ],
        });
        // Create products
        console.log('Creating products...');
        // Product 1: Laptop
        await productService.create({
            translations: [{ languageCode: 'en', name: 'Laptop', slug: 'laptop', description: 'High-performance laptop' }],
            facetValues: [{ facetId: categoryFacet.id, facetValueId: categoryFacet.values[0].id }],
            optionGroups: [
                { code: 'color', translations: [{ languageCode: 'en', name: 'Color' }] },
                { code: 'storage', translations: [{ languageCode: 'en', name: 'Storage' }] },
            ],
            variants: [
                { sku: 'LAP-SIL-128', price: 99900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'Silver 128GB' }], optionValues: [{ optionGroupId: 'color', name: 'Silver' }, { optionGroupId: 'storage', name: '128GB' }] },
                { sku: 'LAP-SIL-256', price: 129900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'Silver 256GB' }], optionValues: [{ optionGroupId: 'color', name: 'Silver' }, { optionGroupId: 'storage', name: '256GB' }] },
                { sku: 'LAP-BLK-128', price: 99900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'Black 128GB' }], optionValues: [{ optionGroupId: 'color', name: 'Black' }, { optionGroupId: 'storage', name: '128GB' }] },
                { sku: 'LAP-BLK-256', price: 129900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'Black 256GB' }], optionValues: [{ optionGroupId: 'color', name: 'Black' }, { optionGroupId: 'storage', name: '256GB' }] },
            ],
        });
        // Product 2: Headphones
        await productService.create({
            translations: [{ languageCode: 'en', name: 'Wireless Headphones', slug: 'wireless-headphones', description: 'Premium wireless headphones' }],
            facetValues: [{ facetId: categoryFacet.id, facetValueId: categoryFacet.values[0].id }],
            variants: [
                { sku: 'HEAD-BT', price: 19900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'Bluetooth Headphones' }] },
            ],
        });
        // Product 3: Smartphone
        await productService.create({
            translations: [{ languageCode: 'en', name: 'Smartphone', slug: 'smartphone', description: 'Modern smartphone' }],
            facetValues: [{ facetId: categoryFacet.id, facetValueId: categoryFacet.values[0].id }],
            optionGroups: [
                { code: 'color', translations: [{ languageCode: 'en', name: 'Color' }] },
            ],
            variants: [
                { sku: 'PHONE-WHT', price: 69900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'White' }], optionValues: [{ optionGroupId: 'color', name: 'White' }] },
                { sku: 'PHONE-BLU', price: 69900, taxCategoryId: taxCategory.id, translations: [{ languageCode: 'en', name: 'Blue' }], optionValues: [{ optionGroupId: 'color', name: 'Blue' }] },
            ],
        });
        console.log('✅ Initial data created successfully!');
        console.log('Products: Laptop, Smartphone, Wireless Headphones');
        console.log('');
        console.log('Admin UI: http://localhost:3002/admin');
        console.log('Login: superadmin / superadmin');
    }
    catch (error) {
        console.error('Error creating data:', error.message);
    }
    console.log('Closing server...');
    await app.close();
}
populateData().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
//# sourceMappingURL=populate.js.map