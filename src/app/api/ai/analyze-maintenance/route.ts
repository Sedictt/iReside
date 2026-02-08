
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { description, image } = await request.json();

        if (!description) {
            return NextResponse.json(
                { error: 'Description is required' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Create a detailed prompt for maintenance analysis
        const prompt = `You are a property maintenance triage expert. Analyze this maintenance request and respond ONLY with a valid JSON object (no markdown, no code blocks, just raw JSON).

Maintenance Request: "${description}"

Respond with EXACTLY this JSON structure (no variations):
{
  "category": "string (one of: Plumbing, Electrical, HVAC, Security, Structural, Appliances, General Maintenance)",
  "severity": "string (one of: Low, Medium, High, Critical)",
  "summary": "string (2-3 sentence technical assessment)",
  "action": "string (specific action steps for landlord/contractor)",
  "estimatedCost": "string (estimated cost range like '$100 - $500')",
  "confidence": "number (0.0-1.0)"
}

Be concise. Prioritize safety-critical issues as Critical or High severity.`;

        const result = await model.generateContent([
            {
                text: prompt,
            },
            // Include image if provided
            ...(image
                ? [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: image.split(',')[1] || image,
                        },
                    },
                ]
                : []),
        ]);

        const responseText = result.response.text();

        // Parse the JSON response
        let analysisData;
        try {
            // Extract JSON from the response (in case there's extra text)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            analysisData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('JSON parse error:', responseText);
            // Return a safe default response
            analysisData = {
                category: 'General Maintenance',
                severity: 'Medium',
                summary: 'A maintenance issue has been reported and requires inspection.',
                action: 'Schedule a visit to inspect and assess the issue.',
                estimatedCost: '$100 - $300',
                confidence: 0.7,
            };
        }

        return NextResponse.json({
            ...analysisData,
            model: 'gemini-2.0-flash',
        });
    } catch (error) {
        console.error('Maintenance analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze maintenance request' },
            { status: 500 }
        );
    }
}
