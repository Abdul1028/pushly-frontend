import { NextRequest, NextResponse } from 'next/server';

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state'); // JWT token passed as state

        // Handle OAuth errors
        if (error || !code) {
            console.error('GitHub OAuth error:', error);
            return NextResponse.redirect(
                new URL('/settings?github=error&message=' + (error || 'no_code'), request.url)
            );
        }

        // Check if state (JWT token) exists
        if (!state) {
            console.error('No state (JWT token) in callback');
            return NextResponse.redirect(
                new URL('/settings?github=error&message=no_auth_token', request.url)
            );
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData.error_description);
            return NextResponse.redirect(
                new URL('/settings?github=error&message=token_exchange_failed', request.url)
            );
        }

        const accessToken = tokenData.access_token;

        // Get GitHub user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        });

        if (!userResponse.ok) {
            console.error('Failed to fetch GitHub user');
            return NextResponse.redirect(
                new URL('/settings?github=error&message=user_fetch_failed', request.url)
            );
        }

        const githubUser = await userResponse.json();

        // Save GitHub token to backend using JWT from state parameter
        const saveResponse = await fetch(`${API_BASE_URL}/api/users/github/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state}`, // Use state parameter as JWT token
            },
            body: JSON.stringify({
                accessToken: accessToken,
                githubUsername: githubUser.login,
            }),
        });

        if (!saveResponse.ok) {
            console.error('Failed to save GitHub token');
            return NextResponse.redirect(
                new URL('/settings?github=error&message=save_failed', request.url)
            );
        }

        // Success! Redirect to settings
        return NextResponse.redirect(
            new URL('/settings?github=connected', request.url)
        );

    } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        return NextResponse.redirect(
            new URL('/settings?github=error&message=unknown_error', request.url)
        );
    }
}
