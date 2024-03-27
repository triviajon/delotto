import { Call, CallType } from "./Call";
import { convertCallStringToCallObj } from "./callUtils";
import { Entry } from "./Entry";
import { addMinutes, subtractTime } from "./timeUtils";

/**
 * Converts the entries map to one that is JSON stringifiable.
 * 
 * @param entries the map of uuids to entry objects
 * @returns a JSON-stringifiable representation of entries
 */
export function convertEntries(entries: Map<string, Entry>): { [key: string]: Entry } {
    const entriesObject: { [key: string]: Entry } = {};
    entries.forEach((value, key) => {
        entriesObject[key] = value;
    });
    return entriesObject;
}


/**
 * Computes the average lateness for entries with the specified name.
 * @param entries - A Map containing entries keyed by their unique identifier.
 * @param name - The name for which the average lateness is calculated.
 * @returns The average lateness in minutes, or a default value of 5 if no matching entries are found.
 */
function averageLateness(entries: Map<string, Entry>, name: string): number {
    const filteredEntries = Array.from(entries.values())
        .filter((entry: Entry) => entry.name === name)
        .filter((entry: Entry) => entry.timeArrived !== undefined);

    const totalLateness: number = filteredEntries
        .reduce<number>((runningTotal, currEntry) =>
            runningTotal + subtractTime(new Date(currEntry.timeArrived!), new Date(currEntry.callTime)), 0);

    const numEntries = filteredEntries.length;

    return (numEntries !== 0) ? totalLateness / numEntries : 5;
}

/**
 * Calculates the time a line should be called based on the average lateness of entries with a specific name.
 * @param entries - The map containing all entries.
 * @param name - The name of the entries to consider.
 * @param callTime - The original call time.
 * @returns The line time based on average lateness, or callTime + 5 minutes if no prior data exists for `name` in entries.
 */
export function calculateLineTime(entries: Map<string, Entry>, name: string, callTime: Date): Date {
    const lateness = averageLateness(entries, name);
    console.log("Average lateness for", name, "is", lateness);
    const lineTime = addMinutes(callTime, lateness);
    return lineTime;
}

/**
 * Calculates earnings based on the outcome of a bet.
 * @param entries - A map containing entries associated with unique identifiers.
 * @param uuid - The unique identifier of the entry for which earnings are to be distributed.
 * @returns A map where the keys represent the names of callers and the values represent their earnings.
 */
export function calculateEarnings(entries: Map<string, Entry>, uuid: string): { profitMap: Map<string, number>, lossMap: Map<string, number> } {
    const relevantEntry: Entry = entries.get(uuid)!;
    const winningCallType: CallType = subtractTime(new Date(relevantEntry.timeArrived!), new Date(relevantEntry.lineTime)) > 0 ?
        CallType.Over : CallType.Under;
    console.log(winningCallType);
    const overCalls: Array<Call> = relevantEntry.calls
        .map((call: string) => convertCallStringToCallObj(call))
        .filter((callObj: Call) => callObj.type === CallType.Over);
    const overTotalWagered = overCalls.reduce<number>((prev: number, curr: Call) => prev + curr.value, 0);
    const underCalls: Array<Call> = relevantEntry.calls
        .map((call: string) => convertCallStringToCallObj(call))
        .filter((callObj: Call) => callObj.type === CallType.Under);
    const underTotalWagered = underCalls.reduce<number>((prev: number, curr: Call) => prev + curr.value, 0);

    const winningCalls = winningCallType === CallType.Over ? overCalls : underCalls;
    const winningTotalWagered = winningCallType === CallType.Over ? overTotalWagered : underTotalWagered;
    const losingCalls = winningCallType === CallType.Over ? underCalls : overCalls;
    const losingTotalWagered = winningCallType === CallType.Over ? underTotalWagered : overTotalWagered;

    const profitMap: Map<string, number> = new Map();
    for (const winningCall of winningCalls) {
        const percentOfInvested: number = winningCall.value / winningTotalWagered;
        const earningsFromCall: number = Math.floor(percentOfInvested * losingTotalWagered);
        const currentEarnings: number = profitMap.get(winningCall.name) ?? 0;
        profitMap.set(winningCall.name, currentEarnings + earningsFromCall);
    }
    const lossMap: Map<string, number> = new Map();
    for (const losingCall of losingCalls) {
        const currentLosses: number = lossMap.get(losingCall.name) ?? 0;
        lossMap.set(losingCall.name, currentLosses + losingCall.value);
    }

    console.log("ProfitMap:", profitMap);
    return { profitMap, lossMap };
}
