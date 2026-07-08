import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
  addNavMenuItem(
    {
      id: 'contact-forms',
      label: 'Contact Forms',
      icon: 'Mail',
      routerLink: ['/extensions/contact-forms'],
      requiresPermission: 'ReadCustomer',
    },
    'customers'
  ),
];