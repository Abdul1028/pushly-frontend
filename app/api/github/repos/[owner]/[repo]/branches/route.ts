import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.wareality.tech';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    try {
        const { owner, repo } = await params;

        // Get JWT from Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        // Forward request to Spring Boot backend
        const response = await fetch(
            `${API_BASE_URL}/api/users/github/repos/${owner}/${repo}/branches`,
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

        const branches = await response.json();
        return NextResponse.json(branches);

    } catch (error: any) {
        console.error('Failed to fetch branches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branches', message: error.message },
            { status: 500 }
        );
    }
}
