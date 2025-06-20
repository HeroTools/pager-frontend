import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Lock } from "lucide-react";
import { useState } from "react";

// Placeholder data for channels
const channels = [
  {
    id: "1",
    name: "add-bex-to-channel",
    type: "public",
    members: 1,
    joined: false,
    description: "",
  },
  {
    id: "2",
    name: "anthropic-status",
    type: "public",
    members: 1,
    joined: false,
    description: "",
  },
  {
    id: "3",
    name: "asdad",
    type: "private",
    members: 1,
    joined: true,
    description: "",
  },
  {
    id: "4",
    name: "b2b-profiles",
    type: "public",
    members: 11,
    joined: true,
    description: "This channel is for everything #b2b-profiles. Hold meetings, share docs, and make decisions together with your team.",
  },
];

export default function BrowseChannels() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  // TODO: Add filter state

  // Filtered channels (simple search)
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All channels</h1>
        <Button onClick={() => router.push("/create-channel")}>Create Channel</Button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder="Search for channels"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        {/* TODO: Add filter dropdowns/buttons here */}
      </div>
      <div className="bg-muted rounded-lg overflow-hidden">
        {filteredChannels.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No channels found.</div>
        ) : (
          <ul>
            {filteredChannels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 hover:bg-accent transition"
              >
                <span>
                  {channel.type === "public" ? (
                    <Hash className="size-5 text-muted-foreground" />
                  ) : (
                    <Lock className="size-5 text-muted-foreground" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">#{channel.name}</span>
                    {channel.joined && (
                      <span className="text-xs text-green-600 font-semibold ml-2">Joined</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {channel.members} member{channel.members !== 1 ? "s" : ""}
                    {channel.description && (
                      <>
                        <span className="mx-2">·</span>
                        {channel.description}
                      </>
                    )}
                  </div>
                </div>
                {/* TODO: Add join/leave button if needed */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 