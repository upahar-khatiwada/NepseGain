"use client";

import { toast } from "sonner";
import { signIn } from "@/src/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function SignInPage() {
  async function handleGoogleSignIn() {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      toast.error("Sign-in failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">NEPSE Tracker</CardTitle>
          <CardDescription>
            Sign in to manage your NEPSE portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full cursor-pointer"
            onClick={handleGoogleSignIn}
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
