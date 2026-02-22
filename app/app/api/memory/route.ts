import { NextResponse } from 'next/server';
import { MemoryManager } from '@/lib/memory/memory-manager';

export async function GET() {
    try {
        const memoryManager = new MemoryManager();
        const memories = await memoryManager.getAll();
        return NextResponse.json({ memories });
    } catch (error: any) {
        console.error("GET /api/memory error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch memories" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
        }

        const memoryManager = new MemoryManager();
        const result = await memoryManager.delete(id);

        if (!result.success) {
            return NextResponse.json({ error: result.error?.message || "Failed to delete from all sources" }, { status: 500 });
        }

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error("DELETE /api/memory error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
