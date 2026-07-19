export const fetcher = async (url: string) => {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `HTTP ${response.status}`);
    }

    return response.json();
};
