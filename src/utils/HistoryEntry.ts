export interface HistoryEntry {
    profitMap:  Map<string, number>;
    lossMap: Map<string, number>;
    uuid: string;
    name: string;
    callTime: string;
    lineTime: string;
    arrivedTime: string;
}