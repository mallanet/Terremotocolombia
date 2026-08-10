import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import { SectionLoading } from "@/components/ui/SectionLoading";

const ChatPanel = dynamic(() => import("@/components/features/chat/ChatPanel"), {
  loading: () => (
    <SectionLoading label="Cargando chat…" rows={4} />
  ),
});

export const metadata: Metadata = pageMetadata({
  title: "Chat de voluntarios",
  description:
    "Coordina rescates, suministros y difusión con otros voluntarios en tiempo real.",
  path: "/chat",
  index: false,
});
export default function ChatPage() {
  return (
    <SubPageShell breadcrumb="Chat de voluntarios" path="/chat">
      <ChatPanel />
    </SubPageShell>
  );
}
