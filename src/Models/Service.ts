export interface Service {
    id: number;
    name: string;
    amount: number; // Valor em centavos
    scope: 'global' | 'local';
}

export interface ServicesResponse {
    links: {
        next: string | null;
        previous: string | null;
    };
    count: number;
    results: Service[];
}


