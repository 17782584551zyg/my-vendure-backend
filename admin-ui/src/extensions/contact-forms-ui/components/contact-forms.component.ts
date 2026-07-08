import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  BaseListComponent,
  DataService,
  SharedModule,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { CommonModule } from '@angular/common';

interface ContactForm {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  message: string;
  source: string;
  createdAt: string;
}

interface ContactFormListResult {
  contactForms: {
    items: ContactForm[];
    totalItems: number;
  };
}

@Component({
  selector: 'contact-forms',
  templateUrl: './contact-forms.component.html',
  standalone: true,
  imports: [SharedModule, CommonModule],
})
export class ContactFormsComponent extends BaseListComponent<ContactFormListResult, ContactForm> implements OnInit {
  constructor(
    router: Router,
    route: ActivatedRoute,
    private dataService: DataService
  ) {
    super(router, route);
    this.setQueryFn(
      (take, skip) => this.dataService.query<ContactFormListResult>(
        gql`
          query ContactForms($take: Int, $skip: Int) {
            contactForms(take: $take, skip: $skip) {
              items {
                id
                firstName
                lastName
                email
                phone
                country
                company
                message
                source
                createdAt
              }
              totalItems
            }
          }
        `,
        { take, skip }
      ),
      (data) => ({
        items: data.contactForms.items,
        totalItems: data.contactForms.totalItems,
      }),
      (skip, take) => ({ skip, take })
    );
  }

  ngOnInit() {
    super.ngOnInit();
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'services':
        return 'Services';
      case 'monthly-report':
        return 'Monthly Report';
      default:
        return source || 'Unknown';
    }
  }

  getSourceBadgeClass(source: string): string {
    switch (source) {
      case 'services':
        return 'badge-success';
      case 'monthly-report':
        return 'badge-info';
      default:
        return 'badge-default';
    }
  }
}