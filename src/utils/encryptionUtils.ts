import { SALT_ROUNDS } from "./constants";
import bcryptjs from "bcryptjs";

/**
 * Function to encrypt text using bcrypt with the specified number of salt rounds.
 * 
 * @param text - The text to be encrypted.
 * @returns A promise resolving to the encrypted text.
 */
export async function encrypt(text: string): Promise<string> {
    try {
        const hashedText = await bcryptjs.hash(text, SALT_ROUNDS);
        return hashedText;
    } catch (error) {
        throw new Error("Error hashing: " + error);
    }
}


/**
 * Compares a plaintext password with a stored hashed password.
 * @param plaintextPassword - The plaintext password to compare.
 * @param storedHashedPassword - The stored hashed password for comparison.
 * @returns A promise resolving to true if the passwords match, false otherwise.
 */
export async function comparePasswords(plaintextPassword: string, storedHashedPassword: string): Promise<boolean> {
    try {
        const match: boolean = await bcryptjs.compare(plaintextPassword, storedHashedPassword);
        return match;
    } catch (error) {
        throw new Error("Error comparing passwords: " + error);
    }
}