import { TIME_REGEXP } from "./constants";

/**
 * Subtracts the time represented by the second operand from the time represented by the first operand.
 * @param op1 - The first Date object representing the time.
 * @param op2 - The second Date object representing the time.
 * @returns The difference in minutes between the two times.
 */
export function subtractTime(op1: Date, op2: Date): number {
    const millisecondsDiff = op1.getTime() - op2.getTime();
    const minutesDiff = millisecondsDiff / (1000 * 60);
    return minutesDiff;
}

/**
 * Adds a specified number of minutes to a given date.
 * @param date - The date to which minutes are to be added.
 * @param minutes - The number of minutes to add.
 * @returns A new Date object representing the resulting date after adding the minutes.
 */
export function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes*60000);
}


/**
 * Converts a time input in the format 'XX:YY AM/PM' to a string representation in the format 'YYYY-MM-DDTHH:MM:SS'.
 * The date part is set to today's date.
 * @param timeInput - The time input to convert.
 * @returns A string representation of the input time in ISO format.
 * @throws Error if the input time format is invalid.
 */
export function convertTimeInputToISOString(timeInput: string): string {
    const match = timeInput.match(TIME_REGEXP);
    if (!match) throw new Error("Invalid time format. Please provide time in the format 'XX:YY AM/PM'.");

    let hours = parseInt(match[1]!, 10);
    const minutes = parseInt(match[2]!, 10);
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    else if (meridiem === "am" && hours === 12) hours = 0;

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

    return `${dateStr}T${timeStr}`;
}