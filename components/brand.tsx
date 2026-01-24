"use client"
import { useEffect, useState } from "react"
import { EncryptedText } from "@/components/ui/encrypted-text"

type BrandProps = {
    incomingText: string
    interval?: number // optional customization
}

export function Brand({ incomingText, interval = 3000 }: BrandProps) {
    const [cycle, setCycle] = useState(0)

    useEffect(() => {
        const id = setInterval(() => {
            setCycle(prev => prev + 1)
        }, interval)

        return () => clearInterval(id)
    }, [interval])

    return (
        <EncryptedText
            key={cycle}
            text={incomingText}
            encryptedClassName="text-muted-foreground"
            revealedClassName="dark:text-white text-black font-semibold tracking-tight"
            revealDelayMs={50}
        />
    )
}