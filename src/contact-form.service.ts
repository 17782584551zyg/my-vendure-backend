import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactFormEntity } from './contact-form.entity';

@Injectable()
export class ContactFormService {
  constructor(
    @InjectRepository(ContactFormEntity)
    private contactFormRepository: Repository<ContactFormEntity>,
  ) {}

  async create(input: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    country?: string;
    company?: string;
    message?: string;
    source?: string;
  }) {
    const form = this.contactFormRepository.create({
      firstName: input.firstName,
      lastName: input.lastName || '',
      email: input.email,
      phone: input.phone || '',
      country: input.country || '',
      company: input.company || '',
      message: input.message || '',
      source: input.source || '',
      createdAt: new Date(),
    });
    return this.contactFormRepository.save(form);
  }

  async findAll(take?: number, skip?: number) {
    const [items, totalItems] = await this.contactFormRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: take || 25,
      skip: skip || 0,
    });
    return { items, totalItems };
  }

  async findOne(id: number) {
    return this.contactFormRepository.findOne({ where: { id } });
  }
}