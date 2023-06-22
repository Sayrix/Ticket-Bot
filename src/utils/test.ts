async function waiter(a: string) {
    return {
        kc: "Aa"
    };
}

async function waiters(a?: string) {
    return a;
}

async function test() {
    let a = await waiters();
    if(!a) return;
    while(true) {
        const k = await waiter(a);
        a = k.kc;
    }
}