import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;

    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`[API Report] Database fetch error for ${id}:`, error);
            // If it doesn't exist, we return a 404 in standard API format or just let the frontend handle the generic error
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        if (!data) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Map snake_case DB fields to camelCase expected by the frontend
        const payload = {
            id: data.id,
            url: data.url,
            status: data.status,
            analyzedAt: data.analyzed_at,
            note: data.note,
            error: data.error,
            seo: data.seo,
            techStack: data.tech_stack,
            competitive: data.competitive,
            architecture: data.architecture,
            aiSummary: data.ai_summary,
            aiRecommendations: data.ai_recommendations,
            competitiveSummary: data.competitive_summary
        };

        return NextResponse.json(payload);
    } catch (err: any) {
        console.error(`[API Report] Unexpected error for ${id}:`, err);
        return NextResponse.json({ error: "Failed to fetch report details" }, { status: 500 });
    }
}
