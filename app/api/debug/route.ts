import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 'PRESENT' : 'MISSING',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'PRESENT' : 'MISSING',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'MISSING',
      // Show first 10 chars of API key for debugging (safe)
      OPENROUTER_KEY_PREFIX: process.env.OPENROUTER_API_KEY?.substring(0, 10) || 'NONE',
      OPENAI_KEY_PREFIX: process.env.OPENAI_API_KEY?.substring(0, 10) || 'NONE'
    }
  });
} 