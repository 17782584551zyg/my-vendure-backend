import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { ContactFormService } from './contact-form.service';

@Resolver('ContactForm')
export class ContactFormShopResolver {
  constructor(private contactFormService: ContactFormService) {}

  @Mutation()
  async createContactForm(@Args('input') input: any) {
    try {
      console.log('createContactForm input:', input);
      const result = await this.contactFormService.create(input);
      console.log('createContactForm result:', result);
      return result;
    } catch (error) {
      console.error('Error in createContactForm:', error);
      throw error;
    }
  }
}