export type ModelProviderName = "groq" | "openai" | "anthropic";

export interface Character {
    name: string;
    username?: string;
    bio: string | string[];
    lore?: string[];
    messageExamples?: Array<[{ user: string; content: { text: string } }, { user: string; content: { text: string } }]>;
    postExamples?: string[];
    topics?: string[];
    style: {
        all: string[];
        chat: string[];
        post: string[];
    };
    adjectives?: string[];
    knowledge?: string[];
    clients?: string[];
    plugins?: string[];
    settings?: {
        secrets?: { [key: string]: string };
        voice?: { model: string };
        model?: string;
    };
}
