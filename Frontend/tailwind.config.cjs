module.exports = {
        content: ["./index.html", "./src/**/*.{js,jsx}"],
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              "nav-canvas": "rgb(var(--nav-canvas, 8 9 13) / <alpha-value>)",
              "nav-surface": "rgb(var(--nav-surface, 17 20 27) / <alpha-value>)",
              "nav-subtle": "rgb(var(--nav-subtle, 25 30 40) / <alpha-value>)",
              "nav-footer": "rgb(var(--nav-footer, 14 17 23) / <alpha-value>)",
              "nav-row": "rgb(var(--nav-row, 20 24 32) / <alpha-value>)",
              "nav-line": "rgb(var(--nav-line, 41 47 59) / <alpha-value>)",
              "nav-accent-hover": "rgb(var(--nav-accent-hover) / <alpha-value>)",
              "nav-warning": "rgb(var(--nav-warning) / <alpha-value>)",
              "nav-accent": "rgb(var(--nav-accent, 117 215 255) / <alpha-value>)",
              "nav-highlight": "rgb(var(--nav-highlight, 255 61 154) / <alpha-value>)",
              "nav-muted": "rgb(var(--nav-muted, 164 173 186) / <alpha-value>)",
              "nav-ink": "rgb(var(--nav-ink, 245 243 239) / <alpha-value>)",
              "nav-danger": "rgb(var(--nav-danger, 244 63 94) / <alpha-value>)",
              "nav-success": "rgb(var(--nav-success, 16 185 129) / <alpha-value>)",
              "nav-success-ink": "rgb(var(--nav-success-ink, 110 231 183) / <alpha-value>)",
              "nav-danger-ink": "rgb(var(--nav-danger-ink, 253 164 175) / <alpha-value>)",

              jet: "#08090D",
              charcoal: "#11141B",
              graphite: "#191E28",
              pearl: "#F5F3EF",
              "muted-silver": "#A4ADBA",
              siren: "#75D7FF",
              "deep-siren": "#258BC4",
              "neon-pink": "#FF3D9A",
              "border-graphite": "#292F3B",
              // Semantic colors
              success: "#10B981",
              warning: "#F59E0B",
              danger: "#F43F5E",
              // Legacy alias mappings for backward compatibility
              surface: "#11141B",
              background: "#08090D",
              primary: "#75D7FF",
              secondary: "#FF3D9A",
              "on-surface": "#F5F3EF",
              "on-surface-variant": "#A4ADBA",
            },
            fontFamily: {
              sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
              display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
              mono: ["JetBrains Mono", "monospace"],
            },
            boxShadow: {
              glow: "0 0 20px -5px rgba(117, 215, 255, 0.15)",
              "glow-pink": "0 0 20px -5px rgba(255, 61, 154, 0.2)",
              glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            },
            borderRadius: {
              xl: "12px",
              "2xl": "16px",
              "3xl": "24px",
            }
          }
        }
      }
