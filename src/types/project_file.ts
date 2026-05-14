export type FileFolder = string;

export interface ProjectFile {
    id: string;
    projectId: string;
    userId: string;
    folder: FileFolder;
    name: string;
    storagePath: string;
    mimeType?: string;
    size?: number;
    createdAt: string;
    updatedAt: string;
}
