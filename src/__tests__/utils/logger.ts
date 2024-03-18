export const start = (msg: string) => process.stdout.write(`▶️ ${msg} ... `);
export const ok = (msg?: string) => console.log(`✨ ${msg ?? ''}`);
