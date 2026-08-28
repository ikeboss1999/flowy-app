import { Service } from "@/types/service";

const NICKNAME_PATTERN = /^\[\[FLOWY_NICKNAME:([^\]]*)\]\]\n?/;

export function splitServiceDescription(description?: string | null) {
    const text = description || "";
    const match = text.match(NICKNAME_PATTERN);
    if (!match) return { nickname: "", description: text };

    let nickname = "";
    try {
        nickname = decodeURIComponent(match[1] || "");
    } catch {
        nickname = match[1] || "";
    }

    return {
        nickname,
        description: text.replace(NICKNAME_PATTERN, ""),
    };
}

export function encodeServiceDescription(description?: string | null, nickname?: string | null) {
    const cleanDescription = splitServiceDescription(description).description;
    const cleanNickname = String(nickname || "").trim();

    if (!cleanNickname) return cleanDescription;
    return `[[FLOWY_NICKNAME:${encodeURIComponent(cleanNickname)}]]${cleanDescription ? `\n${cleanDescription}` : ""}`;
}

export function serviceFromStorage(service: Service): Service {
    const parsed = splitServiceDescription(service.description);
    return {
        ...service,
        description: parsed.description,
        nickname: service.nickname || parsed.nickname || "",
    };
}

export function serviceForStorage(service: Service) {
    const { nickname, ...storageService } = service;
    return {
        ...storageService,
        description: encodeServiceDescription(service.description, nickname),
    };
}
