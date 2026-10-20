import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()

  const user = data?.claims

  if (!user) {
    // No session: redirect to your login page here, e.g.
    // const url = request.nextUrl.clone()
    // url.pathname = '/login'
    // return NextResponse.redirect(url)
  }

  // If the user came from a recovery/invite link, force them to set a new password
  // before accessing any other part of the app.
  const forcePasswordReset = request.cookies.get('ws_force_password_reset')?.value === '1'
  const { pathname } = request.nextUrl

  if (forcePasswordReset && user) {
    const allowed =
      pathname === '/reset-password' ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next/') ||
      pathname === '/favicon.ico'

    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/reset-password'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
