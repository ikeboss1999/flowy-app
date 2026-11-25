import { supabaseAdmin } from "@/lib/supabase-admin";
import { pollIncomingMailbox } from "@/lib/incoming-mailbox-import";

export async function runIncomingMailbox(userId: string, allowDisabled = false) {
    if (!supabaseAdmin) throw new Error("Datenbank nicht verfügbar.");
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + 5 * 60_000).toISOString();
    let query = supabaseAdmin.from("incoming_invoice_mailboxes").update({ lockedUntil: leaseUntil }).eq("userId", userId).or(`lockedUntil.is.null,lockedUntil.lt.${now.toISOString()}`);
    if (!allowDisabled) query = query.eq("enabled", true);
    const { data: mailbox, error } = await query.select("*").maybeSingle();
    if (error) throw error;
    if (!mailbox) throw new Error("Der Abruf läuft bereits oder das Postfach ist nicht aktiviert.");
    try {
        return await pollIncomingMailbox(mailbox);
    } catch (reason) {
        await supabaseAdmin.from("incoming_invoice_mailboxes").update({ lastCheckedAt: new Date().toISOString(), lastError: reason instanceof Error ? reason.message.slice(0, 300) : "Postfachabruf fehlgeschlagen." }).eq("userId", userId);
        throw reason;
    } finally {
        await supabaseAdmin.from("incoming_invoice_mailboxes").update({ lockedUntil: null }).eq("userId", userId).eq("lockedUntil", leaseUntil);
    }
}
