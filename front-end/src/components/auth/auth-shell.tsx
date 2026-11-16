
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FCEBEC] via-[#FFFAF8] to-[#E8A0A0]/20 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <main className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-2xl border border-[#F1E5DF] sm:p-10">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-[#FCEBEC] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#C96B6B] mb-3">
              {eyebrow}
            </span>

            <h1 className="font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2.5 text-sm leading-6 text-[#716767]">
              {description}
            </p>
          </div>

          {children}

          <div className="mt-8 border-t border-[#F1E5DF] pt-6 text-center">
            <p className="text-xs text-[#716767]">
              Municipality of Cordova, Cebu 6017 • Official Tourism Portal
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthShell;
