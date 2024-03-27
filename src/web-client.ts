import { isAdmin } from "./utils/userUtils";
import { Entry } from "./utils/entry"; 
import { Call, CallType } from "./utils/Call";
import { convertCallStringToCallObj } from "./utils/callUtils"; 

/**
 * Loads entries from the server and renders them in the table.
 */
async function loadEntries() {
    const userLoggedInData = fetch("/self").then((res: Response) => res.json());
    const { loggedIn, username } = await userLoggedInData;

    fetch("/entries")
        .then(response => response.json())
        .then((data) => renderEntries(data, loggedIn, username))
        .catch(error => {
            console.error("Error fetching entries:", error);
        });
}

function loadLogin(): void {
    document.getElementById("greeting")!.textContent = "";
    document.getElementById("logoutButton")!.style.display = "none";
    document.getElementById("loginContainer")!.style.display = "block";
    document.getElementById("logoutContainer")!.style.display = "none";
    document.getElementById("adminFormContainer")!.style.display = "none";
}

async function listenForLogin(loginButton: HTMLElement): Promise<void> {
    loginButton.addEventListener("click", async () => {
        const username = (document.getElementById("username")! as HTMLInputElement).value;
        const password = (document.getElementById("password")! as HTMLInputElement).value;

        fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        })
            .then(response => {
                if (response.ok) {
                    alert("Login successful");
                    loadLogout(username);
                } else {
                    alert("Invalid username or password");
                }
            })
            .then(loadEntries)
            .catch(error => {
                console.error("Error logging in:", error);
            });
    });
}

function loadLogout(username: string): void {
    document.getElementById("greeting")!.textContent = `hi, ${username.toLowerCase()}.`;
    document.getElementById("logoutButton")!.style.display = "inline";
    document.getElementById("loginContainer")!.style.display = "none";
    document.getElementById("logoutContainer")!.style.display = "block";

    if (isAdmin(username)) {
        document.getElementById("adminFormContainer")!.style.display = "block";
    }
}

function listenForLogout(logoutButton: HTMLElement): void {
    logoutButton.addEventListener("click", function () {
        fetch("/logout", {
            method: "POST"
        })
            .then(response => {
                if (response.ok) {
                    alert("Logout successful");
                    loadLogin();
                } else {
                    alert("Logout failed");
                }
            })
            .then(loadEntries)
            .catch(error => {
                console.error("Error logging out:", error);
            });
    });
}

function updatePoints(username: string): void {
    fetch(`/user/${username}`)
        .then(response => {
            if (!response.ok) throw new Error("Could not retrieve user data!");
            return response.json();
        })
        .then(data => {
            const { points } = data;
            document.getElementById("points")!.textContent = ` [${points} pts] `;
        })
        .catch(error => {
            console.error("Error:", error.message);
        });
}

function loadAddEntry(addEntryButton: HTMLElement): void {
    addEntryButton.addEventListener("click", function () {
        const nameInput = document.getElementById("name") as HTMLInputElement;
        const rehearsalInput = document.getElementById("rehearsal") as HTMLInputElement;
        const callTimeInput = document.getElementById("callTime") as HTMLInputElement;
        const name = nameInput.value.trim();
        const rehearsal = rehearsalInput.value.trim();
        const callTime = callTimeInput.value.trim();

        if (name === "" || rehearsal === "" || callTime === "") {
            alert("Please enter name, rehearsal, and call time.");
            return;
        }

        fetch("/entries", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, rehearsal, callTime })
        })
            .then(() => {
                loadEntries();
                nameInput.value = "";
                rehearsalInput.value = "";
            })
            .catch(error => {
                console.error("Error adding entry:", error);
            });
    });

}

function listenForFormSubmit(): void {
    // Event listener to close button
    const closeBtn = document.getElementById("closeBtn")!;
    closeBtn.addEventListener("click", () => {
        const overlay = document.getElementById("overlay")!;
        overlay.style.display = "none";
    });

    const overUnderSelect = document.getElementById("overUnder")! as HTMLSelectElement;
    const entryNameInput = document.getElementById("entryName")! as HTMLInputElement;
    const entryRehearsalInput = document.getElementById("entryRehearsal")! as HTMLInputElement;
    const pointsToBetInput = document.getElementById("pointsToBet")! as HTMLInputElement;
    const betInfoDiv = document.getElementById("betInfo")!;
    const lineCallTimeInput = document.getElementById("lineCallTime")! as HTMLInputElement;

    function updateBetInfo() {
        const lineTimeValue = lineCallTimeInput.value.split("/")[0]!.trimEnd();

        const overUnder = `<strong>${overUnderSelect.value}</strong>`;
        const entryName = `<strong>${entryNameInput.value}</strong>`;
        const lineTime = `<strong>${lineTimeValue}</strong>`;
        const entryRehearsal = `<strong>${entryRehearsalInput.value}</strong>`;
        const pointsToBet = `<strong>${pointsToBetInput.value}</strong>`;

        betInfoDiv.innerHTML = `Placing: ${entryName} will be ${overUnder} ${lineTime} at ${entryRehearsal} for ${pointsToBet} points!`;
    }

    [overUnderSelect, entryNameInput, entryRehearsalInput, pointsToBetInput].forEach(element => {
        element.addEventListener("change", updateBetInfo);
    });

    // Event listener for form submission
    const wagerForm = document.getElementById("wagerForm")!;
    wagerForm.addEventListener("submit", event => {
        event.preventDefault(); // Prevent default form submission behavior, so we can handle it instead

        const uuidElement: HTMLInputElement = document.getElementById("entryUUID") as HTMLInputElement;
        const overUnderElement: HTMLInputElement = document.getElementById("overUnder") as HTMLInputElement;
        const pointsToBetElement: HTMLInputElement = document.getElementById("pointsToBet") as HTMLInputElement;

        const formData: FormElements = {
            uuid: uuidElement.value,
            overUnder: overUnderElement.value,
            pointsToBet: parseInt(pointsToBetElement.value),
        };

        console.log("Form Data:", formData);

        fetch("/place", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        })
            .then(response => {
                if (!response.ok) {
                    console.error("Error placing bet.");
                }
            })
            .then(loadEntries)
            .catch(error => {
                console.error("Error placing bet: ", error);
            });

        const overlay = document.getElementById("overlay")!;
        overlay.style.display = "none";
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const loginButton = document.getElementById("loginButton")!;
    const logoutButton = document.getElementById("logoutButton")!;
    const addEntryButton = document.getElementById("addEntry")!;

    listenForLogin(loginButton);
    listenForLogout(logoutButton);
    listenForFormSubmit();

    const userLoggedInData = fetch("/self").then((res: Response) => res.json());
    const { loggedIn, username } = await userLoggedInData;

    if (loggedIn) {
        loadLogout(username);
        if (isAdmin(username)) {
            document.getElementById("adminFormContainer")!.style.display = "block";
        }
    } else {
        loadLogin();
    }

    loadAddEntry(addEntryButton);
    loadEntries();
});

const socketUrl = (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host;
const socket = new WebSocket(socketUrl);

socket.addEventListener("open", function () {
    console.log("WebSocket connection established at ", socketUrl);
});

socket.addEventListener("message", function () {
    loadEntries();
});


function fillTimeArrivedField(row: HTMLElement, entry: Entry): void {
    const timeArrivedCell = row.querySelector(".row-timeArrived")!;
    const arrivedButton = document.createElement("button");
    arrivedButton.className = "btn btn-secondary btn-sm arrived";
    arrivedButton.textContent = entry.timeArrived ? entry.timeArrived : "arrived";
    arrivedButton.addEventListener("click", function () {
        if (!entry.timeArrived) {
            const uuid = entry.uuid;
            fetch("/log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ uuid })
            })
                .catch(error => {
                    console.error("Error adding entry:", error);
                });
        }
    });
    timeArrivedCell.appendChild(arrivedButton);
}

function renderEntries(entries: Map<string, Entry>, loggedIn: boolean, username: string | undefined) {
    console.debug(entries, typeof (entries));

    const entriesTable = document.getElementById("entries")!;
    entriesTable.innerHTML = "";

    const rowTemplate = document.getElementById("row-template") as HTMLTemplateElement;

    Object.entries(entries).forEach(([uuid, entry]: [string, Entry]) => {
        const row = rowTemplate.content.cloneNode(true) as HTMLElement;

        console.debug(entry);

        // Fill in the entry data
        row.querySelector(".row-uuid")!.textContent = uuid;
        row.querySelector(".row-name")!.textContent = entry.name.toLowerCase();
        row.querySelector(".row-rehearsal")!.textContent = entry.rehearsal.toLowerCase();
        row.querySelector(".row-lineCallTime")!.textContent = entry.lineTime + " / " + entry.callTime;
        fillTimeArrivedField(row, entry);

        const marqueeElement = document.createElement("marquee");
        marqueeElement.classList.add("call-marquee");
        

        // Creating the marquee effect
        entry.calls.forEach((call: string, index: number) => {
            const callObj: Call = convertCallStringToCallObj(call);
            const callElement = document.createElement("span");
            const overUnderText: string = callObj.type === CallType.Over ? "over" : "under";

            const strongElement = document.createElement("strong");
            strongElement.textContent = callObj.name;
            callElement.appendChild(strongElement);

            callElement.innerHTML += " " + overUnderText + " for " + callObj.value;
            callElement.classList.add("call");
            callElement.classList.add(overUnderText);
            marqueeElement.appendChild(callElement);

            if (index !== entry.calls.length - 1) {
                const spacerElement = document.createElement("span");
                spacerElement.textContent = " --- ";
                marqueeElement.appendChild(spacerElement);
            }
        });

        row.querySelector(".row-call")!.appendChild(marqueeElement);

        // Figuring out which buttons are available to the user
        const editButton = row.querySelector(".edit") as HTMLButtonElement;
        const deleteButton = row.querySelector(".delete") as HTMLButtonElement;
        const wagerButton = row.querySelector(".wager") as HTMLButtonElement;

        if (!loggedIn || username === undefined) {
            editButton.style.display = "none";
            deleteButton.style.display = "none";
            wagerButton.style.display = "none";
        } else {
            wagerButton.style.display = (entry.timeArrived === "") ? "inline" : "none";
            if (isAdmin(username)) {
                editButton.style.display = "inline";
                deleteButton.style.display = "inline";
            } else {
                editButton.style.display = "none";
                deleteButton.style.display = "none";
            }
            updatePoints(username);
        }

        // Event listener for deleting entry
        deleteButton.addEventListener("click", async function() {
            const entryId = entry.uuid;
            try {
                const response = await fetch(`/entries/${entryId}`, {
                    method: "DELETE"
                });
                if (response.ok) {
                    console.log("Entry deleted successfully");
                } else {
                    console.error("Failed to delete entry:", response.statusText);
                }
            } catch (error) {
                console.error("Error deleting entry:", error);

            }
        });

        // Event listener for showing wager form
        wagerButton.addEventListener("click", () => {
            const overlay = document.getElementById("overlay")!;
            overlay.style.display = "block";

            const entryRow = wagerButton.closest("tr")!;
            const entryUUID = entryRow.querySelector(".row-uuid")!.textContent;
            const entryName = entryRow.querySelector(".row-name")!.textContent;
            const entryRehearsal = entryRow.querySelector(".row-rehearsal")!.textContent;
            const entryLineCallTime = entryRow.querySelector(".row-lineCallTime")!.textContent;

            const entryUUIDInput = document.getElementById("entryUUID") as HTMLInputElement;
            const entryNameInput = document.getElementById("entryName") as HTMLInputElement;
            const entryRehearsalInput = document.getElementById("entryRehearsal") as HTMLInputElement;
            const lineCallTimeInput = document.getElementById("lineCallTime") as HTMLInputElement;
            entryUUIDInput.value = entryUUID!;
            entryNameInput.value = entryName!;
            entryRehearsalInput.value = entryRehearsal!;
            lineCallTimeInput.value = entryLineCallTime!;
        });

        entriesTable.appendChild(row);
    });
}

interface FormElements {
    uuid: string;
    overUnder: string;
    pointsToBet: number;
}