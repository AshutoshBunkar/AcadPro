module.exports = {
        content: ["./index.html", "./src/**/*.{js,jsx}"],
        darkMode: "class",
        theme: {
          extend: {
            colors: {
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
