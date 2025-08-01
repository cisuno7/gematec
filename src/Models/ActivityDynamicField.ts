export type ActivityDynamicFieldType =
    | "text"
    | "measure"
    | "select"
    | "radio"
    | "radio_with_justification";

export interface ActivityDynamicFieldRules {
    required?: boolean;
    max_length?: number;
    min_length?: number;
    min_value?: number;
    max_value?: number;
}

export interface ActivityDynamicField {
    label: string;
    key: string;
    type: ActivityDynamicFieldType;
    help_text?: string;
    rules: ActivityDynamicFieldRules;
    options?: string[]; // select, radio, radio_with_justification
    justification_target?: string; // radio_with_justification
    has_upload?: boolean;
}