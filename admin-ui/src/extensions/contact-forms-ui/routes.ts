import { registerRouteComponent } from '@vendure/admin-ui/core';
import { ContactFormsComponent } from './components/contact-forms.component';

export default [
  registerRouteComponent({
    path: '',
    component: ContactFormsComponent,
    title: 'Contact Form Submissions',
    breadcrumb: 'Contact Forms',
  }),
];
