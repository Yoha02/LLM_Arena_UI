import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function GET(request: NextRequest) {
  const state = experimentManager.getState();
  
  return NextResponse.json({
    isRunning: state.isRunning,
    currentTurn: state.currentTurn,
    messageCount: state.conversation?.length || 0,
    error: state.error || null,
    firstMessage: state.conversation?.[0]?.content?.substring(0, 200) || null
  });
} 