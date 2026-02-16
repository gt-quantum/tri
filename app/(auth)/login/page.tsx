'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const error = searchParams.get('error')
  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if user has an org
        const orgId = session.user.app_metadata?.org_id
        if (orgId) {
          router.push(redirect)
        } else {
          router.push('/onboarding')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router, redirect])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brass/40 to-transparent mb-6" />
          <h1 className="font-display text-2xl text-warm-white tracking-wide mb-2">
            TRI Platform
          </h1>
          <p className="font-body text-warm-300 text-sm">
            Sign in to your account
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body">
            {error === 'auth_callback_failed'
              ? 'Authentication failed. Please try again.'
              : error === 'deactivated'
                ? 'Your account has been deactivated. Contact your organization admin.'
                : 'An error occurred. Please try again.'}
          </div>
        )}

        {/* Auth UI */}
        <div className="card-surface p-6">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#c8a55a',
                    brandAccent: '#dfc07a',
                    brandButtonText: '#04040a',
                    defaultButtonBackground: '#10101c',
                    defaultButtonBackgroundHover: '#1c1c28',
                    defaultButtonBorder: 'rgba(200, 165, 90, 0.08)',
                    defaultButtonText: '#ece8e0',
                    inputBackground: '#0c0c16',
                    inputBorder: 'rgba(200, 165, 90, 0.08)',
                    inputBorderFocus: 'rgba(200, 165, 90, 0.3)',
                    inputBorderHover: 'rgba(200, 165, 90, 0.15)',
                    inputText: '#ece8e0',
                    inputLabelText: '#a8a498',
                    inputPlaceholder: '#5c5850',
                    anchorTextColor: '#c8a55a',
                    anchorTextHoverColor: '#dfc07a',
                  },
                  fonts: {
                    bodyFontFamily: '"Outfit", system-ui, sans-serif',
                    buttonFontFamily: '"Outfit", system-ui, sans-serif',
                    inputFontFamily: '"Outfit", system-ui, sans-serif',
                    labelFontFamily: '"Outfit", system-ui, sans-serif',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    buttonBorderRadius: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                },
              },
            }}
            providers={['google', 'azure']}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
            view="sign_in"
            showLinks={true}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email address',
                  password_label: 'Password',
                  button_label: 'Sign in',
                  link_text: "Don't have an account? Sign up",
                  social_provider_text: 'Sign in with {{provider}}',
                },
              },
            }}
          />
        </div>

        {/* Footer link */}
        <div className="text-center mt-6">
          <a
            href="/signup"
            className="font-body text-sm text-brass hover:text-brass-light transition-colors"
          >
            Create a new account
          </a>
        </div>

        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brass/40 to-transparent mt-8" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-warm-300 font-body text-sm">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
