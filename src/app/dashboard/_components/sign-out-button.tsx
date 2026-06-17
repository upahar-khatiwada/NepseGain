"use client"

import { LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "@/src/lib/auth-client"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white text-sm cursor-pointer transition-colors"
    >
      <LogOutIcon className="size-4 shrink-0" />
      Sign out
    </button>
  )
}
