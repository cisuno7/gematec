import { UploadFile } from "./UploadFile";

export interface ActivityAnswer {
    question_id: number;
    value: string | number | string[];
    justification?: string; // só para radio_with_justification
    uploads?: UploadFile[];
    completed_at?: string; // ISO datetime string - apenas para edições após fechamento
    completed_by?: string; // Nome do usuário que editou - apenas para edições após fechamento
}