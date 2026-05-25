export const PWA_ICON_BACKGROUND = "#0f172a";
export const PWA_ICON_PANEL = "#111827";
export const PWA_ICON_ACCENT = "#34d399";
export const PWA_ICON_MUTED = "#94a3b8";

export function renderPwaIcon(size: number) {
  const radius = Math.round(size * 0.22);
  const inset = Math.round(size * 0.12);
  const badgeSize = Math.round(size * 0.42);
  const walletWidth = Math.round(size * 0.48);
  const walletHeight = Math.round(size * 0.28);
  const lineHeight = Math.round(size * 0.045);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${PWA_ICON_BACKGROUND} 0%, #1f2937 100%)`,
        color: "white",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          height: size,
          width: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: inset,
            left: inset,
            right: inset,
            bottom: inset,
            borderRadius: radius,
            background: `linear-gradient(180deg, ${PWA_ICON_PANEL} 0%, #0f172a 100%)`,
            border: `${Math.max(2, Math.round(size * 0.012))}px solid rgba(255,255,255,0.08)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.24),
            left: Math.round((size - walletWidth) / 2),
            width: walletWidth,
            height: walletHeight,
            borderRadius: Math.round(size * 0.08),
            background: `linear-gradient(180deg, #1e293b 0%, #0f172a 100%)`,
            border: `${Math.max(2, Math.round(size * 0.012))}px solid ${PWA_ICON_ACCENT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.4)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: Math.round(size * 0.055),
              width: Math.round(size * 0.075),
              height: Math.round(size * 0.075),
              borderRadius: 999,
              background: PWA_ICON_ACCENT,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: Math.round(size * 0.22),
            left: Math.round(size * 0.28),
            right: Math.round(size * 0.28),
            display: "flex",
            flexDirection: "column",
            gap: Math.round(size * 0.03),
          }}
        >
          <div
            style={{
              height: lineHeight,
              borderRadius: 999,
              background: PWA_ICON_ACCENT,
            }}
          />
          <div
            style={{
              height: lineHeight,
              width: "72%",
              borderRadius: 999,
              background: PWA_ICON_MUTED,
            }}
          />
          <div
            style={{
              height: lineHeight,
              width: "88%",
              borderRadius: 999,
              background: PWA_ICON_MUTED,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.15),
            left: Math.round(size * 0.15),
            width: badgeSize,
            height: badgeSize,
            borderRadius: Math.round(size * 0.12),
            background: `linear-gradient(180deg, ${PWA_ICON_ACCENT} 0%, #10b981 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#062b21",
            fontWeight: 800,
            fontSize: Math.round(size * 0.15),
            letterSpacing: -2,
            boxShadow: "0 15px 40px rgba(52, 211, 153, 0.35)",
          }}
        >
          AL
        </div>
      </div>
    </div>
  );
}
