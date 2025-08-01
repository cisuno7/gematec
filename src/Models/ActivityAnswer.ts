import { UploadFile } from "./UploadFile";

export interface ActivityAnswer {
    question_id: number;
    value: string | number | string[];
    justification?: string; // só para radio_with_justification
    uploads?: UploadFile[];
}