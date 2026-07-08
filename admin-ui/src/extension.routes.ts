export const extensionRoutes = [  {
    path: 'extensions/contact-forms',
    loadChildren: () => import('./extensions/contact-forms-ui/routes'),
  }];
