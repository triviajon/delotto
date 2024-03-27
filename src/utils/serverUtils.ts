import express, { Request, Response } from "express";
import WebSocket, { WebSocketServer } from "ws";
import { PORT, TIME_REGEXP } from "./constants";
import Browserify from "browserify";
import fs from "fs";
import { Server } from "http";
import { v4 as uuidv4 } from "uuid";
import session from "express-session";
import { Entry } from "./Entry";
import { UserData } from "./UserData";
import { comparePasswords } from "./encryptionUtils";
import { loadDatabase, loadHistory, loadUserData, saveDatabase, saveUserDataMap } from "./fileSystemUtils";
import { calculateEarnings, calculateLineTime, convertEntries } from "./entryUtils";
import { distributeEarnings, isAdmin } from "./userUtils";
import { convertCallObjToCallString } from "./callUtils";
import { Call, CallType } from "./Call";
import { GetEntriesRequest, GetEntriesResponse, AddEntryRequest, LogTimeRequest, PlaceBetRequest, GetUserRequest, GetUserResponse, LoginRequest, LogoutRequest, GetSelfResponse } from "./apiModels";
import { addToHistory } from "./historyUtils";
import { convertTimeInputToISOString } from "./timeUtils";

type InitializeServerResponse = { wss: WebSocketServer, server: Server, entries: Map<string, Entry> }

/**
 * Sends JSONable data through a websocket to all clients of the websocket.
 * 
 * @param wss the websocket server to use
 * @param data the data to be sent through the websocket, must be JSON stringifyable.
 */
function broadcast<T>(socketServer: WebSocketServer, data: T) {
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
 * @param password the user's password. must have length > 0. 
 * @returns true if the username exists and the hashedPasswords match OR if the username does not exist, else false
 */
async function authenticate(userDatabase: Map<string, UserData>, username: string, password: string): Promise<boolean> {
    const lowerUsername = username.toLowerCase();
    const storedUserData = userDatabase.get(lowerUsername);

    if (!storedUserData) {
        return false; // User not found
    }

    const storedHashedPassword = storedUserData.hashedPassword;
    return await comparePasswords(password, storedHashedPassword);
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
        secret: "testSecret",
        resave: false,
        saveUninitialized: true,
    }));

    app.use("/lib", express.static("lib"));

    const entries = loadDatabase();
    const userData = loadUserData();
    const history = loadHistory();

    // Endpoint to retrieve the list of entries
    app.get("/entries", function (req: Request, res: Response) {
        const body: GetEntriesRequest = req.body;
        console.debug("GET /entries:", body);
        const responseBody: GetEntriesResponse = convertEntries(entries);
        res.json(responseBody);
    });

    // Endpoint to add a new entry
    app.post("/entries", function (req: Request, res: Response) {
        const body: AddEntryRequest = req.body;
        console.debug("POST /entries:", body);
        if (req.session && req.session.user && isAdmin(req.session.user) && TIME_REGEXP.test(body.callTime)) {
            const uuid: string = uuidv4();
            const callTime: string = convertTimeInputToISOString(body.callTime);
            const newEntry: Entry = {
                uuid: uuid,
                name: body.name,
                rehearsal: body.rehearsal,
                callTime: callTime,
                lineTime: calculateLineTime(entries, body.name, new Date(callTime)).toISOString(),
                timeArrived: undefined,
                calls: new Array<string>()
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
    app.post("/log", function (req: Request, res: Response) {
        const body: LogTimeRequest = req.body;
        console.debug("POST /log:", body);
        if (req.session && req.session.user && isAdmin(req.session.user)) {
            const uuid: string = body["uuid"];
            const entryToModify: Entry | undefined = entries.get(uuid);
            if (entryToModify !== undefined) {
                entryToModify.timeArrived = (new Date()).toISOString();
                saveDatabase(entries); 
                const {profitMap, lossMap} = calculateEarnings(entries, uuid);
                distributeEarnings(userData, profitMap);
                addToHistory(history, entryToModify, profitMap, lossMap);
                broadcast(wss, convertEntries(entries)); 
                res.sendStatus(200);
            } else {
                res.status(400).json({ error: "Invalid entry ID: " + uuid });
            }
        } else {
            res.sendStatus(401);
        }
    });

    app.post("/place", (req: Request, res: Response) => {
        const body: PlaceBetRequest = req.body;
        console.debug("POST /place:", body);
        const entryToModify: Entry | undefined = entries.get(body.uuid);
        if (req.session && req.session.user && entryToModify && entryToModify.timeArrived) {
            const username = req.session.user;
            const usernameData = userData.get(username);
            if (usernameData && usernameData.points >= body.pointsToBet) {
                usernameData.points -= body.pointsToBet;
                saveUserDataMap(userData);
                const call: Call = {
                    name: username,
                    type: body.overUnder === "over" ? CallType.Over : CallType.Under,
                    value: body.pointsToBet
                };
                entryToModify.calls.push(convertCallObjToCallString(call));
                saveDatabase(entries);
                broadcast(wss, convertEntries(entries));
                res.sendStatus(200);
            } else {
                res.status(400).json({ error: "Insufficient points!" });
            }
        } else {    
            res.status(400).json({ error: "Something went wrong!" });
        }
    }); 

    app.get("/user/:username", (req, res) => {
        const params: GetUserRequest = req.params;
        console.debug("GET /user/:username:", params);

        const user = userData.get(params.username);
        if (req.session && req.session.user && user) {
            if (req.session.user == params.username || isAdmin(req.session.user)) {
                const userResponse: GetUserResponse = {
                    username: params.username,
                    points: user.points
                };
                res.json(userResponse);
            } else {
                res.status(401);
            }
        } else {
            res.status(400);
        }
    });

    // Endpoint to delete an entry
    app.delete("/entries/:uuid", function (req: Request, res: Response) {
        const params = req.params as { uuid: string };
        console.debug("DELETE /entries/:uuid:", params);

        if (req.session && req.session.user && isAdmin(req.session.user)) {
            entries.delete(params.uuid);
            saveDatabase(entries);
            broadcast(wss, entries);
            res.sendStatus(204);
        } else {
            res.sendStatus(401);
        }
    });

    app.get("/bundle.js", function (req: Request, res: Response) {
        res.contentType("application/javascript");
        new Browserify().add("dist/web-client.js").bundle().pipe(res, { end: true });
    });

    app.get("/", function (req: Request, res: Response) {
        res.end(fs.readFileSync("lib/web.html", { encoding: "utf-8" }));
    });

    // Endpoint to handle login requests
    app.post("/login", async (req, res) => {
        const body: LoginRequest = req.body;
        console.debug("POST /login:", body);
        const validUser: boolean = await authenticate(userData, body.username, body.password);
        
        if (validUser) {
            req.session.user = body.username;
            res.status(200).send("Login successful");
        } else {
            res.status(401).send("Invalid username or password");
        }
    });

    // Endpoint to handle logout requests
    app.post("/logout", (req, res) => {
        const body: LogoutRequest = req.body;
        console.debug("POST /logout:", body);
        req.session.destroy(err => {
            if (err) {
                console.error("Error logging out:", err);
                res.status(500).send("Error logging out");
            } else {
                res.status(200).send("Logout successful");
            }
        });
    });

    app.get("/self", (req: Request, res: Response) => {
        const isLoggedIn: boolean = (req.session !== undefined && req.session.user !== undefined);
        const username = isLoggedIn ? req.session.user : undefined;
        const responseBody: GetSelfResponse = {
            loggedIn: isLoggedIn,
            username: username
        };

        if (isLoggedIn) {
            res.status(200).json(responseBody);
        } else {
            res.status(401).json(responseBody);
        }
    });

    const server = app.listen(PORT, () => {
        console.log(`Web server listening on http://localhost:${PORT}`);
    });
    const wss = new WebSocket.Server({ server });

    return { server: server, wss: wss, entries: entries };
} 