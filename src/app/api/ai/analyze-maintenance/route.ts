
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { description, image } = await request.json();

        // SIMULATION: In a real app, you would call OpenAI/Claude here.
        // const response = await openai.chat.completions.create({ ... })

        // We will simulate a processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Intelligent Mock Response Logic based on keywords
        // This is just to demonstrate the UI capabilities without needing a live API key right now.
        const descLower = description.toLowerCase();

        let category = 'General Maintenance';
        let severity = 'Medium';
        let summary = 'The tenant has reported a maintenance issue that requires attention.';
        let action = 'Schedule a visit to inspect the issue.';
        let cost = '$50 - $150';

        if (descLower.includes('leak') || descLower.includes('water') || descLower.includes('drip') || descLower.includes('plumbing')) {
            category = 'Plumbing';
            severity = 'High';
            summary = 'Detected potential water damage risk. Leaks can lead to structural damage and mold if not addressed immediately.';
            action = 'Shut off water supply if possible. Dispatch a licensed plumber immediately to locate and seal the leak.';
            cost = '$150 - $400';
        } else if (descLower.includes('smoke') || descLower.includes('fire') || descLower.includes('spark') || descLower.includes('electric')) {
            category = 'Electrical';
            severity = 'Critical';
            summary = 'Potential fire hazard reported. Electrical issues represent a significant safety risk to tenants and property.';
            action = 'Advise tenant to turn off main breaker if safe. Dispatch emergency electrician immediately.';
            cost = '$200 - $600';
        } else if (descLower.includes('lock') || descLower.includes('door') || descLower.includes('key')) {
            category = 'Security';
            severity = 'High';
            summary = 'Property security may be compromised. Unsecured entry points create liability and safety concerns.';
            action = 'Dispatch locksmith to repair or replace the lock mechanism.';
            cost = '$100 - $250';
        } else if (descLower.includes('ac') || descLower.includes('heat') || descLower.includes('cool')) {
            category = 'HVAC';
            severity = 'Medium';
            summary = 'Climate control system reported malfunctioning. This affects tenant habitability comfort.';
            action = 'Check thermostat settings. Schedule HVAC technician for inspection.';
            cost = '$150 - $500';
        }

        return NextResponse.json({
            category,
            severity,
            summary,
            action,
            estimatedCost: cost,
            confidence: 0.95
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to analyze request' },
            { status: 500 }
        );
    }
}
