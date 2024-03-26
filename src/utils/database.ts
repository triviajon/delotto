import fs from 'fs';
import { USER_DATABASE_FP, DATABASE_FP, CALL_REGEXP, SALT_ROUNDS } from './constants';
import bcryptjs, { hash } from 'bcryptjs';

export interface Entry {
    uuid: string;
    name: string;
    rehearsal: string;
    lineTime: string;
    callTime: string;
    timeArrived: string;
    calls: Array<string>; // each string must be of the form: CALL_REGEXP
}

export enum CallType {
    Over = 1,
    Under = 0,
};

export interface Call {
    name: string;
    type: CallType;
    value: number;
}

export interface UserData {
    username: string; // non-empty
    hashedPassword: string; // non-empty
    points: number; // > 0, integral
}

export interface GetUserResponse {
    username: string;
    points: number;
}

/**
 * Create a Date object from a time string assuming Eastern Standard Time (EST).
 * @param timeString - The time string in the format "HH:MM".
 * @returns A Date object representing the provided time in EST.
 */
function createDateFromTimeString(timeString: string): Date {
    const currentDate = new Date();
    const [hours, minutes] = timeString.split(':');
    if (hours === undefined || minutes == undefined) {
        throw new Error("Bad date!");
    }
    currentDate.setHours(parseInt(hours, 10));
    currentDate.setMinutes(parseInt(minutes, 10));
    currentDate.setHours(currentDate.getHours());
    return currentDate;
}

/**
 * Converts a call string, of the form constants.CALL_REGEXP, to the corresponding Call. 
 * 
 * @param call the call string to be converted
 * @returns the call object representing the call string
 * @throws an error if no match is found, or is not of the proper format
 */
export function convertCallStringToCallObj(call: string): Call {
    console.debug("convertCallStringToCallObj: converting", call);
    const matchResults = [...call.matchAll(CALL_REGEXP)];
    const firstMatch = matchResults[0]!;
    console.debug("convertCallStringToCallObj: firstMatch", firstMatch);
    const callObj: Call = {
        name: firstMatch[1]!,
        type: firstMatch[2] === "^" ? CallType.Over : CallType.Under,
        value: parseFloat(firstMatch[3]!)
    };
    return callObj;
}

/**
 * Converts a call object, to one of the form constants.CALL_REGEXP.
 * 
 * @param call the call object to be converted
 * @returns the call string representing the call object
 */
export function convertCallObjToCallString(call: Call): string {
    const callType: string = call.type === CallType.Over ? "^" : "_";
    return call.name + callType + call.value;
}

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

// Function to load entries from the JSON database file
export function loadDatabase(): Map<string, Entry> {
    try {
        const data = fs.readFileSync(DATABASE_FP, { encoding: 'utf-8' });
        const parsedData: { [key: string]: Entry } = JSON.parse(data);
        const entries = new Map<string, Entry>();

        // Convert parsedData to Map<string, Entry>
        for (const key in parsedData) {
            entries.set(key, parsedData[key]!);
        }

        console.debug("=== Loaded database information ===");
        console.debug("Raw data:", data);
        console.debug("Parsed:", data);
        console.debug("Finalized entries:", entries);
        console.debug("=== end === \n ");

        return entries;
    } catch (error) {
        console.error('Error loading database:', error);
        console.debug("Initializing new database at", DATABASE_FP);
        initializeDatabase();
        return new Map<string, Entry>();
    }
}

// Function to save entries to the JSON database file
export function saveDatabase(entries: Map<string, Entry>): void {
    console.debug("=== Saving new database: ===");
    console.debug("Entries:", entries);
    try {
        const stringified: string = JSON.stringify(convertEntries(entries), null, 2);
        console.debug("Stringified:", stringified);
        fs.writeFileSync(DATABASE_FP, stringified, { encoding: 'utf-8' });
    } catch (error) {
        console.error('Error saving database:', error);
    }
    console.debug("=== end === \n");
}

// Function to initialize the database file with an empty map if it doesn't exist
export function initializeDatabase(): void {
    try {
        if (!fs.existsSync(DATABASE_FP)) {
            const emptyMap = new Map<string, UserData>();
            const jsonData = JSON.stringify(Array.from(emptyMap.entries()));
            fs.writeFileSync(DATABASE_FP, jsonData, { encoding: 'utf-8' });
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

export async function encrypt(text: string): Promise<string> {
    try {
        const hashedText = await bcryptjs.hash(text, SALT_ROUNDS);
        return hashedText;
    } catch (error) {
        throw new Error("Error hashing: " + error);
    }
}

// Function to initialize the database file for user data with an empty map if it doesn't exist
export function initializeUserDatabase(): void {
    try {
        if (!fs.existsSync(USER_DATABASE_FP)) {
            const emptyMap = new Map<string, UserData>();
            const jsonData = JSON.stringify(Array.from(emptyMap.entries()));
            fs.writeFileSync(USER_DATABASE_FP, jsonData, { encoding: 'utf-8' });
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Function to attempt to load the database from the databasefile USER_DATABASE_FP, or create one if
// it doesn't exist using initializeUserDatabase
export function loadUserData(): Map<string, UserData> {
    // Check if the user database file exists
    if (fs.existsSync(USER_DATABASE_FP)) {
        const userDataJSON = fs.readFileSync(USER_DATABASE_FP, 'utf-8');
        const userDataObject: Record<string, UserData> = JSON.parse(userDataJSON);
        const userDataEntries: Array<[string, UserData]> = Object.entries(userDataObject);
        return new Map(userDataEntries);
    } else {
        initializeUserDatabase();
        return new Map<string, UserData>();
    }
}

// Function to add a new user entry to the user data and write it to the database file
export async function addUserEntry(userDataMap: Map<string, UserData>, username: string, password: string, points: number): Promise<void> {
    const lowerUsername = username.toLowerCase();

    if (userDataMap.has(lowerUsername)) {
        console.error(`User "${lowerUsername}" already exists.`);
        return;
    }

    const hashedPassword: string = await bcryptjs.hash(password, SALT_ROUNDS);

    const newUser: UserData = {
        username: lowerUsername,
        hashedPassword,
        points
    };

    userDataMap.set(lowerUsername, newUser);

    try {
        saveUserDataMap(userDataMap);
        console.log(`User "${lowerUsername}" added successfully.`);
    } catch (error) {
        console.error('Error adding user entry:', error);
    }
}

/**
 * Saves the user data map to a file.
 * @param userDataMap - The map containing user data to be saved.
 */
export function saveUserDataMap(userDataMap: Map<string, UserData>): void {
    try {
        const userDataJSON = JSON.stringify(Object.fromEntries(userDataMap.entries()), null, 2);
        fs.writeFileSync(USER_DATABASE_FP, userDataJSON, { encoding: 'utf-8' });
    } catch (error) {
        console.error('Error saving user database:', error);
    }
}

/**
 * Checks if the provided username belongs to an admin user.
 * @param username - The username to check.
 * @returns True if the username belongs to an admin user, otherwise false.
 */
export function isAdmin(username: string | undefined): boolean {
    return username?.toLowerCase() === "jon";
}

/**
 * Converts a time string to the 'ab:cd' format.
 * @param timeString - The time string to convert.
 * @returns The time string in the 'ab:cd' format.
 */
function convertToAbCd(timeString: string): string {
    const date = new Date(timeString);

    const hours = date.getHours();
    const minutes = date.getMinutes();

    const paddedMinutes = minutes < 10 ? '0' + minutes : minutes.toString();
    const paddedHours = hours < 10 ? '0' + hours : hours.toString();

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
    const [hours1, minutes1] = op1.split(':').map(Number);
    const [hours2, minutes2] = op2.split(':').map(Number);

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
    const [hoursStr, minutesStr] = callTime.split(':');
    let hours = parseInt(hoursStr!);
    let minutes = parseInt(minutesStr!);

    minutes += averageLateness(entries, name);

    if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes %= 60;
    }

    hours %= 24;
    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');

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
        profitMap.set(winningCall.name, currentEarnings + earningsFromCall)
    }

    return profitMap;
}

/**
 * Distributes earnings to user accounts and saves the updated user data.
 * @param userDataMap - A map containing user data associated with usernames.
 * @param profitMap - A map where the keys represent usernames and the values represent earnings.
 * @returns void
 */
export function distributeEarnings(userDataMap: Map<string, UserData>, profitMap: Map<string, number>): void {
    for (const [username, profit] of profitMap) {
        const userDataToUpdate: UserData = userDataMap.get(username)!;
        userDataToUpdate.points += profit;
    }
    saveUserDataMap(userDataMap);
}