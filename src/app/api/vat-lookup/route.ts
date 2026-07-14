import { NextResponse } from "next/server";
import { getUserSession, hasPermission } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

function cleanVatId(value: string) {
    return value.replace(/[\s.\-_/]/g, "").toUpperCase();
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function readXmlTag(xml: string, tag: string) {
    const match = xml.match(new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"));
    if (!match) return "";
    return match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .trim();
}

function parseAddress(address: string) {
    const parts = address
        .split(/\n+/)
        .map((part) => part.trim())
        .filter(Boolean);
    const street = parts[0] || "";
    const cityLine = parts[parts.length - 1] || "";
    const cityMatch = cityLine.match(/^(?:[A-Z]{2}[-\s])?(\d{4,10})\s+(.+)$/i);

    return {
        street,
        zip: cityMatch?.[1] || "",
        city: cityMatch?.[2] || cityLine,
        raw: address,
    };
}

export async function POST(request: Request) {
    const session = await getUserSession();

    if (!session?.companyOwnerId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "customers_read")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { vatId } = await request.json();
        const cleanedVatId = cleanVatId(String(vatId || ""));
        const countryCode = cleanedVatId.slice(0, 2);
        const vatNumber = cleanedVatId.slice(2);

        if (!/^[A-Z]{2}$/.test(countryCode) || vatNumber.length < 2) {
            return NextResponse.json({ error: "Bitte geben Sie eine gültige UID-Nummer ein." }, { status: 400 });
        }

        const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${escapeXml(countryCode)}</urn:countryCode>
      <urn:vatNumber>${escapeXml(vatNumber)}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

        const response = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: "",
            },
            body: soapBody,
            cache: "no-store",
        });

        const xml = await response.text();

        if (!response.ok || xml.includes("<faultstring>")) {
            const fault = readXmlTag(xml, "faultstring") || "UID-Abfrage ist momentan nicht verfügbar.";
            return NextResponse.json({ error: fault }, { status: 502 });
        }

        const valid = readXmlTag(xml, "valid").toLowerCase() === "true";
        const name = readXmlTag(xml, "name");
        const address = readXmlTag(xml, "address");

        if (!valid) {
            return NextResponse.json({ valid: false, vatId: cleanedVatId });
        }

        return NextResponse.json({
            valid: true,
            vatId: cleanedVatId,
            name: name && name !== "---" ? name : "",
            address: parseAddress(address),
        });
    } catch (error) {
        console.error("VAT lookup failed", error);
        return NextResponse.json({ error: "UID-Abfrage konnte nicht durchgeführt werden." }, { status: 500 });
    }
}
