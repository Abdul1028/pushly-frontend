import * as React from "react"

import { cn } from "@/lib/utils"

// macOS window title bar shared by every product demo on the landing page
function WindowBar({
  title,
  icon,
  className,
  children,
}: {
  title?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("window-bar relative", className)}>
      <div className="flex gap-2" aria-hidden>
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      {title && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-medium text-ink-2 truncate max-w-[60%]">
          {icon}
          {title}
        </div>
      )}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}

export { WindowBar }
