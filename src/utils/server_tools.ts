import express, { Application, Request, Response } from "express";
import WebSocket, { WebSocketServer } from 'ws';
import { loadDatabase, saveDatabase, Entry, convertEntries, loadUserData, UserData, addUserEntry, Call, CallType, convertCallObjToCallString, saveUserDataMap, isAdmin, GetUserResponse, calculateLineTime, distributeEarnings, calculateEarnings} from "./database";
import { PORT, STARTING_POINTS } from './constants';
import Browserify from 'browserify';
import fs from 'fs';
import { Server } from 'http';
import { stringify, v4 as uuidv4 } from 'uuid';
import path from 'path';
import session from 'express-session';
import bcryptjs from 'bcryptjs';

declare module 'express-session' {
    export interface SessionData {
        user: string;
    }
}

type InitializeServerResponse = { wss: WebSocketServer, server: Server, entries: Map<string, Entry> }

/**
 * Sends JSONable data through a websocket to all clients of the websocket.
 * 
 * @param wss the websocket server to use
 * @param data the data to be sent through the websocket, must be JSON stringifyable.
 */
function broadcast(socketServer: WebSocketServer, data: any) {
    console.log("Sending over data:", JSON.stringify(data));
    socketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

/**
 * Authenticates users. If the username exists in the user database, we return true when the hashedPasswords match.
 * Otherwise, we create a new user on the database with the username.
 * 
 * @param username the user's username. must have length > 0.
 * @param hashedPassword the user's password, hashed. must have length > 0. 
 * @returns true if the username exists and the hashedPasswords match OR if the username does not exist, else false
 */
async function authenticate(userDatabase: Map<string, UserData>, username: string, hashedPassword: string): Promise<boolean> {
    const lowerUsername = username.toLowerCase();
    // Check if the username exists in the database
    if (userDatabase.has(lowerUsername)) {
        // Compare the hashed password in the database with the provided hashed password
        const storedHashedPassword = userDatabase.get(lowerUsername)!.hashedPassword;
        const match: boolean = await bcryptjs.compare(hashedPassword, storedHashedPassword);
        return match;
    } else {
        // If the username does not exist, create a new user with the provided hashed password
        addUserEntry(userDatabase, lowerUsername, hashedPassword, STARTING_POINTS);
        return true;
    }
}
/**
 * Initializes the server.
 * 
 * @returns An InitializeServerResponse, consisting of:
 *      the WebSocket for updating the client's entries,
 *      the server object, and the current list of entries.
 */
export function initializeServer(): InitializeServerResponse {
    const app = express();
    app.use(express.json());

    app.use(session({
        secret: 'testSecret',
        resave: false,
        saveUninitialized: true,
    }));

    const entries = loadDatabase();
    const userData = loadUserData();
    console.log(entries, typeof (entries));

    // Endpoint to retrieve the list of entries
    app.get('/entries', function (req: Request, res: Response) {
        res.json(convertEntries(entries));
    });

    // Endpoint to add a new entry
    app.post('/entries', function (req: Request, res: Response) {
        if (req.session && req.session.user && isAdmin(req.session.user)) {
            const reqBody = req.body;
            const uuid: string = uuidv4();
            const newEntry: Entry = {
                uuid: uuid,
                name: reqBody.name,
                rehearsal: reqBody.rehearsal,
                callTime: reqBody.callTime,
                lineTime: calculateLineTime(entries, reqBody.name, reqBody.callTime),
                timeArrived: "",
                calls: Array<string>()
            };
            entries.set(uuid, newEntry);
            saveDatabase(entries);
            broadcast(wss, convertEntries(entries));
            res.sendStatus(201);
        } else {
            res.sendStatus(401);
        }


    });

    // Endpoint to log time
    app.post('/log', function (req: Request, res: Response) {
        if (req.session && req.session.user && isAdmin(req.session.user)) {
            const uuid: string = req.body['uuid'];
            const entryToModify: Entry | undefined = entries.get(uuid);
            if (entryToModify !== undefined) {
                entryToModify.timeArrived = new Date().toLocaleTimeString();
                saveDatabase(entries); // Save entries to the database after updating the time
                const profitMap: Map<string, number> = calculateEarnings(entries, uuid);
                distributeEarnings(userData, profitMap);
                broadcast(wss, convertEntries(entries)); // Broadcast updated entries to all clients    
                res.sendStatus(200);
            } else {
                res.status(400).json({ error: 'Invalid entry ID: ' + uuid });
            }
        } else {
            res.sendStatus(401);
        }
    });

    app.post('/place', (req: Request, res: Response) => {
        const { uuid, overUnder, pointsToBet } = req.body;
        const entryToModify: Entry | undefined = entries.get(uuid);
        if (req.session && req.session.user && entryToModify && entryToModify.timeArrived === "") {
            const username = req.session.user;
            const usernameData = userData.get(username);
            if (usernameData && usernameData.points >= pointsToBet) {
                usernameData.points -= pointsToBet;
                saveUserDataMap(userData);
                const call: Call = {
                    name: username,
                    type: overUnder === "over" ? CallType.Over : CallType.Under,
                    value: pointsToBet
                }
                entryToModify.calls.push(convertCallObjToCallString(call));
                saveDatabase(entries);
                broadcast(wss, convertEntries(entries));
                res.sendStatus(200);
            } else {
                res.status(400).json({ error: 'Insufficient points!' });
            }
        } else {    
            res.status(400).json({ error: 'Something went wrong!' });
        }
    }) 

    app.get('/user/:username', (req, res) => {
        const username = req.params.username;
        const user = userData.get(username);
        if (req.session && req.session.user && user) {
            if (req.session.user == username || isAdmin(req.session.user)) {
                const userResponse: GetUserResponse = {
                    username: username,
                    points: user.points
                }
                res.json(userResponse);
            } else {
                res.status(401);
            }
        } else {
            res.status(400);
        }
    });

    // Endpoint to update an existing entry
    app.put('/entries/:id', function (req: Request, res: Response) {
        const uuid = req.params["uuid"]!;
        const updatedEntry = req.body;
        entries.set(uuid, updatedEntry);
        saveDatabase(entries);
        broadcast(wss, convertEntries(entries));
        res.sendStatus(204);
    });

    // Endpoint to delete an entry
    app.delete('/entries/:id', function (req: Request, res: Response) {
        const uuid = req.params["uuid"]!;
        entries.delete(uuid);
        saveDatabase(entries);
        broadcast(wss, entries);
        res.sendStatus(204);
    });

    app.get('/bundle.js', function (req: Request, res: Response) {
        res.contentType('application/javascript');
        new Browserify().add('dist/web-client.js').bundle().pipe(res, { end: true });
    });

    app.get('/', function (req: Request, res: Response) {
        res.end(fs.readFileSync('lib/web.html', { encoding: 'utf-8' }));
    });

    // Endpoint to handle login requests
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const validUser: boolean = await authenticate(userData, username, password);
        
        if (validUser) {
            req.session.user = username;
            res.status(200).send('Login successful');
        } else {
            res.status(401).send('Invalid username or password');
        }
    });

    // Endpoint to handle logout requests
    app.post('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                console.error('Error logging out:', err);
                res.status(500).send('Error logging out');
            } else {
                res.status(200).send('Logout successful');
            }
        });
    });

    app.get('/user', (req, res) => {
        const loggedIn: boolean = (req.session !== undefined && req.session.user !== undefined);
        const username = loggedIn ? req.session.user : undefined;
        res.status(200).json({loggedIn, username});
    })

    const server = app.listen(PORT, () => {
        console.log(`Web server listening on http://localhost:${PORT}`);
    });
    const wss = new WebSocket.Server({ server });

    return { server: server, wss: wss, entries: entries };
} 