export interface UserData {
    username: string; // non-empty
    hashedPassword: string; // non-empty
    points: number; // > 0, integral
}