import { Call, CallType } from "./Call";
import { CALL_REGEXP } from "./constants";

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
