async function check() {
    try {
        const res = await fetch("https://api.github.com/repos/ikeboss1999/flowy-app/releases");
        console.log("Status:", res.status);
        console.log("Headers:", Object.fromEntries(res.headers.entries()));
        const body = await res.text();
        console.log("Body length:", body.length);
        console.log("Body preview:", body.substring(0, 500));
    } catch (err) {
        console.error("Error:", err);
    }
}

check();
