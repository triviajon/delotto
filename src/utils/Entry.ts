export interface Entry {
    uuid: string;
    name: string;
    rehearsal: string;
    lineTime: string; // ISO 8601 Date
    callTime: string; // ISO 8601 Date
    timeArrived?: string; // ISO 8601 Date
    calls: Array<string>; // each string must be of the form: CALL_REGEXP
}