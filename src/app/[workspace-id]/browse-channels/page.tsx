"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Lock, Loader } from "lucide-react";
import { useState } from "react";
import {
  useGetAllAvailableChannels,
  useCreateChannelModal,
} from "@/features/channels";
import { useParamIds } from "@/hooks/use-param-ids";

export default function BrowseChannels() {
  const [search, setSearch] = useState<string>("");
  const { workspaceId } = useParamIds();
  const openCreateModal = useCreateChannelModal((state) => state.setOpen);

  // Fetch channels (public + ones the user has joined)
  const { data: channels = [], isLoading } =
    useGetAllAvailableChannels(workspaceId);

  // Filter by name (case-insensitive)
  const displayedChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All channels</h1>
        <Button onClick={() => openCreateModal(true)}>Create Channel</Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder="Search for channels"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="bg-muted rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader className="mx-auto animate-spin" />
          </div>
        ) : displayedChannels.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No channels found.
          </div>
        ) : (
          <ul>
            {displayedChannels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 hover:bg-accent transition"
              >
                <span>
                  {channel.channel_type === "public" ? (
                    <Hash className="size-5 text-muted-foreground" />
                  ) : (
                    <Lock className="size-5 text-muted-foreground" />
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      #{channel.name}
                    </span>
                    {channel.joined && (
                      <span className="text-xs text-green-600 font-semibold ml-2">
                        Joined
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {channel.member_count} member
                    {channel.member_count !== 1 ? "s" : ""}
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
