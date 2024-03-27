import { Entry } from "./entry";

// Request interface for GET /entries
export interface GetEntriesRequest {}

// Response interface for GET /entries
export interface GetEntriesResponse {
    // Define properties based on the response format
    // For example:
    [key: string]: Entry 
}

// Request interface for POST /entries
export interface AddEntryRequest {
    name: string;
    rehearsal: string;
    callTime: string;
}

// Request interface for POST /log
export interface LogTimeRequest {
    uuid: string;
}

// Request interface for POST /place
export interface PlaceBetRequest {
    uuid: string;
    overUnder: string;
    pointsToBet: number;
}

// Request interface for GET /user/:username
export interface GetUserRequest {
    username: string;
}

// Response interface for GET /user/:username
export interface GetUserResponse {
    username: string;
    points: number;
}

// Response interface for GET /user
export interface GetSelfResponse {
    loggedIn: boolean;
    username?: string;
}

// Request interface for DELETE /entries/:id
export interface DeleteEntryRequest {
    id: string;
}

// Request interface for POST /login
export interface LoginRequest {
    username: string;
    password: string;
}

// Response interface for POST /login
export interface LoginResponse {}

// Request interface for POST /logout
export interface LogoutRequest {}

// Response interface for POST /logout
export interface LogoutResponse {}

// Request interface for GET /user
export interface CheckUserRequest {}

// Response interface for GET /user
export interface CheckUserResponse {
    loggedIn: boolean;
    username?: string;
}
