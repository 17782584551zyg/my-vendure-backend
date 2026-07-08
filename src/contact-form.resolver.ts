import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ContactFormService } from './contact-form.service';

@Resolver('ContactForm')
export class ContactFormResolver {
  constructor(private contactFormService: ContactFormService) {}

  @Query()
  async contactForms(@Args('take') take?: number, @Args('skip') skip?: number) {
    try {
      const result = await this.contactFormService.findAll(take, skip);
      console.log('contactForms result:', result);
      return result || { items: [], totalItems: 0 };
    } catch (error) {
      console.error('Error in contactForms:', error);
      return { items: [], totalItems: 0 };
    }
  }

  @Query()
  async contactForm(@Args('id') id: string) {
    return this.contactFormService.findOne(parseInt(id, 10));
  }

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