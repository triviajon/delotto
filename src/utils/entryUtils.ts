import { Call, CallType } from "./Call";
import { convertCallStringToCallObj } from "./callUtils";
import { Entry } from "./entry"; 

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
 * Converts a time string to the 'ab:cd' format.
 * @param timeString - The time string to convert.
 * @returns The time string in the 'ab:cd' format.
 */
function convertToAbCd(timeString: string): string {
    const [timePart, amPmPart] = timeString.split(" ");
    const [hours, minutes, seconds] = timePart!.split(":").map(Number);

    console.debug(hours, minutes, seconds);

    let adjustedHours = hours!;
    if (amPmPart === "PM" && hours !== 12) {
        adjustedHours += 12;
    } else if (amPmPart === "AM" && hours === 12) {
        adjustedHours = 0;
    }

    const paddedMinutes = minutes! < 10 ? "0" + minutes : minutes!.toString();
    const paddedHours = adjustedHours < 10 ? "0" + hours : adjustedHours.toString();

    const abCdTime = `${paddedHours}:${paddedMinutes}`;
    return abCdTime;
}

/**
 * Subtracts the time represented by the second operand from the time represented by the first operand.
 * @param op1 - The first time operand in the format 'hh:mm'.
 * @param op2 - The second time operand in the format 'hh:mm'.
 * @returns The difference in minutes between the two times.
 */
function subtractTime(op1: string, op2: string): number {
    const [hours1, minutes1] = op1.split(":").map(Number);
    const [hours2, minutes2] = op2.split(":").map(Number);

    const totalMinutes1 = hours1! * 60 + minutes1!;
    const totalMinutes2 = hours2! * 60 + minutes2!;

    return totalMinutes1 - totalMinutes2;
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
        .filter((entry: Entry) => entry.timeArrived !== "");

    const totalLateness: number = filteredEntries
        .reduce<number>((runningTotal, currEntry) =>
            runningTotal + subtractTime(currEntry.callTime, convertToAbCd(currEntry.timeArrived)
            ), 0);

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
export function calculateLineTime(entries: Map<string, Entry>, name: string, callTime: string): string {
    const [hoursStr, minutesStr] = callTime.split(":");
    let hours = parseInt(hoursStr!);
    let minutes = parseInt(minutesStr!);

    minutes += averageLateness(entries, name);

    if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes %= 60;
    }

    hours %= 24;
    const paddedHours = hours.toString().padStart(2, "0");
    const paddedMinutes = minutes.toString().padStart(2, "0");

    return `${paddedHours}:${paddedMinutes}`;
}

/**
 * Calculates earnings based on the outcome of a bet.
 * @param entries - A map containing entries associated with unique identifiers.
 * @param uuid - The unique identifier of the entry for which earnings are to be distributed.
 * @returns A map where the keys represent the names of callers and the values represent their earnings.
 */
export function calculateEarnings(entries: Map<string, Entry>, uuid: string): Map<string, number> {
    const relevantEntry: Entry = entries.get(uuid)!;
    const winningCallType: CallType = subtractTime(convertToAbCd(relevantEntry.timeArrived), relevantEntry.lineTime) > 0 ?
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
    const losingTotalWagered = winningCallType === CallType.Over ? underTotalWagered : overTotalWagered;

    const profitMap: Map<string, number> = new Map();
    for (const winningCall of winningCalls) {
        const percentOfInvested: number = winningCall.value / winningTotalWagered;
        const earningsFromCall: number = Math.floor(percentOfInvested * losingTotalWagered);
        const currentEarnings: number = profitMap.get(winningCall.name) ?? 0;
        profitMap.set(winningCall.name, currentEarnings + earningsFromCall);
    }
    console.log("ProfitMap:", profitMap);
    return profitMap;
}
