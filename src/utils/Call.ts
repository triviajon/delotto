export enum CallType {
    Over = 1,
    Under = 0,
}

export interface Call {
    name: string;
    type: CallType;
    value: number;
}