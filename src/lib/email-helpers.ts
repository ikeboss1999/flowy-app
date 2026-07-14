/**
 * Email template and mailto helpers for FlowY
 */

interface PlaceholderData {
    documentNumber: string;
    customerName: string;
    contactPerson?: string;
}

/**
 * Replaces placeholders like {documentNumber} and {customerName} in the template.
 */
export function replacePlaceholders(template: string, data: PlaceholderData): string {
    if (!template) return "";
    
    let result = template;
    
    // Replace {documentNumber}
    result = result.replace(/{documentNumber}/g, data.documentNumber);
    
    // Replace {customerName}
    result = result.replace(/{customerName}/g, data.customerName);
    
    // Replace {contactPerson} (falls vorhanden, sonst customerName)
    const contact = data.contactPerson || data.customerName;
    result = result.replace(/{contactPerson}/g, contact);
    
    return result;
}

/**
 * Generates and triggers a mailto link to open the native mail program.
 */
export function triggerMailto(recipientEmail: string | undefined, subject: string, body: string): void {
    const to = recipientEmail ? encodeURIComponent(recipientEmail) : "";
    const subjectEscaped = encodeURIComponent(subject);
    const bodyEscaped = encodeURIComponent(body);
    
    const mailtoUrl = `mailto:${to}?subject=${subjectEscaped}&body=${bodyEscaped}`;
    
    // Open in a new tab or window location to launch native email client
    window.location.href = mailtoUrl;
}
