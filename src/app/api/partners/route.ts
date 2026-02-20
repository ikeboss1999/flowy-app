import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Supabase Admin Check:", !!supabaseAdmin);
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Server configuration error: Admin client null" }, { status: 500 });
        }

        const { data, error } = await supabaseAdmin
            .from('partners')
            .select('*')
            .order('created_at', { ascending: false });

        console.log("API /partners GET:", { dataCount: data?.length, error });

        if (error) {
            console.error("Error fetching partners:", error);
            return NextResponse.json({ error: error.message, details: error }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Internal Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const body = await req.json();
        const { name, logo_content } = body;

        if (!name || !logo_content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // TODO: Implement proper admin check here if not already handled by layout/middleware.
        // For now, relies on the frontend/admin layout protection and server-side secret usage.

        const { data, error } = await supabaseAdmin
            .from('partners')
            .insert([{ name, logo_content }])
            .select()
            .single();

        if (error) {
            console.error("Error creating partner:", error);
            return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('partners')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting partner:", error);
            return NextResponse.json({ error: "Failed to delete partner" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
