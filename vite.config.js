import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    publicDir: "static",
    server: {
        // スマホからPCのIPやローカル名で開いたときに、Viteが403で拒否しないようにする。
        allowedHosts: true,
    },
    plugins: [react()],
});
