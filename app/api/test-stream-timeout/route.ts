import { NextRequest } from 'next/server'
import { createOpenRouterClient } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, model = 'deepseek-r1' } = body

    if (!apiKey) {
      return Response.json({ error: 'API key required' }, { status: 400 })
    }

    const client = createOpenRouterClient(apiKey)
    
    // Test prompt that should generate a longer response
    const testMessages = [
      {
        role: 'system' as const,
        content: 'You are a helpful AI assistant. Please provide detailed, thorough responses.'
      },
      {
        role: 'user' as const, 
        content: 'Please explain the concept of machine learning in detail, including its history, key algorithms, applications, and future prospects. Take your time and be thorough.'
      }
    ]

    console.log('🧪 Testing stream timeout handling...')
    
    const startTime = Date.now()
    let chunkCount = 0
    let totalContent = ''
    let streamCompleted = false
    let streamErrors: string[] = []

    try {
      const stream = await client.chat.completions.create({
        model: 'deepseek/deepseek-r1-0528',
        messages: testMessages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
      })

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout after 90 seconds')), 90000)
      })

      const streamPromise = (async () => {
        for await (const chunk of stream) {
          chunkCount++
          
          if (chunk.choices?.[0]?.delta?.content) {
            totalContent += chunk.choices[0].delta.content
          }
          
          if (chunk.choices?.[0]?.finish_reason) {
            streamCompleted = true
            break
          }
          
          // Log every 50 chunks for debugging
          if (chunkCount % 50 === 0) {
            console.log(`Chunk ${chunkCount}: ${totalContent.length} chars so far`)
          }
        }
      })()

      // Race between stream and timeout
      await Promise.race([streamPromise, timeoutPromise])
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      streamErrors.push(errorMsg)
      console.error('Stream error:', error)
    }

    const duration = Date.now() - startTime
    
    // Analyze results
    const results = {
      success: streamCompleted && streamErrors.length === 0,
      duration: `${duration}ms`,
      chunkCount,
      contentLength: totalContent.length,
      streamCompleted,
      errors: streamErrors,
      contentPreview: totalContent.substring(0, 200) + '...',
      isLikelyIncomplete: !streamCompleted || totalContent.length < 100,
      analysis: {
        averageChunkSize: chunkCount > 0 ? Math.round(totalContent.length / chunkCount) : 0,
        chunksPerSecond: chunkCount > 0 ? Math.round((chunkCount / duration) * 1000) : 0,
        timeout: duration > 85000 // Near timeout threshold
      }
    }

    console.log('🧪 Stream test results:', results)

    return Response.json({
      status: 'completed',
      results,
      recommendations: results.isLikelyIncomplete ? [
        'Stream appeared incomplete - consider increasing timeout',
        'Check network stability',
        'Verify API key permissions'
      ] : [
        'Stream completed successfully',
        'Timeout handling working correctly'
      ]
    })

  } catch (error) {
    console.error('Test stream error:', error)
    return Response.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 