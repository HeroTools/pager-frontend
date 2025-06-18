import { useParams } from "next/navigation";

export const useParamIds = (): {
  id: string;
  type: "channel" | "conversation";
  workspaceId: string;
} => {
  const params = useParams();
  const entityId = params["entity-id"] as string;
  const workspaceId = params["workspace-id"] as string;

  if (!entityId) {
    return { id: "", type: "channel", workspaceId };
  }

  const prefix = entityId.charAt(0);
  const cleanId = entityId.slice(2); // Remove prefix and dash

  if (prefix === "c") {
    return { id: cleanId, type: "channel", workspaceId };
  }

  if (prefix === "d") {
    return { id: cleanId, type: "conversation", workspaceId };
  }

  throw new Error(`Invalid entity ID format: ${entityId}`);
};
