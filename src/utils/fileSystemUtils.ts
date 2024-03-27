import fs from "fs";
import { USER_DATABASE_FP, DATABASE_FP, HISTORY_FP } from "./constants";
import { Entry } from "./Entry";
import { convertEntries } from "./entryUtils";
import { UserData } from "./UserData";
import { HistoryEntry } from "./HistoryEntry";

/**
 * Function to initialize the database file with an empty map if it doesn't exist.
 * Checks if the database file exists, and if not, initializes it with an empty map.
 */
export function initializeDatabase(): void {
    try {
        if (!fs.existsSync(DATABASE_FP)) {
            const emptyMap = new Map<string, UserData>();
            const jsonData = JSON.stringify(Array.from(emptyMap.entries()));
            fs.writeFileSync(DATABASE_FP, jsonData, { encoding: "utf-8" });
        }
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

/**
 * Function to load entries from the JSON database file.
 * Reads the JSON database file, parses its content, and returns a Map<string, Entry>.
 * If an error occurs during the loading process, initializes a new database and returns an empty Map.
 * 
 * @returns A Map<string, Entry> containing loaded entries from the database file, or an empty Map if an error occurs.
 */
export function loadDatabase(): Map<string, Entry> {
    try {
        const data = fs.readFileSync(DATABASE_FP, { encoding: "utf-8" });
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
        console.error("Error loading database:", error);
        console.debug("Initializing new database at", DATABASE_FP);
        initializeDatabase();
        return new Map<string, Entry>();
    }
}

/**
 * Function to save entries to the JSON database file.
 * Saves the provided entries to the JSON database file specified by DATABASE_FP.
 * 
 * @param entries - A Map<string, Entry> containing entries to be saved to the database file.
 */
export function saveDatabase(entries: Map<string, Entry>): void {
    console.debug("=== Saving new database: ===");
    console.debug("Entries:", entries);
    try {
        const stringified: string = JSON.stringify(convertEntries(entries), null, 2);
        console.debug("Stringified:", stringified);
        fs.writeFileSync(DATABASE_FP, stringified, { encoding: "utf-8" });
    } catch (error) {
        console.error("Error saving database:", error);
    }
    console.debug("=== end === \n");
}


/**
 * Function to initialize the user database file with an empty map if it doesn't exist.
 * Checks if the user database file exists, and if not, initializes it with an empty map.
 */
export function initializeUserDatabase(): void {
    try {
        if (!fs.existsSync(USER_DATABASE_FP)) {
            const emptyMap = new Map<string, UserData>();
            const jsonData = JSON.stringify(Array.from(emptyMap.entries()));
            fs.writeFileSync(USER_DATABASE_FP, jsonData, { encoding: "utf-8" });
        }
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

/**
 * Function to attempt to load the user data database from the database file USER_DATABASE_FP,
 * or create one if it doesn't exist using initializeUserDatabase.
 * 
 * @returns A Map<string, UserData> containing user data loaded from the database file, or an empty Map if the file doesn't exist.
 */
export function loadUserData(): Map<string, UserData> {
    // Check if the user database file exists
    if (fs.existsSync(USER_DATABASE_FP)) {
        const userDataJSON = fs.readFileSync(USER_DATABASE_FP, "utf-8");
        const userDataObject: Record<string, UserData> = JSON.parse(userDataJSON);
        const userDataEntries: Array<[string, UserData]> = Object.entries(userDataObject);
        return new Map(userDataEntries);
    } else {
        initializeUserDatabase();
        return new Map<string, UserData>();
    }
}


/**
 * Saves the user data map to a file.
 * @param userDataMap - The map containing user data to be saved.
 */
export function saveUserDataMap(userDataMap: Map<string, UserData>): void {
    try {
        const userDataJSON = JSON.stringify(Object.fromEntries(userDataMap.entries()), null, 2);
        fs.writeFileSync(USER_DATABASE_FP, userDataJSON, { encoding: "utf-8" });
    } catch (error) {
        console.error("Error saving user database:", error);
    }
}

/**
 * Initializes the history file if it doesn't exist.
 * If the file doesn't exist, it creates an empty history file.
 */
export function initializeHistory(): void {
    try {
        if (!fs.existsSync(HISTORY_FP)) {
            const emptyMap = new Map<string, HistoryEntry>();
            const jsonData = JSON.stringify(Array.from(emptyMap.entries()));
            fs.writeFileSync(HISTORY_FP, jsonData, { encoding: "utf-8" });
        }
    } catch (error) {
        console.error("Error initializing history:", error);
    }
}

/**
 * Loads the history data from the history file.
 * If the history file exists, it reads the data and returns it as a Map.
 * If the history file doesn't exist, it initializes the history file and returns an empty Map.
 * @returns A Map containing the loaded history data.
 */
export function loadHistory(): Map<string, HistoryEntry> {
    if (fs.existsSync(HISTORY_FP)) {
        const historyJSON = fs.readFileSync(HISTORY_FP, "utf-8");
        const historyObject: Record<string, HistoryEntry> = JSON.parse(historyJSON);
        const historyEntries: Array<[string, HistoryEntry]> = Object.entries(historyObject);
        return new Map(historyEntries);
    } else {
        initializeUserDatabase();
        return new Map<string, HistoryEntry>();
    }
}

/**
 * Saves the history data to the history file.
 * @param historyMap The Map containing the history data to be saved.
 */
export function saveHistory(historyMap: Map<string, UserData>): void {
    try {
        const historyJSON = JSON.stringify(Object.fromEntries(historyMap.entries()), null, 2);
        fs.writeFileSync(HISTORY_FP, historyJSON, { encoding: "utf-8" });
    } catch (error) {
        console.error("Error saving user database:", error);
    }
}
