import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.wareality.tech';

export async function GET(request: NextRequest) {
  try {
    // Get JWT from Authorization header (sent from client with localStorage token)
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Forward request to Spring Boot backend with JWT
    const response = await fetch(
      `${API_BASE_URL}/api/users/github/repos`,
      {
        headers: {
          'Authorization': authHeader, // Pass through JWT
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(error, { status: response.status });
    }

    const repos = await response.json();
    return NextResponse.json(repos);

  } catch (error: any) {
    console.error('Failed to fetch GitHub repos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories', message: error.message },
      { status: 500 }
    );
  }
}
