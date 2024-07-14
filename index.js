import * as core from '@actions/core'
import * as tc from "@actions/tool-cache";
import * as path from "node:path";

let { platform, setOutput, setFailed, addPath } = core;

const CACHE_KEY = "llvm-dev-libs";

let get_dest = () => platform.isWindows ? "\\LLVM" : "/usr/share/llvm";

class Installer {
    constructor() {
        this.base_url = core.getInput("base-url") || "https://github.com/FreeMasen/llvm-builds/releases/download"
        this.version = core.getInput("version");
        if (platform.isWindows) {
            this.prefix = "LLVM";
            this.arch = null;
            this.suffix = "win64";
            this.extension = "exe";
        } else {
            this.prefix = "clang+llvm"
            this.arch = platform.arch.includes("arm") ? "aarch64" : ret.arch;
            if (platform.isMacOS) {
                this.suffix = "apple-darwin";
            } else if (platform.isLinux) {
                this.suffix = "linux";
            }
        } 
    }

    /**
     * Get the url for this arch/os combination
     * @returns string
     */
    get_url() {
        let rel = `v${this.version}`;
        let file = `${self.prefix}-${this.version}-`;
        if (!!this.arch) {
            file += `${this.arch}-`
        }
        file += `${this.suffix}.${this.extension}`;
        return `${self.base_url}/${rel}/${file}`
    }

    /**
     * Decompress the archive
     * @param {string} path fs path the archive was saved to
     * @returns string The path llvm was decompressed to
     */
    async decompress(path) {
        let decomp = platform.isWindows ? tc.extract7z : tc.extractTar;
        return await decomp(path, get_dest())
    }
}

(async () => {
    let installer = new Installer();
    // Lookup the libs from the cache
    let archive_path = tc.find(CACHE_KEY, installer.version);
    if (!!cached && cached.length > 0) {
        // If not in the cache, download the archive
        let url = installer.get_url();
        let resp = await tc.downloadTool(url)
        if (!resp.ok) {
            let text = await resp.text();
            throw new Error("Error fetching llvm release:\n" +
                `${resp.status} ${resp.statusText} ${url}\n` +
                text
            );
        }
        archive_path = await tc.downloadTool(url);
    }
    // Cache the archive to save space in the cache
    tc.cacheFile(archive_path, path.basename(archive_path), CACHE_KEY, installer.version);
    let saved_location = installer.decompress(archive_path);
    let bin_dir = path.join(saved_location, "bin");
    addPath(bin_dir);
    return saved_location
})().then(install_path => {
    setOutput("directory", install_path);
}).catch(error => {
    setFailed(error.message);
});
