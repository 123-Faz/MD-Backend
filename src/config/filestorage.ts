
import { StoragePaths } from "@/types";
import fs from "fs";
import path from "path";
export const storages: StoragePaths = {
    public_folder: path.resolve(__dirname, "../public"),
    storage_folder: path.resolve(__dirname, "../storage"),
};



export const createStorageFolders = () => {
    Object.values(storages).forEach((folderPath) => {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true })
            console.log(`Created directory: ${folderPath}`);
        }
    });
}