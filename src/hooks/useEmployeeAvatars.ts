"use client";

import { useEffect, useRef, useState } from "react";
import { Employee } from "@/types/employee";
import { fetcher } from "@/lib/fetcher";
import { supabase } from "@/lib/supabase";

const AVATAR_THUMB_SIZE = 128;

type EmployeeAvatarPayload = {
    id: string;
    avatar?: string | null;
    avatarUrl?: string | null;
    needsThumb?: boolean;
};

function createAvatarThumbnailFromUrl(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";

        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = AVATAR_THUMB_SIZE;
                canvas.height = AVATAR_THUMB_SIZE;

                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Canvas is not supported.");

                const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
                const sourceX = (image.naturalWidth - sourceSize) / 2;
                const sourceY = (image.naturalHeight - sourceSize) / 2;

                ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, AVATAR_THUMB_SIZE, AVATAR_THUMB_SIZE);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Thumbnail could not be created."));
                }, "image/webp", 0.78);
            } catch (error) {
                reject(error);
            }
        };

        image.onerror = () => reject(new Error("Avatar image could not be loaded."));
        image.src = url;
    });
}

export function useEmployeeAvatars(enabled = true) {
    const [avatarByEmployeeId, setAvatarByEmployeeId] = useState<Record<string, Pick<Employee, "avatar" | "avatarUrl">>>({});
    const thumbnailMigrationIdsRef = useRef<Set<string>>(new Set());

    const migrateAvatarThumbnail = async (item: EmployeeAvatarPayload) => {
        if (!item.needsThumb || !item.avatarUrl || thumbnailMigrationIdsRef.current.has(item.id)) return;
        thumbnailMigrationIdsRef.current.add(item.id);

        try {
            const thumbnail = await createAvatarThumbnailFromUrl(item.avatarUrl);
            const response = await fetch(`/api/employees/${item.id}/avatar-thumb-upload-url`, { method: "POST" });
            const uploadInfo = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(uploadInfo?.error || "Thumbnail upload URL could not be created.");

            const { error } = await supabase.storage
                .from(uploadInfo.bucket || "employee-avatars")
                .uploadToSignedUrl(uploadInfo.thumbStoragePath, uploadInfo.thumbToken, thumbnail, {
                    contentType: "image/webp",
                    upsert: true,
                });

            if (error) throw error;

            const localPreview = URL.createObjectURL(thumbnail);
            setAvatarByEmployeeId((prev) => ({
                ...prev,
                [item.id]: {
                    avatar: item.avatar || undefined,
                    avatarUrl: localPreview,
                },
            }));
        } catch (error) {
            console.warn("[useEmployeeAvatars] thumbnail migration failed:", item.id, error);
        }
    };

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        fetcher("/api/employees/avatars")
            .then((avatars: EmployeeAvatarPayload[]) => {
                if (cancelled) return;
                setAvatarByEmployeeId(Object.fromEntries(
                    avatars.map((item) => [item.id, {
                        avatar: item.avatar || undefined,
                        avatarUrl: item.avatarUrl || undefined,
                    }])
                ));

                avatars
                    .filter((item) => item.needsThumb && item.avatarUrl)
                    .slice(0, 30)
                    .forEach((item, index) => {
                        window.setTimeout(() => {
                            if (!cancelled) migrateAvatarThumbnail(item);
                        }, 1200 + index * 350);
                    });
            })
            .catch((error) => console.warn("[useEmployeeAvatars] avatar preload failed:", error));

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { avatarByEmployeeId, setAvatarByEmployeeId };
}
