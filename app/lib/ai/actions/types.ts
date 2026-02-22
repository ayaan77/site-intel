export interface Action {
    name: string;
    similes: string[]; // Variations of names/triggers
    description: string;
    parameters?: Record<string, any>; // JSON Schema for LLM tool calling
    examples: Array<[{ user: string; content: { text: string } }, { user: string; content: { text: string; action?: string; parameters?: Record<string, unknown> } }]>;

    /**
     * Check if this action should be performed based on the message content.
     */
    validate: (message: string) => Promise<boolean>;

    /**
     * Execute the action and return a result string or object.
     */
    execute: (context: ActionContext) => Promise<ActionResult>;
}

export interface ActionContext {
    message: string;
    apiKey?: string;
    [key: string]: any;
}

export interface ActionResult {
    success: boolean;
    data?: any;
    text?: string;
    error?: string;
}
