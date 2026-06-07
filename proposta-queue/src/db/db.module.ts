import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposta } from './entities/proposta.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password123',
      database: process.env.DB_DATABASE || 'corban_db',
      entities: [Proposta],
      synchronize: true, // Auto-create tables for now, use migrations in production
    }),
    TypeOrmModule.forFeature([Proposta]),
  ],
  exports: [TypeOrmModule],
})
export class DbModule {}
