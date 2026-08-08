import { DogfoodPanel } from "@/components/onboarding/dogfood-panel";

// Two-column wizard chrome (§7). Left: brand + dogfood panel (desktop only).
// Right: the current step. The panel lives in the layout so it stays mounted
// across step navigations - no flicker, and any loaded FIQ widget persists.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-[40%] max-w-xl bg-gradient-to-br from-emerald-600 to-teal-700 lg:block">
        <DogfoodPanel />
      </aside>
      <main className="flex flex-1 items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-100 sm:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
