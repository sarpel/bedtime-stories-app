import { useState, useEffect } from "react"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  // Next.js yerine native React dark mode detection
  const [theme, setTheme] = useState("system")
  
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
        }
      }
      {...props} />
  );
}

export { Toaster }
