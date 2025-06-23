import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { MemberWithUser } from "@/features/members/types";

interface MemberSearchSelectProps {
  selectedMembers: MemberWithUser[];
  onMemberSelect: (member: MemberWithUser) => void;
  onMemberRemove: (memberId: string) => void;
  availableMembers: MemberWithUser[];
  placeholder?: string;
  excludedMemberIds?: Set<string>; // Members to show as disabled with label
}

const MemberSearchSelect: React.FC<MemberSearchSelectProps> = ({
  selectedMembers,
  onMemberSelect,
  onMemberRemove,
  availableMembers,
  placeholder = "Search for people...",
  excludedMemberIds = new Set(),
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithUser[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = availableMembers.filter(
        (member) =>
          (member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.user.email
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
      setFilteredMembers(filtered);
      setIsOpen(true);
    } else {
      setFilteredMembers([]);
      setIsOpen(false);
    }
  }, [searchQuery, availableMembers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMemberSelect = (member: MemberWithUser) => {
    // Don't allow selection of excluded members or already selected members
    if (excludedMemberIds.has(member.id) || selectedMembers.find((selected) => selected.id === member.id)) {
      return;
    }
    
    onMemberSelect(member);
    setSearchQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-text-success";
      case "away":
        return "bg-text-warning";
      case "offline":
        return "bg-muted-foreground";
      default:
        return "bg-muted-foreground";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-md bg-background min-h-[40px] w-full ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {selectedMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-1.5 px-2 py-1 bg-accent text-primary-foreground rounded text-sm"
          >
            <span className="text-lg">
              {member.user?.image ? (
                <img
                  src={member.user.image}
                  alt={member.user.name || "User"}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted-foreground flex items-center justify-center text-xs font-medium text-message-hover">
                  {member.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </span>
            <span>{member.user.name}</span>
            <button
              onClick={() => onMemberRemove(member.id)}
              className="ml-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <div className="flex-1 min-w-[200px]">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              selectedMembers.length === 0 ? placeholder : "Add more people..."
            }
            className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
            onFocus={() => {
              if (searchQuery.trim() && filteredMembers.length > 0) {
                setIsOpen(true);
              }
            }}
          />
        </div>
      </div>

      {isOpen && filteredMembers.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border-subtle rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredMembers.map((member) => {
            const isExcluded = excludedMemberIds.has(member.id);
            const isSelected = !!selectedMembers.find((selected) => selected.id === member.id);
            const isDisabled = isExcluded || isSelected;
            
            return (
              <button
                key={member.id}
                onClick={() => handleMemberSelect(member)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer ${
                  isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:bg-accent'
                }`}
              >
                <div className="relative">
                  <span className="text-lg">
                    {member.user?.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name || "User"}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                        {member.user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-popover-foreground">
                    {member.user?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isExcluded ? "Already in this channel" : member.user?.email}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberSearchSelect;
