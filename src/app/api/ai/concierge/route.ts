import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { createClient } from '@/utils/supabase/server';

type ConciergeRequest = {
    question?: string;
    propertyId?: string | null;
    propertyName?: string | null;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function buildKnowledgeContext(items: Array<{ category: string; topic: string; content: string }>) {
    if (!items.length) return '';

    return items
        .map((item) => `- [${item.category}] ${item.topic}: ${item.content}`)
        .join('\n');
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ConciergeRequest;
        const question = body.question?.trim();

        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let knowledgeContext = '';
        if (body.propertyId) {
            const { data: kb, error: kbError } = await supabase
                .from('property_knowledge_base')
                .select('category, topic, content')
                .eq('property_id', body.propertyId)
                .order('created_at', { ascending: false });

            if (kbError) {
                return NextResponse.json({ error: 'Failed to load knowledge base' }, { status: 500 });
            }

            knowledgeContext = buildKnowledgeContext(kb || []);
        }

        const propertyName = body.propertyName?.trim() || 'the property';
        const prompt = `You are I.R.I.S., a helpful and polite AI property concierge for ${propertyName}.\n\n` +
            `Your goal is to provide clear and concise answers to tenant questions.\n` +
            `Be friendly but professional. Use a natural, conversational tone, but keep it brief.\n` +
            `For example, instead of just the answer, say something like "Hi, the Wi-Fi password is **12345**."\n` +
            `Avoid excessive enthusiasm (like multiple emojis) or long introductions.\n` +
            `If the answer involves a code or password (like Wi-Fi), bold it using markdown (e.g., **password**).\n` +
            `Use ONLY the knowledge base items below. If the answer is not present, politely state you don't know and suggest contacting the landlord.\n\n` +
            `Knowledge Base:\n${knowledgeContext || '(no knowledge base entries)'}\n\n` +
            `Tenant Question: ${question}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ response: responseText });
    } catch (error) {
        console.error('Concierge API error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
