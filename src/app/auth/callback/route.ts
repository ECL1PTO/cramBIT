import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { notifyAdminOfLogin } from '@/lib/notify'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (data.user?.email) notifyAdminOfLogin(data.user.email).catch(() => {})
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`)
}
