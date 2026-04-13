import { useMemo, useState } from "react";
import { Bot, Database, Loader2, Send, Trash2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { chatApi } from "@/lib/api";
import PageFrame from "@/pages/app/PageFrame";

const INITIAL_ASSISTANT_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I can answer questions about movies, screenings, halls, and reservations using your PostgreSQL data.",
  model: null,
};

function formatMessageTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    { ...INITIAL_ASSISTANT_MESSAGE, time: formatMessageTime() },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [useDatabase, setUseDatabase] = useState(true);
  const [error, setError] = useState("");

  const historyPayload = useMemo(
    () =>
      messages
        .filter((entry) => entry.role === "assistant" || entry.role === "user")
        .map(({ role, content }) => ({ role, content }))
        .slice(-20),
    [messages]
  );

  async function sendMessage() {
    const message = draft.trim();
    if (!message || sending) {
      return;
    }

    const userMessage = {
      role: "user",
      content: message,
      time: formatMessageTime(),
      model: null,
    };

    setError("");
    setDraft("");
    setMessages((previous) => [...previous, userMessage]);
    setSending(true);

    try {
      const response = await chatApi.ask({
        message,
        history: historyPayload,
        use_database: useDatabase,
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.answer,
          time: formatMessageTime(),
          model: response.model,
        },
      ]);
    } catch (requestError) {
      const detail = requestError.message || "Failed to contact chatbot.";
      setError(detail);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "I could not answer right now. Please try again.",
          time: formatMessageTime(),
          model: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function clearConversation() {
    setMessages([{ ...INITIAL_ASSISTANT_MESSAGE, time: formatMessageTime() }]);
    setError("");
  }

  return (
    <PageFrame
      title="Cinema Chatbot"
      description="Ask questions in natural language. Responses come from Ollama (gemma3:4b)."
      actions={
        <Button variant="outline" onClick={clearConversation}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      }
    >
      <Card className="border-border/70 bg-card/92 shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Assistant</CardTitle>
            <Badge variant="secondary" className="rounded-full">
              gemma3:4b
            </Badge>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={useDatabase}
              onChange={(event) => setUseDatabase(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Database className="h-4 w-4" />
            Use PostgreSQL context
          </label>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="max-h-[52vh] space-y-3 overflow-y-auto rounded-xl border border-border/70 bg-background/70 p-3">
            {messages.map((entry, index) => {
              const isUser = entry.role === "user";
              return (
                <div
                  key={`${entry.role}-${index}`}
                  className={[
                    "flex w-full",
                    isUser ? "justify-end" : "justify-start",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "max-w-[90%] rounded-2xl border px-3 py-2 text-sm shadow-sm md:max-w-[78%]",
                      isUser
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : "border-border/70 bg-card",
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
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
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Textarea
              placeholder="Ask about movies, screenings, reservations, occupancy, or schedules..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              disabled={sending}
              className="min-h-24"
            />
            <div className="flex justify-end">
              <Button onClick={sendMessage} disabled={sending || !draft.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
