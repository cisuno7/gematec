export interface Category {
    id: number;
    name: string;
}

export interface Manual {
    id: number;
    name: string;
    category: Category;
    file_url?: string; // Optional for backward compatibility
    content_url?: string; // Primary field used by backend
}