import { Link } from "react-router";
import Navbar from "@/components/common/navbar";

function ProfilePage() {
  const username = localStorage.getItem("asc_user_name") || "Cordova Explorer";
  const userEmail = localStorage.getItem("asc_user_email") || "explorer@asasa-cordova.ph";
  const joinedDate = "November 2026";
  const role = "Registered Tourist / Explorer";

  return (
    <main className="min-h-screen bg-[#FFFAF8] pb-24">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 pt-36 sm:px-10">
        {/* Profile Header Card */}
        <div className="rounded-3xl border border-[#F1E5DF] bg-white p-8 shadow-xl sm:p-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8A0A0] text-3xl font-bold text-[#292929] shadow-inner">
              {username.charAt(0)}
            </div>

            <div className="text-center sm:text-left flex-1">
              <span className="rounded-full bg-[#FCEBEC] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#C96B6B]">
                {role}
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold text-[#292929]">
                {username}
              </h1>
              <p className="mt-1 text-sm text-[#716767]">{userEmail}</p>
              <p className="mt-2 text-xs text-[#716767]">
                Member since {joinedDate} • Municipality of Cordova, Cebu
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-[#F1E5DF] pt-8">
            <Link
              to="/favorites"
              className="flex items-center justify-between rounded-2xl border border-[#F1E5DF] bg-[#FFFAF8] p-5 transition hover:border-[#E8A0A0] hover:bg-[#FFF5F5]"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FCEBEC] text-xl text-[#C96B6B]">
                  ❤️
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#292929]">My Favorites</h2>
                  <p className="text-xs text-[#716767]">View your saved destinations</p>
                </div>
              </div>
              <span className="text-[#C96B6B] font-bold">→</span>
            </Link>

            <Link
              to="/visited"
              className="flex items-center justify-between rounded-2xl border border-[#F1E5DF] bg-[#FFFAF8] p-5 transition hover:border-[#E8A0A0] hover:bg-[#FFF5F5]"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FCEBEC] text-xl text-[#C96B6B]">
                  ✓
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#292929]">Visited Spots</h2>
                  <p className="text-xs text-[#716767]">View destinations you explored</p>
                </div>
              </div>
              <span className="text-[#C96B6B] font-bold">→</span>
            </Link>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("asc_token");
                localStorage.removeItem("asc_user_email");
                localStorage.removeItem("asc_user_name");
                window.location.href = "/login";
              }}
              className="rounded-full bg-[#C96B6B] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#292929]"
            >
              Log Out of Account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProfilePage;