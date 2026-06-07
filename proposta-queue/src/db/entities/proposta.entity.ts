import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proposta')
export class Proposta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'banco', type: 'varchar', length: 50 })
  banco: string;

  @Column({ name: 'valor', type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'cliente', type: 'varchar', length: 255 })
  cliente: string;

  @Column({ name: 'produto', type: 'varchar', length: 100 })
  produto: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'pendente' })
  status: 'pendente' | 'processando' | 'importado' | 'erro';

  @Column({ name: 'loja', type: 'varchar', length: 50, nullable: true })
  loja: string;

  @Column({ name: 'dados_originais', type: 'jsonb', nullable: true })
  dadosOriginais: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
