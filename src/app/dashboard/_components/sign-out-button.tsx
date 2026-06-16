"use client"

import { LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "@/src/lib/auth-client"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 cursor-pointer"
      onClick={handleSignOut}
    >
      <LogOutIcon className="size-4" />
      Sign out
    </Button>
  )
}
