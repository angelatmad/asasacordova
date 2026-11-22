
import type { ReactNode } from "react";

// Props let every auth page reuse this card with its own heading and form.
type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

// Shared layout for login, signup, and password recovery screens.
function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0F2] via-[#FAF6F5] to-[#F2DCDA]/20 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <main className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-2xl border border-[#EBD5D3] sm:p-10">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#800020] mb-3">
              {eyebrow}
            </span>

            <h1 className="font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2.5 text-sm leading-6 text-[#7A585B]">
              {description}
            </p>
          </div>

          {/* The page's form is placed here. */}
          {children}

          {/* This footer is the same on all auth screens. */}
          <div className="mt-8 border-t border-[#EBD5D3] pt-6 text-center">
            <p className="text-xs text-[#7A585B]">
              Municipality of Cordova, Cebu 6017 • Official Tourism Portal
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthShell;
