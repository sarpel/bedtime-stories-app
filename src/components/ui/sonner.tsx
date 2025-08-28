import React, { useState, useEffect } from "react"
import { Toaster as Sonner } from "sonner";

interface ToasterProps {
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
  expand?: boolean
  richColors?: boolean
  closeButton?: boolean
  offset?: string | number
  dir?: "rtl" | "ltr"
  visibleToasts?: number
  toastOptions?: {
    duration?: number
    className?: string
    descriptionClassName?: string
  }
}

const Toaster = ({
  ...props
}: ToasterProps) => {
  // Next.js yerine native React dark mode detection
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  useEffect(() => {
    // System theme detection
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = () => {
      setTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    updateTheme()
    mediaQuery.addEventListener('change', updateTheme)

    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        } as React.CSSProperties
      }
      {...props} />
  );
}

export { Toaster }
