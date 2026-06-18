import { useMemo, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, Trash2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { chatApi } from "@/lib/api";

const INITIAL_ASSISTANT_MESSAGE = {
  role: "assistant",
  content:
    "Salut! Întreabă-mă despre filme, proiecții, săli și rezervări. Îți răspund folosind datele din aplicația ta.",
};

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatBubbleWidget() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([{ ...INITIAL_ASSISTANT_MESSAGE, time: nowTime() }]);

  const history = useMemo(
    () =>
      messages
        .filter((entry) => entry.role === "user" || entry.role === "assistant")
        .map(({ role, content }) => ({ role, content }))
        .slice(-20),
    [messages]
  );

  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }

    const userMessage = {
      role: "user",
      content: text,
      time: nowTime(),
      model: null,
    };

    setDraft("");
    setError("");
    setMessages((previous) => [...previous, userMessage]);
    setSending(true);

    try {
      const response = await chatApi.ask({
        message: text,
        history,
        use_database: true,
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.answer,
          model: response.model,
          time: nowTime(),
        },
      ]);
    } catch (requestError) {
      setError(requestError.message || "Chat request failed.");
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "I could not answer right now. Please try again.",
          model: null,
          time: nowTime(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([{ ...INITIAL_ASSISTANT_MESSAGE, time: nowTime() }]);
    setError("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <Card className="w-[min(92vw,24rem)] border-border/80 bg-card shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" />
                Cinema Assistant
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={clearChat} title="Șterge chat">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} title="Închide chat">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-background/70 p-3">
              {messages.map((entry, index) => {
                const isUser = entry.role === "user";
                return (
                  <div key={`${entry.role}-${index}`} className={isUser ? "text-right" : "text-left"}>
                    <div
                      className={[
                        "inline-block max-w-[90%] rounded-xl border px-3 py-2 text-sm",
                        isUser
                          ? "border-primary/35 bg-primary text-primary-foreground"
                          : "border-border/70 bg-card",
                      ].join(" ")}
                    >
                      <div className="mb-1 flex items-center gap-1 text-[11px] opacity-80">
                        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        <span>{isUser ? "You" : "Assistant"}</span>
                        {entry.model ? <span>{entry.model}</span> : null}
                        <span>{entry.time}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <Textarea
              value={draft}
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              className="min-h-16"
              placeholder="Pune o întrebare..."
            />

            <div className="flex justify-end">
              <Button onClick={sendMessage} disabled={sending || !draft.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gândesc...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Trimite
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          size="icon-lg"
          className="h-14 w-14 rounded-full shadow-xl"
          title="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
