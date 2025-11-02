import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

export async function GET() {
  const session = await auth();
  const token = (session as any)?.githubAccessToken as string | undefined;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch("https://api.github.com/user/repos?per_page=100", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "GitHub error", detail: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}


