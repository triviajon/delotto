export interface UserData {
    username: string; // length > 0
    hashedPassword: string; // length > 0
    points: number; // > 0, integral
}