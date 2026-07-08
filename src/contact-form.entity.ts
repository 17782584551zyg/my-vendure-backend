import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ContactFormEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true, type: 'text' })
  message?: string;

  @Column({ nullable: true })
  source?: string;

  @Column()
  createdAt!: Date;
}