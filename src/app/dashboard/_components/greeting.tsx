"use client"

import Image from "next/image"

export function Greeting({
  name,
  image,
}: {
  name: string | null
  image: string | null
}) {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const firstName = name?.split(" ")[0] ?? null

  return (
    <div className="flex items-center gap-3 mb-6">
      {image && (
        <Image
          src={image}
          alt="Profile"
          width={44}
          height={44}
          className="rounded-full ring-2 ring-white shadow-sm shrink-0"
        />
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good {timeOfDay}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-slate-500">Here&apos;s your portfolio overview</p>
      </div>
    </div>
  )
}
