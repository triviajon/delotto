export interface Entry {
    uuid: string;
    name: string;
    rehearsal: string;
    lineTime: string;
    callTime: string;
    timeArrived: string;
    calls: Array<string>; // each string must be of the form: CALL_REGEXP
}