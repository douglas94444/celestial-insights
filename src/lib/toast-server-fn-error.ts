import { toast } from "sonner";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";

/** Toast com mensagem normalizada de falhas de server functions (TanStack Start). */
export async function toastServerFnError(err: unknown): Promise<void> {
  toast.error(await getServerFnErrorMessage(err));
}
