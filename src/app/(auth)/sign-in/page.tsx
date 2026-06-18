"use client"

import { useEffect, useState } from "react"
import { BarChart2Icon, ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"
import { signIn } from "@/src/lib/auth-client"

// Google rejects OAuth from embedded WebViews (Messenger, Instagram, Line, etc.)
// with a 403 disallowed_useragent — no header/config fix exists, so detect and redirect instead.
function detectInAppBrowser() {
  const ua = navigator.userAgent
  const isInApp = /FBAN|FBAV|FB_IAB|Instagram|Line\//i.test(ua) || /; ?wv\)/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  return { isInApp, isAndroid }
}

export default function SignInPage() {
  const [inApp, setInApp] = useState({ isInApp: false, isAndroid: false })

  useEffect(() => {
    setInApp(detectInAppBrowser())
  }, [])

  async function handleGoogleSignIn() {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      })
    } catch {
      toast.error("Sign-in failed. Please try again.")
    }
  }

  function handleOpenInBrowser() {
    const url = window.location.href
    if (inApp.isAndroid) {
      // Most in-app WebViews honor intent:// links and hand off to the system browser.
      const stripped = url.replace(/^https?:\/\//, "")
      window.location.href = `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
      toast.success("Link copied — paste it into Safari to sign in.")
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left dark panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ backgroundColor: "#0f172a" }}
      >
        <div className="flex items-center gap-3">
          <BarChart2Icon className="size-6 shrink-0" style={{ color: "#0d9488" }} />
          <span className="text-xl font-bold text-white">NepseGain</span>
        </div>

        <div>
          <p className="text-5xl font-bold text-white leading-tight mb-5">
            🇳🇵 Track your<br />NEPSE investments<br />with clarity.
          </p>
          <p className="text-slate-400 text-lg leading-relaxed">
            Capital gain tax calculator and portfolio tracker built for the Nepal Stock Exchange.
          </p>
        </div>

        <p className="text-slate-600 text-sm">Nepal Stock Exchange · NepseGain</p>
      </div>

      {/* Right sign-in panel */}
      <div
        className="flex flex-1 items-center justify-center px-4"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo (shown when left panel is hidden) */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <BarChart2Icon className="size-5 shrink-0" style={{ color: "#0d9488" }} />
            <span className="font-bold text-slate-900 text-lg">NepseGain</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
            <div className="text-center mb-7">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h1>
              <p className="text-slate-500 text-sm">
                Sign in to manage your NEPSE portfolio
              </p>
            </div>

            {inApp.isInApp ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Open in your browser to sign in</p>
                <p className="mb-3">
                  Google blocks sign-in inside in-app browsers like Messenger or Instagram.{" "}
                  {inApp.isAndroid
                    ? "Tap below to continue in Chrome."
                    : "Tap the ⋯ menu above and choose \"Open in Safari\", or copy the link below."}
                </p>
                <button
                  onClick={handleOpenInBrowser}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <ExternalLinkIcon className="size-4" />
                  {inApp.isAndroid ? "Open in Chrome" : "Copy Link"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {/* Google official logo */}
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            )}

            <p className="text-center text-xs text-slate-400 mt-6">
              Your data is private and only visible to you.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
