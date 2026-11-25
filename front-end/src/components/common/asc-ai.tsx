import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Bot, X } from "lucide-react";
// These helpers build local answers and links when the chat API is unavailable.
import {
  destinationLinksForReply,
  resolveAssistantAnswer,
  type AssistantChatMessage,
  type AssistantDestinationLink,
} from "@/lib/assistant-fallback";
import type { CultureItem } from "@/lib/culture";
import { eventToCultureItem, fetchEvents } from "@/lib/event-api";
import { useDestinations } from "@/lib/use-destinations";

import { API_BASE_URL } from "@/lib/api-config";

// One chat bubble; destinations are optional links under AI replies.
type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  destinations?: AssistantDestinationLink[];
};

// Quick prompts help a first-time user start the conversation.
const suggestedQuestions = [
  "What are the best places to visit in Cordova?",
  "Where can I find seafood and restaurants?",
  "Suggest a 1-day itinerary",
  "How do I get to 10,000 Roses?",
  "What festivals are celebrated here?",
  "How do I use the interactive map?",
];

// Floating tourism assistant that answers with API help or local fallback data.
export function AscAiAssistant() {
  // Shared destination data is also used by the local answer helper.
  const { destinations } = useDestinations();
  // isOpen switches between the small button and the full chat panel.
  const [isOpen, setIsOpen] = useState(false);
  // input holds the text the user is typing right now.
  const [input, setInput] = useState("");
  // The welcome message means the chat never starts empty.
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello, what can I help you?",
    },
  ]);
  // Events are kept here so fallback answers can mention festivals.
  const [cultureItems, setCultureItems] = useState<CultureItem[]>([]);
  // isTyping prevents duplicate sends and shows a waiting message.
  const [isTyping, setIsTyping] = useState(false);
  // Points at the bottom of the chat so new messages can be scrolled into view.
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load events once; eventToCultureItem shapes API events for the fallback helper.
  useEffect(() => {
    fetchEvents()
      .then((events) => setCultureItems(events.map(eventToCultureItem)))
      .catch((err) => console.error("Failed to load AI culture context", err));
  }, []);

  // Keep the newest reply visible whenever the chat or open state changes.
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Suggested chips pass their question here; the input box calls with no argument.
  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    // Ignore empty messages and extra clicks while the AI is replying.
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: "u_" + messages.length,
      sender: "user",
      text: query,
    };

    // Send only recent chat, without the welcome text, and cap message length.
    const history: AssistantChatMessage[] = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .slice(-10)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text.slice(0, 1900),
      }));

    // Show the user's bubble immediately so the app feels responsive.
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    let text = "";
    let links: AssistantDestinationLink[] = [];

    try {
      // POST the chat to Laravel; the login token is included when available.
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("asc_token") ?? ""}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ messages: history }),
      });

      // A bad HTTP status is handled by the local fallback below.
      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const data = await response.json();
      // An empty reply also triggers the fallback.
      if (!data.reply) throw new Error("Empty AI reply");

      text = data.reply;
      const records = Array.isArray(data.destinations) ? data.destinations : [];
      // Turn backend destination records into safe links for the reply.
      links = destinationLinksForReply(records, text);
    } catch (err) {
      // If the API fails, local answers use destination and event data above.
      console.error("AI chat failed, using local answers instead:", err);
      const answer = resolveAssistantAnswer(query, history, destinations, cultureItems);
      text = answer.text;
      links = answer.destinations;
    }

    // Add the final answer with any destination links to the chat.
    setMessages((prev) => [
      ...prev,
      { id: "ai_" + prev.length, sender: "ai", text, destinations: links },
    ]);
    setIsTyping(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Closed shows a small button; open shows the full chat panel. */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#800020] text-white shadow-2xl transition hover:bg-[#58111A] hover:scale-105"
          aria-label="Open ASC AI Assistant"
        >
          <Bot size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : (
        <div className="flex h-[520px] w-[90vw] max-w-[400px] flex-col rounded-3xl border border-[#EBD5D3] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#58111A] px-5 py-4 text-white rounded-t-3xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#800020]">
                <Bot size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-white">ASC Tourism Assistant</h3>
                <p className="text-[10px] text-[#F2DCDA]">Cordova Destination Expert</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white"
              aria-label="Close AI assistant"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-[#FAF6F5] text-xs">
            {/* User bubbles align right; AI bubbles align left. */}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-5 whitespace-pre-line ${
                    m.sender === "user"
                      ? "bg-[#800020] text-white rounded-br-xs"
                      : "bg-white border border-[#EBD5D3] text-[#292929] rounded-bl-xs shadow-xs"
                  }`}
                >
                  {m.text}
                  {/* Show link chips only when the reply has destinations. */}
                  {m.destinations && m.destinations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#EBD5D3] pt-2">
                      {m.destinations.map((destination) => (
                        <Link
                          key={destination.slug}
                          to={`/destinations/${destination.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF0F2] px-3 py-1.5 text-[11px] font-semibold text-[#800020] hover:bg-[#800020] hover:text-white transition"
                        >
                          {destination.name} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Waiting indicator while the backend or fallback is working. */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-[#EBD5D3] px-4 py-2.5 text-[#7A585B]">
                  AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Chips */}
          <div className="border-t border-[#EBD5D3] bg-white px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7A585B]">
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="rounded-lg bg-[#FAF6F5] px-2.5 py-1 text-[11px] font-medium text-[#800020] hover:bg-[#FFF0F2] transition text-left border border-[#EBD5D3]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="border-t border-[#EBD5D3] bg-white p-3 rounded-b-3xl flex items-center gap-2">
            {/* Enter key sends the same request as clicking Send. */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about Cordova places, food, itineraries..."
              className="flex-1 rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-3.5 py-2.5 text-xs text-[#292929] outline-none focus:border-[#800020]"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              className="rounded-xl bg-[#800020] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#58111A]"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
