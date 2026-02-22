import { Action, ActionContext, ActionResult } from "./types";
import { promises as fs } from "fs";
import path from "path";

const SIMILES = [
    "read file",
    "open file",
    "view file",
    "check file",
    "read local file",
    "what is in file",
    "show me the code in"
];

export const LOCAL_FILE_ACTION: Action = {
    name: "LOCAL_FILE_ACTION",
    similes: SIMILES,
    description: "Reads the content of a local file on the host machine. Use this to inspect code, logs, or text files.",
    parameters: {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "The absolute path or path relative to the project root of the file to read."
            }
        },
        required: ["filePath"],
        additionalProperties: false
    },
    examples: [
        [
            { user: "user", content: { text: "Read the file at /Users/ayanashraf/Documents/anti/voicebox/backend/test_audio.py" } },
            { user: "assistant", content: { text: "Reading file...", action: "LOCAL_FILE_ACTION", parameters: { filePath: "/Users/ayanashraf/Documents/anti/voicebox/backend/test_audio.py" } } }
        ]
    ],

    validate: async (message: string): Promise<boolean> => {
        const lowerMessage = message.toLowerCase();
        return SIMILES.some(s => lowerMessage.includes(s));
    },

    execute: async (context: ActionContext & { filePath?: string }): Promise<ActionResult> => {
        try {
            const filePath = context.filePath;

            if (!filePath) {
                return {
                    success: false,
                    error: "Missing required Agent parameters. Please specify 'filePath'."
                };
            }

            // Resolve the path assuming absolute, or relative to the cwd where the Next.js app runs
            const absolutePath = path.resolve(filePath);

            // Check if file exists and is accessible
            await fs.access(absolutePath);

            // Read file content
            const content = await fs.readFile(absolutePath, { encoding: "utf8" });

            // Truncate excessively large files so we don't blow up the Groq context window abruptly.
            let stringifiedData = content;
            if (stringifiedData.length > 50000) {
                stringifiedData = stringifiedData.substring(0, 50000) + "\n\n... [Content truncated for context window limits]";
            }

            return {
                success: true,
                data: { path: absolutePath, length: content.length },
                text: `[SYSTEM] Successfully read file ${absolutePath}. Content: \n\n\`\`\`\n${stringifiedData}\n\`\`\``
            };

        } catch (error: any) {
            console.error("Local File Action Error:", error);
            // Handle common fs errors gracefully
            if (error.code === 'ENOENT') {
                return { success: false, error: `File not found at path: ${context.filePath}` };
            }
            if (error.code === 'EACCES') {
                return { success: false, error: `Permission denied reading file: ${context.filePath}` };
            }
            return {
                success: false,
                error: `Failed to read file: ${error.message}`
            };
        }
    }
};
