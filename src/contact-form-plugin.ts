import { VendurePlugin, PluginCommonModule } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { ContactFormEntity } from './contact-form.entity';
import { ContactFormResolver } from './contact-form.resolver';
import { ContactFormShopResolver } from './contact-form-shop.resolver';
import { ContactFormService } from './contact-form.service';

@VendurePlugin({
  imports: [
    PluginCommonModule,
    TypeOrmModule.forFeature([ContactFormEntity]),
  ],
  entities: [ContactFormEntity],
  providers: [ContactFormService],
  adminApiExtensions: {
    schema: gql`
      type ContactForm {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        phone: String
        country: String
        company: String
        message: String
        source: String
        createdAt: DateTime!
      }

      type ContactFormList {
        items: [ContactForm!]!
        totalItems: Int!
      }

      input CreateContactFormInput {
        firstName: String!
        lastName: String
        email: String!
        phone: String
        country: String
        company: String
        message: String
        source: String
      }

      extend type Query {
        contactForms(take: Int, skip: Int): ContactFormList!
        contactForm(id: ID!): ContactForm
      }

      extend type Mutation {
        createContactForm(input: CreateContactFormInput!): ContactForm!
      }
    `,
    resolvers: [ContactFormResolver],
  },
  shopApiExtensions: {
    schema: gql`
      type ContactForm {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        phone: String
        country: String
        company: String
        message: String
        source: String
        createdAt: DateTime!
      }

      input CreateContactFormInput {
        firstName: String!
        lastName: String
        email: String!
        phone: String
        country: String
        company: String
        message: String
        source: String
      }

      extend type Mutation {
        createContactForm(input: CreateContactFormInput!): ContactForm!
      }
    `,
    resolvers: [ContactFormShopResolver],
  },
})
export class ContactFormPlugin {}