import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

type KnowledgeRequest = {
    propertyId?: string;
    category?: string;
    topic?: string;
    content?: string;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as KnowledgeRequest;
        const propertyId = body.propertyId?.trim();
        const category = body.category?.trim() || 'General';
        const topic = body.topic?.trim();
        const content = body.content?.trim();

        if (!propertyId || !topic || !content) {
            return NextResponse.json({ error: 'propertyId, topic, and content are required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('property_knowledge_base')
            .insert({
                property_id: propertyId,
                category,
                topic,
                content,
            })
            .select('*')
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to add knowledge item', detail: error.message }, { status: 500 });
        }

        return NextResponse.json({ item: data });
    } catch (error) {
        console.error('Concierge knowledge API error:', error);
        return NextResponse.json({ error: 'Failed to add knowledge item' }, { status: 500 });
    }
}
