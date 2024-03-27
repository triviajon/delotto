import { HistoryEntry } from "./HistoryEntry";
import { Entry } from "./Entry";

export function addToHistory(history: Map<string, HistoryEntry>, entryToModify: Entry, 
    profitMap: Map<string, number>, lossMap: Map<string, number>): void {
    const historyEntry: HistoryEntry = {
        profitMap: profitMap,
        lossMap: lossMap,
        uuid: entryToModify.uuid,
        name: entryToModify.name,
        callTime: entryToModify.callTime,
        lineTime: entryToModify.lineTime,
        timeArrived: entryToModify.timeArrived!
    };

    history.set(entryToModify.uuid, historyEntry);
}