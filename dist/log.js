import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
let dirEnsured = false;
export async function appendBlockLog(path, entry) {
    if (!dirEnsured) {
        try {
            await mkdir(dirname(path), { recursive: true });
            dirEnsured = true;
        }
        catch {
            dirEnsured = true;
        }
    }
    const line = JSON.stringify(entry) + "\n";
    try {
        await appendFile(path, line, { encoding: "utf8" });
    }
    catch (err) {
        console.error(`[openclaw-discipline] failed to append log to ${path}: ${err}`);
    }
}
