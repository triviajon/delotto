import { UserData } from "./UserData";
import { encrypt } from "./encryptionUtils";
import { saveUserDataMap } from "./fileSystemUtils";

/**
 * Function to add a new user entry to the user data and write it to the database file.
 * Adds a new user entry to the provided user data map with the specified username, password, and points.
 * If the user already exists in the user data map, logs an error and returns.
 * 
 * @param userDataMap - A Map<string, UserData> containing user data.
 * @param username - The username of the new user.
 * @param password - The password of the new user.
 * @param points - The initial points of the new user.
 * @returns A Promise<void>.
 */
export async function addUserEntry(userDataMap: Map<string, UserData>, username: string, password: string, points: number): Promise<void> {
    const lowerUsername = username.toLowerCase();

    if (userDataMap.has(lowerUsername)) {
        console.error(`User "${lowerUsername}" already exists.`);
        return;
    }

    const hashedPassword: string = await encrypt(password);

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
        console.error("Error adding user entry:", error);
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