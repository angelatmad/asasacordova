import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { destinations } from "@/lib/destinations";
import { cultureAndEventsData } from "@/lib/culture";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  destSlug?: string;
};

const suggestedQuestions = [
  "What are the best places to visit in Cordova?",
  "Where can I find seafood and restaurants?",
  "Suggest a 1-day itinerary",
  "How do I get to 10,000 Roses?",
  "What festivals are celebrated here?",
  "How do I use the interactive map?",
];

export function AscAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: "Hello, what can I help you?",
        },
      ]);
    }
  }, [isOpen]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: "u_" + messages.length,
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const { text, slug } = evaluateAscQuery(query);
      const aiMsg: Message = {
        id: "ai_" + (messages.length + 1),
        sender: "ai",
        text,
        destSlug: slug,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  }

  function evaluateAscQuery(q: string): { text: string; slug?: string } {
    const raw = q.trim();
    const lower = raw.toLowerCase();

    // 1. Greetings
    if (/^(hi|hello|hey|greetings|mabuhay|good\s*(morning|afternoon|evening))\b/i.test(lower)) {
      return {
        text: "Hello, what can I help you?",
      };
    }

    // 2. Specific Destinations
    for (const d of destinations) {
      const dName = d.name.toLowerCase();
      const dSlug = d.slug.toLowerCase();
      if (lower.includes(dSlug) || lower.includes(dName) || (dName.includes(lower) && lower.length > 3)) {
        return {
          text: `${d.name} (${d.category})\n\nOverview: ${d.overview}\n\nAddress: ${d.address}\nSchedule: ${d.openingHours} - ${d.closingHours} (${d.operatingDays})\nEntrance Fee: ${d.entranceFee}\nContact: ${d.contactNumber}`,
          slug: d.slug,
        };
      }
    }

    // 3. Culture & Events / Festivals
    for (const c of cultureAndEventsData) {
      if (lower.includes(c.title.toLowerCase()) || lower.includes(c.id) || lower.includes("festival") || lower.includes("culture") || lower.includes("event") || lower.includes("fiesta")) {
        return {
          text: `${c.title} (${c.dateOrSchedule})\n\n${c.description}`,
        };
      }
    }

    // 4. Attractions / Sightseeing / Best Places
    if (
      lower.includes("best") ||
      lower.includes("popular") ||
      lower.includes("visit") ||
      lower.includes("attraction") ||
      lower.includes("sightseeing") ||
      lower.includes("place") ||
      lower.includes("spot") ||
      lower.includes("tourist") ||
      lower.includes("beach") ||
      lower.includes("resort")
    ) {
      return {
        text: "Here are the top recommended places to visit in Cordova, Cebu:\n\n• 10,000 Roses - Famous LED rose installation by the seaside with stunning sunset and evening views.\n• Solea Mactan Resort - Premier resort featuring multiple swimming pools and ocean views.\n• Cordova Reef Village Resort - Peaceful coastal village resort setting.\n• Gilutongan Island - Renowned marine sanctuary ideal for island hopping and snorkeling.\n• Bantayan Beach - Scenic public coastal area.",
        slug: "10000-roses",
      };
    }

    // 5. Food / Restaurants / Seafood / Bakasihan
    if (
      lower.includes("food") ||
      lower.includes("restaurant") ||
      lower.includes("seafood") ||
      lower.includes("cafe") ||
      lower.includes("eat") ||
      lower.includes("bakasihan") ||
      lower.includes("park") ||
      lower.includes("dining") ||
      lower.includes("lunch") ||
      lower.includes("dinner")
    ) {
      return {
        text: "Cordova is famous for its rich culinary heritage, especially Bakasihan (spicy estuary eel soup). Top recommended dining spots include:\n\n• Lantaw Restaurant - Floating native dining with magnificent coastal views.\n• Parola Restaurant - Seaside dining serving local seafood specialties.\n• Bakasihan Stalls in Poblacion - The authentic home of Cordova's specialty eel soup.\n• Bric Food Park & Roro Port Food Park - Vibrant open-air food parks with diverse local stalls.",
        slug: "lantaw-restaurant",
      };
    }

    // 6. Itinerary / Trip Planning
    if (lower.includes("itinerary") || lower.includes("day trip") || lower.includes("one day") || lower.includes("plan") || lower.includes("schedule")) {
      return {
        text: "Here is a suggested 1-Day Cordova Itinerary:\n\n• Morning (8:00 AM): Take a boat from local ports to explore Gilutongan Island for snorkeling and marine sanctuary views.\n• Lunch (12:00 PM): Savor fresh seafood and Bakasihan at Lantaw Restaurant or Parola Restaurant.\n• Afternoon (3:00 PM): Relax or swim at Solea Mactan Resort or stroll along Bantayan Beach.\n• Evening (5:30 PM): Watch the sunset and take photos at 10,000 Roses, followed by dinner at Bric Food Park.",
        slug: "10000-roses",
      };
    }

    // 7. Travel / Navigation / Getting Around
    if (
      lower.includes("how") ||
      lower.includes("get") ||
      lower.includes("route") ||
      lower.includes("motorcycle") ||
      lower.includes("boat") ||
      lower.includes("map") ||
      lower.includes("directions") ||
      lower.includes("travel") ||
      lower.includes("transport")
    ) {
      return {
        text: "Getting around Cordova:\n\n• Interactive Map: Use the Asa sa Cordova Interactive Map on our Destinations page to calculate accurate navigation routes using Car, Motorcycle, or Walking.\n• Island Travel: Gilutongan Island requires a registered boat transfer from local Cordova ports.\n• Expressway: The Cebu-Cordova Link Expressway (CCLEX) provides the major link between Cebu City and Cordova.",
        slug: "10000-roses",
      };
    }

    // 8. Website Features (Favorites, Visited, Reviews)
    if (lower.includes("favorite") || lower.includes("visited") || lower.includes("review") || lower.includes("account") || lower.includes("save") || lower.includes("profile")) {
      return {
        text: "Asa sa Cordova Website Features:\n\n• Favorites: Save your favorite destinations for quick trip planning.\n• Visited Records: Track your travels and mark places as visited.\n• Traveler Reviews: Read and submit ratings and reviews (1-5 stars) with replies on any destination page.",
      };
    }

    // 9. General fallback with intelligent context for any question
    return {
      text: `As your ASC Tourism Assistant, I am here to help you with anything related to Cordova, Cebu! You can ask me about tourist attractions, resorts, restaurants (like Bakasihan and Lantaw), local festivals (Sidlakan Festival), travel directions, or website features. \n\nWhat would you like to know about "${raw}"?`,
    };
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C96B6B] text-white shadow-2xl transition hover:bg-[#292929] hover:scale-105"
          aria-label="Open ASC AI Assistant"
        >
          <span className="text-2xl">🤖</span>
        </button>
      ) : (
        <div className="flex h-[520px] w-[90vw] max-w-[400px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#292929] px-5 py-4 text-white rounded-t-3xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C96B6B] text-base">
                🤖
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold">ASC Tourism Assistant</h3>
                <p className="text-[10px] text-[#E8A0A0]">Cordova Destination Expert</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white"
              aria-label="Close AI assistant"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-[#FFFAF8] text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-5 whitespace-pre-line ${
                    m.sender === "user"
                      ? "bg-[#C96B6B] text-white rounded-br-xs"
                      : "bg-white border border-[#F1E5DF] text-[#292929] rounded-bl-xs shadow-xs"
                  }`}
                >
                  {m.text}
                  {m.destSlug && (
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <Link
                        to={`/destinations/${m.destSlug}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FCEBEC] px-3 py-1.5 text-[11px] font-semibold text-[#C96B6B] hover:bg-[#C96B6B] hover:text-white transition"
                      >
                        View Destination Page →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-[#F1E5DF] px-4 py-2.5 text-[#716767]">
                  AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Chips */}
          <div className="border-t border-[#F1E5DF] bg-white px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#716767]">
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="rounded-lg bg-[#FFFAF8] px-2.5 py-1 text-[11px] font-medium text-[#C96B6B] hover:bg-[#FCEBEC] transition text-left border border-[#F1E5DF]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="border-t border-[#F1E5DF] bg-white p-3 rounded-b-3xl flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about Cordova places, food, itineraries..."
              className="flex-1 rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-3.5 py-2.5 text-xs text-[#292929] outline-none focus:border-[#C96B6B]"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              className="rounded-xl bg-[#C96B6B] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#292929]"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
