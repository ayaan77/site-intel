import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";
import path from "path";
import os from "os";
import { Action, ActionContext, ActionResult } from "../ai/actions/types";

// This manager bridges the site-intel backend with global MCP servers configured in Opencode.
class MCPManager {
    private clients: Map<string, Client> = new Map();
    private serverConfigs: Record<string, any> = {};

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        try {
            // Load from typical Opencode config paths or the local antigravity mcp_config
            // We use the same config the user has at ~/.gemini/antigravity/mcp_config.json
            const configPath = process.env.MCP_CONFIG_PATH || path.join(os.homedir(), ".gemini", "antigravity", "mcp_config.json");
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, "utf-8");
                const parsed = JSON.parse(configContent);
                this.serverConfigs = parsed.mcpServers || {};
                console.log(`[MCP] Loaded config from ${configPath}. Found ${Object.keys(this.serverConfigs).length} servers.`);
            } else {
                console.log(`[MCP] No config found at ${configPath}`);
            }
        } catch (e: any) {
            console.error(`[MCP] Failed to load config: ${e.message}`);
        }
    }

    private async getOrInitializeClient(serverName: string): Promise<Client | null> {
        if (this.clients.has(serverName)) {
            return this.clients.get(serverName)!;
        }

        const config = this.serverConfigs[serverName];
        if (!config) return null;

        try {
            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args,
                env: { ...process.env, ...config.env }
            });

            const client = new Client(
                { name: "site-intel-mcp-client", version: "1.0.0" },
                { capabilities: {} }
            );

            await client.connect(transport);
            this.clients.set(serverName, client);
            console.log(`[MCP] Connected to server: ${serverName}`);
            return client;

        } catch (e: any) {
            console.error(`[MCP] Failed to connect to server ${serverName}:`, e);
            return null;
        }
    }

    // Convert MCP tools into site-intel 'Actions'
    async getAvailableActions(): Promise<Action[]> {
        const dynamicActions: Action[] = [];

        for (const serverName of Object.keys(this.serverConfigs)) {
            const client = await this.getOrInitializeClient(serverName);
            if (!client) continue;

            try {
                const { tools } = await client.listTools();

                for (const tool of tools) {
                    const actionName = `MCP_${serverName.toUpperCase()}_${tool.name.toUpperCase()}`;

                    // We map the JSON schemas strictly
                    const schemaParameters = tool.inputSchema || { type: "object", properties: {}, additionalProperties: false };
                    // Ensure additionalProperties is explicitly set for strict groq compat
                    if (schemaParameters.type === "object") {
                        schemaParameters.additionalProperties = false;
                    }

                    const dynamicAction: Action = {
                        name: actionName,
                        similes: [tool.name, `${serverName} ${tool.name}`], // Dynamic similes
                        description: `[MCP Server: ${serverName}] ${tool.description || tool.name}`,
                        parameters: schemaParameters,
                        examples: [],
                        validate: async () => false, // Not heavily used dynamically, usually tool_choice="auto" handles it
                        execute: async (context: ActionContext & Record<string, any>): Promise<ActionResult> => {
                            try {
                                console.log(`[MCP] Executing ${tool.name} on ${serverName}...`);
                                // Remove site-intel specific context keys so we only pass the raw tool args
                                const { message, apiKey, ...toolArgs } = context;

                                const result = await client.callTool({
                                    name: tool.name,
                                    arguments: toolArgs
                                });

                                // MCP results are returned as an array of contents (text/image/resource)
                                let textOutput = "";
                                if (result.content && Array.isArray(result.content)) {
                                    textOutput = result.content.map((c: any) => c.text || JSON.stringify(c)).join("\n\n");
                                } else {
                                    textOutput = JSON.stringify(result);
                                }

                                if (result.isError) {
                                    return { success: false, error: textOutput };
                                }

                                return {
                                    success: true,
                                    data: result,
                                    text: textOutput
                                };

                            } catch (e: any) {
                                return { success: false, error: `MCP Tool Execution Failed: ${e.message}` };
                            }
                        }
                    };

                    dynamicActions.push(dynamicAction);
                }
            } catch (e: any) {
                console.error(`[MCP] Error listing tools for ${serverName}:`, e);
            }
        }

        return dynamicActions;
    }
}

// Export a singleton instance
export const mcpManager = new MCPManager();
