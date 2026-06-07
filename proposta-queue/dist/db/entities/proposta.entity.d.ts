export declare class Proposta {
    id: string;
    banco: string;
    valor: number;
    cliente: string;
    produto: string;
    status: 'pendente' | 'processando' | 'importado' | 'erro';
    loja: string;
    dadosOriginais: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
