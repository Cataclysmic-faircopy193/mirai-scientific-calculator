import { MiraiCalculator } from "@/components/mirai-calculator"

export function DemoApp() {
  return (
    <main className="min-h-screen bg-muted p-0">
      <MiraiCalculator
        height={660}
        showBackdrop
        defaultTheme="light"
        title="Mirai Calculator"
      />
    </main>
  )
}
