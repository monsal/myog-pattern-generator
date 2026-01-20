import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { buildPatternGenerationPrompt, SYSTEM_PROMPT } from '../src/lib/prompts/pattern-generator';
import { validatePattern } from '../src/lib/validation/pattern-validator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { request } = req.body;

    if (!request || !request.description) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: description is required',
      });
    }

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: API key not set',
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Build the prompt
    const userPrompt = buildPatternGenerationPrompt(request);

    // Call Claude API
    console.log('Calling Claude API for pattern generation...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the response text
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    // Parse JSON response
    let pattern;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      pattern = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Response was:', responseText);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response. The AI did not return valid JSON.',
      });
    }

    // Validate the generated pattern
    const validation = validatePattern(pattern);
    if (!validation.valid) {
      console.error('Pattern validation failed:', validation.errors);
      return res.status(500).json({
        success: false,
        error: 'Generated pattern failed validation',
        validationErrors: validation.errors,
      });
    }

    // Add token usage metadata
    pattern.metadata.tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    console.log(`Pattern generated successfully. Tokens used: ${pattern.metadata.tokensUsed}`);

    // Return the validated pattern
    return res.status(200).json({
      success: true,
      pattern,
    });
  } catch (error: any) {
    console.error('Error generating pattern:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate pattern',
    });
  }
}
